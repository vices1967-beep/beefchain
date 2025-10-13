// src/app/frigorifico/page.tsx - ACTUALIZADA CON FORMATO COHERENTE
'use client';

import { FrigorificoDashboard} from '@/components/frigorifico/FrigorificoPanel';
import Link from 'next/link';
import { useStarknet } from '@/providers/starknet-provider';
import { useState } from 'react';

export default function FrigorificoPage() {
  const { address, isConnected, userRole } = useStarknet();
  const [activeSection, setActiveSection] = useState('operaciones');

  // Verificar si tiene rol de frigorífico
  const tieneRolFrigorifico = userRole.includes('Frigorífico') || 
                              userRole.includes('FRIGORIFICO') || 
                              userRole.includes('FRIGORIFICO_ROLE');

  const canAccess = tieneRolFrigorifico;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 🌟 HEADER AZUL/CELESTE MEJORADO */}
        <section className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-600 shadow-2xl transform hover:shadow-3xl transition-all duration-700">
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
                    <div className="text-6xl lg:text-7xl">🏭</div>
                    <div>
                      <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 font-display tracking-tight">
                        Panel del Frigorífico
                      </h1>
                      <p className="text-xl lg:text-2xl text-white/90 font-light">
                        Procesamiento industrial y gestión de cortes con trazabilidad blockchain
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
                            <span className="ml-1 bg-yellow-400 text-blue-900 px-2 py-1 rounded-full text-xs">ADMIN</span>
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
              Conecta tu wallet de StarkNet para acceder al panel del frigorífico
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all duration-300 font-semibold text-lg shadow-lg"
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
              No tienes el rol de Frigorífico necesario para este panel
            </p>
            <p className="text-red-500 text-sm mb-6">
              Rol actual: <span className="font-bold bg-red-100 px-3 py-1 rounded-full">{userRole}</span>
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left max-w-md mx-auto">
              <h4 className="font-semibold text-red-800 mb-2">¿Eres Administrador?</h4>
              <p className="text-red-600 text-sm">
                Los administradores pueden acceder a todos los paneles. Si necesitas el rol de Frigorífico, contacta al administrador del sistema.
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
                      Tienes acceso completo con privilegios de administrador a todos los módulos del frigorífico
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Panel principal del frigorífico */}
            <FrigorificoDashboard />
          </div>
        )}

        {/* Información adicional - AZUL como el productor pero con contenido específico */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-cyan-100 border border-blue-200 rounded-2xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold text-blue-800 mb-4 font-display flex items-center gap-3">
            <span className="text-3xl">💡</span>
            Información para Frigoríficos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-blue-700">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔪</span>
                <span>Procesa animales recibidos de productores</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">🥩</span>
                <span>Crea cortes específicos con trazabilidad individual</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">🌍</span>
                <span>Transfiere cortes a exportadores autorizados</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">📊</span>
                <span>Gestión de inventario en tiempo real</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">🔒</span>
                <span>Registros inmutables en blockchain StarkNet</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">⚡</span>
                <span>Procesamiento eficiente con confirmación inmediata</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}