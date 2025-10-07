'use client';

import Link from 'next/link';
import { useStarknet } from '@/providers/starknet-provider';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { RoleManagement } from '@/components/admin/RoleManagement';
import { SystemStats } from '@/components/admin/SystemStats';

export default function AdminPage() {
  const { address, isConnected, userRole } = useStarknet();

  // Verificar si el usuario tiene rol de administrador
  const isAdmin = userRole.includes('Administrador') || userRole.includes('DEFAULT_ADMIN_ROLE');

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <header className="mb-8">
          <Link href="/" className="text-blue-500 hover:text-blue-700 text-sm mb-2 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">⚙️ Panel de Administración</h1>
          <p className="text-gray-600 mt-2">
            Gestión completa del sistema de trazabilidad BeefChain
          </p>
        </header>

        {!isConnected ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700">Conecta tu wallet para acceder al panel de administración</p>
          </div>
        ) : !isAdmin ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700">❌ No tienes permisos de administrador</p>
            <p className="text-red-600 text-sm mt-2">
              Tu rol actual: <span className="font-semibold">{userRole}</span>
            </p>
            <p className="text-red-600 text-sm">
              Contacta al administrador del sistema para obtener acceso.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Banner de Administrador */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">🎯 Modo Administrador Activado</h2>
                  <p className="text-blue-100">Tienes acceso completo a todas las funciones del sistema</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">Dirección:</p>
                  <p className="font-mono text-xs bg-black/20 px-2 py-1 rounded">
                    {address?.slice(0, 10)}...{address?.slice(-8)}
                  </p>
                </div>
              </div>
            </div>

            {/* Estadísticas del Sistema */}
            <SystemStats />
            
            {/* Dashboard Principal */}
            <AdminDashboard />
            
            {/* Gestión de Roles */}
            <RoleManagement />
          </div>
        )}
      </div>
    </main>
  );
}