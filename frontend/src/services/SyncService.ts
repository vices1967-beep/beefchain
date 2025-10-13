// src/services/SyncService.ts - VERSIÓN CORREGIDA CON TIPOS
import { cacheService } from './CacheService';
import { AnimalContractService } from './animalContractService';

// Interfaces para los tipos
interface StarknetAnimalData {
  id: string;
  raza: number;
  fechaNacimiento: number;
  peso: string;
  estado: number;
  propietario: string;
  frigorifico: string;
  certificador: string;
  exportador: string;
  lote_id: number;
  animalId: string;
}

interface AnimalForCache {
  id: string;
  raza: number;
  peso: string;
  estado: number;
  propietario: string;
  frigorifico: string;
  certificador: string;
  exportador: string;
  lote_id: number;
  fecha_nacimiento: number;
  starknet_data: StarknetAnimalData;
  metadataHash?: string;
  fecha_creacion: number;
  ultima_actualizacion: number;
  fuente: string;
}

interface BatchForCache {
  id: string;
  propietario: string;
  frigorifico: string;
  fecha_creacion: number;
  fecha_transferencia: number;
  fecha_procesamiento: number;
  estado: number;
  cantidad_animales: number;
  peso_total: string;
  animal_ids: string[];
  tipo: string;
}

interface SyncResult {
  success: boolean;
  synced: number;
  errors: number;
}

interface FullSyncResult {
  success: boolean;
  animals: number;
  batches: number;
  errors: number;
}

interface SyncStatus {
  isSyncing: boolean;
  cacheStats: any;
  blockchainStats: any;
}

class SyncService {
  private contractService: AnimalContractService | null = null;
  private isSyncing = false;

  setContractService(service: AnimalContractService): void {
    this.contractService = service;
  }

  // 🔄 SINCRONIZAR TODOS LOS ANIMALES DESDE STARKNET AL CACHE
  async syncAllAnimalsToCache(): Promise<SyncResult> {
    if (!this.contractService) {
      console.error('❌ ContractService no disponible');
      return { success: false, synced: 0, errors: 0 };
    }

    if (this.isSyncing) {
      console.log('⏳ Sincronización ya en progreso...');
      return { success: false, synced: 0, errors: 0 };
    }

    this.isSyncing = true;
    console.log('🔄 Iniciando sincronización completa de animales...');

    try {
      // 1. Obtener estadísticas del sistema para saber cuántos animales hay
      const stats = await this.contractService.getSystemStats();
      const totalAnimals = Number(stats.total_animals_created || 0);
      
      console.log(`📊 Total de animales en blockchain: ${totalAnimals}`);

      if (totalAnimals === 0) {
        console.log('ℹ️ No hay animales en la blockchain');
        return { success: true, synced: 0, errors: 0 };
      }

      let synced = 0;
      let errors = 0;

      // 2. Sincronizar animales en lotes para no sobrecargar
      const BATCH_SIZE = 10;
      
      for (let i = 1; i <= totalAnimals; i += BATCH_SIZE) {
        const batchPromises: Promise<boolean>[] = [];
        
        // Crear promesas para este lote
        for (let j = i; j < i + BATCH_SIZE && j <= totalAnimals; j++) {
          batchPromises.push(this.syncSingleAnimal(BigInt(j)));
        }
        
        // Ejecutar lote actual
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Contar resultados
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            synced++;
          } else {
            errors++;
            console.error('❌ Error en sync batch:', result);
          }
        });

        console.log(`📦 Procesado lote ${i}-${Math.min(i + BATCH_SIZE - 1, totalAnimals)}: ${synced} ok, ${errors} errores`);
        
