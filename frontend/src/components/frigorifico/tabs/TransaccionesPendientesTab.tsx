// src/components/frigorifico/tabs/TransaccionesPendientesTab.tsx
import { useState } from 'react';

interface TransaccionesPendientesTabProps {
  transaccionesCache: any[];
  onEjecutarTransacciones: () => Promise<void>;
  onSincronizarCache: () => Promise<void>;
  cargando: boolean;
}

export function TransaccionesPendientesTab({ 
  transaccionesCache, 
  onEjecutarTransacciones,
  onSincronizarCache, 
  cargando 
}: TransaccionesPendientesTabProps) {
  const [mostrarDetalles, setMostrarDetalles] = useState<string | null>(null);

  if (transaccionesCache.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-xl font-semibold text-green-800 mb-2">Cache Sincronizado</h3>
        <p className="text-green-700">No hay transacciones pendientes - el cache está alineado con StarkNet</p>
        
        <button
          onClick={onSincronizarCache}
          disabled={cargando}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {cargando ? 'Sincronizando...' : 'Verificar Sincronización'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h4 className="font-semibold text-orange-800">Transacciones Pendientes de Ejecución</h4>
            <p className="text-orange-700 text-sm">
              Hay {transaccionesCache.length} transacciones en cache que necesitan ejecutarse en StarkNet
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-3">
          <button
            onClick={onSincronizarCache}
            disabled={cargando}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <span>🔄</span>
            Sincronizar Cache
          </button>
          
          <button
            onClick={onEjecutarTransacciones}
            disabled={cargando}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {cargando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Ejecutando...
              </>
            ) : (
              <>
                <span>🚀</span>
                Ejecutar Todas las Transacciones
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800">Detalle de Transacciones Pendientes:</h4>
        
        {transaccionesCache.map((tx, index) => (
          <div key={tx.hash} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    tx.tipo === 'animal_transferred' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {tx.tipo === 'animal_transferred' ? '🐄 Animal' : '📦 Lote'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(tx.timestamp).toLocaleString()}
                  </span>
                </div>
                
                <div className="text-sm space-y-1">
                  <p><strong>Hash:</strong> <code className="text-xs">{tx.hash.slice(0, 20)}...</code></p>
                  {tx.data?.animalId && (
                    <p><strong>Animal ID:</strong> {tx.data.animalId}</p>
                  )}
                  {tx.data?.batchId && (
                    <p><strong>Lote ID:</strong> {tx.data.batchId}</p>
                  )}
                  {tx.data?.from && (
                    <p><strong>De:</strong> <code className="text-xs">{tx.data.from.slice(0, 10)}...</code></p>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setMostrarDetalles(mostrarDetalles === tx.hash ? null : tx.hash)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
              >
                {mostrarDetalles === tx.hash ? 'Ocultar' : 'Detalles'}
              </button>
            </div>
            
            {mostrarDetalles === tx.hash && (
              <div className="mt-3 p-3 bg-gray-50 rounded border">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(tx, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}