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

let cache: any = {};
if (fs.existsSync(CACHE_FILE)) {
  cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
} else {
  cache = { animals: {}, batches: {}, roles: {}, transacciones: [], system_stats: {} };
}

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

// --- BUSCAR EVENTOS DIRECTAMENTE (CORREGIDO) ---
async function searchContractEventsDirectly() {
  try {
    console.log('\n🔍 Buscando eventos del contrato directamente...');
    
    const SPECIFIC_BLOCKS = [2430606, 2424449, 2424428, 2424404, 2417929, 2422628];
    console.log(`📦 Bloques específicos: ${SPECIFIC_BLOCKS.join(', ')}`);
    
    let eventsFound = 0;
    
    for (const blockNumber of SPECIFIC_BLOCKS) {
      try {
        console.log(`\n📋 Buscando eventos en bloque ${blockNumber}...`);
        
        // Buscar eventos directamente en el bloque - SINTAXIS CORREGIDA
        const eventsResponse = await provider.getEvents({
          from_block: { block_number: blockNumber }, // CORREGIDO: from_block en lugar de fromBlock
          to_block: { block_number: blockNumber },   // CORREGIDO: to_block en lugar de toBlock
          address: CONTRACT_ADDRESS,
          chunk_size: 100
        });
        
        console.log(`   📊 Eventos encontrados en bloque ${blockNumber}: ${eventsResponse.events.length}`);
        
        for (const event of eventsResponse.events) {
          console.log(`\n🎯 EVENTO ENCONTRADO:`);
          console.log(`   - Block: ${event.block_number}`);
          console.log(`   - Tx Hash: ${event.transaction_hash}`);
          console.log(`   - Keys: ${event.keys ? event.keys.join(', ') : 'N/A'}`);
          console.log(`   - Data: ${event.data ? event.data.slice(0, 6).join(', ') + '...' : 'N/A'}`);
          
          // Determinar tipo de evento basado en las keys
          let eventType = 'unknown';
          if (event.keys && event.keys.length > 0) {
            const firstKey = event.keys[0].toLowerCase();
            if (firstKey.includes('transfer') || firstKey.includes('lote')) {
              eventType = 'transfer_batch';
            } else if (firstKey.includes('authorize') || firstKey.includes('veterinarian')) {
              eventType = 'authorize_veterinarian';
            } else if (firstKey.includes('animal')) {
              eventType = 'animal_event';
            }
          }
          
          const transaction = {
            id: `event-${event.transaction_hash}-${eventsFound}`,
            tipo: eventType,
            hash: event.transaction_hash,
            block_number: event.block_number,
            fecha: Date.now(),
            data: {
              event_keys: event.keys || [],
              event_data: event.data ? event.data.slice(0, 8) : [],
              raw_event: event
            },
            estado: 'completada'
          };
          
          if (!cache.transacciones.find((t: any) => t.id === transaction.id)) {
            cache.transacciones.push(transaction);
            eventsFound++;
            console.log(`   💾 Evento guardado como: ${eventType}`);
          }
        }
        
      } catch (err) {
        console.warn(`   ⚠️  Error en bloque ${blockNumber}:`, err.message);
      }
    }
    
    console.log(`\n✅ Eventos encontrados: ${eventsFound}`);
    
  } catch (err) {
    console.error('❌ Error buscando eventos:', err);
  }
}

