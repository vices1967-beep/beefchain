'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';
import { RazaAnimal, EstadoAnimal } from '@/contracts/config';

interface AnimalInfo {
  id: bigint;
  raza: RazaAnimal;
  estado: EstadoAnimal;
  propietario: string;
  metadataHash: string;
  fechaNacimiento?: bigint;
  peso?: bigint;
  fechaCreacion?: bigint;
  frigorifico?: string;
  batchId?: bigint;
}

const VOYAGER_URL = 'https://sepolia.voyager.online/tx';
// Agrega esta función en tu componente
const isAnimalInBatch = (animal: AnimalInfo): boolean => {
  return (animal.batchId ?? BigInt(0)) > BigInt(0);
};

export function AnimalList() {
  const { address, isConnected, contractService } = useStarknet();
  const [animals, setAnimals] = useState<AnimalInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Cargar animales reales del contrato
  const loadRealAnimals = async () => {
    if (!isConnected || !address || !contractService) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔄 Cargando animales reales del contrato...');
      setIsLoading(true);
      setError('');
      
      // Obtener IDs de animales del productor
      const animalIds = await contractService.getAnimalsByProducer(address);
      console.log(`📋 IDs de animales encontrados:`, animalIds);
      
      const animalDetails: AnimalInfo[] = [];
      
      // Obtener detalles de cada animal
      for (const animalId of animalIds) {
        try {
          console.log(`📖 Obteniendo datos del animal #${animalId}...`);
          const animalData = await contractService.getAnimalData(animalId);
          
          // Verificar si el animal está en un lote
          let batchId = BigInt(0);
          try {
            batchId = await contractService.getBatchForAnimal(animalId);
          } catch (batchError) {
            console.log(`Animal ${animalId} - no se pudo verificar lote:`, batchError);
          }
          
          animalDetails.push({
            id: animalId,
            raza: animalData.raza,
            estado: animalData.estado,
            propietario: animalData.propietario,
            metadataHash: animalData.metadataHash || 'chipypay_simple_v2',
            fechaNacimiento: animalData.fechaNacimiento,
            peso: animalData.peso,
            fechaCreacion: animalData.fechaCreacion,
            frigorifico: animalData.frigorifico,
            batchId: batchId
          });
          
          console.log(`✅ Animal #${animalId} cargado:`, {
            ...animalData,
            batchId: batchId.toString()
          });
        } catch (animalError: any) {
          console.error(`❌ Error cargando animal ${animalId}:`, animalError);
          // Continuar con el siguiente animal en caso de error
        }
      }
      
      // Eliminar duplicados basados en el ID del animal
      const uniqueAnimals = animalDetails.filter((animal, index, self) =>
        index === self.findIndex(a => a.id.toString() === animal.id.toString())
      );
      
      // Ordenar animales por ID (más recientes primero)
      uniqueAnimals.sort((a, b) => Number(b.id - a.id));
      
      setAnimals(uniqueAnimals);
      console.log(`✅ ${uniqueAnimals.length} animales únicos cargados exitosamente`);
      
    } catch (error: any) {
      console.error('❌ Error cargando animales reales:', error);
      setError(`Error al cargar animales: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRealAnimals();
  }, [isConnected, address, contractService]);

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

  const formatDate = (timestamp: bigint): string => {
    if (!timestamp || timestamp === BigInt(0)) return 'No disponible';
    try {
      const date = new Date(Number(timestamp) * 1000);
      if (date.getFullYear() < 2020) return 'No disponible';
      return date.toLocaleDateString('es-ES');
    } catch {
      return 'No disponible';
    }
  };

  const formatTimestamp = (timestamp: bigint): string => {
    if (!timestamp || timestamp === BigInt(0)) return 'No disponible';
    try {
      const date = new Date(Number(timestamp) * 1000);
      if (date.getFullYear() < 2020) return 'No disponible';
      return date.toLocaleString('es-ES');
    } catch {
      return 'No disponible';
    }
  };

  const canTransferAnimal = (animal: AnimalInfo): boolean => {
    return animal.estado === EstadoAnimal.CREADO && 
           animal.batchId === BigInt(0) && 
           animal.propietario === address;
  };

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
          📋 Mis Animales en StarkNet
        </h3>
        <button
          onClick={loadRealAnimals}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center gap-2"
        >
          {isLoading ? '🔄' : '🔄'}
          {isLoading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700 font-semibold">Error:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={loadRealAnimals}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Cargando animales desde StarkNet...</p>
          <p className="text-sm text-gray-500 mt-1">Esto puede tomar unos segundos</p>
        </div>
      ) : animals.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🐄</div>
          <p className="text-gray-600">No tienes animales registrados en StarkNet</p>
          <p className="text-sm text-gray-500 mt-2">
            Usa el formulario "Crear Animal" para registrar tu primer animal
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {animals.map((animal) => (
            <div
              key={`animal-${animal.id.toString()}-${animal.propietario}-${animal.fechaCreacion}`}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-800 text-lg">
                      Animal #{animal.id.toString()}
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(animal.estado)}`}>
                      {getEstadoName(animal.estado)}
                    </span>
                    {animal.batchId !== undefined && animal.batchId > BigInt(0) && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs border border-purple-200">
                        📦 Lote #{animal.batchId.toString()}
                      </span>
                    )}
                    {canTransferAnimal(animal) && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs border border-green-200">
                        ✅ Transferible
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                    <div>
                      <span className="font-medium">Raza:</span> {getRazaName(animal.raza)}
                    </div>
                    <div>
                      <span className="font-medium">ID:</span> {animal.id.toString()}
                    </div>
                    {animal.peso && animal.peso > BigInt(0) && (
                      <div>
                        <span className="font-medium">Peso:</span> {animal.peso.toString()} kg
                      </div>
                    )}
                    {animal.fechaNacimiento && animal.fechaNacimiento > BigInt(0) && (
                      <div>
                        <span className="font-medium">Nacimiento:</span> {formatDate(animal.fechaNacimiento)}
                      </div>
                    )}
                  </div>
                  
                  {animal.fechaCreacion && animal.fechaCreacion > BigInt(0) && (
                    <p className="text-xs text-gray-500">
                      📅 Registrado: {formatTimestamp(animal.fechaCreacion)}
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
                      ✅ Registrado en StarkNet
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

      {/* Estadísticas y información */}
      <div className="mt-6 space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-semibold">
                ✅ {animals.length} animales cargados desde el contrato real
              </p>
              <p className="text-xs text-green-600 mt-1">
                {animals.filter(a => canTransferAnimal(a)).length} animales disponibles para transferir
              </p>
            </div>
            <button
              onClick={loadRealAnimals}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Actualizar
            </button>
          </div>
        </div>

        {/* Resumen rápido */}
        {animals.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
              <div className="font-bold text-blue-700">{animals.length}</div>
              <div className="text-blue-600">Total</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded border border-green-200">
              <div className="font-bold text-green-700">
                {animals.filter(a => canTransferAnimal(a)).length}
              </div>
              <div className="text-green-600">Transferibles</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded border border-purple-200">
              <div className="font-bold text-purple-700">
                {animals.filter(a => a.estado === EstadoAnimal.PROCESADO).length}
              </div>
              <div className="text-purple-600">Procesados</div>
            </div>
            <div className="text-center p-2 bg-orange-50 rounded border border-orange-200">
              <div className="font-bold text-orange-700">
                {animals.filter(a => a.batchId && a.batchId > BigInt(0)).length}
              </div>
              <div className="text-orange-600">En Lotes</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}