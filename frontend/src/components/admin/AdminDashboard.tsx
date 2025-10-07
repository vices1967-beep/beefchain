'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';

export function AdminDashboard() {
  const { contractService } = useStarknet();
  const [systemStats, setSystemStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemStats();
  }, [contractService]);

  const loadSystemStats = async () => {
    if (!contractService) return;
    
    try {
      setLoading(true);
      console.log('🔄 Cargando estadísticas del dashboard...');
      
      const stats = await contractService.getSystemStats();
      const roleStats = await contractService.getRoleStats();
      
      const combinedStats = { ...stats, ...roleStats };
      console.log('✅ Dashboard stats:', combinedStats);
      
      setSystemStats(combinedStats);
    } catch (error) {
      console.error('❌ Error cargando estadísticas del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Cargando dashboard...</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Dashboard del Sistema</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">
            {systemStats?.total_animals_created?.toString() || '0'}
          </div>
          <div className="text-sm text-blue-600">Animales Totales</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">
            {systemStats?.total_batches_created?.toString() || '0'}
          </div>
          <div className="text-sm text-green-600">Lotes Creados</div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">
            {systemStats?.total_cortes_created?.toString() || '0'}
          </div>
          <div className="text-sm text-purple-600">Cortes Producidos</div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-700">
            {systemStats?.producers?.toString() || '0'}
          </div>
          <div className="text-sm text-orange-600">Productores</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-gray-700">
            {systemStats?.frigorificos?.toString() || '0'}
          </div>
          <div className="text-sm text-gray-600">Frigoríficos</div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-gray-700">
            {systemStats?.certifiers?.toString() || '0'}
          </div>
          <div className="text-sm text-gray-600">Certificadores</div>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-lg font-bold text-gray-700">
            {systemStats?.exporters?.toString() || '0'}
          </div>
          <div className="text-sm text-gray-600">Exportadores</div>
        </div>
      </div>

      {/* Información del Sistema */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">ℹ️ Información del Sistema</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-600">Contrato:</span>
            <span className="font-mono ml-2 text-blue-700">
              {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.slice(0, 10)}...
            </span>
          </div>
          <div>
            <span className="text-blue-600">Red:</span>
            <span className="ml-2 text-blue-700">StarkNet</span>
          </div>
        </div>
      </div>
    </div>
  );
}