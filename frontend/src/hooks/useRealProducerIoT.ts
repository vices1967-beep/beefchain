// src/hooks/useRealProducerIoT.ts - COMPLETO Y CORREGIDO
'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';
import { iotContractService } from '@/services/iotContractService';

const SAN_JUSTO_COORDINATES = {
  latitude: -30.7891,
  longitude: -60.5919
};

// ✅ FUNCIÓN PARA CONVERTIR HEXADECIMAL A NÚMERO
const hexToNumber = (hexValue: any): number => {
  if (!hexValue) return 0;
  
  try {
    // Si ya es número, retornarlo
    if (typeof hexValue === 'number') return hexValue;
    
    // Si es bigint, convertirlo
    if (typeof hexValue === 'bigint') return Number(hexValue);
    
    // Si es string hexadecimal (como '0x1', '0x2b')
    if (typeof hexValue === 'string' && hexValue.startsWith('0x')) {
      // Eliminar el '0x' y convertir a número
      const hexWithoutPrefix = hexValue.slice(2);
      const num = parseInt(hexWithoutPrefix, 16);
      return isNaN(num) ? 0 : num;
    }
    
    // Si es string numérico normal
    if (typeof hexValue === 'string') {
      const num = parseInt(hexValue, 10);
      return isNaN(num) ? 0 : num;
    }
    
    // Si es objeto, intentar convertirlo
    if (typeof hexValue === 'object' && hexValue !== null) {
      return hexToNumber(hexValue.toString());
    }
    
    return 0;
  } catch (error) {
    console.error('❌ Error convirtiendo hexadecimal:', hexValue, error);
    return 0;
  }
};

