import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Provider, Contract } from 'starknet';
import { ANIMAL_NFT_ABI } from './starknet/animal-nft-abi.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const NETWORK = 'https://starknet-sepolia.public.blastapi.io/rpc/v0_9';
const CONTRACT_ADDRESS = '0x065f45868a08c394cb54d94a6e4eb08012435b5c9803bb41d22ecb9e603e535d';
const CACHE_FILE = join(__dirname, 'cache.json');

const provider = new Provider({ 
  nodeUrl: NETWORK,
  retries: 3
});

const contract = new Contract(ANIMAL_NFT_ABI as any, CONTRACT_ADDRESS, provider);

// Definir tipos explícitos
interface DecodedEvent {
  event_name: string;
  raw_keys: any[];
  raw_data: any[];
  lote_id?: number;
  from_address?: string;
  to_address?: string;
  cantidad_animales?: number;
  animal_id?: number;
  veterinarian_address?: string;
  owner_address?: string;
  timestamp?: number;
  error?: string;
}

interface Transaction {
  id: string;
  tipo: string;
  hash: string;
  block_number: number;
  fecha: number;
  data: {
    event_keys: any[];
    event_data: any[];
    decoded?: DecodedEvent;
    lote_id?: number;
    from?: string;
    to?: string;
    cantidad_animales?: number;
    animal_id?: number;
    veterinarian?: string;
    owner?: string;
    batch_info?: any;
  };
  estado: string;
}

interface CacheData {
  animals: { [key: string]: any };
  batches: { [key: string]: any };
  roles: { [key: string]: any };
  transacciones: Transaction[];
  system_stats: any;
}

let cache: CacheData = {
  animals: {},
  batches: {},
  roles: {},
  transacciones: [],
  system_stats: {}
};

if (fs.existsSync(CACHE_FILE)) {
  const cacheContent = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  cache = {
    animals: cacheContent.animals || {},
    batches: cacheContent.batches || {},
    roles: cacheContent.roles || {},
    transacciones: cacheContent.transacciones || [],
    system_stats: cacheContent.system_stats || {}
  };
}

// Mapeo de keys de eventos
const EVENT_KEYS: { [key: string]: { name: string, structure: string[] } } = {
  '0x36e8550deecfa82187961d9ad914388b667f565096589b42228a04e544819ec': {
    name: 'LoteAnimalTransferido',
    structure: ['lote_id', 'from_address', 'to_address', 'cantidad_animales', 'timestamp']
  },
  '0x24a35840d2f5f9417071d58c9b021cc3e5434123ddf2365ea4674b59edc518a': {
    name: 'VeterinarioAutorizado',
    structure: ['animal_id', 'veterinarian_address', 'owner_address', 'timestamp']
  },
};