// --- BUSCAR EN RANGO DE BLOQUES ---
async function searchEventsInRange() {
  try {
    console.log('\n🔍 Buscando eventos en rango de bloques...');
    
    const minBlock = Math.min(2417929, 2422628, 2424404, 2424428, 2424449, 2430606);
    const maxBlock = Math.max(2417929, 2422628, 2424404, 2424428, 2424449, 2430606);
    
    console.log(`📦 Rango de búsqueda: ${minBlock} a ${maxBlock}`);
    
    try {
      const eventsResponse = await provider.getEvents({
        from_block: { block_number: minBlock - 100 }, // Buscar un poco antes
        to_block: { block_number: maxBlock + 100 },   // Buscar un poco después
        address: CONTRACT_ADDRESS,
        chunk_size: 500
      });
      
      console.log(`📊 Eventos encontrados en el rango: ${eventsResponse.events.length}`);
      
      let relevantEvents = 0;
      const SPECIFIC_BLOCKS = [2430606, 2424449, 2424428, 2424404, 2417929, 2422628];
      
      for (const event of eventsResponse.events) {
        // Filtrar solo eventos de los bloques que nos interesan
        if (SPECIFIC_BLOCKS.includes(event.block_number)) {
          console.log(`\n🎯 Evento relevante en bloque ${event.block_number}:`);
          console.log(`   - Tx Hash: ${event.transaction_hash}`);
          console.log(`   - Keys: ${event.keys ? event.keys.join(', ') : 'N/A'}`);
          
          let eventType = 'contract_event';
          if (event.keys && event.keys.length > 0) {
            const keyStr = event.keys.join(',').toLowerCase();
            if (keyStr.includes('transfer')) eventType = 'transfer_event';
            if (keyStr.includes('authorize')) eventType = 'authorize_event';
            if (keyStr.includes('animal')) eventType = 'animal_event';
            if (keyStr.includes('lote')) eventType = 'batch_event';
          }
          
          const transaction = {
            id: `range-event-${event.transaction_hash}`,
            tipo: eventType,
            hash: event.transaction_hash,
            block_number: event.block_number,
            fecha: Date.now(),
            data: {
              event_keys: event.keys || [],
              event_data: event.data ? event.data.slice(0, 6) : []
            },
            estado: 'completada'
          };
          
          if (!cache.transacciones.find((t: any) => t.id === transaction.id)) {
            cache.transacciones.push(transaction);
            relevantEvents++;
            console.log(`   💾 Guardado como: ${eventType}`);
          }
        }
      }
      
      console.log(`\n✅ Eventos relevantes encontrados: ${relevantEvents}`);
      
    } catch (err) {
      console.log('⚠️  No se pudieron obtener eventos del rango:', err.message);
    }
    
  } catch (err) {
    console.error('❌ Error buscando eventos en rango:', err);
  }
}

