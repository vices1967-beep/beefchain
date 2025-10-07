'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';

interface ExportBatch {
  id: bigint;
  destination: string;
  status: string;
  exportDate: bigint;
  containerId: string;
  animalCount: number;
}

export function ExportBatchList() {
  const { address, contractService } = useStarknet();
  const [exportBatches, setExportBatches] = useState<ExportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<bigint | null>(null);
  const [exportDetails, setExportDetails] = useState<any>(null);

  useEffect(() => {
    loadExportBatches();
  }, [contractService, address]);

  const loadExportBatches = async () => {
    if (!contractService || !address) return;
    
    try {
      setLoading(true);
      // Simular datos de lotes de exportación
      const batches: ExportBatch[] = [
        {
          id: BigInt(1001),
          destination: 'Estados Unidos',
          status: 'PREPARADO',
          exportDate: BigInt(Date.now() / 1000),
          containerId: 'CTN-2024-US-001',
          animalCount: 50
        },
        {
          id: BigInt(1002),
          destination: 'Unión Europea',
          status: 'EN_TRANSITO',
          exportDate: BigInt((Date.now() / 1000) - 86400),
          containerId: 'CTN-2024-EU-001',
          animalCount: 75
        }
      ];
      setExportBatches(batches);
    } catch (error) {
      console.error('Error cargando lotes de exportación:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExportDetails = async (batchId: bigint) => {
    if (!contractService) return;
    
    try {
      const details = await contractService.getExportData(batchId);
      setExportDetails(details);
      setSelectedBatch(batchId);
    } catch (error) {
      console.error('Error cargando detalles de exportación:', error);
    }
  };

  const confirmExport = async (batchId: bigint, exportPermit: string) => {
    if (!contractService) return;
    
    try {
      await contractService.confirmExport(batchId, exportPermit);
      alert('✅ Exportación confirmada exitosamente');
      await loadExportBatches();
    } catch (error: any) {
      alert(`❌ Error confirmando exportación: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PREPARADO': return 'bg-yellow-100 text-yellow-800';
      case 'EN_TRANSITO': return 'bg-blue-100 text-blue-800';
      case 'ENTREGADO': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString('es-ES');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          📦 Lotes de Exportación
        </h3>
        <button
          onClick={loadExportBatches}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          🔄 Actualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Cargando lotes...</p>
        </div>
      ) : exportBatches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No hay lotes de exportación</p>
          <p className="text-sm text-gray-500 mt-2">
            Los lotes de exportación aparecerán aquí una vez preparados
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {exportBatches.map((batch) => (
            <div key={batch.id.toString()} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-lg">Lote #{batch.id.toString()}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                      {batch.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Destino:</span>
                      <div>{batch.destination}</div>
                    </div>
                    <div>
                      <span className="font-medium">Contenedor:</span>
                      <div>{batch.containerId}</div>
                    </div>
                    <div>
                      <span className="font-medium">Animales:</span>
                      <div>{batch.animalCount}</div>
                    </div>
                    <div>
                      <span className="font-medium">Fecha:</span>
                      <div>{formatDate(batch.exportDate)}</div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => loadExportDetails(batch.id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  Ver Detalles
                </button>
              </div>

              {selectedBatch === batch.id && exportDetails && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-semibold text-blue-800 mb-3">Detalles de Exportación</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Permiso:</span>
                      <div className="font-mono text-xs">{exportDetails.export_permit}</div>
                    </div>
                    <div>
                      <span className="font-medium">Temperatura:</span>
                      <div>{exportDetails.temperature_range?.min}°C - {exportDetails.temperature_range?.max}°C</div>
                    </div>
                  </div>
                  
                  {batch.status === 'PREPARADO' && (
                    <div className="mt-3">
                      <button
                        onClick={() => confirmExport(batch.id, exportDetails.export_permit)}
                        className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
                      >
                        ✅ Confirmar Exportación
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}