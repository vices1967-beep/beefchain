'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';

export function AuthorizedAnimals() {
  const { address, contractService } = useStarknet();
  const [authorizedAnimals, setAuthorizedAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuthorizedAnimals();
  }, [contractService, address]);

  const loadAuthorizedAnimals = async () => {
    if (!contractService || !address) return;
    
    try {
      setLoading(true);
      // Esta función necesitaría ser implementada en el contrato
      // Por ahora simulamos datos
      const animals = [
        { id: BigInt(101), owner: '0x123...', raza: 'Angus', peso: BigInt(450) },
        { id: BigInt(102), owner: '0x456...', raza: 'Hereford', peso: BigInt(520) },
      ];
      setAuthorizedAnimals(animals);
    } catch (error) {
      console.error('Error cargando animales autorizados:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        🐄 Animales Autorizados
      </h3>
      
      {loading ? (
        <div className="text-center py-4">Cargando animales...</div>
      ) : authorizedAnimals.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No tienes animales autorizados
        </div>
      ) : (
        <div className="space-y-3">
          {authorizedAnimals.map((animal) => (
            <div key={animal.id.toString()} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold">Animal #{animal.id.toString()}</h4>
                  <p className="text-sm text-gray-600">Raza: {animal.raza}</p>
                  <p className="text-sm text-gray-600">Peso: {animal.peso.toString()} kg</p>
                </div>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  Autorizado
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}