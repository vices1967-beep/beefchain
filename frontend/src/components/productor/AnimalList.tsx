'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';
import { RazaAnimal, EstadoAnimal } from '@/contracts/config';
import { cacheService } from '@/services/CacheService';

interface AnimalInfo {
  id: string;
  raza: RazaAnimal;
  estado: EstadoAnimal;
  propietario: string;
  metadataHash: string;
  fechaNacimiento?: number;
  peso?: number;
  fechaCreacion?: number;
  frigorifico?: string;
  batchId?: string;
  nombre?: string;
  genero?: string;
  alimentacion?: string;
  tx_hash?: string;
}

export function AnimalList() {
  const { address, isConnected } = useStarknet();
  const [animals, setAnimals] = useState<AnimalInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [cacheAvailable, setCacheAvailable] = useState<boolean>(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // ✅ FUNCIÓN MEJORADA: Convertir cualquier estructura a array
  const normalizeAnimalsData = (animalsData: any): any[] => {
    if (!animalsData) return [];
    
    console.log('🔄 Normalizando datos de animales:', animalsData);
    
    // Caso 1: Ya es un array
    if (Array.isArray(animalsData)) {
      return animalsData;
    }
    
    // Caso 2: Objeto con propiedad 'animals' que es array
    if (animalsData.animals && Array.isArray(animalsData.animals)) {
      return animalsData.animals;
    }
    
    // Caso 3: Objeto con propiedad 'data' que es array
    if (animalsData.data && Array.isArray(animalsData.data)) {
      return animalsData.data;
    }
    
    // Caso 4: Objeto con propiedad 'animals' que es objeto (convertir a array)
    if (animalsData.animals && typeof animalsData.animals === 'object') {
      return Object.values(animalsData.animals);
    }
    
    // Caso 5: Objeto con propiedad 'data' que es objeto (convertir a array)
    if (animalsData.data && typeof animalsData.data === 'object') {
      return Object.values(animalsData.data);
    }
    
    // Caso 6: Es un objeto simple (convertir a array de un elemento)
    if (typeof animalsData === 'object' && animalsData !== null) {
      // Si tiene propiedad 'id', es probablemente un solo animal
      if (animalsData.id) {
        return [animalsData];
      }
      // Si no, convertir todos los valores a array
      return Object.values(animalsData);
    }
    
    console.warn('⚠️ Estructura de animales no reconocida:', animalsData);
    return [];
  };

  // Verificar salud del cache usando el nuevo servicio
  const checkCacheHealth = async () => {
    try {
      const health = await cacheService.healthCheck();
      const isHealthy = health && health.status === 'healthy';
      setCacheAvailable(isHealthy);
      return isHealthy;
    } catch (error) {
      setCacheAvailable(false);
      return false;
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Cargar animales desde el cache
  const loadAnimalsFromCache = async () => {
    if (!isConnected || !address) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔄 Cargando animales desde el cache...');
      setIsLoading(true);
      setError('');
      setDebugInfo('');

      // Verificar que el cache esté disponible
      const isHealthy = await checkCacheHealth();
      if (!isHealthy) {
        throw new Error('El servidor de cache no está disponible');
      }

      // Cargar estadísticas del cache
      const stats = await cacheService.getStats();
      if (stats && stats.success) {
        setCacheStats(stats);
        console.log('📊 Estadísticas del cache:', stats.summary);
      }

      // PRIMERO: Intentar obtener animales específicos del propietario
      let animalsData = await cacheService.getAnimalsByOwner(address);
      console.log('🐄 Animales del propietario (raw):', animalsData);
      
      // ✅ NORMALIZAR los datos
      let normalizedAnimals = normalizeAnimalsData(animalsData);
      console.log('🐄 Animales normalizados:', normalizedAnimals);

      // SEGUNDO: Si no encuentra animales, obtener TODOS los animales y filtrar
      if (normalizedAnimals.length === 0) {
        console.log('🔍 No se encontraron animales específicos, obteniendo todos...');
        const allAnimals = await cacheService.getAllAnimals();
        console.log('🐄 Todos los animales (raw):', allAnimals);
        
        // Normalizar todos los animales
        const allNormalizedAnimals = normalizeAnimalsData(allAnimals);
        
        // Filtrar animales que pertenezcan a este address
        normalizedAnimals = allNormalizedAnimals.filter((animalData: any) => {
          // Buscar en diferentes campos de propietario
          const propietario = animalData.propietario_actual || animalData.propietario || animalData.owner;
          const matches = propietario?.toLowerCase() === address.toLowerCase();
          
          if (matches) {
            console.log(`✅ Animal ${animalData.id} pertenece a ${address}`);
          }
          
          return matches;
        });
        
        console.log('🐄 Animales filtrados:', normalizedAnimals);
        setDebugInfo(`Encontrados ${normalizedAnimals.length} animales después de filtrar todos`);
      }

      // ✅ CONVERTIR a AnimalInfo - CON MANEJO DE ERRORES
      const animalsArray: AnimalInfo[] = [];
      
      for (const animalData of normalizedAnimals) {
        try {
          // Buscar propietario en diferentes campos
          const propietario = animalData.propietario_actual || animalData.propietario || animalData.owner || address;
          
          // Validar que tenga datos mínimos
          if (!animalData.id && !animalData._id) {
            console.warn('⚠️ Animal sin ID:', animalData);
            continue;
          }
          
          const animalInfo: AnimalInfo = {
            id: animalData.id?.toString() || animalData._id?.toString() || 'unknown',
            raza: animalData.raza || RazaAnimal.ANGUS,
            estado: mapCacheEstadoToEstadoAnimal(animalData.estado),
            propietario: propietario,
            metadataHash: animalData.metadata_hash || animalData.metadataHash || '0x0',
            fechaNacimiento: animalData.fecha_nacimiento || animalData.fechaNacimiento,
            peso: animalData.peso_inicial || animalData.peso,
            fechaCreacion: animalData.fecha_creacion || animalData.fechaCreacion || animalData.createdAt,
            frigorifico: animalData.frigorifico,
            batchId: animalData.lote_id || animalData.batch_id || animalData.batchId,
            nombre: animalData.nombre || animalData.name,
            genero: animalData.genero || animalData.gender,
            alimentacion: animalData.alimentacion || animalData.alimentation,
            tx_hash: animalData.tx_hash || animalData.txHash
          };
          
          animalsArray.push(animalInfo);
          
        } catch (animalError) {
          console.error('❌ Error procesando animal:', animalData, animalError);
        }
      }

      // Ordenar animales por fecha de creación (más recientes primero)
      animalsArray.sort((a, b) => (b.fechaCreacion || 0) - (a.fechaCreacion || 0));
      
      setAnimals(animalsArray);
      console.log(`✅ ${animalsArray.length} animales cargados desde cache`);

    } catch (error: any) {
      console.error('❌ Error cargando animales desde cache:', error);
      setError(`Error al cargar animales: ${error.message}`);
      setAnimals([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Mapear estados del cache a EstadoAnimal
  const mapCacheEstadoToEstadoAnimal = (cacheEstado: string): EstadoAnimal => {
    if (!cacheEstado) return EstadoAnimal.CREADO;
    
    const estadoStr = cacheEstado.toString().toLowerCase();
    
    switch (estadoStr) {
      case 'activo':
      case 'creado':
      case 'created':
      case 'active':
        return EstadoAnimal.CREADO;
      case 'procesado':
      case 'processed':
        return EstadoAnimal.PROCESADO;
      case 'certificado':
      case 'certified':
        return EstadoAnimal.CERTIFICADO;
      case 'exportado':
      case 'exported':
        return EstadoAnimal.EXPORTADO;
      default:
        console.warn('⚠️ Estado desconocido:', cacheEstado);
        return EstadoAnimal.CREADO;
    }
  };

  // Función auxiliar para nombres de alimentación
  const getAlimentacionName = (alimentacion: string): string => {
    if (!alimentacion) return 'Desconocido';
    
    switch (alimentacion.toUpperCase()) {
      case 'P': return 'Pastura';
      case 'G': return 'Grano';
      case 'M': return 'Mixto';
      case 'O': return 'Orgánico';
      default: return alimentacion;
    }
  };

  const getRazaName = (raza: RazaAnimal): string => {
    switch (raza) {
      case RazaAnimal.ANGUS: return 'Angus';
      case RazaAnimal.HEREFORD: return 'Hereford';
      case RazaAnimal.BRANGUS: return 'Brangus';
      default: return 'Desconocida';
    }
  };

  const getEstadoName = (estado: EstadoAnimal): string => {
    switch (estado) {
      case EstadoAnimal.CREADO: return 'Creado';
      case EstadoAnimal.PROCESADO: return 'Procesado';
      case EstadoAnimal.CERTIFICADO: return 'Certificado';
      case EstadoAnimal.EXPORTADO: return 'Exportado';
      default: return 'Desconocido';
    }
  };

  const getEstadoColor = (estado: EstadoAnimal) => {
    switch (estado) {
      case EstadoAnimal.CREADO:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case EstadoAnimal.PROCESADO:
        return 'bg-green-100 text-green-800 border-green-200';
      case EstadoAnimal.CERTIFICADO:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case EstadoAnimal.EXPORTADO:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp || timestamp === 0) return 'No disponible';
    try {
      const date = new Date(timestamp * 1000);
      if (date.getFullYear() < 2020) return 'No disponible';
      return date.toLocaleDateString('es-ES');
    } catch {
      return 'No disponible';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    if (!timestamp || timestamp === 0) return 'No disponible';
    try {
      const date = new Date(timestamp * 1000);
      if (date.getFullYear() < 2020) return 'No disponible';
      return date.toLocaleString('es-ES');
    } catch {
      return 'No disponible';
    }
  };

  const canTransferAnimal = (animal: AnimalInfo): boolean => {
    return animal.estado === EstadoAnimal.CREADO && 
           !animal.batchId && 
           animal.propietario === address;
  };

  const isAnimalInBatch = (animal: AnimalInfo): boolean => {
    return !!(animal.batchId && animal.batchId !== '0');
  };

  // Efecto para cargar animales cuando se conecta la wallet
  useEffect(() => {
    if (isConnected && address) {
      loadAnimalsFromCache();
    } else {
      setAnimals([]);
      setIsLoading(false);
    }
  }, [isConnected, address]);

  // Efecto para verificar conexión automática al cache
  useEffect(() => {
    const initializeCache = async () => {
      try {
        console.log('🔄 Inicializando conexión con cache...');
        const connected = await cacheService.autoConnect();
        setCacheAvailable(connected);
        
        if (connected && isConnected && address) {
          loadAnimalsFromCache();
        }
      } catch (error) {
        console.error('❌ Error inicializando cache:', error);
        setCacheAvailable(false);
      }
    };

    initializeCache();
  }, []);

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-700">Conecta tu wallet para ver tus animales</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          📋 Mis Animales en Cache
        </h3>
        <button
          onClick={loadAnimalsFromCache}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center gap-2"
        >
          {isLoading ? '🔄' : '🔄'}
          {isLoading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Estado del Cache */}
      <div className={`border rounded-xl p-4 mb-6 ${
        cacheAvailable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <h4 className="font-semibold mb-2 flex items-center gap-2 ${
          cacheAvailable ? 'text-green-800' : 'text-red-800'
        }">
          <span className={cacheAvailable ? 'text-green-500' : 'text-red-500'}>
            {cacheAvailable ? '💾' : '❌'}
          </span>
          {cacheAvailable ? 'Cache Conectado ✅' : 'Cache No Disponible'}
        </h4>
        <div className="text-sm space-y-1 ${
          cacheAvailable ? 'text-green-700' : 'text-red-700'
        }">
          {cacheAvailable ? (
            <>
              <p><strong>URL del cache:</strong> {cacheService.getBaseURL()}</p>
              <p><strong>Animales en cache:</strong> {cacheStats?.summary?.total_animals ?? '0'}</p>
              <p><strong>Animales propios:</strong> {animals.length}</p>
              <p><strong>Transacciones:</strong> {cacheStats?.summary?.total_transactions ?? '0'}</p>
              {debugInfo && (
                <p className="text-xs text-blue-600 mt-1">🔍 {debugInfo}</p>
              )}
              <p className="text-xs mt-2">✅ Usando servicio de cache mejorado</p>
            </>
          ) : (
            <div>
              <p>El servidor de cache no está disponible.</p>
              <button
                onClick={() => cacheService.autoConnect()}
                className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
              >
                Reintentar Conexión
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700 font-semibold">Error:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={loadAnimalsFromCache}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Cargando animales desde Cache...</p>
          <p className="text-sm text-gray-500 mt-1">
            Conectado a: {cacheService.getBaseURL()}
          </p>
        </div>
      ) : !cacheAvailable ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">Cache no disponible</p>
          <p className="text-sm text-gray-500 mt-2">
            No se pueden cargar animales. Verifica que el servidor de cache esté funcionando.
          </p>
          <button
            onClick={() => cacheService.autoConnect()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            🔄 Intentar Reconexión Automática
          </button>
        </div>
      ) : animals.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🐄</div>
          <p className="text-gray-600">No tienes animales registrados en el cache</p>
          <p className="text-sm text-gray-500 mt-2">
            Address conectado: {address?.slice(0, 10)}...{address?.slice(-8)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            El cache tiene {cacheStats?.summary?.total_animals ?? '0'} animales, pero ninguno asociado a tu wallet
          </p>
          <button
            onClick={loadAnimalsFromCache}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            🔍 Buscar Animales Nuevamente
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {animals.map((animal) => (
            <div
              key={`animal-${animal.id}-${animal.propietario}-${animal.fechaCreacion}`}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-800 text-lg">
                      {animal.nombre || `Animal #${animal.id}`}
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(animal.estado)}`}>
                      {getEstadoName(animal.estado)}
                    </span>
                    {isAnimalInBatch(animal) && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs border border-purple-200">
                        📦 Lote #{animal.batchId}
                      </span>
                    )}
                    {canTransferAnimal(animal) && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs border border-green-200">
                        ✅ Transferible
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                    <div>
                      <span className="font-medium">ID:</span> {animal.id}
                    </div>
                    <div>
                      <span className="font-medium">Raza:</span> {getRazaName(animal.raza)}
                    </div>
                    {animal.genero && (
                      <div>
                        <span className="font-medium">Género:</span> {animal.genero === 'M' ? 'Macho' : 'Hembra'}
                      </div>
                    )}
                    {animal.peso && animal.peso > 0 && (
                      <div>
                        <span className="font-medium">Peso:</span> {animal.peso} kg
                      </div>
                    )}
                    {animal.fechaNacimiento && animal.fechaNacimiento > 0 && (
                      <div>
                        <span className="font-medium">Nacimiento:</span> {formatDate(animal.fechaNacimiento)}
                      </div>
                    )}
                    {animal.alimentacion && (
                      <div>
                        <span className="font-medium">Alimentación:</span> {getAlimentacionName(animal.alimentacion)}
                      </div>
                    )}
                  </div>
                  
                  {animal.fechaCreacion && animal.fechaCreacion > 0 && (
                    <p className="text-xs text-gray-500">
                      📅 Registrado en cache: {formatTimestamp(animal.fechaCreacion)}
                    </p>
                  )}
                  {animal.tx_hash && (
                    <p className="text-xs text-gray-500 mt-1">
                      🔗 TX: {animal.tx_hash.substring(0, 10)}...
                    </p>
                  )}
                </div>
              </div>
              
              {/* Información de propiedad */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 font-mono">
                      👤 Propietario: {animal.propietario?.slice(0, 8)}...{animal.propietario?.slice(-6)}
                    </p>
                    {animal.frigorifico && animal.frigorifico !== '0x0' && animal.frigorifico !== address && (
                      <p className="text-xs text-gray-500 mt-1">
                        🏭 Frigorífico: {animal.frigorifico.slice(0, 8)}...{animal.frigorifico.slice(-6)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-600 font-semibold">
                      💾 Guardado en Cache
                    </p>
                    {!canTransferAnimal(animal) && animal.estado === EstadoAnimal.CREADO && (
                      <p className="text-xs text-orange-600 mt-1">
                        {isAnimalInBatch(animal) ? 'En lote' : 'No transferible'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Información de modo cache mejorado */}
      <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <span className="text-blue-500">🚀</span>
          Cache Mejorado Activado
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Conectado automáticamente al mejor servidor disponible</strong></p>
          <p>URL actual: <code className="bg-blue-100 px-1 rounded">{cacheService.getBaseURL()}</code></p>
          <p>Características: Reintentos automáticos, manejo robusto de errores, conexión inteligente</p>
        </div>
      </div>
    </div>
  );
}