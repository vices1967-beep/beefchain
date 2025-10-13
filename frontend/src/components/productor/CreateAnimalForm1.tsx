// src/components/productor/CreateAnimalForm.tsx - VERSIÓN SOLO CACHE
'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';
import { RazaAnimal } from '@/contracts/config';

// Servicio de cache mejorado con manejo de CORS
const CACHE_BASE_URL = 'http://localhost:3001/api';

const CacheService = {
  async makeRequest(endpoint: string, options: RequestInit = {}) {
    try {
      console.log(`🔍 Haciendo request a: ${CACHE_BASE_URL}${endpoint}`);
      const response = await fetch(`${CACHE_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        mode: 'cors',
        credentials: 'omit',
      });
      
      console.log(`🔍 Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`🔍 Response data:`, data);
      return data;
    } catch (error: any) {
      console.log(`❌ Error en makeRequest: ${error.message}`);
      return null;
    }
  },

  async addTransaction(txData: any) {
    console.log('💾 Guardando transacción en cache:', txData);
    return await this.makeRequest('/cache/transaccion', {
      method: 'POST',
      body: JSON.stringify({
        ...txData,
        timestamp: new Date().toISOString()
      })
    });
  },

  async updateTransaction(hash: string, updates: any) {
    console.log('🔄 Actualizando transacción en cache:', hash, updates);
    return await this.makeRequest(`/cache/transaccion/${hash}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString()
      })
    });
  },

  async getStats() {
    console.log('📊 Obteniendo estadísticas del cache...');
    return await this.makeRequest('/cache/stats');
  },

  async addAnimal(animalData: any) {
    console.log('🐄 Agregando animal al cache:', animalData);
    return await this.makeRequest('/cache/animals', {
      method: 'POST',
      body: JSON.stringify(animalData)
    });
  },

  async checkHealth() {
    try {
      console.log('❤️ Verificando salud del cache...');
      const response = await fetch(`${CACHE_BASE_URL}/health`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });
      const isHealthy = response.ok;
      console.log(`❤️ Salud del cache: ${isHealthy ? 'OK' : 'ERROR'}`);
      return isHealthy;
    } catch (error) {
      console.log('❌ Error en checkHealth:', error);
      return false;
    }
  }
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
  
  // Campos reducidos y optimizados
  const [nombre, setNombre] = useState<string>('');
  const [genero, setGenero] = useState<string>('M');
  const [alimentacion, setAlimentacion] = useState<string>('P');

  // Estado para cache
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [cacheAvailable, setCacheAvailable] = useState<boolean>(false);
  const [cacheLoading, setCacheLoading] = useState<boolean>(true);
  const [cacheOperationSuccess, setCacheOperationSuccess] = useState<boolean>(false);

  // Debug para ver las stats que llegan
  useEffect(() => {
    if (cacheStats) {
      console.log('🔍 Debug - cacheStats recibidas:', cacheStats);
      console.log('🔍 Debug - total_animals:', cacheStats.summary?.total_animals);
    }
  }, [cacheStats]);

  // Verificar salud del cache al montar
  useEffect(() => {
    checkCacheHealth();
  }, []);

  const checkCacheHealth = async () => {
    setCacheLoading(true);
    setError('');
    try {
      console.log('🔄 Iniciando verificación de salud del cache...');
      const isHealthy = await CacheService.checkHealth();
      setCacheAvailable(isHealthy);
      
      if (isHealthy) {
        console.log('✅ Cache disponible, cargando estadísticas...');
        await loadCacheStats();
      } else {
        console.log('❌ Cache no disponible');
        setError('El servidor de cache no está disponible. No se pueden crear animales.');
      }
    } catch (error) {
      console.log('❌ Error en checkCacheHealth:', error);
      setCacheAvailable(false);
      setError('Error de conexión con el servidor de cache.');
    }
    setCacheLoading(false);
  };

  const loadCacheStats = async () => {
    console.log('📊 Iniciando carga de estadísticas...');
    const stats = await CacheService.getStats();
    
    if (stats && stats.success) {
      setCacheStats(stats);
      console.log('✅ Stats cargadas correctamente:', stats.summary);
      setCacheOperationSuccess(true);
    } else {
      console.log('❌ No se pudieron cargar las estadísticas del cache');
      setError('No se pudieron cargar las estadísticas del cache.');
      setCacheOperationSuccess(false);
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Generar metadata hash válido para felt252
  const generateMetadataHash = (nombre: string, raza: number, genero: string, alimentacion: string): string => {
    const seed = `${nombre}${raza}${genero}${alimentacion}${Date.now()}`;
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const hexString = Math.abs(hash).toString(16).padStart(10, '0');
    return '0x' + hexString;
  };

  // ✅ FUNCIÓN SOLO CACHE: Crear animal en cache
  const createAnimalInCacheOnly = async (tipo: 'simple' | 'completo'): Promise<string> => {
    if (!cacheAvailable) {
      throw new Error('Cache no disponible');
    }

    // Generar ID único para el animal
    const animalId = `cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const txHash = `cache-tx-${Date.now()}`;

    const animalData = {
      id: animalId,
      metadata_hash: tipo === 'completo' ? generateMetadataHash(nombre, raza, genero, alimentacion) : '0x0',
      raza: raza,
      fecha_nacimiento: tipo === 'completo' ? Math.floor(new Date(fechaNacimiento).getTime() / 1000) : 0,
      peso_inicial: tipo === 'completo' ? parseInt(peso) : 0,
      propietario_actual: address,
      estado: 'activo',
      fecha_creacion: Math.floor(Date.now() / 1000),
      tx_hash: txHash,
      nombre: nombre || `Animal #${animalId}`,
      genero: genero,
      alimentacion: alimentacion
    };

    console.log('🐄 Creando animal solo en cache:', animalData);

    // 1. Registrar transacción pendiente
    await CacheService.addTransaction({
      hash: txHash,
      tipo: tipo === 'simple' ? 'create_animal_simple' : 'create_animal',
      from: address,
      to: 'CACHE_ONLY',
      data: tipo === 'simple' ? 
        { raza: getRazaNombre(raza) } : 
        { 
          metadataHash: animalData.metadata_hash.substring(0, 12) + '...',
          raza: getRazaNombre(raza),
          fechaNacimiento: fechaNacimiento,
          peso: animalData.peso_inicial
        },
      estado: 'pendiente',
      timestamp: new Date().toISOString()
    });

    // 2. Agregar animal al cache
    const animalResult = await CacheService.addAnimal(animalData);
    if (!animalResult) {
      throw new Error('Error al guardar animal en cache');
    }

    // 3. Actualizar transacción como completada
    await CacheService.updateTransaction(txHash, {
      estado: 'completada',
      data: { 
        ...(tipo === 'simple' ? 
          { raza: getRazaNombre(raza), animal_id: animalId } : 
          { 
            metadataHash: animalData.metadata_hash.substring(0, 12) + '...',
            raza: getRazaNombre(raza),
            fechaNacimiento: fechaNacimiento,
            peso: animalData.peso_inicial,
            animal_id: animalId
          }
        )
      }
    });

    return animalId;
  };

  // ✅ FUNCIÓN SOLO CACHE: handleCreateSimple
  const handleCreateSimple = async () => {
    if (!cacheAvailable) {
      setError('Cache no disponible. No se pueden crear animales.');
      return;
    }

    if (!isConnected || !address) {
      setError('Wallet no conectada');
      return;
    }

    setIsLoading(true);
    setError('');
    setTxHash('');
    setIsWaitingConfirmation(false);
    setLastAnimalId(null);

    try {
      console.log('🚀 Creando animal simple SOLO en cache...');
      
      const animalId = await createAnimalInCacheOnly('simple');
      
      setLastAnimalId(animalId);
      setTxHash(`cache-tx-${animalId}`);

      console.log('✅ Animal creado exitosamente en cache! ID:', animalId);
      
      // Recargar estadísticas
      await loadCacheStats();
      limpiarFormulario();

    } catch (error: any) {
      console.error('❌ Error creando animal en cache:', error);
      setError(`Error en cache: ${error.message || 'No se pudo crear el animal'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FUNCIÓN SOLO CACHE: handleCreateComplete
  const handleCreateComplete = async () => {
    if (!cacheAvailable) {
      setError('Cache no disponible. No se pueden crear animales.');
      return;
    }

    if (!isConnected || !address) {
      setError('Wallet no conectada');
      return;
    }

    if (!peso || !fechaNacimiento) {
      setError('Para creación completa se requieren peso y fecha de nacimiento');
      return;
    }

    setIsLoading(true);
    setError('');
    setTxHash('');
    setIsWaitingConfirmation(false);
    setLastAnimalId(null);

    try {
      // ✅ Validaciones
      const fechaDate = new Date(fechaNacimiento);
      if (isNaN(fechaDate.getTime())) {
        throw new Error('Fecha de nacimiento inválida');
      }
      
      const pesoNum = parseInt(peso);
      if (isNaN(pesoNum) || pesoNum < 1 || pesoNum > 2000) {
        throw new Error('Peso debe ser entre 1 y 2000 kg');
      }

      console.log('🚀 Creando animal completo SOLO en cache...');
      
      const animalId = await createAnimalInCacheOnly('completo');
      
      setLastAnimalId(animalId);
      setTxHash(`cache-tx-${animalId}`);

      console.log('✅ Animal completo creado exitosamente en cache! ID:', animalId);
      
      // Recargar estadísticas
      await loadCacheStats();
      limpiarFormulario();

    } catch (error: any) {
      console.error('❌ Error creando animal completo en cache:', error);
      setError(`Error en cache: ${error.message || 'No se pudo crear el animal'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setNombre('');
    setPeso('');
    setFechaNacimiento('');
    setGenero('M');
    setAlimentacion('P');
  };

  const getRazaNombre = (raza: RazaAnimal): string => {
    switch (raza) {
      case RazaAnimal.ANGUS: return 'Angus';
      case RazaAnimal.HEREFORD: return 'Hereford';
      case RazaAnimal.BRANGUS: return 'Brangus';
      default: return 'Desconocida';
    }
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
        Crear Nuevo Animal (Solo Cache)
      </h3>

      {/* Estado del Cache Mejorado */}
      <div className={`border rounded-xl p-4 mb-6 ${
        cacheAvailable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <h4 className="font-semibold mb-2 flex items-center gap-2 ${
          cacheAvailable ? 'text-green-800' : 'text-red-800'
        }">
          <span className={cacheAvailable ? 'text-green-500' : 'text-red-500'}>
            {cacheAvailable ? '💾' : '❌'}
          </span>
          {cacheAvailable ? 'Cache Conectado ✅' : 'Cache No Disponible'}
        </h4>
        <div className="text-sm space-y-1 ${
          cacheAvailable ? 'text-green-700' : 'text-red-700'
        }">
          {cacheLoading ? (
            <p>Cargando estadísticas del cache...</p>
          ) : cacheAvailable ? (
            <>
              <p><strong>Animales en cache:</strong> {cacheStats?.summary?.total_animals ?? '0'}</p>
              <p><strong>Lotes en cache:</strong> {cacheStats?.summary?.total_batches ?? '0'}</p>
              <p><strong>Transacciones:</strong> {cacheStats?.summary?.total_transactions ?? '0'}</p>
              <p className="text-xs mt-2">
                {cacheOperationSuccess ? 
                  '✅ Cache operativo - Los animales se guardarán solo en cache' : 
                  '⚠️ Cache con problemas - Verifica la conexión'}
              </p>
            </>
          ) : (
            <p>El servidor de cache no está disponible. No se pueden crear animales.</p>
          )}
        </div>
        
        <button
          onClick={checkCacheHealth}
          className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          🔄 Reintentar Conexión
        </button>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 font-semibold">Error:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {lastAnimalId && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-green-700 font-semibold text-lg">
            ✅ ¡Animal creado exitosamente en Cache!
          </p>
          <p className="text-green-600 text-sm mt-1">
            ID del animal: <strong>#{lastAnimalId}</strong>
          </p>
          <p className="text-green-500 text-xs mt-2">
            📊 Guardado en cache local (NO en blockchain)
          </p>
        </div>
      )}

      {/* Formulario */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre (Opcional)
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Torito"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isLoading || !cacheAvailable}
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raza del Animal *
            </label>
            <select
              value={raza}
              onChange={(e) => setRaza(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isLoading || !cacheAvailable}
            >
              <option value={RazaAnimal.ANGUS}>Angus</option>
              <option value={RazaAnimal.HEREFORD}>Hereford</option>
              <option value={RazaAnimal.BRANGUS}>Brangus</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Género
            </label>
            <select
              value={genero}
              onChange={(e) => setGenero(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isLoading || !cacheAvailable}
            >
              <option value="M">Macho</option>
              <option value="H">Hembra</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Peso (kg) *
            </label>
            <input
              type="number"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="Ej: 250"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isLoading || !cacheAvailable}
              min="1"
              max="2000"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Nacimiento *
            </label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isLoading || !cacheAvailable}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alimentación
            </label>
            <select
              value={alimentacion}
              onChange={(e) => setAlimentacion(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isLoading || !cacheAvailable}
            >
              <option value="P">Pastura</option>
              <option value="G">Grano</option>
              <option value="M">Mixto</option>
              <option value="O">Orgánico</option>
            </select>
          </div>
        </div>

        {/* Botones de creación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700">Creación Rápida</h4>
            <p className="text-sm text-gray-600">
              Solo raza básica (menos datos en cache)
            </p>
            <button
              onClick={handleCreateSimple}
              disabled={isLoading || !cacheAvailable}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center justify-center font-semibold"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando en Cache...
                </>
              ) : (
                'Crear Animal Simple (Solo Cache)'
              )}
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700">Creación Completa</h4>
            <p className="text-sm text-gray-600">
              Con datos completos en cache
            </p>
            <button
              onClick={handleCreateComplete}
              disabled={isLoading || !cacheAvailable || !peso || !fechaNacimiento}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 transition-colors flex items-center justify-center font-semibold"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando en Cache...
                </>
              ) : (
                'Crear Animal Completo (Solo Cache)'
              )}
            </button>
          </div>
        </div>

        {/* Información de modo cache */}
        <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
            <span className="text-yellow-500">💡</span>
            Modo Solo Cache Activado
          </h4>
          <div className="text-sm text-yellow-700 space-y-1">
            <p><strong>Los animales se guardan solo en cache local</strong></p>
            <p>No se ejecutan transacciones en Starknet hasta que el cache esté completamente verificado.</p>
            <p className="text-xs mt-2">🔧 Esta es una medida temporal para asegurar la conexión del cache.</p>
          </div>
        </div>
      </div>
    </div>
  );
}