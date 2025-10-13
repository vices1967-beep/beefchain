// src/components/frigorifico/components/FrigorificoHeader.tsx
interface FrigorificoHeaderProps {
  address: string | null;
}

export function FrigorificoHeader({ address }: FrigorificoHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">🏭 Panel del Frigorífico</h2>
          <p className="text-orange-100">
            Procesamiento de animales y gestión de cortes para exportación
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Conectado como Frigorífico</span>
          </div>
          <p className="text-sm text-orange-200 font-mono">
            {address?.slice(0, 8)}...{address?.slice(-6)}
          </p>
        </div>
      </div>
    </div>
  );
}