// Helper functions
function safeParseBigInt(value: any): bigint {
  try {
    if (value === undefined || value === null || value === '') return BigInt(0);
    if (typeof value === 'bigint') return value;
    if (typeof value === 'string' && value.startsWith('0x')) {
      return BigInt(value);
    }
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

function safeParseNumber(value: any): number {
  try {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.startsWith('0x')) {
      return parseInt(value, 16);
    }
    return Number(value);
  } catch {
    return 0;
  }
}

function safeParseAddress(value: any): string {
  try {
    if (!value || value === '0x0' || value === '0') return '0x0';
    const str = value.toString();
    return str.startsWith('0x') ? str : `0x${str}`;
  } catch {
    return '0x0';
  }
}

// Función para decodificar eventos
function decodeEventWithABI(event: { keys: any[], data: any[] }): DecodedEvent {
  const eventKey = event.keys[0];
  const eventInfo = EVENT_KEYS[eventKey];
  
  if (!eventInfo) {
    return {
      event_name: 'UnknownEvent',
      raw_keys: event.keys,
      raw_data: event.data,
      error: 'Event key not recognized'
    };
  }
  
  const decodedData: DecodedEvent = {
    event_name: eventInfo.name,
    raw_keys: event.keys,
    raw_data: event.data
  };
  
  // Decodificar según la estructura definida
  eventInfo.structure.forEach((fieldName, index) => {
    if (event.data && event.data[index] !== undefined) {
      if (fieldName.includes('address')) {
        (decodedData as any)[fieldName] = safeParseAddress(event.data[index]);
      } else if (fieldName.includes('timestamp') || fieldName.includes('fecha')) {
        (decodedData as any)[fieldName] = safeParseNumber(event.data[index]);
      } else if (fieldName.includes('id') || fieldName.includes('animales')) {
        (decodedData as any)[fieldName] = safeParseNumber(event.data[index]);
      } else {
        (decodedData as any)[fieldName] = event.data[index];
      }
    }
  });
  
  return decodedData;
}

// Función para analizar y decodificar todos los eventos
async function analyzeAndDecodeEvents() {
  console.log('🔍 ANALIZANDO Y DECODIFICANDO EVENTOS CON ABI\n');
  
  if (!cache.transacciones || cache.transacciones.length === 0) {
    console.log('❌ No hay eventos para analizar');
    return;
  }
  
  console.log(`📊 Total de eventos encontrados: ${cache.transacciones.length}\n`);
  
  // Decodificar y mostrar detalles de cada evento
  console.log('🎯 EVENTOS DECODIFICADOS CON ABI:\n');
  
  const transferEvents: Transaction[] = [];
  const authEvents: Transaction[] = [];
  
  cache.transacciones.forEach((tx: Transaction, index: number) => {
    const decodedEvent = decodeEventWithABI({
      keys: tx.data.event_keys,
      data: tx.data.event_data
    });
    
    console.log(`📍 EVENTO ${index + 1}:`);
    console.log(`   - Tipo: ${decodedEvent.event_name}`);
    console.log(`   - Bloque: ${tx.block_number}`);
    console.log(`   - Tx Hash: ${tx.hash.slice(0, 20)}...`);
    
    // Mostrar datos específicos según el tipo de evento
    if (decodedEvent.event_name === 'LoteAnimalTransferido') {
      console.log(`   📦 TRANSFERENCIA DE LOTE:`);
      console.log(`      • Lote ID: ${decodedEvent.lote_id}`);
      console.log(`      • De: ${decodedEvent.from_address} (Productor)`);
      console.log(`      • A: ${decodedEvent.to_address} (Frigorífico)`);
      console.log(`      • Cantidad animales: ${decodedEvent.cantidad_animales}`);
      if (decodedEvent.timestamp) {
        const fecha = new Date(Number(decodedEvent.timestamp) * 1000);
        console.log(`      • Fecha: ${fecha.toLocaleString()}`);
      }
      
      transferEvents.push(tx);
      
    } else if (decodedEvent.event_name === 'VeterinarioAutorizado') {
      console.log(`   🩺 AUTORIZACIÓN DE VETERINARIO:`);
      console.log(`      • Animal ID: ${decodedEvent.animal_id}`);
      console.log(`      • Veterinario: ${decodedEvent.veterinarian_address}`);
      console.log(`      • Propietario: ${decodedEvent.owner_address}`);
      if (decodedEvent.timestamp) {
        const fecha = new Date(Number(decodedEvent.timestamp) * 1000);
        console.log(`      • Fecha: ${fecha.toLocaleString()}`);
      }
      
      authEvents.push(tx);
    } else {
      console.log(`   ❓ Evento desconocido:`, decodedEvent.raw_data);
    }
    
    console.log('');
  });
  
  // Resumen detallado
  console.log('📊 RESUMEN DETALLADO:\n');
  
  console.log(`   🚚 TRANSFERENCIAS DE LOTES: ${transferEvents.length}`);
  transferEvents.forEach((event: Transaction, index: number) => {
    const decodedEvent = decodeEventWithABI({
      keys: event.data.event_keys,
      data: event.data.event_data
    });
    
    console.log(`      ${index + 1}. Lote ${decodedEvent.lote_id}`);
    console.log(`         - De: ${decodedEvent.from_address?.slice(0, 10)}...`);
    console.log(`         - A: ${decodedEvent.to_address?.slice(0, 10)}...`);
    console.log(`         - Animales: ${decodedEvent.cantidad_animales}`);
    console.log(`         - Bloque: ${event.block_number}`);
    console.log(`         - Tx: ${event.hash.slice(0, 15)}...`);
    console.log(``);
  });
  
  console.log(`\n   🩺 AUTORIZACIONES DE VETERINARIO: ${authEvents.length}`);
  authEvents.forEach((event: Transaction, index: number) => {
    const decodedEvent = decodeEventWithABI({
      keys: event.data.event_keys,
      data: event.data.event_data
    });
    
    console.log(`      ${index + 1}. Animal ${decodedEvent.animal_id}`);
    console.log(`         - Veterinario: ${decodedEvent.veterinarian_address?.slice(0, 10)}...`);
    console.log(`         - Propietario: ${decodedEvent.owner_address?.slice(0, 10)}...`);
    console.log(`         - Bloque: ${event.block_number}`);
    console.log(`         - Tx: ${event.hash.slice(0, 15)}...`);
    console.log(``);
  });
  
  // Actualizar el cache con eventos decodificados
  cache.transacciones.forEach((tx: Transaction) => {
    const decodedEvent = decodeEventWithABI({
      keys: tx.data.event_keys,
      data: tx.data.event_data
    });
    
    tx.tipo = decodedEvent.event_name;
    tx.data.decoded = decodedEvent;
    
    // Agregar información adicional basada en el tipo
    if (decodedEvent.event_name === 'LoteAnimalTransferido') {
      tx.data.lote_id = decodedEvent.lote_id;
      tx.data.from = decodedEvent.from_address;
      tx.data.to = decodedEvent.to_address;
      tx.data.cantidad_animales = decodedEvent.cantidad_animales;
    } else if (decodedEvent.event_name === 'VeterinarioAutorizado') {
      tx.data.animal_id = decodedEvent.animal_id;
      tx.data.veterinarian = decodedEvent.veterinarian_address;
      tx.data.owner = decodedEvent.owner_address;
    }
  });
  
  // Guardar cache actualizado
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  console.log('💾 Cache actualizado con eventos decodificados');
}

// Función para verificar la información de los lotes transferidos
async function verifyBatchInformation() {
  console.log('\n🔍 VERIFICANDO INFORMACIÓN DE LOTES TRANSFERIDOS...\n');
  
  const transferEvents = cache.transacciones.filter((tx: Transaction) => 
    tx.tipo === 'LoteAnimalTransferido'
  );
  
  if (transferEvents.length === 0) {
    console.log('❌ No hay eventos de transferencia para verificar');
    return;
  }
  
  for (const event of transferEvents) {
    try {
      const decodedEvent = event.data.decoded as DecodedEvent;
      console.log(`📦 Verificando Lote ${decodedEvent.lote_id}...`);
      
      // Llamar al contrato para obtener información del lote
      const batchInfo = await contract.get_batch_info(decodedEvent.lote_id!.toString());
      
      if (batchInfo && batchInfo.length >= 2) {
        const batchData = batchInfo[0];
        const animalIds = batchInfo[1];
        
        console.log(`   ✅ Información del lote ${decodedEvent.lote_id}:`);
        console.log(`      - Propietario: ${safeParseAddress(batchData[0])}`);
        console.log(`      - Frigorífico: ${safeParseAddress(batchData[1])}`);
        console.log(`      - Estado: ${safeParseNumber(batchData[5])}`);
        console.log(`      - Cantidad animales: ${safeParseNumber(batchData[6])}`);
        console.log(`      - Peso total: ${safeParseBigInt(batchData[7])}`);
        console.log(`      - Animales en lote: ${animalIds ? animalIds.length : 0}`);
        
        // Actualizar información en el cache
        event.data.batch_info = {
          propietario: safeParseAddress(batchData[0]),
          frigorifico: safeParseAddress(batchData[1]),
          estado: safeParseNumber(batchData[5]),
          cantidad_animales: safeParseNumber(batchData[6]),
          peso_total: safeParseBigInt(batchData[7]).toString(),
          animales_count: animalIds ? animalIds.length : 0
        };
      }
    } catch (err: any) {
      console.log(`   ❌ Error obteniendo info del lote:`, err.message);
    }
    console.log('');
  }
  
  // Guardar cache actualizado con información de lotes
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  console.log('💾 Cache actualizado con información de lotes');
}

// Función principal
async function main() {
  console.log('🚀 DECODIFICADOR DE EVENTOS CON ABI PRECISO');
  console.log(`📝 Contrato: ${CONTRACT_ADDRESS}\n`);
  
  try {
    // 1. Analizar y decodificar eventos existentes
    await analyzeAndDecodeEvents();
    
    // 2. Verificar información de lotes (opcional)
    console.log('\n' + '='.repeat(60));
    await verifyBatchInformation();
    
    console.log('\n🎉 ANÁLISIS COMPLETADO');
    console.log(`📊 Resumen final:`);
    console.log(`   • Eventos totales: ${cache.transacciones.length}`);
    console.log(`   • Transferencias de lotes: ${cache.transacciones.filter((t: Transaction) => t.tipo === 'LoteAnimalTransferido').length}`);
    console.log(`   • Autorizaciones de veterinario: ${cache.transacciones.filter((t: Transaction) => t.tipo === 'VeterinarioAutorizado').length}`);
    
  } catch (err) {
    console.error('❌ Error en el análisis:', err);
  }
}

// Ejecutar
main().catch(console.error);