// src/components/frigorifico/tabs/RecepcionTab.tsx
import { AnimalEnFrigorifico } from '../types';
import { getRazaNombre, getEstadoNombre, formatFecha } from '../utils/helpers';

interface RecepcionTabProps {
  animalesRecibidos: AnimalEnFrigorifico[];
  isLoading: boolean;
  procesandoAnimal: bigint | null;
  onProcesarAnimal: (animalId: bigint) => void;
  onRecargar: () => void;
}

export function RecepcionTab({
  animalesRecibidos,
  isLoading,
  procesandoAnimal,
  onProcesarAnimal,
  onRecargar
}: RecepcionTabProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando animales recibidos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <span>📥</span>
          Animales Transferidos al Frigorífico ({animalesRecibidos.length})
        </h3>
        <button
          onClick={onRecargar}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <span>🔄</span>
          Actualizar
        </button>
      </div>

      {animalesRecibidos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-500 text-lg mb-2">No hay animales transferidos al frigorífico</p>
          <p className="text-gray-400 text-sm">
            Acepta las transferencias pendientes en la pestaña "Pendientes" para recibir animales
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {animalesRecibidos.map((animal) => (
            <div key={animal.id.toString()} className="border border-green-200 rounded-xl p-4 bg-green-50 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <h4 className="font-semibold text-lg">Animal #{animal.id.toString()}</h4>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium border border-green-200">
                      ✅ Transferido
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium border border-blue-200">
                      {getEstadoNombre(animal.estado)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Raza:</span> {getRazaNombre(animal.raza)}
                    </div>
                    <div>
                      <span className="font-medium">Peso:</span> {animal.peso.toString()} kg
                    </div>
                    <div>
                      <span className="font-medium">Fecha recepción:</span> {formatFecha(animal.fechaRecepcion)}
                    </div>
                    <div>
                      <span className="font-medium">Propietario actual:</span> {animal.propietario.slice(0, 8)}...
                    </div>
                  </div>
                  
                  {animal.frigorifico && (
                    <div className="mt-2 text-xs text-gray-500">
                      <span className="font-medium">Frigorífico asignado:</span> {animal.frigorifico.slice(0, 8)}...
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => onProcesarAnimal(animal.id)}
                  disabled={procesandoAnimal === animal.id}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 transition-colors text-sm font-semibold"
                >
                  {procesandoAnimal === animal.id ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Procesando...
                    </span>
                  ) : (
                    '🔪 Iniciar Procesamiento'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}