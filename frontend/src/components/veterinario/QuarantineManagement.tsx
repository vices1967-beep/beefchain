'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';

export function QuarantineManagement() {
  const { contractService } = useStarknet();
  const [authorizedAnimals, setAuthorizedAnimals] = useState<any[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<bigint | null>(null);
  const [quarantineReason, setQuarantineReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [quarantineStatus, setQuarantineStatus] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    loadAuthorizedAnimals();
  }, [contractService]);

  const loadAuthorizedAnimals = async () => {
    if (!contractService) return;
    
    try {
      // Simular animales autorizados
      const animals = [
        { id: BigInt(101), owner: '0x123...', raza: 'Angus', peso: BigInt(450) },
        { id: BigInt(102), owner: '0x456...', raza: 'Hereford', peso: BigInt(520) },
      ];
      setAuthorizedAnimals(animals);

      // Verificar estado de cuarentena para cada animal
      const status: {[key: string]: boolean} = {};
      for (const animal of animals) {
        try {
          const isQuarantined = await contractService.isQuarantined(animal.id);
          status[animal.id.toString()] = isQuarantined;
        } catch (error) {
          console.error(`Error verificando cuarentena animal ${animal.id}:`, error);
          status[animal.id.toString()] = false;
        }
      }
      setQuarantineStatus(status);
    } catch (error) {
      console.error('Error cargando animales autorizados:', error);
    }
  };

  const handleQuarantineAnimal = async () => {
    if (!contractService || !selectedAnimal || !quarantineReason) return;
    
    try {
      setLoading(true);
      await contractService.quarantineAnimal(selectedAnimal, quarantineReason);
      
      alert('✅ Animal puesto en cuarentena exitosamente');
      setQuarantineReason('');
      
      // Actualizar estado
      setQuarantineStatus(prev => ({
        ...prev,
        [selectedAnimal.toString()]: true
      }));
      
    } catch (error: any) {
      alert(`❌ Error poniendo en cuarentena: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearQuarantine = async (animalId: bigint) => {
    if (!contractService) return;
    
    try {
      setLoading(true);
      await contractService.clearQuarantine(animalId);
      
      alert('✅ Cuarentena liberada exitosamente');
      
      // Actualizar estado
      setQuarantineStatus(prev => ({
        ...prev,
        [animalId.toString()]: false
      }));
      
    } catch (error: any) {
      alert(`❌ Error liberando cuarentena: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        🚨 Gestión de Cuarentenas
      </h3>

      <div className="space-y-6">
        {/* Poner en Cuarentena */}
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h4 className="font-semibold text-orange-800 mb-3">Poner Animal en Cuarentena</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Animal
              </label>
              <select
                value={selectedAnimal?.toString() || ''}
                onChange={(e) => setSelectedAnimal(e.target.value ? BigInt(e.target.value) : null)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">Seleccionar animal autorizado</option>
                {authorizedAnimals.map((animal) => (
                  <option key={animal.id.toString()} value={animal.id.toString()}>
                    Animal #{animal.id.toString()} - {animal.raza}
                  </option>
                ))}
              </select>
            </div>

            {selectedAnimal && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo de Cuarentena
                  </label>
                  <textarea
                    value={quarantineReason}
                    onChange={(e) => setQuarantineReason(e.target.value)}
                    placeholder="Describa el motivo de la cuarentena (enfermedad, tratamiento, etc.)"
                    className="w-full p-3 border border-gray-300 rounded-lg h-20"
                  />
                </div>

                <button
                  onClick={handleQuarantineAnimal}
                  disabled={loading || !quarantineReason}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 disabled:bg-gray-400"
                >
                  {loading ? 'Procesando...' : '🚨 Poner en Cuarentena'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Lista de Animales en Cuarentena */}
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-3">Animales en Cuarentena</h4>
          
          {authorizedAnimals.filter(animal => quarantineStatus[animal.id.toString()]).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay animales en cuarentena</p>
          ) : (
            <div className="space-y-3">
              {authorizedAnimals
                .filter(animal => quarantineStatus[animal.id.toString()])
                .map((animal) => (
                  <div key={animal.id.toString()} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded">
                    <div>
                      <h5 className="font-semibold text-red-700">Animal #{animal.id.toString()}</h5>
                      <p className="text-sm text-gray-600">{animal.raza} - {animal.peso.toString()}kg</p>
                    </div>
                    <button
                      onClick={() => handleClearQuarantine(animal.id)}
                      disabled={loading}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
                    >
                      Liberar
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Información */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">💡 Información sobre Cuarentenas</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Solo veterinarios autorizados pueden gestionar cuarentenas</li>
            <li>• Los animales en cuarentena no pueden ser transferidos</li>
            <li>• Las cuarentenas se registran permanentemente en blockchain</li>
            <li>• Es necesario documentar el motivo de cada cuarentena</li>
          </ul>
        </div>
      </div>
    </div>
  );
}