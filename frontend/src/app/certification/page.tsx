'use client';

import Link from 'next/link';
import { useStarknet } from '@/providers/starknet-provider';

export default function CertificationPage() {
  const { isConnected } = useStarknet();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-8">
          <Link href="/" className="text-blue-500 hover:text-blue-700 text-sm mb-2 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">🏅 Módulo de Certificación</h1>
          <p className="text-gray-600 mt-2">Certificación de animales y cortes con estándares de calidad</p>
        </header>

        {isConnected ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🚧</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Módulo en Desarrollo
            </h3>
            <p className="text-gray-600">
              El módulo de certificación estará disponible pronto.
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700">Conecta tu wallet para acceder al módulo de certificación</p>
          </div>
        )}
      </div>
    </main>
  );
}