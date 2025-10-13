// src/components/frigorifico/components/StatusMessages.tsx
interface StatusMessagesProps {
  error: string;
  chipyError: string | null;
  txHash: string;
  chipyProcessing: boolean;
  onClearError: () => void;
  onClearChipyError: () => void;
  onClearTxHash: () => void;
}

export function StatusMessages({
  error,
  chipyError,
  txHash,
  chipyProcessing,
  onClearError,
  onClearChipyError,
  onClearTxHash
}: StatusMessagesProps) {
  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-semibold">Error:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={onClearError}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}

      {chipyError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-semibold">Error en pago:</p>
          <p className="text-red-600 text-sm mt-1">{chipyError}</p>
          <button
            onClick={onClearChipyError}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}

      {txHash && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-700 font-semibold">
            ✅ Transacción confirmada: {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </p>
          <button
            onClick={onClearTxHash}
            className="mt-2 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}

      {chipyProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-700 font-semibold flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            Procesando pago con Chipy Pay...
          </p>
        </div>
      )}
    </>
  );
}