// components/productor/ProducerIoTManager.tsx - CORREGIDO Y COMPLETO
'use client';

import { useState, useEffect } from 'react';
import { useRealProducerIoT } from '@/hooks/useRealProducerIoT';

export function ProducerIoTManager() {
  const [activeTab, setActiveTab] = useState<'devices' | 'simulation' | 'history'>('devices');
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [simulationCount, setSimulationCount] = useState(0);
  const [linkForm, setLinkForm] = useState({
    animalId: '',
    deviceId: ''
  });

  const {
    // Estado
    activeAnimals,
    animalMetadata,
    iotDevices,
    realReadings,
    isLoading,
    alerts,
    transactionHistory,
    
    // Acciones
    linkDeviceToAnimal,
    linkDeviceToAnimalReal, // ✅ NUEVA FUNCIÓN REAL
    sendRealIoTDataReal, // ✅ NUEVA FUNCIÓN REAL
    simulateRealIoTData,
    reloadData,
    clearAlerts,
    
    // Helpers
    getAnimalMetadata,
    isAnimalLinked,
    getLatestReading,
    getStats,
    
    // Info
    getSanJustoInfo,
    isConnected,
    userAddress,
    hasWallet // ✅ NUEVO: Para saber si puede firmar
  } = useRealProducerIoT();

  const stats = getStats();
  const sanJustoInfo = getSanJustoInfo();
  const linkedAnimals = activeAnimals.filter(animalId => isAnimalLinked(animalId));
  const currentReading = selectedAnimalId ? getLatestReading(selectedAnimalId) : null;
  const selectedAnimalMeta = selectedAnimalId ? getAnimalMetadata(selectedAnimalId) : null;

  // components/productor/ProducerIoTManager.tsx - REEMPLAZA SOLO ESTE useEffect

// ❌ BORRA ESTE VIEJO:
// useEffect(() => {
//   if (!isSimulationActive || !selectedAnimalId || !isAnimalLinked(selectedAnimalId)) return;
//
//   const interval = setInterval(async () => {
//     try {
//       await simulateRealIoTData(selectedAnimalId);
//       setSimulationCount(prev => prev + 1);
//       
//       // Detener después de 10 simulaciones para demo
//       if (simulationCount >= 9) {
//         setIsSimulationActive(false);
//         setSimulationCount(0);
//       }
//     } catch (error) {
//       console.error('Error en simulación:', error);
//       setIsSimulationActive(false);
//     }
//   }, 30000); // Cada 30 segundos
//
//   return () => clearInterval(interval);
// }, [isSimulationActive, selectedAnimalId, linkedAnimals, simulationCount]);

// ✅ PONE ESTE NUEVO:
// components/productor/ProducerIoTManager.tsx - useEffect CORREGIDO

  useEffect(() => {
    // Si no está activa la simulación, no hacer nada
    if (!isSimulationActive || !selectedAnimalId || !isAnimalLinked(selectedAnimalId)) {
      return;
    }

    console.log(`🔄 Iniciando simulación para animal ${selectedAnimalId}, conteo: ${simulationCount}`);

    const interval = setInterval(async () => {
      try {
        console.log(`📡 Ejecutando simulación ${simulationCount + 1}/10...`);
        await simulateRealIoTData(selectedAnimalId);
        
        // ✅ ACTUALIZACIÓN CORRECTA DEL CONTADOR
        setSimulationCount(prev => {
          const newCount = prev + 1;
          console.log(`✅ Simulación ${newCount}/10 completada`);
          
          // ✅ DETENER AUTOMÁTICAMENTE DESPUÉS DE 10
          if (newCount >= 10) {
            console.log('🎯 Límite de simulaciones alcanzado - Deteniendo');
            setIsSimulationActive(false);
            // ✅ EL HOOK MANEJA LAS ALERTAS AUTOMÁTICAMENTE
            return 0; // Reiniciar contador
          }
          return newCount;
        });
        
      } catch (error: any) {
        console.error('❌ Error en simulación:', error);
        setIsSimulationActive(false);
        setSimulationCount(0);
        // ✅ EL HOOK MANEJA LOS ERRORES AUTOMÁTICAMENTE
      }
    }, 30000); // Cada 30 segundos

    // ✅ LIMPIAR INTERVALO AL DESMONTAR
    return () => {
      console.log('🧹 Limpiando intervalo de simulación');
      clearInterval(interval);
    };
  }, [isSimulationActive, selectedAnimalId, linkedAnimals, simulationCount, simulateRealIoTData]);

  // Auto-seleccionar primer animal vinculado si existe
  useEffect(() => {
    if (linkedAnimals.length > 0 && !selectedAnimalId) {
      setSelectedAnimalId(linkedAnimals[0]);
    }
  }, [linkedAnimals, selectedAnimalId]);

  // Manejar vinculación de dispositivo
  const handleLinkDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkForm.animalId || !linkForm.deviceId) {
      alert('Por favor completa ambos campos');
      return;
    }

    const animalId = parseInt(linkForm.animalId);
    
    if (isAnimalLinked(animalId)) {
      alert('Este animal ya tiene un dispositivo vinculado');
      return;
    }

    try {
      // ✅ USAR VERSIÓN REAL SI HAY WALLET
      if (hasWallet) {
        const result = await linkDeviceToAnimalReal(animalId, linkForm.deviceId);
        
        if (result.success) {
          setLinkForm({ animalId: '', deviceId: '' });
          setSelectedAnimalId(animalId);
          
          // Mostrar opción para ver en explorer
          setTimeout(() => {
            if (confirm('¿Quieres ver la transacción en el explorador de StarkNet?')) {
              window.open(`https://sepolia.voyager.online/tx/${result.hash}`, '_blank');
            }
          }, 1000);
        }
      } else {
        // Usar versión simulada
        await linkDeviceToAnimal(animalId, linkForm.deviceId);
        setLinkForm({ animalId: '', deviceId: '' });
        setSelectedAnimalId(animalId);
      }
    } catch (error) {
      // El error ya se maneja en el hook
    }
  };

  // Enviar transacción REAL al contrato
  const sendRealTransaction = async (animalId: number, deviceId: string) => {
    try {
      if (!hasWallet) {
        alert('No hay wallet conectada para firmar transacción real');
        return;
      }

      const result = await linkDeviceToAnimalReal(animalId, deviceId);
      
      if (result.success) {
        // Mostrar opción para ver en explorer
        setTimeout(() => {
          if (confirm('✅ Transacción REAL enviada. ¿Quieres verla en el explorador?')) {
            window.open(`https://sepolia.voyager.online/tx/${result.hash}`, '_blank');
          }
        }, 1000);
      }
      
    } catch (error: any) {
      console.error('Error en transacción real:', error);
      alert(`❌ Error en transacción real: ${error.message}`);
    }
  };

  // Iniciar/detener simulación
  const toggleSimulation = () => {
    if (!selectedAnimalId) {
      alert('Selecciona un animal primero');
      return;
    }

    if (!isAnimalLinked(selectedAnimalId)) {
      alert('Este animal no tiene dispositivo vinculado');
      return;
    }

    if (!isSimulationActive) {
      setSimulationCount(0);
    }
    
    setIsSimulationActive(!isSimulationActive);
  };

  if (!isConnected) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-lg">
        <div className="text-6xl mb-4">🔌</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4 font-display">
          Wallet No Conectada
        </h3>
        <p className="text-gray-600 mb-6 text-lg">
          Conecta tu wallet de StarkNet para gestionar dispositivos IoT
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 max-w-md mx-auto">
          <p className="text-yellow-800 text-sm">
            <strong>📍 Ubicación:</strong> {sanJustoInfo.city}, {sanJustoInfo.province}<br/>
            <strong>🌤️ Clima:</strong> {sanJustoInfo.climate}<br/>
            <strong>🐄 Ganado:</strong> {sanJustoInfo.typicalLivestock}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 font-display flex items-center gap-3">
              <span className="text-3xl">📡</span>
              Gestión IoT - San Justo, Santa Fe
              {hasWallet && (
                <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                  🔐 FIRMA ACTIVA
                </span>
              )}
            </h2>
            <p className="text-gray-600 mt-2">
              Monitoreo en tiempo real de tu ganado con tecnología blockchain
              {hasWallet && (
                <span className="text-green-600 font-semibold ml-2">
                  • Transacciones REALES disponibles
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={reloadData}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              <span>🔄</span>
              {isLoading ? 'Cargando...' : 'Actualizar'}
            </button>
            
            <div className="text-right">
              <p className="text-sm text-gray-600">Animales activos</p>
              <p className="text-xl font-bold text-green-600">{stats.totalAnimals}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {[
            { id: 'devices' as const, label: '🔗 Dispositivos', icon: '🔗' },
            { id: 'simulation' as const, label: '🔄 Simulación', icon: '🔄' },
            { id: 'history' as const, label: '📋 Historial', icon: '📋' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 font-semibold transition-all duration-300 border-b-2 ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de las pestañas */}
      <div className="p-6">
        {/* Pestaña: Dispositivos */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
            {/* Estadísticas Rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                <div className="text-2xl mb-2">🐄</div>
                <div className="text-blue-600 font-bold text-lg">{stats.totalAnimals}</div>
                <div className="text-blue-700 text-sm">Total</div>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
                <div className="text-2xl mb-2">📱</div>
                <div className="text-green-600 font-bold text-lg">{stats.linkedAnimals}</div>
                <div className="text-green-700 text-sm">Con IoT</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 text-center">
                <div className="text-2xl mb-2">⚖️</div>
                <div className="text-purple-600 font-bold text-lg">{stats.averageWeight}kg</div>
                <div className="text-purple-700 text-sm">Promedio</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-orange-600 font-bold text-lg">{stats.totalTransactions}</div>
                <div className="text-orange-700 text-sm">Transacciones</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulario de Vinculación */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <span>🔗</span>
                  Vincular Nuevo Dispositivo
                  {hasWallet && (
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                      REAL
                    </span>
                  )}
                </h3>
                
                <form onSubmit={handleLinkDevice} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Animal:
                    </label>
                    <select
                      value={linkForm.animalId}
                      onChange={(e) => setLinkForm(prev => ({ ...prev, animalId: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Seleccionar animal</option>
                      {activeAnimals
                        .filter(animalId => !isAnimalLinked(animalId))
                        .map(animalId => {
                          const meta = getAnimalMetadata(animalId);
                          return (
                            <option key={animalId} value={animalId}>
                              #{animalId} - {meta?.breed} ({meta?.weight}kg)
                            </option>
                          );
                        })}
                      {activeAnimals.filter(animalId => !isAnimalLinked(animalId)).length === 0 && (
                        <option disabled>Todos los animales tienen dispositivo</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID del Dispositivo:
                    </label>
                    <input
                      type="text"
                      value={linkForm.deviceId}
                      onChange={(e) => setLinkForm(prev => ({ ...prev, deviceId: e.target.value }))}
                      placeholder="Ej: iot_001, sensor_gps_123"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={activeAnimals.filter(animalId => !isAnimalLinked(animalId)).length === 0 || isLoading}
                    className={`w-full px-6 py-3 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                      hasWallet 
                        ? 'bg-green-500 hover:bg-green-600 disabled:bg-gray-400' 
                        : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400'
                    }`}
                  >
                    <span>🔗</span>
                    {hasWallet ? 'Vincular Dispositivo (REAL)' : 'Vincular Dispositivo (Demo)'}
                  </button>
                </form>

                {/* Información de transacciones reales */}
                {hasWallet && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                      <span>🚀</span>
                      Transacciones Reales Activadas
                    </h4>
                    <p className="text-green-700 text-sm">
                      Las vinculaciones se enviarán REALMENTE a StarkNet Sepolia
                    </p>
                  </div>
                )}

                {/* Información de ubicación */}
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <span>📍</span>
                    <strong>Ubicación:</strong> {sanJustoInfo.city}, {sanJustoInfo.province}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Coordenadas: {sanJustoInfo.coordinates.latitude.toFixed(4)}, {sanJustoInfo.coordinates.longitude.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Lista de Dispositivos Vinculados */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>📱</span>
                  Dispositivos Vinculados ({linkedAnimals.length})
                </h3>
                
                {linkedAnimals.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {linkedAnimals.map(animalId => {
                      const meta = getAnimalMetadata(animalId);
                      const deviceId = iotDevices.get(animalId);
                      const reading = getLatestReading(animalId);
                      
                      return (
                        <div 
                          key={animalId}
                          className={`p-4 border rounded-lg transition-all cursor-pointer ${
                            selectedAnimalId === animalId
                              ? 'border-green-500 bg-green-50 shadow-md'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedAnimalId(animalId)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-green-600 text-xl">🐄</span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">
                                  Animal #{animalId}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {meta?.breed} • {meta?.weight}kg
                                </p>
                                <p className="text-xs text-blue-600 font-mono mt-1">
                                  {deviceId}
                                </p>
                                {reading && (
                                  <p className="text-xs text-green-600 mt-1">
                                    🌡️ {reading.temperature.toFixed(1)}°C • 💧 {reading.humidity.toFixed(1)}%
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              {/* Botón para transacción real */}
                              {hasWallet && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendRealTransaction(animalId, deviceId!);
                                  }}
                                  className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium mb-2"
                                >
                                  🔗 Real
                                </button>
                              )}
                              {reading ? (
                                <div className="text-xs text-green-600">
                                  <div>📡 Activo</div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">
                                  Sin datos
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
                    <div className="text-4xl mb-3">🔗</div>
                    <p className="text-sm">No hay dispositivos vinculados</p>
                    <p className="text-xs mt-1">Vincula tu primer dispositivo IoT</p>
                  </div>
                )}

                {/* Distribución de Razas */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>📊</span>
                    Distribución de Razas
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(stats.breedDistribution).map(([breed, count]) => (
                      <div key={breed} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{breed}</span>
                        <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pestaña: Simulación */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            {linkedAnimals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔗</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Primero vincula dispositivos
                </h3>
                <p className="text-gray-600">
                  Ve a la pestaña "Dispositivos" para vincular IoT a tus animales
                </p>
              </div>
            ) : (
              <>
                {/* Panel de Control */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-6">
                    {/* Control de Simulación */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                        <span>🎮</span>
                        Control de Simulación
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Animal a Monitorear:
                          </label>
                          <select
                            value={selectedAnimalId || ''}
                            onChange={(e) => setSelectedAnimalId(Number(e.target.value))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          >
                            {linkedAnimals.map(animalId => {
                              const meta = getAnimalMetadata(animalId);
                              return (
                                <option key={animalId} value={animalId}>
                                  #{animalId} - {meta?.breed} ({meta?.weight}kg)
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <button
                          onClick={toggleSimulation}
                          disabled={!selectedAnimalId}
                          className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                            isSimulationActive
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-400'
                          }`}
                        >
                          <span>{isSimulationActive ? '⏹️' : '🚀'}</span>
                          {isSimulationActive ? `Detener (${simulationCount}/10)` : 'Iniciar Simulación'}
                        </button>

                        <div className={`p-3 rounded-lg text-center ${
                          isSimulationActive 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              isSimulationActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                            }`}></div>
                            <span className="font-semibold text-sm">
                              {isSimulationActive ? `SIMULACIÓN ACTIVA (${simulationCount}/10)` : 'SIMULACIÓN DETENIDA'}
                            </span>
                          </div>
                          <p className="text-xs mt-1">
                            {isSimulationActive ? 'Datos se envían cada 30 segundos' : 'Listo para simular'}
                          </p>
                        </div>

                        {/* Botón para transacción real */}
                        {hasWallet && (
                          <button
                            onClick={() => {
                              if (selectedAnimalId) {
                                const deviceId = iotDevices.get(selectedAnimalId);
                                if (deviceId) {
                                  sendRealTransaction(selectedAnimalId, deviceId);
                                }
                              }
                            }}
                            className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <span>🚀</span>
                            Enviar Transacción Real
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Información del Animal Seleccionado */}
                    {selectedAnimalMeta && (
                      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                          <span>🐄</span>
                          Animal Seleccionado
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700">ID:</span>
                            <span className="font-semibold">#{selectedAnimalMeta.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Raza:</span>
                            <span className="font-semibold">{selectedAnimalMeta.breed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Peso:</span>
                            <span className="font-semibold">{selectedAnimalMeta.weight}kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">Dispositivo:</span>
                            <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                              {iotDevices.get(selectedAnimalMeta.id)}
                            </span>
                          </div>
                          {currentReading && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-blue-700">Última lectura:</span>
                                <span className="font-semibold">{new Date(currentReading.timestamp * 1000).toLocaleTimeString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">Temperatura:</span>
                                <span className={`font-semibold ${
                                  currentReading.temperature > 39.0 || currentReading.temperature < 36.0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {currentReading.temperature.toFixed(1)}°C
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dashboard de Datos en Tiempo Real */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>📊</span>
                        Datos en Tiempo Real
                        {selectedAnimalMeta && ` - Animal #${selectedAnimalMeta.id}`}
                      </h3>
                      
                      {currentReading ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className={`text-center p-4 rounded-xl border ${
                            currentReading.temperature > 39.0 || currentReading.temperature < 36.0
                              ? 'bg-red-50 border-red-200' 
                              : 'bg-blue-50 border-blue-200'
                          }`}>
                            <div className="text-2xl mb-2">🌡️</div>
                            <div className="text-sm font-medium">Temperatura</div>
                            <div className={`text-xl font-bold ${
                              currentReading.temperature > 39.0 || currentReading.temperature < 36.0
                                ? 'text-red-600' 
                                : 'text-blue-600'
                            }`}>
                              {currentReading.temperature.toFixed(1)}°C
                            </div>
                          </div>
                          
                          <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                            <div className="text-2xl mb-2">💧</div>
                            <div className="text-sm font-medium">Humedad</div>
                            <div className="text-xl font-bold text-green-600">
                              {currentReading.humidity.toFixed(1)}%
                            </div>
                          </div>
                          
                          <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                            <div className="text-2xl mb-2">📌</div>
                            <div className="text-sm font-medium">Latitud</div>
                            <div className="text-lg font-bold text-purple-600 font-mono">
                              {currentReading.latitude.toFixed(6)}
                            </div>
                          </div>
                          
                          <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                            <div className="text-2xl mb-2">📌</div>
                            <div className="text-sm font-medium">Longitud</div>
                            <div className="text-lg font-bold text-purple-600 font-mono">
                              {currentReading.longitude.toFixed(6)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <div className="text-4xl mb-4">📡</div>
                          <p>No hay datos disponibles</p>
                          <p className="text-sm mt-2">
                            {isSimulationActive 
                              ? 'Los datos aparecerán pronto...' 
                              : 'Inicia la simulación para ver datos'
                            }
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Mapa Simulado */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🗺️</span>
                        Ubicación - San Justo, Santa Fe
                      </h4>
                      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-gray-300 h-48 relative overflow-hidden">
                        {currentReading ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-3xl mb-2">📍</div>
                              <div className="text-sm text-gray-600 font-mono">
                                Lat: {currentReading.latitude.toFixed(6)}
                              </div>
                              <div className="text-sm text-gray-600 font-mono">
                                Long: {currentReading.longitude.toFixed(6)}
                              </div>
                              <div className="text-xs text-green-600 mt-2 font-semibold">
                                🟢 EN SAN JUSTO, SANTA FE
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                              <div className="text-4xl mb-2">🌎</div>
                              <p className="text-sm">Esperando datos de ubicación</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Pestaña: Historial */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>📋</span>
                  Historial de Transacciones ({transactionHistory.length})
                </h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {transactionHistory.length > 0 ? (
                    transactionHistory.map((tx, index) => (
                      <div 
                        key={index} 
                        className={`p-4 border rounded-lg ${
                          tx.isReal 
                            ? 'border-green-300 bg-green-50' 
                            : tx.type.includes('DEVICE_LINK') 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={
                                tx.type.includes('DEVICE_LINK') ? 'text-blue-600' : 'text-green-600'
                              }>
                                {tx.type.includes('DEVICE_LINK') ? '🔗' : '📡'}
                              </span>
                              <span className={`font-semibold ${
                                tx.isReal ? 'text-green-800' : 
                                tx.type.includes('DEVICE_LINK') ? 'text-blue-800' : 'text-green-800'
                              }`}>
                                {tx.type.includes('REAL') ? 'REAL - ' : ''}
                                {tx.type.includes('DEVICE_LINK') ? 'Vinculación' : 'Lectura IoT'}
                                {tx.isReal && ' 🚀'}
                              </span>
                              {tx.isReal && (
                                <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                                  REAL
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Animal #{tx.animalId} 
                              {tx.deviceId && ` • ${tx.deviceId}`}
                              {tx.peso && ` • ${tx.peso}kg`}
                            </p>
                            <p className="text-xs text-gray-500 font-mono mt-1">
                              {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                              {!tx.isReal && ' (simulada)'}
                            </p>
                          </div>
                          <span className="text-xs text-gray-500">{tx.timestamp}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
                      <div className="text-4xl mb-3">📝</div>
                      <p className="text-sm">No hay transacciones registradas</p>
                      <p className="text-xs mt-1">
                        Las transacciones aparecerán al vincular dispositivos y enviar datos
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Alertas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span>🚨</span>
                    Alertas ({alerts.length})
                  </h4>
                  <button
                    onClick={clearAlerts}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
                
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {alerts.length > 0 ? (
                    alerts.map((alert, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg text-sm ${
                          alert.includes('❌') 
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : alert.includes('⚠️') || alert.includes('🚨')
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : alert.includes('🚀') || alert.includes('REAL')
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                        }`}
                      >
                        {alert}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
                      <div className="text-2xl mb-2">✅</div>
                      <p className="text-sm">No hay alertas</p>
                    </div>
                  )}
                </div>

                {/* Botón para transacción real */}
                {hasWallet && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                      <span>🚀</span>
                      Transacción Real
                    </h4>
                    <p className="text-yellow-700 text-sm mb-3">
                      ¿Listo para enviar una transacción REAL a StarkNet?
                    </p>
                    <button
                      onClick={() => {
                        if (linkedAnimals.length > 0) {
                          const animalId = linkedAnimals[0];
                          const deviceId = iotDevices.get(animalId);
                          if (deviceId) {
                            sendRealTransaction(animalId, deviceId);
                          }
                        } else {
                          alert('Primero vincula un dispositivo');
                        }
                      }}
                      className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                    >
                      Enviar Transacción Real
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}