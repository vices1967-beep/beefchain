// src/components/frigorifico/components/AnimalPendienteCard.tsx - VERSIÓN COMPLETA
'use client';

import { AnimalPendienteCardProps } from '../types';

export function AnimalPendienteCard({
  animal,
  precioPorKilo,
  isProcessing,
  chipyProcessing,
  onAceptar,
  cacheAvailable,
  blockchainAvailable,
  
}: AnimalPendienteCardProps) {
  
  const pesoKg = animal.peso_kg || 0;
  const precioTotal = animal.precio_total || 0;
  const fuentePeso = animal.fuente_peso || 'estimado';
  const fechaRecepcion = animal.fechaRecepcion ? new Date(Number(animal.fechaRecepcion) * 1000) : new Date();

  const getRazaTexto = (raza?: number) => {
    switch (raza) {
      case 1: return 'Angus';
      case 2: return 'Hereford';
      case 3: return 'Brangus';
      default: return `Raza ${raza || 'No especificada'}`;
    }
  };

  const getEstadoTexto = (estado?: number) => {
    switch (estado) {
      case 0: return 'Pendiente';
      case 1: return 'Procesado';
      case 2: return 'Certificado';
      case 3: return 'Exportado';
      default: return `Estado ${estado || 'Desconocido'}`;
    }
  };

  const getEstadoColor = (estado?: number) => {
    switch (estado) {
      case 0: return 'bg-yellow-100 text-yellow-800';
      case 1: return 'bg-blue-100 text-blue-800';
      case 2: return 'bg-green-100 text-green-800';
      case 3: return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🐄</div>
          <div>
            <h4 className="font-semibold text-gray-800">Animal #{animal.id.toString()}</h4>
            <p className="text-sm text-gray-600">
              {pesoKg.toFixed(2)} kg • {fuentePeso === 'real' ? '✅ Peso real' : '📦 Peso estimado'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* Información de Peso y Precio */}
      <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-green-700">{pesoKg.toFixed(2)} kg</div>
            <div className="text-xs text-green-600">Peso</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-700">${precioTotal.toFixed(2)}</div>
            <div className="text-xs text-blue-600">Precio</div>
          </div>
        </div>
        <div className="text-center mt-2 text-xs text-gray-500">
          Precio: {precioPorKilo} USDT/kg × {pesoKg.toFixed(2)} kg
          {fuentePeso !== 'real' && (
            <span className="text-orange-600 ml-1">(estimado)</span>
          )}
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
            <p><strong>Peso:</strong> {pesoKg.toFixed(2)} kg</p>
            <p><strong>Precio Total:</strong> ${precioTotal.toFixed(2)}</p>
            <p className={`text-xs ${fuentePeso === 'real' ? 'text-green-600' : 'text-orange-600'}`}>
              Fuente: {fuentePeso}
            </p>
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
            <p><strong>Propietario:</strong> <code className="text-xs">{animal.propietario?.slice(0, 10)}...</code></p>
            <p><strong>Raza:</strong> {getRazaTexto(animal.raza)}</p>
            <p><strong>Estado:</strong> <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(animal.estado)}`}>
              {getEstadoTexto(animal.estado)}
            </span></p>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="border-t border-gray-200 pt-3">
        <div className="text-sm text-gray-600 space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Fecha Recepción:</strong> {fechaRecepcion.toLocaleDateString()}</p>
            </div>
            <div>
              <p><strong>Frigorífico:</strong> <code className="text-xs">{animal.frigorifico?.slice(0, 10)}...</code></p>
            </div>
          </div>

          {/* Datos StarkNet si están disponibles */}
          {animal.starknet_data && (
            <div className="mt-2 p-2 bg-gray-50 rounded">
              <p className="text-xs text-gray-500 mb-1">Datos StarkNet:</p>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>ID:</strong> {animal.starknet_data.id}</p>
                <p><strong>Peso real:</strong> {animal.starknet_data.peso} gramos</p>
                <p><strong>Lote ID:</strong> {animal.starknet_data.lote_id}</p>
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