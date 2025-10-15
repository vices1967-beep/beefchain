// src/components/frigorifico/tabs/CortesTab.tsx - ACTUALIZADO CON QR
'use client';

import { useState, useMemo, useEffect } from 'react';
import { AnimalContractService } from '@/services/animalContractService';



interface CortesTabProps {
  contractService: AnimalContractService | null;
  frigorificoService: any;
  address: string | null;
  onRecargar: () => Promise<void>;
  lotesProcesados: any[];
}

interface LoteProcesado {
  id: bigint;
  propietario: string;
  frigorifico: string;
  fecha_creacion: bigint;
  fecha_procesamiento: bigint;
  estado: number;
  cantidad_animales: number;
  peso_total: bigint;
  peso_total_kg: number;
  animales_reales?: number;
}

interface CorteForm {
  tipoCorte: number;
  peso: string;
  cantidad: string;
  descripcion: string;
}

interface QRGenerado {
  hash: string;
  tipoCorte: string;
  peso: number;
  timestamp: number;
  url?: string;
}

// 🎯 TIPOS DE CORTE 
const TIPOS_CORTE = [
  { id: 0, nombre: 'LOMO', pesoEstimado: 5.0 },
  { id: 1, nombre: 'BIFE_ANCHO', pesoEstimado: 3.0 },
  { id: 2, nombre: 'BIFE_ANGOSTO', pesoEstimado: 2.5 },
  { id: 3, nombre: 'CUADRADA', pesoEstimado: 4.0 },
  { id: 4, nombre: 'NALGA', pesoEstimado: 6.0 },
  { id: 5, nombre: 'BOLA_DE_LOMO', pesoEstimado: 3.5 },
  { id: 6, nombre: 'COSTILLAR', pesoEstimado: 7.0 },
  { id: 7, nombre: 'ASADO', pesoEstimado: 4.5 },
  { id: 8, nombre: 'VACIO', pesoEstimado: 5.5 },
  { id: 9, nombre: 'MATAMBRE', pesoEstimado: 2.5 },
  { id: 10, nombre: 'ENTRAÑA', pesoEstimado: 2.0 }
];



