import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Provider, Contract, constants } from 'starknet';
import { ANIMAL_NFT_ABI } from './starknet/animal-nft-abi.ts';

// --- ESM: obtener __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- CONFIG ---
const NETWORK = 'https://starknet-sepolia.public.blastapi.io/rpc/v0_9';
const CONTRACT_ADDRESS = '0x065f45868a08c394cb54d94a6e4eb08012435b5c9803bb41d22ecb9e603e535d';
const CACHE_FILE = join(__dirname, 'cache.json');

// Provider con configuración mejorada
const provider = new Provider({ 
  nodeUrl: NETWORK,
  retries: 3
});

// Crear contrato con ABI simplificado
const contract = new Contract(ANIMAL_NFT_ABI as any, CONTRACT_ADDRESS, provider);

// --- Inicializar cache ---
let cache: any = {};
if (fs.existsSync(CACHE_FILE)) {
  cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
} else {
  cache = { animals: {}, batches: {}, roles: {}, transacciones: [] };
}

// --- DEFINICIÓN DE ROLES ---
const ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0',
  PRODUCER_ROLE: '0x50524f44554345525f524f4c45',
  FRIGORIFICO_ROLE: '0x465249474f52494649434f5f524f4c45', 
  VET_ROLE: '0x5645545f524f4c45',
  IOT_ROLE: '0x494f545f524f4c45',
  CERTIFIER_ROLE: '0x4345525449464945525f524f4c45',
  EXPORTER_ROLE: '0x4558504f525445525f524f4c45',
  AUDITOR_ROLE: '0x41554449544f525f524f4c45'
};

// Función helper para llamadas seguras con block_id explícito
async function safeContractCall(method: string, ...args: any[]) {
  try {
    // Forzar el uso de "latest" en lugar de "pending"
    const result = await contract[method](...args);
    return result;
  } catch (err: any) {
    console.warn(`⚠️  Error en ${method}:`, err.message);
    return null;
  }
}

// Función específica para llamadas directas al provider (evita el problema de pending)
async function directProviderCall(entrypoint: string, calldata: any[] = []) {
  try {
    const result = await provider.callContract({
      contractAddress: CONTRACT_ADDRESS,
      entrypoint: entrypoint,
      calldata: calldata
    }, 'latest'); // Forzar 'latest' explícitamente
    
    return result;
  } catch (err: any) {
    console.warn(`⚠️  Error en ${entrypoint}:`, err.message);
    return null;
  }
}

async function syncSystemStats() {
  try {
    console.log('📈 Obteniendo estadísticas del sistema...');
    
    // Usar llamada directa al provider para evitar problema de pending
    const result = await directProviderCall('get_system_stats');
    
    if (result && result.length >= 7) {
      const stats = {
        total_animals: BigInt(result[0]),
        total_batches: BigInt(result[1]),
        total_cortes: BigInt(result[2]),
        processed_animals: BigInt(result[3]),
        next_token_id: BigInt(result[4]),
        next_batch_id: BigInt(result[5]),
        next_lote_id: BigInt(result[6])
      };
      
      cache.system_stats = {
        total_animals: stats.total_animals.toString(),
        total_batches: stats.total_batches.toString(),
        total_cortes: stats.total_cortes.toString(),
        processed_animals: stats.processed_animals.toString(),
        next_token_id: stats.next_token_id.toString(),
        next_batch_id: stats.next_batch_id.toString(),
        next_lote_id: stats.next_lote_id.toString()
      };
      
      console.log(`📊 Estadísticas: ${stats.total_animals} animales, ${stats.total_batches} lotes, ${stats.total_cortes} cortes`);
      return stats;
    } else {
      console.log('ℹ️  No se pudieron obtener estadísticas del contrato - puede estar vacío');
      return null;
    }
  } catch (err) {
    console.error('❌ Error obteniendo estadísticas:', err);
    return null;
  }
}

