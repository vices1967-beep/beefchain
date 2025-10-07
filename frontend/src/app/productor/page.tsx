// src/app/productor/page.tsx - COMPLETO Y CORREGIDO
'use client';

import { CreateAnimalForm } from '@/components/productor/CreateAnimalForm';
import { AnimalList } from '@/components/productor/AnimalList';
import { TransferAnimalForm } from '@/components/productor/TransferAnimalForm';
import { BatchManagement } from '@/components/productor/BatchManagement';
import { VeterinarianManagement } from '@/components/productor/VeterinarianManagement';
import { ProducerStats } from '@/components/productor/ProducerStats';
import Link from 'next/link';
import { useStarknet } from '@/providers/starknet-provider';
import { useState } from 'react';

export default function ProductorPage() {
  const { address, isConnected, userRole } = useStarknet();
  const [activeTab, setActiveTab] = useState('animals');

  const hasProducerAccess = () => {
    const isProducer = userRole.includes('Productor') || userRole.includes('PRODUCER') || userRole.includes('PRODUCER_ROLE');
    const isAdmin = userRole.includes('Administrador') || userRole.includes('DEFAULT_ADMIN_ROLE');
    return isProducer || isAdmin;
  };

  const canAccess = hasProducerAccess();

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 🌟 HEADER VERDE MEJORADO */}
        <section className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-600 to-emerald-600 shadow-2xl transform hover:shadow-3xl transition-all duration-700">
            {/* Elementos de fondo animados */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/20 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/10 rounded-full"></div>
            </div>
            
            <div className="relative z-10 p-8 lg:p-12">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
                {/* Contenido del Hero */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 mb-6">
                    <div className="text-6xl lg:text-7xl">👨‍🌾</div>
                    <div>
                      <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 font-display tracking-tight">
                        Panel del Productor
                      </h1>
                      <p className="text-xl lg:text-2xl text-white/90 font-light">
                        Gestión completa de animales, lotes y veterinarios en la blockchain
                      </p>
                    </div>
                  </div>
                  
                  {/* Estado de conexión */}
                  <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                    <div className={`flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/30 ${
                      isConnected && canAccess ? 'bg-green-500/30' : 'bg-yellow-500/30'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        isConnected && canAccess ? 'bg-green-300' : 'bg-yellow-300'
                      } animate-pulse`}></div>
                      <span className="text-sm text-white font-medium">
                        {isConnected 
                          ? (canAccess ? '✅ Acceso Permitido' : '⚠️ Sin Permisos') 
                          : '🔌 Conecta Wallet'
                        }
                      </span>
                    </div>
                    
                    {isConnected && address && (
                      <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/30">
                        <span className="text-sm text-white font-mono">
                          {address.slice(0, 8)}...{address.slice(-6)}
                        </span>
                      </div>
                    )}
                    
                    {isConnected && userRole && (
                      <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/30">
                        <span className="text-sm text-white font-medium">
                          Rol: {userRole}
                          {userRole.includes('Administrador') && (
                            <span className="ml-1 bg-yellow-400 text-green-900 px-2 py-1 rounded-full text-xs">ADMIN</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Navegación rápida */}
                <div className="flex-shrink-0">
                  <Link 
                    href="/"
                    className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl backdrop-blur-sm border border-white/30 transition-all duration-300"
                  >
                    <span>🏠</span>
                    Volver al Inicio
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contenido principal */}
        {!isConnected ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center shadow-lg">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 font-display">
              Acceso Restringido
            </h3>
            <p className="text-gray-600 mb-6 text-lg">
              Conecta tu wallet de StarkNet para acceder al panel del productor
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-semibold text-lg shadow-lg"
            >
              <span>🔗</span>
              Ir a Conectar Wallet
            </Link>
          </div>
        ) : !canAccess ? (
          <div className="bg-white border border-red-200 rounded-3xl p-8 text-center shadow-lg">
            <div className="text-6xl mb-4">🚫</div>
            <h3 className="text-2xl font-bold text-red-800 mb-4 font-display">
              Permisos Insuficientes
            </h3>
            <p className="text-red-600 mb-4 text-lg">
              No tienes el rol de Productor necesario para este panel
            </p>
            <p className="text-red-500 text-sm mb-6">
              Rol actual: <span className="font-bold bg-red-100 px-3 py-1 rounded-full">{userRole}</span>
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left max-w-md mx-auto">
              <h4 className="font-semibold text-red-800 mb-2">¿Eres Administrador?</h4>
              <p className="text-red-600 text-sm">
                Los administradores pueden acceder a todos los paneles. Si necesitas el rol de Productor, contacta al administrador del sistema.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Banner Admin */}
            {(userRole.includes('Administrador') || userRole.includes('DEFAULT_ADMIN_ROLE')) && (
              <div className="bg-gradient-to-r from-yellow-400 to-amber-500 border border-yellow-300 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">⚡</span>
                  <div>
                    <h4 className="font-bold text-xl mb-1">Modo Administrador Activado</h4>
                    <p className="text-yellow-100 text-sm">
                      Tienes acceso completo con privilegios de administrador a todos los módulos del productor
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navegación por pestañas */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
              <nav className="flex flex-wrap gap-2">
                {[
                  { id: 'animals', label: '🐄 Animales', icon: '🐄' },
                  { id: 'batches', label: '📦 Lotes', icon: '📦' },
                  { id: 'veterinarians', label: '⚕️ Veterinarios', icon: '⚕️' },
                  { id: 'stats', label: '📊 Estadísticas', icon: '📊' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Contenido de las pestañas en COLUMNAS */}
            <div className="space-y-8">
              {/* Pestaña de Animales - EN 2 COLUMNAS */}
              {activeTab === 'animals' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="space-y-8">
                    <CreateAnimalForm />
                  </div>
                  <div className="space-y-8">
                    <AnimalList />
                  </div>
                </div>
              )}

              {/* Otras pestañas mantienen su estructura actual */}
              {activeTab === 'batches' && (
                <div className="space-y-8">
                  <BatchManagement />
                  <TransferAnimalForm />
                </div>
              )}

              {activeTab === 'veterinarians' && (
                <VeterinarianManagement />
              )}

              {activeTab === 'stats' && (
                <ProducerStats />
              )}
            </div>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-12 bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold text-green-800 mb-4 font-display flex items-center gap-3">
            <span className="text-3xl">💡</span>
            Información para Productores
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-green-700">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">✅</span>
                <span>Cada animal se registra como NFT en StarkNet</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">🔒</span>
                <span>Datos inmutables y transparentes en blockchain</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">📦</span>
                <span>Crea lotes para agrupar animales similares</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">💳</span>
                <span>Transferencias con pagos automáticos ChiPy Pay</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">⚕️</span>
                <span>Autoriza veterinarios para gestión de salud</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">📊</span>
                <span>Estadísticas en tiempo real de tu producción</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}