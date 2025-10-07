'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';

export function SystemStats() {
  const { contractService } = useStarknet();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadStats();
  }, [contractService]);

  const loadStats = async () => {
    if (!contractService) {
      setError('Servicio de contrato no disponible');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Cargando estadísticas del sistema...');
      
      // Obtener estadísticas del sistema
      const systemStats = await contractService.getSystemStats();
      const roleStats = await contractService.getRoleStats();
      
      const combinedStats = {
        ...systemStats,
        ...roleStats
      };
      
      console.log('✅ Estadísticas cargadas:', combinedStats);
      setStats(combinedStats);
      
    } catch (err: any) {
      console.error('❌ Error cargando estadísticas:', err);
      setError(`Error al cargar estadísticas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Estadísticas del Sistema</h3>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-red-800 mb-2">❌ Error</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadStats}
          className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">📊 Estadísticas del Sistema</h3>
        <button
          onClick={loadStats}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
        >
          Actualizar
        </button>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">
            {stats?.total_animals_created?.toString() || '0'}
          </div>
          <div className="text-sm text-blue-600">Animales Totales</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">
            {stats?.total_batches_created?.toString() || '0'}
          </div>
          <div className="text-sm text-green-600">Lotes Creados</div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">
            {stats?.total_cortes_created?.toString() || '0'}
          </div>
          <div className="text-sm text-purple-600">Cortes Producidos</div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-700">
            {stats?.processed_animals?.toString() || '0'}
          </div>
          <div className="text-sm text-orange-600">Animales Procesados</div>
        </div>
      </div>

      {/* Estadísticas de Roles */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-gray-700">
            {stats?.producers?.toString() || '0'}
          </div>
          <div className="text-sm text-gray-600">Productores</div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-gray-700">
            {stats?.frigorificos?.toString() || '0'}
          </div>
          <div className="text-sm text-gray-600">Frigoríficos</div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-gray-700">
            {stats?.certifiers?.toString() || '0'}
          </div>
          <div className="text-sm text-gray-600">Certificadores</div>
        </div>
      </div>

      {/* IDs de Contadores */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">🔢 Contadores del Sistema</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Próximo Animal ID:</span>
            <span className="font-mono ml-2 bg-white px-2 py-1 rounded border">
              {stats?.next_token_id?.toString() || '0'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Próximo Lote ID:</span>
            <span className="font-mono ml-2 bg-white px-2 py-1 rounded border">
              {stats?.next_batch_id?.toString() || '0'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Próximo Lote Animal ID:</span>
            <span className="font-mono ml-2 bg-white px-2 py-1 rounded border">
              {stats?.next_lote_id?.toString() || '0'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}