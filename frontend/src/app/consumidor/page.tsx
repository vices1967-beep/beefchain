// src/app/consumidor/page.tsx
'use client';

import Link from 'next/link';
import { useStarknet } from '@/providers/starknet-provider';

export default function ConsumidorPage() {
  const { address, isConnected } = useStarknet();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-8">
          <Link href="/" className="text-blue-500 hover:text-blue-700 text-sm mb-2 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">👨‍👩‍👧‍👦 Panel del Consumidor</h1>
          <p className="text-gray-600 mt-2">Consulta trazabilidad y escanea QR</p>
        </header>

        {isConnected ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Funcionalidades del Consumidor
            </h3>
            <div className="space-y-4">
              <p className="text-gray-600">Próximamente: Consulta de trazabilidad y escaneo de QR</p>
              <p className="text-sm text-gray-500">Wallet conectada: {address?.slice(0, 8)}...{address?.slice(-6)}</p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700">Conecta tu wallet para acceder al panel del consumidor</p>
          </div>
        )}
      </div>
    </main>
  );
}