async function syncAnimals() {
  try {
    console.log('🔄 Sincronizando animales...');
    
    // Primero intentar con estadísticas
    const stats = await syncSystemStats();
    let totalAnimals = 0;
    
    if (stats) {
      totalAnimals = Number(stats.next_token_id) - 1;
    }
    
    if (totalAnimals <= 0) {
      console.log('ℹ️  Intentando buscar animales individualmente...');
      await findAnimalsIndividually();
      return;
    }

    console.log(`📊 Procesando ${totalAnimals} animales...`);
    
    let animalsFound = 0;
    for (let animalId = 1; animalId <= totalAnimals; animalId++) {
      try {
        const result = await directProviderCall('get_animal_data', [animalId.toString()]);
        if (!result || result.length < 9) continue;

        // Parsear resultado manualmente
        const animalData = {
          raza: BigInt(result[0]),
          fecha_nacimiento: BigInt(result[1]),
          peso: BigInt(result[2]),
          estado: Number(result[3]),
          propietario: result[4],
          frigorifico: result[5],
          certificador: result[6],
          exportador: result[7],
          lote_id: BigInt(result[8])
        };

        // Verificar que el animal existe (propietario no es cero)
        if (animalData.propietario !== '0x0') {
          const owner = await directProviderCall('owner_of', [animalId.toString()]);
          const numCortes = await directProviderCall('get_num_cortes', [animalId.toString()]);
          const isQuarantined = await directProviderCall('is_quarantined', [animalId.toString()]);
          const batchId = await directProviderCall('get_batch_for_animal', [animalId.toString()]);
          
          cache.animals[animalId] = {
            id: animalId.toString(),
            raza: animalData.raza.toString(),
            fecha_nacimiento: animalData.fecha_nacimiento.toString(),
            peso: animalData.peso.toString(),
            estado: animalData.estado.toString(),
            propietario: animalData.propietario,
            frigorifico: animalData.frigorifico,
            certificador: animalData.certificador,
            exportador: animalData.exportador,
            lote_id: animalData.lote_id.toString(),
            owner: owner ? owner[0] : '0x0',
            num_cortes: numCortes ? numCortes[0] : '0',
            en_cuarentena: isQuarantined ? isQuarantined[0] === '0x1' : false,
            batch_id: batchId ? batchId[0] : '0'
          };
          
          animalsFound++;
          
          if (animalId % 5 === 0) {
            console.log(`   ✅ Procesado animal ${animalId}/${totalAnimals}`);
          }
        }
      } catch (err) {
        console.warn(`⚠️  Error procesando animal ${animalId}:`, err.message);
      }
    }
    
    console.log(`✅ Animales sincronizados: ${animalsFound}`);
  } catch (err) {
    console.error('❌ Error sincronizando animales:', err);
  }
}

async function findAnimalsIndividually() {
  console.log('🔍 Buscando animales individualmente...');
  
  let animalsFound = 0;
  const maxCheck = 50;
  
  for (let animalId = 1; animalId <= maxCheck; animalId++) {
    try {
      const result = await directProviderCall('get_animal_data', [animalId.toString()]);
      if (!result || result.length < 9) continue;

      const propietario = result[4];
      // Verificar que el animal existe (propietario no es cero)
      if (propietario !== '0x0') {
        const animalData = {
          raza: BigInt(result[0]),
          fecha_nacimiento: BigInt(result[1]),
          peso: BigInt(result[2]),
          estado: Number(result[3]),
          propietario: propietario,
          frigorifico: result[5],
          certificador: result[6],
          exportador: result[7],
          lote_id: BigInt(result[8])
        };

        const owner = await directProviderCall('owner_of', [animalId.toString()]);
        
        cache.animals[animalId] = {
          id: animalId.toString(),
          raza: animalData.raza.toString(),
          fecha_nacimiento: animalData.fecha_nacimiento.toString(),
          peso: animalData.peso.toString(),
          estado: animalData.estado.toString(),
          propietario: animalData.propietario,
          frigorifico: animalData.frigorifico,
          certificador: animalData.certificador,
          exportador: animalData.exportador,
          lote_id: animalData.lote_id.toString(),
          owner: owner ? owner[0] : '0x0',
          num_cortes: '0',
          en_cuarentena: false,
          batch_id: '0'
        };
        
        animalsFound++;
        console.log(`   ✅ Encontrado animal ${animalId}: Propietario ${animalData.propietario}`);
      }
    } catch (err) {
      // Si falla, probablemente no existe ese animal
      break;
    }
  }
  
  console.log(`✅ Animales encontrados: ${animalsFound}`);
}

async function syncBatches() {
  try {
    console.log('🔄 Sincronizando lotes...');
    
    const stats = cache.system_stats;
    if (!stats || Number(stats.next_lote_id) <= 1) {
      console.log('ℹ️  No hay lotes en el contrato');
      return;
    }

    const totalBatches = Number(stats.next_lote_id) - 1;
    console.log(`📊 Procesando ${totalBatches} lotes...`);
    
    let batchesFound = 0;
    for (let batchId = 1; batchId <= totalBatches; batchId++) {
      try {
        const result = await directProviderCall('get_batch_info', [batchId.toString()]);
        if (!result || result.length < 2) continue;

        // El resultado debería ser una tupla con [lote_data, animal_ids]
        const batchDataResult = result[0]; // Datos del lote
        const animalIdsResult = result[1]; // Array de animal IDs
        
        if (batchDataResult.length < 8) continue;

        const batchData = {
          propietario: batchDataResult[0],
          frigorifico: batchDataResult[1],
          fecha_creacion: BigInt(batchDataResult[2]),
          fecha_transferencia: BigInt(batchDataResult[3]),
          fecha_procesamiento: BigInt(batchDataResult[4]),
          estado: Number(batchDataResult[5]),
          cantidad_animales: Number(batchDataResult[6]),
          peso_total: BigInt(batchDataResult[7])
        };

        // Parsear animal IDs (puede ser un array o un solo valor)
        const animalIds = Array.isArray(animalIdsResult) ? animalIdsResult : [animalIdsResult];
        
        cache.batches[batchId] = {
          id: batchId.toString(),
          propietario: batchData.propietario,
          frigorifico: batchData.frigorifico,
          fecha_creacion: batchData.fecha_creacion.toString(),
          fecha_transferencia: batchData.fecha_transferencia.toString(),
          fecha_procesamiento: batchData.fecha_procesamiento.toString(),
          estado: batchData.estado.toString(),
          cantidad_animales: batchData.cantidad_animales.toString(),
          peso_total: batchData.peso_total.toString(),
          animales: animalIds.map(id => id.toString()),
        };
        
        batchesFound++;
        console.log(`   ✅ Procesado lote ${batchId}/${totalBatches}`);
      } catch (err) {
        console.warn(`⚠️  Error en lote ${batchId}:`, err.message);
      }
    }
    
    console.log(`✅ Lotes sincronizados: ${batchesFound}`);
  } catch (err) {
    console.error('❌ Error sincronizando lotes:', err);
  }
}

