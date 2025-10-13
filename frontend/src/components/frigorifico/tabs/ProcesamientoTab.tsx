// src/components/frigorifico/tabs/ProcesamientoTab.tsx
export function ProcesamientoTab({ contractService, address }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <span>🔪</span>
          Procesamiento de Animales
        </h3>
      </div>

      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
        <div className="text-4xl mb-4">🔪</div>
        <p className="text-gray-500 text-lg mb-2">Procesamiento de Animales</p>
        <p className="text-gray-400 text-sm">
          Aquí podrás procesar los animales aceptados y generar cortes
        </p>
      </div>
    </div>
  );
}