export const useRealProducerIoT = () => {
  const { address, currentWallet, contractService } = useStarknet();
  
  const [activeAnimals, setActiveAnimals] = useState<number[]>([]);
  const [animalMetadata, setAnimalMetadata] = useState<Map<number, any>>(new Map());
  const [iotDevices, setIotDevices] = useState<Map<number, string>>(new Map());
  const [realReadings, setRealReadings] = useState<Map<number, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);

  // ✅ CARGAR ANIMALES REALES DEL CONTRATO - VERSIÓN CORREGIDA PARA HEX
  useEffect(() => {
    const loadRealAnimals = async () => {
      if (!address || !contractService) {
        setIsLoading(false);
        if (!address) {
          setAlerts(prev => [...prev, '⚠️ Conecta tu wallet para cargar animales']);
        }
        return;
      }

      setIsLoading(true);
      
      try {
        console.log('🔍 Buscando animales REALES del productor...', address);
        
        // ✅ OBTENER ANIMALES USANDO getAnimalsByProducer
        let rawAnimalIds: any[] = [];
        
        try {
          if (contractService.getAnimalsByProducer) {
            const result = await contractService.getAnimalsByProducer(address);
            console.log('📦 Resultado RAW de getAnimalsByProducer:', result);
            
            if (Array.isArray(result)) {
              rawAnimalIds = result;
            } else if (result && typeof result === 'object') {
              rawAnimalIds = Object.values(result);
            }
          } else {
            // Fallback a getAnimalsByOwner si no existe getAnimalsByProducer
            const result = await contractService.getAnimalsByOwner(address);
            console.log('📦 Resultado RAW de getAnimalsByOwner:', result);
            
            if (Array.isArray(result)) {
              rawAnimalIds = result;
            }
          }
          
          console.log('🔢 IDs RAW del contrato:', rawAnimalIds);
        } catch (error) {
          console.error('❌ Error obteniendo animales:', error);
          setAlerts(prev => [...prev, '❌ Error obteniendo animales del contrato']);
          setIsLoading(false);
          return;
        }
        
        // ✅ CONVERTIR IDs HEXADECIMALES A NÚMEROS Y ELIMINAR DUPLICADOS
        const animalIds: number[] = [...new Set(
          rawAnimalIds
            .map((id: any) => hexToNumber(id))
            .filter((id: number) => id > 0)
        )];

        console.log('✅ Animales REALES procesados (sin duplicados):', animalIds);
        
        if (animalIds.length === 0) {
          setAlerts(prev => [...prev, 'ℹ️ No tienes animales registrados en el contrato']);
          setActiveAnimals([]);
          setIsLoading(false);
          return;
        }

        setActiveAnimals(animalIds);

        // ✅ CARGAR METADATOS REALES DE CADA ANIMAL
        const metadata = new Map();
        let loadedCount = 0;
        
        for (const animalId of animalIds) {
          try {
            console.log(`📥 Cargando datos del animal ${animalId}...`);
            
            let animalData = null;
            
            // ✅ CONVERTIR A BigInt ANTES DE LLAMAR AL CONTRATO
            if (contractService.getAnimalData) {
              animalData = await contractService.getAnimalData(BigInt(animalId));
              console.log(`📊 Datos RAW del animal ${animalId}:`, animalData);
            }
            
            if (animalData) {
              // Función segura para convertir valores del contrato
              const safeConvert = (value: any): number => {
                return hexToNumber(value);
              };

              const processedData = {
                id: animalId,
                name: `Animal ${animalId}`,
                breed: mapBreed(animalData.raza),
                weight: safeConvert(animalData.peso) || 250,
                owner: animalData.owner || animalData.propietario || address,
                estado: mapEstado(animalData.estado),
                location: 'San Justo, Santa Fe',
                isReal: true,
                fecha_nacimiento: animalData.fecha_nacimiento,
                metadata_hash: animalData.metadata_hash,
                rawData: animalData // Para debugging
              };
              
              metadata.set(animalId, processedData);
              loadedCount++;
              console.log(`✅ Animal ${animalId} cargado:`, processedData);
            } else {
              // Si no hay datos, crear metadata básica
              metadata.set(animalId, {
                id: animalId,
                name: `Animal ${animalId}`,
                breed: 'Angus',
                weight: 250,
                owner: address,
                estado: 'active',
                location: 'San Justo, Santa Fe',
                isReal: true,
                fallback: true
              });
              loadedCount++;
              console.log(`⚠️ Animal ${animalId} - usando datos fallback`);
            }
          } catch (error) {
            console.warn(`❌ Error cargando animal ${animalId}:`, error);
            metadata.set(animalId, {
              id: animalId,
              name: `Animal ${animalId}`,
              breed: 'Angus',
              weight: 250,
              owner: address,
              estado: 'error',
              location: 'San Justo, Santa Fe',
              isReal: true,
              error: true
            });
          }
        }

        setAnimalMetadata(metadata);
        setAlerts(prev => [...prev.slice(-3), `✅ ${loadedCount}/${animalIds.length} animales cargados correctamente`]);

      } catch (error: any) {
        console.error('❌ Error general cargando animales:', error);
        setAlerts(prev => [...prev.slice(-3), `❌ Error: ${error.message}`]);
        setActiveAnimals([]);
      } finally {
        setIsLoading(false);
      }
    };

    const mapBreed = (raza: any): string => {
      const breedNum = hexToNumber(raza);
      switch (breedNum) {
        case 1: return 'Angus';
        case 2: return 'Hereford';
        case 3: return 'Brangus';
        default: return 'Angus';
      }
    };

    const mapEstado = (estado: any): string => {
      const estadoNum = hexToNumber(estado);
      switch (estadoNum) {
        case 0: return 'creado';
        case 1: return 'procesado';
        case 2: return 'certificado';
        case 3: return 'exportado';
        default: return 'active';
      }
    };

    loadRealAnimals();
  }, [address, contractService]);

  // ✅ FUNCIÓN getStats CON DATOS REALES
  const getStats = () => {
    const validAnimals = activeAnimals.filter(id => id > 0);
    const linkedAnimalsCount = Array.from(iotDevices.keys()).filter(id => id > 0).length;
    const animalsWithReadingsCount = Array.from(realReadings.keys()).filter(id => id > 0).length;
    
    const breedDistribution: { [key: string]: number } = { Angus: 0, Hereford: 0, Brangus: 0 };
    
    animalMetadata.forEach((meta, id) => {
      if (meta && meta.breed && breedDistribution[meta.breed] !== undefined && id > 0) {
        breedDistribution[meta.breed]++;
      }
    });

    // Calcular peso promedio real
    let totalWeight = 0;
    let weightCount = 0;
    animalMetadata.forEach((meta, id) => {
      if (meta && meta.weight && id > 0) {
        totalWeight += meta.weight;
        weightCount++;
      }
    });
    const averageWeight = weightCount > 0 ? Math.round(totalWeight / weightCount) : 280;

    return {
      totalAnimals: validAnimals.length,
      linkedAnimals: linkedAnimalsCount,
      animalsWithReadings: animalsWithReadingsCount,
      averageWeight,
      breedDistribution,
      totalTransactions: transactionHistory.length
    };
  };

  // 🔗 VINCULAR DISPOSITIVO - TRANSACCIÓN REAL
  const linkDeviceToAnimalReal = async (animalId: number, deviceId: string) => {
    if (animalId <= 0) {
      throw new Error('❌ ID de animal inválido');
    }

    if (!currentWallet) {
      throw new Error('🔒 Conecta tu wallet de StarkNet para transacciones reales');
    }

    const animalMeta = animalMetadata.get(animalId);
    if (!animalMeta) {
      throw new Error(`❌ El animal ${animalId} no existe o no te pertenece`);
    }

    try {
      setAlerts(prev => [...prev.slice(-3), `🚀 Vinculando dispositivo REAL...`]);

      // ✅ CONVERTIR number A bigint PARA EL CONTRATO
      const result = await iotContractService.linkDeviceToAnimalReal(
        animalId,
        deviceId, 
        currentWallet
      );

      if (result.success) {
        setIotDevices(prev => new Map(prev.set(animalId, deviceId)));
        
        setTransactionHistory(prev => [{
          type: 'DEVICE_LINK_REAL',
          animalId,
          deviceId,
          hash: result.transactionHash,
          timestamp: new Date().toLocaleTimeString(),
          peso: animalMeta.weight,
          isReal: true
        }, ...prev.slice(0, 9)]);

        setAlerts(prev => [...prev.slice(-3), 
          `✅ Dispositivo ${deviceId} vinculado REALMENTE`,
          `📝 TX: ${result.transactionHash.slice(0, 10)}...`
        ]);

        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('❌ Error en transacción REAL:', error);
      setAlerts(prev => [...prev.slice(-3), `❌ Error REAL: ${error.message}`]);
      throw error;
    }
  };

  // 🔗 VINCULAR DISPOSITIVO - VERSIÓN SIMULADA
  const linkDeviceToAnimal = async (animalId: number, deviceId: string) => {
    if (animalId <= 0) {
      throw new Error('❌ ID de animal inválido');
    }

    const animalMeta = animalMetadata.get(animalId);
    if (!animalMeta) {
      throw new Error(`❌ El animal ${animalId} no existe o no te pertenece`);
    }

    try {
      setAlerts(prev => [...prev.slice(-3), `🔗 Vinculando dispositivo...`]);

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIotDevices(prev => new Map(prev.set(animalId, deviceId)));
      
      setTransactionHistory(prev => [{
        type: 'DEVICE_LINK',
        animalId,
        deviceId,
        hash: `0x${Math.random().toString(16).slice(2)}`,
        timestamp: new Date().toLocaleTimeString(),
        peso: animalMeta.weight,
        isReal: false
      }, ...prev.slice(0, 9)]);

      setAlerts(prev => [...prev.slice(-3), `✅ Dispositivo ${deviceId} vinculado (simulado)`]);

      return { success: true };
    } catch (error: any) {
      setAlerts(prev => [...prev.slice(-3), `❌ Error: ${error.message}`]);
      throw error;
    }
  };

  // 📡 SIMULAR DATOS IoT - SOLO SI HAY DISPOSITIVO VINCULADO
  const simulateRealIoTData = async (animalId: number) => {
    if (animalId <= 0) {
      throw new Error('❌ ID de animal inválido');
    }

    const deviceId = iotDevices.get(animalId);
    if (!deviceId) {
      throw new Error(`❌ El animal ${animalId} no tiene dispositivo vinculado`);
    }

    const animalMeta = animalMetadata.get(animalId);
    if (!animalMeta) {
      throw new Error(`❌ El animal ${animalId} no existe`);
    }

    const newReading = {
      timestamp: Math.floor(Date.now() / 1000),
      temperature: 37.5 + (Math.random() - 0.5) * 1.5,
      humidity: 65 + (Math.random() - 0.5) * 15,
      latitude: SAN_JUSTO_COORDINATES.latitude + (Math.random() - 0.5) * 0.01,
      longitude: SAN_JUSTO_COORDINATES.longitude + (Math.random() - 0.5) * 0.01,
      device_id: deviceId,
      reading_type: "gps_health"
    };

    if (currentWallet) {
      try {
        const result = await iotContractService.sendIoTReadingReal(
          animalId,
          newReading.temperature,
          newReading.humidity,
          newReading.latitude,
          newReading.longitude,
          deviceId,
          currentWallet
        );

        if (result.success) {
          setRealReadings(prev => new Map(prev.set(animalId, newReading)));
          setAlerts(prev => [...prev.slice(-3), 
            `✅ Datos IoT REALES enviados - Animal ${animalId}`,
            `📝 TX: ${result.transactionHash.slice(0, 10)}...`
          ]);
          return result;
        }
      } catch (error) {
        console.error('Error enviando datos reales:', error);
      }
    }

    setRealReadings(prev => new Map(prev.set(animalId, newReading)));
    setAlerts(prev => [...prev.slice(-3), `✅ Datos IoT simulados - Animal ${animalId}`]);
    
    return { success: true };
  };

  // 🔄 RECARGAR DATOS
  const reloadData = async () => {
    setIsLoading(true);
    setAlerts(prev => [...prev.slice(-3), '🔄 Recargando animales...']);
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // ✅ FUNCIÓN PARA OBTENER ANIMALES VÁLIDOS
  const getValidAnimals = () => {
    return activeAnimals.filter(id => id > 0);
  };

  return {
    activeAnimals: getValidAnimals(), // ✅ RETORNAR SOLO IDs VÁLIDOS
    animalMetadata,
    iotDevices,
    realReadings,
    isLoading,
    alerts,
    transactionHistory,
    linkDeviceToAnimal,
    linkDeviceToAnimalReal,
    simulateRealIoTData,
    reloadData,
    clearAlerts: () => setAlerts([]),
    getAnimalMetadata: (animalId: number) => {
      if (animalId <= 0) return null;
      return animalMetadata.get(animalId);
    },
    isAnimalLinked: (animalId: number) => {
      if (animalId <= 0) return false;
      return iotDevices.has(animalId);
    },
    getLatestReading: (animalId: number) => {
      if (animalId <= 0) return null;
      return realReadings.get(animalId);
    },
    getStats,
    getSanJustoInfo: () => ({
      city: 'San Justo',
      province: 'Santa Fe', 
      coordinates: SAN_JUSTO_COORDINATES,
      climate: 'Clima templado húmedo',
      agriculturalZone: 'Zona núcleo maicera-sojera',
      typicalLivestock: 'Ganado bovino para carne'
    }),
    isConnected: !!address,
    userAddress: address,
    hasWallet: !!currentWallet
  };
};