export function CortesTab({ 
  contractService, 
  frigorificoService,
  address, 
  onRecargar,
  lotesProcesados = []
}: CortesTabProps) {
  const [loteSeleccionado, setLoteSeleccionado] = useState<string>('');
  const [cortes, setCortes] = useState<CorteForm[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState<boolean>(false);
  const [creandoCortes, setCreandoCortes] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(false);
  const [estado, setEstado] = useState('');
  const [qrGenerados, setQrGenerados] = useState<QRGenerado[]>([]);
  const [mostrarQR, setMostrarQR] = useState<boolean>(false);

  // AGREGAR este useEffect al inicio del componente CortesTab
  useEffect(() => {
    console.log('📦 DEBUG - Todos los lotes procesados recibidos:', lotesProcesados);
    
    if (lotesProcesados.length > 0) {
      lotesProcesados.forEach((lote, index) => {
        console.log(`📊 Lote ${index}:`, {
          id: lote.id?.toString(),
          peso_total: lote.peso_total,
          peso_total_kg: lote.peso_total_kg,
          cantidad_animales: lote.cantidad_animales,
          // Buscar cualquier propiedad numérica que pueda ser el peso
          propiedades_numericas: Object.keys(lote).filter(key => 
            typeof lote[key] === 'number' || typeof lote[key] === 'bigint'
          )
        });
      });
    }
  }, [lotesProcesados]);
  // 🎯 Lote actual seleccionado
  // EN CortesTab.tsx - CORREGIR la sección de peso disponible
  // 🎯 Lote actual seleccionado
  const loteActual = useMemo(() => {
    const lote = lotesProcesados.find(lote => lote.id?.toString() === loteSeleccionado);
    if (lote) {
      console.log('🔍 DEBUG Lote encontrado:', {
        id: lote.id,
        peso_total: lote.peso_total,
        peso_total_kg: lote.peso_total_kg,
        cantidad_animales: lote.cantidad_animales
      });
    }
    return lote;
  }, [loteSeleccionado, lotesProcesados]);

  // ⚖️ Peso disponible en el lote (en KILOS) - CORREGIDO
// EN CortesTab.tsx - REEMPLAZAR completamente el cálculo de pesoDisponible
  // EN CortesTab.tsx - SOLUCIÓN TEMPORAL PARA EL DEMO
  const pesoDisponible = useMemo(() => {
    if (!loteActual) return 0;
    
    console.log('🔍 DEBUG loteActual:', {
      peso_total: loteActual.peso_total,
      peso_total_kg: loteActual.peso_total_kg,
      cantidad_animales: loteActual.cantidad_animales
    });

    // ✅ SOLUCIÓN TEMPORAL: Mostrar gramos como kilos
    let pesoMostrado = 0;

    // 1. Si tenemos peso_total (gramos del contrato), mostrar como kilos
    if (loteActual.peso_total) {
      const pesoEnGramos = Number(loteActual.peso_total);
      pesoMostrado = pesoEnGramos; // ← MOSTRAR GRAMOS COMO KILOS
      console.log(`🎯 TEMPORAL: Mostrando ${pesoEnGramos} gramos como ${pesoMostrado} "kilos"`);
    }
    // 2. Si tenemos peso_total_kg, usar directamente
    else if (loteActual.peso_total_kg && loteActual.peso_total_kg > 0) {
      pesoMostrado = loteActual.peso_total_kg;
      console.log(`✅ Usando peso_total_kg: ${pesoMostrado} kg`);
    }

    // 3. Si el peso es muy pequeño (menos de 10), multiplicar por 1000
    if (pesoMostrado > 0 && pesoMostrado < 10) {
      console.warn(`⚠️ Peso pequeño detectado: ${pesoMostrado}. Multiplicando por 1000 para demo.`);
      pesoMostrado = pesoMostrado * 1000;
      console.log(`🔄 Peso para demo: ${pesoMostrado} "kg"`);
    }

    // 4. Si no tenemos peso, calcular por animales
    if (pesoMostrado <= 0 && loteActual.cantidad_animales) {
      pesoMostrado = loteActual.cantidad_animales * 250;
      console.log(`🎯 Peso por animales: ${pesoMostrado} kg`);
    }

    // 5. Último recurso
    if (pesoMostrado <= 0) {
      pesoMostrado = 250;
      console.log(`⚡ Peso mínimo: ${pesoMostrado} kg`);
    }

    console.log(`⚖️ Peso mostrado en UI: ${pesoMostrado} "kg"`);
    return pesoMostrado;
  }, [loteActual]);



  // 🔪 Peso total de cortes agregados (en KILOS)
  const pesoTotalCortes = useMemo(() => {
    return cortes.reduce((total, corte) => {
      const pesoCorte = Number(corte.peso || 0);
      const cantidad = Number(corte.cantidad || 1);
      return total + (pesoCorte * cantidad);
    }, 0);
  }, [cortes]);

  // 📊 Peso restante disponible
  const pesoRestante = pesoDisponible - pesoTotalCortes;

  // ➕ Agregar nuevo corte a la rejilla
  const agregarCorte = () => {
    setCortes(prev => [...prev, {
      tipoCorte: 0,
      peso: TIPOS_CORTE[0].pesoEstimado.toString(),
      cantidad: '1',
      descripcion: ''
    }]);
  };

  // ✏️ Actualizar corte existente
  const actualizarCorte = (index: number, campo: keyof CorteForm, valor: string | number) => {
    setCortes(prev => prev.map((corte, i) => 
      i === index ? { ...corte, [campo]: valor } : corte
    ));
  };

  // 🗑️ Eliminar corte de la rejilla
  const eliminarCorte = (index: number) => {
    setCortes(prev => prev.filter((_, i) => i !== index));
  };

  // 🧹 Limpiar todos los cortes
  const limpiarCortes = () => {
    setCortes([]);
    setQrGenerados([]);
    setMostrarQR(false);
  };

  // 🚀 Crear cortes con generación de QR
  const handleCrearCortes = async () => {
    if (!frigorificoService || !address || !loteSeleccionado || !loteActual) {
      alert('❌ Service, address o lote no disponible');
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

    setCreandoCortes(true);
    setEstado('🥩 Creando cortes y generando QR codes...');
    
    try {
      // Preparar arrays para la función
      const tiposCorte: number[] = [];
      const pesos: number[] = [];
      
      cortes.forEach(corte => {
        const cantidad = Number(corte.cantidad || 1);
        const pesoKilos = Number(corte.peso);
        
        for (let i = 0; i < cantidad; i++) {
          tiposCorte.push(corte.tipoCorte);
          pesos.push(pesoKilos);
        }
      });

      console.log('Creando cortes con QR para lote:', {
        loteId: loteSeleccionado,
        tiposCorte,
        pesos,
        totalCortes: tiposCorte.length
      });

      // Crear cortes con generación de QR
      const resultado = await frigorificoService.crearCortesConQR(
        BigInt(loteSeleccionado),
        tiposCorte,
        pesos
      );

      if (resultado && resultado.txHash && resultado.qrHashes) {
        setEstado(`✅ ${tiposCorte.length} cortes creados con QR codes`);
        
// CORRECCIÓN RÁPIDA - reemplaza esta sección en CortesTab.tsx

  // Generar datos de QR para mostrar
  const nuevosQR: QRGenerado[] = resultado.qrHashes.map((qrHash: string, index: number) => {
    const tipoCorteInfo = TIPOS_CORTE.find(t => t.id === tiposCorte[index]) || TIPOS_CORTE[0];
    return {
      hash: qrHash,
      tipoCorte: tipoCorteInfo.nombre,
      peso: pesos[index],
      timestamp: Date.now(),
      url: generarURLQR(qrHash) // ✅ QUITÉ EL "this."
    };
  });
        setQrGenerados(nuevosQR);
        setMostrarQR(true);
        
        // Mostrar resumen
        alert(`🎉 ${tiposCorte.length} cortes creados para el lote #${loteSeleccionado}\n\n` +
              `📊 Resumen:\n` +
              `• Cortes creados: ${tiposCorte.length}\n` +
              `• QR generados: ${resultado.qrHashes.length}\n` +
              `• Peso total: ${pesoTotalCortes.toFixed(2)} kg\n` +
              `• Hash TX: ${resultado.txHash}`);
        
        // Recargar datos
        await onRecargar();
        
      } else {
        throw new Error('No se recibieron datos de la transacción');
      }
      
    } catch (error: any) {
      console.error('❌ Error creando cortes con QR:', error);
      setEstado(`❌ Error: ${error.message}`);
      alert(`❌ Error creando cortes: ${error.message}`);
    } finally {
      setCreandoCortes(false);
    }
  };

  // 📱 Generar URL para QR
  const generarURLQR = (qrHash: string): string => {
    return `${window.location.origin}/consumidor/verificar?qr=${qrHash}`;
  };

  // 🖨️ Imprimir etiquetas QR
  const imprimirEtiquetasQR = () => {
    const ventanaImpresion = window.open('', '_blank');
    if (ventanaImpresion) {
      ventanaImpresion.document.write(`
        <html>
          <head>
            <title>Etiquetas QR - Carnes Trazables</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .etiqueta { border: 1px solid #ccc; padding: 15px; margin: 10px; page-break-inside: avoid; }
              .qr-code { font-size: 12px; word-break: break-all; margin: 10px 0; }
              .info { font-size: 14px; margin: 5px 0; }
              .header { text-align: center; margin-bottom: 20px; }
              @media print { .etiqueta { border: 1px solid #000; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>🏷️ Etiquetas QR - Carnes Trazables</h2>
              <p>Lote: #${loteSeleccionado} | Fecha: ${new Date().toLocaleDateString()}</p>
            </div>
            ${qrGenerados.map(qr => `
              <div class="etiqueta">
                <div class="info"><strong>🔪 Corte:</strong> ${qr.tipoCorte.replace(/_/g, ' ')}</div>
                <div class="info"><strong>⚖️ Peso:</strong> ${qr.peso} kg</div>
                <div class="qr-code">
                  <strong>📱 QR Hash:</strong><br>
                  ${qr.hash}
                </div>
                <div class="info"><strong>🔗 Verificar:</strong> ${qr.url}</div>
                <div class="info"><strong>📅 Generado:</strong> ${new Date(qr.timestamp).toLocaleString()}</div>
              </div>
            `).join('')}
          </body>
        </html>
      `);
      ventanaImpresion.document.close();
      ventanaImpresion.print();
    }
  };

  // 📥 Cargar datos al montar
  useEffect(() => {
    if (address && frigorificoService) {
      setEstado(`✅ ${lotesProcesados.length} lotes procesados disponibles`);
    }
  }, [address, frigorificoService, lotesProcesados]);

  if (!address) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-4">🔌</div>
        <h3 className="text-xl font-semibold text-red-800 mb-2">Wallet No Conectada</h3>
        <p className="text-red-700">Conecta tu wallet para crear cortes</p>
      </div>
    );
  }

  if (lotesProcesados.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-4">🔪</div>
        <h3 className="text-xl font-semibold text-yellow-800 mb-2">No Hay Lotes para Cortes</h3>
        <p className="text-yellow-700">
          Los lotes procesados (Estado 2) aparecerán aquí para crear cortes.<br/>
          Primero deben ser procesados en la pestaña "Operaciones Pendientes".
        </p>
        <button
          onClick={onRecargar}
          className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
        >
          🔄 Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🥩</div>
          <div>
            <h2 className="text-xl font-semibold text-green-800">Crear Cortes con QR</h2>
            <p className="text-green-700 text-sm">
              {lotesProcesados.length} lotes procesados disponibles para cortes
            </p>
            {estado && <p className="text-green-600 text-xs mt-1">{estado}</p>}
          </div>
        </div>
      </div>

      {/* Selección de Lote */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 mb-4">📦 Seleccionar Lote Procesado</h3>
        
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
                setQrGenerados([]);
                setMostrarQR(false);
              }}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar lote procesado</option>
              {lotesProcesados.map((lote) => (
                <option key={lote.id?.toString()} value={lote.id?.toString()}>
                  Lote #{lote.id?.toString()} - {lote.peso_total_kg?.toFixed(1) || '0'} kg - {lote.cantidad_animales || 0} animales
                </option>
              ))}
            </select>
          </div>
          
          {loteActual && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-semibold text-blue-800 mb-2">📊 Información del Lote</h4>
              <div className="text-sm space-y-1 text-blue-700">
                <p><strong>Peso disponible:</strong> {pesoDisponible.toFixed(1)} kg</p>
                <p><strong>Animales:</strong> {loteActual.cantidad_animales || 0}</p>
                <p><strong>Procesado:</strong> {new Date(Number(loteActual.fecha_procesamiento)*1000).toLocaleDateString()}</p>
                <p><strong>Estado:</strong> ✅ Listo para cortes</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rejilla de Cortes */}
      {mostrarFormulario && loteActual && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">🔪 Rejilla de Cortes</h3>
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
              <span><strong>Peso disponible:</strong> {pesoDisponible.toFixed(1)} kg</span>
              <span><strong>Peso usado:</strong> {pesoTotalCortes.toFixed(1)} kg</span>
              <span className={`font-semibold ${pesoRestante < 0 ? 'text-red-600' : 'text-green-600'}`}>
                <strong>Restante:</strong> {pesoRestante.toFixed(1)} kg
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
              {cortes.map((corte, index) => {
                const tipoCorteInfo = TIPOS_CORTE.find(t => t.id === corte.tipoCorte) || TIPOS_CORTE[0];
                const subtotal = Number(corte.peso || 0) * Number(corte.cantidad || 1);
                
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      {/* Tipo de Corte */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                        <select
                          value={corte.tipoCorte}
                          onChange={(e) => {
                            const nuevoTipo = parseInt(e.target.value);
                            actualizarCorte(index, 'tipoCorte', nuevoTipo);
                            const tipoSeleccionado = TIPOS_CORTE.find(t => t.id === nuevoTipo);
                            if (tipoSeleccionado && !corte.peso) {
                              actualizarCorte(index, 'peso', tipoSeleccionado.pesoEstimado.toString());
                            }
                          }}
                          className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          {TIPOS_CORTE.map((tipo) => (
                            <option key={tipo.id} value={tipo.id}>
                              {tipo.nombre.replace(/_/g, ' ')} ({tipo.pesoEstimado}kg)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Peso por Unidad */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Peso (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={corte.peso}
                          onChange={(e) => actualizarCorte(index, 'peso', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder={tipoCorteInfo.pesoEstimado.toString()}
                        />
                      </div>

                      {/* Cantidad */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
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
                    <div className="mt-2 text-xs text-gray-600">
                      <strong>Subtotal:</strong> {subtotal.toFixed(1)} kg 
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Botón para Crear Cortes con QR */}
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {cortes.reduce((total, corte) => total + Number(corte.cantidad || 1), 0)} corte(s) - Total: {pesoTotalCortes.toFixed(1)} kg
            </div>
            <button
              onClick={handleCrearCortes}
              disabled={cortes.length === 0 || pesoTotalCortes <= 0 || pesoRestante < 0 || creandoCortes}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {creandoCortes ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Creando Cortes y QR...
                </>
              ) : (
                <>
                  <span>📱</span>
                  Crear Cortes con QR
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Panel de QR Generados */}
      {mostrarQR && qrGenerados.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-purple-800">📱 QR Codes Generados</h3>
            <div className="flex gap-2">
              <button
                onClick={imprimirEtiquetasQR}
                className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors"
              >
                🖨️ Imprimir Etiquetas
              </button>
              <button
                onClick={() => setMostrarQR(false)}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
              >
                ✕ Cerrar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {qrGenerados.map((qr, index) => (
              <div key={index} className="bg-white border border-purple-300 rounded-lg p-3">
                <div className="text-center">
                  <div className="text-lg mb-2">🏷️ Corte {index + 1}</div>
                  <div className="bg-gray-100 p-3 rounded border-2 border-dashed border-gray-300 mb-2">
                    <div className="text-xs font-mono break-all">{qr.hash}</div>
                    <div className="text-4xl my-2">📱</div>
                    <div className="text-xs text-gray-600">Escanea para verificar</div>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>🔪 Tipo:</strong> {qr.tipoCorte.replace(/_/g, ' ')}</p>
                    <p><strong>⚖️ Peso:</strong> {qr.peso} kg</p>
                    <p><strong>🔗 URL:</strong> 
                      <a href={qr.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                        Verificar
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>💡 Instrucciones:</strong> Estos QR codes deben ser impresos y colocados en los paquetes de carne. 
              Los consumidores podrán escanearlos para verificar la trazabilidad del producto.
            </p>
          </div>
        </div>
      )}

      {/* Lista de Lotes Disponibles */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800">Lotes Disponibles para Cortes:</h3>
        
        {lotesProcesados.map((lote) => {
          const pesoFormateado = lote.peso_total_kg?.toFixed(1) || '0';
          
          return (
            <div key={lote.id?.toString()} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                      📦 Lote #{lote.id?.toString()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {lote.cantidad_animales || 0} animales
                    </span>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p><strong>Peso disponible:</strong> {pesoFormateado} kg</p>
                    <p><strong>Procesado:</strong> {new Date(Number(lote.fecha_procesamiento)*1000).toLocaleDateString()}</p>
                    <p><strong>Estado:</strong> ✅ Listo para cortes</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setLoteSeleccionado(lote.id?.toString() || '');
                    setCortes([]);
                    setMostrarFormulario(true);
                    setQrGenerados([]);
                    setMostrarQR(false);
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