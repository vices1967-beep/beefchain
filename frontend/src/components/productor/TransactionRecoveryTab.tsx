// src/components/productor/TransactionRecoveryTab.tsx - VERSIÓN COMPLETA MEJORADA
'use client';

import { useState } from 'react';
import { useStarknet } from '@/providers/starknet-provider';
import { RazaAnimal } from '@/contracts/config';
import { cacheService } from '@/services/CacheService';

const convertBigIntToString = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(convertBigIntToString);
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = convertBigIntToString(obj[key]);
    }
    return newObj;
  }
  return obj;
};

export function TransactionRecoveryTab() {
  const { contractService } = useStarknet();
  const [missingTxHash, setMissingTxHash] = useState<string>('0x7d75f6c8cb306bca3d79015c86f5f40b047891176b9fdc6a9063f7477daf4df');
  const [blockNumber, setBlockNumber] = useState<string>('');
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const [recoveryResult, setRecoveryResult] = useState<string>('');
  const [recoveredAnimalId, setRecoveredAnimalId] = useState<string>('');
  const [txDetails, setTxDetails] = useState<any>(null);

  // ✅ FUNCIÓN: Debuggear endpoints de cache
  const debugCacheEndpoints = async () => {
    console.log('🔍 Debuggeando endpoints de cache...');
    setRecoveryResult('🔍 Debuggeando endpoints de cache...');
    
    try {
      const diagnostic = await cacheService.fullDiagnostic();
      console.log('📊 Diagnóstico completo:', diagnostic);
      
      let resultText = '🔍 DIAGNÓSTICO DE ENDPOINTS:\n\n';
      
      diagnostic.endpointTests?.forEach((test: any) => {
        resultText += `${test.endpoint}: ${test.success ? '✅ FUNCIONA' : '❌ FALLA'}\n`;
        if (test.error) {
          resultText += `   Error: ${test.error}\n`;
        }
        if (test.serverError) {
          resultText += `   Error del servidor: ${test.serverError}\n`;
        }
        resultText += '\n';
      });
      
      resultText += `📊 Estadísticas: ${JSON.stringify(diagnostic.stats?.summary, null, 2)}\n`;
      resultText += `🔄 Estado: ${diagnostic.status}\n`;
      resultText += `🌐 URL: ${diagnostic.baseURL}`;
      
      setRecoveryResult(resultText);
      
    } catch (error: any) {
      setRecoveryResult(`❌ Error en diagnóstico: ${error.message}`);
    }
  };

  // ✅ FUNCIÓN: Verificar conexión con cache usando el nuevo servicio
  const testCacheConnection = async () => {
    console.log('🔍 [RECOVERY] Probando conexión con cache...');
    setRecoveryResult('🔍 Probando conexión con cache...');
    
    try {
      // Usar el método de conexión automática del nuevo servicio
      const connected = await cacheService.autoConnect();
      
      if (connected) {
        const currentURL = cacheService.getBaseURL();
        const health = await cacheService.healthCheck();
        
        setRecoveryResult(`✅ Conexión con cache: FUNCIONA\nURL: ${currentURL}\nEstado: ${health?.status || 'healthy'}`);
        console.log('✅ [RECOVERY] Cache disponible:', health);
      } else {
        const connectionTest = await cacheService.testConnection();
        setRecoveryResult(`❌ Conexión con cache: FALLÓ\n\nServidores probados:\n${connectionTest.results.map((r: any) => `• ${r.url}: ${r.status}`).join('\n')}`);
        console.warn('❌ [RECOVERY] Cache no disponible');
      }
    } catch (error: any) {
      setRecoveryResult('❌ Error probando conexión: ' + error.message);
      console.error('❌ [RECOVERY] Error probando conexión:', error);
    }
  };

  // ✅ FUNCIÓN: Obtener datos REALES del animal de Starknet
  const getAnimalDataFromStarknet = async (animalId: bigint) => {
    if (!contractService) {
      throw new Error('Servicio de contrato no disponible');
    }

    try {
      const animalData = await contractService.getAnimalData(animalId);
      console.log(`✅ [DEBUG] Datos procesados animal #${animalId}:`, animalData);
      return {
        ...animalData,
        animalId: animalId
      };
    } catch (error: any) {
      throw new Error(`No se pudieron obtener los datos del animal desde Starknet: ${error.message}`);
    }
  };

  // ✅ FUNCIÓN MEJORADA: Recuperar transacción perdida y guardar en cache
  const recoverMissingTransaction = async () => {
    if (!contractService || !missingTxHash) {
      setRecoveryResult('❌ Servicio de contrato no disponible o hash inválido');
      return;
    }

    setIsRecovering(true);
    setRecoveryResult('');
    setRecoveredAnimalId('');
    setTxDetails(null);

    try {
      console.log(`🔍 [RECOVERY] Recuperando transacción: ${missingTxHash}`);
      setRecoveryResult('🔍 Iniciando recuperación...');
      
      // Primero verificar conexión con cache usando el nuevo servicio
      setRecoveryResult('🏥 Verificando conexión con cache...');
      const cacheHealth = await cacheService.healthCheck();
      if (!cacheHealth || !(cacheHealth.status === 'healthy' || cacheHealth.status === 'ok')) {
        setRecoveryResult('❌ El servidor de cache no está disponible.\nEstado: ' + (cacheHealth?.status || 'unknown'));
        setIsRecovering(false);
        return;
      }
      
      setRecoveryResult('✅ Cache disponible. Buscando animales en Starknet...');
      
      // ✅ BUSCAR animales por transacción
      const animalIds = await contractService.findAnimalsByTransaction(missingTxHash);
      
      if (animalIds.length > 0) {
        console.log(`🎯 [RECOVERY] ${animalIds.length} animales encontrados en transacción:`, animalIds);
        setRecoveryResult(`🎯 ${animalIds.length} animal(es) encontrado(s) en la transacción...`);
        
        let animalsRecovered = 0;
        let animalsSkipped = 0;
        let animalsFailed = 0;

        for (const animalId of animalIds) {
          try {
            const animalIdStr = animalId.toString();
            setRecoveredAnimalId(animalIdStr);
            
            // Obtener datos REALES del animal
            const animalData = await getAnimalDataFromStarknet(animalId);
            
            // Verificar si ya existe en cache
            const existingAnimal = await cacheService.getAnimalById(animalIdStr);
            
            if (existingAnimal && existingAnimal.success) {
              setRecoveryResult(prev => prev + `\nℹ️ Animal #${animalIdStr} ya existe en cache`);
              animalsSkipped++;
            } else {
              setRecoveryResult(prev => prev + `\n💾 Guardando animal #${animalIdStr} en cache...`);
              
              // ✅ CREAR DATOS SIMPLIFICADOS para evitar errores del servidor
              const animalCacheData = {
                id: animalIdStr,
                nombre: `Animal Recuperado #${animalIdStr}`,
                propietario_actual: animalData.propietario || '0x0',
                raza: animalData.raza || RazaAnimal.ANGUS,
                estado: 'activo',
                fecha_creacion: Math.floor(Date.now() / 1000),
                tx_hash: missingTxHash,
                
                // Campos opcionales - solo si son necesarios
                genero: 'M',
                alimentacion: 'P',
                metadata_hash: '0x0',
                numero_identificacion: `REC-${animalIdStr}`,
                
                // Datos de Starknet para referencia
                starknet_data: convertBigIntToString(animalData)
              };

              console.log(`📤 Enviando datos simplificados para animal #${animalIdStr}:`, animalCacheData);
              
              const result = await cacheService.addAnimal(animalCacheData);
              
              if (result && result.success) {
                setRecoveryResult(prev => prev + `\n✅ Animal #${animalIdStr} recuperado exitosamente`);
                animalsRecovered++;
              } else {
                const errorMsg = result?.error || result?.serverError || 'Error desconocido';
                setRecoveryResult(prev => prev + `\n❌ Error guardando animal #${animalIdStr}: ${errorMsg}`);
                animalsFailed++;
              }
            }
          } catch (animalError: any) {
            console.error(`[RECOVERY] Error procesando animal ${animalId}:`, animalError);
            setRecoveryResult(prev => prev + `\n⚠️ Error procesando animal #${animalId}: ${animalError.message}`);
            animalsFailed++;
          }
        }

        // Resumen final
        setRecoveryResult(prev => prev + `\n\n🎉 PROCESO COMPLETADO:`);
        setRecoveryResult(prev => prev + `\n✅ ${animalsRecovered} animal(es) recuperado(s)`);
        setRecoveryResult(prev => prev + `\nℹ️ ${animalsSkipped} animal(es) ya existían`);
        setRecoveryResult(prev => prev + `\n❌ ${animalsFailed} animal(es) con errores`);

      } else {
        setRecoveryResult('❌ No se encontraron animales en esta transacción');
      }
    } catch (error: any) {
      console.error('❌ [RECOVERY] Error recuperando transacción:', error);
      setRecoveryResult(`❌ Error: ${error.message}`);
    } finally {
      setIsRecovering(false);
    }
  };

  // ✅ FUNCIÓN MEJORADA: Sincronizar todos los animales del usuario
  const syncAllUserAnimals = async () => {
    if (!contractService) {
      setRecoveryResult('❌ Servicio de contrato no disponible');
      return;
    }

    setIsRecovering(true);
    setRecoveryResult('');

    try {
      console.log('🔄 [RECOVERY] Sincronizando todos los animales del usuario...');
      setRecoveryResult('🔄 Iniciando sincronización completa...');
      
      // Primero verificar conexión con cache
      setRecoveryResult('🏥 Verificando conexión con cache...');
      const cacheHealth = await cacheService.healthCheck();
      if (!cacheHealth || !(cacheHealth.status === 'healthy' || cacheHealth.status === 'ok')) {
        setRecoveryResult('❌ El servidor de cache no está disponible.\nEstado: ' + (cacheHealth?.status || 'unknown'));
        setIsRecovering(false);
        return;
      }

      setRecoveryResult('🔍 Obteniendo animales desde Starknet...');
      
      // Obtener todos los animales del usuario desde Starknet
      const userAddress = contractService.getUserAddress();
      const userAnimals = await contractService.getAnimalsByProducer(userAddress);
      
      console.log(`📊 [RECOVERY] ${userAnimals.length} animales encontrados en Starknet:`, userAnimals);
      setRecoveryResult(`📊 ${userAnimals.length} animales encontrados en Starknet...`);
      
      let animalsSynced = 0;
      let animalsSkipped = 0;
      let animalsFailed = 0;

      // Procesar cada animal
      for (const animalId of userAnimals) {
        try {
          const animalIdStr = animalId.toString();
          setRecoveredAnimalId(animalIdStr);
          
          // Obtener datos REALES del animal
          const animalData = await getAnimalDataFromStarknet(animalId);
          
          // Verificar si ya existe en cache
          const existingAnimal = await cacheService.getAnimalById(animalIdStr);
          
          if (existingAnimal && existingAnimal.success) {
            console.log(`ℹ️ [RECOVERY] Animal #${animalIdStr} ya existe en cache`);
            animalsSkipped++;
          } else {
            console.log(`💾 [RECOVERY] Sincronizando animal #${animalIdStr}...`);
            setRecoveryResult(prev => prev + `\n💾 Sincronizando animal #${animalIdStr}...`);
            
            // ✅ CREAR DATOS SIMPLIFICADOS para evitar errores del servidor
            const animalCacheData = {
              id: animalIdStr,
              nombre: `Animal Sincronizado #${animalIdStr}`,
              propietario_actual: animalData.propietario || contractService.getUserAddress() || '0x0',
              raza: animalData.raza || RazaAnimal.ANGUS,
              estado: 'activo',
              fecha_creacion: Math.floor(Date.now() / 1000),
              tx_hash: 'sync-' + Date.now(),
              
              // Campos opcionales
              genero: 'M',
              alimentacion: 'P',
              metadata_hash: '0x0',
              numero_identificacion: `SYNC-${animalIdStr}`,
              
              // Datos de Starknet para referencia
              starknet_data: convertBigIntToString(animalData)
            };

            console.log(`📤 Enviando datos simplificados para animal #${animalIdStr}:`, animalCacheData);
            
            const result = await cacheService.addAnimal(animalCacheData);
            
            if (result && result.success) {
              setRecoveryResult(prev => prev + `\n✅ Animal #${animalIdStr} sincronizado exitosamente`);
              animalsSynced++;
            } else {
              const errorMsg = result?.error || result?.serverError || 'Error desconocido';
              setRecoveryResult(prev => prev + `\n❌ Error sincronizando animal #${animalIdStr}: ${errorMsg}`);
              animalsFailed++;
            }
          }
        } catch (animalError: any) {
          console.error(`[RECOVERY] Error procesando animal ${animalId}:`, animalError);
          setRecoveryResult(prev => prev + `\n⚠️ Error procesando animal #${animalId}: ${animalError.message}`);
          animalsFailed++;
        }
      }

      // Resumen final
      setRecoveryResult(prev => prev + `\n\n🎉 SINCRONIZACIÓN COMPLETADA:`);
      setRecoveryResult(prev => prev + `\n✅ ${animalsSynced} animales sincronizados`);
      setRecoveryResult(prev => prev + `\nℹ️ ${animalsSkipped} animales ya existían`);
      setRecoveryResult(prev => prev + `\n❌ ${animalsFailed} animales con errores`);
      
    } catch (error: any) {
      console.error('❌ [RECOVERY] Error en sincronización:', error);
      setRecoveryResult(`❌ Error en sincronización: ${error.message}`);
    } finally {
      setIsRecovering(false);
    }
  };

  // ✅ FUNCIÓN: Limpiar formulario
  const clearForm = () => {
    setMissingTxHash('');
    setBlockNumber('');
    setRecoveryResult('');
    setRecoveredAnimalId('');
    setTxDetails(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h4 className="font-semibold text-lg text-blue-800 mb-3 flex items-center gap-2">
          🔄 Recuperar Transacción Perdida
        </h4>
        <p className="text-blue-700 text-sm">
          Recupera animales de transacciones que se ejecutaron en Starknet pero no se guardaron en el cache.
        </p>
      </div>

      {/* ✅ Botón para debuggear endpoints */}
      <div className="border border-red-200 rounded-xl p-5 bg-red-50">
        <h5 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
          🐛 Debug Endpoints
        </h5>
        <p className="text-red-700 text-sm mb-4">
          Debuggear por qué fallan los endpoints de escritura
        </p>
        <button
          onClick={debugCacheEndpoints}
          className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
        >
          🐛 Debug Endpoints
        </button>
      </div>

      {/* ✅ Botón para probar conexión con cache */}
      <div className="border border-orange-200 rounded-xl p-5 bg-orange-50">
        <h5 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
          🔧 Diagnóstico de Conexión
        </h5>
        <p className="text-orange-700 text-sm mb-4">
          Servicio de cache mejorado con conexión automática
        </p>
        <button
          onClick={testCacheConnection}
          className="px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          🔍 Probar Conexión con Cache
        </button>
      </div>

      {/* ✅ Botón de sincronización completa */}
      <div className="border border-purple-200 rounded-xl p-5 bg-purple-50">
        <h5 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
          🔄 Sincronización Completa
        </h5>
        <p className="text-purple-700 text-sm mb-4">
          Sincroniza TODOS tus animales desde Starknet al cache. Útil si faltan animales en la lista.
        </p>
        <button
          onClick={syncAllUserAnimals}
          disabled={isRecovering}
          className="px-6 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isRecovering ? (
            <>⏳ Sincronizando...</>
          ) : (
            <>🔄 Sincronizar Todos mis Animales</>
          )}
        </button>
      </div>

      {/* Formulario de recuperación */}
      <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
        <h5 className="font-semibold text-gray-800 mb-4">📋 Datos de la Transacción</h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hash de Transacción */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hash de Transacción *
            </label>
            <input
              type="text"
              value={missingTxHash}
              onChange={(e) => setMissingTxHash(e.target.value)}
              placeholder="0x7d75f6c8cb306bca3d79015c86f5f40b047891176b9fdc6a9063f7477daf4df"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm"
            />
          </div>

          {/* Botones */}
          <div className="flex items-end gap-3">
            <button
              onClick={recoverMissingTransaction}
              disabled={isRecovering || !missingTxHash}
              className="flex-1 px-6 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isRecovering ? (
                <>⏳ Recuperando...</>
              ) : (
                <>🔍 Recuperar Transacción</>
              )}
            </button>

            <button
              onClick={clearForm}
              disabled={isRecovering}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              🗑️ Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {recoveryResult && (
        <div className={`border rounded-xl p-5 ${
          recoveryResult.includes('✅') || recoveryResult.includes('🎉') 
            ? 'bg-green-50 border-green-200' 
            : recoveryResult.includes('❌') 
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <h5 className="font-semibold mb-3 flex items-center gap-2">
            {recoveryResult.includes('✅') || recoveryResult.includes('🎉') ? '✅' : 
             recoveryResult.includes('❌') ? '❌' : 'ℹ️'} Resultado
          </h5>
          <pre className="text-sm whitespace-pre-wrap font-sans">
            {recoveryResult}
          </pre>
        </div>
      )}

      {/* Información adicional */}
      <div className="text-xs text-gray-500 space-y-2 border-t pt-4">
        <p><strong>💡 Cómo usar:</strong></p>
        <p>1. Primero usa "Debug Endpoints" para ver qué endpoints están funcionando</p>
        <p>2. Usa "Probar Conexión con Cache" para verificar que el servidor esté disponible</p>
        <p>3. Si hay errores, usa "Sincronizar Todos mis Animales" para recuperar todo</p>
        <p>4. Para una transacción específica, ingresa el hash y haz clic en "Recuperar Transacción"</p>
        <p className="text-blue-600"><strong>Características del nuevo servicio:</strong> Conexión automática, reintentos, manejo robusto de errores, debug detallado</p>
      </div>
    </div>
  );
}