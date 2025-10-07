'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';

export function ExportBatchPreparation() {
  const { contractService } = useStarknet();
  const [availableAnimals, setAvailableAnimals] = useState<any[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<bigint[]>([]);
  const [destination, setDestination] = useState('');
  const [containerId, setContainerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [preparationStep, setPreparationStep] = useState<'select' | 'confirm' | 'processing'>('select');

  useEffect(() => {
    loadAvailableAnimals();
  }, [contractService]);

  const loadAvailableAnimals = async () => {
    if (!contractService) return;
    
    try {
      // Simular animales disponibles para exportación
      const animals = [
        { id: BigInt(101), raza: 'Angus', peso: BigInt(450), certificado: true },
        { id: BigInt(102), raza: 'Hereford', peso: BigInt(520), certificado: true },
        { id: BigInt(103), raza: 'Brangus', peso: BigInt(480), certificado: true },
      ];
      setAvailableAnimals(animals);
    } catch (error) {
      console.error('Error cargando animales disponibles:', error);
    }
  };

  const prepareExportBatch = async () => {
    if (!contractService || selectedAnimals.length === 0 || !destination || !containerId) return;
    
    try {
      setLoading(true);
      setPreparationStep('processing');

      const result = await contractService.prepareExportBatch(
        selectedAnimals,
        destination,
        containerId
      );

      alert(`✅ Lote de exportación preparado exitosamente!\n\n📦 Lote ID: ${result.batchId}\n📝 Hash: ${result.txHash}`);
      
      // Limpiar formulario
      setSelectedAnimals([]);
      setDestination('');
      setContainerId('');
      setPreparationStep('select');
      
      // Recargar animales disponibles
      await loadAvailableAnimals();
      
    } catch (error: any) {
      alert(`❌ Error preparando lote de exportación: ${error.message}`);
      setPreparationStep('select');
    } finally {
      setLoading(false);
    }
  };

  const toggleAnimalSelection = (animalId: bigint) => {
    setSelectedAnimals(prev => 
      prev.includes(animalId) 
        ? prev.filter(id => id !== animalId)
        : [...prev, animalId]
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        🚀 Preparar Lote de Exportación
      </h3>

      {preparationStep === 'select' && (
        <div className="space-y-4">
          {/* Selección de Animales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Animales Disponibles para Exportación
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {availableAnimals.map((animal) => (
                <div key={animal.id.toString()} className="flex items-center justify-between p-2 border border-gray-100 rounded">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedAnimals.includes(animal.id)}
                      onChange={() => toggleAnimalSelection(animal.id)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div>
                      <span className="font-medium">Animal #{animal.id.toString()}</span>
                      <span className="text-sm text-gray-600 ml-2">({animal.raza})</span>
                      <p className="text-sm text-gray-500">Peso: {animal.peso.toString()} kg</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    animal.certificado ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {animal.certificado ? '✅ Certificado' : '⏳ Pendiente'}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {selectedAnimals.length} animales seleccionados de {availableAnimals.length} disponibles
            </p>
          </div>

          {/* Información de Exportación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                País de Destino
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">Seleccionar destino</option>
                <option value="Estados Unidos">Estados Unidos</option>
                <option value="Unión Europea">Unión Europea</option>
                <option value="China">China</option>
                <option value="Japón">Japón</option>
                <option value="Corea del Sur">Corea del Sur</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID del Contenedor
              </label>
              <input
                type="text"
                value={containerId}
                onChange={(e) => setContainerId(e.target.value)}
                placeholder="CTN-2024-US-001"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Resumen */}
          {selectedAnimals.length > 0 && destination && containerId && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Resumen del Lote</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• <strong>Animales:</strong> {selectedAnimals.length} seleccionados</p>
                <p>• <strong>Destino:</strong> {destination}</p>
                <p>• <strong>Contenedor:</strong> {containerId}</p>
                <p>• <strong>Requisitos:</strong> Certificación y documentación completa</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setPreparationStep('confirm')}
            disabled={selectedAnimals.length === 0 || !destination || !containerId}
            className="w-full bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600 disabled:bg-gray-400"
          >
            📦 Preparar Lote de Exportación
          </button>
        </div>
      )}

      {preparationStep === 'confirm' && (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">Confirmar Preparación</h4>
            <p className="text-yellow-700 text-sm">
              ¿Estás seguro de preparar este lote de exportación? Esta acción registrará 
              permanentemente en blockchain la preparación del lote.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setPreparationStep('select')}
              className="bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600"
            >
              ↩️ Volver
            </button>
            <button
              onClick={prepareExportBatch}
              disabled={loading}
              className="bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? 'Procesando...' : '✅ Confirmar'}
            </button>
          </div>
        </div>
      )}

      {preparationStep === 'processing' && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h4 className="font-semibold text-purple-700 mb-2">Preparando Lote</h4>
          <p className="text-purple-600 text-sm">
            Registrando lote de exportación en blockchain...
          </p>
        </div>
      )}
    </div>
  );
}