        // Pequeña pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`✅ Sincronización completada: ${synced} animales sincronizados, ${errors} errores`);
      return { success: errors === 0, synced, errors };

    } catch (error) {
      console.error('❌ Error en sincronización completa:', error);
      return { success: false, synced: 0, errors: 1 };
    } finally {
      this.isSyncing = false;
    }
  }

  // 🔄 SINCRONIZAR UN ANIMAL INDIVIDUAL
  async syncSingleAnimal(animalId: bigint): Promise<boolean> {
    if (!this.contractService) {
      console.error('❌ ContractService no disponible');
      return false;
    }

    try {
      console.log(`🔍 Sincronizando animal #${animalId}...`);

      // 1. Obtener datos básicos del animal desde blockchain
      const animalBasic = await this.contractService.getInfoAnimal(animalId);
      if (!animalBasic) {
        console.warn(`⚠️ Animal #${animalId} no encontrado en blockchain`);
        return false;
      }

      // 2. Obtener datos completos de StarkNet
      const animalData = await this.contractService.getAnimalData(animalId);
      
      // 3. Preparar datos para el cache
      const animalForCache: AnimalForCache = {
        id: animalId.toString(),
        raza: Number(animalBasic.raza || 0),
        peso: animalBasic.peso ? animalBasic.peso.toString() : '0',
        estado: Number(animalBasic.estado || 0),
        propietario: animalBasic.propietario || '',
        frigorifico: animalBasic.frigorifico || '',
        certificador: animalBasic.certificador || '',
        exportador: animalBasic.exportador || '',
        lote_id: animalBasic.lote_id ? Number(animalBasic.lote_id) : 0,
        fecha_nacimiento: animalBasic.fecha_nacimiento ? Number(animalBasic.fecha_nacimiento) : 0,
        
        // Datos StarkNet
        starknet_data: {
          id: animalId.toString(),
          raza: Number(animalBasic.raza || 0),
          fechaNacimiento: animalBasic.fecha_nacimiento ? Number(animalBasic.fecha_nacimiento) : 0,
          peso: animalBasic.peso ? animalBasic.peso.toString() : '0',
          estado: Number(animalBasic.estado || 0),
          propietario: animalBasic.propietario || '',
          frigorifico: animalBasic.frigorifico || '',
          certificador: animalBasic.certificador || '',
          exportador: animalBasic.exportador || '',
          lote_id: animalBasic.lote_id ? Number(animalBasic.lote_id) : 0,
          animalId: animalId.toString()
        },
        
        // Metadata adicional
        metadataHash: animalData?.metadataHash || '',
        fecha_creacion: Date.now(),
        ultima_actualizacion: Date.now(),
        fuente: 'starknet_sync'
      };

      console.log(`💾 Guardando animal #${animalId} en cache:`, {
        peso: animalForCache.peso,
        propietario: animalForCache.propietario,
        tieneStarknetData: !!animalForCache.starknet_data
      });

      // 4. Guardar en cache
      const result = await cacheService.addAnimal(animalForCache);
      
      if (result.success) {
        console.log(`✅ Animal #${animalId} sincronizado exitosamente`);
        return true;
      } else {
        console.error(`❌ Error guardando animal #${animalId} en cache:`, result.error);
        return false;
      }

    } catch (error) {
      console.error(`❌ Error sincronizando animal #${animalId}:`, error);
      return false;
    }
  }

  // 🔄 SINCRONIZAR LOTES
  async syncBatchesToCache(): Promise<{ success: boolean; synced: number }> {
    if (!this.contractService) {
      return { success: false, synced: 0 };
    }

    try {
      console.log('🔄 Sincronizando lotes...');
      
      // Obtener estadísticas para saber cuántos lotes hay
      const stats = await this.contractService.getSystemStats();
      const totalBatches = Number(stats.total_batches_created || 0);
      
      let synced = 0;

      for (let i = 1; i <= totalBatches; i++) {
        try {
          const batchId = BigInt(i);
          const batchInfo = await this.contractService.getBatchInfo(batchId);
          
          if (batchInfo) {
            // Preparar datos del lote para cache
            const batchForCache: BatchForCache = {
              id: batchId.toString(),
              propietario: batchInfo.propietario || '',
              frigorifico: batchInfo.frigorifico || '',
              fecha_creacion: batchInfo.fecha_creacion ? Number(batchInfo.fecha_creacion) : 0,
              fecha_transferencia: batchInfo.fecha_transferencia ? Number(batchInfo.fecha_transferencia) : 0,
              fecha_procesamiento: batchInfo.fecha_procesamiento ? Number(batchInfo.fecha_procesamiento) : 0,
              estado: Number(batchInfo.estado || 0),
              cantidad_animales: Number(batchInfo.cantidad_animales || 0),
              peso_total: batchInfo.peso_total ? batchInfo.peso_total.toString() : '0',
              animal_ids: (batchInfo.animal_ids || []).map((id: bigint) => id.toString()),
              tipo: 'lote_produccion'
            };

            // Guardar usando transacción
            await cacheService.guardarTransaccion({
              hash: `batch-sync-${batchId}-${Date.now()}`,
              tipo: 'batch_synced',
              from: 'sync_service',
              to: 'cache_system',
              data: batchForCache
            });

            synced++;
          }
        } catch (error) {
          console.error(`❌ Error sincronizando lote #${i}:`, error);
        }
      }

      console.log(`✅ ${synced} lotes sincronizados`);
      return { success: true, synced };

    } catch (error) {
      console.error('❌ Error sincronizando lotes:', error);
      return { success: false, synced: 0 };
    }
  }

  // 🔄 SINCRONIZACIÓN COMPLETA DEL SISTEMA
  async fullSystemSync(): Promise<FullSyncResult> {
    console.log('🚀 INICIANDO SINCRONIZACIÓN COMPLETA DEL SISTEMA...');

    const animalsResult = await this.syncAllAnimalsToCache();
    const batchesResult = await this.syncBatchesToCache();

    const result: FullSyncResult = {
      success: animalsResult.success && batchesResult.success,
      animals: animalsResult.synced,
      batches: batchesResult.synced,
      errors: animalsResult.errors
    };

    console.log('🎯 RESULTADO SINCRONIZACIÓN:', result);
    return result;
  }

  // 🔍 VERIFICAR ESTADO DE SINCRONIZACIÓN
  async getSyncStatus(): Promise<SyncStatus> {
    const cacheStats = await cacheService.getStats();
    let blockchainStats = null;

    if (this.contractService) {
      try {
        blockchainStats = await this.contractService.getSystemStats();
      } catch (error) {
        console.error('Error obteniendo stats de blockchain:', error);
      }
    }

    return {
      isSyncing: this.isSyncing,
      cacheStats,
      blockchainStats
    };
  }

  // 🔄 SINCRONIZAR ANIMALES ESPECÍFICOS (para un lote)
  async syncSpecificAnimals(animalIds: bigint[]): Promise<SyncResult> {
    if (!this.contractService) {
      return { success: false, synced: 0, errors: 0 };
    }

    console.log(`🔄 Sincronizando ${animalIds.length} animales específicos...`);
    
    let synced = 0;
    let errors = 0;

    const promises = animalIds.map(animalId => 
      this.syncSingleAnimal(animalId)
        .then(success => {
          if (success) synced++;
          else errors++;
        })
        .catch(() => errors++)
    );

    await Promise.all(promises);

    console.log(`✅ Sincronización específica: ${synced} ok, ${errors} errores`);
    return { success: errors === 0, synced, errors };
  }

  // 🔄 VERIFICAR Y SINCRONIZAR SI ES NECESARIO
  async checkAndSyncIfNeeded(): Promise<boolean> {
    try {
      const cacheStats = await cacheService.getStats();
      const totalAnimalsInCache = cacheStats?.summary?.total_animals || 0;
      
      if (totalAnimalsInCache === 0 && this.contractService) {
        console.log('🔄 Cache vacío, iniciando sincronización automática...');
        const result = await this.syncAllAnimalsToCache();
        return result.synced > 0;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error en checkAndSyncIfNeeded:', error);
      return false;
    }
  }
}

export const syncService = new SyncService();