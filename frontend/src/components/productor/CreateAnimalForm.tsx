// src/components/productor/CreateAnimalForm.tsx - ARCHIVO PRINCIPAL ACTUALIZADO Y CORREGIDO
'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';
import { RazaAnimal } from '@/contracts/config';
import { TransactionRecoveryTab } from './TransactionRecoveryTab';
import { cacheService } from '@/services/CacheService'; // ✅ IMPORTAR EL NUEVO SERVICIO



// ✅ FUNCIÓN PARA CONVERTIR BIGINT A STRING
const convertBigIntToString = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }
  
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = convertBigIntToString(obj[key]);
    }
    return newObj;
  }
  
  return obj;
};

export function CreateAnimalForm() {
  const { address, isConnected, contractService } = useStarknet();
  const [raza, setRaza] = useState<RazaAnimal>(RazaAnimal.ANGUS);
  const [peso, setPeso] = useState<string>('');
  const [fechaNacimiento, setFechaNacimiento] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnimalId, setLastAnimalId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [isWaitingConfirmation, setIsWaitingConfirmation] = useState(false);
  const [animalDataFromStarknet, setAnimalDataFromStarknet] = useState<any>(null);
  
  // ✅ CAMPOS DEL FORMULARIO COMPLETOS
  const [nombre, setNombre] = useState<string>('');
  const [genero, setGenero] = useState<string>('M');
  const [alimentacion, setAlimentacion] = useState<string>('P');
  const [numeroIdentificacion, setNumeroIdentificacion] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

  // Estado para cache
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [cacheAvailable, setCacheAvailable] = useState<boolean>(false);
  const [cacheLoading, setCacheLoading] = useState<boolean>(true);
  const [nextAnimalNumber, setNextAnimalNumber] = useState<number>(1);

  // ✅ NUEVO ESTADO: Para controlar la pestaña activa
  const [activeTab, setActiveTab] = useState<'create' | 'recovery'>('create');

  // Verificar salud del cache al montar
  useEffect(() => {
    checkCacheHealth();
  }, []);

  const checkCacheHealth = async () => {
    setCacheLoading(true);
    try {
      const health = await cacheService.healthCheck();
      const isHealthy = health.status === 'ok' || health.status === 'healthy';
      setCacheAvailable(isHealthy);
      
      if (isHealthy) {
        await loadCacheStats();
      }
    } catch (error) {
      setCacheAvailable(false);
    }
    setCacheLoading(false);
  };

  const loadCacheStats = async () => {
    try {
      const stats = await cacheService.getStats();
      if (stats) {
        setCacheStats(stats);
        
        // Manejar diferentes formatos de estadísticas
        const totalAnimals = stats.total_animals || stats.summary?.total_animals || 0;
        setNextAnimalNumber(totalAnimals + 1);
      }
    } catch (error) {
      console.warn('Error cargando estadísticas del cache');
    }
  };

  // ✅ FUNCIÓN: Generar metadata hash válido para felt252
  const generateMetadataHash = (): string => {
    const seed = `${nombre}${raza}${genero}${alimentacion}${color}${Date.now()}`;
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const hexString = Math.abs(hash).toString(16).padStart(10, '0');
    return '0x' + hexString;
  };

  // ✅ FUNCIÓN CORREGIDA: Crear animal en cache con datos REALES de Starknet
  const createAnimalInCache = async (animalId: string, txHash: string, tipo: 'simple' | 'completo', starknetData: any) => {
    if (!cacheAvailable) return;

    const processedStarknetData = convertBigIntToString(starknetData);

    const animalData = {
      id: animalId,
      metadata_hash: tipo === 'completo' ? generateMetadataHash() : '0x0',
      raza: raza,
      fecha_nacimiento: tipo === 'completo' ? Math.floor(new Date(fechaNacimiento).getTime() / 1000) : 0,
      peso_inicial: tipo === 'completo' ? parseInt(peso) : 0,
      propietario_actual: address,
      estado: 'activo',
      fecha_creacion: Math.floor(Date.now() / 1000),
      tx_hash: txHash,
      
      nombre: nombre || `Animal #${animalId}`,
      genero: genero,
      alimentacion: alimentacion,
      numero_identificacion: numeroIdentificacion || `ID-${animalId}`,
      color: color,
      observaciones: observaciones,
      
      starknet_data: processedStarknetData
    };

    console.log('💾 Guardando en cache con datos procesados:', animalData);
    const result = await cacheService.addAnimal(animalData);
    
    if (result && result.success) {
      console.log('✅ Animal guardado exitosamente en cache');
    } else {
      console.log('❌ Error guardando animal en cache:', result);
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Guardar transacción en cache (SIN contractAddress privado)
  const saveTransactionToCache = async (txData: {
    hash: string;
    tipo: string;
    from: string;
    to: string;
    data: any;
    estado?: 'pendiente' | 'completada' | 'fallida';
  }) => {
    if (!cacheAvailable) return;

    try {
      // ✅ CORREGIDO: No usar contractAddress privado, usar identificador
      const txDataSafe = {
        ...txData,
        to: 'animal-contract' // ✅ Usar identificador en lugar de contractAddress privado
      };

      const result = await cacheService.guardarTransaccion(txDataSafe);
      if (result && result.success) {
        console.log('✅ Transacción guardada en cache');
      } else {
        console.log('❌ Error guardando transacción en cache');
      }
    } catch (error) {
      console.warn('Error guardando transacción en cache:', error);
    }
  };

  // ✅ FUNCIÓN: Obtener datos REALES del animal de Starknet
  const getAnimalDataFromStarknet = async (animalId: bigint) => {
    if (!contractService) {
      throw new Error('Servicio de contrato no disponible');
    }

    console.log(`📖 Obteniendo datos REALES del animal #${animalId} desde Starknet...`);
    
    try {
      const animalData = await contractService.getAnimalData(animalId);
      console.log('📊 Datos obtenidos de Starknet:', animalData);

      const completeAnimalData = {
        ...animalData,
        animalId: animalId
      };

      setAnimalDataFromStarknet(completeAnimalData);
      return completeAnimalData;

    } catch (error: any) {
      console.error(`❌ Error obteniendo datos de Starknet para animal ${animalId}:`, error);
      throw new Error(`No se pudieron obtener los datos del animal desde Starknet: ${error.message}`);
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Crear animal en Starknet Y Cache con datos REALES
  const createAnimalWithStarknet = async (tipo: 'simple' | 'completo') => {
    if (!isConnected || !address || !contractService) {
      setError('Wallet no conectada o servicio no disponible');
      return;
    }

    setIsLoading(true);
    setError('');
    setTxHash('');
    setIsWaitingConfirmation(false);
    setLastAnimalId(null);
    setAnimalDataFromStarknet(null);

    try {
      console.log(`🚀 Creando animal ${tipo} en Starknet y Cache...`);
      
      let metadataHash = '0x0';
      let fechaTimestamp = 0;
      let pesoBigInt = BigInt(0);

      if (tipo === 'completo') {
        if (!fechaNacimiento) {
          throw new Error('La fecha de nacimiento es requerida');
        }
        
        const fechaDate = new Date(fechaNacimiento);
        if (isNaN(fechaDate.getTime())) {
          throw new Error('Fecha de nacimiento inválida');
        }
        fechaTimestamp = Math.floor(fechaDate.getTime() / 1000);
        
        if (!peso) {
          throw new Error('El peso es requerido');
        }
        
        const pesoNum = parseInt(peso);
        if (isNaN(pesoNum) || pesoNum < 1 || pesoNum > 2000) {
          throw new Error('Peso debe ser entre 1 y 2000 kg');
        }
        pesoBigInt = BigInt(pesoNum);
        
        metadataHash = generateMetadataHash();
      }

      // 1. EJECUTAR EN STARKNET
      console.log('⛓️ Ejecutando en Starknet...');
      let result;
      if (tipo === 'simple') {
        result = await contractService.createAnimalSimple(raza);
      } else {
        result = await contractService.createAnimal(metadataHash, raza, fechaTimestamp, pesoBigInt);
      }
      
      setTxHash(result.txHash);
      setIsWaitingConfirmation(true);
      console.log('📨 Transacción enviada a Starknet:', result.txHash);
      
      // ✅ CORREGIDO: Guardar transacción en cache como pendiente (SIN contractAddress privado)
      await saveTransactionToCache({
        hash: result.txHash,
        tipo: 'CrearAnimal',
        from: address,
        to: 'animal-contract', // ✅ Usar identificador en lugar de contractAddress privado
        data: { tipo, raza, animalId: result.animalId?.toString() },
        estado: 'pendiente'
      });

      // 2. Esperar confirmación de blockchain
      console.log('⏳ Esperando confirmación de Starknet...');
      await contractService.waitForTransaction(result.txHash);
      console.log('✅ Transacción confirmada en Starknet');

      // Actualizar transacción en cache como completada
      await cacheService.actualizarEstadoTransaccion(result.txHash, 'completada');

      // 3. ✅ OBTENER DATOS REALES DEL ANIMAL DE STARKNET
      if (result.animalId) {
        console.log('🔍 Obteniendo datos REALES del animal desde Starknet...');
        const starknetAnimalData = await getAnimalDataFromStarknet(result.animalId);
        console.log('📊 Datos REALES obtenidos de Starknet:', starknetAnimalData);

        // 4. Crear animal en cache con datos REALES de Starknet
        if (cacheAvailable) {
          console.log('💾 Guardando en cache con datos REALES de Starknet...');
          await createAnimalInCache(result.animalId.toString(), result.txHash, tipo, starknetAnimalData);
        }

        setLastAnimalId(result.animalId.toString());
        console.log('✅ Animal creado exitosamente con datos REALES!');
      }

      setIsWaitingConfirmation(false);
      
      await loadCacheStats();
      limpiarFormulario();

    } catch (error: any) {
      console.error('❌ Error creando animal:', error);
      
      // Actualizar transacción en cache como fallida
      if (txHash) {
        await cacheService.actualizarEstadoTransaccion(txHash, 'fallida');
      }
      
      if (error.message.includes('Failed to deserialize param')) {
        setError('Error en parámetros del contrato. Verifica los datos.');
      } else if (error.message.includes('AccessControl')) {
        setError('No tienes permisos de PRODUCTOR para crear animales.');
      } else if (error.message.includes('metadata hash')) {
        setError('Error en el formato de metadata. Intenta nuevamente.');
      } else if (error.message.includes('user rejected')) {
        setError('Transacción rechazada por el usuario.');
      } else if (error.message.includes('No se pudieron obtener los datos')) {
        setError(`Animal creado pero error obteniendo datos: ${error.message}`);
      } else {
        setError(`Error: ${error.message}`);
      }
      
      setIsWaitingConfirmation(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FUNCIONES DE LOS BOTONES
  const handleCreateSimple = async () => {
    await createAnimalWithStarknet('simple');
  };

  const handleCreateComplete = async () => {
    if (!peso || !fechaNacimiento) {
      setError('Para creación completa se requieren peso y fecha de nacimiento');
      return;
    }
    await createAnimalWithStarknet('completo');
  };

  const limpiarFormulario = () => {
    setNombre('');
    setPeso('');
    setFechaNacimiento('');
    setGenero('M');
    setAlimentacion('P');
    setNumeroIdentificacion('');
    setColor('');
    setObservaciones('');
  };

  const getRazaNombre = (raza: RazaAnimal): string => {
    switch (raza) {
      case RazaAnimal.ANGUS: return 'Angus';
      case RazaAnimal.HEREFORD: return 'Hereford';
      case RazaAnimal.BRANGUS: return 'Brangus';
      default: return 'Desconocida';
    }
  };

  const getEstadoNombre = (estado: number): string => {
    switch (estado) {
      case 0: return 'Creado';
      case 1: return 'Procesado';
      case 2: return 'Certificado';
      case 3: return 'Exportado';
      default: return 'Desconocido';
    }
  };

  // ✅ FUNCIÓN: Diagnóstico completo del cache
  const runCacheDiagnostic = async () => {
    setCacheLoading(true);
    try {
      const diagnostic = await cacheService.fullDiagnostic();
      console.log('🔍 Diagnóstico completo:', diagnostic);
      
      if (diagnostic.status === 'connected') {
        setCacheAvailable(true);
        setCacheStats(diagnostic.stats);
        setNextAnimalNumber(diagnostic.totalAnimals + 1);
      } else {
        setCacheAvailable(false);
      }
    } catch (error) {
      console.error('Error en diagnóstico:', error);
      setCacheAvailable(false);
    }
    setCacheLoading(false);
  };

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
        <p className="text-yellow-700">Conecta tu wallet para crear animales</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
        <span className="text-3xl">🐄</span>
        Gestión de Animales
      </h3>

      {/* ✅ PESTAÑAS PRINCIPALES */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            activeTab === 'create'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🚀 Crear Animal
        </button>
        <button
          onClick={() => setActiveTab('recovery')}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
            activeTab === 'recovery'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🔄 Recuperar Transacción
        </button>
      </div>

      {/* Estado del Cache */}
      <div className={`border rounded-xl p-4 mb-6 ${
        cacheAvailable ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2 ${
              cacheAvailable ? 'text-green-800' : 'text-yellow-800'
            }">
              <span className={cacheAvailable ? 'text-green-500' : 'text-yellow-500'}>
                {cacheAvailable ? '💾' : '⚠️'}
              </span>
              {cacheAvailable ? 'Cache Conectado ✅' : 'Cache No Disponible'}
            </h4>
            <div className="text-sm space-y-1 ${
              cacheAvailable ? 'text-green-700' : 'text-yellow-700'
            }">
              {cacheLoading ? (
                <p>Cargando estadísticas del cache...</p>
              ) : cacheAvailable ? (
                <>
                  <p><strong>Animales en cache:</strong> {cacheStats?.total_animals || cacheStats?.summary?.total_animals || '0'}</p>
                  <p><strong>Próximo animal:</strong> #{nextAnimalNumber}</p>
                  <p><strong>Transacciones:</strong> {cacheStats?.total_transactions || cacheStats?.summary?.total_transactions || '0'}</p>
                  <p><strong>URL:</strong> {cacheService.getBaseURL()}</p>
                </>
              ) : (
                <p>El servidor de cache no está disponible. Los animales solo se guardarán en Starknet.</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={checkCacheHealth}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              🔄 Reintentar
            </button>
            <button
              onClick={runCacheDiagnostic}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors"
            >
              🔍 Diagnosticar
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO DE PESTAÑAS */}
      {activeTab === 'create' ? (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-700 font-semibold">Error:</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {txHash && (
            <div className={`border rounded-xl p-4 mb-6 ${
              isWaitingConfirmation 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <p className={`font-semibold ${
                isWaitingConfirmation ? 'text-blue-700' : 'text-green-700'
              }`}>
                {isWaitingConfirmation ? '⏳ Transacción Enviada a Starknet' : '✅ Transacción Confirmada en Starknet'}
              </p>
              <p className={`text-sm mt-1 break-all ${
                isWaitingConfirmation ? 'text-blue-600' : 'text-green-600'
              }`}>
                Hash: {txHash}
              </p>
              {!isWaitingConfirmation && cacheAvailable && (
                <p className="text-green-600 text-xs mt-2">
                  ✅ Datos REALES obtenidos de Starknet y guardados en cache
                </p>
              )}
            </div>
          )}

          {lastAnimalId && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-700 font-semibold text-lg">
                ✅ ¡Animal creado exitosamente!
              </p>
              <p className="text-green-600 text-sm mt-1">
                ID del animal: <strong>#{lastAnimalId}</strong>
              </p>
              {animalDataFromStarknet && (
                <div className="mt-2 p-3 bg-green-100 rounded-lg border border-green-200">
                  <p className="text-green-800 font-semibold text-sm">📊 Datos REALES de Starknet:</p>
                  <div className="text-green-700 text-xs mt-1 space-y-1">
                    <p><strong>Estado:</strong> {getEstadoNombre(animalDataFromStarknet.estado)}</p>
                    <p><strong>Propietario:</strong> {animalDataFromStarknet.propietario?.slice(0, 10)}...</p>
                    {animalDataFromStarknet.fechaCreacion && (
                      <p><strong>Creado:</strong> {new Date(Number(animalDataFromStarknet.fechaCreacion) * 1000).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}
              <p className="text-green-500 text-xs mt-2">
                📝 Guardado en Starknet {cacheAvailable && 'y Cache con datos REALES'}
              </p>
            </div>
          )}

          {/* FORMULARIO DE CREACIÓN */}
          <div className="space-y-6">
            {/* Información Básica */}
            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
              <h4 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                📝 Información Básica
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Animal *
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Torito, Vaca Lola"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                {/* Número de Identificación */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Identificación
                  </label>
                  <input
                    type="text"
                    value={numeroIdentificacion}
                    onChange={(e) => setNumeroIdentificacion(e.target.value)}
                    placeholder="Ej: ARE123, CHA456"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Raza */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raza *
                  </label>
                  <select
                    value={raza}
                    onChange={(e) => setRaza(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value={RazaAnimal.ANGUS}>Angus</option>
                    <option value={RazaAnimal.HEREFORD}>Hereford</option>
                    <option value={RazaAnimal.BRANGUS}>Brangus</option>
                  </select>
                </div>

                {/* Género */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Género *
                  </label>
                  <select
                    value={genero}
                    onChange={(e) => setGenero(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="M">Macho</option>
                    <option value="H">Hembra</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Información Física */}
            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
              <h4 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                📊 Información Física
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Peso */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso (kg) *
                  </label>
                  <input
                    type="number"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    placeholder="Ej: 450"
                    min="1"
                    max="2000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Fecha de Nacimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Nacimiento *
                  </label>
                  <input
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Ej: Negro, Colorado, Blanco"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Información de Alimentación y Observaciones */}
            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
              <h4 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                🌱 Alimentación y Observaciones
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de Alimentación */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Alimentación *
                  </label>
                  <select
                    value={alimentacion}
                    onChange={(e) => setAlimentacion(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="P">Pastura</option>
                    <option value="G">Granos</option>
                    <option value="M">Mixto</option>
                    <option value="S">Suplementado</option>
                  </select>
                </div>

                {/* Observaciones */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Notas adicionales sobre el animal..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={handleCreateSimple}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>⏳ Creando...</>
                ) : (
                  <>🚀 Crear Animal Simple</>
                )}
              </button>

              <button
                onClick={handleCreateComplete}
                disabled={isLoading || !peso || !fechaNacimiento}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>⏳ Creando...</>
                ) : (
                  <>📋 Crear Animal Completo</>
                )}
              </button>

              <button
                onClick={limpiarFormulario}
                disabled={isLoading}
                className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                🗑️ Limpiar
              </button>
            </div>

            {/* Información Adicional */}
            <div className="text-xs text-gray-500 space-y-1 border-t pt-4">
              <p><strong>Animal Simple:</strong> Solo guarda raza en Starknet (más rápido, menos costo)</p>
              <p><strong>Animal Completo:</strong> Guarda todos los datos en Starknet + Cache (más información)</p>
              <p><strong>* Campos requeridos</strong> para creación completa</p>
            </div>
          </div>
        </>
      ) : (
        /* ✅ PESTAÑA DE RECUPERACIÓN */
        <TransactionRecoveryTab />
      )}
    </div>
  );
}