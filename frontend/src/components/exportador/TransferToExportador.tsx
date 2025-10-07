'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';

export function TransferToExportador() {
  const { address, contractService } = useStarknet();
  const [availableCortes, setAvailableCortes] = useState<any[]>([]);
  const [selectedCortes, setSelectedCortes] = useState<bigint[]>([]);
  const [exportadorAddress, setExportadorAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferStep, setTransferStep] = useState<'select' | 'payment' | 'confirm'>('select');

  useEffect(() => {
    loadAvailableCortes();
  }, [contractService, address]);

  const loadAvailableCortes = async () => {
    if (!contractService || !address) return;
    
    try {
      // Simular cortes disponibles del frigorífico
      const cortes = [
        { id: BigInt(201), animalId: BigInt(101), tipo: 'LOMO', peso: BigInt(25) },
        { id: BigInt(202), animalId: BigInt(102), tipo: 'BIFE_ANCHO', peso: BigInt(30) },
      ];
      setAvailableCortes(cortes);
    } catch (error) {
      console.error('Error cargando cortes:', error);
    }
  };

  const handleTransferWithPayment = async () => {
    if (!contractService || selectedCortes.length === 0 || !exportadorAddress) return;
    
    try {
      setLoading(true);
      setTransferStep('payment');

      // Simular procesamiento de pago
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTransferStep('confirm');

      // Ejecutar transferencia batch con pago
      // NOTA: Necesitaríamos implementar esta función en el servicio
      const result = await contractService.transferCortesToExportadorWithPayment(
        selectedCortes[0], // animalId del primer corte seleccionado
        selectedCortes,
        exportadorAddress
      );

      alert(`✅ ${selectedCortes.length} cortes transferidos al exportador con pago exitoso`);
      
      // Limpiar selección
      setSelectedCortes([]);
      setExportadorAddress('');
      setTransferStep('select');
      
    } catch (error: any) {
      alert(`❌ Error en transferencia: ${error.message}`);
      setTransferStep('select');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        🚀 Transferir Cortes a Exportador con Pago
      </h3>

      {transferStep === 'select' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cortes Disponibles
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableCortes.map((corte) => (
                <div key={corte.id.toString()} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                  <div>
                    <span className="font-medium">Corte #{corte.id.toString()}</span>
                    <span className="text-sm text-gray-600 ml-2">({corte.tipo})</span>
                    <p className="text-sm text-gray-500">Peso: {corte.peso.toString()} kg</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedCortes.includes(corte.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCortes(prev => [...prev, corte.id]);
                      } else {
                        setSelectedCortes(prev => prev.filter(id => id !== corte.id));
                      }
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección del Exportador
            </label>
            <input
              type="text"
              value={exportadorAddress}
              onChange={(e) => setExportadorAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>

          {selectedCortes.length > 0 && exportadorAddress && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Resumen de Transferencia</h4>
              <p className="text-sm text-blue-700">
                • {selectedCortes.length} cortes seleccionados
              </p>
              <p className="text-sm text-blue-700">
                • Pago automático con ChiPy Pay (2% comisión)
              </p>
            </div>
          )}

          <button
            onClick={handleTransferWithPayment}
            disabled={selectedCortes.length === 0 || !exportadorAddress || loading}
            className="w-full bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600 disabled:bg-gray-400"
          >
            💳 Iniciar Transferencia con Pago
          </button>
        </div>
      )}

      {transferStep === 'payment' && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h4 className="font-semibold text-purple-700">Procesando Pago ChiPy Pay</h4>
          <p className="text-purple-600 text-sm mt-2">
            Transferencia de {selectedCortes.length} cortes en proceso...
          </p>
        </div>
      )}

      {transferStep === 'confirm' && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⏳</div>
          <h4 className="font-semibold text-green-700">Confirmando en Blockchain</h4>
          <p className="text-green-600 text-sm mt-2">
            Transacción en proceso...
          </p>
        </div>
      )}
    </div>
  );
}