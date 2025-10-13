// server.ts - VERSIÓN COMPLETA CORREGIDA
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, '..', 'data', 'cache.json');

// Configuración CORS
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://unsharply-unsupplementary-adell.ngrok-free.app'
  ];
  
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Interfaces
interface CacheData {
  animals: { [key: string]: any };
  batches: { [key: string]: any };
  roles: { 
    producer: any[];
    frigorifico: any[];
    veterinarian: any[];
    exporter: any[];
    iot: any[];
    certifier: any[];
    auditor: any[];
  };
  cortes: { [key: string]: any };
  qrCodes: { [key: string]: any };
  transacciones: any[];
  system_stats: any;
}

// Helper functions
const ensureDataDirectory = async () => {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch (error) {
    await fs.mkdir(dataDir, { recursive: true });
    console.log('📁 Directorio de datos creado:', dataDir);
  }
};

const loadCache = async (): Promise<CacheData> => {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const cache = JSON.parse(data);
    
    const completeCache: CacheData = {
      animals: cache.animals || {},
      batches: cache.batches || {},
      roles: cache.roles || {
        producer: [], frigorifico: [], veterinarian: [], exporter: [],
        iot: [], certifier: [], auditor: []
      },
      cortes: cache.cortes || {},
      qrCodes: cache.qrCodes || {},
      transacciones: cache.transacciones || [],
      system_stats: cache.system_stats || {
        total_animals: "0", total_batches: "0", total_cortes: "0",
        total_qr_codes: "0", total_roles: "0", processed_animals: "0",
        next_token_id: "1", next_batch_id: "1", next_corte_id: "1",
        next_qr_id: "1", last_sync: new Date().toISOString()
      }
    };
    
    console.log('📁 Cache cargado exitosamente');
    return completeCache;
  } catch (error: any) {
    console.log('📁 Creando nuevo archivo de cache...');
    const initialCache: CacheData = { 
      animals: {}, batches: {}, 
      roles: { producer: [], frigorifico: [], veterinarian: [], exporter: [], iot: [], certifier: [], auditor: [] },
      cortes: {}, qrCodes: {}, transacciones: [],
      system_stats: {
        total_animals: "0", total_batches: "0", total_cortes: "0",
        total_qr_codes: "0", total_roles: "0", processed_animals: "0",
        next_token_id: "1", next_batch_id: "1", next_corte_id: "1",
        next_qr_id: "1", last_sync: new Date().toISOString()
      }
    };
    
    await saveCache(initialCache);
    return initialCache;
  }
};

const saveCache = async (data: CacheData) => {
  try {
    await ensureDataDirectory();
    const dataToSave = JSON.stringify(data, null, 2);
    console.log(`💾 Guardando cache en: ${DATA_FILE}`);
    console.log(`📝 Tamaño del dato: ${dataToSave.length} caracteres`);
    
    await fs.writeFile(DATA_FILE, dataToSave);
    console.log('✅ Cache guardado exitosamente');
    
    // Verificar que se guardó
    const stats = await fs.stat(DATA_FILE);
    console.log(`📄 Archivo guardado: ${stats.size} bytes`);
    
  } catch (error: any) {
    console.error('❌ Error guardando cache:', error.message);
    console.error('❌ Stack trace:', error.stack);
    throw error;
  }
};

