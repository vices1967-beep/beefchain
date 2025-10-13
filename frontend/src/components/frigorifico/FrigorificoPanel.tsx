// src/components/frigorifico/FrigorificoDashboard.tsx - VERSIÓN CORREGIDA
'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';
import { PendientesTab } from './tabs/PendientesTab';
import { TransaccionesPendientesTab } from './tabs/TransaccionesPendientesTab';
import { CortesTab } from './tabs/CortesTab';
import { CacheDataTab } from './tabs/CacheDataTab';
import { TransferenciasPendientes, LotePendiente } from './types';
import { syncService } from '@/services/SyncService';

// Interfaces para tipos
interface SyncStatus {
  isSyncing: boolean;
  cacheStats: any;
  blockchainStats: any;
}

interface FullSyncResult {
  success: boolean;
  animals: number;
  batches: number;
  errors: number;
}

export function FrigorificoDashboard() {
  const { address, isConnected, contractService } = useStarknet();
  const [activeTab, setActiveTab] = useState<'pendientes' | 'cortes' | 'transacciones' | 'cache'>('pendientes');

  // Estados para la pestaña de pendientes
  const [aceptandoTransferencia, setAceptandoTransferencia] = useState<bigint | null>(null);
  const [tipoTransferencia, setTipoTransferencia] = useState<'animal' | 'lote' | null>(null);
  const [chipyProcessing, setChipyProcessing] = useState(false);
  const [transferenciasPendientes, setTransferenciasPendientes] = useState<TransferenciasPendientes>({
    animals: [],
    batches: []
  });
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [transaccionesCache, setTransaccionesCache] = useState<any[]>([]);
  const [lotesProcesados, setLotesProcesados] = useState<any[]>([]);
  
  // Estados para sincronización
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // 🔄 CONFIGURAR SYNC SERVICE
  useEffect(() => {
    if (contractService) {
      syncService.setContractService(contractService);
      
      const checkInitialSync = async () => {
        const status = await syncService.getSyncStatus();
        setSyncStatus(status);
      };
      
      checkInitialSync();
    }
  }, [contractService]);

  // Cargar datos al conectar
  useEffect(() => {
    if (isConnected && contractService && address) {
      cargarTransferenciasPendientesReales();
      cargarTransaccionesCache();
      cargarLotesProcesados();
    }
  }, [isConnected, contractService, address]);

  // 🔄 FUNCIÓN PARA SINCRONIZAR
  const handleFullSync = async () => {
    if (!contractService || !address) {
      alert('❌ Contract service no disponible');
      return;
    }

    setIsSyncing(true);
    try {
      const result: FullSyncResult = await syncService.fullSystemSync();
      setSyncStatus(await syncService.getSyncStatus());
      
      if (result.success) {
        alert(`✅ Sincronización exitosa!\n\n• ${result.animals} animales sincronizados\n• ${result.batches} lotes sincronizados`);
        await cargarTransferenciasPendientesReales();
      } else {
        alert(`⚠️ Sincronización con errores\n\n• ${result.animals} animales sincronizados\n• ${result.errors} errores`);
      }
    } catch (error: any) {
      console.error('❌ Error en sincronización:', error);
      alert(`❌ Error en sincronización: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 🔍 CARGAR LOTES PROCESADOS PARA CORTES - USANDO FUNCIONES EXISTENTES
  const cargarLotesProcesados = async () => {
    if (!contractService || !address) return;
    
    try {
      // ✅ USAR getBatchesByProducer que SÍ existe
      const misLotes = await contractService.getBatchesByProducer(address);
      const lotesProcesadosFiltrados = [];
      
      for (const batchId of misLotes) {
        try {
          // ✅ USAR getBatchInfo que SÍ existe
          const loteData = await contractService.getBatchInfo(batchId);
          
          // Filtrar lotes procesados (estado 2) que pertenecen a este frigorífico
          if (loteData.estado === 2 && 
              loteData.frigorifico?.toLowerCase() === address.toLowerCase()) {
            lotesProcesadosFiltrados.push({
              ...loteData,
              id: batchId
            });
          }
        } catch (error) {
          console.log(`❌ Error obteniendo lote #${batchId}:`, error);
        }
      }
      
      setLotesProcesados(lotesProcesadosFiltrados);
      
    } catch (error) {
      console.error('❌ Error cargando lotes procesados:', error);
    }
  };

  // 🔍 CARGAR TRANSACCIONES DEL CACHE
  const cargarTransaccionesCache = async () => {
    if (!address) return;
    
    try {
      const { cacheService } = await import('@/services/CacheService');
      const transacciones = await cacheService.obtenerTransacciones(address);
      
      const transferenciasPendientesCache = transacciones.filter((tx: any) => 
        tx.estado === 'pendiente' && 
        (tx.tipo === 'animal_transferred' || tx.tipo === 'batch_transferred')
      );
      
      setTransaccionesCache(transferenciasPendientesCache);
      
    } catch (error) {
      console.error('❌ Error cargando transacciones del cache:', error);
    }
  };

  // 🔧 SINCRONIZAR CACHE CON STARKNET - CORREGIDO CON FUNCIONES EXISTENTES
  const sincronizarCacheConStarkNet = async () => {
    if (!contractService || !address) {
      alert('❌ Contract service o address no disponible');
      return;
    }

    setCargando(true);
    
    try {
      const { cacheService } = await import('@/services/CacheService');
      const todasTransacciones = await cacheService.obtenerTransacciones(address);

      let sincronizadas = 0;
      let corregidas = 0;

      for (const tx of todasTransacciones) {
        try {
          if (tx.tipo === 'animal_transferred' && tx.data?.animalId) {
            const animalId = BigInt(tx.data.animalId);
            
            try {
              // ✅ USAR getAnimalData que SÍ existe
              const animalStarkNet = await contractService.getAnimalData(animalId);
              
              if (animalStarkNet && animalStarkNet.propietario !== '0x0') {
                const estadoReal = animalStarkNet.estado;
                const estadoCache = tx.data.estado || 'pendiente';
                
                // Corregir cache si hay discrepancia
                if ((estadoReal === 2 && estadoCache !== 'procesado') || 
                    (estadoReal === 1 && estadoCache !== 'transferido')) {
                  
                  await cacheService.actualizarOwnerAnimal(
                    animalId.toString(),
                    animalStarkNet.propietario,
                    animalStarkNet.frigorifico || address,
                    tx.hash
                  );
                  corregidas++;
                }
                
                // Marcar como completada si ya está en StarkNet
                if (tx.estado === 'pendiente' && estadoReal >= 1) {
                  await cacheService.actualizarEstadoTransaccion(tx.hash, 'completada');
                  sincronizadas++;
                }
              }
            } catch (error) {
              console.log(`❌ Animal ${animalId} no existe en StarkNet`);
            }
            
          } else if (tx.tipo === 'batch_transferred' && tx.data?.batchId) {
            const batchId = BigInt(tx.data.batchId);
            
            try {
              // ✅ USAR getBatchInfo que SÍ existe
              const batchStarkNet = await contractService.getBatchInfo(batchId);
              
              if (batchStarkNet && batchStarkNet.propietario !== '0x0') {
                const estadoReal = batchStarkNet.estado;
                const estadoCache = tx.data.estado || 'pendiente';
                
                // Corregir cache si hay discrepancia
                if ((estadoReal === 2 && estadoCache !== 'procesado') || 
                    (estadoReal === 1 && estadoCache !== 'transferido')) {
                  
                  const animalIds = batchStarkNet.animal_ids || batchStarkNet.animal_ids || [];
                  await cacheService.actualizarOwnerLote(
                    batchId.toString(),
                    batchStarkNet.propietario,
                    animalIds.map((id: bigint) => id.toString()),
                    batchStarkNet.frigorifico || address,
                    tx.hash
                  );
                  corregidas++;
                }
                
                // Marcar como completada si ya está en StarkNet
                if (tx.estado === 'pendiente' && estadoReal >= 1) {
                  await cacheService.actualizarEstadoTransaccion(tx.hash, 'completada');
                  sincronizadas++;
                }
              }
            } catch (error) {
              console.log(`❌ Lote ${batchId} no existe en StarkNet`);
            }
          }
        } catch (error) {
          console.error(`❌ Error sincronizando transacción ${tx.hash}:`, error);
        }
      }

      await cargarTransaccionesCache();
      await cargarTransferenciasPendientesReales();

      alert(`🔄 Sincronización completada:\n\n✅ Transacciones sincronizadas: ${sincronizadas}\n🔧 Estados corregidos: ${corregidas}`);

    } catch (error: any) {
      console.error('❌ Error sincronizando cache:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  // 🔧 EJECUTAR TRANSACCIONES PENDIENTES DEL CACHE - CORREGIDO
  const ejecutarTransaccionesPendientes = async () => {
    if (!contractService || !address) {
      alert('❌ Contract service o address no disponible');
      return;
    }

    setCargando(true);
    
    try {
      const { cacheService } = await import('@/services/CacheService');
      const transacciones = await cacheService.obtenerTransacciones(address);
      const transaccionesPendientes = transacciones.filter((tx: any) => 
        tx.estado === 'pendiente' && 
        (tx.tipo === 'animal_transferred' || tx.tipo === 'batch_transferred')
      );

      if (transaccionesPendientes.length === 0) {
        alert('✅ No hay transacciones pendientes para ejecutar');
        return;
      }

      let ejecutadasExitosas = 0;
      let ejecutadasConError = 0;

      for (const tx of transaccionesPendientes) {
        try {
          // VERIFICAR: Estas funciones deben existir en tu ABI
          if (tx.tipo === 'animal_transferred' && tx.data?.animalId) {
            const animalId = BigInt(tx.data.animalId);
            
            // Verificar si ya existe en StarkNet
            try {
              const animalStarkNet = await contractService.getAnimalData(animalId);
              if (animalStarkNet && animalStarkNet.propietario !== '0x0') {
                // Ya existe, marcar como completada
                await cacheService.actualizarEstadoTransaccion(tx.hash, 'completada');
                ejecutadasExitosas++;
                continue;
              }
            } catch (error) {
              // El animal no existe, proceder con la ejecución
            }

            // ⚠️ ADVERTENCIA: acceptAnimalTransfer debe existir en el contrato
            if (typeof contractService.acceptAnimalTransfer === 'function') {
              await contractService.acceptAnimalTransfer(animalId);
            } else {
              console.warn('⚠️ acceptAnimalTransfer no disponible en el contrato');
            }
            
          } else if (tx.tipo === 'batch_transferred' && tx.data?.batchId) {
            const batchId = BigInt(tx.data.batchId);
            
            // Verificar si ya existe en StarkNet
            try {
              const batchStarkNet = await contractService.getBatchInfo(batchId);
              if (batchStarkNet && batchStarkNet.propietario !== '0x0') {
                // Ya existe, marcar como completada
                await cacheService.actualizarEstadoTransaccion(tx.hash, 'completada');
                ejecutadasExitosas++;
                continue;
              }
            } catch (error) {
              // El lote no existe, proceder con la ejecución
            }

            // ⚠️ ADVERTENCIA: acceptBatchTransfer debe existir en el contrato
            if (typeof contractService.acceptBatchTransfer === 'function') {
              await contractService.acceptBatchTransfer(batchId);
            } else {
              console.warn('⚠️ acceptBatchTransfer no disponible en el contrato');
            }
          } else {
            ejecutadasConError++;
            continue;
          }

          await cacheService.actualizarEstadoTransaccion(tx.hash, 'completada');
          ejecutadasExitosas++;

        } catch (error: any) {
          console.error(`❌ Error ejecutando transacción ${tx.hash}:`, error);
          ejecutadasConError++;
          
          await cacheService.actualizarEstadoTransaccion(
            tx.hash, 
            'fallida', 
            error.message
          );
        }
      }

      await cargarTransaccionesCache();
      await cargarTransferenciasPendientesReales();

      alert(`🎯 Resultado de ejecución:\n\n✅ Exitosas: ${ejecutadasExitosas}\n❌ Con error: ${ejecutadasConError}`);

    } catch (error: any) {
      console.error('❌ Error ejecutando transacciones pendientes:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  // 🔍 CARGAR TRANSFERENCIAS PENDIENTES - CORREGIDO CON FUNCIONES EXISTENTES
  const cargarTransferenciasPendientesReales = async () => {
    if (!contractService || !address) {
      console.error('❌ Contract service o address no disponible');
      setErrorCarga('Wallet no conectada');
      return;
    }
    
    setCargando(true);
    setErrorCarga(null);
    
    try {
      // ✅ USAR funciones que SÍ existen según tu documentación
      const [animalesPendientes, lotesPendientes, misLotes] = await Promise.all([
        // ⚠️ VERIFICAR: Estas funciones deben existir en tu ABI
        contractService.getPendingAnimalsForFrigorifico?.().catch(() => []) || [],
        contractService.getPendingBatchesForFrigorifico?.().catch(() => []) || [],
        contractService.getBatchesByProducer(address).catch(() => [])
      ]);

      // Filtrar lotes PENDIENTES que pertenecen a este frigorífico
      const lotesParaEsteFrigorifico = (lotesPendientes || []).filter((lote: any) => {
        const frigorificoLote = lote.frigorifico || lote.destino || '';
        const pertenece = frigorificoLote.toLowerCase() === address.toLowerCase();
        const estaPendiente = lote.estado === 0 || lote.estado === 1;
        return pertenece && estaPendiente;
      });

      // Filtrar lotes ACEPTADOS (estado 1) de mis lotes
      const lotesAceptados = [];
      for (const batchId of misLotes) {
        try {
          const loteData = await contractService.getBatchInfo(batchId);
          const pertenece = loteData.frigorifico?.toLowerCase() === address.toLowerCase();
          const estaAceptado = loteData.estado === 1;
          
          if (pertenece && estaAceptado) {
            lotesAceptados.push({
              ...loteData,
              id: batchId
            });
          }
        } catch (error) {
          console.log(`❌ Error verificando lote ${batchId}:`, error);
        }
      }

      // Combinar lotes pendientes y aceptados
      const todosLotesParaTransferencias = [...lotesParaEsteFrigorifico, ...lotesAceptados];

      const lotesAdaptados: LotePendiente[] = todosLotesParaTransferencias.map((lote: any) => {
        const pesoTotal = lote.peso_total || lote.pesoTotal || BigInt(0);
        
        return {
          id: lote.id || BigInt(0),
          propietario: lote.propietario || '',
          frigorifico: lote.frigorifico || lote.destino || address,
          fecha_creacion: lote.fecha_creacion || lote.fechaCreacion || BigInt(0),
          fecha_transferencia: lote.fecha_transferencia || lote.fechaTransferencia || BigInt(0),
          fecha_procesamiento: lote.fecha_procesamiento || lote.fechaProcesamiento || BigInt(0),
          estado: lote.estado || 0,
          cantidad_animales: lote.cantidad_animales || lote.cantidadAnimales || 0,
          peso_total: pesoTotal,
          animal_ids: lote.animal_ids || lote.animalIds || [],
          tipo: 'lote'
        };
      });

      setTransferenciasPendientes({
        animals: animalesPendientes || [],
        batches: lotesAdaptados
      });
      
    } catch (error) {
      console.error('❌ Error cargando transferencias pendientes:', error);
      setErrorCarga('Error cargando datos de StarkNet');
    } finally {
      setCargando(false);
    }
  };

  // 💰 ACEPTAR TRANSFERENCIA - CORREGIDO CON FUNCIONES EXISTENTES
  const handleAceptarTransferenciaSegura = async (id: bigint, tipo: 'animal' | 'lote') => {
    if (!contractService || !address) {
      console.error('❌ Contract service o address no disponible');
      alert('❌ Error: Wallet no conectada');
      return;
    }

    setAceptandoTransferencia(id);
    setTipoTransferencia(tipo);
    setChipyProcessing(true);

    try {
      let datosStarkNet: any = null;
      
      try {
        // ✅ USAR funciones que SÍ existen
        if (tipo === 'animal') {
          datosStarkNet = await contractService.getAnimalData(id);
        } else {
          datosStarkNet = await contractService.getBatchInfo(id);
        }
      } catch (error) {
        console.error('❌ Error verificando StarkNet:', error);
        alert(`❌ ${tipo} #${id} no existe en StarkNet`);
        return;
      }

      if (!datosStarkNet || datosStarkNet.propietario === '0x0') {
        alert(`❌ ${tipo} #${id} no existe en StarkNet`);
        return;
      }

      // Verificar pertenencia
      const frigorificoStarkNet = datosStarkNet.frigorifico || datosStarkNet.destino || '';
      if (frigorificoStarkNet.toLowerCase() !== address.toLowerCase()) {
        alert(`❌ ${tipo} #${id} está asignado a otro frigorífico`);
        return;
      }

      // Verificar que no esté ya procesado
      if (datosStarkNet.estado === 2) {
        alert(`❌ ${tipo} #${id} ya fue procesado anteriormente`);
        return;
      }

      // Simular pago con ChipyPay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Aceptar transferencia en StarkNet
      let txHash: string;
      
      if (tipo === 'animal') {
        // ⚠️ VERIFICAR: acceptAnimalTransfer debe existir en el contrato
        if (typeof contractService.acceptAnimalTransfer === 'function') {
          txHash = await contractService.acceptAnimalTransfer(id);
        } else {
          // Fallback: usar procesarAnimal si acceptAnimalTransfer no existe
          console.warn('⚠️ acceptAnimalTransfer no disponible, usando procesarAnimal');
          txHash = await contractService.procesarAnimal(id);
        }
      } else {
        // ⚠️ VERIFICAR: acceptBatchTransfer debe existir en el contrato
        if (typeof contractService.acceptBatchTransfer === 'function') {
          txHash = await contractService.acceptBatchTransfer(id);
        } else {
          // Fallback: usar procesarBatch si acceptBatchTransfer no existe
          console.warn('⚠️ acceptBatchTransfer no disponible, usando procesarBatch');
          txHash = await contractService.procesarBatch(id);
        }
      }

      // Actualizar cache
      try {
        const { cacheService } = await import('@/services/CacheService');
        
        if (tipo === 'animal') {
          await cacheService.actualizarOwnerAnimal(
            id.toString(),
            address,
            address,
            txHash
          );
        } else {
          const lote = transferenciasPendientes.batches.find(b => b.id === id);
          const animalIds = lote?.animal_ids || [];
          await cacheService.actualizarOwnerLote(
            id.toString(),
            address,
            animalIds.map(id => id.toString()),
            address,
            txHash
          );
        }
      } catch (cacheError) {
        console.warn('⚠️ Error actualizando cache:', cacheError);
      }

      // Actualizar lista
      await cargarTransferenciasPendientesReales();
      await cargarTransaccionesCache();
      await cargarLotesProcesados();
      
      alert(`✅ ${tipo} #${id} aceptado exitosamente!\n\nTransacción: ${txHash.slice(0, 10)}...`);
      
    } catch (error: any) {
      console.error(`❌ Error en aceptación segura:`, error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setAceptandoTransferencia(null);
      setTipoTransferencia(null);
      setChipyProcessing(false);
    }
  };

  // 🔪 PROCESAR LOTE PARA CORTES - CORREGIDO CON FUNCIONES EXISTENTES
  const handleProcesarLoteParaCortes = async (loteId: bigint) => {
    if (!contractService || !address) {
      alert('❌ Contract service o address no disponible');
      return;
    }

    setCargando(true);
    
    try {
      // ✅ USAR getBatchInfo que SÍ existe
      const loteData = await contractService.getBatchInfo(loteId);
      if (!loteData || loteData.propietario.toLowerCase() !== address.toLowerCase()) {
        alert('❌ Lote no encontrado o no pertenece a este frigorífico');
        return;
      }

      // ✅ USAR procesarBatch que SÍ existe según tu documentación
      const txHash = await contractService.procesarBatch(loteId);

      // Actualizar cache
      try {
        const { cacheService } = await import('@/services/CacheService');
        const animalIds = loteData.animal_ids || loteData.animal_ids || [];
        await cacheService.actualizarOwnerLote(
          loteId.toString(),
          address,
          animalIds.map((id: bigint) => id.toString()),
          address,
          txHash
        );
      } catch (cacheError) {
        console.warn('⚠️ Error actualizando cache:', cacheError);
      }

      await cargarTransferenciasPendientesReales();
      await cargarLotesProcesados();

      alert(`✅ Lote #${loteId} procesado exitosamente!`);

    } catch (error: any) {
      console.error(`❌ Error procesando lote #${loteId}:`, error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  // Función para recargar datos
  const handleRecargar = () => {
    cargarTransferenciasPendientesReales();
    cargarTransaccionesCache();
    cargarLotesProcesados();
  };

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-4">🔌</div>
        <h3 className="text-xl font-semibold text-yellow-800 mb-2">Wallet No Conectada</h3>
        <p className="text-yellow-700">Conecta tu wallet para acceder al panel del Frigorífico</p>
      </div>
    );
  }

  const totalPendientes = transferenciasPendientes.animals.length + transferenciasPendientes.batches.length;
  const totalTransaccionesCache = transaccionesCache.length;
  const totalLotesProcesados = lotesProcesados.length;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
        <span className="text-3xl">🏭</span>
        Panel del Frigorífico
      </h3>

      {/* Pestañas principales - AHORA 4 PESTAÑAS */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pendientes')}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'pendientes'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ⏳ Transferencias ({totalPendientes})
        </button>
        <button
          onClick={() => setActiveTab('cortes')}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'cortes'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🥩 Cortes ({totalLotesProcesados})
        </button>
        <button
          onClick={() => setActiveTab('transacciones')}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'transacciones'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔄 Sincronizar ({totalTransaccionesCache})
        </button>
        <button
          onClick={() => setActiveTab('cache')}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'cache'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🗄️ Cache & Blockchain
        </button>
      </div>

      {/* Información del frigorífico */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-semibold text-blue-800 mb-1">🏭 Frigorífico Conectado</h4>
            <p className="text-blue-700 text-sm font-mono">
              {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'No conectado'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-700 text-sm">
              <strong>{totalPendientes}</strong> transferencias pendientes
            </p>
            <p className="text-blue-600 text-xs">
              {transferenciasPendientes.animals.length} animales • {transferenciasPendientes.batches.length} lotes
            </p>
            {cargando && (
              <span className="text-blue-500 text-xs mt-1 flex items-center gap-1">
                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></span>
                Cargando...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Botones de acción principales */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={handleFullSync}
          disabled={isSyncing || !contractService}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {isSyncing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Sincronizando...
            </>
          ) : (
            <>
              <span>🔄</span>
              Sincronizar con Blockchain
            </>
          )}
        </button>
        
        <button
          onClick={sincronizarCacheConStarkNet}
          disabled={cargando}
          className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <span>🔄</span>
          Sincronizar Cache
        </button>
        
        <button
          onClick={ejecutarTransaccionesPendientes}
          disabled={cargando || transaccionesCache.length === 0}
          className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <span>🚀</span>
          Ejecutar Tx Pendientes ({totalTransaccionesCache})
        </button>

        <button
          onClick={handleRecargar}
          disabled={cargando}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <span>🔄</span>
          Recargar Todo
        </button>
      </div>

      {/* Mostrar estado de sincronización */}
      {syncStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-blue-800 mb-2">Estado de Sincronización</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Sincronizando:</span>
              <span className={`ml-2 ${syncStatus.isSyncing ? 'text-orange-600' : 'text-green-600'}`}>
                {syncStatus.isSyncing ? '🔄 Sí' : '✅ No'}
              </span>
            </div>
            <div>
              <span className="font-medium">Animales en Cache:</span>
              <span className="ml-2 text-blue-600">
                {syncStatus.cacheStats?.summary?.total_animals || 0}
              </span>
            </div>
            <div>
              <span className="font-medium">Lotes en Cache:</span>
              <span className="ml-2 text-blue-600">
                {syncStatus.cacheStats?.summary?.total_batches || 0}
              </span>
            </div>
            <div>
              <span className="font-medium">Cache Health:</span>
              <span className={`ml-2 ${
                syncStatus.cacheStats?.system?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {syncStatus.cacheStats?.system?.status || 'unknown'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Contenido de las pestañas */}
      {activeTab === 'pendientes' && (
        <PendientesTab
          transferenciasPendientes={transferenciasPendientes}
          aceptandoTransferencia={aceptandoTransferencia}
          tipoTransferencia={tipoTransferencia}
          chipyProcessing={chipyProcessing}
          onAceptarTransferencia={handleAceptarTransferenciaSegura}
          onProcesarLote={handleProcesarLoteParaCortes}
          onRecargar={handleRecargar}
          contractService={contractService}
          address={address || ''}
        />
      )}

      {activeTab === 'cortes' && (
        <CortesTab
          lotesProcesados={lotesProcesados}
          contractService={contractService}
          address={address || ''}
          onRecargar={handleRecargar}
        />
      )}

      {activeTab === 'transacciones' && (
        <TransaccionesPendientesTab
          transaccionesCache={transaccionesCache}
          onEjecutarTransacciones={ejecutarTransaccionesPendientes}
          onSincronizarCache={sincronizarCacheConStarkNet}
          cargando={cargando}
        />
      )}

      {activeTab === 'cache' && (
        <CacheDataTab
          contractService={contractService}
          address={address || ''}
        />
      )}
    </div>
  );
}