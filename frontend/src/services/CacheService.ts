// src/services/CacheService.ts - VERSIÓN MEJORADA CON BÚSQUEDA ROBUSTA
class CacheService {
  private baseURL: string;
  private isServerAvailable: boolean = true;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 30000;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 60000; // 1 minuto

  constructor() {
    this.baseURL = this.determineBaseURL();
    console.log('🔧 CacheService configurado con:', this.baseURL);
    this.testInitialConnection();
  }

  private determineBaseURL(): string {
    return 'https://break-prize-podcast-loose.trycloudflare.com';
  }

  private async testInitialConnection() {
    try {
      const health = await this.healthCheck();
      this.isServerAvailable = true;
    } catch (error) {
      this.isServerAvailable = false;
    }
  }

  // ============ CACHE LOCAL EN MEMORIA ============

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setToCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // ============ UTILIDADES ============

  private serializeData(data: any): string {
    const replacer = (key: string, value: any) => {
      if (typeof value === 'bigint') return value.toString();
      if (value === undefined) return null;
      return value;
    };
    return JSON.stringify(data, replacer);
  }

  private deepCleanData(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (Array.isArray(obj)) return obj.map(item => this.deepCleanData(item));
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.deepCleanData(value);
        }
      }
      return cleaned;
    }
    return obj;
  }

  // ============ CORE REQUEST ============

  public async makeRequest(endpoint: string, options: RequestInit = {}, retries = 2): Promise<any> {
    if (!this.isServerAvailable && Date.now() - this.lastHealthCheck < this.healthCheckInterval) {
      return {
        success: false,
        error: 'Servidor de cache no disponible',
        available: false
      };
    }

    const url = `${this.baseURL}${endpoint}`;
    
    try {
      let safeBody = options.body;
      if (options.body && typeof options.body === 'string') {
        try {
          const parsedBody = JSON.parse(options.body);
          safeBody = this.serializeData(parsedBody);
        } catch (e) {
          safeBody = options.body;
        }
      }

      const response = await fetch(url, {
        headers: { 
          'Content-Type': 'application/json', 
          ...options.headers 
        },
        ...options,
        body: safeBody
      });
      
      if (!response.ok) {
        if (response.status === 500) {
          this.isServerAvailable = false;
          this.lastHealthCheck = Date.now();
          return { success: false, error: 'Error interno del servidor', status: 500, available: false };
        }
        
        if ((response.status === 502 || response.status === 503 || response.status === 504) && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.makeRequest(endpoint, options, retries - 1);
        }
        
        return { success: false, error: `HTTP ${response.status}`, status: response.status };
      }
      
      const responseData = await response.json();
      this.isServerAvailable = true;
      this.lastHealthCheck = Date.now();
      return responseData;
      
    } catch (error: any) {
      this.isServerAvailable = false;
      this.lastHealthCheck = Date.now();

      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.makeRequest(endpoint, options, retries - 1);
      }
      
      return { success: false, error: error.message, available: false };
    }
  }

  // ============ HEALTH & STATS ============

  async healthCheck() {
    try {
      const result = await this.makeRequest('/api/health', {}, 1);
      if (result && result.status === 'healthy') {
        this.isServerAvailable = true;
        this.lastHealthCheck = Date.now();
      }
      return result;
    } catch (error: any) {
      this.isServerAvailable = false;
      return { status: 'error', error: error.message };
    }
  }

  async getStats() {
    return await this.makeRequest('/api/cache/stats');
  }

  async getAllData() {
    return await this.makeRequest('/api/cache/all');
  }

  // ============ ANIMALES - BÚSQUEDA MEJORADA ============

  async getAllAnimals(): Promise<{ [key: string]: any }> {
    try {
      const cacheKey = 'all_animals';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const response = await this.makeRequest('/api/cache/animals');
      const result = response?.data || {};
      
      this.setToCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo todos los animales:', error);
      return {};
    }
  }

  async getAnimalById(animalId: string): Promise<any> {
    try {
      const cacheKey = `animal_${animalId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      console.log(`🔍 Buscando animal ${animalId} en cache...`);
      const response = await this.makeRequest(`/api/cache/animals/${animalId}`);
      const result = response?.data || null;

      if (result) {
        console.log(`✅ Animal ${animalId} encontrado en cache`);
        this.setToCache(cacheKey, result);
      } else {
        console.log(`❌ Animal ${animalId} NO encontrado en cache`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Error obteniendo animal ${animalId}:`, error);
      return null;
    }
  }

  async getAnimalsByIds(animalIds: string[]): Promise<{ [key: string]: any }> {
    try {
      console.log(`🔍 Buscando ${animalIds.length} animales en cache:`, animalIds);
      
      const results: { [key: string]: any } = {};
      const missingIds: string[] = [];

      // Primero buscar en cache local
      for (const id of animalIds) {
        const cached = this.getFromCache(`animal_${id}`);
        if (cached) {
          results[id] = cached;
        } else {
          missingIds.push(id);
        }
      }

      console.log(`📊 Cache: ${Object.keys(results).length} encontrados, ${missingIds.length} faltantes`);

      // Si faltan animales, buscar en el servidor
      if (missingIds.length > 0) {
        console.log(`🔄 Buscando ${missingIds.length} animales en servidor...`);
        
        // Intentar buscar en lote si el endpoint lo soporta
        const batchResponse = await this.makeRequest('/api/cache/animals/batch', {
          method: 'POST',
          body: this.serializeData({ animalIds: missingIds })
        });

        if (batchResponse?.success && batchResponse.data) {
          Object.assign(results, batchResponse.data);
          
          // Actualizar cache local
          for (const [id, animal] of Object.entries(batchResponse.data)) {
            this.setToCache(`animal_${id}`, animal);
          }
        } else {
          // Fallback: buscar individualmente
          console.log(`🔄 Fallback: búsqueda individual de ${missingIds.length} animales`);
          for (const id of missingIds) {
            try {
              const animal = await this.getAnimalById(id);
              if (animal) {
                results[id] = animal;
              }
            } catch (error) {
              console.error(`❌ Error buscando animal ${id}:`, error);
            }
          }
        }
      }

      console.log(`✅ Total animales encontrados: ${Object.keys(results).length}/${animalIds.length}`);
      return results;
    } catch (error) {
      console.error('❌ Error en getAnimalsByIds:', error);
      return {};
    }
  }

  async getAnimalsByProducer(producerAddress: string) {
    try {
      const response = await this.makeRequest(`/api/cache/animals/producer/${producerAddress}`);
      return response?.data || {};
    } catch (error) {
      console.error('❌ Error obteniendo animales por productor:', error);
      return {};
    }
  }

  async getAnimalsByFrigorifico(frigorificoAddress: string) {
    try {
      const response = await this.makeRequest(`/api/cache/animals/frigorifico/${frigorificoAddress}`);
      return response?.data || {};
    } catch (error) {
      console.error('❌ Error obteniendo animales por frigorífico:', error);
      return {};
    }
  }

  // ============ LOTES ============

  async getAllBatches() {
    try {
      const response = await this.makeRequest('/api/cache/batches');
      return response?.data || {};
    } catch (error) {
      console.error('❌ Error obteniendo lotes:', error);
      return {};
    }
  }

  async getBatchById(batchId: string) {
    try {
      const response = await this.makeRequest(`/api/cache/batches/${batchId}`);
      return response?.data || null;
    } catch (error) {
      console.error(`❌ Error obteniendo lote ${batchId}:`, error);
      return null;
    }
  }

  async getBatchesByProducer(producerAddress: string) {
    try {
      const response = await this.makeRequest(`/api/cache/batches/producer/${producerAddress}`);
      return response?.data || {};
    } catch (error) {
      console.error('❌ Error obteniendo lotes por productor:', error);
      return {};
    }
  }

  async getBatchesByFrigorifico(frigorificoAddress: string) {
    try {
      const response = await this.makeRequest(`/api/cache/batches/frigorifico/${frigorificoAddress}`);
      return response?.data || {};
    } catch (error) {
      console.error('❌ Error obteniendo lotes por frigorífico:', error);
      return {};
    }
  }

  // ============ BULK UPSERT MEJORADO ============

  async bulkUpsert(entity: string, data: { [key: string]: any } | any[]) {
    console.log(`🔄 Bulk upsert para ${entity}:`, 
      Array.isArray(data) ? data.length : Object.keys(data).length, 'items'
    );
    
    // Log detallado de los datos
    console.log(`📤 Datos para ${entity}:`, {
      tipo: typeof data,
      esArray: Array.isArray(data),
      total: Array.isArray(data) ? data.length : Object.keys(data).length,
      muestra: Array.isArray(data) 
        ? data.slice(0, 3) 
        : Object.entries(data).slice(0, 3).map(([key, value]) => ({ key, value }))
    });

    try {
      const result = await this.makeRequest('/api/cache/bulk-upsert', {
        method: 'POST',
        body: this.serializeData({ 
          entity, 
          data,
          preserveStructure: true,
          timestamp: Date.now()
        })
      });

      console.log(`📥 Respuesta del servidor para ${entity}:`, {
        success: result?.success,
        error: result?.error,
        stats: result?.stats
      });

      if (result && result.success) {
        console.log(`✅ Bulk upsert completado para ${entity}:`, result.stats);
        
        // Limpiar cache local después de actualizar
        this.cache.clear();
      } else {
        console.error(`❌ Error en bulk upsert para ${entity}:`, result?.error);
      }

      return result;
    } catch (error: any) {
      console.error(`❌ Excepción en bulk upsert para ${entity}:`, error);
      return { success: false, error: error.message };
    }
  }

  // ============ SINCRONIZACIÓN COMPLETA ============

  async syncAllData(starknetData: {
    animals?: { [key: string]: any };
    batches?: { [key: string]: any };
    roles?: { [key: string]: any };
    transactions?: any[];
  }) {
    console.log('🔄 Sincronizando todos los datos desde Starknet...');
    
    const results = await Promise.allSettled([
      starknetData.animals ? this.bulkUpsert('animals', starknetData.animals) : Promise.resolve({success: true}),
      starknetData.batches ? this.bulkUpsert('batches', starknetData.batches) : Promise.resolve({success: true}),
      starknetData.roles ? this.bulkUpsert('roles', starknetData.roles) : Promise.resolve({success: true}),
      starknetData.transactions ? this.bulkUpsert('transactions', starknetData.transactions) : Promise.resolve({success: true})
    ]);

    const successes = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failures = results.filter(r => r.status === 'rejected' || !r.value.success);
    
    if (failures.length === 0) {
      console.log('✅ Todos los datos sincronizados exitosamente');
      return { success: true, results: results.map(r => r.status === 'fulfilled' ? r.value : null) };
    } else {
      console.error(`❌ ${failures.length} sincronizaciones fallaron`);
      return { 
        success: false, 
        error: `${failures.length} entidades fallaron al sincronizar`,
        details: failures 
      };
    }
  }

  // ============ UTILIDADES PÚBLICAS ============

  getBaseURL() {
    return this.baseURL;
  }

  setBaseURL(newUrl: string) {
    if (newUrl.endsWith('/api')) {
      newUrl = newUrl.replace('/api', '');
    }
    this.baseURL = newUrl;
    console.log(`🔧 [CACHE] URL actualizada a: ${this.baseURL}`);
    this.cache.clear(); // Limpiar cache al cambiar URL
  }

  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return !!(health && health.status === 'healthy');
    } catch (error) {
      return false;
    }
  }

  // Limpiar cache local
  clearLocalCache(): void {
    this.cache.clear();
    console.log('🧹 Cache local limpiado');
  }
}

export const cacheService = new CacheService();