'use client'

import { ConnectWallet } from '@/components/common/ConnectWallet'
import { useStarknet } from '@/providers/starknet-provider'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { IoTCard } from '@/components/iot/IoTCard'

export default function Home() {
  const { 
    address, 
    isConnected, 
    userRole,
    loadingRole 
  } = useStarknet()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-primary-dark/5 via-background to-secondary-dark/5">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="animate-pulse space-y-8">
            {/* Hero Skeleton */}
            <div className="h-40 bg-gradient-to-r from-primary/20 to-primary-light/20 rounded-3xl"></div>
            
            {/* Status Cards Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 h-48 bg-white/50 rounded-2xl"></div>
              <div className="h-48 bg-white/50 rounded-2xl"></div>
            </div>
            
            {/* Modules Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-56 bg-white/50 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Verificar roles del usuario para mostrar paneles específicos
  const userRoles = {
    isProducer: userRole.includes('Productor') || userRole.includes('PRODUCER') || userRole.includes('PRODUCER_ROLE'),
    isFrigorifico: userRole.includes('Frigorífico') || userRole.includes('FRIGORIFICO') || userRole.includes('FRIGORIFICO_ROLE'),
    isVeterinarian: userRole.includes('Veterinario') || userRole.includes('VET') || userRole.includes('VET_ROLE'),
    isExporter: userRole.includes('Exportador') || userRole.includes('EXPORTER') || userRole.includes('EXPORTER_ROLE'),
    isAdmin: userRole.includes('Administrador') || userRole.includes('DEFAULT_ADMIN_ROLE'),
    isCertifier: userRole.includes('Certificador') || userRole.includes('CERTIFIER') || userRole.includes('CERTIFIER_ROLE'),
    isAuditor: userRole.includes('Auditor') || userRole.includes('AUDITOR') || userRole.includes('AUDITOR_ROLE'),
    isConsumer: true // Todos pueden acceder al panel de consumidor
  };

  // Función para verificar acceso - ADMIN tiene acceso completo
  const hasAccess = (requiredRole: string | null) => {
    if (userRoles.isAdmin) return true; // ADMIN tiene acceso a todo
    if (!requiredRole) return true; // Sin rol requerido = acceso público
    
    // Mapeo de roles requeridos a las propiedades de userRoles
    const roleMapping: { [key: string]: keyof typeof userRoles } = {
      'PRODUCER_ROLE': 'isProducer',
      'FRIGORIFICO_ROLE': 'isFrigorifico', 
      'VET_ROLE': 'isVeterinarian',
      'EXPORTER_ROLE': 'isExporter',
      'CERTIFIER_ROLE': 'isCertifier',
      'AUDITOR_ROLE': 'isAuditor',
      'DEFAULT_ADMIN_ROLE': 'isAdmin'
    };

    const roleKey = roleMapping[requiredRole];
    return roleKey ? userRoles[roleKey] : false;
  };

  const RoleCard = ({ 
    href, 
    icon, 
    title, 
    description, 
    color = 'blue',
    delay = 0,
    requiredRole = null
  }: any) => {
    const canAccess = hasAccess(requiredRole);
    
    // Clases fijas para cada color
    const getColorClasses = (color: string) => {
      const classes = {
        border: '',
        text: '',
        bg: '',
        dot: ''
      };
      
      switch (color) {
        case 'blue':
          classes.border = 'border-blue-500/20 hover:border-blue-500';
          classes.text = 'text-blue-600';
          classes.bg = 'bg-blue-500/10';
          classes.dot = 'bg-blue-500';
          break;
        case 'green':
          classes.border = 'border-green-500/20 hover:border-green-500';
          classes.text = 'text-green-600';
          classes.bg = 'bg-green-500/10';
          classes.dot = 'bg-green-500';
          break;
        case 'purple':
          classes.border = 'border-purple-500/20 hover:border-purple-500';
          classes.text = 'text-purple-600';
          classes.bg = 'bg-purple-500/10';
          classes.dot = 'bg-purple-500';
          break;
        case 'orange':
          classes.border = 'border-orange-500/20 hover:border-orange-500';
          classes.text = 'text-orange-600';
          classes.bg = 'bg-orange-500/10';
          classes.dot = 'bg-orange-500';
          break;
        case 'red':
          classes.border = 'border-red-500/20 hover:border-red-500';
          classes.text = 'text-red-600';
          classes.bg = 'bg-red-500/10';
          classes.dot = 'bg-red-500';
          break;
        case 'indigo':
          classes.border = 'border-indigo-500/20 hover:border-indigo-500';
          classes.text = 'text-indigo-600';
          classes.bg = 'bg-indigo-500/10';
          classes.dot = 'bg-indigo-500';
          break;
        default:
          classes.border = 'border-blue-500/20 hover:border-blue-500';
          classes.text = 'text-blue-600';
          classes.bg = 'bg-blue-500/10';
          classes.dot = 'bg-blue-500';
      }
      
      return classes;
    };

    const colorClasses = getColorClasses(color);

    return (
      <Link href={canAccess ? href : '#'}>
        <div 
          className={`
            group relative overflow-hidden 
            bg-white border-2 rounded-3xl p-8
            transition-all duration-700
            backdrop-blur-sm
            ${canAccess 
              ? `hover:scale-105 hover:shadow-2xl cursor-pointer ${colorClasses.border}` 
              : 'border-gray-300 opacity-50 cursor-not-allowed'
            }
          `}
          style={{ animationDelay: `${delay}ms` }}
        >
          {/* Animated Background */}
          {canAccess && (
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl ${colorClasses.bg}`}></div>
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
                  ? `${colorClasses.bg} group-hover:scale-110` 
                  : 'bg-gray-200'
              } transition-transform duration-500`}>
                <span className="text-4xl">{icon}</span>
              </div>
              <div>
                <h3 className={`text-2xl font-bold font-display ${
                  canAccess 
                    ? `${colorClasses.text}` 
                    : 'text-gray-400'
                }`}>
                  {title}
                  {userRoles.isAdmin && canAccess && (
                    <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-1 rounded-full">ADMIN</span>
                  )}
                </h3>
                <p className={`text-sm ${canAccess ? 'text-gray-600' : 'text-gray-400'}`}>
                  {requiredRole ? `Rol: ${requiredRole}` : 'Acceso público'}
                  {userRoles.isAdmin && requiredRole && (
                    <span className="ml-1 text-green-600">✓</span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Content */}
            <p className={`leading-relaxed mb-6 text-sm ${canAccess ? 'text-gray-600' : 'text-gray-400'}`}>
              {description}
            </p>
            
            {/* Status Indicator */}
            <div className="flex items-center justify-between">
              {canAccess ? (
                <>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${colorClasses.dot}`}></div>
                  <span className="text-xs font-semibold text-gray-500">
                    {isConnected ? (
                      userRoles.isAdmin ? 'Acceso ADMIN completo' : 'Acceso permitido'
                    ) : 'Conecta wallet'}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
                    <span>🔒</span>
                    {requiredRole ? `Rol requerido: ${requiredRole}` : 'Sin acceso'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  const FeatureCard = ({ icon, title, description }: any) => (
    <div className="group relative overflow-hidden">
      <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center h-full group-hover:scale-105 transition-transform duration-500">
        <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="font-bold text-xl mb-4 text-gray-800 font-display">
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed text-sm">
          {description}
        </p>
      </div>
    </div>
  )

  const StatBadge = ({ value, label }: any) => (
    <div className="text-center p-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200">
      <div className="text-2xl font-bold mb-2 text-gray-800 font-display">
        {value}
      </div>
      <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide">
        {label}
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* 🌟 Hero Section */}
        <section className="mb-16 lg:mb-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-2xl transform hover:shadow-3xl transition-all duration-700">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/20 rounded-full animate-pulse"></div>
              <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/10 rounded-full"></div>
            </div>
            
            <div className="relative z-10 p-8 lg:p-12">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
                {/* Hero Content */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 mb-8">
                    <div className="text-7xl lg:text-8xl">🥩</div>
                    <div>
                      <h1 className="text-4xl lg:text-6xl font-bold text-white mb-4 lg:mb-6 font-display tracking-tight">
                        BeefChain
                      </h1>
                      <p className="text-xl lg:text-2xl text-white/90 font-light max-w-2xl">
                        Trazabilidad Blockchain para Carne Premium
                      </p>
                    </div>
                  </div>
                  
                  {/* Stats Row */}
                  <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-8">
                    <StatBadge value="100%" label="Inmutable" />
                    <StatBadge value="0.1s" label="Velocidad" />
                    <StatBadge value="🌍" label="Global" />
                    <StatBadge value="🏅" label="Certificado" />
                  </div>
                  
                  {/* Feature Tags */}
                  <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                    {['StarkNet L2', 'Zero-Knowledge', 'Enterprise Grade', 'Real-Time'].map((tag, index) => (
                      <div 
                        key={tag}
                        className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/30 transition-all duration-300 hover:bg-white/30"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <span className="text-sm text-white font-medium">{tag}</span>
                      </div>
                    ))}
                    {userRoles.isAdmin && isConnected && (
                      <div className="flex items-center gap-2 bg-yellow-500/80 px-4 py-2 rounded-full backdrop-blur-sm border border-yellow-300 transition-all duration-300 hover:bg-yellow-500">
                        <span className="text-sm text-white font-medium">ADMIN ACCESS</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Connect Wallet */}
                <div className="flex-shrink-0">
                  <div className="transform hover:scale-105 transition-transform duration-300">
                    <ConnectWallet />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 📊 Status Section */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 mb-16 lg:mb-20">
          {/* Connection Status Card */}
          <div className="xl:col-span-3">
            <div className={`bg-white border-2 rounded-3xl p-6 lg:p-8 backdrop-blur-sm ${
              isConnected 
                ? 'border-green-500/30 bg-green-50' 
                : 'border-blue-500/30 bg-blue-50'
            }`}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className={`text-2xl lg:text-3xl font-bold mb-3 font-display ${
                    isConnected ? 'text-green-800' : 'text-blue-800'
                  }`}>
                    {isConnected ? '🟢 Conectado' : '🔵 Conecta tu Wallet'}
                  </h2>
                  <p className={`text-sm lg:text-base ${
                    isConnected ? 'text-green-700' : 'text-blue-700'
                  }`}>
                    {isConnected ? 
                      `Wallet activa y verificada - ${address?.slice(0, 8)}...${address?.slice(-6)}` : 
                      'Conecta tu wallet StarkNet para comenzar'
                    }
                  </p>
                </div>
                {isConnected && (
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs animate-pulse">LIVE</span>
                )}
              </div>
              
              {isConnected && address ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-2 uppercase tracking-wide font-semibold">Rol Asignado</p>
                      <p className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent capitalize">
                        {userRole.toLowerCase()}
                        {userRoles.isAdmin && (
                          <span className="ml-2 text-sm bg-yellow-500 text-white px-2 py-1 rounded-full">SUPER USUARIO</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2 uppercase tracking-wide font-semibold">Dirección</p>
                      <div className="font-mono text-xs lg:text-sm bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                        {address}
                      </div>
                    </div>
                  </div>
                  
                  {userRoles.isAdmin && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                      <p className="text-sm text-yellow-700 font-semibold text-center">
                        🎯 MODO ADMINISTRADOR ACTIVADO: Acceso completo a todos los módulos del sistema
                      </p>
                    </div>
                  )}

                  {/* Roles Activos */}
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-3 uppercase tracking-wide font-semibold">Roles Activos</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(userRoles)
                        .filter(([_, hasAccess]) => hasAccess && _ !== 'isConsumer')
                        .map(([role]) => (
                          <span key={role} className={`px-3 py-1 rounded-full text-xs font-medium ${
                            role === 'isAdmin' 
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {role.replace('is', '')}
                            {role === 'isAdmin' && ' ★'}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-gray-700 leading-relaxed text-sm lg:text-base">
                    Conecta tu wallet StarkNet para desbloquear todas las funcionalidades premium del sistema de trazabilidad BeefChain
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 transition-colors hover:bg-gray-100">
                      <span className="text-2xl">🟣</span>
                      <div>
                        <span className="font-semibold text-gray-800">Braavos</span>
                        <p className="text-xs text-gray-600">Wallet recomendada</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 transition-colors hover:bg-gray-100">
                      <span className="text-2xl">🔷</span>
                      <div>
                        <span className="font-semibold text-gray-800">Argent X</span>
                        <p className="text-xs text-gray-600">Alternativa popular</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 🎯 Core Modules Section */}
        <section className="mb-16 lg:mb-20">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-800 mb-4 lg:mb-6 font-display">
              🎯 Módulos Principales
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Gestión integral de la cadena de suministro con tecnología blockchain de última generación
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <RoleCard
              href="/productor"
              icon="👨‍🌾"
              title="Productor"
              description="Registro completo de animales con datos genéticos, sanitarios y trazabilidad de origen en blockchain"
              color="green"
              delay={0}
              requiredRole="PRODUCER_ROLE"
            />
            <RoleCard
              href="/frigorifico"
              icon="🏭"
              title="Frigorífico"
              description="Procesamiento industrial avanzado con generación de códigos QR únicos y certificación digital"
              color="blue"
              delay={100}
              requiredRole="FRIGORIFICO_ROLE"
            />
            <IoTCard /> {/* Nueva card IoT */}
            <RoleCard
              href="/veterinario"
              icon="⚕️"
              title="Veterinario"
              description="Gestión de registros de salud, vacunaciones y cuarentenas para animales autorizados"
              color="purple"
              delay={200}
              requiredRole="VET_ROLE"
            />
          </div>
        </section>

        {/* ⚙️ Advanced Modules Section */}
        <section className="mb-16 lg:mb-20">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-800 mb-4 lg:mb-6 font-display">
              ⚙️ Módulos Avanzados
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Funcionalidades empresariales para gestión, certificación y expansión global
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <RoleCard
              href="/exportador"
              icon="🌍"
              title="Exportador"
              description="Gestión logística global y cumplimiento automatizado de normativas internacionales"
              color="indigo"
              delay={0}
              requiredRole="EXPORTER_ROLE"
            />
            <RoleCard
              href="/certification"
              icon="🏅"
              title="Certificación"
              description="Auditoría y certificación de estándares internacionales de calidad y sostenibilidad"
              color="orange"
              delay={100}
              requiredRole="CERTIFIER_ROLE"
            />
            <RoleCard
              href="/admin"
              icon="⚙️"
              title="Panel de Control"
              description="Administración completa del sistema, analytics en tiempo real y gestión de permisos avanzada"
              color="red"
              delay={200}
              requiredRole="DEFAULT_ADMIN_ROLE"
            />
          </div>
        </section>

        {/* 🔍 Módulos de Consulta (Acceso Libre) */}
        <section className="mb-16 lg:mb-20">
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-gray-800 mb-4 lg:mb-6 font-display">
              🔍 Módulos de Consulta
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Acceso público y verificación de trazabilidad para consumidores finales
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 lg:gap-8">
            <RoleCard
              href="/consumidor"
              icon="👥"
              title="Consumidor Final"
              description="Verificación instantánea de trazabilidad mediante escaneo QR y auditoría completa del producto"
              color="blue"
              delay={0}
              requiredRole={null}
            />
            <RoleCard
              href="/auditor"
              icon="📊"
              title="Auditoría"
              description="Consultas avanzadas y reportes de trazabilidad completa para auditorías externas"
              color="purple"
              delay={100}
              requiredRole="AUDITOR_ROLE"
            />
          </div>
        </section>

        {/* 💫 Features Grid */}
        <section className="mb-16 lg:mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <FeatureCard
              icon="🔗"
              title="Blockchain Inmutable"
              description="Registros permanentes en StarkNet con máxima seguridad criptográfica y transparencia absoluta en cada transacción"
            />
            <FeatureCard
              icon="⚡"
              title="Tiempo Real"
              description="Actualización instantánea en toda la cadena de suministro con notificaciones push y alertas automáticas"
            />
            <FeatureCard
              icon="🏅"
              title="Certificación Premium"
              description="Validación de estándares internacionales con auditoría trazable en cada etapa del proceso productivo"
            />
          </div>
        </section>

        {/* 📈 How It Works & Benefits */}
        <section className="mb-12 lg:mb-16">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl overflow-hidden shadow-2xl transform hover:shadow-3xl transition-all duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 p-8 lg:p-12">
              {/* How It Works */}
              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-6 lg:mb-8 font-display flex items-center gap-3">
                  <span className="text-3xl lg:text-4xl">💡</span>
                  ¿Cómo funciona BeefChain?
                </h3>
                <div className="space-y-4 lg:space-y-6">
                  {[
                    { step: '1️⃣', text: 'Productores registran animales con datos completos de origen, genética y alimentación' },
                    { step: '2️⃣', text: 'Veterinarios autorizados gestionan registros de salud y vacunaciones' },
                    { step: '3️⃣', text: 'Frigoríficos procesan y crean cortes premium con certificación digital inmutable' },
                    { step: '4️⃣', text: 'Exportadores gestionan logística internacional con pagos automáticos' },
                    { step: '5️⃣', text: 'Consumidores verifican trazabilidad completa mediante códigos QR' }
                  ].map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-4 p-4 lg:p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 transition-all hover:bg-white/15"
                    >
                      <span className="text-xl lg:text-2xl flex-shrink-0 mt-1">{item.step}</span>
                      <p className="text-white/90 text-sm lg:text-base leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Benefits */}
              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-6 lg:mb-8 font-display flex items-center gap-3">
                  <span className="text-3xl lg:text-4xl">🎯</span>
                  Beneficios por Rol
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  {[
                    { benefit: '👨‍🌾', text: 'Productores: Trazabilidad completa y pagos automáticos' },
                    { benefit: '⚕️', text: 'Veterinarios: Registros seguros y autorizaciones específicas' },
                    { benefit: '🏭', text: 'Frigoríficos: Procesamiento certificado y QR únicos' },
                    { benefit: '🌍', text: 'Exportadores: Logística optimizada y cumplimiento internacional' },
                    { benefit: '🏅', text: 'Certificadores: Auditoría digital y estándares verificables' },
                    { benefit: '👥', text: 'Consumidores: Transparencia total y origen verificado' },
                    { benefit: '📊', text: 'Auditores: Acceso completo a historiales inmutables' },
                    { benefit: '⚙️', text: 'Administradores: Control total y analytics en tiempo real' }
                  ].map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 p-3 lg:p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 transition-all hover:bg-white/15"
                    >
                      <span className="text-lg lg:text-xl flex-shrink-0">{item.benefit}</span>
                      <p className="text-white/90 text-xs lg:text-sm">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 🚀 Final CTA */}
        <section className="text-center py-12 lg:py-16">
          <div className="bg-white border border-gray-200 rounded-3xl p-8 lg:p-12 max-w-4xl mx-auto">
            <h3 className="text-2xl lg:text-4xl font-bold text-gray-800 mb-4 lg:mb-6 font-display">
              ¿Listo para la revolución alimentaria?
            </h3>
            <p className="text-lg lg:text-xl text-gray-600 mb-8 lg:mb-10 max-w-2xl mx-auto leading-relaxed">
              Únete a la nueva era de trazabilidad transparente con tecnología blockchain enterprise-grade
            </p>
            {!isConnected && (
              <div className="flex justify-center transform hover:scale-105 transition-transform duration-300">
                <ConnectWallet />
              </div>
            )}
            {isConnected && (
              <div className="text-center">
                <p className="text-green-600 font-semibold text-lg mb-4">
                  {userRoles.isAdmin 
                    ? '🎉 ¡MODO ADMIN ACTIVADO! Acceso completo a todos los módulos.' 
                    : '🎉 ¡Ya estás conectado! Explora los módulos disponibles para tu rol.'
                  }
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {Object.entries(userRoles)
                    .filter(([_, hasAccess]) => hasAccess && _ !== 'isConsumer')
                    .map(([role]) => (
                      <span key={role} className={`px-3 py-1 rounded-full text-sm font-medium ${
                        role === 'isAdmin' 
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {role.replace('is', '')}
                        {role === 'isAdmin' && ' ★'}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}