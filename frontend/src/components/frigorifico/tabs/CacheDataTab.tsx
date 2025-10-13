// src/components/frigorifico/tabs/CacheDataTab.tsx - VERSIÓN CORREGIDA
'use client';

import { useState, useEffect } from 'react';
import { ROLES, ROLE_DISPLAY_NAMES, RazaAnimal, EstadoAnimal } from '@/contracts/config';

interface CacheDataTabProps {
  contractService: any;
  address: string;
  isAdmin?: boolean;
}

interface AnimalData {
  id: bigint;
  raza: number;
  fechaNacimiento: bigint;
  peso: bigint;
  estado: number;
  propietario: string;
  frigorifico: string;
  certificador: string;
  exportador: string;
  lote_id: number;
}

interface BatchData {
  id: bigint;
  propietario: string;
  frigorifico: string;
  fecha_creacion: bigint;
  fecha_transferencia: bigint;
  fecha_procesamiento: bigint;
  estado: number;
  cantidad_animales: number;
  peso_total: bigint;
  animal_ids: bigint[];
}

interface RoleData {
  account: string;
  role: string;
  nombre?: string;
  direccion?: string;
  fecha_registro?: string;
  activo?: boolean;
  metadata?: string;
}

interface SystemStats {
  total_animals_created: bigint;
  total_batches_created: bigint;
  total_cortes_created: bigint;
  processed_animals: bigint;
  next_token_id: bigint;
  next_batch_id: bigint;
  next_lote_id: bigint;
}

