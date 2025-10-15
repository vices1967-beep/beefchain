// components/iot/IoTCard.tsx
'use client';

import Link from 'next/link';
import { useStarknet } from '@/providers/starknet-provider';

export function IoTCard() {
  const { isConnected, userRole } = useStarknet();

  const hasIoTAcceso = () => {
    const isProducer = userRole.includes('Productor') || userRole.includes('PRODUCER') || userRole.includes('PRODUCER_ROLE');
    const isAdmin = userRole.includes('Administrador') || userRole.includes('DEFAULT_ADMIN_ROLE');
    return isProducer || isAdmin;
  };

  const canAccess = hasIoTAcceso();

  return (
    <Link href={canAccess ? "/iot" : "#"}>
      <div 
        className={`
          group relative overflow-hidden 
          bg-white border-2 rounded-3xl p-8
          transition-all duration-700
          backdrop-blur-sm
          ${canAccess 
            ? 'border-purple-500/20 hover:border-purple-500 cursor-pointer hover:scale-105 hover:shadow-2xl' 
            : 'border-gray-300 opacity-50 cursor-not-allowed'
          }
        `}
      >
        {/* Animated Background */}
        {canAccess && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl bg-purple-500/10"></div>
        )}
        
        {/* Shine Effect */}
        {canAccess && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        )}
        
        <div className="relative z-10">
          {/* Icon Container with Text */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`inline-flex p-4 rounded-2xl ${
              canAccess 
                ? 'bg-purple-500/10 group-hover:scale-110' 
                : 'bg-gray-200'
            } transition-transform duration-500`}>
              <span className="text-4xl">📡</span>
            </div>
            <div>
              <h3 className={`text-2xl font-bold font-display ${
                canAccess 
                  ? 'text-purple-600' 
                  : 'text-gray-400'
              }`}>
                Monitoreo IoT
                {userRole.includes('Administrador') && canAccess && (
                  <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-1 rounded-full">ADMIN</span>
                )}
              </h3>
              <p className={`text-sm ${canAccess ? 'text-gray-600' : 'text-gray-400'}`}>
                Rol: Productor/Admin
                {userRole.includes('Administrador') && canAccess && (
                  <span className="ml-1 text-green-600">✓</span>
                )}
              </p>
            </div>
          </div>
          
          {/* Content */}
          <p className={`leading-relaxed mb-6 text-sm ${canAccess ? 'text-gray-600' : 'text-gray-400'}`}>
            Monitoreo en tiempo real de ganado con dispositivos IoT. 
            Vinculación de sensores, seguimiento GPS y alertas de salud en San Justo, Santa Fe.
          </p>
          
          {/* Status Indicator */}
          <div className="flex items-center justify-between">
            {canAccess ? (
              <>
                <div className="w-2 h-2 rounded-full animate-pulse bg-purple-500"></div>
                <span className="text-xs font-semibold text-gray-500">
                  {isConnected ? (
                    userRole.includes('Administrador') ? 'Acceso ADMIN completo' : 'Acceso permitido'
                  ) : 'Conecta wallet'}
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
                  <span>🔒</span>
                  Rol requerido: Productor
                </span>
              </>
            )}
          </div>

          {/* Features Tags */}
          {canAccess && (
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                📍 GPS en Tiempo Real
              </span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                🌡️ Monitoreo Salud
              </span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                🚨 Alertas Automáticas
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}