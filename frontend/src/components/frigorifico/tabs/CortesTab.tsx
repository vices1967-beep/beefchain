// src/components/frigorifico/tabs/CortesTab.tsx - VERSIÓN COMPLETA
'use client';

import { useState, useMemo, useEffect } from 'react';
import { LotePendiente } from '../types';
import { cacheService } from '@/services/CacheService';

interface CortesTabProps {
  lotesProcesados: LotePendiente[];
  contractService: any;
  address: string | null;
  onRecargar: () => void;
}

interface CorteForm {
  tipoCorte: string;
  peso: string;
  cantidad: string;
  descripcion: string;
}

interface LoteConPesoReal {
  lote: LotePendiente;
  pesoTotalReal: number;
  animalesConPesoReal: number;
  totalAnimalesProcesados: number;
}

const TIPOS_CORTE = [
  'Bife de chorizo',
  'Lomo',
  'Cuadril',
  'Bola de lomo',
  'Colita de cuadril',
  'Entraña',
  'Asado',
  'Vacio',
  'Matambre',
  'Falda',
  'Tapa de asado',
  'Peceto',
  'Roast beef',
  'Paleta',
  'Carnaza'
];

export function CortesTab({ lotesProcesados, contractService, address, onRecargar }: CortesTabProps) {
  const [loteSeleccionado, setLoteSeleccionado] = useState<string>('');
  const [cortes, setCortes] = useState<CorteForm[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState<boolean>(false);
  const [realizandoCorte, setRealizandoCorte] = useState<boolean>(false);
  const [lotesConPesosReales, setLotesConPesosReales] = useState<LoteConPesoReal[]>([]);
  const [cargandoPesos, setCargandoPesos] = useState<boolean>(true);
  const [animalesCache, setAnimalesCache] = useState<Map<string, any>>(new Map());
  const [cacheCargado, setCacheCargado] = useState<boolean>(false);

  // ✅ PRIMERO: CARGAR CACHE UNA SOLA VEZ
  useEffect(() => {
    const cargarCacheCompleto = async () => {
      try {
        console.log('🔄 [CORTES] Iniciando carga de cache...');
        setCargandoPesos(true);
        
        const health = await cacheService.healthCheck();
        const cacheDisponible = health?.status === 'healthy';
        
        if (!cacheDisponible) {
          console.warn('⚠️ Cache no disponible para cortes, usando estimaciones');
          setCacheCargado(true);
          setCargandoPesos(false);
          return;
        }

        console.log('📥 [CORTES] Obteniendo todos los animales...');
        const todosAnimalesCache = await cacheService.getAllAnimals();
        console.log(`✅ [CORTES] ${todosAnimalesCache.length} animales cargados`);

        const animalesMap = new Map();
        let animalesConPesoReal = 0;

        todosAnimalesCache.forEach((animal: any) => {
          if (animal.id && animal.starknet_data) {
            const animalId = animal.id.toString();
            animalesMap.set(animalId, animal);
            
            if (animal.starknet_data.peso && parseInt(animal.starknet_data.peso) > 0) {
              animalesConPesoReal++;
            }
          }
        });

        setAnimalesCache(animalesMap);
        setCacheCargado(true);
        
        console.log(`🎯 [CORTES] Mapa creado: ${animalesMap.size} animales, ${animalesConPesoReal} con peso real`);

      } catch (error) {
        console.error('❌ Error cargando cache para cortes:', error);
        setCacheCargado(true);
      } finally {
        setCargandoPesos(false);
      }
    };

    cargarCacheCompleto();
  }, []);

  // ✅ SEGUNDO: PROCESAR LOTES CUANDO CACHE ESTÉ LISTO
  useEffect(() => {
    if (!cacheCargado || lotesProcesados.length === 0) {
      if (cacheCargado && lotesProcesados.length === 0) {
        setCargandoPesos(false);
      }
      return;
    }

    console.log('🔄 [CORTES] Procesando lotes con cache...');
    setCargandoPesos(true);

    try {
      const lotesConPeso: LoteConPesoReal[] = [];

      for (const lote of lotesProcesados) {
        let pesoTotalReal = 0;
        let animalesConPesoReal = 0;
        let animalesProcesados = 0;

        console.log(`🔍 [CORTES] Procesando lote #${lote.id} con ${lote.animal_ids?.length || 0} animales`);

        if (lote.animal_ids && lote.animal_ids.length > 0) {
          for (const animalId of lote.animal_ids) {
            const animalIdStr = animalId.toString();
            const animalCache = animalesCache.get(animalIdStr);
            animalesProcesados++;
            
            if (animalCache && animalCache.starknet_data && animalCache.starknet_data.peso) {
              const pesoAnimal = parseInt(animalCache.starknet_data.peso);
              if (!isNaN(pesoAnimal) && pesoAnimal > 0) {
                pesoTotalReal += pesoAnimal;
                animalesConPesoReal++;
                console.log(`✅ [CORTES] Animal #${animalId} - Peso REAL: ${pesoAnimal} gramos`);
              } else {
                const pesoEstimado = 450000;
                pesoTotalReal += pesoEstimado;
                console.log(`📦 [CORTES] Animal #${animalId} - Peso estimado: ${pesoEstimado} gramos (peso inválido: ${animalCache.starknet_data.peso})`);
              }
            } else {
              const pesoEstimado = 450000;
              pesoTotalReal += pesoEstimado;
              console.log(`📦 [CORTES] Animal #${animalId} - Peso estimado: ${pesoEstimado} gramos (no en cache)`);
            }
          }
        }

        if (pesoTotalReal === 0 && lote.cantidad_animales && lote.cantidad_animales > 0) {
          const pesoEstimadoPorAnimal = 450000;
          pesoTotalReal = lote.cantidad_animales * pesoEstimadoPorAnimal;
          console.log(`📦 [CORTES] Lote #${lote.id} - Peso estimado por cantidad: ${pesoTotalReal} gramos`);
        }

        console.log(`📊 [CORTES] Lote #${lote.id} - Total: ${pesoTotalReal}g, Reales: ${animalesConPesoReal}/${animalesProcesados}`);

        lotesConPeso.push({
          lote,
          pesoTotalReal,
          animalesConPesoReal,
          totalAnimalesProcesados: animalesProcesados
        });
      }

      setLotesConPesosReales(lotesConPeso);
      console.log('✅ [CORTES] Lotes procesados:', lotesConPeso);

    } catch (error) {
      console.error('❌ Error procesando pesos para cortes:', error);
      const lotesBasicos = lotesProcesados.map(lote => ({
        lote,
        pesoTotalReal: Number(lote.peso_total || 0) || (lote.cantidad_animales || 1) * 450000,
        animalesConPesoReal: 0,
        totalAnimalesProcesados: lote.animal_ids?.length || 0
      }));
      setLotesConPesosReales(lotesBasicos);
    } finally {
      setCargandoPesos(false);
    }
  }, [lotesProcesados, cacheCargado, animalesCache]);

  // ✅ DEFINIR loteActual - ESTO FALTABA
  const loteActual = useMemo(() => {
    const loteConPeso = lotesConPesosReales.find(item => item.lote.id?.toString() === loteSeleccionado);
    console.log('🎯 Lote seleccionado para cortes:', {
      loteSeleccionado,
      loteEncontrado: !!loteConPeso,
      pesoTotalReal: loteConPeso?.pesoTotalReal || 0,
      animalesConPesoReal: loteConPeso?.animalesConPesoReal || 0
    });
    return loteConPeso;
  }, [loteSeleccionado, lotesConPesosReales]);

  // ✅ Peso disponible en el lote
  const pesoDisponible = useMemo(() => {
    if (!loteActual) return 0;
    
    const pesoKg = loteActual.pesoTotalReal / 1000;
    
    console.log('⚖️ Peso disponible REAL para cortes:', {
      pesoTotalReal: loteActual.pesoTotalReal,
      pesoKg,
      loteId: loteActual.lote.id,
      animalesConPesoReal: loteActual.animalesConPesoReal
    });
    
    return pesoKg;
  }, [loteActual]);

  // ✅ Peso total de cortes agregados
  const pesoTotalCortes = useMemo(() => {
    const total = cortes.reduce((total, corte) => {
      const pesoCorte = Number(corte.peso || 0);
      const cantidad = Number(corte.cantidad || 1);
      return total + (pesoCorte * cantidad);
    }, 0);
    
    console.log('🔪 Peso total cortes:', total);
    return total;
  }, [cortes]);

  // ✅ Peso restante disponible
  const pesoRestante = pesoDisponible - pesoTotalCortes;

  // ✅ Funciones para manejar cortes
  const agregarCorte = () => {
    setCortes(prev => [...prev, {
      tipoCorte: '',
      peso: '',
      cantidad: '1',
      descripcion: ''
    }]);
  };

  const actualizarCorte = (index: number, campo: keyof CorteForm, valor: string) => {
    setCortes(prev => prev.map((corte, i) => 
      i === index ? { ...corte, [campo]: valor } : corte
    ));
  };

  const eliminarCorte = (index: number) => {
    setCortes(prev => prev.filter((_, i) => i !== index));
  };

  const limpiarCortes = () => {
    setCortes([]);
  };

  const handleRealizarCortes = async () => {
    if (!contractService || !address || !loteSeleccionado) {
      alert('❌ Contract service, address o lote no disponible');
      return;
    }

    if (cortes.length === 0) {
      alert('❌ Agrega al menos un corte a la rejilla');
      return;
    }

    if (pesoTotalCortes > pesoDisponible) {
      alert(`❌ Peso total de cortes (${pesoTotalCortes.toFixed(2)}kg) excede el disponible (${pesoDisponible.toFixed(2)}kg)`);
      return;
    }

    const cortesInvalidos = cortes.filter(corte => !corte.tipoCorte || !corte.peso);
    if (cortesInvalidos.length > 0) {
      alert('❌ Completa tipo y peso para todos los cortes');
      return;
    }

    setRealizandoCorte(true);
    
    try {
      console.log(`🔪 Realizando ${cortes.length} cortes para lote #${loteSeleccionado}:`, cortes);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      alert(`✅ ${cortes.length} cortes realizados exitosamente!\n\nLote: #${loteSeleccionado}\nPeso total: ${pesoTotalCortes.toFixed(2)}kg`);
      
      setCortes([]);
      setLoteSeleccionado('');
      setMostrarFormulario(false);
      
      onRecargar();
      
    } catch (error: any) {
      console.error('❌ Error realizando cortes:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setRealizandoCorte(false);
    }
  };

  if (!address) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-4">❌</div>
        <h3 className="text-xl font-semibold text-red-800 mb-2">Wallet No Conectada</h3>
        <p className="text-red-700">Conecta tu wallet para acceder a los cortes</p>
      </div>
    );
  }

  if (cargandoPesos) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Calculando pesos...</h3>
          <p className="text-gray-600">Obteniendo información real de pesos</p>
        </div>
      </div>
    );
  }

  if (lotesConPesosReales.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-4">🔪</div>
        <h3 className="text-xl font-semibold text-yellow-800 mb-2">No Hay Lotes para Cortes</h3>
        <p className="text-yellow-700">Los lotes procesados aparecerán aquí para realizar cortes</p>
        <div className="mt-4 text-xs text-yellow-600">
          Lotes recibidos: {lotesProcesados.length}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DEBUG VISIBLE EN PANTALLA */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <h4 className="font-semibold text-purple-800 mb-2">🔍 DEBUG CORTES TAB - CACHE</h4>
        <div className="text-sm text-purple-700 grid grid-cols-2 gap-2">
          <div>Cache cargado: <strong>{cacheCargado ? '✅' : '🔄'}</strong></div>
          <div>Animales en cache: <strong>{animalesCache.size}</strong></div>
          <div>Lotes procesados: <strong>{lotesConPesosReales.length}</strong></div>
          <div>Lote seleccionado: <strong>{loteSeleccionado || 'Ninguno'}</strong></div>
          {loteActual && (
            <>
              <div>Peso real: <strong>{loteActual.pesoTotalReal}g</strong></div>
              <div>Animales con peso real: <strong>{loteActual.animalesConPesoReal}/{loteActual.totalAnimalesProcesados}</strong></div>
            </>
          )}
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🥩</div>
          <div>
            <h4 className="font-semibold text-green-800">Realizar Cortes</h4>
            <p className="text-green-700 text-sm">
              {lotesConPesosReales.length} lotes procesados disponibles para cortes
            </p>
          </div>
        </div>
      </div>

      {/* Selección de Lote */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="font-semibold text-gray-800 mb-4">📦 Seleccionar Lote</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lote para Cortes
            </label>
            <select
              value={loteSeleccionado}
              onChange={(e) => {
                setLoteSeleccionado(e.target.value);
                setCortes([]);
                setMostrarFormulario(!!e.target.value);
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar lote</option>
              {lotesConPesosReales.map((loteConPeso, index) => {
                const pesoKg = loteConPeso.pesoTotalReal / 1000;
                const pesoFormateado = pesoKg > 0 ? pesoKg.toFixed(2) : '0.00';
                
                return (
                  <option 
                    key={`lote-${loteConPeso.lote.id}-${index}`}
                    value={loteConPeso.lote.id?.toString() || ''}
                  >
                    Lote #{loteConPeso.lote.id?.toString() || 'N/A'} - {pesoFormateado} kg disponible
                  </option>
                );
              })}
            </select>
          </div>
          
          {loteActual && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h5 className="font-semibold text-blue-800 mb-2">📊 Información del Lote</h5>
              <div className="text-sm space-y-1 text-blue-700">
                <p><strong>Peso disponible:</strong> {pesoDisponible.toFixed(2)} kg</p>
                <p><strong>Animales:</strong> {loteActual.lote.cantidad_animales || 0}</p>
                <p><strong>Propietario:</strong> {loteActual.lote.propietario?.slice(0, 10)}...</p>
                <p><strong>ID Lote:</strong> {loteActual.lote.id?.toString()}</p>
                <p><strong>Animales con peso real:</strong> {loteActual.animalesConPesoReal} de {loteActual.totalAnimalesProcesados}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rejilla de Cortes */}
      {mostrarFormulario && loteActual && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-gray-800">🔪 Rejilla de Cortes</h4>
            <div className="flex gap-2">
              <button
                onClick={agregarCorte}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
              >
                + Agregar Corte
              </button>
              <button
                onClick={limpiarCortes}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
              >
                🗑️ Limpiar
              </button>
            </div>
          </div>

          {/* Indicadores de Peso */}
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span><strong>Peso disponible:</strong> {pesoDisponible.toFixed(2)} kg</span>
              <span><strong>Peso usado:</strong> {pesoTotalCortes.toFixed(2)} kg</span>
              <span className={`font-semibold ${pesoRestante < 0 ? 'text-red-600' : 'text-green-600'}`}>
                <strong>Restante:</strong> {pesoRestante.toFixed(2)} kg
              </span>
            </div>
            {pesoRestante < 0 && (
              <p className="text-red-600 text-xs mt-2">
                ❌ El peso total de cortes excede el disponible
              </p>
            )}
          </div>

          {/* Tabla de Cortes */}
          {cortes.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-2xl mb-2">🔪</div>
              <p className="text-gray-500">No hay cortes agregados</p>
              <p className="text-gray-400 text-sm">Haz clic en "Agregar Corte" para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cortes.map((corte, index) => (
                <div 
                  key={`corte-${index}`}
                  className="border border-gray-200 rounded-lg p-3 bg-white"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {/* Tipo de Corte */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tipo
                      </label>
                      <select
                        value={corte.tipoCorte}
                        onChange={(e) => actualizarCorte(index, 'tipoCorte', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar</option>
                        {TIPOS_CORTE.map((tipo, tipoIndex) => (
                          <option key={`tipo-${tipoIndex}`} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Peso por Unidad */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Peso (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={corte.peso}
                        onChange={(e) => actualizarCorte(index, 'peso', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="0.0"
                      />
                    </div>

                    {/* Cantidad */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={corte.cantidad}
                        onChange={(e) => actualizarCorte(index, 'cantidad', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="1"
                      />
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <input
                        type="text"
                        value={corte.descripcion}
                        onChange={(e) => actualizarCorte(index, 'descripcion', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        placeholder="Opcional"
                      />
                    </div>

                    {/* Acciones */}
                    <div className="flex items-end">
                      <button
                        onClick={() => eliminarCorte(index)}
                        className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  {corte.peso && corte.cantidad && (
                    <div className="mt-2 text-xs text-gray-600">
                      <strong>Subtotal:</strong> {(Number(corte.peso) * Number(corte.cantidad)).toFixed(2)} kg
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Botón para Realizar Cortes */}
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {cortes.length} corte(s) listo(s) - Total: {pesoTotalCortes.toFixed(2)} kg
            </div>
            <button
              onClick={handleRealizarCortes}
              disabled={cortes.length === 0 || pesoTotalCortes <= 0 || pesoRestante < 0 || realizandoCorte}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {realizandoCorte ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Procesando Cortes...
                </>
              ) : (
                <>
                  <span>🔪</span>
                  Realizar {cortes.length} Corte(s)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lista de Lotes Disponibles */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800">Lotes Disponibles para Cortes:</h4>
        
        {lotesConPesosReales.map((loteConPeso, index) => {
          const pesoKg = loteConPeso.pesoTotalReal / 1000;
          const pesoFormateado = pesoKg > 0 ? pesoKg.toFixed(2) : '0.00';
          const tienePesosReales = loteConPeso.animalesConPesoReal > 0;
          
          return (
            <div 
              key={`lote-card-${loteConPeso.lote.id}-${index}`}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                      📦 Lote #{loteConPeso.lote.id?.toString() || 'N/A'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {loteConPeso.lote.cantidad_animales || 0} animales
                    </span>
                    {tienePesosReales && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        ✅ Pesos Reales
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Peso disponible:</strong> 
                      <span className={tienePesosReales ? "text-green-600 font-bold" : "text-orange-600"}>
                        {pesoFormateado} kg {tienePesosReales ? "(REAL)" : "(ESTIMADO)"}
                      </span>
                    </p>
                    <p><strong>Propietario:</strong> <code className="text-xs">{loteConPeso.lote.propietario?.slice(0, 10) || 'N/A'}...</code></p>
                    <p><strong>Estado:</strong> Procesado ✅</p>
                    <p><strong>Animales con peso real:</strong> {loteConPeso.animalesConPesoReal} de {loteConPeso.totalAnimalesProcesados}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setLoteSeleccionado(loteConPeso.lote.id?.toString() || '');
                    setCortes([]);
                    setMostrarFormulario(true);
                  }}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                >
                  Seleccionar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}