// VERSIÓN COMPLETA CON PAGOS Y VERIFICACIÓN MEJORADA
'use client';

import { useState, useEffect } from 'react';
import { LotePendienteCard } from '../components/LotePendienteCard';
import { AnimalPendienteCard } from '../components/AnimalPendienteCard';
import { TransferenciasPendientes, LotePendiente, AnimalEnFrigorifico } from '../types';
import { cacheService } from '@/services/CacheService';

interface LotePendienteConPeso extends LotePendiente {
  peso_total_real?: number;
  peso_total_kg?: number;
  precio_total?: number;
  animales_con_peso_real?: number;
  fuente_peso?: string;
}

interface AnimalEnFrigorificoConPeso extends AnimalEnFrigorifico {
  peso_gramos?: number;
  peso_kg?: number;
  precio_total?: number;
  fuente_peso?: string;
}

interface PendientesTabProps {
  transferenciasPendientes: TransferenciasPendientes;
  onAceptarTransferencia: (id: bigint, tipo: 'animal' | 'lote', precioTotal: number) => Promise<void>;
  onProcesarLote: (loteId: bigint) => Promise<void>;
  contractService: any;
  address: string;
  isFrigorifico: boolean;
}

const PRECIO_POR_KILO = 4.5;

export function PendientesTab({
  transferenciasPendientes,
  onAceptarTransferencia,
  onProcesarLote,
  contractService,
  address,
  isFrigorifico
}: PendientesTabProps) {
  const [lotesConPesosReales, setLotesConPesosReales] = useState<LotePendienteConPeso[]>([]);
  const [animalesConPesosReales, setAnimalesConPesosReales] = useState<AnimalEnFrigorificoConPeso[]>([]);
  const [cacheAvailable, setCacheAvailable] = useState(false);
  const [cacheCargado, setCacheCargado] = useState(false);
  const [cargandoPesos, setCargandoPesos] = useState(false);
  const [animalesCache, setAnimalesCache] = useState<Map<string, any>>(new Map());
  const [procesando, setProcesando] = useState<{id: bigint, tipo: 'animal' | 'lote'} | null>(null);
  const [error, setError] = useState<string>('');

  // 📥 CARGAR CACHE
  useEffect(() => {
    const cargarCache = async () => {
      try {
        console.log('🔄 [CACHE] Cargando cache...');
        setCargandoPesos(true);
        
        const health = await cacheService.healthCheck();
        const cacheDisponible = health?.status === 'healthy';
        setCacheAvailable(cacheDisponible);
        
        if (!cacheDisponible) {
          console.log('❌ Cache no disponible');
          setCacheCargado(true);
          return;
        }

        console.log('📥 [CACHE] Obteniendo animales...');
        const respuestaAnimales = await cacheService.getAllAnimals();
        
        const animalesMap = new Map();
        
        let animalesArray;
        if (Array.isArray(respuestaAnimales)) {
          animalesArray = respuestaAnimales;
        } else if (respuestaAnimales && typeof respuestaAnimales === 'object') {
          animalesArray = Object.values(respuestaAnimales);
        } else {
          setCacheCargado(true);
          return;
        }

        console.log(`📊 [CACHE] Procesando ${animalesArray.length} animales`);
        
        animalesArray.forEach((animal: any) => {
          if (animal && animal.id) {
            const animalId = animal.id.toString();
            animalesMap.set(animalId, animal);
          }
        });
        
        setAnimalesCache(animalesMap);
        setCacheCargado(true);
        
        console.log('✅ [CACHE] Carga completada');

      } catch (error) {
        console.error('❌ Error cargando cache:', error);
        setCacheAvailable(false);
        setCacheCargado(true);
      } finally {
        setCargandoPesos(false);
      }
    };

    cargarCache();
  }, []);

  // 🎯 ELIMINAR DUPLICADOS
  const eliminarDuplicados = <T extends { id: bigint }>(items: T[]): T[] => {
    const unicos: T[] = [];
    const idsVistos = new Set<string>();
    
    items.forEach(item => {
      const idStr = item.id.toString();
      if (!idsVistos.has(idStr)) {
        idsVistos.add(idStr);
        unicos.push(item);
      }
    });
    
    return unicos;
  };

  // ⚡ PROCESAR LOTES
  useEffect(() => {
    if (!cacheCargado || !transferenciasPendientes.batches) return;

    console.log('🔄 [PROCESAMIENTO] Procesando lotes...');

    const lotesUnicos = eliminarDuplicados(transferenciasPendientes.batches);
    
    console.log('🎯 LOTES ÚNICOS:', {
      original: transferenciasPendientes.batches.length,
      unicos: lotesUnicos.length
    });

    const lotesActualizados = lotesUnicos.map(lote => {
      const loteId = lote.id.toString();
      
      let pesoTotalReal = 0;
      let animalesConPesoReal = 0;

      if (lote.animal_ids) {
        for (const animalId of lote.animal_ids) {
          const animalIdStr = animalId.toString();
          const animalCache = animalesCache.get(animalIdStr);

          if (animalCache) {
            let pesoAnimal = 0;
            
            if (animalCache.peso_inicial) {
              pesoAnimal = parseFloat(animalCache.peso_inicial);
            } 
            else if (animalCache.starknet_data) {
              try {
                const starknetData = JSON.parse(animalCache.starknet_data);
                if (starknetData.peso) {
                  pesoAnimal = parseFloat(starknetData.peso);
                }
              } catch (e) {}
            }

            if (pesoAnimal > 0) {
              pesoTotalReal += pesoAnimal;
              animalesConPesoReal++;
            }
          }
        }
      }

      const precioTotal = pesoTotalReal * PRECIO_POR_KILO;

      return {
        ...lote,
        peso_total_real: pesoTotalReal,
        peso_total_kg: pesoTotalReal,
        precio_total: precioTotal,
        animales_con_peso_real: animalesConPesoReal,
        fuente_peso: animalesConPesoReal > 0 ? 'cache' : 'no_encontrado'
      };
    });

    setLotesConPesosReales(lotesActualizados);
    
  }, [transferenciasPendientes.batches, cacheCargado, animalesCache]);

  // 🐄 PROCESAR ANIMALES INDIVIDUALES
  useEffect(() => {
    if (!cacheCargado || !transferenciasPendientes.animals) return;

    const animalesUnicos = eliminarDuplicados(transferenciasPendientes.animals || []);

    const animalesActualizados = animalesUnicos.map(animal => {
      const animalIdStr = animal.id.toString();
      const animalCache = animalesCache.get(animalIdStr);
      
      let pesoReal = 0;
      let fuentePeso = 'no_encontrado';

      if (animalCache) {
        if (animalCache.peso_inicial) {
          pesoReal = parseFloat(animalCache.peso_inicial);
          fuentePeso = 'cache_peso_inicial';
        }
        else if (animalCache.starknet_data) {
          try {
            const starknetData = JSON.parse(animalCache.starknet_data);
            if (starknetData.peso) {
              pesoReal = parseFloat(starknetData.peso);
              fuentePeso = 'cache_starknet_data';
            }
          } catch (e) {}
        }
      }

      const precioTotal = pesoReal * PRECIO_POR_KILO;

      return {
        ...animal,
        peso_gramos: pesoReal * 1000,
        peso_kg: pesoReal,
        precio_total: precioTotal,
        fuente_peso: fuentePeso
      };
    });
    
    setAnimalesConPesosReales(animalesActualizados);
  }, [transferenciasPendientes.animals, cacheCargado, animalesCache]);

  // 💰 MANEJAR ACEPTACIÓN CON PAGO
  const manejarAceptacion = async (id: bigint, tipo: 'animal' | 'lote', precioTotal: number) => {
    if (!isFrigorifico) {
      setError('❌ No tienes permisos de frigorífico');
      return;
    }

    if (!contractService) {
      setError('❌ Contrato no disponible');
      return;
    }

    setProcesando({ id, tipo });
    setError('');

    try {
      console.log(`💰 [PAGO] Iniciando pago para ${tipo} ${id} - $${precioTotal.toFixed(2)}`);

      // 1. VERIFICAR ROL DE FRIGORÍFICO EN EL CONTRATO
      console.log('🔍 Verificando rol de frigorífico...');
      const tieneRolFrigorifico = await contractService.hasRole('FRIGORIFICO_ROLE', address);
      
      if (!tieneRolFrigorifico) {
        throw new Error('No tienes el rol FRIGORIFICO_ROLE en el contrato');
      }

      // 2. SIMULAR PAGO CON CHIPYPAY
      console.log('💳 Simulando pago con ChipyPay...');
      await simularPagoChipyPay(id, tipo, precioTotal);

      // 3. EJECUTAR TRANSFERENCIA EN BLOCKCHAIN
      console.log('⛓️ Ejecutando transferencia en blockchain...');
      await onAceptarTransferencia(id, tipo, precioTotal);

      // 4. ACTUALIZAR CACHE
      console.log('💾 Actualizando cache...');
      await actualizarCacheDespuesTransferencia(id, tipo);

      console.log('✅ Transferencia completada exitosamente');

    } catch (error: any) {
      console.error('❌ Error en transferencia:', error);
      setError(`Error: ${error.message || 'Error desconocido'}`);
    } finally {
      setProcesando(null);
    }
  };

  // 💳 SIMULAR PAGO CON CHIPYPAY
  const simularPagoChipyPay = async (id: bigint, tipo: 'animal' | 'lote', monto: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log(`💳 [CHIPYPAY] Iniciando pago simulado: $${monto.toFixed(2)}`);
      
      // Simular delay de pago
      setTimeout(() => {
        // Simular éxito de pago (en producción aquí iría la integración real con ChipyPay)
        const exito = Math.random() > 0.1; // 90% de éxito
        
        if (exito) {
          console.log('✅ [CHIPYPAY] Pago simulado exitoso');
          resolve();
        } else {
          console.log('❌ [CHIPYPAY] Pago simulado fallido');
          reject(new Error('Pago con ChipyPay fallido'));
        }
      }, 2000);
    });
  };

  // 💾 ACTUALIZAR CACHE DESPUÉS DE TRANSFERENCIA
  const actualizarCacheDespuesTransferencia = async (id: bigint, tipo: 'animal' | 'lote'): Promise<void> => {
    try {
      if (tipo === 'lote') {
        // Actualizar estado del lote en cache
        const updates = {
          estado: 'procesado',
          estado_numero: 2,
          fecha_actualizacion: new Date().toISOString()
        };
        
        await cacheService.bulkUpsert('batches', {
          [id.toString()]: updates
        });
        
        console.log(`✅ Cache actualizado para lote ${id}`);
      }
      
      // También podrías actualizar animales individuales si es necesario
      
    } catch (error) {
      console.error('❌ Error actualizando cache:', error);
      // No rechazamos porque el pago ya se completó
    }
  };

  // 🎯 MANEJAR PROCESAMIENTO (PASO SIGUIENTE)
  const manejarProcesamiento = async (loteId: bigint) => {
    if (!isFrigorifico) {
      setError('❌ No tienes permisos de frigorífico');
      return;
    }

    setProcesando({ id: loteId, tipo: 'lote' });
    setError('');

    try {
      console.log(`🔪 [PROCESAMIENTO] Iniciando procesamiento para lote ${loteId}`);
      
      // Verificar que el lote esté en estado correcto para procesar
      const lote = lotesConPesosReales.find(l => l.id === loteId);
      if (!lote) {
        throw new Error('Lote no encontrado');
      }

      if (lote.estado !== 1) { // 1 = transferido
        throw new Error('El lote no está en estado transferido');
      }

      // Ejecutar procesamiento en blockchain
      await onProcesarLote(loteId);

      console.log('✅ Procesamiento completado - Listo para cortes');

    } catch (error: any) {
      console.error('❌ Error en procesamiento:', error);
      setError(`Error: ${error.message || 'Error desconocido'}`);
    } finally {
      setProcesando(null);
    }
  };

  // 📊 ESTADÍSTICAS
  const estadisticas = {
    totalLotes: lotesConPesosReales.length,
    totalAnimales: animalesConPesosReales.length,
    lotesConPeso: lotesConPesosReales.filter(l => l.fuente_peso === 'cache').length,
    animalesConPeso: animalesConPesosReales.filter(a => a.fuente_peso !== 'no_encontrado').length,
    pesoTotal: lotesConPesosReales.reduce((sum, l) => sum + (l.peso_total_kg || 0), 0) +
               animalesConPesosReales.reduce((sum, a) => sum + (a.peso_kg || 0), 0),
    valorTotal: lotesConPesosReales.reduce((sum, l) => sum + (l.precio_total || 0), 0) +
                animalesConPesosReales.reduce((sum, a) => sum + (a.precio_total || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Transferencias Pendientes</h3>
            <p className="text-sm text-gray-600">
              Frigorífico: {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'No conectado'}
              {isFrigorifico && ' ✅'} 
              {!isFrigorifico && ' ❌'}
            </p>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{estadisticas.totalLotes}</div>
            <div className="text-blue-800 font-semibold">Lotes Únicos</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{estadisticas.totalAnimales}</div>
            <div className="text-green-800 font-semibold">Animales Únicos</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {estadisticas.pesoTotal.toFixed(1)} kg
            </div>
            <div className="text-orange-800">Peso Total</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              ${estadisticas.valorTotal.toFixed(2)}
            </div>
            <div className="text-purple-800">Valor Total</div>
          </div>
        </div>

        {/* ALERTA DE PERMISOS */}
        {!isFrigorifico && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            ⚠️ No tienes permisos de frigorífico. No puedes aceptar transferencias.
          </div>
        )}
      </div>

      {/* ERROR */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-800">
            <span>❌</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* CARGA */}
      {cargandoPesos && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <p className="text-blue-800">Cargando cache...</p>
          </div>
        </div>
      )}

      {/* LOTES PENDIENTES */}
      {lotesConPesosReales.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            📦 Lotes Pendientes ({estadisticas.totalLotes})
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {lotesConPesosReales.map((lote, index) => (
              <LotePendienteCard
                key={`lote-${lote.id}-${index}`}
                lote={lote}
                precioPorKilo={PRECIO_POR_KILO}
                isProcessing={procesando?.id === lote.id && procesando.tipo === 'lote'}
                chipyProcessing={false}
                onAceptar={() => manejarAceptacion(lote.id, 'lote', lote.precio_total || 0)}
                onProcesar={() => manejarProcesamiento(lote.id)}
                cacheAvailable={cacheAvailable}
                blockchainAvailable={!!contractService}
                isFrigorifico={isFrigorifico}
              />
            ))}
          </div>
        </div>
      )}

      {/* ANIMALES INDIVIDUALES PENDIENTES */}
      {animalesConPesosReales.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            🐄 Animales Individuales Pendientes ({estadisticas.totalAnimales})
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {animalesConPesosReales.map((animal, index) => (
              <AnimalPendienteCard
                key={`animal-${animal.id}-${index}`}
                animal={animal}
                precioPorKilo={PRECIO_POR_KILO}
                isProcessing={procesando?.id === animal.id && procesando.tipo === 'animal'}
                chipyProcessing={false}
                onAceptar={() => manejarAceptacion(animal.id, 'animal', animal.precio_total || 0)}
                cacheAvailable={cacheAvailable}
                blockchainAvailable={!!contractService}
                isFrigorifico={isFrigorifico}
              />
            ))}
          </div>
        </div>
      )}

      {/* VACÍO */}
      {lotesConPesosReales.length === 0 && animalesConPesosReales.length === 0 && !cargandoPesos && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay transferencias pendientes</h3>
        </div>
      )}

      {/* INFO FLUJO */}
      {isFrigorifico && (estadisticas.totalLotes > 0 || estadisticas.totalAnimales > 0) && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-semibold text-green-800 mb-2">🎯 Flujo de Trabajo</h4>
          <ol className="text-sm text-green-700 space-y-1">
            <li>1. <strong>Aceptar Transferencia</strong> - Realizar pago al productor vía ChipyPay</li>
            <li>2. <strong>Procesar Lote</strong> - Cambiar estado a "procesado" (después del pago)</li>
            <li>3. <strong>Cortes</strong> - Proceder con el despiece y certificación</li>
          </ol>
        </div>
      )}
    </div>
  );
}