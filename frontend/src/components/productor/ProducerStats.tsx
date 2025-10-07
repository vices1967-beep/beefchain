'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';
import { EstadoAnimal } from '@/contracts/config';

interface ProducerStats {
  totalAnimals: number;
  activeAnimals: number;
  processedAnimals: number;
  totalBatches: number;
  totalWeight: bigint;
  averageWeight: number;
  animalsByStatus: { [key: string]: number };
  recentActivity: any[];
}

export function ProducerStats() {
  const { address, contractService } = useStarknet();
  const [stats, setStats] = useState<ProducerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStats = async () => {
    if (!contractService || !address) {
      setError('Servicio de contrato no disponible');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      console.log('📊 Cargando estadísticas del productor...');
      
      // Obtener estadísticas del productor desde el contrato
      const producerStats = await contractService.getProducerStats(address);
      const animals = await contractService.getAnimalsByOwner(address);
      const batches = await contractService.getBatchesByProducer(address);
      
      // Calcular estadísticas detalladas
      const animalsByStatus: { [key: string]: number } = {};
      let totalWeight = BigInt(0);
      let activeAnimals = 0;
      let processedAnimals = 0;

      // Procesar cada animal para obtener estadísticas detalladas
      for (const animal of animals) {
        try {
          const animalData = await contractService.getAnimalData(animal.id);
          
          // Contar por estado
          const estadoKey = EstadoAnimal[animalData.estado] || 'DESCONOCIDO';
          animalsByStatus[estadoKey] = (animalsByStatus[estadoKey] || 0) + 1;
          
          // Sumar peso
          if (animalData.peso && animalData.peso > BigInt(0)) {
            totalWeight += animalData.peso;
          }
          
          // Contar animales activos y procesados
          if (animalData.estado === EstadoAnimal.CREADO) {
            activeAnimals++;
          } else if (animalData.estado === EstadoAnimal.PROCESADO) {
            processedAnimals++;
          }
        } catch (animalError) {
          console.error(`Error procesando animal ${animal.id}:`, animalError);
        }
      }

      // Calcular peso promedio
      const averageWeight = animals.length > 0 ? 
        Number(totalWeight) / animals.length : 0;

      // Obtener actividad reciente (últimos 5 animales creados)
      const recentActivity = animals
        .slice(0, 5)
        .map(animal => ({
          id: animal.id,
          type: 'animal_created',
          timestamp: animal.fechaCreacion || new Date().toISOString(),
          description: `Animal #${animal.id} registrado`
        }));

      const statsData: ProducerStats = {
        totalAnimals: animals.length,
        activeAnimals,
        processedAnimals,
        totalBatches: batches.length,
        totalWeight,
        averageWeight: Math.round(averageWeight * 100) / 100,
        animalsByStatus,
        recentActivity
      };
      
      setStats(statsData);
      setLastUpdated(new Date());
      
      console.log('✅ Estadísticas cargadas:', statsData);
      
    } catch (error: any) {
      console.error('❌ Error cargando estadísticas:', error);
      setError(`Error cargando estadísticas: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (contractService && address) {
      loadStats();
    }
  }, [contractService, address]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREADO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PROCESADO':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CERTIFICADO':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'EXPORTADO':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatWeight = (weight: bigint) => {
    return `${weight.toString()} kg`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Estadísticas del Productor</h3>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-40 bg-gray-200 rounded-lg"></div>
            <div className="h-40 bg-gray-200 rounded-lg"></div>
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">📊 Estadísticas del Productor</h3>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Actualizado: {lastUpdated.toLocaleTimeString('es-ES')}
            </p>
          )}
        </div>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <span>🔄</span>
          Actualizar
        </button>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">
            {stats?.totalAnimals || 0}
          </div>
          <div className="text-sm text-blue-600">Animales Totales</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">
            {stats?.activeAnimals || 0}
          </div>
          <div className="text-sm text-green-600">Animales Activos</div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">
            {stats?.totalBatches || 0}
          </div>
          <div className="text-sm text-purple-600">Lotes Creados</div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-700">
            {stats?.averageWeight || 0}
          </div>
          <div className="text-sm text-orange-600">Peso Promedio (kg)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Distribución por Estado */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-4">📈 Distribución por Estado</h4>
          <div className="space-y-3">
            {stats?.animalsByStatus && Object.entries(stats.animalsByStatus).length > 0 ? (
              Object.entries(stats.animalsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                    {status}
                  </span>
                  <span className="font-semibold text-gray-700">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No hay datos de distribución</p>
            )}
          </div>
          
          {/* Peso Total */}
          {stats?.totalWeight !== undefined && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Peso Total:</span>
                <span className="font-bold text-lg text-gray-800">
                  {formatWeight(stats.totalWeight)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actividad Reciente */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-700 mb-4">🕒 Actividad Reciente</h4>
          <div className="space-y-3">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No hay actividad reciente</p>
            )}
          </div>
        </div>
      </div>

      {/* Resumen de Rendimiento */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-800 mb-3">📋 Resumen de Rendimiento</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats?.totalAnimals || 0}</div>
            <div className="text-blue-700">Animales Registrados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.activeAnimals || 0}</div>
            <div className="text-green-700">Disponibles para Transferir</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats?.totalBatches || 0}</div>
            <div className="text-purple-700">Lotes Gestionados</div>
          </div>
        </div>
        
        {/* Tasa de Procesamiento */}
        {stats && stats.totalAnimals > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-700">Tasa de Procesamiento:</span>
              <span className="font-bold text-blue-800">
                {Math.round((stats.processedAnimals / stats.totalAnimals) * 100)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(stats.processedAnimals / stats.totalAnimals) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Información Adicional */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h5 className="font-semibold text-yellow-800 mb-2">💡 Recomendaciones</h5>
          <ul className="text-yellow-700 space-y-1">
            {(!stats || stats.totalAnimals === 0) && (
              <li>• Crea tu primer animal para comenzar</li>
            )}
            {stats && stats.activeAnimals > 0 && (
              <li>• Tienes {stats.activeAnimals} animales listos para transferir</li>
            )}
            {stats && stats.totalBatches === 0 && stats.totalAnimals > 1 && (
              <li>• Crea lotes para agrupar animales similares</li>
            )}
            <li>• Monitorea el peso de tus animales regularmente</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h5 className="font-semibold text-green-800 mb-2">🎯 Próximos Pasos</h5>
          <ul className="text-green-700 space-y-1">
            <li>• Actualiza pesos de animales periódicamente</li>
            <li>• Crea lotes para optimizar transferencias</li>
            <li>• Autoriza veterinarios para gestionar salud</li>
            <li>• Transfiere animales al frigorífico</li>
          </ul>
        </div>
      </div>

      {/* Estado del Sistema */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">Sistema Conectado</span>
          </div>
          <div className="text-xs text-gray-500">
            Contrato: {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.slice(0, 10)}...
          </div>
        </div>
      </div>
    </div>
  );
}