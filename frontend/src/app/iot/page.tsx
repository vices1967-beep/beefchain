// app/iot/page.tsx
'use client';

import { ProducerIoTManager } from '@/components/iot/ProducerIoTManager';
import Link from 'next/link';
import { useStarknet } from '@/providers/starknet-provider';

export default function IoTPage() {
  const { address, isConnected, userRole } = useStarknet();

  const hasIoTAcceso = () => {
    const isProducer = userRole.includes('Productor') || userRole.includes('PRODUCER') || userRole.includes('PRODUCER_ROLE');
    const isAdmin = userRole.includes('Administrador') || userRole.includes('DEFAULT_ADMIN_ROLE');
    return isProducer || isAdmin;
  };

  const canAccess = hasIoTAcceso();

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 🌟 HEADER IOT MEJORADO */}
        <section className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 to-indigo-600 shadow-2xl transform hover:shadow-3xl transition-all duration-700">
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
                    <div className="text-6xl lg:text-7xl">📡</div>
                    <div>
                      <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 font-display tracking-tight">
                        Monitoreo IoT
                      </h1>
                      <p className="text-xl lg:text-2xl text-white/90 font-light">
                        Seguimiento en tiempo real de tu ganado en San Justo, Santa Fe
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
                            <span className="ml-1 bg-yellow-400 text-purple-900 px-2 py-1 rounded-full text-xs">ADMIN</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Navegación rápida */}
                <div className="flex-shrink-0 flex gap-3">
                  <Link 
                    href="/"
                    className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl backdrop-blur-sm border border-white/30 transition-all duration-300"
                  >
                    <span>🏠</span>
                    Inicio
                  </Link>
                  {canAccess && (
                    <Link 
                      href="/productor"
                      className="inline-flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-white px-6 py-3 rounded-xl backdrop-blur-sm border border-green-300/30 transition-all duration-300"
                    >
                      <span>👨‍🌾</span>
                      Panel Productor
                    </Link>
                  )}
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
              Conecta tu wallet de StarkNet para acceder al monitoreo IoT
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 font-semibold text-lg shadow-lg"
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
              No tienes el rol de Productor necesario para el monitoreo IoT
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
                      Tienes acceso completo al módulo IoT con privilegios de administrador
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Información de Ubicación */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">📍</span>
                  <div>
                    <h4 className="font-bold text-xl mb-1">San Justo, Santa Fe</h4>
                    <p className="text-purple-100 text-sm">
                      Monitoreo en tiempo real de ganado en la región central de Santa Fe
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                    🌤️ Clima Templado
                  </span>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                    🐄 Zona Ganadera
                  </span>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                    📡 IoT en Tiempo Real
                  </span>
                </div>
              </div>
            </div>

            {/* Componente Principal IoT */}
            <ProducerIoTManager />

            {/* Información Adicional */}
            <div className="bg-white border border-purple-200 rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-purple-800 mb-6 font-display flex items-center gap-3">
                <span className="text-3xl">💡</span>
                Tecnología IoT BeefChain
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="text-4xl mb-4">🔗</div>
                  <h4 className="font-semibold text-purple-700 mb-2">Vinculación en Blockchain</h4>
                  <p className="text-purple-600 text-sm">
                    Cada dispositivo IoT se vincula de forma inmutable e irreversible en StarkNet
                  </p>
                </div>
                
                <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="text-4xl mb-4">📊</div>
                  <h4 className="font-semibold text-purple-700 mb-2">Datos en Tiempo Real</h4>
                  <p className="text-purple-600 text-sm">
                    Monitoreo continuo de temperatura, ubicación y salud del ganado cada 30 segundos
                  </p>
                </div>
                
                <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="text-4xl mb-4">🚨</div>
                  <h4 className="font-semibold text-purple-700 mb-2">Alertas Automáticas</h4>
                  <p className="text-purple-600 text-sm">
                    Sistema inteligente de alertas por fiebre, hipotermia y ubicación fuera de zona
                  </p>
                </div>
              </div>

              <div className="mt-8 p-6 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl border border-purple-300">
                <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                  <span>🎯</span>
                  Beneficios para Productores
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-purple-700">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600">✅</span>
                      <span>Reducción de pérdidas por enfermedad</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600">✅</span>
                      <span>Optimización de recursos humanos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600">✅</span>
                      <span>Mejora en la trazabilidad del ganado</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600">✅</span>
                      <span>Alertas tempranas de problemas de salud</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600">✅</span>
                      <span>Monitoreo 24/7 sin intervención manual</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600">✅</span>
                      <span>Datos verificables para certificaciones</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}