// ==================== ENDPOINTS PRINCIPALES ====================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const cache = await loadCache();
    
    res.json({ 
      success: true,
      status: 'healthy',
      service: 'BeefChain Cache API',
      timestamp: new Date().toISOString(),
      cache_stats: {
        animals: Object.keys(cache.animals).length,
        batches: Object.keys(cache.batches).length,
        cortes: Object.keys(cache.cortes).length,
        roles: Object.values(cache.roles).reduce((total, roleArray) => total + roleArray.length, 0),
        transactions: cache.transacciones.length
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Obtener estadísticas
app.get('/api/cache/stats', async (req, res) => {
  try {
    const cache = await loadCache();
    
    res.json({
      success: true,
      system: cache.system_stats,
      summary: {
        total_animals: Object.keys(cache.animals).length,
        total_batches: Object.keys(cache.batches).length,
        total_cortes: Object.keys(cache.cortes).length,
        total_roles: Object.values(cache.roles).reduce((total, roleArray) => total + roleArray.length, 0),
        total_transactions: cache.transacciones.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando estadísticas'
    });
  }
});

// Obtener todos los datos
app.get('/api/cache/all', async (req, res) => {
  try {
    const cache = await loadCache();
    res.json({
      success: true,
      data: cache,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando cache'
    });
  }
});

// ==================== ENDPOINT DE DIAGNÓSTICO ====================

// Endpoint de diagnóstico
app.get('/api/cache/diagnose', async (req, res) => {
  try {
    const cache = await loadCache();
    
    // Verificar permisos del archivo
    let fileStats;
    try {
      fileStats = await fs.stat(DATA_FILE);
    } catch (error) {
      return res.json({
        success: false,
        error: `No se puede acceder al archivo: ${error.message}`
      });
    }
    
    res.json({
      success: true,
      diagnosis: {
        file_path: DATA_FILE,
        file_exists: true,
        file_size: fileStats.size,
        file_permissions: fileStats.mode.toString(8),
        cache_data: {
          animals: Object.keys(cache.animals).length,
          batches: Object.keys(cache.batches).length,
          roles: Object.entries(cache.roles).reduce((acc, [key, value]) => {
            acc[key] = value.length;
            return acc;
          }, {} as any),
          cortes: Object.keys(cache.cortes).length,
          transactions: cache.transacciones.length
        },
        system_stats: cache.system_stats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== ENDPOINT PARA LIMPIAR CACHE ====================

// Limpiar cache desde servidor
app.post('/api/cache/clear', async (req, res) => {
  try {
    const { entity } = req.body;
    
    console.log(`🗑️ Limpiando cache para: ${entity || 'todo'}`);
    
    const cache = await loadCache();
    
    if (!entity || entity === 'all') {
      // Limpiar todo
      cache.animals = {};
      cache.batches = {};
      cache.roles = {
        producer: [], frigorifico: [], veterinarian: [], exporter: [],
        iot: [], certifier: [], auditor: []
      };
      cache.cortes = {};
      cache.qrCodes = {};
      cache.transacciones = [];
      
      console.log('✅ Todo el cache limpiado');
    } else {
      // Limpiar entidad específica
      switch (entity) {
        case 'animals':
          cache.animals = {};
          break;
        case 'batches':
          cache.batches = {};
          break;
        case 'roles':
          cache.roles = {
            producer: [], frigorifico: [], veterinarian: [], exporter: [],
            iot: [], certifier: [], auditor: []
          };
          break;
        case 'transactions':
          cache.transacciones = [];
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `Entidad no válida: ${entity}`
          });
      }
      console.log(`✅ Cache de ${entity} limpiado`);
    }
    
    // Resetear estadísticas
    cache.system_stats = {
      total_animals: "0", total_batches: "0", total_cortes: "0",
      total_qr_codes: "0", total_roles: "0", processed_animals: "0",
      next_token_id: "1", next_batch_id: "1", next_corte_id: "1",
      next_qr_id: "1", last_sync: new Date().toISOString()
    };
    
    await saveCache(cache);
    
    res.json({
      success: true,
      message: `Cache ${entity ? 'de ' + entity : ''}limpiado exitosamente`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Error limpiando cache:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error limpiando cache: ' + error.message
    });
  }
});

// ==================== ENDPOINTS ANIMALES ====================

// Obtener todos los animales
app.get('/api/cache/animals', async (req, res) => {
  try {
    const cache = await loadCache();
    res.json({
      success: true,
      data: cache.animals,
      count: Object.keys(cache.animals).length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando animales'
    });
  }
});

// ✅ COMPLETO: Obtener animal por ID
app.get('/api/cache/animals/:animalId', async (req, res) => {
  try {
    const { animalId } = req.params;
    const cache = await loadCache();
    
    if (!cache.animals[animalId]) {
      return res.status(404).json({
        success: false,
        error: 'Animal no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cache.animals[animalId],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando animal'
    });
  }
});

// Obtener animales por productor
app.get('/api/cache/animals/producer/:producerAddress', async (req, res) => {
  try {
    const { producerAddress } = req.params;
    const cache = await loadCache();
    
    const animalesProductor = Object.entries(cache.animals)
      .filter(([_, animal]: [string, any]) => 
        animal.propietario_actual?.toLowerCase() === producerAddress.toLowerCase()
      )
      .reduce((acc: any, [id, animal]) => {
        acc[id] = animal;
        return acc;
      }, {});
    
    res.json({
      success: true,
      data: animalesProductor,
      count: Object.keys(animalesProductor).length,
      producer: producerAddress,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando animales del productor'
    });
  }
});

// Obtener animales por frigorífico
app.get('/api/cache/animals/frigorifico/:frigorificoAddress', async (req, res) => {
  try {
    const { frigorificoAddress } = req.params;
    const cache = await loadCache();
    
    const animalesFrigorifico = Object.entries(cache.animals)
      .filter(([_, animal]: [string, any]) => 
        animal.frigorifico?.toLowerCase() === frigorificoAddress.toLowerCase() ||
        animal.propietario_actual?.toLowerCase() === frigorificoAddress.toLowerCase()
      )
      .reduce((acc: any, [id, animal]) => {
        acc[id] = animal;
        return acc;
      }, {});
    
    res.json({
      success: true,
      data: animalesFrigorifico,
      count: Object.keys(animalesFrigorifico).length,
      frigorifico: frigorificoAddress,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando animales del frigorífico'
    });
  }
});

// ==================== ENDPOINTS LOTES ====================

// Obtener todos los lotes
app.get('/api/cache/batches', async (req, res) => {
  try {
    const cache = await loadCache();
    res.json({
      success: true,
      data: cache.batches,
      count: Object.keys(cache.batches).length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando lotes'
    });
  }
});

// ✅ COMPLETO: Obtener lote por ID
app.get('/api/cache/batches/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const cache = await loadCache();
    
    if (!cache.batches[batchId]) {
      return res.status(404).json({
        success: false,
        error: 'Lote no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cache.batches[batchId],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando lote'
    });
  }
});

// Obtener lotes por productor
app.get('/api/cache/batches/producer/:producerAddress', async (req, res) => {
  try {
    const { producerAddress } = req.params;
    const cache = await loadCache();
    
    const lotesProductor = Object.entries(cache.batches)
      .filter(([_, batch]: [string, any]) => 
        batch.propietario?.toLowerCase() === producerAddress.toLowerCase()
      )
      .reduce((acc: any, [id, batch]) => {
        acc[id] = batch;
        return acc;
      }, {});
    
    res.json({
      success: true,
      data: lotesProductor,
      count: Object.keys(lotesProductor).length,
      producer: producerAddress,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando lotes del productor'
    });
  }
});

// Obtener lotes por frigorífico
app.get('/api/cache/batches/frigorifico/:frigorificoAddress', async (req, res) => {
  try {
    const { frigorificoAddress } = req.params;
    const cache = await loadCache();
    
    const lotesFrigorifico = Object.entries(cache.batches)
      .filter(([_, batch]: [string, any]) => 
        batch.frigorifico?.toLowerCase() === frigorificoAddress.toLowerCase()
      )
      .reduce((acc: any, [id, batch]) => {
        acc[id] = batch;
        return acc;
      }, {});
    
    res.json({
      success: true,
      data: lotesFrigorifico,
      count: Object.keys(lotesFrigorifico).length,
      frigorifico: frigorificoAddress,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando lotes del frigorífico'
    });
  }
});

// ==================== ENDPOINTS ROLES ====================

// Obtener todos los roles
app.get('/api/cache/roles', async (req, res) => {
  try {
    const cache = await loadCache();
    res.json({
      success: true,
      data: cache.roles,
      count: Object.values(cache.roles).reduce((total, roleArray) => total + roleArray.length, 0),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando roles'
    });
  }
});

// Obtener roles por tipo
app.get('/api/cache/roles/:roleType', async (req, res) => {
  try {
    const { roleType } = req.params;
    const cache = await loadCache();
    
    if (!cache.roles[roleType]) {
      return res.status(404).json({
        success: false,
        error: `Tipo de rol no válido: ${roleType}`
      });
    }
    
    res.json({
      success: true,
      data: cache.roles[roleType],
      count: cache.roles[roleType].length,
      role_type: roleType,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando roles'
    });
  }
});

// ✅ COMPLETO: Obtener usuario específico en rol por address
app.get('/api/cache/roles/:roleType/user/:userAddress', async (req, res) => {
  try {
    const { roleType, userAddress } = req.params;
    const cache = await loadCache();
    
    if (!cache.roles[roleType]) {
      return res.status(404).json({
        success: false,
        error: `Tipo de rol no válido: ${roleType}`
      });
    }
    
    const usuario = cache.roles[roleType].find((user: any) => 
      user.account?.toLowerCase() === userAddress.toLowerCase()
    );
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado en este rol'
      });
    }
    
    res.json({
      success: true,
      data: usuario,
      role_type: roleType,
      user_address: userAddress,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando usuario del rol'
    });
  }
});

// ==================== ENDPOINTS CORTES ====================

// Obtener todos los cortes
app.get('/api/cache/cortes', async (req, res) => {
  try {
    const cache = await loadCache();
    res.json({
      success: true,
      data: cache.cortes,
      count: Object.keys(cache.cortes).length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando cortes'
    });
  }
});

// ✅ COMPLETO: Obtener corte por ID
app.get('/api/cache/cortes/:corteId', async (req, res) => {
  try {
    const { corteId } = req.params;
    const cache = await loadCache();
    
    if (!cache.cortes[corteId]) {
      return res.status(404).json({
        success: false,
        error: 'Corte no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cache.cortes[corteId],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando corte'
    });
  }
});

// Obtener cortes por animal
app.get('/api/cache/cortes/animal/:animalId', async (req, res) => {
  try {
    const { animalId } = req.params;
    const cache = await loadCache();
    
    const cortesAnimal = Object.entries(cache.cortes)
      .filter(([_, corte]) => corte.animal_id === animalId)
      .reduce((acc: any, [id, corte]) => {
        acc[id] = corte;
        return acc;
      }, {});
    
    res.json({
      success: true,
      data: cortesAnimal,
      count: Object.keys(cortesAnimal).length,
      animal_id: animalId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando cortes del animal'
    });
  }
});

// Obtener cortes por frigorífico
app.get('/api/cache/cortes/frigorifico/:frigorificoAddress', async (req, res) => {
  try {
    const { frigorificoAddress } = req.params;
    const cache = await loadCache();
    
    const cortesFrigorifico = Object.entries(cache.cortes)
      .filter(([_, corte]) => corte.frigorifico?.toLowerCase() === frigorificoAddress.toLowerCase())
      .reduce((acc: any, [id, corte]) => {
        acc[id] = corte;
        return acc;
      }, {});
    
    res.json({
      success: true,
      data: cortesFrigorifico,
      count: Object.keys(cortesFrigorifico).length,
      frigorifico: frigorificoAddress,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando cortes del frigorífico'
    });
  }
});

// ==================== ENDPOINTS QR CODES ====================

// Obtener todos los QR codes
app.get('/api/cache/qr', async (req, res) => {
  try {
    const cache = await loadCache();
    res.json({
      success: true,
      data: cache.qrCodes,
      count: Object.keys(cache.qrCodes).length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando QR codes'
    });
  }
});

// ✅ COMPLETO: Obtener QR code por ID
app.get('/api/cache/qr/:qrId', async (req, res) => {
  try {
    const { qrId } = req.params;
    const cache = await loadCache();
    
    if (!cache.qrCodes[qrId]) {
      return res.status(404).json({
        success: false,
        error: 'QR code no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: cache.qrCodes[qrId],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando QR code'
    });
  }
});

// ==================== ENDPOINTS TRANSACCIONES ====================

// Obtener todas las transacciones
app.get('/api/cache/transactions', async (req, res) => {
  try {
    const cache = await loadCache();
    res.json({
      success: true,
      data: cache.transacciones,
      count: cache.transacciones.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando transacciones'
    });
  }
});

// ✅ COMPLETO: Obtener transacción por ID
app.get('/api/cache/transactions/id/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const cache = await loadCache();
    
    const transaccion = cache.transacciones.find((tx: any) => tx.id === transactionId);
    
    if (!transaccion) {
      return res.status(404).json({
        success: false,
        error: 'Transacción no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: transaccion,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando transacción'
    });
  }
});

// ✅ COMPLETO: Obtener transacción por hash
app.get('/api/cache/transactions/hash/:transactionHash', async (req, res) => {
  try {
    const { transactionHash } = req.params;
    const cache = await loadCache();
    
    const transaccion = cache.transacciones.find((tx: any) => tx.hash === transactionHash);
    
    if (!transaccion) {
      return res.status(404).json({
        success: false,
        error: 'Transacción no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: transaccion,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando transacción'
    });
  }
});

// Obtener transacciones por dirección
app.get('/api/cache/transactions/address/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const cache = await loadCache();
    
    const transaccionesFiltradas = cache.transacciones.filter((tx: any) => {
      const fromMatch = tx.from && tx.from.toLowerCase() === address.toLowerCase();
      const toMatch = tx.to && tx.to.toLowerCase() === address.toLowerCase();
      return fromMatch || toMatch;
    });
    
    res.json({
      success: true,
      data: transaccionesFiltradas,
      count: transaccionesFiltradas.length,
      address: address,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: 'Error cargando transacciones'
    });
  }
});

// ==================== ENDPOINT BULK UPSERT CORREGIDO ====================

// Bulk upsert para cualquier entidad - ÚNICO ENDPOINT CORREGIDO
app.post('/api/cache/bulk-upsert', async (req, res) => {
  try {
    const { entity, data } = req.body;
    
    console.log(`🔄 Bulk upsert para: ${entity}`);
    console.log(`📊 Datos recibidos:`, {
      tipo: typeof data,
      cantidad: Object.keys(data).length,
      primeros_3: Object.keys(data).slice(0, 3)
    });

    const cache = await loadCache();
    console.log(`📁 Cache cargado: ${Object.keys(cache.animals).length} animales, ${Object.keys(cache.batches).length} lotes, ${Object.values(cache.roles).reduce((total, roleArray) => total + roleArray.length, 0)} roles`);

    if (!cache[entity] && entity !== 'transactions') {
      return res.status(400).json({
        success: false,
        error: `Entidad no válida: ${entity}`
      });
    }

    let processedCount = 0;

    if (entity === 'transactions') {
      const existingHashes = new Set(cache.transacciones.map((tx: any) => tx.hash));
      
      for (const transaction of data) {
        if (!existingHashes.has(transaction.hash)) {
          cache.transacciones.push({
            ...transaction,
            id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fecha: transaction.fecha || Date.now(),
            timestamp: transaction.timestamp || new Date().toISOString()
          });
          processedCount++;
        }
      }
    } else if (entity === 'roles') {
      // ✅ CORREGIDO: Manejar estructura de roles correctamente
      console.log('🔍 Procesando roles con nueva estructura...');
      
      for (const [roleKey, roleData] of Object.entries(data)) {
        try {
          const roleItem = roleData as any;
          
          // Extraer el tipo de rol de la clave o de los datos
          const roleType = roleItem.role_type || roleItem.role || 'unknown';
          
          // Verificar que el tipo de rol existe en la estructura
          if (cache.roles[roleType] !== undefined) {
            // Buscar si el usuario ya existe en este rol
            const existingIndex = cache.roles[roleType].findIndex(
              (user: any) => user.account?.toLowerCase() === roleItem.account?.toLowerCase()
            );
            
            if (existingIndex >= 0) {
              // Actualizar rol existente
              cache.roles[roleType][existingIndex] = {
                ...cache.roles[roleType][existingIndex],
                ...roleItem,
                fecha_actualizacion: new Date().toISOString()
              };
            } else {
              // Agregar nuevo rol
              cache.roles[roleType].push({
                ...roleItem,
                fecha_creacion: roleItem.fecha_creacion || new Date().toISOString(),
                fecha_actualizacion: new Date().toISOString()
              });
            }
            processedCount++;
          } else {
            console.log(`⚠️ Tipo de rol no válido: ${roleType}`);
          }
        } catch (error) {
          console.error(`❌ Error procesando rol ${roleKey}:`, error);
        }
      }
    } else {
      // Para animals, batches, cortes, qrCodes
      for (const [id, itemData] of Object.entries(data)) {
        const item = itemData as any;
        
        if (cache[entity][id]) {
          cache[entity][id] = {
            ...cache[entity][id],
            ...item,
            fecha_actualizacion: new Date().toISOString()
          };
        } else {
          cache[entity][id] = {
            ...item,
            fecha_creacion: item.fecha_creacion || new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString()
          };
        }
        processedCount++;
      }
    }

    // Actualizar estadísticas
    cache.system_stats.total_animals = Object.keys(cache.animals).length.toString();
    cache.system_stats.total_batches = Object.keys(cache.batches).length.toString();
    cache.system_stats.total_cortes = Object.keys(cache.cortes).length.toString();
    cache.system_stats.total_roles = Object.values(cache.roles).reduce((total, roleArray) => 
      total + roleArray.length, 0
    ).toString();
    cache.system_stats.last_sync = new Date().toISOString();

    console.log(`📈 Después de procesar: ${processedCount} items procesados`);
    console.log(`📊 Cache actualizado: ${Object.keys(cache.animals).length} animales, ${Object.keys(cache.batches).length} lotes, ${Object.values(cache.roles).reduce((total, roleArray) => total + roleArray.length, 0)} roles`);

    await saveCache(cache);

    console.log(`✅ Bulk upsert completado: ${processedCount} procesados`);
    
    res.json({
      success: true,
      message: `Bulk upsert para ${entity} completado`,
      stats: {
        entity,
        processed: processedCount,
        total: entity === 'transactions' ? cache.transacciones.length : 
               entity === 'roles' ? Object.values(cache.roles).reduce((total, roleArray) => total + roleArray.length, 0) :
               Object.keys(cache[entity]).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error en bulk upsert:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error en bulk upsert: ' + error.message
    });
  }
});

// ==================== INICIO DEL SERVIDOR ====================

const startServer = async () => {
  try {
    const cache = await loadCache();
    
    app.listen(PORT, () => {
      console.log(`\n🚀 BeefChain Cache API Server running on port ${PORT}`);
      console.log(`📊 Cache cargado exitosamente:`);
      console.log(`   • ${Object.keys(cache.animals).length} animales`);
      console.log(`   • ${Object.keys(cache.batches).length} lotes`);
      console.log(`   • ${Object.keys(cache.cortes).length} cortes`);
      console.log(`   • ${Object.values(cache.roles).reduce((total, roleArray) => total + roleArray.length, 0)} roles`);
      console.log(`   • ${cache.transacciones.length} transacciones`);
      console.log(`\n🔧 Endpoints COMPLETOS implementados:`);
      console.log(`   • GET  /api/cache/animals/:id              - Animal por ID`);
      console.log(`   • GET  /api/cache/batches/:id             - Lote por ID`);
      console.log(`   • GET  /api/cache/cortes/:id              - Corte por ID`);
      console.log(`   • GET  /api/cache/qr/:id                  - QR por ID`);
      console.log(`   • GET  /api/cache/transactions/id/:id     - Transacción por ID`);
      console.log(`   • GET  /api/cache/transactions/hash/:hash - Transacción por hash`);
      console.log(`   • GET  /api/cache/roles/:type/user/:addr  - Usuario en rol por address`);
      console.log(`   • GET  /api/cache/diagnose                - Diagnóstico del servidor`);
      console.log(`   • POST /api/cache/clear                   - Limpiar cache\n`);
    });
  } catch (error: any) {
    console.error('❌ Error iniciando servidor:', error.message);
    process.exit(1);
  }
};

startServer();

process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor gracefulmente...');
  process.exit(0);
});