// --- BUSCAR TRANSACCIONES POR BLOQUES ---
async function searchTransactionsWithoutEvents() {
  try {
    console.log('\n🔄 Buscando transacciones por bloques...');
    
    const SPECIFIC_BLOCKS = [2430606, 2424449, 2424428, 2424404, 2417929, 2422628];
    console.log(`📦 Bloques a revisar: ${SPECIFIC_BLOCKS.join(', ')}`);
    
    let transactionsFound = 0;
    
    for (const blockNumber of SPECIFIC_BLOCKS) {
      try {
        console.log(`\n🔍 Analizando bloque ${blockNumber}...`);
        
        const block = await provider.getBlockWithTxs(blockNumber);
        console.log(`   📊 Transacciones en bloque: ${block.transactions.length}`);
        
        for (const tx of block.transactions) {
          if (tx.type === 'INVOKE') {
            // Helper seguro para obtener sender_address
            const getSender = (tx: any): string => {
              return tx.sender_address || tx.sender_address_v1 || tx.sender_address_v3 || '0x0';
            };
            
            // Helper seguro para obtener calldata
            const getCalldata = (tx: any): string[] => {
              if (tx.calldata) {
                return Array.isArray(tx.calldata) ? tx.calldata : [tx.calldata];
              }
              return [];
            };
            
            const sender = getSender(tx);
            const calldata = getCalldata(tx);
            
            // Verificar si es una transacción a nuestro contrato
            const contractAddressShort = CONTRACT_ADDRESS.toLowerCase().replace('0x', '');
            const isOurContract = calldata.some((data: string) => 
              data.toLowerCase().includes(contractAddressShort)
            );
            
            if (isOurContract) {
              console.log(`   ✅ Transacción a nuestro contrato encontrada:`);
              console.log(`      - Hash: ${tx.transaction_hash}`);
              console.log(`      - From: ${sender}`);
              
              // Analizar calldata para determinar función
              const calldataStr = calldata.join(',').toLowerCase();
              let transactionType = 'contract_interaction';
              
              if (calldataStr.includes('transfer_batch_to_frigorifico')) {
                transactionType = 'transfer_batch_to_frigorifico';
              } else if (calldataStr.includes('authorize_veterinarian')) {
                transactionType = 'authorize_veterinarian_for_animal';
              }
              
              const transaction = {
                id: `tx-${tx.transaction_hash}`,
                tipo: transactionType,
                hash: tx.transaction_hash,
                from: sender,
                to: CONTRACT_ADDRESS,
                block_number: blockNumber,
                fecha: Date.now(),
                data: {
                  calldata_preview: calldata.slice(0, 8),
                  transaction_type: tx.type
                },
                estado: 'completada'
              };
              
              if (!cache.transacciones.find((t: any) => t.hash === transaction.hash)) {
                cache.transacciones.push(transaction);
                transactionsFound++;
                console.log(`      💾 Tipo: ${transactionType}`);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`   ⚠️  Error en bloque ${blockNumber}:`, err.message);
      }
    }
    
    console.log(`\n✅ Transacciones encontradas: ${transactionsFound}`);
    
  } catch (err) {
    console.error('❌ Error buscando transacciones:', err);
  }
}

// --- FUNCIÓN PRINCIPAL ---
async function main() {
  console.log('🚀 BUSCADOR DE EVENTOS Y TRANSACCIONES - CORREGIDO');
  console.log(`📝 Contrato: ${CONTRACT_ADDRESS}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Buscar eventos por bloques específicos
    await searchContractEventsDirectly();
    
    // 2. Buscar eventos en rango (más comprensivo)
    await searchEventsInRange();
    
    // 3. Buscar transacciones directamente
    await searchTransactionsWithoutEvents();
    
    // Guardar cache
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log('\n💾 Cache guardado en archivo');
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n🎉 BÚSQUEDA COMPLETADA');
    console.log(`⏱️  Duración: ${duration.toFixed(2)} segundos`);
    console.log(`\n📊 RESULTADOS:`);
    console.log(`   🔄 Total transacciones/eventos: ${cache.transacciones.length}`);
    
    // Mostrar resumen detallado
    if (cache.transacciones.length > 0) {
      console.log(`\n📋 DETALLE ENCONTRADO:`);
      
      const byType: any = {};
      const byBlock: any = {};
      
      cache.transacciones.forEach((tx: any) => {
        // Agrupar por tipo
        byType[tx.tipo] = (byType[tx.tipo] || 0) + 1;
        // Agrupar por bloque
        byBlock[tx.block_number] = (byBlock[tx.block_number] || 0) + 1;
      });
      
      console.log(`   📊 Por tipo:`, byType);
      console.log(`   📊 Por bloque:`, byBlock);
      
      // Mostrar las últimas 5 transacciones
      console.log(`\n   🔍 Últimas transacciones:`);
      cache.transacciones.slice(-5).forEach((tx: any, index: number) => {
        console.log(`      ${index + 1}. ${tx.tipo} - Block ${tx.block_number} - ${tx.hash.slice(0, 15)}...`);
      });
    } else {
      console.log(`\n❌ No se encontraron transacciones/eventos`);
      console.log(`💡 Sugerencias:`);
      console.log(`   • Verificar que los bloques sean correctos`);
      console.log(`   • Revisar si el contrato emite eventos`);
      console.log(`   • Verificar la dirección del contrato`);
    }
    
  } catch (err) {
    console.error('❌ Error en búsqueda:', err);
  }
}

// Ejecutar
main().catch(console.error);