export function CacheDataTab({ contractService, address, isAdmin = false }: CacheDataTabProps) {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [animals, setAnimals] = useState<AnimalData[]>([]);
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [roles, setRoles] = useState<{[key: string]: RoleData[]}>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, type: '' });

  // 🔧 FUNCIÓN PARA LIMPIAR DATOS (SERIALIZAR BIGINT)
  const cleanDataForCache = (data: any): any => {
    if (data === null || data === undefined) {
      return data;
    }
    
    if (typeof data === 'bigint') {
      return data.toString();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => cleanDataForCache(item));
    }
    
    if (typeof data === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        cleaned[key] = cleanDataForCache(value);
      }
      return cleaned;
    }
    
    return data;
  };

  // 🔧 FUNCIÓN ESPECÍFICA PARA LIMPIAR ANIMALES
  const cleanAnimalData = (animal: AnimalData): any => {
    try {
      const animalId = animal.id?.toString() || 'unknown';
      
      if (!animalId || animalId === 'unknown') {
        console.warn('⚠️ Animal con ID inválido:', animal);
        return null;
      }

      const cleanedData = {
        id: animalId,
        raza: animal.raza || 0,
        raza_nombre: getRazaAnimal(animal.raza || 0),
        fecha_nacimiento: animal.fechaNacimiento?.toString() || '0',
        peso_inicial: animal.peso?.toString() || '0',
        propietario_actual: animal.propietario || '0x0',
        estado: getEstadoAnimal(animal.estado || 0).toLowerCase(),
        estado_numero: animal.estado || 0,
        frigorifico: animal.frigorifico || '0x0',
        certificador: animal.certificador || '0x0',
        exportador: animal.exportador || '0x0',
        lote_id: animal.lote_id || 0,
        nombre: `Animal #${animalId}`,
        genero: 'M',
        alimentacion: 'P',
        numero_identificacion: `STARK-${animalId}`,
        color: 'Desconocido',
        observaciones: 'Sincronizado desde StarkNet (Modo Admin)',
        starknet_data: JSON.stringify(cleanDataForCache(animal)),
        fecha_creacion: Math.floor(Date.now() / 1000).toString(),
        fecha_actualizacion: new Date().toISOString(),
        metadata_hash: 'sync_from_starknet_admin'
      };

      if (!cleanedData.propietario_actual || cleanedData.propietario_actual === '0x0') {
        console.warn(`⚠️ Animal ${animalId} sin propietario válido`);
      }

      return cleanedData;
      
    } catch (error) {
      console.error('❌ Error limpiando datos de animal:', error, animal);
      return null;
    }
  };

  // 🔧 FUNCIÓN ESPECÍFICA PARA LIMPIAR LOTES
  const cleanBatchData = (batch: BatchData): any => {
    try {
      const batchId = batch.id?.toString() || 'unknown';
      
      if (!batchId || batchId === 'unknown' || batchId === '0') {
        console.warn('⚠️ Lote con ID inválido:', batch);
        return null;
      }

      const cleanedData = {
        id: batchId,
        propietario: batch.propietario || '0x0',
        frigorifico: batch.frigorifico || '0x0',
        cantidad_animales: batch.cantidad_animales || 0,
        estado: getEstadoLote(batch.estado || 0).toLowerCase(),
        estado_numero: batch.estado || 0,
        fecha_creacion: batch.fecha_creacion?.toString() || Math.floor(Date.now() / 1000).toString(),
        fecha_actualizacion: new Date().toISOString(),
        nombre: `Lote #${batchId}`,
        descripcion: 'Sincronizado desde StarkNet (Modo Admin)',
        starknet_data: JSON.stringify(cleanDataForCache(batch)),
        metadata_hash: 'sync_from_starknet_admin'
      };

      return cleanedData;
      
    } catch (error) {
      console.error('❌ Error limpiando datos de lote:', error, batch);
      return null;
    }
  };

  // 🔧 FUNCIÓN ESPECÍFICA PARA LIMPIAR ROLES - CORREGIDA
  const cleanRoleData = (user: RoleData, roleType: string): any => {
    // ✅ CORREGIR: Mapear los tipos de roles de StarkNet a los que espera el servidor
    const roleTypeMapping: { [key: string]: string } = {
      'ADMIN_ROLE': 'admin',
      'PRODUCER_ROLE': 'producer', 
      'FRIGORIFICO_ROLE': 'frigorifico',
      'VET_ROLE': 'veterinarian',
      'EXPORTER_ROLE': 'exporter',
      'CERTIFIER_ROLE': 'certifier',
      'IOT_ROLE': 'iot',
      'AUDITOR_ROLE': 'auditor'
    };

    const mappedRoleType = roleTypeMapping[roleType] || roleType.toLowerCase();

    return {
      account: user.account,
      role: user.role,
      nombre: user.nombre || `${ROLE_DISPLAY_NAMES[roleType] || roleType} User`,
      direccion: user.direccion || user.account,
      fecha_registro: user.fecha_registro || new Date().toISOString(),
      activo: user.activo !== undefined ? user.activo : true,
      metadata: user.metadata || `Rol: ${roleType}`,
      role_type: mappedRoleType, // ✅ USAR EL TIPO MAPEADO
      role_display_name: ROLE_DISPLAY_NAMES[roleType] || roleType,
      fecha_sincronizacion: new Date().toISOString(),
      observaciones: 'Sincronizado desde StarkNet (Modo Admin)'
    };
  };

  // 🔧 DIAGNÓSTICO ESPECÍFICO PARA ROLES
  const diagnoseRolesSync = async (): Promise<void> => {
    setStatus('🔧 Diagnosticando sincronización de roles...');
    
    try {
      const { cacheService } = await import('@/services/CacheService');
      
      console.log('🔍 Datos de roles locales:', {
        tipos_roles: Object.keys(roles),
        total_usuarios: Object.values(roles).reduce((total, users) => total + users.length, 0)
      });

      // Preparar datos de prueba
      const testRolesData: { [key: string]: any } = {};
      
      Object.entries(roles).forEach(([roleType, users]) => {
        if (users.length > 0) {
          const user = users[0];
          const roleKey = `test_${roleType}_${user.account}`;
          testRolesData[roleKey] = cleanRoleData(user, roleType);
          
          console.log(`🔍 Rol de prueba ${roleType}:`, testRolesData[roleKey]);
        }
      });

      if (Object.keys(testRolesData).length === 0) {
        setStatus('❌ No hay roles para probar');
        return;
      }

      console.log('📤 Enviando roles de prueba al servidor...', testRolesData);
      
      const result = await cacheService.bulkUpsert('roles', testRolesData);
      console.log('📥 Resultado del test de roles:', result);

      if (result && result.success) {
        setStatus('✅ Roles de prueba sincronizados correctamente');
        
        // Verificar en el servidor
        const diagnosis = await cacheService.makeRequest('/api/cache/diagnose');
        console.log('🔍 Diagnóstico después del test:', diagnosis);
        
      } else {
        setStatus(`❌ Error con roles: ${result?.error || 'Error desconocido'}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error en diagnóstico de roles:', error);
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  // 🔧 Cargar estadísticas del CACHE
  const loadCacheStats = async (): Promise<void> => {
    try {
      const { cacheService } = await import('@/services/CacheService');
      const stats = await cacheService.getStats();
      if (stats && stats.success) {
        setCacheStats(stats);
      }
    } catch (error) {
      console.log('Cache no disponible:', error);
    }
  };

  // 🗑️ LIMPIAR CACHE COMPLETO
  const clearCompleteCache = async (): Promise<void> => {
    if (!confirm('⚠️ ¿ESTÁS SEGURO DE QUE QUIERES LIMPIAR TODO EL CACHE?\n\nEsta acción eliminará TODOS los datos locales y no se puede deshacer.')) {
      return;
    }

    setCleaning(true);
    setStatus('🗑️ Limpiando cache completo...');

    try {
      const { cacheService } = await import('@/services/CacheService');
      
      const results = await Promise.all([
        cacheService.bulkUpsert('animals', {}),
        cacheService.bulkUpsert('batches', {}),
        cacheService.bulkUpsert('roles', {}),
        cacheService.bulkUpsert('transactions', [])
      ]);

      const success = results.every(result => result && result.success);
      
      if (success) {
        setStatus('✅ Cache limpiado completamente');
        
        setAnimals([]);
        setBatches([]);
        setRoles({});
        setTransactions([]);
        
        await loadCacheStats();
        
        setTimeout(() => {
          if (confirm('¿Quieres recargar los datos de StarkNet ahora?')) {
            loadAllSystemData();
          }
        }, 1000);
      } else {
        throw new Error('Error limpiando algunos datos del cache');
      }
      
    } catch (error: any) {
      console.error('Error limpiando cache:', error);
      setStatus(`❌ Error limpiando cache: ${error.message}`);
    } finally {
      setCleaning(false);
    }
  };

  // 🔧 Cargar roles usando SOLO los que existen
  const loadOnlyAvailableRoles = async (): Promise<void> => {
    setStatus('🔍 Cargando solo roles disponibles...');
    const loadedRoles: {[key: string]: RoleData[]} = {};
    
    try {
      let availableRoles: string[] = [];
      
      try {
        const storedRoles = localStorage.getItem('available_roles');
        if (storedRoles) {
          availableRoles = JSON.parse(storedRoles);
        }
      } catch (e) {
        console.log('No se pudieron cargar roles desde localStorage');
      }
      
      if (availableRoles.length === 0) {
        availableRoles = [
          'ADMIN_ROLE',
          'PRODUCER_ROLE', 
          'FRIGORIFICO_ROLE',
          'VET_ROLE'
        ];
      }
      
      let totalMembersLoaded = 0;
      
      for (const roleKey of availableRoles) {
        try {
          const roleName = getRoleDisplayName(roleKey) || roleKey;
          
          const memberCount = await contractService.getRoleMemberCount(roleKey);
          
          if (memberCount > 0) {
            loadedRoles[roleKey] = [];
            
            for (let i = 0; i < memberCount; i++) {
              try {
                const memberAddress = await contractService.getRoleMemberAtIndex(roleKey, i);
                
                if (memberAddress && memberAddress !== '0x0' && memberAddress !== '0x') {
                  const hasRole = await contractService.hasRole(roleKey, memberAddress);
                  
                  if (hasRole) {
                    loadedRoles[roleKey].push({
                      account: memberAddress,
                      role: roleKey,
                      nombre: `${roleName} #${i + 1}`,
                      direccion: memberAddress,
                      fecha_registro: new Date().toISOString(),
                      activo: true,
                      metadata: `Rol: ${roleName}`
                    });
                    totalMembersLoaded++;
                  }
                }
              } catch (memberError: any) {
                console.log(`⚠️ Error con miembro ${i}:`, memberError.message);
              }
            }
          }
          
        } catch (roleError: any) {
          console.log(`❌ Error cargando rol ${roleKey}:`, roleError.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      setRoles(loadedRoles);
      setStatus(`✅ Roles cargados: ${Object.keys(loadedRoles).length} tipos, ${totalMembersLoaded} miembros`);
      
    } catch (error) {
      console.error('❌ Error cargando roles disponibles:', error);
      setStatus('⚠️ Error cargando roles - omitiendo');
      setRoles({});
    }
  };

  // 🔧 Cargar TODOS los datos del sistema (MODO ADMIN)
  const loadAllSystemData = async (): Promise<void> => {
    if (!contractService) return;
    
    setLoading(true);
    setStatus('🔄 Cargando TODOS los datos del sistema (Modo Admin)...');
    
    try {
      const stats = await contractService.getSystemStats();
      setSystemStats(stats);
      
      const totalAnimals = Number(stats.total_animals_created);
      const totalBatches = Number(stats.total_batches_created);
      
      setStatus(`📊 Sistema: ${totalAnimals} animales, ${totalBatches} lotes - Cargando...`);
      
      await loadAllAnimals(totalAnimals);
      await loadAllBatches(totalBatches);
      await loadOnlyAvailableRoles();
      
      setStatus(`✅ Datos cargados: ${animals.length} animales, ${batches.length} lotes, ${Object.keys(roles).length} tipos de roles`);
      
    } catch (error: any) {
      console.error('Error cargando datos del sistema:', error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0, type: '' });
    }
  };

  // 🔧 Cargar TODOS los animales del sistema
  const loadAllAnimals = async (totalAnimals: number): Promise<void> => {
    setProgress({ current: 0, total: totalAnimals, type: 'animales' });
    const loadedAnimals: AnimalData[] = [];
    
    for (let i = 1; i <= totalAnimals; i++) {
      try {
        const animalId = BigInt(i);
        const animalData = await contractService.getAnimalData(animalId);
        
        if (animalData) {
          loadedAnimals.push(animalData);
        }
      } catch (error) {
        console.log(`Animal #${i} no disponible`);
      }
      
      if (i % 10 === 0) {
        setProgress({ current: i, total: totalAnimals, type: 'animales' });
        setStatus(`🔍 Cargando animales... ${i}/${totalAnimals}`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    setAnimals(loadedAnimals);
    console.log(`✅ ${loadedAnimals.length} animales cargados de ${totalAnimals} totales`);
  };

  // 🔧 Cargar TODOS los lotes del sistema
  const loadAllBatches = async (totalBatches: number): Promise<void> => {
    setProgress({ current: 0, total: totalBatches, type: 'lotes' });
    const loadedBatches: BatchData[] = [];
    
    for (let i = 1; i <= totalBatches; i++) {
      try {
        const batchId = BigInt(i);
        const batchData = await contractService.getBatchInfo(batchId);
        
        if (batchData) {
          const safeBatch: BatchData = {
            id: batchData.id || batchId,
            propietario: batchData.propietario || '0x0',
            frigorifico: batchData.frigorifico || '0x0',
            fecha_creacion: batchData.fecha_creacion || BigInt(0),
            fecha_transferencia: batchData.fecha_transferencia || BigInt(0),
            fecha_procesamiento: batchData.fecha_procesamiento || BigInt(0),
            estado: batchData.estado || 0,
            cantidad_animales: batchData.cantidad_animales || 0,
            peso_total: batchData.peso_total || BigInt(0),
            animal_ids: Array.isArray(batchData.animal_ids) ? batchData.animal_ids : []
          };
          
          loadedBatches.push(safeBatch);
        }
      } catch (error) {
        console.log(`Lote #${i} no disponible`);
      }
      
      if (i % 5 === 0) {
        setProgress({ current: i, total: totalBatches, type: 'lotes' });
        setStatus(`🔍 Cargando lotes... ${i}/${totalBatches}`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    setBatches(loadedBatches);
    console.log(`✅ ${loadedBatches.length} lotes cargados de ${totalBatches} totales`);
  };

  // 🔧 SINCRONIZAR TODO con el cache - ÚNICO BOTÓN DE SYNC
  const syncAllToCache = async (): Promise<void> => {
    if (!animals.length && !batches.length && !Object.keys(roles).length) {
      setStatus('❌ No hay datos para sincronizar con cache');
      return;
    }
    
    setSaving(true);
    setStatus('🔄 Sincronizando TODOS los datos con cache...');
    
    try {
      const { cacheService } = await import('@/services/CacheService');
      
      if (!cacheService || typeof cacheService.bulkUpsert !== 'function') {
        throw new Error('CacheService no disponible o método bulkUpsert no encontrado');
      }
      
      console.log('🔍 Datos disponibles para sincronizar:', {
        animales: animals.length,
        lotes: batches.length,
        roles: Object.keys(roles).length
      });

      // PREPARAR datos
      const animalsData: { [key: string]: any } = {};
      const batchesData: { [key: string]: any } = {};
      const rolesData: { [key: string]: any } = {};

      // PROCESAR ANIMALES
      animals.forEach((animal, index) => {
        try {
          const animalId = animal.id?.toString() || `unknown_${index}`;
          const cleanedAnimal = cleanAnimalData(animal);
          
          if (cleanedAnimal && cleanedAnimal.id && cleanedAnimal.id !== 'unknown') {
            animalsData[animalId] = cleanedAnimal;
          }
        } catch (error) {
          console.error(`❌ Error procesando animal ${index}:`, error);
        }
      });

      // PROCESAR LOTES
      batches.forEach((batch, index) => {
        try {
          const batchId = batch.id?.toString() || `unknown_${index}`;
          const cleanedBatch = cleanBatchData(batch);
          
          if (cleanedBatch && cleanedBatch.id && cleanedBatch.id !== 'unknown') {
            batchesData[batchId] = cleanedBatch;
          }
        } catch (error) {
          console.error(`❌ Error procesando lote ${index}:`, error);
        }
      });

      // PROCESAR ROLES con logs detallados
      console.log('👥 Procesando roles...');
      Object.entries(roles).forEach(([roleType, users]) => {
        console.log(`🔍 Tipo de rol: "${roleType}", Usuarios: ${users.length}`);
        
        users.forEach((user, userIndex) => {
          try {
            const roleKey = `${roleType}_${user.account}_${userIndex}`;
            const cleanedRole = cleanRoleData(user, roleType);
            
            console.log(`🔍 Rol procesado:`, {
              tipo_original: roleType,
              tipo_mapeado: cleanedRole.role_type,
              cuenta: cleanedRole.account,
              datos_completos: cleanedRole
            });
            
            if (cleanedRole && cleanedRole.account && cleanedRole.account !== '0x0') {
              rolesData[roleKey] = cleanedRole;
              console.log(`✅ Rol ${roleType} - ${user.account} agregado para sync`);
            } else {
              console.log(`❌ Rol ${roleType} - ${user.account} inválido, omitiendo`);
            }
          } catch (error) {
            console.error(`❌ Error procesando rol ${roleType} - usuario ${userIndex}:`, error);
          }
        });
      });

      console.log('📊 Resumen final de datos a sincronizar:', {
        animales: Object.keys(animalsData).length,
        lotes: Object.keys(batchesData).length,
        roles: Object.keys(rolesData).length
      });

      if (Object.keys(animalsData).length === 0 && 
          Object.keys(batchesData).length === 0 && 
          Object.keys(rolesData).length === 0) {
        setStatus('⚠️ No hay datos válidos para sincronizar después del procesamiento');
        return;
      }

      // SINCRONIZACIÓN
      const syncPromises = [];
      
      if (Object.keys(animalsData).length > 0) {
        syncPromises.push(
          cacheService.bulkUpsert('animals', animalsData)
        );
      }
      
      if (Object.keys(batchesData).length > 0) {
        syncPromises.push(
          cacheService.bulkUpsert('batches', batchesData)
        );
      }
      
      if (Object.keys(rolesData).length > 0) {
        syncPromises.push(
          cacheService.bulkUpsert('roles', rolesData)
        );
      }

      if (syncPromises.length === 0) {
        setStatus('⚠️ No hay datos válidos para sincronizar');
        return;
      }

      const results = await Promise.all(syncPromises);
      
      const successfulSyncs = results.filter(result => result && result.success).length;
      const totalSyncs = syncPromises.length;
      
      const animalsProcessed = Object.keys(animalsData).length;
      const batchesProcessed = Object.keys(batchesData).length;
      const rolesProcessed = Object.keys(rolesData).length;

      if (successfulSyncs > 0) {
        await loadCacheStats();
        setStatus(`✅ Sincronización exitosa: ${animalsProcessed} animales, ${batchesProcessed} lotes, ${rolesProcessed} roles`);
        
        console.log('🎉 Sincronización completada exitosamente:', {
          animales_enviados: animalsProcessed,
          lotes_enviados: batchesProcessed,
          roles_enviados: rolesProcessed
        });
      } else {
        const errors = results
          .filter(r => !r.success)
          .map(r => r.error)
          .filter(Boolean)
          .join(', ');
        
        console.error('❌ Todos los syncs fallaron:', errors);
        throw new Error(`Todos fallaron: ${errors}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error crítico sincronizando con cache:', error);
      setStatus(`❌ Error sincronizando: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 🔧 CARGAR DATOS RÁPIDO (solo estadísticas)
  const loadQuickStats = async (): Promise<void> => {
    if (!contractService) return;
    
    setLoading(true);
    setStatus('🔄 Cargando estadísticas rápidas...');
    
    try {
      const stats = await contractService.getSystemStats();
      setSystemStats(stats);
      setStatus(`✅ Estadísticas: ${Number(stats.total_animals_created)} animales, ${Number(stats.total_batches_created)} lotes`);
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔧 Funciones auxiliares
  const getEstadoAnimal = (estado: number): string => {
    const estados = ['Creado', 'Transferido', 'Procesado', 'Certificado', 'Exportado'];
    return estados[estado] || `Estado ${estado}`;
  };

  const getEstadoLote = (estado: number): string => {
    const estados = ['Creado', 'Transferido', 'Procesado'];
    return estados[estado] || `Estado ${estado}`;
  };

  const getRazaAnimal = (raza: number): string => {
    const razas = ['', 'Angus', 'Hereford', 'Brahman', 'Charolais', 'Simmental'];
    return razas[raza] || `Raza ${raza}`;
  };

  const formatPeso = (peso: bigint): string => {
    try {
      const pesoKg = Number(peso) / 1000;
      return `${pesoKg.toFixed(1)} kg`;
    } catch {
      return '0 kg';
    }
  };

  const formatAddress = (address: string): string => {
    if (!address || address === '0x0' || address === '0x') return 'No asignado';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: bigint): string => {
    if (!timestamp || timestamp === BigInt(0)) return 'No disponible';
    try {
      return new Date(Number(timestamp) * 1000).toLocaleDateString();
    } catch {
      return 'Fecha inválida';
    }
  };

  const safeToString = (value: any): string => {
    if (value === undefined || value === null) return 'DESCONOCIDO';
    try {
      return value.toString();
    } catch {
      return 'INVÁLIDO';
    }
  };

  const getRoleDisplayName = (roleType: string): string => {
    const roleMap: {[key: string]: string} = {
      'ADMIN_ROLE': 'Administrador',
      'DEFAULT_ADMIN_ROLE': 'Administrador Principal',
      'PRODUCER_ROLE': 'Productor',
      'FRIGORIFICO_ROLE': 'Frigorífico',
      'VETERINARIAN_ROLE': 'Veterinario',
      'VET_ROLE': 'Veterinario',
      'IOT_ROLE': 'Dispositivo IoT',
      'CERTIFIER_ROLE': 'Certificador',
      'EXPORTER_ROLE': 'Exportador',
      'AUDITOR_ROLE': 'Auditor',
      'admin': 'Administrador',
      'producer': 'Productor',
      'frigorifico': 'Frigorífico',
      'veterinarian': 'Veterinario',
      'ROLE_ADMIN': 'Administrador',
      'ROLE_PRODUCER': 'Productor',
      'ROLE_FRIGORIFICO': 'Frigorífico'
    };
    
    return roleMap[roleType] || roleType;
  };

  const calculateProgress = (): number => {
    if (progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  // Efecto para cargar datos al montar
  useEffect(() => {
    if (contractService) {
      loadCacheStats();
      loadQuickStats();
    }
  }, [contractService]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Controles */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">💾 Sincronización StarkNet ↔ Cache</h2>
            <p className="text-gray-600">
              {isAdmin ? 'MODO ADMIN - Acceso completo a todos los datos del sistema' : 'Sincronización de datos'}
            </p>
          </div>
          {isAdmin && (
            <span className="px-3 py-1 bg-red-500 text-white text-sm rounded-full">ADMIN</span>
          )}
        </div>
        
        {/* Barra de progreso */}
        {progress.total > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Cargando {progress.type}... ({progress.current}/{progress.total})</span>
              <span>{calculateProgress()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {/* BOTONES PRINCIPALES SIMPLIFICADOS */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={loadAllSystemData}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? '🔄 Cargando...' : '🔍 Cargar Datos StarkNet'}
          </button>
          
          <button
            onClick={syncAllToCache}
            disabled={saving || (!animals.length && !batches.length)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? '🔄 Sincronizando...' : '💾 Sincronizar con Cache'}
          </button>
          
          <button
            onClick={clearCompleteCache}
            disabled={cleaning}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {cleaning ? '🗑️ Limpiando...' : '💥 Limpiar Todo el Cache'}
          </button>
        </div>

        {/* Botón de diagnóstico de roles */}
        <div className="flex flex-wrap gap-2 mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <span className="text-purple-800 font-semibold w-full mb-2">🔧 Diagnóstico de Roles:</span>
          
          <button
            onClick={diagnoseRolesSync}
            className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition-colors flex items-center gap-1"
          >
            🔍 Probar Sincronización de Roles
          </button>
        </div>
        
        {/* Botones UTILITARIOS */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadQuickStats}
            disabled={loading}
            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            📊 Estadísticas
          </button>
          
          <button
            onClick={loadCacheStats}
            className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 transition-colors flex items-center gap-1"
          >
            🔄 Actualizar Cache
          </button>
        </div>
        
        {/* Estado */}
        {status && (
          <div className={`mt-4 p-3 rounded-lg border ${
            status.includes('❌') ? 'bg-red-50 border-red-200 text-red-800' :
            status.includes('✅') ? 'bg-green-50 border-green-200 text-green-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <p className="text-sm">{status}</p>
          </div>
        )}
      </div>

      {/* Estadísticas del Sistema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estadísticas de StarkNet */}
        {systemStats && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Contrato StarkNet</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600">Total Animales</div>
                <div className="text-2xl font-bold text-blue-800">
                  {Number(systemStats.total_animals_created)}
                </div>
                <div className="text-xs text-blue-500">
                  {animals.length} cargados
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-600">Total Lotes</div>
                <div className="text-2xl font-bold text-green-800">
                  {Number(systemStats.total_batches_created)}
                </div>
                <div className="text-xs text-green-500">
                  {batches.length} cargados
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-sm text-orange-600">Animales Procesados</div>
                <div className="text-2xl font-bold text-orange-800">
                  {Number(systemStats.processed_animals)}
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-600">Próximo ID Animal</div>
                <div className="text-2xl font-bold text-purple-800">
                  {Number(systemStats.next_token_id)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Estadísticas del Cache */}
        {cacheStats && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">💾 Cache Local</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600">Animales en Cache</div>
                <div className="text-2xl font-bold text-blue-800">
                  {cacheStats.summary?.total_animals || 0}
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-600">Lotes en Cache</div>
                <div className="text-2xl font-bold text-green-800">
                  {cacheStats.summary?.total_batches || 0}
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-sm text-orange-600">Roles en Cache</div>
                <div className="text-2xl font-bold text-orange-800">
                  {cacheStats.summary?.total_roles || 0}
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm text-purple-600">Transacciones</div>
                <div className="text-2xl font-bold text-purple-800">
                  {cacheStats.summary?.total_transactions || 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Animales */}
      {animals.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">
              🐄 Animales de StarkNet ({animals.length})
            </h3>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {animals.slice(0, 50).map((animal) => (
              <div key={safeToString(animal.id)} className="border-b border-gray-100 p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-blue-600">#{safeToString(animal.id)}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {getRazaAnimal(animal.raza || 0)} • {getEstadoAnimal(animal.estado || 0)}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">{formatPeso(animal.peso || BigInt(0))}</div>
                    <div className="text-gray-500">Lote: #{animal.lote_id || 'N/A'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-xs text-gray-500">
                  <div>Propietario: {formatAddress(animal.propietario)}</div>
                  <div>Frigorífico: {formatAddress(animal.frigorifico)}</div>
                  <div>Certificador: {formatAddress(animal.certificador)}</div>
                </div>
              </div>
            ))}
            {animals.length > 50 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                ... y {animals.length - 50} animales más
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lotes */}
      {batches.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">
              📦 Lotes de StarkNet ({batches.length})
            </h3>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {batches.map((batch) => (
              <div key={safeToString(batch.id)} className="border-b border-gray-100 p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-green-600">Lote #{safeToString(batch.id)}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {getEstadoLote(batch.estado || 0)}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">{(batch.cantidad_animales || 0)} animales</div>
                    <div className="text-gray-500">{formatPeso(batch.peso_total || BigInt(0))}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-xs text-gray-500">
                  <div>Propietario: {formatAddress(batch.propietario)}</div>
                  <div>Frigorífico: {formatAddress(batch.frigorifico)}</div>
                  <div>Animales: {batch.animal_ids?.length || 0}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roles */}
      {Object.keys(roles).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">
              👥 Roles de StarkNet ({Object.keys(roles).length} tipos)
            </h3>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {Object.entries(roles).map(([roleType, users]) => (
              <div key={roleType} className="border-b border-gray-100 p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  {getRoleDisplayName(roleType)} ({users.length})
                </h4>
                <div className="space-y-2">
                  {users.slice(0, 5).map((user, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{user.nombre}</span>
                      <span className="text-gray-500">{formatAddress(user.account)}</span>
                    </div>
                  ))}
                  {users.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      ... y {users.length - 5} más
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sin datos */}
      {!loading && !animals.length && !batches.length && systemStats && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🔍</div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">No se encontraron datos</h3>
          <p className="text-yellow-600">
            El contrato reporta {Number(systemStats.total_animals_created)} animales y {Number(systemStats.total_batches_created)} lotes, 
            pero no se pudieron cargar los detalles.
          </p>
        </div>
      )}

      {/* Cargando */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-800">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span>Cargando datos de StarkNet...</span>
          </div>
          {progress.total > 0 && (
            <div className="mt-4">
              <div className="text-sm text-blue-600 mb-1">
                {progress.type}: {progress.current}/{progress.total}
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}