async function syncRoles() {
  try {
    console.log('🔄 Sincronizando roles...');
    
    const result = await directProviderCall('get_role_stats');
    if (!result || result.length < 7) {
      console.log('ℹ️  No se pudieron obtener estadísticas de roles');
      return;
    }
    
    const roleStats = {
      producers: Number(result[0]),
      frigorificos: Number(result[1]),
      veterinarians: Number(result[2]),
      iot: Number(result[3]),
      certifiers: Number(result[4]),
      exporters: Number(result[5]),
      auditors: Number(result[6])
    };
    
    console.log('📊 Estadísticas de roles:', roleStats);
    
    // Solo procesar roles que tengan miembros
    const rolesToProcess = [
      { key: 'producer', value: ROLES.PRODUCER_ROLE, count: roleStats.producers },
      { key: 'frigorifico', value: ROLES.FRIGORIFICO_ROLE, count: roleStats.frigorificos },
      { key: 'veterinarian', value: ROLES.VET_ROLE, count: roleStats.veterinarians },
      { key: 'iot', value: ROLES.IOT_ROLE, count: roleStats.iot },
      { key: 'certifier', value: ROLES.CERTIFIER_ROLE, count: roleStats.certifiers },
      { key: 'exporter', value: ROLES.EXPORTER_ROLE, count: roleStats.exporters },
      { key: 'auditor', value: ROLES.AUDITOR_ROLE, count: roleStats.auditors }
    ].filter(role => role.count > 0);
    
    for (const role of rolesToProcess) {
      console.log(`   👥 Procesando rol ${role.key} (${role.count} miembros)`);
      
      try {
        const membersResult = await directProviderCall('get_all_role_members', [role.value]);
        if (!membersResult) continue;

        const members = Array.isArray(membersResult) ? membersResult : [membersResult];
        cache.roles[role.key] = [];
        
        for (const account of members) {
          try {
            const participantInfo = await directProviderCall('get_participant_info', [account]);
            if (participantInfo && participantInfo.length >= 5) {
              cache.roles[role.key].push({
                account: account,
                nombre: participantInfo[0],
                direccion: participantInfo[1],
                fecha_registro: participantInfo[2],
                activo: participantInfo[3] === '0x1',
                metadata: participantInfo[4]
              });
            } else {
              // Agregar cuenta sin info detallada
              cache.roles[role.key].push({
                account: account,
                nombre: 'Sin nombre',
                direccion: account,
                fecha_registro: '0',
                activo: true,
                metadata: 'Información no disponible'
              });
            }
          } catch (err) {
            console.warn(`⚠️  Error obteniendo info para cuenta ${account}`);
          }
        }
      } catch (err) {
        console.warn(`⚠️  Error obteniendo miembros del rol ${role.key}:`, err.message);
      }
    }
    
    console.log(`✅ Roles sincronizados: ${Object.keys(cache.roles).length}`);
  } catch (err) {
    console.error('❌ Error sincronizando roles:', err);
  }
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    console.log('💾 Cache guardado en archivo');
  } catch (err) {
    console.error('❌ Error guardando cache:', err);
  }
}

async function main() {
  console.log('🚀 Iniciando sincronización...');
  console.log(`📝 Contrato: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: ${NETWORK}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar que el provider funciona
    const block = await provider.getBlock('latest');
    console.log(`📦 Bloque actual: ${block.block_number}`);
    
    await syncAnimals();
    await syncBatches();
    await syncRoles();
    
    saveCache();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n✅ Sincronización completada');
    console.log(`⏱️  Duración: ${duration.toFixed(2)} segundos`);
    console.log(`📊 Resumen final:`);
    console.log(`   • Animales: ${Object.keys(cache.animals).length}`);
    console.log(`   • Lotes: ${Object.keys(cache.batches).length}`);
    console.log(`   • Roles: ${Object.keys(cache.roles).length}`);
    console.log(`   • Transacciones: ${cache.transacciones?.length || 0}`);
    
  } catch (err) {
    console.error('❌ Error en sincronización principal:', err);
    saveCache();
  }
}

// Ejecutar
main().catch(console.error);