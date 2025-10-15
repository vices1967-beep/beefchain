// src/components/frigorifico/tabs/TransaccionesPendientesTab.tsx - ACTUALIZADO CON FRIGORIFICOSERVICE
'use client';

import { useState, useEffect } from 'react';
import { AnimalContractService } from '@/services/animalContractService';

interface TransaccionesPendientesTabProps {
  contractService: AnimalContractService | null;
  frigorificoService: any;
  address: string | null;
  onRecargar: () => Promise<void>;
  lotesPendientes: any[];
}

interface LotePendiente {
  id: bigint;
  propietario: string;
  frigorifico: string;
  fecha_creacion: bigint;
  fecha_transferencia: bigint;
  estado: number;
  cantidad_animales: number;
  peso_total: bigint; // EN KILOS
  animal_ids: bigint[];
}

interface PagoSimulado {
  loteId: string;
  monto: number;
  destinatario: string;
  estado: 'pendiente' | 'procesando' | 'completado' | 'fallido';
  hash?: string;
}

export function TransaccionesPendientesTab({ 
  contractService, 
  frigorificoService,
  address, 
  onRecargar,
  lotesPendientes = []
}: TransaccionesPendientesTabProps) {
  const [procesandoLote, setProcesandoLote] = useState<string | null>(null);
  const [pagosSimulados, setPagosSimulados] = useState<PagoSimulado[]>([]);
  const [cargando, setCargando] = useState(false);
  const [estado, setEstado] = useState('');

  // 🔍 Cargar lotes pendientes desde props
  useEffect(() => {
    if (lotesPendientes.length > 0) {
      setEstado(`✅ ${lotesPendientes.length} lotes pendientes de procesamiento`);
    } else {
      setEstado('✅ No hay lotes pendientes - Todo al día');
    }
  }, [lotesPendientes]);

  // 💰 Simular pago con ChipyPay al productor
  const simularPagoChipyPay = async (lote: LotePendiente): Promise<string> => {
    return new Promise((resolve) => {
      setEstado(`💰 Simulando pago con ChipyPay...`);
      
      // Calcular monto basado en peso del lote (precio simulado: $5 por kg)
      const pesoTotal = Number(lote.peso_total);
      const montoUSD = pesoTotal * 5;
      const montoETH = montoUSD * 0.0005; // Conversión simulada ETH/USD
      
      setTimeout(() => {
        const hashPago = `chipy_${lote.id}_${Date.now()}`;
        
        // Agregar pago simulado a la lista
        setPagosSimulados(prev => [...prev, {
          loteId: lote.id.toString(),
          monto: montoUSD,
          destinatario: lote.propietario,
          estado: 'completado',
          hash: hashPago
        }]);
        
        setEstado(`✅ Pago simulado: $${montoUSD.toFixed(2)} USD al productor`);
        resolve(hashPago);
      }, 2000);
    });
  };

  // 🚀 Procesar un lote individual con pago usando FrigorificoService
  const procesarLoteConPago = async (lote: LotePendiente) => {
    if (!frigorificoService || !address) {
      alert('❌ Frigorifico service o wallet no disponible');
      return;
    }

    setProcesandoLote(lote.id.toString());
    setEstado(`🔪 Iniciando procesamiento del lote #${lote.id}...`);

    try {
      // 1. Primero simular el pago con ChipyPay
      setEstado(`💰 Iniciando pago con ChipyPay al productor...`);
      const hashPago = await simularPagoChipyPay(lote);
      
      // 2. Luego procesar el lote en StarkNet usando FrigorificoService
      setEstado(`🔪 Procesando lote #${lote.id} en StarkNet...`);
      
      console.log(`Procesando lote #${lote.id} con FrigorificoService`, {
        animales: lote.cantidad_animales,
        pesoTotal: lote.peso_total,
        pagoSimulado: hashPago
      });

      // Usar el método del FrigorificoService que incluye simulación de pago
      const txHash = await frigorificoService.procesarLoteConPago(lote.id, address);
      
      if (txHash) {
        setEstado(`✅ Lote #${lote.id} procesado exitosamente con pago confirmado`);
        console.log(`Lote #${lote.id} procesado. TX: ${txHash}, Pago: ${hashPago}`);
        
        // Actualizar estado del pago
        setPagosSimulados(prev => 
          prev.map(pago => 
            pago.loteId === lote.id.toString() 
              ? { ...pago, estado: 'completado' as const }
              : pago
          )
        );
        
        // Recargar datos
        await onRecargar();
      } else {
        throw new Error('No se recibió hash de transacción');
      }
      
    } catch (error: any) {
      console.error('Error procesando lote:', error);
      setEstado(`❌ Error procesando lote #${lote.id}: ${error.message}`);
      
      // Marcar pago como fallido
      setPagosSimulados(prev => 
        prev.map(pago => 
          pago.loteId === lote.id.toString() 
            ? { ...pago, estado: 'fallido' as const }
            : pago
        )
      );
      
      alert(`Error procesando lote: ${error.message}`);
    } finally {
      setProcesandoLote(null);
    }
  };

  // 🔧 Funciones auxiliares
  const getEstadoDisplay = (estado: number): {text: string, color: string} => {
    const estados: {[key: string]: {text: string, color: string}} = {
      '0': { text: '🟡 Creado', color: 'bg-yellow-100 text-yellow-800' },
      '1': { text: '🔵 Transferido', color: 'bg-blue-100 text-blue-800' },
      '2': { text: '🟢 Procesado', color: 'bg-green-100 text-green-800' },
      '3': { text: '🟣 Certificado', color: 'bg-purple-100 text-purple-800' }
    };
    return estados[estado.toString()] || { text: `Estado ${estado}`, color: 'bg-gray-100 text-gray-800' };
  };

  const getEstadoPagoDisplay = (estado: string): {text: string, color: string} => {
    const estados: {[key: string]: {text: string, color: string}} = {
      'pendiente': { text: '⏳ Pendiente', color: 'bg-yellow-100 text-yellow-800' },
      'procesando': { text: '🔄 Procesando', color: 'bg-blue-100 text-blue-800' },
      'completado': { text: '✅ Completado', color: 'bg-green-100 text-green-800' },
      'fallido': { text: '❌ Fallido', color: 'bg-red-100 text-red-800' }
    };
    return estados[estado] || { text: estado, color: 'bg-gray-100 text-gray-800' };
  };

  const formatFecha = (timestamp: bigint): string => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('es-ES');
  };

  const formatPeso = (peso: bigint): string => {
    return `${Number(peso).toFixed(1)} kg`;
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const calcularMontoPago = (peso: bigint): number => {
    // Simulación: $5 USD por kg
    return Number(peso) * 5;
  };

  if (!address) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-4">🔌</div>
        <h3 className="text-xl font-semibold text-red-800 mb-2">Wallet No Conectada</h3>
        <p className="text-red-700">Conecta tu wallet para procesar lotes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y Controles */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🔄 Lotes Pendientes de Procesamiento</h2>
        <p className="text-gray-600 mb-4">
          Lotes transferidos al frigorífico que requieren procesamiento y pago al productor
        </p>
        
        {/* Botones de Acción */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={onRecargar}
            disabled={cargando}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {cargando ? '🔄 Actualizando...' : '🔄 Actualizar Lista'}
          </button>
        </div>
        
        {/* Estado */}
        {estado && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">{estado}</p>
          </div>
        )}
      </div>

      {/* Sin lotes pendientes */}
      {lotesPendientes.length === 0 && !cargando && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-green-800 mb-2">Sin Lotes Pendientes</h3>
          <p className="text-green-700">No hay lotes que requieran procesamiento inmediato</p>
        </div>
      )}

      {/* Lista de Lotes Pendientes */}
      {lotesPendientes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Lotes para Procesar ({lotesPendientes.length})
          </h3>
          
          {lotesPendientes.map((lote) => {
            const estadoDisplay = getEstadoDisplay(lote.estado);
            const estaProcesando = procesandoLote === lote.id.toString();
            const pagoLote = pagosSimulados.find(p => p.loteId === lote.id.toString());
            const montoPago = calcularMontoPago(lote.peso_total);
            
            return (
              <div key={lote.id.toString()} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoDisplay.color}`}>
                        {estadoDisplay.text}
                      </span>
                      <span className="text-sm text-gray-500">
                        Transferido: {formatFecha(lote.fecha_transferencia)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <p><strong>Lote ID:</strong> #{lote.id.toString()}</p>
                        <p><strong>Animales:</strong> {lote.cantidad_animales}</p>
                        <p><strong>Peso Total:</strong> {formatPeso(lote.peso_total)}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <p><strong>Productor:</strong> {formatAddress(lote.propietario)}</p>
                        <p><strong>Monto a Pagar:</strong> <span className="text-green-600 font-semibold">${montoPago.toFixed(2)} USD</span></p>
                        {pagoLote && (
                          <p>
                            <strong>Estado Pago:</strong> 
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${getEstadoPagoDisplay(pagoLote.estado).color}`}>
                              {getEstadoPagoDisplay(pagoLote.estado).text}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => procesarLoteConPago(lote)}
                      disabled={estaProcesando || cargando}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {estaProcesando ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Procesando...
                        </>
                      ) : (
                        <>
                          💰 Procesar y Pagar
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Información de Pago */}
                {pagoLote && pagoLote.hash && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        <strong>Hash Pago:</strong> {pagoLote.hash}
                      </span>
                      <span className="text-gray-500">
                        {pagoLote.estado === 'completado' ? '✅ Pago confirmado' : ''}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cargando */}
      {cargando && lotesPendientes.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-800">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span>Buscando lotes pendientes...</span>
          </div>
        </div>
      )}

      {/* Resumen de Pagos */}
      {pagosSimulados.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h4 className="font-semibold text-purple-800 mb-3">💰 Resumen de Pagos ChipyPay</h4>
          <div className="space-y-2">
            {pagosSimulados.map((pago) => (
              <div key={pago.hash} className="flex justify-between items-center text-sm">
                <span>Lote #{pago.loteId}</span>
                <span>${pago.monto.toFixed(2)} USD</span>
                <span className={`px-2 py-1 rounded text-xs ${getEstadoPagoDisplay(pago.estado).color}`}>
                  {getEstadoPagoDisplay(pago.estado).text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}