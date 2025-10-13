// src/components/frigorifico/tabs/ExportacionTab.tsx
import { Corte } from '../types';
import { getTipoCorteNombre } from '../utils/helpers';

interface ExportacionTabProps {
  cortesCreados: Corte[];
  cortesSeleccionados: bigint[];
  exportadorAddress: string;
  onExportadorAddressChange: (address: string) => void;
  onToggleCorteSeleccionado: (corteId: bigint) => void;
  onTransferirCortes: () => void;
}

export function ExportacionTab({
  cortesCreados,
  cortesSeleccionados,
  exportadorAddress,
  onExportadorAddressChange,
  onToggleCorteSeleccionado,
  onTransferirCortes
}: ExportacionTabProps) {
  const cortesSeleccionadosData = cortesCreados.filter(corte => 
    cortesSeleccionados.includes(corte.id)
  );

  const pesoTotal = cortesSeleccionadosData.reduce((total, corte) => 
    total + Number(corte.peso), 0
  );

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
        <span>🌍</span>
        Exportación de Cortes
      </h3>

      {/* Selección de cortes */}
      <div className="mb-8">
        <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>📦</span>
          Seleccionar Cortes para Exportar ({cortesSeleccionados.length} seleccionados)
        </h4>
        
        {cortesCreados.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
            <div className="text-4xl mb-4">🥩</div>
            <p className="text-gray-500">No hay cortes disponibles para exportar</p>
          </div>
        ) : (
          <div className="grid gap-3 max-h-96 overflow-y-auto p-2">
            {cortesCreados.map((corte) => (
              <div
                key={corte.id.toString()}
                className={`border rounded-xl p-4 cursor-pointer transition-all ${
                  cortesSeleccionados.includes(corte.id)
                    ? 'border-orange-500 bg-orange-50 shadow-md'
                    : 'border-gray-200 bg-white hover:shadow-md'
                }`}
                onClick={() => onToggleCorteSeleccionado(corte.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h5 className="font-semibold">Corte #{corte.id.toString()}</h5>
                    <p className="text-sm text-gray-600">
                      {getTipoCorteNombre(corte.tipoCorte)} - {corte.peso.toString()} kg
                    </p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    cortesSeleccionados.includes(corte.id)
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'border-gray-300'
                  }`}>
                    {cortesSeleccionados.includes(corte.id) && '✓'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen y exportación */}
      {cortesSeleccionados.length > 0 && (
        <div className="border border-orange-200 rounded-xl p-6 bg-orange-50">
          <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🚚</span>
            Resumen de Exportación
          </h4>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Cortes seleccionados:</p>
              <p className="font-semibold text-lg">{cortesSeleccionados.length} cortes</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Peso total:</p>
              <p className="font-semibold text-lg">{pesoTotal} kg</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección del Exportador
            </label>
            <input
              type="text"
              value={exportadorAddress}
              onChange={(e) => onExportadorAddressChange(e.target.value)}
              placeholder="0x..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            onClick={onTransferirCortes}
            disabled={!exportadorAddress}
            className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 transition-colors font-semibold text-lg"
          >
            🌍 Transferir {cortesSeleccionados.length} Cortes al Exportador
          </button>
        </div>
      )}
    </div>
  );
}