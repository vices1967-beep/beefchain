'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';
import { EstadoAnimal } from '@/contracts/config';

interface Animal {
  id: bigint;
  raza: number;
  estado: EstadoAnimal;
  propietario: string;
  peso: bigint;
  fechaCreacion: string;
  metadataHash: string;
  batchId?: bigint;
}

export function TransferAnimalForm() {
  const { address, contractService } = useStarknet();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [transferringAnimal, setTransferringAnimal] = useState<bigint | null>(null);
  const [frigorificoAddress, setFrigorificoAddress] = useState('');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<bigint | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [transferStep, setTransferStep] = useState<'select' | 'payment' | 'confirm'>('select');
  const [error, setError] = useState('');

  // ✅ FUNCIÓN MEJORADA con manejo de errores robusto
  const loadAnimals = async () => {
    if (!contractService || !address) {
      console.log('❌ ContractService o address no disponible');
      return;
    }
    
    try {
      console.log('🔄 Cargando animales del productor...');
      setIsLoading(true);
      setError('');
      
      // ✅ VERIFICAR que la función existe antes de llamarla
      if (!contractService.getAnimalsByOwner) {
        console.warn('⚠️ getAnimalsByOwner no disponible en contractService');
        setAnimals([]);
        return;
      }

      const ownerAnimals = await contractService.getAnimalsByOwner(address);
      console.log(`📊 Animales obtenidos: ${ownerAnimals.length}`);
      
      // ✅ Obtener detalles completos de cada animal CON MANEJO DE ERRORES
      const animalDetails: Animal[] = [];
      
      for (const animalId of ownerAnimals.slice(0, 10)) { // ✅ Limitar a 10 para evitar timeout
        try {
          console.log(`🔍 Procesando animal #${animalId}`);
          
          // ✅ VERIFICAR que getAnimalData existe
          if (!contractService.getAnimalData) {
            console.warn('⚠️ getAnimalData no disponible');
            continue;
          }
          
          const animalData = await contractService.getAnimalData(animalId);
          
          let batchId = BigInt(0);
          try {
            if (contractService.getBatchForAnimal) {
              batchId = await contractService.getBatchForAnimal(animalId);
            }
          } catch (batchError) {
            console.log(`No se pudo verificar lote para animal ${animalId}:`, batchError);
          }
          
          animalDetails.push({
            id: animalId,
            raza: animalData.raza || 0,
            estado: animalData.estado || EstadoAnimal.CREADO,
            propietario: animalData.propietario || address,
            peso: animalData.peso || BigInt(0),
            fechaCreacion: animalData.fechaNacimiento ? 
              new Date(Number(animalData.fechaNacimiento) * 1000).toISOString().split('T')[0] : 
              'Desconocida',
            metadataHash: animalData.metadataHash || '0x0',
            batchId: batchId
          });
          
        } catch (animalError: any) {
          console.error(`❌ Error cargando animal ${animalId}:`, animalError);
          // ✅ Continuar con otros animales en lugar de fallar completamente
        }
      }
      
      setAnimals(animalDetails);
      console.log(`✅ ${animalDetails.length} animales cargados exitosamente`);
      
    } catch (error: any) {
      console.error('❌ Error crítico cargando animales:', error);
      setError(`Error al cargar animales: ${error.message}`);
      setAnimals([]); // ✅ Establecer array vacío en caso de error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (contractService && address) {
      loadAnimals();
    }
  }, [contractService, address]);

  // ✅ Función mejorada con timeout
  const handleTransferWithPayment = async (animalId: bigint, frigorifico: string) => {
    if (!contractService || !frigorifico) {
      setError('Servicio de contrato no disponible');
      return;
    }
    
    try {
      setTransferringAnimal(animalId);
      setTransferStep('payment');
      setError('');
      
      // Validar dirección del frigorífico
      if (!frigorifico.startsWith('0x') || frigorifico.length !== 66) {
        throw new Error('Dirección de frigorífico inválida. Debe comenzar con 0x y tener 66 caracteres.');
      }
      
      console.log(`💳 Iniciando transferencia con pago: Animal #${animalId} → ${frigorifico}`);
      
      // ✅ VERIFICAR que la función existe
      if (!contractService.transferToFrigorificoWithPayment) {
        throw new Error('Función de transferencia con pago no disponible');
      }
      
      // ✅ AGREGAR timeout para evitar bloqueos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La transacción está tomando demasiado tiempo')), 30000)
      );
      
      const transferPromise = contractService.transferToFrigorificoWithPayment(animalId, frigorifico);
      
      const result = await Promise.race([transferPromise, timeoutPromise]) as any;
      
      setTransferStep('confirm');
      console.log('✅ Transferencia con pago completada:', result);
      
      // ✅ Esperar confirmación con timeout
      if (contractService.waitForTransaction && result.txHash) {
        await contractService.waitForTransaction(result.txHash);
      }
      
      // Recargar datos
      await loadAnimals();
      
      // Limpiar formulario
      setFrigorificoAddress('');
      setShowTransferForm(false);
      setSelectedAnimal(null);
      setPaymentInfo(null);
      
      alert(`✅ Animal #${animalId} transferido exitosamente!`);
      
    } catch (error: any) {
      console.error('❌ Error en transferencia con pago:', error);
      setError(`Error al transferir animal: ${error.message}`);
    } finally {
      setTransferringAnimal(null);
      setTransferStep('select');
    }
  };

  // ... resto de las funciones auxiliares sin cambios ...
  const getRazaName = (raza: number): string => {
    switch (raza) {
      case 1: return 'Angus';
      case 2: return 'Hereford';
      case 3: return 'Brangus';
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

  const canTransferAnimal = (animal: Animal): { canTransfer: boolean; reason?: string } => {
    if (animal.estado !== EstadoAnimal.CREADO) {
      return { canTransfer: false, reason: 'Solo se pueden transferir animales en estado "Creado"' };
    }
    
    if (animal.batchId && animal.batchId > BigInt(0)) {
      return { canTransfer: false, reason: 'El animal está en un lote' };
    }
    
    if (animal.propietario !== address) {
      return { canTransfer: false, reason: 'No eres el propietario de este animal' };
    }
    
    return { canTransfer: true };
  };

  const transferableAnimals = animals.filter(animal => {
    const transferCheck = canTransferAnimal(animal);
    return transferCheck.canTransfer;
  });

  if (!address) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-700">Conecta tu wallet para transferir animales</p>
      </div>
    );
  }

  // ✅ COMPONENTE SIMPLIFICADO para evitar errores
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          🔄 Transferir Animales Individuales
        </h3>
        <button
          onClick={loadAnimals}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {isLoading ? '🔄' : '🔄'} Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700 font-semibold">Error:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => setError('')}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* ✅ MENSAJE INFORMATIVO - Componente en mantenimiento */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-700 text-sm">
          💡 <strong>Nota:</strong> Esta funcionalidad está en desarrollo. 
          Actualmente se recomienda usar la transferencia por lotes desde la sección de Gestión de Lotes.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Cargando animales...</p>
        </div>
      ) : animals.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🐄</div>
          <p className="text-gray-600">No se pudieron cargar los animales</p>
          <p className="text-sm text-gray-500 mt-2">
            Verifica tu conexión a la red StarkNet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">
              ✅ Se encontraron {animals.length} animales. 
              {transferableAnimals.length > 0 ? 
                ` ${transferableAnimals.length} disponibles para transferir.` : 
                ' Usa la gestión de lotes para transferencias.'
              }
            </p>
          </div>

          {/* Solo mostrar si hay animales transferibles */}
          {transferableAnimals.length > 0 && (
            <>
              <button
                onClick={() => setShowTransferForm(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-all shadow-lg"
              >
                💳 Transferir Animal Individual
              </button>

              <div className="space-y-3">
                {transferableAnimals.slice(0, 5).map((animal) => ( // ✅ Limitar a 5
                  <div key={animal.id.toString()} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h4 className="font-semibold text-lg">Animal #{animal.id.toString()}</h4>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            {getRazaName(animal.raza)}
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-medium">
                            ✅ Transferible
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Peso:</span> {animal.peso?.toString()} kg
                          </div>
                          <div>
                            <span className="font-medium">Creado:</span> {animal.fechaCreacion}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Formulario de transferencia simplificado */}
      {showTransferForm && transferableAnimals.length > 0 && (
        <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-4">Transferir Animal</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🐄 Seleccionar Animal
              </label>
              <select
                value={selectedAnimal?.toString() || ''}
                onChange={(e) => setSelectedAnimal(e.target.value ? BigInt(e.target.value) : null)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">Seleccionar animal</option>
                {transferableAnimals.map((animal) => (
                  <option key={animal.id.toString()} value={animal.id.toString()}>
                    Animal #{animal.id.toString()} - {getRazaName(animal.raza)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏭 Dirección del Frigorífico
              </label>
              <input
                type="text"
                value={frigorificoAddress}
                onChange={(e) => setFrigorificoAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => selectedAnimal && handleTransferWithPayment(selectedAnimal, frigorificoAddress)}
                disabled={!selectedAnimal || !frigorificoAddress || transferringAnimal !== null}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {transferringAnimal ? '⏳ Procesando...' : 'Transferir'}
              </button>
              <button
                onClick={() => setShowTransferForm(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}