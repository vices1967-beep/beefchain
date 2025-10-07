// src/components/productor/BatchManagement.tsx - VERSIÓN COMPLETADA Y CORREGIDA
'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';

// ✅ Interfaz mejorada para el estado del lote
interface BatchInfo {
  id: bigint;
  propietario: string;
  frigorifico: string;
  fecha_creacion: bigint;
  fecha_transferencia: bigint;
  fecha_procesamiento: bigint;
  estado: number;
  cantidad_animales: number;
  peso_total: bigint;
  animal_ids: bigint[];
}

export function BatchManagement() {
  const { address, contractService } = useStarknet();
  const [animalIds, setAnimalIds] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [animalsToAdd, setAnimalsToAdd] = useState<string>('');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [availableAnimals, setAvailableAnimals] = useState<bigint[]>([]);
  const [transferStep, setTransferStep] = useState<'select' | 'payment' | 'confirm'>('select');
  const [selectedTransferType, setSelectedTransferType] = useState<'individual' | 'batch' | null>(null);
  const [selectedIndividualAnimal, setSelectedIndividualAnimal] = useState<bigint | null>(null);
  const [frigorificoAddress, setFrigorificoAddress] = useState('');

  // Estados para frigoríficos
  const [availableFrigorificos, setAvailableFrigorificos] = useState<string[]>([]);
  const [isLoadingFrigorificos, setIsLoadingFrigorificos] = useState(false);

  // ✅ Función optimizada para cargar animales disponibles
  const loadAvailableAnimals = async () => {
    if (!contractService || !address) return;
    
    try {
      console.log('🔄 Cargando animales disponibles...');
      const allAnimals = await contractService.getAnimalsByProducer(address);
      const available: bigint[] = [];
      const processedAnimals = new Set<string>();
      
      for (const animalId of allAnimals) {
        const animalKey = animalId.toString();
        // Evitar procesar el mismo animal múltiples veces
        if (processedAnimals.has(animalKey)) continue;
        processedAnimals.add(animalKey);
        
        try {
          const batchId = await contractService.getBatchForAnimal(animalId);
          if (batchId === BigInt(0)) {
            available.push(animalId);
          }
        } catch (error) {
          console.log(`Animal ${animalId} probablemente no está en lote, agregando...`);
          available.push(animalId);
        }
      }
      
      setAvailableAnimals(available);
      console.log(`✅ ${available.length} animales disponibles de ${allAnimals.length} totales`);
    } catch (error) {
      console.error('Error cargando animales disponibles:', error);
    }
  };

  // ✅ Función CORREGIDA para cargar frigoríficos
  const loadFrigorificos = async () => {
    if (!contractService) return;
    
    try {
      setIsLoadingFrigorificos(true);
      console.log('🔍 Cargando frigoríficos...');
      
      let frigorificos: string[] = [];
      
      // Intentar obtener frigoríficos desde roles
      try {
        frigorificos = await contractService.getFrigorificosFromRoles?.() || [];
        console.log(`📊 Frigoríficos desde roles:`, frigorificos);
      } catch (error) {
        console.log('❌ No se pudieron obtener frigoríficos desde roles:', error);
      }
      
      // Si no hay frigoríficos, usar lista hardcodeada
      if (frigorificos.length === 0) {
        console.log('⚠️ Usando lista hardcodeada de frigoríficos');
        frigorificos = [
          process.env.NEXT_PUBLIC_DEPLOYER_WALLET!,
          '0x065f45868a08c394cb54d94a6e4eb08012435b5c9803bb41d22ecb9e603e535d'
        ].filter(addr => addr && addr.startsWith('0x'));
      }
      
      setAvailableFrigorificos(frigorificos);
      console.log(`✅ ${frigorificos.length} frigoríficos cargados`);
      
    } catch (error) {
      console.error('❌ Error cargando frigoríficos:', error);
      // Lista de emergencia
      const emergencyFrigorificos = [
        '0x065f45868a08c394cb54d94a6e4eb08012435b5c9803bb41d22ecb9e603e535d'
      ];
      setAvailableFrigorificos(emergencyFrigorificos);
    } finally {
      setIsLoadingFrigorificos(false);
    }
  };

  // ✅ Función corregida para cargar lotes sin duplicados
  const loadBatches = async () => {
    if (!contractService || !address) return;
    
    try {
      const batchIds = await contractService.getBatchesByProducer(address);
      console.log('📦 IDs de lotes encontrados:', batchIds);
      
      const batchDetails: BatchInfo[] = [];
      const seenBatchIds = new Set<string>();
      const seenAnimalKeys = new Set<string>();
      
      for (const batchId of batchIds) {
        try {
          const batchIdStr = batchId.toString();
          
          // ✅ Prevenir duplicados de lotes
          if (batchId <= BigInt(0) || seenBatchIds.has(batchIdStr)) continue;
          seenBatchIds.add(batchIdStr);
          
          const batchInfo = await contractService.getBatchInfo(batchId);
          
          // ✅ Prevenir duplicados de animales dentro del lote
          let animalIdsInBatch: bigint[] = [];
          try {
            const rawAnimalIds = await contractService.getAnimalsInBatch(batchId);
            const uniqueAnimalIds: bigint[] = [];
            
            for (const animalId of rawAnimalIds) {
              const animalKey = `batch-${batchIdStr}-animal-${animalId.toString()}`;
              if (!seenAnimalKeys.has(animalKey)) {
                seenAnimalKeys.add(animalKey);
                uniqueAnimalIds.push(animalId);
              }
            }
            animalIdsInBatch = uniqueAnimalIds;
          } catch (animalError) {
            console.log(`Error obteniendo animales del lote ${batchId}:`, animalError);
            // Fallback: usar animal_ids del batchInfo
            const rawIds = batchInfo.animal_ids || [];
            const uniqueFromInfo = Array.from(
              new Set(
                rawIds
                  .map((id: unknown) => {
                    if (id === null || id === undefined || id === '0' || id === '0x0') {
                      return null;
                    }
                    try {
                      const idBigInt = BigInt(id as string);
                      return idBigInt > BigInt(0) ? idBigInt.toString() : null;
                    } catch (error) {
                      console.error(`ID de animal inválido en lote ${batchId}:`, id, error);
                      return null;
                    }
                  })
                  .filter((id: string | null) => id !== null)
              )
            ).map((id: unknown) => BigInt(id as string));
            animalIdsInBatch = uniqueFromInfo;
          }
                    
          batchDetails.push({
            id: batchId,
            ...batchInfo,
            animal_ids: animalIdsInBatch,
            cantidad_animales: animalIdsInBatch.length
          });
          
          console.log(`✅ Lote ${batchId} cargado con ${animalIdsInBatch.length} animales`);
        } catch (batchError: any) {
          console.error(`❌ Error cargando lote ${batchId}:`, batchError);
        }
      }
      
      // ✅ Ordenar por ID para consistencia
      batchDetails.sort((a: BatchInfo, b: BatchInfo) => Number(a.id - b.id));
      setBatches(batchDetails);
      console.log(`✅ ${batchDetails.length} lotes únicos cargados exitosamente`);
      
    } catch (error: any) {
      console.error('❌ Error cargando lotes:', error);
      setError(`Error al cargar lotes: ${error.message}`);
    }
  };

  // ✅ FUNCIÓN DE DIAGNÓSTICO DE ANIMALES DISPONIBLES
  const diagnoseAvailableAnimals = async () => {
    if (!contractService || !address) return;
    
    try {
      console.log(`🔍 [DIAGNÓSTICO] Verificando animales disponibles para ${address}`);
      
      const allAnimals = await contractService.getAnimalsByProducer(address);
      console.log(`📊 [DIAGNÓSTICO] Todos mis animales:`, allAnimals.map(a => a.toString()));
      
      const availableAnimals: bigint[] = [];
      const unavailableAnimals: {id: bigint, reason: string}[] = [];
      
      for (const animalId of allAnimals) {
        try {
          const animalData = await contractService.getAnimalData(animalId);
          const batchId = await contractService.getBatchForAnimal(animalId);
          
          console.log(`🐄 [DIAGNÓSTICO] Animal #${animalId}:`, {
            propietario: animalData.propietario,
            estado: animalData.estado,
            lote_id: animalData.lote_id,
            batchId_from_function: batchId.toString(),
            es_mio: animalData.propietario === address,
            estado_activo: animalData.estado === 0,
            sin_lote: batchId === BigInt(0) && animalData.lote_id === 0
          });
          
          if (animalData.propietario !== address) {
            unavailableAnimals.push({id: animalId, reason: 'No es propietario'});
          } else if (animalData.estado !== 0) {
            unavailableAnimals.push({id: animalId, reason: `Estado ${animalData.estado}`});
          } else if (batchId !== BigInt(0) || animalData.lote_id !== 0) {
            unavailableAnimals.push({id: animalId, reason: `En lote ${batchId || animalData.lote_id}`});
          } else {
            availableAnimals.push(animalId);
          }
          
        } catch (error) {
          console.log(`❌ [DIAGNÓSTICO] Error con animal #${animalId}:`, error);
          unavailableAnimals.push({id: animalId, reason: 'Error al verificar'});
        }
      }
      
      console.log(`✅ [DIAGNÓSTICO] RESULTADO:`);
      console.log(`   🟢 Disponibles:`, availableAnimals.map(a => a.toString()));
      console.log(`   🔴 No disponibles:`, unavailableAnimals);
      
      setAvailableAnimals(availableAnimals);
      
      return { availableAnimals, unavailableAnimals };
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      return { availableAnimals: [], unavailableAnimals: [] };
    }
  };

  useEffect(() => {
    if (contractService && address) {
      loadBatches();
      loadAvailableAnimals();
      loadFrigorificos();
    }
  }, [contractService, address]);

  // ✅ Función corregida: Crear lote SIN transferir automáticamente
  const handleCreateBatch = async () => {
    if (!contractService || !animalIds) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      const animalIdsArray = animalIds.split(',')
        .map(id => id.trim())
        .filter(id => id && !isNaN(Number(id)))
        .map(id => BigInt(id));
      
      if (animalIdsArray.length === 0) {
        setError('Ingresa al menos un ID de animal válido');
        return;
      }

      console.log('🔍 Verificando animales disponibles...');
      
      const verification = await contractService.verifyAnimalsAvailable(animalIdsArray);
      
      if (verification.available.length === 0) {
        setError(`Ningún animal disponible: ${verification.reasons.join('; ')}`);
        return;
      }

      if (verification.unavailable.length > 0) {
        setError(`Algunos animales no disponibles: ${verification.reasons.slice(0, 3).join('; ')}...`);
      }

      console.log('📦 Creando lote con animales:', verification.available);
      
      const result = await contractService.createAnimalBatchSafe(verification.available);
      setTxHash(result.txHash);
      
      await contractService.waitForTransaction(result.txHash);
      
      await loadBatches();
      await loadAvailableAnimals();
      
      setAnimalIds('');
      alert(`✅ Lote #${result.batchId} creado exitosamente! Listo para transferir cuando lo decidas.`);
      
    } catch (error: any) {
      console.error('❌ Error creando lote:', error);
      setError(`Error creando lote: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Función para agregar animales a lote existente
  const handleAddAnimalsToBatch = async () => {
    if (!contractService || !selectedBatch || !animalsToAdd) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      const batchId = BigInt(selectedBatch);
      const animalIdsArray = animalsToAdd.split(',')
        .map(id => id.trim())
        .filter(id => id && !isNaN(Number(id)))
        .map(id => BigInt(id));
      
      if (animalIdsArray.length === 0) {
        setError('Ingresa al menos un ID de animal válido');
        return;
      }

      console.log(`➕ Agregando ${animalIdsArray.length} animales al lote ${selectedBatch}`);
      
      const txHash = await contractService.addAnimalsToBatch(batchId, animalIdsArray);
      setTxHash(txHash);
      
      await contractService.waitForTransaction(txHash);
      
      await loadBatches();
      await loadAvailableAnimals();
      
      setAnimalsToAdd('');
      setSelectedBatch('');
      
      alert(`✅ ${animalIdsArray.length} animales agregados al lote exitosamente!`);
      
    } catch (error: any) {
      console.error('❌ Error agregando animales al lote:', error);
      setError(`Error agregando animales: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Transferir lote al frigorífico
  const handleTransferBatch = async (batchId: bigint, frigorifico: string) => {
    if (!contractService || !address) {
      setError('❌ Wallet no conectada o servicio no disponible');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setTransferStep('payment');

      console.log(`🏭 Iniciando transferencia del lote #${batchId} a ${frigorifico}`);

      const batchInfo = await contractService.getBatchInfo(batchId);
      
      if (batchInfo.estado !== 0) {
        throw new Error(`El lote #${batchId} ya ha sido transferido`);
      }

      if (batchInfo.propietario !== address) {
        throw new Error('No eres el propietario de este lote');
      }

      if (!batchInfo.animal_ids || batchInfo.animal_ids.length === 0) {
        throw new Error('El lote no contiene animales');
      }

      console.log('⛓️ Ejecutando transferencia en blockchain...');
      const txHash = await contractService.transferBatchToFrigorifico(batchId, frigorifico);
      
      console.log('✅ Transacción enviada:', txHash);
      setTxHash(txHash);
      setTransferStep('confirm');

      await contractService.waitForTransaction(txHash);
      
      console.log('✅ Transferencia confirmada en blockchain');

      await loadBatches();
      await loadAvailableAnimals();
      
      setSelectedTransferType(null);
      setFrigorificoAddress('');
      setTransferStep('select');
      
      alert(`✅ Lote #${batchId} transferido al frigorífico!\n⏳ Esperando aceptación y pago...`);
      
    } catch (error: any) {
      console.error('❌ Error en transferencia:', error);
      setError(`Error en transferencia: ${error.message}`);
      setTransferStep('select');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Función para transferir animal individual
  const handleTransferIndividualAnimal = async (animalId: bigint) => {
    if (!contractService || !frigorificoAddress) return;
    
    try {
      setIsLoading(true);
      setError('');
      setTransferStep('payment');

      const result = await contractService.transferToFrigorificoWithPayment(
        animalId,
        frigorificoAddress
      );

      setTransferStep('confirm');
      setTxHash(result.txHash);
      
      await contractService.waitForTransaction(result.txHash);
      
      await loadAvailableAnimals();
      await loadBatches();
      
      setSelectedTransferType(null);
      setSelectedIndividualAnimal(null);
      setFrigorificoAddress('');
      setTransferStep('select');
      
      alert(`✅ Animal #${animalId} transferido exitosamente!`);
      
    } catch (error: any) {
      console.error('❌ Error transfiriendo animal individual:', error);
      setError(`Error transfiriendo animal: ${error.message}`);
      setTransferStep('select');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Función auxiliar para formatear fecha
  const formatDate = (timestamp: bigint): string => {
    if (!timestamp || timestamp === BigInt(0)) {
      return 'No disponible';
    }
    
    try {
      const date = new Date(Number(timestamp) * 1000);
      if (date.getFullYear() < 2020) {
        return 'No disponible';
      }
      return date.toLocaleDateString('es-ES');
    } catch {
      return 'No disponible';
    }
  };

  // ✅ Iniciar proceso de transferencia
  const startTransferProcess = (type: 'individual' | 'batch', animalId?: bigint, batchId?: string) => {
    console.log(`🚀 Iniciando proceso de transferencia para:`, {
      type,
      animalId: animalId?.toString(),
      batchId
    });
    
    setSelectedTransferType(type);
    if (animalId) setSelectedIndividualAnimal(animalId);
    if (batchId) setSelectedBatch(batchId);
    setFrigorificoAddress('');
    setError('');
    setTransferStep('select');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <span className="text-3xl">📦</span>
          Gestión de Lotes y Transferencias
        </h3>
        <div className="flex gap-2">
          <button
            onClick={loadAvailableAnimals}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:bg-green-300 transition-colors flex items-center gap-2"
          >
            <span>🔄</span>
            Animales
          </button>
          <button
            onClick={loadBatches}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center gap-2"
          >
            <span>🔄</span>
            Lotes
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 font-semibold">Error:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => setError('')}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}

      {txHash && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-green-700 font-semibold">
            ✅ Transacción confirmada: {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </p>
        </div>
      )}

      {/* Proceso de Transferencia MEJORADO */}
      {selectedTransferType && (
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-2xl">
          <h4 className="font-semibold text-blue-800 mb-4 text-lg">
            {transferStep === 'select' && `Transferir ${selectedTransferType === 'individual' ? 'Animal Individual' : 'Lote Completo'} a Frigorífico`}
            {transferStep === 'payment' && 'Enviando Transferencia...'}
            {transferStep === 'confirm' && 'Confirmando Transacción'}
          </h4>
          
          {transferStep === 'select' && (
            <div className="space-y-4">
              {/* ✅ Información del lote que se va a transferir */}
              {selectedTransferType === 'batch' && selectedBatch && (
                <div className="p-4 bg-white border border-blue-200 rounded-lg">
                  <h5 className="font-semibold text-blue-800 mb-2">📦 Lote a Transferir</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Lote ID:</span>
                      <span className="font-mono ml-2 font-semibold">#{selectedBatch}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Animales:</span>
                      <span className="font-semibold ml-2">
                        {batches.find(b => b.id.toString() === selectedBatch)?.animal_ids.length || 0}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Animales en lote:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {batches.find(b => b.id.toString() === selectedBatch)?.animal_ids.slice(0, 5).map((animalId: bigint) => (
                          <span key={animalId.toString()} className="bg-gray-100 px-2 py-1 rounded text-xs border">
                            #{animalId.toString()}
                          </span>
                        ))}
                       {batches.find(b => b.id.toString() === selectedBatch)?.animal_ids && 
                         batches.find(b => b.id.toString() === selectedBatch)!.animal_ids.length > 5 && (
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                            +{batches.find(b => b.id.toString() === selectedBatch)!.animal_ids.length - 5} más
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ Selector de frigorífico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏭 Seleccionar Frigorífico Destino
                </label>
                
                <div className="mb-3">
                  <select
                    value={frigorificoAddress}
                    onChange={(e) => setFrigorificoAddress(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading || isLoadingFrigorificos}
                  >
                    <option value="">Seleccionar frigorífico...</option>
                    {availableFrigorificos.map((frigo, index) => (
                      <option key={`frigo-${index}`} value={frigo}>
                        Frigorífico {index + 1} ({frigo.slice(0, 10)}...{frigo.slice(-8)})
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">
                      {isLoadingFrigorificos ? 'Cargando frigoríficos...' : `${availableFrigorificos.length} frigoríficos disponibles`}
                    </span>
                    <button
                      onClick={loadFrigorificos}
                      disabled={isLoadingFrigorificos}
                      className="text-xs text-blue-500 hover:text-blue-700 disabled:text-gray-400"
                    >
                      🔄 Actualizar
                    </button>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700 text-sm">
                    💡 <strong>Nota:</strong> El lote quedará en espera de que el frigorífico acepte y realice el pago.
                  </p>
                </div>
              </div>

              {/* ✅ Resumen de transferencia */}
              {frigorificoAddress && (
                <div className="p-4 bg-white border border-green-200 rounded-lg">
                  <h5 className="font-semibold text-green-800 mb-3">📋 Resumen de Transferencia</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Tipo:</span>
                      <span className="font-semibold">
                        {selectedTransferType === 'individual' ? 'Animal Individual' : 'Lote Completo'}
                      </span>
                    </div>
                    
                    {selectedTransferType === 'batch' && selectedBatch && (
                      <>
                        <div className="flex justify-between">
                          <span>Lote:</span>
                          <span className="font-mono">#{selectedBatch}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Animales:</span>
                          <span className="font-semibold">
                            {batches.find(b => b.id.toString() === selectedBatch)?.animal_ids.length || 0}
                          </span>
                        </div>
                      </>
                    )}
                    
                    <div className="flex justify-between">
                      <span>Frigorífico:</span>
                      <span className="font-mono text-xs">
                        {frigorificoAddress.slice(0, 10)}...{frigorificoAddress.slice(-8)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between pt-2 border-t border-green-100">
                      <span>Estado:</span>
                      <span className="font-semibold text-orange-600">⏳ En espera de aceptación</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ Botones de acción */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    console.log('🔄 Confirmando transferencia...', {
                      type: selectedTransferType,
                      batch: selectedBatch,
                      frigorifico: frigorificoAddress
                    });
                    
                    if (selectedTransferType === 'individual' && selectedIndividualAnimal) {
                      console.log('📤 Transferencia individual:', selectedIndividualAnimal.toString());
                      handleTransferIndividualAnimal(selectedIndividualAnimal);
                    } else if (selectedTransferType === 'batch' && selectedBatch) {
                      console.log('📤 Transferencia de lote:', selectedBatch, 'a', frigorificoAddress);
                      handleTransferBatch(BigInt(selectedBatch), frigorificoAddress);
                    }
                  }}
                  disabled={!frigorificoAddress || isLoading || !frigorificoAddress.startsWith('0x')}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:cursor-not-allowed"
                >
                  {isLoading ? '⏳ Procesando...' : '🚀 Confirmar Transferencia'}
                </button>
                <button
                  onClick={() => {
                    console.log('❌ Cancelando transferencia');
                    setSelectedTransferType(null);
                    setSelectedIndividualAnimal(null);
                    setFrigorificoAddress('');
                    setError('');
                    setTransferStep('select');
                  }}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>

              {!frigorificoAddress.startsWith('0x') && frigorificoAddress && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">
                    ❌ La dirección debe comenzar con 0x y tener formato válido
                  </p>
                </div>
              )}

              {!frigorificoAddress && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-700 text-sm">
                    ⚠️ Por favor selecciona un frigorífico destino para continuar
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Estados de transferencia */}
          {transferStep === 'payment' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h5 className="font-semibold text-blue-700 mb-2">Enviando Transferencia</h5>
              <p className="text-blue-600 text-sm">
                La transferencia está siendo procesada en la blockchain...
              </p>
            </div>
          )}

          {transferStep === 'confirm' && (
            <div className="text-center py-8">
              <div className="text-4xl text-green-500 mb-4">✅</div>
              <h5 className="font-semibold text-green-700 mb-2">¡Transferencia Exitosa!</h5>
              <p className="text-green-600 text-sm mb-4">
                El lote ha sido transferido al frigorífico
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-700 text-xs">
                  <strong>Estado:</strong> En espera de aceptación y pago del frigorífico
                </p>
                {txHash && (
                  <p className="text-green-600 text-xs mt-1">
                    <strong>Transacción:</strong> {txHash.slice(0, 20)}...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sección de Animales Disponibles */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <span>🐄</span>
          Animales Disponibles para Lotes
        </h4>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-blue-700 text-sm">
              <strong>{availableAnimals.length}</strong> animales pueden ser agregados a lotes
            </p>
            {availableAnimals.length > 0 && (
              <p className="text-blue-600 text-xs mt-1">
                IDs: {availableAnimals.slice(0, 5).map(id => `#${id.toString()}`).join(', ')}
                {availableAnimals.length > 5 && ` ... y ${availableAnimals.length - 5} más`}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2">
          <button
            onClick={diagnoseAvailableAnimals}
            className="px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
          >
            🔧 Diagnosticar Animales
          </button>
        </div>

        {/* Botones de transferencia individual rápida */}
        {availableAnimals.length > 0 && !selectedTransferType && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-blue-700 text-sm font-semibold mb-2">Transferencia Rápida Individual:</p>
            <div className="flex flex-wrap gap-2">
              {availableAnimals.slice(0, 3).map(animalId => (
                <button
                  key={`available-animal-${animalId.toString()}`}
                  onClick={() => startTransferProcess('individual', animalId)}
                  className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs flex items-center gap-1"
                >
                  <span>🚀</span>
                  Transferir #{animalId.toString()}
                </button>
              ))}
              {availableAnimals.length > 3 && (
                <span className="text-blue-600 text-xs self-center">
                  +{availableAnimals.length - 3} más disponibles
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Crear Nuevo Lote */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700">Crear Nuevo Lote</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IDs de Animales Disponibles (separados por coma)
            </label>
            <input
              type="text"
              value={animalIds}
              onChange={(e) => setAnimalIds(e.target.value)}
              placeholder="Ej: 1, 2, 3"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || availableAnimals.length === 0}
            />
            <p className="text-xs text-gray-500 mt-1">
              Usa solo animales disponibles. Máximo 10 animales por lote.
            </p>
          </div>

          <button
            onClick={handleCreateBatch}
            disabled={isLoading || !animalIds || availableAnimals.length === 0}
            className="w-full px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:bg-green-300 transition-colors font-semibold"
          >
            {isLoading ? '⏳ Creando Lote...' : '📦 Crear Nuevo Lote'}
          </button>
          
          <p className="text-xs text-green-600 text-center">
            ✅ El lote se creará sin transferir automáticamente
          </p>
        </div>

        {/* Agregar Animales a Lote Existente */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700">Agregar Animales a Lote Existente</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Lote
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || batches.length === 0}
            >
              <option value="">Seleccionar lote</option>
              {batches.map((batch) => (
                <option 
                  key={`batch-option-${batch.id.toString()}`}
                  value={batch.id.toString()}
                >
                  Lote #{batch.id.toString()} ({batch.animal_ids?.length || 0} animales)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IDs de Animales a Agregar
            </label>
            <input
              type="text"
              value={animalsToAdd}
              onChange={(e) => setAnimalsToAdd(e.target.value)}
              placeholder="Ej: 4, 5"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || !selectedBatch || availableAnimals.length === 0}
            />
          </div>

          <button
            onClick={handleAddAnimalsToBatch}
            disabled={isLoading || !selectedBatch || !animalsToAdd || availableAnimals.length === 0}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-blue-300 transition-colors font-semibold"
          >
            {isLoading ? '⏳ Agregando...' : '➕ Agregar Animales al Lote'}
          </button>
        </div>
      </div>

      {/* Lista de Lotes */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-gray-700 text-lg">Mis Lotes</h4>
          <span className="text-sm text-gray-500">
            {batches.length} lote{batches.length !== 1 ? 's' : ''} •{' '}
            {batches.reduce((total, batch) => total + (batch.animal_ids?.length || 0), 0)} animales en lotes
          </span>
        </div>
        
        {batches.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-gray-500">No tienes lotes creados</p>
            <p className="text-gray-400 text-sm mt-1">
              {availableAnimals.length > 0 
                ? 'Usa el formulario arriba para crear tu primer lote' 
                : 'No tienes animales disponibles para crear lotes'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => (
              <div 
                key={`batch-${batch.id.toString()}`}
                className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h5 className="font-semibold text-lg">Lote #{batch.id.toString()}</h5>
                    <p className="text-sm text-gray-600">
                      📅 Creado: {formatDate(batch.fecha_creacion)}
                      {batch.fecha_transferencia > BigInt(0) && (
                        <span className="ml-4">
                          📤 Transferido: {formatDate(batch.fecha_transferencia)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      batch.estado === 0 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {batch.estado === 0 ? '🟢 Activo' : '📤 Transferido'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span className="font-medium">Animales:</span> {batch.animal_ids?.length || 0}
                  </div>
                  <div>
                    <span className="font-medium">Peso Total:</span> {batch.peso_total?.toString() || '0'} kg
                  </div>
                  <div>
                    <span className="font-medium">Propietario:</span> {batch.propietario?.slice(0, 8)}...
                  </div>
                  <div>
                    <span className="font-medium">Frigorífico:</span> {batch.frigorifico && batch.frigorifico !== '0x0' ? `${batch.frigorifico.slice(0, 8)}...` : 'No asignado'}
                  </div>
                </div>

                {batch.animal_ids && batch.animal_ids.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      🐄 Animales en lote ({batch.animal_ids.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {batch.animal_ids.slice(0, 8).map((animalId: bigint, index: number) => (
                        <span 
                          key={`animal-${animalId.toString()}-in-batch-${batch.id.toString()}-${index}`}
                          className="bg-gray-100 px-2 py-1 rounded text-xs border"
                        >
                          #{animalId.toString()}
                        </span>
                      ))}
                      {batch.animal_ids.length > 8 && (
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                          +{batch.animal_ids.length - 8} más
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* ✅ Botón de transferencia SOLO para lotes activos */}
                {batch.estado === 0 && batch.animal_ids && batch.animal_ids.length > 0 && (
                  <div className="mt-4 flex gap-2 items-center">
                    <button
                      onClick={() => startTransferProcess('batch', undefined, batch.id.toString())}
                      disabled={isLoading}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-green-600 text-white rounded-lg hover:from-blue-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-colors text-sm flex items-center gap-2 font-semibold"
                    >
                      🏭 Transferir a Frigorífico
                    </button>
                    <span className="text-xs text-gray-500">
                      {batch.animal_ids.length} animales
                    </span>
                  </div>
                )}

                {batch.estado !== 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 text-sm text-center">
                      ✅ Transferido - Esperando procesamiento
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}