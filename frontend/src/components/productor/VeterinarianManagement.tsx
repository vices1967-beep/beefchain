'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';

export function VeterinarianManagement() {
  const { address, contractService } = useStarknet();
  const [veterinarianAddress, setVeterinarianAddress] = useState('');
  const [animalId, setAnimalId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authorizedVets, setAuthorizedVets] = useState<{vet: string, animalId: bigint}[]>([]);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  const loadAuthorizedVeterinarians = async () => {
    // Esta función necesitaría ser implementada en el contrato
    // Por ahora es un placeholder
    setAuthorizedVets([]);
  };

  useEffect(() => {
    if (contractService && address) {
      loadAuthorizedVeterinarians();
    }
  }, [contractService, address]);

  const handleAuthorizeVeterinarian = async () => {
    if (!contractService || !veterinarianAddress || !animalId) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      console.log(`👨‍⚕️ Autorizando veterinario ${veterinarianAddress} para animal ${animalId}`);
      
      const txHash = await contractService.authorizeVeterinarianForAnimal(
        veterinarianAddress,
        BigInt(animalId)
      );
      
      setTxHash(txHash);
      
      // Esperar confirmación
      await contractService.waitForTransaction(txHash);
      
      // Recargar lista
      await loadAuthorizedVeterinarians();
      
      // Limpiar formulario
      setVeterinarianAddress('');
      setAnimalId('');
      
      alert('✅ Veterinario autorizado exitosamente!');
      
    } catch (error: any) {
      console.error('❌ Error autorizando veterinario:', error);
      setError(`Error autorizando veterinario: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeAuthorization = async (vetAddress: string, animalId: bigint) => {
    if (!contractService) return;
    
    if (!confirm(`¿Estás seguro de revocar la autorización del veterinario ${vetAddress} para el animal #${animalId}?`)) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      const txHash = await contractService.revokeVeterinarianAuthorization(
        vetAddress,
        animalId
      );
      
      setTxHash(txHash);
      
      // Esperar confirmación
      await contractService.waitForTransaction(txHash);
      
      // Recargar lista
      await loadAuthorizedVeterinarians();
      
      alert('✅ Autorización revocada exitosamente!');
      
    } catch (error: any) {
      console.error('❌ Error revocando autorización:', error);
      setError(`Error revocando autorización: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6">⚕️ Gestión de Veterinarios</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {txHash && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-green-700">
            ✅ Transacción confirmada: {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Autorizar Veterinario */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700">Autorizar Veterinario</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección del Veterinario
            </label>
            <input
              type="text"
              value={veterinarianAddress}
              onChange={(e) => setVeterinarianAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID del Animal
            </label>
            <input
              type="number"
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              placeholder="Ej: 101"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          <button
            onClick={handleAuthorizeVeterinarian}
            disabled={isLoading || !veterinarianAddress || !animalId}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-green-300 transition-colors"
          >
            {isLoading ? '⏳ Autorizando...' : '✅ Autorizar Veterinario'}
          </button>
        </div>

        {/* Información */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700">Información</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• Los veterinarios autorizados pueden agregar registros de salud</li>
              <li>• Pueden poner animales en cuarentena si es necesario</li>
              <li>• Pueden liberar animales de cuarentena</li>
              <li>• Solo pueden actuar sobre animales específicamente autorizados</li>
              <li>• Puedes revocar autorizaciones en cualquier momento</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Lista de Veterinarios Autorizados */}
      <div className="mt-8">
        <h4 className="font-semibold text-gray-700 mb-4">Veterinarios Autorizados</h4>
        
        {authorizedVets.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">No hay veterinarios autorizados</p>
            <p className="text-gray-400 text-sm mt-1">Autoriza veterinarios usando el formulario arriba</p>
          </div>
        ) : (
          <div className="space-y-3">
            {authorizedVets.map((auth, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-mono text-sm">{auth.vet}</p>
                    <p className="text-sm text-gray-600">Animal #{auth.animalId.toString()}</p>
                  </div>
                  <button
                    onClick={() => handleRevokeAuthorization(auth.vet, auth.animalId)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-red-300 transition-colors text-sm"
                  >
                    Revocar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}