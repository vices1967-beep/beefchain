'use client';

import { useState } from 'react';
import { useStarknet } from '@/providers/starknet-provider';

export function AnimalHealthRecords() {
  const { contractService } = useStarknet();
  const [selectedAnimal, setSelectedAnimal] = useState<bigint | null>(null);
  const [healthRecord, setHealthRecord] = useState({
    diagnosis: '',
    treatment: '',
    vaccination: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleAddHealthRecord = async () => {
    if (!contractService || !selectedAnimal) return;
    
    try {
      setLoading(true);
      await contractService.addHealthRecord(
        selectedAnimal,
        healthRecord.diagnosis,
        healthRecord.treatment,
        healthRecord.vaccination
      );
      
      alert('✅ Registro de salud agregado exitosamente');
      setHealthRecord({ diagnosis: '', treatment: '', vaccination: '', notes: '' });
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        📝 Agregar Registro de Salud
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Animal
          </label>
          <select
            value={selectedAnimal?.toString() || ''}
            onChange={(e) => setSelectedAnimal(e.target.value ? BigInt(e.target.value) : null)}
            className="w-full p-3 border border-gray-300 rounded-lg"
          >
            <option value="">Seleccionar animal autorizado</option>
            <option value="101">Animal #101 - Angus</option>
            <option value="102">Animal #102 - Hereford</option>
          </select>
        </div>

        {selectedAnimal && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnóstico
              </label>
              <textarea
                value={healthRecord.diagnosis}
                onChange={(e) => setHealthRecord(prev => ({ ...prev, diagnosis: e.target.value }))}
                placeholder="Descripción del diagnóstico..."
                className="w-full p-3 border border-gray-300 rounded-lg h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tratamiento
              </label>
              <textarea
                value={healthRecord.treatment}
                onChange={(e) => setHealthRecord(prev => ({ ...prev, treatment: e.target.value }))}
                placeholder="Tratamiento aplicado..."
                className="w-full p-3 border border-gray-300 rounded-lg h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vacunación
              </label>
              <input
                type="text"
                value={healthRecord.vaccination}
                onChange={(e) => setHealthRecord(prev => ({ ...prev, vaccination: e.target.value }))}
                placeholder="Tipo de vacuna aplicada..."
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>

            <button
              onClick={handleAddHealthRecord}
              disabled={loading || !healthRecord.diagnosis}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? 'Agregando registro...' : '➕ Agregar Registro de Salud'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}