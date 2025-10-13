// VERSIÓN FINAL - FILTRADO AGGRESIVO DE DUPLICADOS
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
  onAceptarTransferencia: (id: bigint, tipo: 'animal' | 'lote') => Promise<void>;
  onProcesarLote: (loteId: bigint) => Promise<void>;
  contractService: any;
  address: string;
}

const PRECIO_POR_KILO = 4.5;

export function PendientesTab({
  transferenciasPendientes,
  onAceptarTransferencia,
  onProcesarLote,
  contractService,
  address
}: PendientesTabProps) {
  const [lotesConPesosReales, setLotesConPesosReales] = useState<LotePendienteConPeso[]>([]);
  const [animalesConPesosReales, setAnimalesConPesosReales] = useState<AnimalEnFrigorificoConPeso[]>([]);
  const [cacheAvailable, setCacheAvailable] = useState(false);
  const [cacheCargado, setCacheCargado] = useState(false);
  const [cargandoPesos, setCargandoPesos] = useState(false);
  const [animalesCache, setAnimalesCache] = useState<Map<string, any>>(new Map());

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

  // 🎯 FUNCIÓN PARA ELIMINAR DUPLICADOS AGGRESIVAMENTE
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

  // ⚡ PROCESAR LOTES - FILTRADO AGGRESIVO
  useEffect(() => {
    if (!cacheCargado || !transferenciasPendientes.batches) {
      return;
    }

    console.log('🔄 [PROCESAMIENTO] Procesando lotes...');
    console.log('📦 LOTES ORIGINALES de StarkNet:', transferenciasPendientes.batches.length);

    // 🎯 ELIMINAR DUPLICADOS AGGRESIVAMENTE
    const lotesUnicos = eliminarDuplicados(transferenciasPendientes.batches);
    
    console.log('🎯 LOTES ÚNICOS después de filtrar:', {
      original: transferenciasPendientes.batches.length,
      unicos: lotesUnicos.length,
      ids: lotesUnicos.map(l => l.id.toString())
    });

    // 🎯 PROCESAR SOLO LOS LOTES ÚNICOS
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
              } catch (e) {
                // Ignorar error
              }
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
    
    console.log('✅ [LOTES FINALES]:', {
      lotesMostrados: lotesActualizados.length,
      ids: lotesActualizados.map(l => l.id.toString())
    });
    
  }, [transferenciasPendientes.batches, cacheCargado, animalesCache]);

  // 🐄 PROCESAR ANIMALES INDIVIDUALES - FILTRADO AGGRESIVO
  useEffect(() => {
    if (!cacheCargado || !transferenciasPendientes.animals) {
      return;
    }

    console.log('🔄 [ANIMALES] Procesando animales individuales...');
    console.log('🐄 ANIMALES ORIGINALES de StarkNet:', transferenciasPendientes.animals?.length);

    // 🎯 ELIMINAR DUPLICADOS AGGRESIVAMENTE
    const animalesUnicos = eliminarDuplicados(transferenciasPendientes.animals || []);
    
    console.log('🎯 ANIMALES ÚNICOS después de filtrar:', {
      original: transferenciasPendientes.animals?.length || 0,
      unicos: animalesUnicos.length,
      ids: animalesUnicos.map(a => a.id.toString())
    });

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
          } catch (e) {
            // Ignorar error
          }
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
    
    console.log('✅ [ANIMALES FINALES]:', {
      animalesMostrados: animalesActualizados.length
    });
  }, [transferenciasPendientes.animals, cacheCargado, animalesCache]);

  // 📊 CALCULAR ESTADÍSTICAS
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
            </p>
          </div>
        </div>

        {/* ESTADÍSTICAS - ENFATIZAR QUE SON ÚNICOS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{estadisticas.totalLotes}</div>
            <div className="text-blue-800 font-semibold">Lotes Únicos</div>
            <div className="text-blue-600 text-xs">
              {estadisticas.lotesConPeso} con peso real
            </div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="text-2xl font-bold text-green-600">{estadisticas.totalAnimales}</div>
            <div className="text-green-800 font-semibold">Animales Únicos</div>
            <div className="text-green-600 text-xs">
              {estadisticas.animalesConPeso} con peso real
            </div>
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

        {/* INFO SOBRE DUPLICADOS */}
        {transferenciasPendientes.batches && transferenciasPendientes.batches.length > estadisticas.totalLotes && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
            ℹ️ StarkNet envió {transferenciasPendientes.batches.length} lotes, se filtraron {estadisticas.totalLotes} únicos
          </div>
        )}
      </div>

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
                isProcessing={false}
                chipyProcessing={false}
                onAceptar={() => onAceptarTransferencia(lote.id, 'lote')}
                onProcesar={() => onProcesarLote(lote.id)}
                cacheAvailable={cacheAvailable}
                blockchainAvailable={!!contractService}
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
                isProcessing={false}
                chipyProcessing={false}
                onAceptar={() => onAceptarTransferencia(animal.id, 'animal')}
                cacheAvailable={cacheAvailable}
                blockchainAvailable={!!contractService}
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
    </div>
  );
}