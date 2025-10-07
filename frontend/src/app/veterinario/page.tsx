'use client';

import Link from 'next/link';
import { useStarknet } from '@/providers/starknet-provider';
import { AnimalHealthRecords } from '@/components/veterinario/AnimalHealthRecords';
import { QuarantineManagement } from '@/components/veterinario/QuarantineManagement';
import { AuthorizedAnimals } from '@/components/veterinario/AuthorizedAnimals';

export default function VeterinarioPage() {
  const { address, isConnected, userRole } = useStarknet();

  // Verificar que el usuario tenga rol de veterinario
  const isVeterinarian = userRole.includes('Veterinario') || userRole.includes('VET');

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <header className="mb-8">
          <Link href="/" className="text-blue-500 hover:text-blue-700 text-sm mb-2 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">⚕️ Panel del Veterinario</h1>
          <p className="text-gray-600 mt-2">
            Gestión de registros de salud y cuarentenas para animales autorizados
          </p>
        </header>

        {!isConnected ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700">Conecta tu wallet para acceder al panel veterinario</p>
          </div>
        ) : !isVeterinarian ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700">❌ No tienes permisos de veterinario</p>
            <p className="text-red-600 text-sm mt-2">
              Solo los veterinarios autorizados pueden acceder a este panel
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Animales Autorizados */}
            <AuthorizedAnimals />
            
            {/* Registros de Salud */}
            <AnimalHealthRecords />
            
            {/* Gestión de Cuarentenas */}
            <QuarantineManagement />
          </div>
        )}
      </div>
    </main>
  );
}