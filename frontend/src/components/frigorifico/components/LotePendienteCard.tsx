// src/components/frigorifico/components/LotePendienteCard.tsx - VERSIÓN COMPLETA
'use client';

import { LotePendienteCardProps } from '../types';

export function LotePendienteCard({
  lote,
  precioPorKilo,
  isProcessing,
  chipyProcessing,
  onAceptar,
  onProcesar,
  cacheAvailable,
  blockchainAvailable,
}: LotePendienteCardProps) {
  
  const pesoTotalKg = lote.peso_total_kg || 0;
  const precioTotal = lote.precio_total || 0;
  const fechaCreacion = lote.fecha_creacion ? new Date(Number(lote.fecha_creacion) * 1000) : new Date();
  const fechaTransferencia = lote.fecha_transferencia ? new Date(Number(lote.fecha_transferencia) * 1000) : null;

  const getEstadoTexto = (estado: number) => {
    switch (estado) {
      case 0: return 'Activo';
      case 1: return 'Transferido';
      case 2: return 'Procesado';
      default: return `Estado ${estado}`;
    }
  };

  const getEstadoColor = (estado: number) => {
    switch (estado) {
      case 0: return 'bg-yellow-100 text-yellow-800';
      case 1: return 'bg-blue-100 text-blue-800';
      case 2: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const puedeProcesar = lote.estado === 1; // Solo lotes transferidos pueden procesarse
  const puedeAceptar = lote.estado === 0; // Solo lotes activos pueden aceptarse
  const estaProcesado = lote.estado === 2; // Ya procesado

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📦</div>
          <div>
            <h4 className="font-semibold text-gray-800">Lote #{lote.id.toString()}</h4>
            <p className="text-sm text-gray-600">
              {lote.cantidad_animales || 0} animales • {pesoTotalKg.toFixed(2)} kg total
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Botón para procesar lote (solo si está transferido) */}
          {puedeProcesar && (
            <button
              onClick={onProcesar}
              disabled={isProcessing || chipyProcessing || !blockchainAvailable}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                  Procesando...
                </>
              ) : (
                <>
                  <span>🔪</span>
                  Procesar
                </>
              )}
            </button>
          )}
          
          {/* Botón para aceptar transferencia (solo si está activo) */}
          {puedeAceptar && (
            <button
              onClick={onAceptar}
              disabled={isProcessing || chipyProcessing || !blockchainAvailable}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                  Procesando...
                </>
              ) : (
                <>
                  <span>💰</span>
                  Aceptar
                </>
              )}
            </button>
          )}

          {/* Indicador de procesado */}
          {estaProcesado && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm flex items-center gap-1">
              <span>✅</span>
              Procesado
            </span>
          )}
        </div>
      </div>

      {/* Información de Peso y Precio */}
      <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-green-700">{pesoTotalKg.toFixed(2)} kg</div>
            <div className="text-xs text-green-600">Peso Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-700">${precioTotal.toFixed(2)}</div>
            <div className="text-xs text-blue-600">Precio Total</div>
          </div>
        </div>
        <div className="text-center mt-2 text-xs text-gray-500">
          Precio: {precioPorKilo} USDT/kg × {pesoTotalKg.toFixed(2)} kg
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Información del Cache */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-500">💾</span>
            <span className="font-semibold text-blue-800">Cache</span>
            <span className={`text-xs px-2 py-1 rounded ${cacheAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {cacheAvailable ? 'Conectado' : 'No disponible'}
            </span>
          </div>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Peso Total:</strong> {pesoTotalKg.toFixed(2)} kg</p>
            <p><strong>Precio Total:</strong> ${precioTotal.toFixed(2)}</p>
            {lote.animales_con_peso_real !== undefined && (
              <p><strong>Pesos reales:</strong> {lote.animales_con_peso_real} de {lote.total_animales_procesados} animales</p>
            )}
          </div>
        </div>

        {/* Información de Blockchain */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-500">⛓️</span>
            <span className="font-semibold text-green-800">StarkNet</span>
            <span className={`text-xs px-2 py-1 rounded ${blockchainAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {blockchainAvailable ? 'Conectado' : 'No disponible'}
            </span>
          </div>
          <div className="text-sm text-green-700 space-y-1">
            <p><strong>Propietario:</strong> <code className="text-xs">{lote.propietario?.slice(0, 10)}...</code></p>
            <p><strong>Estado:</strong> <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(lote.estado)}`}>
              {getEstadoTexto(lote.estado)}
            </span></p>
            <p><strong>Animales:</strong> {lote.cantidad_animales || 0} animales</p>
          </div>
        </div>
      </div>

      {/* Información adicional del lote */}
      <div className="border-t border-gray-200 pt-3">
        <div className="text-sm text-gray-600 space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Fecha Creación:</strong> {fechaCreacion.toLocaleDateString()}</p>
            </div>
            <div>
              {fechaTransferencia && (
                <p><strong>Transferido el:</strong> {fechaTransferencia.toLocaleDateString()}</p>
              )}
            </div>
          </div>
          
          {/* Animales en el lote */}
          {lote.animal_ids && lote.animal_ids.length > 0 && (
            <div>
              <p className="font-semibold mb-1">Animales en el Lote:</p>
              <div className="flex flex-wrap gap-1">
                {lote.animal_ids.slice(0, 10).map((animalId, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 rounded text-xs">
                    🐄 #{animalId.toString()}
                  </span>
                ))}
                {lote.animal_ids.length > 10 && (
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                    +{lote.animal_ids.length - 10} más
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Cortes existentes */}
          {lote.cortes && lote.cortes.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-sm mb-1">Cortes Realizados:</p>
              <div className="space-y-1">
                {lote.cortes.slice(0, 3).map((corte, index) => (
                  <div key={index} className="flex justify-between items-center text-xs bg-yellow-50 p-2 rounded">
                    <span>{corte.tipoCorte}</span>
                    <span>{Number(corte.peso) / 1000} kg</span>
                    <span className={`px-1 rounded ${corte.certificado ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {corte.certificado ? '✅' : '⏳'}
                    </span>
                  </div>
                ))}
                {lote.cortes.length > 3 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{lote.cortes.length - 3} cortes más
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estado de procesamiento */}
      {(isProcessing || chipyProcessing) && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></span>
            <span>Procesando transacción en blockchain...</span>
          </div>
        </div>
      )}
    </div>
  );
}