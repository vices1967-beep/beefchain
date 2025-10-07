'use client';

import Link from 'next/link';
import { useStarknet } from '@/providers/starknet-provider';
import { ExportBatchPreparation } from '@/components/exportador/ExportBatchPreparation';
import { ExportBatchList } from '@/components/exportador/ExportBatchList';
import { TransferToExportador } from '@/components/exportador/TransferToExportador';

export default function ExportadorPage() {
  const { address, isConnected, userRole } = useStarknet();

  const isExporter = userRole.includes('Exportador') || userRole.includes('EXPORTER');

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <header className="mb-8">
          <Link href="/" className="text-blue-500 hover:text-blue-700 text-sm mb-2 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">🌍 Panel del Exportador</h1>
          <p className="text-gray-600 mt-2">
            Gestión de lotes de exportación y pagos internacionales
          </p>
        </header>

        {!isConnected ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700">Conecta tu wallet para acceder al panel de exportación</p>
          </div>
        ) : !isExporter ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700">❌ No tienes permisos de exportador</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Transferencias desde Frigorífico */}
            <TransferToExportador />
            
            {/* Preparación de Lotes de Exportación */}
            <ExportBatchPreparation />
            
            {/* Lista de Lotes de Exportación */}
            <ExportBatchList />
          </div>
        )}
      </div>
    </main>
  );
}