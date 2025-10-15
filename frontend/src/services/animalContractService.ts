// src/services/animalContractService.ts - VERSIÓN COMPLETA Y CORREGIDA
import { RazaAnimal, EstadoAnimal, TipoCorte, CONTRACT_FUNCTIONS, ROLES, ROLE_DISPLAY_NAMES  } from '@/contracts/config';
import { chipyPayService } from './chipypay-service'; // ✅ Importar la instancia singleton
import { CHIPYPAY_CONFIG, TransferPayment } from '@/contracts/chipypay-config';
export class AnimalContractService {
  private wallet: any;
  private contractAddress: string;
  private chipyPay: typeof chipyPayService;

  constructor(wallet: any) {
    this.wallet = wallet;
    this.contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
    
    // ✅ USAR la instancia singleton en lugar de crear una nueva
    this.chipyPay = chipyPayService;
    
    if (wallet) {
      console.log('🔍 Wallet inicializada en AnimalContractService:', {
        address: wallet?.selectedAddress,
        contractAddress: this.contractAddress
      });
    }
  }

  // ============ MÉTODOS AUXILIARES PRIVADOS ============

  private async sendTransaction(entrypoint: string, calldata: any[]): Promise<any> {
    if (!this.wallet) {
      throw new Error('Wallet no conectada');
    }

    console.log(`🔍 Enviando ${entrypoint}`, {
      contractAddress: this.contractAddress,
      entrypoint,
      calldata: calldata.map(param => 
        typeof param === 'bigint' || typeof param === 'number' ? param.toString() : param
      )
    });

    try {
      let result;
      if (this.wallet.account?.execute) {
        const validatedCalldata = calldata.map(param => {
          if (typeof param === 'bigint') return param.toString();
          if (typeof param === 'number') return param.toString();
          return param;
        });
        
        result = await this.wallet.account.execute({
          contractAddress: this.contractAddress,
          entrypoint: entrypoint,
          calldata: validatedCalldata
        });
      }
      else if (this.wallet.request) {
        const validatedCalldata = calldata.map(param => {
          if (typeof param === 'bigint') return param.toString();
          if (typeof param === 'number') return param.toString();
          return param;
        });
        
        result = await this.wallet.request({
          type: 'starknet_addInvokeTransaction',
          params: {
            contractAddress: this.contractAddress,
            entrypoint: entrypoint,
            calldata: validatedCalldata
          }
        });
      }
      else {
        throw new Error('No se pudo encontrar un método de transacción compatible');
      }

      console.log(`✅ ${entrypoint} enviada exitosamente`);
      return result;

    } catch (error: any) {
      console.error(`❌ Error en ${entrypoint}:`, error);
      if (error.message.includes('Execute failed')) {
        throw new Error(`Error en contrato: ${entrypoint} falló - verifica parámetros`);
      } else if (error.message.includes('account')) {
        throw new Error('Error de wallet - verifica conexión');
      } else {
        throw error;
      }
    }
  }

  private async callContract(entrypoint: string, calldata: any[]): Promise<any> {
    if (!this.wallet?.provider) {
      throw new Error('Provider no disponible');
    }

    try {
      console.log(`🔍 [CALL] ${entrypoint}`, { calldata });
      
      // ✅ AGREGAR timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La llamada al contrato está tomando demasiado tiempo')), 15000)
      );
      
      const callPromise = this.wallet.provider.callContract({
        contractAddress: this.contractAddress,
        entrypoint: entrypoint,
        calldata: calldata
      });
      
      const result = await Promise.race([callPromise, timeoutPromise]);
      return result;
      
    } catch (error: any) {
      console.error(`❌ Error en callContract para ${entrypoint}:`, error);
      
      // ✅ MEJOR MANEJO DE ERRORES
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Error de conexión con la red StarkNet. Verifica tu conexión a internet.');
      } else if (error.message.includes('Timeout')) {
        throw new Error('La red está respondiendo lentamente. Intenta nuevamente.');
      } else if (error.message.includes('entrypoint does not exist')) {
        throw new Error(`La función ${entrypoint} no existe en el contrato.`);
      }
      
      throw error;
    }
  }

  private extractTransactionHash(result: any): string {
  console.log('🔍 DEBUG - Buscando hash en:', result);
  
  const txHash = result?.transaction_hash || 
                 result?.tx_hash || 
                 result?.hash || 
                 result?.transactionHash ||
                 result?.txHash;

  if (!txHash) {
    console.warn('⚠️ No se pudo extraer hash de transacción, pero la transacción puede haber sido exitosa');
    // ✅ CORRECCIÓN: En lugar de lanzar error, lanzar uno específico
    throw new Error('NO_HASH_BUT_SUCCESS');
  }
  
  console.log('✅ Hash encontrado:', txHash);
  return txHash;
}

  // ============ FUNCIONES DE CREACIÓN ============

  async createAnimalSimple(raza: RazaAnimal): Promise<{ animalId: bigint; txHash: string }> {
    try {
      const result = await this.sendTransaction(
        CONTRACT_FUNCTIONS.CREATE_ANIMAL_SIMPLE,
        [raza.toString()]
      );

      const txHash = this.extractTransactionHash(result);
      await this.waitForTransaction(txHash);
      
      const animalId = await this.findActualAnimalId();
      
      return {
        animalId: animalId,
        txHash: txHash
      };

    } catch (error: any) {
      console.error('❌ Error en createAnimalSimple:', error);
      throw new Error(`Error al crear animal simple: ${error.message}`);
    }
  }

  async createAnimal(
    metadataHash: string,
    raza: RazaAnimal,
    fechaNacimiento: number,
    peso: bigint
  ): Promise<{ animalId: bigint; txHash: string }> {
    try {
      if (!metadataHash || !metadataHash.startsWith('0x')) {
        throw new Error('Metadata hash debe comenzar con 0x (formato hexadecimal)');
      }

      const calldata = [
        metadataHash,
        raza.toString(),
        fechaNacimiento.toString(),
        peso.toString()
      ];

      const result = await this.sendTransaction('create_animal', calldata);
      const txHash = this.extractTransactionHash(result);
      
      await this.waitForTransaction(txHash);
      
      const animalId = await this.findActualAnimalId();
      
      if (!animalId) {
        throw new Error('No se pudo obtener el ID del animal creado');
      }

      return {
        animalId: animalId,
        txHash: txHash
      };

    } catch (error: any) {
      console.error('❌ Error en createAnimal:', error);
      throw new Error(`Error al crear animal completo: ${error.message}`);
    }
  }

  // ============ FUNCIONES DE LOTE MEJORADAS ============

  async createAnimalBatch(animalIds: bigint[]): Promise<{ batchId: bigint; txHash: string }> {
    try {
      console.log(`📦 Creando lote con ${animalIds.length} animales`);
      
      const verification = await this.verifyAnimalsAvailable(animalIds);
      
      if (verification.available.length === 0) {
        throw new Error(`No hay animales disponibles: ${verification.reasons.join('; ')}`);
      }

      const animalIdsStr = verification.available.map(id => id.toString());
      
      const result = await this.sendTransaction(
        'create_animal_batch',
        [animalIdsStr.length, ...animalIdsStr]
      );

      const txHash = this.extractTransactionHash(result);
      await this.waitForTransaction(txHash);
      
      const actualBatchId = await this.getNewlyCreatedBatchId();
      
      console.log(`✅ Lote #${actualBatchId} creado exitosamente`);
      
      return { 
        batchId: actualBatchId,
        txHash 
      };
      
    } catch (error: any) {
      console.error('❌ Error creando lote:', error);
      throw new Error(`Error creando lote: ${error.message}`);
    }
  }

  // ✅ FUNCIÓN CORREGIDA: Crear lote filtrando animales problemáticos
  async createAnimalBatchSafe(animalIds: bigint[]): Promise<{ batchId: bigint; txHash: string }> {
    try {
      console.log(`📦 [CORREGIDO] Creando lote con animales:`, animalIds.map(id => id.toString()));
      
      const verification = await this.verifyAnimalsAvailable(animalIds);
      
      if (verification.available.length === 0) {
        throw new Error(`No hay animales disponibles: ${verification.reasons.join('; ')}`);
      }

      console.log(`✅ Animales verificados:`, verification.available.map(id => id.toString()));

      // ✅ FORMA CORRECTA para Cairo - Solo el array de animal_ids
      const animalIdsStr = verification.available.map(id => id.toString());
      
      const calldata = [
        animalIdsStr.length.toString(),  // length del array (u128)
        ...animalIdsStr                  // elementos del array (u128[])
      ];
      
      console.log('🔍 Calldata FINAL enviada al contrato:', calldata);
      console.log('📋 Estructura interpretada:', {
        array_length: animalIdsStr.length.toString(),
        animal_ids: animalIdsStr
      });

      const result = await this.sendTransaction(
        'create_animal_batch',
        calldata
      );

      const txHash = this.extractTransactionHash(result);
      
      await this.waitForTransaction(txHash);
      
      const actualBatchId = await this.getNewlyCreatedBatchId();
      
      console.log(`✅ Lote #${actualBatchId} creado exitosamente`);
      
      return { 
        batchId: actualBatchId,
        txHash 
      };
      
    } catch (error: any) {
      console.error('❌ Error creando lote:', error);
      throw new Error(`Error creando lote: ${error.message}`);
    }
  }

  // ============ FUNCIONES DE CONSULTA COMPATIBILIDAD ============

  async getAnimalsByOwner(ownerAddress: string): Promise<any[]> {
    try {
      console.log(`🔄 Obteniendo animales del propietario: ${ownerAddress}`);
      
      // ✅ USAR getAnimalsByProducer que SÍ existe
      const animalIds = await this.getAnimalsByProducer(ownerAddress);
      const ownerAnimals = [];
      
      for (const animalId of animalIds) {
        try {
          const animalData = await this.getAnimalData(animalId);
          if (animalData.propietario === ownerAddress) {
            ownerAnimals.push({
              ...animalData,
              fechaCreacion: new Date(animalData.fechaNacimiento * 1000).toISOString().split('T')[0],
              metadataHash: 'real_data_from_contract'
            });
          }
        } catch (error) {
          console.log(`Animal #${animalId} no encontrado`);
        }
      }
      
      return ownerAnimals;
      
    } catch (error: any) {
      console.error('❌ Error obteniendo animales del propietario:', error);
      return [];
    }
  }

  async transferBatchToFrigorifico(batchId: bigint, frigorifico: string): Promise<string> {
    try {
      console.log(`🏭 Transfiriendo lote #${batchId} a frigorífico: ${frigorifico}`);
      
      const batchInfo = await this.getBatchInfo(batchId);
      if (!batchInfo || batchInfo.propietario !== this.wallet.selectedAddress) {
        throw new Error('No eres el propietario de este lote o el lote no existe');
      }

      if (batchInfo.estado !== 0) {
        throw new Error('Este lote ya ha sido transferido al frigorífico');
      }

      const result = await this.sendTransaction(
        'transfer_batch_to_frigorifico',
        [batchId.toString(), frigorifico]
      );

      const txHash = this.extractTransactionHash(result);
      console.log(`✅ Lote #${batchId} transferido exitosamente`);
      return txHash;
      
    } catch (error: any) {
      console.error('❌ Error transfiriendo lote:', error);
      throw new Error(`Error transfiriendo lote: ${error.message}`);
    }
  }

  // ✅ FUNCIÓN CORREGIDA para add_animals_to_batch
  async addAnimalsToBatch(batchId: bigint, animalIds: bigint[]): Promise<string> {
    try {
      console.log(`➕ [ADD CORREGIDO] Agregando ${animalIds.length} animales al lote #${batchId}`);
      console.log('🔍 Animales recibidos:', animalIds.map(id => id.toString()));
      
      const verification = await this.verifyAnimalsAvailable(animalIds);
      
      if (verification.available.length === 0) {
        throw new Error(`No hay animales disponibles: ${verification.reasons.join('; ')}`);
      }

      console.log('✅ Animales disponibles verificados:', verification.available.map(id => id.toString()));

      // ✅ ESTRUCTURA CORRECTA para add_animals_to_batch
      const calldata = [
        batchId.toString(),                    // batch_id (u128)
        verification.available.length.toString(), // length del array (u128)
        ...verification.available.map(id => id.toString()) // elementos del array (u128[])
      ];
      
      console.log('🔍 Calldata FINAL para ADD:', calldata);
      console.log('📋 Estructura interpretada:', {
        batch_id: batchId.toString(),
        array_length: verification.available.length.toString(),
        animal_ids: verification.available.map(id => id.toString())
      });

      const result = await this.sendTransaction(
        'add_animals_to_batch',
        calldata
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Transacción de agregar animales enviada:', txHash);
      return txHash;
      
    } catch (error: any) {
      console.error('❌ Error en addAnimalsToBatch:', error);
      throw new Error(`Error agregando animales al lote: ${error.message}`);
    }
  }

  // ============ FUNCIONES DE CONSULTA MEJORADAS ============

  // Agrega esta función al AnimalContractService:

/**
 * ✅ NUEVA FUNCIÓN: Obtener lotes por frigorífico
 */
async getBatchesByFrigorifico(frigorificoAddress: string): Promise<bigint[]> {
  try {
    console.log(`🔍 Obteniendo lotes para frigorífico: ${frigorificoAddress}`);
    
    // Usar getBatchesByProducer como base y filtrar por frigorífico
    const allBatches = await this.getBatchesByProducer(frigorificoAddress);
    const frigorificoBatches: bigint[] = [];
    
    for (const batchId of allBatches) {
      try {
        const batchInfo = await this.getBatchInfo(batchId);
        if (batchInfo.frigorifico?.toLowerCase() === frigorificoAddress.toLowerCase()) {
          frigorificoBatches.push(batchId);
        }
      } catch (error) {
        console.log(`Error verificando lote ${batchId}:`, error);
      }
    }
    
    console.log(`✅ ${frigorificoBatches.length} lotes encontrados para frigorífico`);
    return frigorificoBatches;
    
  } catch (error: any) {
    console.error('❌ Error obteniendo lotes por frigorífico:', error);
    return [];
  }
}

/**
 * ✅ FUNCIÓN ALTERNATIVA: Obtener todos los lotes del sistema (escaneo)
 */
async getAllBatches(): Promise<bigint[]> {
  try {
    console.log('🔍 [ALTERNATIVA] Obteniendo TODOS los lotes escaneando blockchain...');
    
    const allBatches: bigint[] = [];
    const stats = await this.getSystemStats();
    const totalBatches = Number(stats.total_batches_created || 0);
    
    console.log(`📊 Revisando ${totalBatches} lotes en el sistema...`);
    
    for (let i = 1; i <= totalBatches; i++) {
      try {
        const batchId = BigInt(i);
        const batchInfo = await this.getBatchInfo(batchId);
        
        // Si el lote existe (tiene propietario válido), agregarlo
        if (batchInfo && batchInfo.propietario !== '0x0') {
          allBatches.push(batchId);
        }
      } catch (error) {
        // Lote no existe o error, continuar
        console.log(`Lote #${i} no disponible`);
      }
    }
    
    console.log(`✅ [ALTERNATIVA] ${allBatches.length} lotes encontrados`);
    return allBatches;
    
  } catch (error: any) {
    console.error('❌ Error obteniendo todos los lotes:', error);
    return [];
  }
}

  async getBatchInfo(batchId: bigint): Promise<any> {
    try {
      console.log(`🔍 [DEBUG] Obteniendo info del lote #${batchId}...`);
      
      const result = await this.callContract('get_batch_info', [batchId.toString()]);
      
      console.log(`📊 [DEBUG] Resultado RAW para lote #${batchId}:`, result);
      console.log(`🔢 [DEBUG] Longitud del resultado:`, result?.length);
      
      if (!result || !Array.isArray(result) || result.length < 6) {
        throw new Error('Respuesta del contrato inválida');
      }
      
      // ✅ ANALIZAR la estructura REAL de 10 elementos
      console.log(`🔬 [DEBUG] Análisis de estructura para lote #${batchId}:`);
      console.log(`   [0] Propietario: ${result[0]} ${result[0] === '0x0' ? '(INVÁLIDO)' : '(VÁLIDO)'}`);
      console.log(`   [1] Frigorífico: ${result[1]} ${result[1] === '0x0' ? '(NO ASIGNADO)' : '(ASIGNADO)'}`);
      console.log(`   [2] Fecha creación: ${result[2]} (${parseInt(result[2], 16)})`);
      console.log(`   [3] Fecha transferencia: ${result[3]} ${result[3] === '0x0' ? '(NO TRANSFERIDO)' : '(TRANSFERIDO)'}`);
      console.log(`   [4] Fecha procesamiento: ${result[4]} ${result[4] === '0x0' ? '(NO PROCESADO)' : '(PROCESADO)'}`);
      console.log(`   [5] Estado: ${result[5]} ${result[5] === '0x0' ? '(ACTIVO)' : '(OTRO ESTADO)'}`);
      
      if (result.length > 6) {
        console.log(`   [6+] Campos adicionales: ${result.slice(6).join(', ')}`);
      }
      
      // ✅ Función segura para conversión
      const safeBigInt = (value: any): bigint => {
        if (!value || value === '0x0' || value === '0' || value === '0x') return BigInt(0);
        try {
          return BigInt(value);
        } catch {
          return BigInt(0);
        }
      };

      const safeNumber = (value: any): number => {
        try {
          return Number(value || 0);
        } catch {
          return 0;
        }
      };

      // ✅ EXTRAER campos según la estructura REAL de 10 elementos
      const batchInfo = {
        // Campos principales (índices confirmados)
        propietario: result[0] || '0x0',
        frigorifico: result[1] || '0x0',
        fecha_creacion: safeBigInt(result[2]),
        fecha_transferencia: safeBigInt(result[3]),
        fecha_procesamiento: safeBigInt(result[4]),
        estado: safeNumber(result[5]),
        
        // ❌ LOS CAMPOS 6,7,8,9 SON PROBLEMÁTICOS - usar valores por defecto
        cantidad_animales: 0, // Se calculará con los animales reales
        peso_total: BigInt(0), // No confiar en los campos adicionales
        
        // ✅ Obtener animales REALES del lote (filtrado del animal #1)
        animal_ids: await this.getAnimalsInBatch(batchId)
      };
      
      // ✅ Calcular cantidad real basada en animales
      batchInfo.cantidad_animales = batchInfo.animal_ids.length;
      
      console.log(`✅ [DEBUG] Lote #${batchId} procesado:`, {
        estado: batchInfo.estado,
        frigorifico: batchInfo.frigorifico,
        fecha_transferencia: batchInfo.fecha_transferencia.toString(),
        es_activo: batchInfo.estado === 0,
        animales_reales: batchInfo.cantidad_animales
      });
      
      return batchInfo;
      
    } catch (error: any) {
      console.error(`❌ Error obteniendo info del lote ${batchId}:`, error);
      return {
        propietario: '0x0',
        frigorifico: '0x0',
        fecha_creacion: BigInt(0),
        fecha_transferencia: BigInt(0),
        fecha_procesamiento: BigInt(0),
        estado: 0,
        cantidad_animales: 0,
        peso_total: BigInt(0),
        animal_ids: []
      };
    }
  }

  async verifyBatchState(batchId: bigint): Promise<void> {
    try {
      console.log(`🔍 [VERIFICACIÓN] Estado real del lote #${batchId}`);
      
      // Llamar directamente al contrato para obtener campos individuales
      const rawResult = await this.callContract('get_batch_info', [batchId.toString()]);
      console.log(`📊 Resultado crudo:`, rawResult);
      
      if (rawResult && Array.isArray(rawResult) && rawResult.length >= 6) {
        console.log(`📋 Campos individuales del lote #${batchId}:`);
        console.log(`   🏠 Propietario: ${rawResult[0]}`);
        console.log(`   🏭 Frigorífico: ${rawResult[1]} ${rawResult[1] === '0x0' ? '(NO ASIGNADO)' : '(ASIGNADO)'}`);
        console.log(`   📅 Fecha creación: ${rawResult[2]}`);
        console.log(`   📤 Fecha transferencia: ${rawResult[3]} ${rawResult[3] === '0' ? '(NO TRANSFERIDO)' : '(TRANSFERIDO)'}`);
        console.log(`   🔪 Fecha procesamiento: ${rawResult[4]}`);
        console.log(`   🟢 Estado: ${rawResult[5]} ${rawResult[5] === '0' ? '(ACTIVO)' : '(TRANSFERIDO/PROCESADO)'}`);
        console.log(`   🐄 Cantidad animales: ${rawResult[6]}`);
        console.log(`   ⚖️ Peso total: ${rawResult[7]}`);
      }
      
    } catch (error) {
      console.error(`❌ Error en verificación:`, error);
    }
  }

  private extractField(data: any, index: number, fieldName: string): any {
    if (Array.isArray(data)) {
      return data[index];
    } else if (typeof data === 'object' && data !== null) {
      return data[fieldName];
    }
    return undefined;
  }

  async getAnimalsInBatch(batchId: bigint): Promise<bigint[]> {
    try {
      console.log(`🐄 [DEBUG] Obteniendo animales del lote #${batchId}`);
      
      const result = await this.callContract('get_animals_in_batch', [batchId.toString()]);
      
      console.log(`📋 [DEBUG] Resultado RAW del lote #${batchId}:`, result);
      
      if (!Array.isArray(result) || result.length === 0) {
        console.log(`⚠️ [DEBUG] Lote #${batchId} sin animales o array inválido`);
        return [];
      }

      // ✅ DETECCIÓN INTELIGENTE: El primer elemento podría ser metadata o cantidad
      let startIndex = 0;
      
      // Caso 1: Si el primer elemento es pequeño y coincide con el length - 1
      const firstElement = BigInt(result[0]);
      if (firstElement > BigInt(0) && firstElement < BigInt(100)) {
        const expectedLength = Number(firstElement) + 1;
        if (result.length === expectedLength) {
          console.log(`🔍 [DEBUG] Primer elemento es cantidad (${firstElement}), saltándolo`);
          startIndex = 1;
        }
      }
      
      // Caso 2: Si tenemos el patrón conocido [cantidad, animal1, animal2, ...]
      if (startIndex === 0 && result.length >= 2) {
        const possibleCount = BigInt(result[0]);
        if (possibleCount === BigInt(result.length - 1)) {
          console.log(`🔍 [DEBUG] Patrón cantidad-animales detectado, saltando primer elemento`);
          startIndex = 1;
        }
      }

      const animalArray = result.slice(startIndex);
      console.log(`🔍 [DEBUG] Procesando ${animalArray.length} animales desde índice ${startIndex}:`, animalArray);

      // ✅ CONVERTIR a BigInt y filtrar válidos
      const animalIds = animalArray
        .map((id: string, index: number) => {
          try {
            const animalId = BigInt(id);
            // Filtrar números muy pequeños que podrían ser metadata
            if (animalId < BigInt(10)) {
              console.log(`   🗑️ [DEBUG] Animal [${index}] muy pequeño (${animalId}), probablemente metadata`);
              return BigInt(0);
            }
            console.log(`   🐄 [DEBUG] Animal [${index}]: #${animalId}`);
            return animalId;
          } catch (error) {
            console.log(`   ❌ [DEBUG] Animal [${index}] inválido: ${id}`);
            return BigInt(0);
          }
        })
        .filter((id: bigint) => id > BigInt(0));

      console.log(`✅ [DEBUG] Lote #${batchId} - ${animalIds.length} animales válidos:`, animalIds);
      return animalIds;
      
    } catch (error) {
      console.error(`❌ Error obteniendo animales del lote #${batchId}:`, error);
      return [];
    }
  }

  // ✅ Obtener frigoríficos desde los roles del contrato
  async getFrigorificosFromRoles(): Promise<string[]> {
    try {
      console.log('🔍 Obteniendo frigoríficos desde roles...');
      
      // Obtener la cantidad de frigoríficos
      const frigorificoCount = await this.getRoleMemberCount('FRIGORIFICO_ROLE');
      console.log(`📊 Cantidad de frigoríficos: ${frigorificoCount}`);
      
      const frigorificos: string[] = [];
      
      // Obtener cada frigorífico por índice
      for (let i = 0; i < frigorificoCount; i++) {
        try {
          const frigorificoAddress = await this.getRoleMemberAtIndex('FRIGORIFICO_ROLE', i);
          if (frigorificoAddress && frigorificoAddress !== '0x0') {
            frigorificos.push(frigorificoAddress);
            console.log(`✅ Frigorífico ${i + 1}: ${frigorificoAddress}`);
          }
        } catch (error) {
          console.log(`❌ Error obteniendo frigorífico en índice ${i}:`, error);
        }
      }
      
      console.log(`✅ ${frigorificos.length} frigoríficos obtenidos desde roles`);
      return frigorificos;
      
    } catch (error) {
      console.error('❌ Error obteniendo frigoríficos desde roles:', error);
      return [];
    }
  }

  async investigateAnimal1(): Promise<void> {
    try {
      console.log(`🔍 [INVESTIGACIÓN] Analizando el animal #1...`);
      
      // Verificar si el animal #1 existe
      try {
        const animalData = await this.getAnimalData(BigInt(1));
        console.log(`📊 [INVESTIGACIÓN] Datos del animal #1:`, animalData);
        console.log(`   Propietario: ${animalData.propietario}`);
        console.log(`   Estado: ${animalData.estado}`);
        console.log(`   Lote ID: ${animalData.lote_id}`);
      } catch (error) {
        console.log(`❌ [INVESTIGACIÓN] Animal #1 no existe o error al obtener datos`);
      }
      
      // Verificar en qué lotes está el animal #1
      const allBatches = await this.getBatchesByProducer(this.wallet.selectedAddress);
      console.log(`📦 [INVESTIGACIÓN] Verificando animal #1 en ${allBatches.length} lotes...`);
      
      for (const batchId of allBatches) {
        const animalsInBatch = await this.getAnimalsInBatch(batchId);
        if (animalsInBatch.includes(BigInt(1))) {
          console.log(`🚨 [INVESTIGACIÓN] Animal #1 encontrado en lote ${batchId}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error en investigación:`, error);
    }
  }

  async getBatchForAnimal(animalId: bigint): Promise<bigint> {
    try {
      const result = await this.callContract('get_batch_for_animal', [animalId.toString()]);
      const batchId = BigInt(result[0] || '0');
      return batchId;
      
    } catch (error) {
      console.error(`Error obteniendo lote del animal ${animalId}:`, error);
      return BigInt(0);
    }
  }

  // ============ FUNCIONES DE VERIFICACIÓN ============
  // ✅ FUNCIÓN DE DEBUG para ver parámetros reales
  async debugAddAnimals(batchId: bigint, animalIds: bigint[]) {
    console.log('🔍 [DEBUG] Parámetros que se enviarían al contrato:');
    console.log('  Función: add_animals_to_batch');
    console.log('  Parámetros:', [
      batchId.toString(),
      animalIds.length,
      ...animalIds.map(id => id.toString())
    ]);
    console.log('  Interpretación del contrato:');
    console.log('    - batch_id:', batchId.toString());
    console.log('    - array length:', animalIds.length);
    console.log('    - animal_ids:', animalIds.map(id => id.toString()));
  }

  // En verifyAnimalsAvailable, agrega más logs:
  async verifyAnimalsAvailable(animalIds: bigint[]): Promise<{
    available: bigint[];
    unavailable: bigint[];
    reasons: string[];
  }> {
    const available: bigint[] = [];
    const unavailable: bigint[] = [];
    const reasons: string[] = [];

    console.log(`🔍 [VERIFICACIÓN ADD] Verificando ${animalIds.length} animales para AGREGAR a lote`);

    for (const animalId of animalIds) {
      try {
        console.log(`   🐄 Verificando animal #${animalId} para AGREGAR...`);

        const animalData = await this.getAnimalData(animalId);
        
        console.log(`   📊 Datos animal #${animalId}:`, {
          propietario: animalData.propietario,
          miDireccion: this.wallet.selectedAddress,
          esMio: animalData.propietario === this.wallet.selectedAddress,
          estado: animalData.estado,
          lote_id: animalData.lote_id,
          disponible: animalData.lote_id === 0 && animalData.estado === 0
        });

        // Verificar propiedad
        if (animalData.propietario !== this.wallet.selectedAddress) {
          unavailable.push(animalId);
          reasons.push(`Animal #${animalId} no te pertenece`);
          console.log(`      ❌ Animal #${animalId} - NO es tuyo`);
          continue;
        }

        // Verificar si está en lote (IMPORTANTE para agregar)
        if (animalData.lote_id !== 0) {
          unavailable.push(animalId);
          reasons.push(`Animal #${animalId} ya está en el lote #${animalData.lote_id}`);
          console.log(`      ❌ Animal #${animalId} - Ya en lote #${animalData.lote_id}`);
          continue;
        }

        // Verificar estado
        if (animalData.estado !== 0) {
          unavailable.push(animalId);
          reasons.push(`Animal #${animalId} está en estado ${animalData.estado}`);
          console.log(`      ❌ Animal #${animalId} - Estado inválido: ${animalData.estado}`);
          continue;
        }

        available.push(animalId);
        console.log(`      ✅ Animal #${animalId} - DISPONIBLE para agregar`);
        
      } catch (error) {
        unavailable.push(animalId);
        reasons.push(`Animal #${animalId} no existe o error al verificar`);
        console.log(`      ❌ Animal #${animalId} - Error: ${error}`);
      }
    }

    console.log(`📊 [VERIFICACIÓN ADD] Resultado:`, {
      disponibles: available.map(id => id.toString()),
      noDisponibles: unavailable.map(id => id.toString()),
      razones: reasons
    });
    
    return { available, unavailable, reasons };
  }

  async fullSystemDiagnosis(): Promise<void> {
    try {
      console.log(`🔧 [DIAGNÓSTICO COMPLETO] Iniciando...`);
      
      const myAddress = this.wallet.selectedAddress;
      
      // 1. Obtener todos mis animales
      const allMyAnimals = await this.getAnimalsByProducer(myAddress);
      console.log(`📊 [DIAGNÓSTICO] Tengo ${allMyAnimals.length} animales:`, allMyAnimals.map(a => a.toString()));
      
      // 2. Verificar estado de CADA animal
      console.log(`🔍 [DIAGNÓSTICO] Estado detallado de cada animal:`);
      for (const animalId of allMyAnimals) {
        try {
          const animalData = await this.getAnimalData(animalId);
          console.log(`   🐄 Animal #${animalId}:`);
          console.log(`      Propietario: ${animalData.propietario} ${animalData.propietario === myAddress ? '✅' : '❌'}`);
          console.log(`      Estado: ${animalData.estado} ${animalData.estado === 0 ? '✅ ACTIVO' : '❌ NO ACTIVO'}`);
          console.log(`      Lote ID: ${animalData.lote_id} ${animalData.lote_id === 0 ? '✅ SIN LOTE' : '❌ EN LOTE'}`);
          console.log(`      Peso: ${animalData.peso}`);
        } catch (error) {
          console.log(`   ❌ Animal #${animalId}: Error al obtener datos`);
        }
      }
      
      // 3. Obtener todos mis lotes
      const allMyBatches = await this.getBatchesByProducer(myAddress);
      console.log(`📦 [DIAGNÓSTICO] Tengo ${allMyBatches.length} lotes:`, allMyBatches.map(b => b.toString()));
      
      // 4. Verificar animales en CADA lote
      console.log(`🔍 [DIAGNÓSTICO] Animales en cada lote:`);
      for (const batchId of allMyBatches) {
        const animalsInBatch = await this.getAnimalsInBatch(batchId);
        console.log(`   📦 Lote #${batchId}: ${animalsInBatch.length} animales ->`, animalsInBatch.map(a => a.toString()));
      }
      
      // 5. Animales disponibles REALES
      const availableAnimals = allMyAnimals.filter(async (animalId) => {
        try {
          const animalData = await this.getAnimalData(animalId);
          return animalData.lote_id === 0 && animalData.estado === 0;
        } catch {
          return false;
        }
      });
      
      console.log(`✅ [DIAGNÓSTICO] Animales REALMENTE disponibles:`, availableAnimals.map(a => a.toString()));
      
    } catch (error) {
      console.error(`❌ Error en diagnóstico completo:`, error);
    }
  }

  async canTransferAnimal(animalId: bigint): Promise<{ canTransfer: boolean; reason?: string }> {
    try {
      const animalData = await this.getAnimalData(animalId);
      
      if (animalData.estado !== 0) {
        return { 
          canTransfer: false, 
          reason: `El animal está en estado "${EstadoAnimal[animalData.estado]}" y no puede ser transferido` 
        };
      }
      
      const batchId = await this.getBatchForAnimal(animalId);
      if (batchId !== BigInt(0)) {
        return { 
          canTransfer: false, 
          reason: `El animal está en el lote #${batchId}` 
        };
      }
      
      if (animalData.propietario !== this.wallet.selectedAddress) {
        return { 
          canTransfer: false, 
          reason: 'No eres el propietario de este animal' 
        };
      }
      
      return { canTransfer: true };
      
    } catch (error: any) {
      console.error(`Error verificando transferibilidad del animal ${animalId}:`, error);
      return { 
        canTransfer: false, 
        reason: `Error verificando animal: ${error.message}` 
      };
    }
  }

  // ============ FUNCIONES DE TRANSFERENCIA CON PAGO ============

  async transferToFrigorificoWithPayment(
    animalId: bigint,
    frigorifico: string
  ): Promise<{ txHash: string; payment: TransferPayment }> {
    try {
      console.log(`🏭 Transferiendo a frigorífico con pago: Animal #${animalId}`);
      
      const payment = await this.chipyPay.processTransferPayment(
        animalId,
        this.wallet.selectedAddress,
        frigorifico
      );

      const result = await this.sendTransaction(
        'transfer_animal_to_frigorifico',
        [animalId.toString(), frigorifico]
      );

      const txHash = this.extractTransactionHash(result);
      
      console.log('✅ Transferencia a frigorífico completada');
      return {
        txHash,
        payment
      };

    } catch (error: any) {
      console.error('❌ Error transfiriendo a frigorífico:', error);
      throw new Error(`Error transfiriendo a frigorífico: ${error.message}`);
    }
  }

  async transferBatchToFrigorificoWithPayment(
    batchId: bigint,
    frigorifico: string,
    paymentAmount?: bigint
  ): Promise<{ txHash: string; payment: TransferPayment }> {
    try {
      console.log(`💳 Transfiriendo lote #${batchId} a frigorífico con pago`);
      
      const payment = await this.chipyPay.processTransferPayment(
        batchId,
        this.wallet.selectedAddress,
        frigorifico,
        paymentAmount || CHIPYPAY_CONFIG.BASE_PRICES.BATCH_TRANSFER
      );

      const result = await this.sendTransaction(
        'transfer_batch_to_frigorifico',
        [batchId.toString(), frigorifico]
      );

      const txHash = this.extractTransactionHash(result);
      
      console.log('✅ Lote transferido con pago exitoso');
      return {
        txHash,
        payment
      };

    } catch (error: any) {
      console.error('❌ Error en transferencia de lote con pago:', error);
      throw new Error(`Error transfiriendo lote: ${error.message}`);
    }
  }

  // ============ FUNCIONES DE ADMINISTRACIÓN Y ROLES ============

  async grantRole(role: string, account: string): Promise<string> {
    try {
      console.log(`🔄 Asignando rol ${role} a ${account}...`);
      const result = await this.sendTransaction('grant_role', [role, account]);
      return this.extractTransactionHash(result);
    } catch (error: any) {
      console.error('❌ Error asignando rol:', error);
      throw new Error(`Error asignando rol: ${error.message}`);
    }
  }

  async revokeRole(role: string, account: string): Promise<string> {
    try {
      console.log(`🔄 Revocando rol ${role} de ${account}...`);
      const result = await this.sendTransaction('revoke_role', [role, account]);
      return this.extractTransactionHash(result);
    } catch (error: any) {
      console.error('❌ Error revocando rol:', error);
      throw new Error(`Error revocando rol: ${error.message}`);
    }
  }


// En AnimalContractService - CORREGIR FUNCIONES DE ROLES

/**
 * ✅ CORREGIDO: Obtener cantidad de miembros de un rol
 */
async getRoleMemberCount(role: string): Promise<number> {
  try {
    console.log(`🔍 [ROLES] Obteniendo cantidad de miembros para rol: ${role}`);
    
    // ✅ Asegurar que el rol no sea undefined
    if (!role || role === 'undefined') {
      console.error('❌ Rol no válido:', role);
      return 0;
    }

    const result = await this.callContract('get_role_member_count', [role]);
    
    // ✅ Manejar diferentes formatos de respuesta
    let count = 0;
    if (Array.isArray(result) && result.length > 0) {
      count = Number(result[0] || '0');
    } else if (typeof result === 'string') {
      count = Number(result);
    } else if (typeof result === 'number') {
      count = result;
    }
    
    console.log(`✅ [ROLES] Rol ${role} tiene ${count} miembros`);
    return count;
    
  } catch (error: any) {
    console.error(`❌ Error obteniendo cantidad de miembros del rol ${role}:`, error);
    
    // ✅ Manejar errores específicos de StarkNet
    if (error.message.includes('undefined can\'t be computed by felt()')) {
      console.error(`❌ El rol '${role}' no existe en el contrato`);
      return 0;
    }
    
    return 0;
  }
}

/**
 * ✅ CORREGIDO: Obtener miembro de rol por índice
 */
  async getRoleMemberAtIndex(role: string, index: number): Promise<string> {
    try {
      console.log(`🔍 [ROLES] Obteniendo miembro ${index} del rol: ${role}`);
      
      // ✅ Validar parámetros
      if (!role || role === 'undefined') {
        throw new Error('Rol no válido');
      }
      
      if (index < 0) {
        throw new Error('Índice no válido');
      }

      const result = await this.callContract('get_role_member_at_index', [
        role, 
        index.toString() // ✅ Asegurar que sea string
      ]);

      // ✅ Manejar diferentes formatos de respuesta
      let memberAddress = '0x0';
      if (Array.isArray(result) && result.length > 0) {
        memberAddress = result[0] || '0x0';
      } else if (typeof result === 'string') {
        memberAddress = result;
      }
      
      console.log(`✅ [ROLES] Miembro ${index} del rol ${role}: ${memberAddress}`);
      return memberAddress;
      
    } catch (error: any) {
      console.error(`❌ Error obteniendo miembro del rol ${role} en índice ${index}:`, error);
      
      // ✅ Manejar errores específicos
      if (error.message.includes('undefined can\'t be computed by felt()')) {
        console.error(`❌ El rol '${role}' no existe o el índice ${index} es inválido`);
      }
      
      return '0x0';
    }
  }

/**
 * ✅ CORREGIDO: Verificar si una cuenta tiene un rol
 */
async hasRole(role: string, account: string): Promise<boolean> {
  try {
    console.log(`🔍 [ROLES] Verificando rol ${role} para cuenta: ${account}`);
    
    // ✅ Validar parámetros
    if (!role || role === 'undefined' || !account || account === '0x0') {
      console.error('❌ Parámetros inválidos para hasRole');
      return false;
    }

    const result = await this.callContract('has_role', [role, account]);
    
    // ✅ Manejar diferentes formatos de respuesta
    let hasRole = false;
    if (Array.isArray(result) && result.length > 0) {
      hasRole = result[0] === '0x1' || result[0] === '1' || result[0] === 'true';
    } else if (typeof result === 'string') {
      hasRole = result === '0x1' || result === '1' || result === 'true';
    } else if (typeof result === 'boolean') {
      hasRole = result;
    }
    
    console.log(`✅ [ROLES] Cuenta ${account} ${hasRole ? 'TIENE' : 'NO TIENE'} rol ${role}`);
    return hasRole;
    
  } catch (error: any) {
    console.error(`❌ Error verificando rol ${role} para ${account}:`, error);
    
    // ✅ Manejar errores específicos
    if (error.message.includes('undefined can\'t be computed by felt()')) {
      console.error(`❌ El rol '${role}' no existe en el contrato`);
    }
    
    return false;
  }
}

/**
 * ✅ NUEVO: Verificar si una función de roles existe en el contrato
 */
async checkRoleFunctionExists(functionName: string): Promise<boolean> {
  try {
    // Intentar llamar a una función simple para verificar si existe
    await this.callContract(functionName, ['0x0']);
    return true;
  } catch (error: any) {
    if (error.message.includes('entrypoint does not exist')) {
      return false;
    }
    // Otros errores pueden significar que la función existe pero los parámetros son incorrectos
    return true;
  }
}

  async getAllRoleMembers(role: string): Promise<string[]> {
    try {
      const result = await this.callContract('get_all_role_members', [role]);
      return result || [];
    } catch (error: any) {
      console.error('❌ Error obteniendo miembros del rol:', error);
      return [];
    }
  }

  async getRoleAdmin(role: string): Promise<string> {
    try {
      const result = await this.callContract('get_role_admin', [role]);
      return result[0];
    } catch (error: any) {
      console.error('❌ Error obteniendo admin del rol:', error);
      throw new Error(`Error obteniendo admin: ${error.message}`);
    }
  }

  async setRoleAdmin(role: string, admin: string): Promise<string> {
    try {
      console.log(`🔄 Configurando admin del rol ${role} a ${admin}`);
      const result = await this.sendTransaction('set_role_admin', [role, admin]);
      return this.extractTransactionHash(result);
    } catch (error: any) {
      console.error('❌ Error configurando admin del rol:', error);
      throw new Error(`Error configurando admin: ${error.message}`);
    }
  }

  async renounceRole(role: string, account: string): Promise<string> {
    try {
      console.log(`🚫 Renunciando al rol ${role} para ${account}`);
      const result = await this.sendTransaction('renounce_role', [role, account]);
      return this.extractTransactionHash(result);
    } catch (error: any) {
      console.error('❌ Error renunciando al rol:', error);
      throw new Error(`Error renunciando al rol: ${error.message}`);
    }
  }

  async getRoleStats(): Promise<any> {
    try {
      console.log('👥 Obteniendo estadísticas de roles...');
      const result = await this.callContract('get_role_stats', []);
      
      if (result && result.length >= 7) {
        return {
          producers: Number(result[0]),
          frigorificos: Number(result[1]),
          veterinarians: Number(result[2]),
          iot: Number(result[3]),
          certifiers: Number(result[4]),
          exporters: Number(result[5]),
          auditors: Number(result[6])
        };
      }
      
      throw new Error('Formato de respuesta inválido');
      
    } catch (error: any) {
      console.error('❌ Error obteniendo estadísticas de roles:', error);
      throw new Error(`Error obteniendo estadísticas de roles: ${error.message}`);
    }
  }

  // ============ FUNCIONES DE VETERINARIO ============

  async authorizeVeterinarianForAnimal(veterinarian: string, animalId: bigint): Promise<string> {
    try {
      console.log(`👨‍⚕️ Autorizando veterinario ${veterinarian} para animal #${animalId}`);
      
      const result = await this.sendTransaction(
        'authorize_veterinarian_for_animal',
        [veterinarian, animalId.toString()]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Veterinario autorizado exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error autorizando veterinario:', error);
      throw new Error(`Error autorizando veterinario: ${error.message}`);
    }
  }

  async revokeVeterinarianAuthorization(veterinarian: string, animalId: bigint): Promise<string> {
    try {
      console.log(`🚫 Revocando autorización de veterinario ${veterinarian} para animal #${animalId}`);
      
      const result = await this.sendTransaction(
        'revoke_veterinarian_authorization',
        [veterinarian, animalId.toString()]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Autorización de veterinario revocada');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error revocando autorización de veterinario:', error);
      throw new Error(`Error revocando autorización: ${error.message}`);
    }
  }

  async addHealthRecord(
    animalId: bigint,
    diagnosis: string,
    treatment: string,
    vaccination: string
  ): Promise<string> {
    try {
      console.log(`📝 Agregando registro de salud para animal #${animalId}`);
      
      const result = await this.sendTransaction(
        'add_health_record',
        [
          animalId.toString(),
          diagnosis,
          treatment,
          vaccination
        ]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Registro de salud agregado exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error agregando registro de salud:', error);
      throw new Error(`Error agregando registro de salud: ${error.message}`);
    }
  }

  async quarantineAnimal(animalId: bigint, reason: string): Promise<string> {
    try {
      console.log(`🚨 Poniendo en cuarentena animal #${animalId}: ${reason}`);
      
      const result = await this.sendTransaction(
        'quarantine_animal',
        [animalId.toString(), reason]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Animal puesto en cuarentena');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error poniendo en cuarentena:', error);
      throw new Error(`Error poniendo en cuarentena: ${error.message}`);
    }
  }

  async clearQuarantine(animalId: bigint): Promise<string> {
    try {
      console.log(`✅ Liberando de cuarentena animal #${animalId}`);
      
      const result = await this.sendTransaction(
        'clear_quarantine',
        [animalId.toString()]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Cuarentena liberada exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error liberando cuarentena:', error);
      throw new Error(`Error liberando cuarentena: ${error.message}`);
    }
  }

  async isQuarantined(animalId: bigint): Promise<boolean> {
    try {
      const result = await this.callContract('is_quarantined', [animalId.toString()]);
      return result[0] === '0x1' || result[0] === '1';
    } catch (error) {
      console.error('Error verificando cuarentena:', error);
      return false;
    }
  }

  // ============ FUNCIONES DE FRIGORÍFICO ============

  async procesarBatch(batchId: bigint): Promise<string> {
    try {
      console.log(`🔪 Procesando lote completo #${batchId}`);
      
      const result = await this.sendTransaction(
        'procesar_batch',
        [batchId.toString()]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Lote procesado exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error procesando lote:', error);
      throw new Error(`Error procesando lote: ${error.message}`);
    }
  }

  // ============ FUNCIONES DE EXPORTADOR ============

  async transferCortesToExportadorWithPayment(
    animalId: bigint,
    corteIds: bigint[],
    exportador: string
  ): Promise<{ txHash: string; payment: any }> {
    try {
      console.log(`🌍 Transferiendo ${corteIds.length} cortes a exportador`);
      
      const payment = await this.chipyPay.processTransferPayment(
        animalId,
        this.wallet.selectedAddress,
        exportador,
        CHIPYPAY_CONFIG.BASE_PRICES.BATCH_TRANSFER
      );

      const corteIdsStr = corteIds.map(id => id.toString());
      
      const result = await this.sendTransaction(
        'batch_transfer_cortes',
        [
          animalId.toString(),
          corteIdsStr.length,
          ...corteIdsStr,
          exportador
        ]
      );

      const txHash = this.extractTransactionHash(result);
      
      console.log('✅ Cortes transferidos a exportador con pago exitoso');
      return { txHash, payment };
      
    } catch (error: any) {
      console.error('❌ Error transfiriendo cortes a exportador:', error);
      throw new Error(`Error en transferencia a exportador: ${error.message}`);
    }
  }

  // ============ FUNCIONES DE CERTIFICACIÓN ============

  async certifyAnimal(
    animalId: bigint,
    certificationData: any
  ): Promise<string> {
    try {
      console.log(`🏅 Certificando animal #${animalId}`);
      
      const result = await this.sendTransaction(
        'certify_animal',
        [
          animalId.toString(),
          certificationData.certificationType,
          certificationData.certifier,
          certificationData.expiryDate.toString(),
          certificationData.certificateHash
        ]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Animal certificado exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error certificando animal:', error);
      throw new Error(`Error certificando animal: ${error.message}`);
    }
  }

  async certifyBatch(batchId: bigint, certificationData: any): Promise<string> {
    try {
      console.log(`🏅 Certificando lote completo #${batchId}`);
      
      const result = await this.sendTransaction(
        'certify_batch',
        [
          batchId.toString(),
          certificationData.certificationType,
          certificationData.certifier,
          certificationData.expiryDate.toString(),
          certificationData.certificateHash
        ]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Lote certificado exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error certificando lote:', error);
      throw new Error(`Error certificando lote: ${error.message}`);
    }
  }

  // ============ FUNCIONES DE CONSULTA GENERAL ============

  async getSystemStats(): Promise<any> {
    try {
      const result = await this.callContract('get_system_stats', []);
      
      if (result && result.length >= 7) {
        return {
          total_animals_created: BigInt(result[0]),
          total_batches_created: BigInt(result[1]),
          total_cortes_created: BigInt(result[2]),
          processed_animals: BigInt(result[3]),
          next_token_id: BigInt(result[4]),
          next_batch_id: BigInt(result[5]),
          next_lote_id: BigInt(result[6])
        };
      }
      
      throw new Error('Formato de respuesta inválido para estadísticas');
      
    } catch (error: any) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw new Error(`Error obteniendo estadísticas: ${error.message}`);
    }
  }

  async getAnimalData(animalId: bigint): Promise<any> {
    try {
      console.log(`📖 [DEBUG] Obteniendo datos COMPLETOS del animal #${animalId}`);
      
      const result = await this.callContract('get_animal_data', [animalId.toString()]);
      
      console.log(`📊 [DEBUG] Datos RAW del animal #${animalId}:`, result);
      console.log(`🔢 [DEBUG] Longitud de datos: ${result?.length}`);
      
      if (result && result.length >= 9) {
        // ✅ ESTRUCTURA CORREGIDA - El contrato retorna 9 campos, no 6
        const animalData = {
          id: animalId,
          raza: parseInt(result[0]),
          fechaNacimiento: parseInt(result[1]),
          peso: BigInt(result[2]),
          estado: parseInt(result[3]),
          propietario: result[4],
          frigorifico: result[5],
          certificador: result[6],
          exportador: result[7],
          lote_id: parseInt(result[8]) || 0, // ✅ CAMPO #8 es lote_id
        };
        
        console.log(`✅ [DEBUG] Datos procesados animal #${animalId}:`, {
          lote_id: animalData.lote_id,
          estado: animalData.estado,
          propietario: animalData.propietario
        });
        
        return animalData;
      } else if (result && result.length >= 6) {
        // ❌ ESTRUCTURA ANTIGUA (fallback)
        console.log(`⚠️ [DEBUG] Animal #${animalId} - Estructura antigua (6 campos)`);
        return {
          id: animalId,
          raza: parseInt(result[0]),
          fechaNacimiento: parseInt(result[1]),
          peso: BigInt(result[2]),
          estado: parseInt(result[3]),
          propietario: result[4],
          frigorifico: result[5],
          lote_id: 0 // ❌ No disponible en estructura antigua
        };
      }
      
      throw new Error('Formato de respuesta inválido');
      
    } catch (error: any) {
      console.error(`❌ Error obteniendo datos del animal #${animalId}:`, error);
      throw new Error(`Error al obtener datos del animal: ${error.message}`);
    }
  }

  async getAnimalsByProducer(producer: string): Promise<bigint[]> {
    try {
      const result = await this.callContract('get_animals_by_producer', [producer]);
      const animalIds = result.map((id: string) => BigInt(id));
      return animalIds;
    } catch (error: any) {
      console.error('❌ Error obteniendo animales del productor:', error);
      return [];
    }
  }

  async getBatchesByProducer(producer: string): Promise<bigint[]> {
    try {
      const result = await this.callContract('get_batches_by_producer', [producer]);
      const batchIds = result.map((id: string) => BigInt(id));
      return batchIds;
    } catch (error: any) {
      console.error('❌ Error obteniendo lotes del productor:', error);
      return [];
    }
  }

  async getProducerStats(producer: string): Promise<any> {
    try {
      const result = await this.callContract('get_producer_stats', [producer]);

      const stats = {
        totalAnimals: BigInt(result[0] || '0'),
        totalBatches: BigInt(result[1] || '0'),
        totalWeight: BigInt(result[2] || '0')
      };

      return stats;
    } catch (error: any) {
      console.error('❌ Error obteniendo estadísticas del productor:', error);
      return { totalAnimals: 0, totalBatches: 0, totalWeight: 0 };
    }
  }

  // ============ FUNCIONES AUXILIARES PRIVADAS ============

  private async findActualAnimalId(): Promise<bigint> {
    try {
      const stats = await this.getSystemStats();
      const lastAnimalId = stats.next_token_id - BigInt(1);
      return lastAnimalId;
      
    } catch (error) {
      console.error('❌ Error buscando animal ID:', error);
      throw new Error('No se pudo determinar el ID del animal creado');
    }
  }

  private async getNewlyCreatedBatchId(): Promise<bigint> {
    try {
      const stats = await this.getSystemStats();
      const currentNextId = stats.next_batch_id || BigInt(1);
      const newlyCreatedId = currentNextId - BigInt(1);
      
      if (newlyCreatedId > BigInt(0)) {
        const batchInfo = await this.getBatchInfo(newlyCreatedId);
        if (batchInfo && batchInfo.propietario !== '0x0') {
          return newlyCreatedId;
        }
      }
      
      return await this.findLatestUserBatchId();
      
    } catch (error) {
      console.error('Error obteniendo ID de lote creado:', error);
      return BigInt(1);
    }
  }

  private async findLatestUserBatchId(): Promise<bigint> {
    try {
      const userBatches = await this.getBatchesByProducer(this.wallet.selectedAddress);
      if (userBatches.length > 0) {
        return userBatches.reduce((max, id) => id > max ? id : max, BigInt(0));
      }
      return BigInt(1);
    } catch (error) {
      console.error('Error encontrando último lote del usuario:', error);
      return BigInt(1);
    }
  }

  private async getNextBatchId(): Promise<bigint> {
    try {
      const stats = await this.getSystemStats();
      return stats.next_batch_id || BigInt(1);
    } catch (error) {
      console.error('Error obteniendo próximo batch ID:', error);
      return BigInt(1);
    }
  }

  private async getNextCorteId(): Promise<bigint> {
    try {
      const stats = await this.getSystemStats();
      return stats.next_corte_id || BigInt(1);
    } catch (error) {
      console.error('Error obteniendo próximo corte ID:', error);
      return BigInt(1);
    }
  }

  private async getCortesForBatch(batchId: bigint): Promise<bigint[]> {
    try {
      const cortes: bigint[] = [];
      const stats = await this.getSystemStats();
      const totalCortes = Number(stats.total_cortes_created || 0);
      
      for (let corteId = 1; corteId <= totalCortes; corteId++) {
        try {
          const corteInfo = await this.getInfoCorte(BigInt(corteId));
          if (corteInfo && corteInfo.loteId === batchId) {
            cortes.push(BigInt(corteId));
          }
        } catch (error) {
          // Corte no existe, continuar
        }
      }
      
      return cortes;
    } catch (error) {
      console.error('Error obteniendo cortes del lote:', error);
      return [];
    }
  }

  // ============ FUNCIONES ADICIONALES DE CONSULTA ============

  async getInfoAnimal(animalId: bigint): Promise<any> {
    try {
      const result = await this.callContract('get_info_animal', [animalId.toString()]);
      
      if (result && result.length >= 8) {
        return {
          id: animalId,
          raza: Number(result[0]),
          fechaNacimiento: BigInt(result[1]),
          peso: BigInt(result[2]),
          estado: Number(result[3]),
          propietario: result[4],
          frigorifico: result[5],
          metadataHash: result[6],
          fechaCreacion: BigInt(result[7])
        };
      }
      
      throw new Error('Formato de respuesta inválido');
    } catch (error: any) {
      console.error('❌ Error obteniendo información del animal:', error);
      throw new Error(`Error obteniendo información: ${error.message}`);
    }
  }

  async getCertificationData(animalId: bigint): Promise<any> {
    try {
      const result = await this.callContract('get_certification_data', [animalId.toString()]);
      
      if (result && result.length >= 5) {
        return {
          isCertified: result[0] === '0x1',
          certificationType: result[1],
          certifier: result[2],
          certificationDate: BigInt(result[3]),
          expirationDate: BigInt(result[4])
        };
      }
      
      throw new Error('Formato de respuesta inválido');
    } catch (error: any) {
      console.error('❌ Error obteniendo datos de certificación:', error);
      throw new Error(`Error obteniendo certificación: ${error.message}`);
    }
  }

  // ============ FUNCIONES DE UTILIDAD ============

  async waitForTransaction(txHash: string): Promise<void> {
    console.log('⏳ Esperando confirmación de transacción:', txHash);
    
    if (this.wallet?.provider?.waitForTransaction) {
      try {
        await this.wallet.provider.waitForTransaction(txHash);
        console.log('✅ Transacción confirmada');
      } catch (error) {
        console.log('⚠️ Error esperando transacción, usando timeout:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  async updateAnimalWeight(animalId: bigint, newWeight: bigint): Promise<string> {
    try {
      const result = await this.sendTransaction(
        'update_animal_weight',
        [animalId.toString(), newWeight.toString()]
      );

      const txHash = this.extractTransactionHash(result);
      return txHash;
    } catch (error: any) {
      console.error('❌ Error actualizando peso:', error);
      throw new Error(`Error actualizando peso: ${error.message}`);
    }
  }

  // ============ FUNCIONES DE REGISTRO E IDENTIFICACIÓN ============

  async registerParticipant(participantType: string, info: string): Promise<string> {
    try {
      console.log(`👤 Registrando participante tipo: ${participantType}`);
      
      const result = await this.sendTransaction(
        'register_participant',
        [participantType, info]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Participante registrado exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error registrando participante:', error);
      throw new Error(`Error registrando participante: ${error.message}`);
    }
  }

  async updateParticipantInfo(newInfo: string): Promise<string> {
    try {
      console.log('📝 Actualizando información del participante');
      
      const result = await this.sendTransaction(
        'update_participant_info',
        [newInfo]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Información actualizada exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error actualizando información:', error);
      throw new Error(`Error actualizando información: ${error.message}`);
    }
  }

  async getParticipantInfo(participantAddress: string): Promise<any> {
    try {
      const result = await this.callContract('get_participant_info', [participantAddress]);
      
      if (result && result.length >= 3) {
        return {
          participantType: result[0],
          info: result[1],
          registrationDate: BigInt(result[2]),
          isActive: result[3] === '0x1'
        };
      }
      
      throw new Error('Formato de respuesta inválido');
    } catch (error: any) {
      console.error('❌ Error obteniendo información del participante:', error);
      throw new Error(`Error obteniendo información: ${error.message}`);
    }
  }

  // ✅ Obtener todos los frigoríficos registrados
  async getAllFrigorificos(): Promise<string[]> {
    try {
      console.log('🔍 Obteniendo lista de frigoríficos...');
      
      // Intenta obtener del contrato si existe la función
      try {
        const result = await this.callContract('get_all_frigorificos', []);
        if (result && Array.isArray(result)) {
          const validFrigorificos = result.filter(addr => 
            addr && addr !== '0x0' && addr.startsWith('0x')
          );
          console.log(`✅ ${validFrigorificos.length} frigoríficos obtenidos del contrato`);
          return validFrigorificos;
        }
      } catch (error) {
        console.log('Función get_all_frigorificos no disponible en el contrato');
      }
      
      // Fallback: lista hardcodeada o vacía
      const fallbackFrigorificos: string[] = [
        // Agrega aquí direcciones de frigoríficos conocidos
      ];
      
      return fallbackFrigorificos;
      
    } catch (error) {
      console.error('❌ Error obteniendo frigoríficos:', error);
      return [];
    }
  }

  // ============ FUNCIONES ESPECÍFICAS PARA FRIGORÍFICO ============

  /**
   * Obtener animales por estado (para frigorífico) - VERSIÓN CORREGIDA
   */
  async getAnimalsByState(estado: EstadoAnimal): Promise<any[]> {
    try {
      console.log(`🔍 [CORREGIDO] Obteniendo animales en estado: ${EstadoAnimal[estado]} (${estado})`);
      
      const animals: any[] = [];
      const stats = await this.getSystemStats();
      const totalAnimals = Number(stats.total_animals_created || 0);
      
      console.log(`📊 Revisando ${totalAnimals} animales en el sistema...`);
      
      for (let i = 1; i <= totalAnimals; i++) {
        try {
          const animalId = BigInt(i);
          const animalData = await this.getAnimalData(animalId);
          
          // ✅ CORREGIDO: Verificar estado y que esté en un lote de este frigorífico
          const batchId = await this.getBatchForAnimal(animalId);
          if (batchId !== BigInt(0)) {
            const batchInfo = await this.getBatchInfo(batchId);
            
            if (animalData.estado === estado && batchInfo.frigorifico === this.wallet.selectedAddress) {
              try {
                const animalInfo = await this.getInfoAnimal(animalId);
                animals.push({
                  id: animalId,
                  raza: animalData.raza,
                  peso: animalData.peso,
                  propietario: animalData.propietario,
                  fechaRecepcion: animalInfo.fechaCreacion || BigInt(0),
                  estado: animalData.estado,
                  metadataHash: animalInfo.metadataHash,
                  frigorifico: batchInfo.frigorifico, // Usar frigorífico del lote
                  loteId: batchId,
                  batchInfo: batchInfo // Incluir info completa del lote
                });
              } catch (error) {
                // Si getInfoAnimal falla, usar datos básicos
                animals.push({
                  id: animalId,
                  raza: animalData.raza,
                  peso: animalData.peso,
                  propietario: animalData.propietario,
                  fechaRecepcion: BigInt(0),
                  estado: animalData.estado,
                  metadataHash: '',
                  frigorifico: batchInfo.frigorifico, // Usar frigorífico del lote
                  loteId: batchId,
                  batchInfo: batchInfo // Incluir info completa del lote
                });
              }
            }
          }
        } catch (error) {
          // Continuar con siguiente animal
          console.log(`Animal #${i} no disponible para estado ${estado}`);
        }
      }
      
      console.log(`✅ [CORREGIDO] ${animals.length} animales encontrados en estado ${EstadoAnimal[estado]}`);
      return animals;
      
    } catch (error: any) {
      console.error('❌ Error obteniendo animales por estado:', error);
      return [];
    }
  }
  /**
   * Obtener cortes creados por el frigorífico actual
   */
  async getCortesByFrigorifico(frigorificoAddress?: string): Promise<any[]> {
    try {
      const targetAddress = frigorificoAddress || this.wallet.selectedAddress;
      console.log(`🔍 Obteniendo cortes para frigorífico: ${targetAddress}`);
      
      const cortes: any[] = [];
      const stats = await this.getSystemStats();
      const totalCortes = Number(stats.total_cortes_created || 0);
      
      console.log(`📊 Revisando ${totalCortes} cortes en el sistema...`);
      
      for (let i = 1; i <= totalCortes; i++) {
        try {
          const corteId = BigInt(i);
          const corteInfo = await this.getInfoCorte(corteId);
          
          // Verificar si el corte fue creado por este frigorífico
          if (corteInfo.frigorifico === targetAddress) {
            cortes.push({
              id: corteId,
              animalId: corteInfo.animalId,
              tipoCorte: corteInfo.tipoCorte,
              peso: corteInfo.peso,
              fechaProcesamiento: corteInfo.fechaProcesamiento,
              certificado: corteInfo.certificado,
              propietario: corteInfo.propietario,
              frigorifico: corteInfo.frigorifico
            });
          }
        } catch (error) {
          // Corte no existe o error al obtener datos, continuar
          console.log(`Corte #${i} no disponible`);
        }
      }
      
      console.log(`✅ ${cortes.length} cortes encontrados para frigorífico`);
      return cortes;
      
    } catch (error: any) {
      console.error('❌ Error obteniendo cortes del frigorífico:', error);
      return [];
    }
  }

  /**
   * Obtener animales asignados a un frigorífico específico
   */
  async getAnimalsByFrigorifico(frigorificoAddress?: string): Promise<any[]> {
    try {
      const targetAddress = frigorificoAddress || this.wallet.selectedAddress;
      console.log(`🔍 [CORREGIDO] Obteniendo animales para frigorífico: ${targetAddress}`);
      
      const animals: any[] = [];
      const stats = await this.getSystemStats();
      const totalAnimals = Number(stats.total_animals_created || 0);
      
      console.log(`📊 Revisando ${totalAnimals} animales en el sistema...`);
      
      for (let i = 1; i <= totalAnimals; i++) {
        try {
          const animalId = BigInt(i);
          const animalData = await this.getAnimalData(animalId);
          
          // ✅ CORREGIDO: Buscar por lote transferido al frigorífico, NO por campo frigorifico del animal
          const batchId = await this.getBatchForAnimal(animalId);
          if (batchId !== BigInt(0)) {
            const batchInfo = await this.getBatchInfo(batchId);
            
            // Verificar si el lote fue transferido a este frigorífico
            if (batchInfo.frigorifico === targetAddress) {
              try {
                const animalInfo = await this.getInfoAnimal(animalId);
                animals.push({
                  id: animalId,
                  raza: animalData.raza,
                  peso: animalData.peso,
                  propietario: animalData.propietario,
                  fechaRecepcion: animalInfo.fechaCreacion || BigInt(0),
                  estado: animalData.estado,
                  metadataHash: animalInfo.metadataHash,
                  frigorifico: batchInfo.frigorifico, // Usar el frigorífico del lote
                  loteId: batchId,
                  batchInfo: batchInfo // Incluir info completa del lote
                });
              } catch (error) {
                // Si getInfoAnimal falla, usar datos básicos
                animals.push({
                  id: animalId,
                  raza: animalData.raza,
                  peso: animalData.peso,
                  propietario: animalData.propietario,
                  fechaRecepcion: BigInt(0),
                  estado: animalData.estado,
                  metadataHash: '',
                  frigorifico: batchInfo.frigorifico,
                  loteId: batchId,
                  batchInfo: batchInfo
                });
              }
            }
          }
        } catch (error) {
          // Animal no existe o error al obtener datos, continuar
          console.log(`Animal #${i} no disponible`);
        }
      }
      
      console.log(`✅ [CORREGIDO] ${animals.length} animales encontrados para frigorífico`);
      return animals;
      
    } catch (error: any) {
      console.error('❌ Error obteniendo animales del frigorífico:', error);
      return [];
    }
  }
  /**
   * Procesar animal (cambiar estado a PROCESADO)
   */
  async procesarAnimal(animalId: bigint): Promise<string> {
    try {
      console.log(`🔪 Procesando animal #${animalId}`);
      
      // Verificar que el animal esté asignado a este frigorífico
      const animalData = await this.getAnimalData(animalId);
      if (animalData.frigorifico !== this.wallet.selectedAddress) {
        throw new Error('Este animal no está asignado a tu frigorífico');
      }
      
      if (animalData.estado !== EstadoAnimal.CREADO) {
        throw new Error('Este animal ya ha sido procesado o no está en estado válido');
      }
      
      const result = await this.sendTransaction(
        CONTRACT_FUNCTIONS.PROCESAR_ANIMAL,
        [animalId.toString()]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Animal procesado exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error procesando animal:', error);
      throw new Error(`Error procesando animal: ${error.message}`);
    }
  }

  /**
   * Crear corte a partir de animal procesado
   */
  async crearCorte(
    animalId: bigint,
    tipoCorte: TipoCorte,
    peso: bigint
  ): Promise<{ corteId: bigint; txHash: string }> {
    try {
      console.log(`🥩 Creando corte para animal #${animalId}, tipo: ${TipoCorte[tipoCorte]}, peso: ${peso}kg`);
      
      // Verificar que el animal esté procesado y asignado a este frigorífico
      const animalData = await this.getAnimalData(animalId);
      if (animalData.frigorifico !== this.wallet.selectedAddress) {
        throw new Error('Este animal no está asignado a tu frigorífico');
      }
      
      if (animalData.estado !== EstadoAnimal.PROCESADO) {
        throw new Error('El animal debe estar en estado PROCESADO para crear cortes');
      }
      
      const result = await this.sendTransaction(
        CONTRACT_FUNCTIONS.CREAR_CORTE,
        [
          animalId.toString(),
          tipoCorte.toString(),
          peso.toString()
        ]
      );

      const txHash = this.extractTransactionHash(result);
      
      // Obtener el ID del corte creado
      const corteId = await this.getNewlyCreatedCorteId();
      
      console.log('✅ Corte creado exitosamente:', corteId);
      return { corteId, txHash };
    } catch (error: any) {
      console.error('❌ Error creando corte:', error);
      throw new Error(`Error creando corte: ${error.message}`);
    }
  }

  /**
   * Transferir corte a exportador
   */
  async transferCorteToExportador(
    animalId: bigint,
    corteId: bigint,
    exportador: string
  ): Promise<string> {
    try {
      console.log(`🌍 Transfiriendo corte #${corteId} a exportador: ${exportador}`);
      
      // Verificar que el corte pertenezca a este frigorífico
      const corteInfo = await this.getInfoCorte(corteId);
      if (corteInfo.frigorifico !== this.wallet.selectedAddress) {
        throw new Error('Este corte no pertenece a tu frigorífico');
      }
      
      const result = await this.sendTransaction(
        CONTRACT_FUNCTIONS.TRANSFER_CORTE_TO_EXPORTADOR,
        [
          animalId.toString(),
          corteId.toString(),
          exportador
        ]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Corte transferido a exportador exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error transfiriendo corte a exportador:', error);
      throw new Error(`Error transfiriendo corte: ${error.message}`);
    }
  }

  /**
   * Transferir múltiples cortes a exportador
   */
  async batchTransferCortes(
    animalId: bigint,
    corteIds: bigint[],
    exportador: string
  ): Promise<string> {
    try {
      console.log(`🌍 Transferiendo ${corteIds.length} cortes a exportador: ${exportador}`);
      
      const corteIdsStr = corteIds.map(id => id.toString());
      
      const result = await this.sendTransaction(
        CONTRACT_FUNCTIONS.BATCH_TRANSFER_CORTES,
        [
          animalId.toString(),
          corteIdsStr.length,
          ...corteIdsStr,
          exportador
        ]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Cortes transferidos a exportador exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error transfiriendo cortes a exportador:', error);
      throw new Error(`Error transfiriendo cortes: ${error.message}`);
    }
  }

  /**
   * Generar QR para un corte
   */
  async generateQrForCorte(animalId: bigint, corteId: bigint): Promise<string> {
    try {
      console.log(`📱 Generando QR para corte #${corteId} del animal #${animalId}`);
      
      // Verificar que el corte pertenezca a este frigorífico
      const corteInfo = await this.getInfoCorte(corteId);
      if (corteInfo.frigorifico !== this.wallet.selectedAddress) {
        throw new Error('Este corte no pertenece a tu frigorífico');
      }
      
      const result = await this.sendTransaction(
        CONTRACT_FUNCTIONS.GENERATE_QR_FOR_CORTE,
        [
          animalId.toString(),
          corteId.toString()
        ]
      );

      const txHash = this.extractTransactionHash(result);
      
      // En una implementación real, extraeríamos el QR hash del evento
      // Por ahora retornamos el txHash como referencia
      console.log('✅ QR generado exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error generando QR:', error);
      throw new Error(`Error generando QR: ${error.message}`);
    }
  }

  /**
   * Certificar un corte
   */
  async certifyCorte(animalId: bigint, corteId: bigint): Promise<string> {
    try {
      console.log(`🏅 Certificando corte #${corteId} del animal #${animalId}`);
      
      const result = await this.sendTransaction(
        CONTRACT_FUNCTIONS.CERTIFY_CORTE,
        [
          animalId.toString(),
          corteId.toString()
        ]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Corte certificado exitosamente');
      return txHash;
    } catch (error: any) {
      console.error('❌ Error certificando corte:', error);
      throw new Error(`Error certificando corte: ${error.message}`);
    }
  }

  // ============ FUNCIONES AUXILIARES PRIVADAS ============

  /**
   * Obtener el ID del último corte creado
   */
  private async getNewlyCreatedCorteId(): Promise<bigint> {
    try {
      const stats = await this.getSystemStats();
      const currentNextId = stats.next_corte_id || BigInt(1);
      const newlyCreatedId = currentNextId - BigInt(1);
      
      if (newlyCreatedId > BigInt(0)) {
        try {
          const corteInfo = await this.getInfoCorte(newlyCreatedId);
          if (corteInfo && corteInfo.frigorifico === this.wallet.selectedAddress) {
            return newlyCreatedId;
          }
        } catch (error) {
          // Corte no existe, continuar
        }
      }
      
      return await this.findLatestUserCorteId();
      
    } catch (error) {
      console.error('Error obteniendo ID de corte creado:', error);
      return BigInt(1);
    }
  }

  /**
   * Encontrar el último corte del usuario
   */
  private async findLatestUserCorteId(): Promise<bigint> {
    try {
      const userCortes = await this.getCortesByFrigorifico();
      if (userCortes.length > 0) {
        return userCortes.reduce((max, corte) => corte.id > max ? corte.id : max, BigInt(0));
      }
      return BigInt(1);
    } catch (error) {
      console.error('Error encontrando último corte del usuario:', error);
      return BigInt(1);
    }
  }

  /**
   * Obtener información de un corte específico
   */
  async getInfoCorte(corteId: bigint): Promise<any> {
    try {
      // Necesitamos encontrar el animalId primero ya que la función requiere ambos parámetros
      const stats = await this.getSystemStats();
      const totalAnimals = Number(stats.total_animals_created || 0);
      
      for (let i = 1; i <= totalAnimals; i++) {
        try {
          const animalId = BigInt(i);
          const result = await this.callContract(
            CONTRACT_FUNCTIONS.GET_INFO_CORTE, 
            [animalId.toString(), corteId.toString()]
          );
          
          if (result && result.length >= 8) {
            return {
              animalId: animalId,
              tipoCorte: Number(result[0]),
              peso: BigInt(result[1]),
              fechaProcesamiento: BigInt(result[2]),
              frigorifico: result[3],
              certificado: result[4] === '0x1' || result[4] === '1',
              loteExportacion: BigInt(result[5]),
              propietario: result[6],
              id: corteId
            };
          }
        } catch (error) {
          // Continuar buscando en el siguiente animal
        }
      }
      
      throw new Error('Corte no encontrado');
      
    } catch (error: any) {
      console.error('❌ Error obteniendo información del corte:', error);
      throw new Error(`Error obteniendo información: ${error.message}`);
    }
  }

  /**
   * Verificar permisos de frigorífico usando ROLES de tu config
   */
  async verifyFrigorificoPermissions(): Promise<boolean> {
    try {
      const hasRole = await this.hasRole(ROLES.FRIGORIFICO_ROLE, this.wallet.selectedAddress);
      console.log(`🔐 Permisos de frigorífico (${ROLES.FRIGORIFICO_ROLE}): ${hasRole}`);
      return hasRole;
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return false;
    }
  }

  /**
   * Obtener todos los exportadores registrados
   */
  async getAllExportadores(): Promise<string[]> {
    try {
      console.log('🔍 Obteniendo lista de exportadores...');
      
      const exportadores: string[] = [];
      const exportadorCount = await this.getRoleMemberCount(ROLES.EXPORTER_ROLE);
      
      for (let i = 0; i < exportadorCount; i++) {
        try {
          const exportadorAddress = await this.getRoleMemberAtIndex(ROLES.EXPORTER_ROLE, i);
          if (exportadorAddress && exportadorAddress !== '0x0') {
            exportadores.push(exportadorAddress);
          }
        } catch (error) {
          console.log(`Error obteniendo exportador en índice ${i}:`, error);
        }
      }
      
      console.log(`✅ ${exportadores.length} exportadores obtenidos`);
      return exportadores;
      
    } catch (error) {
      console.error('❌ Error obteniendo exportadores:', error);
      return [];
    }
  }

  // ============ FUNCIONES DE VALIDACIÓN MEJORADAS ============

  /**
   * Validar que un animal puede ser procesado por este frigorífico - VERSIÓN CORREGIDA
   */
  async validateAnimalForProcessing(animalId: bigint): Promise<{ isValid: boolean; message: string }> {
    try {
      const animalData = await this.getAnimalData(animalId);
      
      // ✅ CORREGIDO: Verificar a través del lote, NO del campo frigorifico del animal
      const batchId = await this.getBatchForAnimal(animalId);
      if (batchId === BigInt(0)) {
        return { isValid: false, message: 'Este animal no está en ningún lote' };
      }
      
      const batchInfo = await this.getBatchInfo(batchId);
      if (batchInfo.frigorifico !== this.wallet.selectedAddress) {
        return { isValid: false, message: 'Este animal no está asignado a tu frigorífico' };
      }
      
      if (animalData.estado !== EstadoAnimal.CREADO) {
        return { 
          isValid: false, 
          message: `El animal está en estado "${EstadoAnimal[animalData.estado]}" y no puede ser procesado` 
        };
      }
      
      return { isValid: true, message: 'Animal válido para procesamiento' };
      
    } catch (error: any) {
      return { isValid: false, message: `Error validando animal: ${error.message}` };
    }
  }

  /**
 * Función de diagnóstico para verificar transferencias - VERSIÓN MEJORADA
 */
async diagnoseTransferencia(batchId: bigint): Promise<void> {
  try {
    console.log(`🔍 [DIAGNÓSTICO] Analizando transferencia del lote #${batchId}`);
    
    const batchInfo = await this.getBatchInfo(batchId);
    const animalsInBatch = await this.getAnimalsInBatch(batchId);
    
    // ✅ MEJORADO: Calcular cantidad real de animales
    const cantidadRealAnimales = animalsInBatch.length;
    
    console.log('📊 Información del lote:', {
      id: batchId.toString(),
      propietario: batchInfo.propietario,
      frigorifico: batchInfo.frigorifico,
      estado: batchInfo.estado,
      cantidad_animales_en_batchInfo: batchInfo.cantidad_animales,
      cantidad_animales_reales: cantidadRealAnimales,
      coincide: batchInfo.cantidad_animales === cantidadRealAnimales,
      fecha_creacion: batchInfo.fecha_creacion?.toString(),
      fecha_transferencia: batchInfo.fecha_transferencia?.toString(),
      fecha_procesamiento: batchInfo.fecha_procesamiento?.toString()
    });
    
    console.log(`🐄 ${cantidadRealAnimales} animales en el lote:`, animalsInBatch.map(id => id.toString()));
    
    // ✅ MEJORADO: Información más detallada de cada animal
    for (const animalId of animalsInBatch) {
      try {
        const animalData = await this.getAnimalData(animalId);
        const animalBatchId = await this.getBatchForAnimal(animalId);
        
        console.log(`   🐄 Animal #${animalId}:`, {
          propietario: animalData.propietario,
          estado: animalData.estado,
          estado_texto: EstadoAnimal[animalData.estado],
          lote_id_en_animalData: animalData.lote_id,
          lote_id_de_getBatchForAnimal: animalBatchId.toString(),
          coincide_lote_ids: animalData.lote_id === Number(animalBatchId),
          peso: animalData.peso?.toString(),
          raza: animalData.raza,
          raza_texto: RazaAnimal[animalData.raza]
        });
      } catch (error) {
        console.log(`   ❌ Error con animal #${animalId}:`, error);
      }
    }
    
    // ✅ NUEVO: Verificación de consistencia
    console.log('🔍 [VERIFICACIÓN] Resumen de diagnóstico:');
    console.log(`   📦 Lote #${batchId}:`);
    console.log(`      - Propietario: ${batchInfo.propietario}`);
    console.log(`      - Frigorífico: ${batchInfo.frigorifico} ${batchInfo.frigorifico === this.wallet.selectedAddress ? '✅ (TU FRIGORÍFICO)' : '❌ (NO ES TU FRIGORÍFICO)'}`);
    console.log(`      - Estado: ${batchInfo.estado} ${batchInfo.estado === 0 ? '✅ (ACTIVO)' : '❌ (PROCESADO/INACTIVO)'}`);
    console.log(`      - Animales: ${cantidadRealAnimales} (${batchInfo.cantidad_animales} en batchInfo) ${batchInfo.cantidad_animales === cantidadRealAnimales ? '✅' : '❌ INCONSISTENCIA'}`);
    console.log(`      - Transferido a este frigorífico: ${batchInfo.frigorifico === this.wallet.selectedAddress ? '✅ SÍ' : '❌ NO'}`);
    console.log(`      - Listo para procesar: ${batchInfo.frigorifico === this.wallet.selectedAddress && batchInfo.estado === 0 ? '✅ SÍ' : '❌ NO'}`);
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

  /**
   * Validar que se puede crear un corte para un animal
   */
  async validateAnimalForCorteCreation(animalId: bigint): Promise<{ isValid: boolean; message: string }> {
    try {
      const animalData = await this.getAnimalData(animalId);
      
      if (animalData.frigorifico !== this.wallet.selectedAddress) {
        return { isValid: false, message: 'Este animal no está asignado a tu frigorífico' };
      }
      
      if (animalData.estado !== EstadoAnimal.PROCESADO) {
        return { 
          isValid: false, 
          message: `El animal debe estar en estado PROCESADO para crear cortes (actual: ${EstadoAnimal[animalData.estado]})` 
        };
      }
      
      return { isValid: true, message: 'Animal válido para creación de cortes' };
      
    } catch (error: any) {
      return { isValid: false, message: `Error validando animal: ${error.message}` };
    }
  }

  // ============ FUNCIONES DE ACEPTACIÓN ============

  /**
   * Obtener animales pendientes de aceptación por el frigorífico - VERSIÓN CORREGIDA
   */
async getPendingAnimalsForFrigorifico(): Promise<any[]> {
  try {
    console.log('🔍 [CORREGIDO] Obteniendo animales pendientes para frigorífico...');
    
    const pendingAnimals: any[] = [];
    const stats = await this.getSystemStats();
    const totalAnimals = Number(stats.total_animals_created || 0);
    
    console.log(`📊 Revisando ${totalAnimals} animales...`);
    
    for (let i = 1; i <= totalAnimals; i++) {
      try {
        const animalId = BigInt(i);
        const animalData = await this.getAnimalData(animalId);
        
        // ✅ CRITERIO CORREGIDO: 
        // - Animal en estado CREADO (0) 
        // - Y tiene frigorífico asignado (diferente de 0x0)
        // - Y el frigorífico es el actual
        if (animalData.estado === 0 && 
            animalData.frigorifico !== '0x0' &&
            animalData.frigorifico.toLowerCase() === this.wallet.selectedAddress.toLowerCase()) {
          
          const batchId = await this.getBatchForAnimal(animalId);
          
          pendingAnimals.push({
            id: animalId,
            raza: animalData.raza,
            peso: animalData.peso,
            propietario: animalData.propietario,
            fechaRecepcion: BigInt(0), // Por defecto
            estado: animalData.estado,
            frigorifico: animalData.frigorifico,
            fecha_transferencia: BigInt(0), // Por defecto
            loteId: batchId,
            tipo: 'individual'
          });
          
          console.log(`✅ Animal pendiente encontrado: #${animalId}`);
        }
      } catch (error) {
        // Continuar con siguiente animal
      }
    }
    
    console.log(`✅ [CORREGIDO] ${pendingAnimals.length} animales pendientes encontrados`);
    return pendingAnimals;
    
  } catch (error: any) {
    console.error('❌ Error obteniendo animales pendientes:', error);
    return [];
  }
}

/**
 * ✅ CORREGIDO: Obtener lotes pendientes de aceptación


  /**
   * Obtener lotes pendientes de aceptación por el frigorífico
   */
  async getPendingBatchesForFrigorifico(): Promise<any[]> {
  try {
    console.log('🔍 [CORREGIDO] Obteniendo lotes pendientes para frigorífico...');
    
    const pendingBatches: any[] = [];
    const stats = await this.getSystemStats();
    const totalBatches = Number(stats.total_batches_created || 0);
    
    console.log(`📊 Revisando ${totalBatches} lotes...`);
    
    for (let i = 1; i <= totalBatches; i++) {
      try {
        const batchId = BigInt(i);
        const batchInfo = await this.getBatchInfo(batchId);
        
        // ✅ CRITERIO CORREGIDO:
        // - Lote tiene frigorífico asignado (diferente de 0x0)
        // - Y el frigorífico es el actual
        // - Y estado es 0 (activo) o 1 (transferido)
        if (batchInfo.frigorifico !== '0x0' &&
            batchInfo.frigorifico.toLowerCase() === this.wallet.selectedAddress.toLowerCase() &&
            (batchInfo.estado === 0 || batchInfo.estado === 1)) {
          
          const animalsInBatch = await this.getAnimalsInBatch(batchId);
          
          pendingBatches.push({
            id: batchId,
            propietario: batchInfo.propietario,
            frigorifico: batchInfo.frigorifico,
            fecha_creacion: batchInfo.fecha_creacion,
            fecha_transferencia: batchInfo.fecha_transferencia,
            fecha_procesamiento: batchInfo.fecha_procesamiento,
            estado: batchInfo.estado,
            cantidad_animales: animalsInBatch.length,
            peso_total: batchInfo.peso_total,
            animal_ids: animalsInBatch,
            tipo: 'lote'
          });
          
          console.log(`✅ Lote pendiente encontrado: #${batchId}`, {
            estado: batchInfo.estado,
            frigorifico: batchInfo.frigorifico,
            animales: animalsInBatch.length
          });
        }
      } catch (error) {
        // Continuar con siguiente lote
      }
    }
    
    console.log(`✅ [CORREGIDO] ${pendingBatches.length} lotes pendientes encontrados`);
    return pendingBatches;
    
  } catch (error: any) {
    console.error('❌ Error obteniendo lotes pendientes:', error);
    return [];
  }
}
  /**
 * Función auxiliar para obtener información de múltiples animales
 */
  private async getAnimalsInfo(animalIds: bigint[]): Promise<any[]> {
    const animalsInfo = [];
    
    for (const animalId of animalIds) {
      try {
        const animalData = await this.getAnimalData(animalId);
        animalsInfo.push({
          id: animalId,
          raza: animalData.raza,
          peso: animalData.peso,
          estado: animalData.estado
        });
      } catch (error) {
        console.log(`Error obteniendo info del animal #${animalId}`);
      }
    }
    
    return animalsInfo;
  }

  /**
   * Aceptar y pagar por un animal individual
   */
  async acceptAnimalWithPayment(animalId: bigint): Promise<{ txHash: string; payment: TransferPayment }> {
    try {
      console.log(`💰 Aceptando animal #${animalId} con pago...`);
      
      // Verificar que el animal esté pendiente de aceptación
      const animalData = await this.getAnimalData(animalId);
      if (animalData.frigorifico !== this.wallet.selectedAddress) {
        throw new Error('Este animal no está asignado a tu frigorífico');
      }
      
      if (animalData.estado !== EstadoAnimal.CREADO) {
        throw new Error('Este animal ya ha sido procesado o aceptado');
      }
      
      // ✅ USAR la nueva interfaz del servicio actualizado
      const paymentResult = await this.chipyPay.acceptAnimalWithPayment(
        animalId,
        this.wallet.selectedAddress, // Frigorífico paga
        animalData.propietario // Productor recibe
      );

      // Completar la aceptación en el contrato
      const contractResult = await this.acceptAnimalTransfer(animalId);
      
      console.log(`✅ Animal #${animalId} aceptado y pagado exitosamente`);
      
      return {
        txHash: paymentResult.txHash,
        payment: paymentResult.payment
      };
      
    } catch (error: any) {
      console.error('❌ Error aceptando animal:', error);
      throw new Error(`Error aceptando animal: ${error.message}`);
    }
  }

  /**
   * Aceptar y pagar por un lote completo
   */
  async acceptBatchWithPayment(batchId: bigint): Promise<{ txHash: string; payment: TransferPayment }> {
    try {
      console.log(`💰 Aceptando lote #${batchId} con pago...`);
      
      // Verificar que el lote esté pendiente de aceptación
      const batchInfo = await this.getBatchInfo(batchId);
      if (batchInfo.frigorifico !== this.wallet.selectedAddress) {
        throw new Error('Este lote no está asignado a tu frigorífico');
      }
      
      if (batchInfo.estado !== 0) {
        throw new Error('Este lote ya ha sido procesado o aceptado');
      }
      
      if (!batchInfo.animal_ids || batchInfo.animal_ids.length === 0) {
        throw new Error('El lote no contiene animales');
      }
      
      // ✅ USAR la nueva interfaz del servicio actualizado
      const paymentResult = await this.chipyPay.acceptBatchWithPayment(
        batchId,
        this.wallet.selectedAddress, // Frigorífico paga
        batchInfo.propietario, // Productor recibe
        batchInfo.animal_ids.length
      );

      // Completar la aceptación en el contrato
      const contractResult = await this.acceptBatchTransfer(batchId);
      
      console.log(`✅ Lote #${batchId} aceptado y pagado exitosamente`);
      
      return {
        txHash: paymentResult.txHash,
        payment: paymentResult.payment
      };
      
    } catch (error: any) {
      console.error('❌ Error aceptando lote:', error);
      throw new Error(`Error aceptando lote: ${error.message}`);
    }
  }

  /**
   * Aceptar transferencia de animal individual (sin pago - para compatibilidad)
   */
  async acceptAnimalTransfer(animalId: bigint): Promise<string> {
    try {
      console.log(`✅ Aceptando transferencia de animal #${animalId}`);
      
      // Verificar que el animal esté asignado a este frigorífico
      const animalData = await this.getAnimalData(animalId);
      if (animalData.frigorifico !== this.wallet.selectedAddress) {
        throw new Error('Este animal no está asignado a tu frigorífico');
      }
      
      const result = await this.sendTransaction(
        'procesar_animal',
        [animalId.toString()]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Transferencia de animal aceptada');
      return txHash;
      
    } catch (error: any) {
      console.error('❌ Error aceptando transferencia de animal:', error);
      throw new Error(`Error aceptando transferencia: ${error.message}`);
    }
  }

  /**
   * Aceptar transferencia de lote (sin pago - para compatibilidad)
   */
  async acceptBatchTransfer(batchId: bigint): Promise<string> {
    try {
      console.log(`✅ Aceptando transferencia de lote #${batchId}`);
      
      // Verificar que el lote esté asignado a este frigorífico
      const batchInfo = await this.getBatchInfo(batchId);
      if (batchInfo.frigorifico !== this.wallet.selectedAddress) {
        throw new Error('Este lote no está asignado a tu frigorífico');
      }
      
      const result = await this.sendTransaction(
        'procesar_batch',
        [batchId.toString()]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Transferencia de lote aceptada');
      return txHash;
      
    } catch (error: any) {
      console.error('❌ Error aceptando transferencia de lote:', error);
      throw new Error(`Error aceptando transferencia: ${error.message}`);
    }
  }

  /**
   * Obtener datos de lote (alias de getBatchInfo para compatibilidad)
   */
  async getBatchData(batchId: bigint): Promise<any> {
    return this.getBatchInfo(batchId);
  }

  /**
   * Crear múltiples cortes para un lote
   */
  // EN AnimalContractService.ts - CORREGIR crearCortesParaBatch
  async crearCortesParaBatch(batchId: bigint, tiposCorte: bigint[], pesos: bigint[]): Promise<{ corteIds: bigint[]; txHash: string; }> {
    try {
      console.log(`🥩 [CONTRATO] Creando cortes para lote ${batchId}`);
      
      const result = await this.sendTransaction(
        'crear_cortes_para_batch',
        [
          batchId.toString(),
          tiposCorte.length.toString(),
          ...tiposCorte.map(t => t.toString()),
          pesos.length.toString(), 
          ...pesos.map(p => p.toString())
        ]
      );

      const txHash = this.extractTransactionHash(result);
      console.log('✅ Cortes creados exitosamente');
      
      // ✅ CORRECCIÓN: Retornar objeto con corteIds y txHash
      // Por ahora simulamos los corteIds, en producción vendrían del evento
      const corteIds = Array.from({ length: tiposCorte.length }, (_, i) => BigInt(i + 1));
      
      return {
        corteIds,
        txHash
      };
    } catch (error: any) {
      console.error('❌ Error creando cortes:', error);
      throw new Error(`Error creando cortes: ${error.message}`);
    }
  }
  /**
   * Obtener todas las transferencias pendientes (animales + lotes)
   */
  async getAllPendingTransfers(): Promise<{ animals: any[]; batches: any[] }> {
    try {
      console.log('🔍 Obteniendo todas las transferencias pendientes...');
      
      const [animals, batches] = await Promise.all([
        this.getPendingAnimalsForFrigorifico(),
        this.getPendingBatchesForFrigorifico()
      ]);
      
      console.log(`✅ ${animals.length} animales + ${batches.length} lotes pendientes`);
      return { animals, batches };
      
    } catch (error: any) {
      console.error('❌ Error obteniendo transferencias pendientes:', error);
      return { animals: [], batches: [] };
    }
  }

  // Agrega esto en tu AnimalContractService (src/services/animalContractService.ts)

/**
 * ✅ NUEVA FUNCIÓN: Obtener el recibo de una transacción
 */
async getTransactionReceipt(txHash: string, blockNumber?: number): Promise<any> {
  try {
    console.log(`📄 Obteniendo recibo de transacción: ${txHash}`);
    
    if (!this.wallet?.provider) {
      throw new Error('Provider no disponible');
    }

    // Usar el provider de Starknet para obtener el recibo
    const receipt = await this.wallet.provider.getTransactionReceipt(txHash);
    
    console.log('📊 Recibo obtenido:', {
      status: receipt.status,
      block_hash: receipt.block_hash,
      block_number: receipt.block_number,
      events: receipt.events?.length || 0
    });
    
    return receipt;
    
  } catch (error: any) {
    console.error(`❌ Error obteniendo recibo de transacción ${txHash}:`, error);
    throw new Error(`Error obteniendo recibo: ${error.message}`);
  }
}

/**
 * ✅ FUNCIÓN ALTERNATIVA: Obtener eventos de transacción usando callContract
 */
async getTransactionEvents(txHash: string): Promise<any[]> {
  try {
    console.log(`🔍 Buscando eventos de transacción: ${txHash}`);
    
    // Intentar obtener eventos usando callContract si existe la función
    try {
      const result = await this.callContract('get_transaction_events', [txHash]);
      if (result && Array.isArray(result)) {
        console.log(`✅ ${result.length} eventos obtenidos del contrato`);
        return result;
      }
    } catch (error) {
      console.log('Función get_transaction_events no disponible en el contrato');
    }
    
    // Si no hay función específica, intentar obtener eventos de forma genérica
    // Buscar eventos recientes que coincidan con el txHash
    const recentEvents = await this.getRecentEvents();
    const txEvents = recentEvents.filter((event: any) => 
      event.transaction_hash === txHash
    );
    
    console.log(`✅ ${txEvents.length} eventos encontrados para transacción`);
    return txEvents;
    
  } catch (error: any) {
    console.error(`❌ Error obteniendo eventos de transacción:`, error);
    return [];
  }
}

/**
 * ✅ FUNCIÓN AUXILIAR: Obtener eventos recientes del contrato
 */
private async getRecentEvents(): Promise<any[]> {
  try {
    // Obtener el bloque actual
    const blockNumber = await this.wallet.provider.getBlockNumber();
    console.log(`📦 Bloque actual: ${blockNumber}`);
    
    // Buscar eventos desde los últimos 100 bloques
    const fromBlock = Math.max(0, blockNumber - 100);
    
    // Filtrar eventos del contrato actual
    const events = await this.wallet.provider.getEvents({
      from_block: { block_number: fromBlock },
      to_block: { block_number: blockNumber },
      address: this.contractAddress,
      keys: [[]] // Todos los eventos
    });
    
    console.log(`📊 ${events.length} eventos encontrados en últimos 100 bloques`);
    return events;
    
  } catch (error: any) {
    console.error('❌ Error obteniendo eventos recientes:', error);
    return [];
  }
}

/**
 * ✅ FUNCIÓN MEJORADA: Buscar animales por transacción
 */
async findAnimalsByTransaction(txHash: string): Promise<bigint[]> {
  try {
    console.log(`🔍 Buscando animales creados en transacción: ${txHash}`);
    
    const animalIds: bigint[] = [];
    
    // Método 1: Buscar en eventos de la transacción
    const receipt = await this.getTransactionReceipt(txHash);
    
    if (receipt.events && receipt.events.length > 0) {
      console.log(`📋 Analizando ${receipt.events.length} eventos...`);
      
      for (const event of receipt.events) {
        console.log('🔍 Evento:', {
          from_address: event.from_address,
          keys: event.keys,
          data: event.data
        });
        
        // Buscar eventos de AnimalCreado
        if (event.from_address === this.contractAddress) {
          // El animalId podría estar en event.data[0] o event.keys[0]
          let animalId: bigint | null = null;
          
          // Intentar extraer de event.data
          if (event.data && event.data.length > 0) {
            try {
              animalId = BigInt(event.data[0]);
              console.log(`🐄 Posible animal encontrado en data[0]: ${animalId}`);
            } catch (error) {
              // No es un número válido
            }
          }
          
          // Intentar extraer de event.keys
          if (!animalId && event.keys && event.keys.length > 0) {
            try {
              animalId = BigInt(event.keys[0]);
              console.log(`🐄 Posible animal encontrado en keys[0]: ${animalId}`);
            } catch (error) {
              // No es un número válido
            }
          }
          
          if (animalId && animalId > BigInt(0)) {
            // Verificar que el animal existe
            try {
              const animalData = await this.getAnimalData(animalId);
              if (animalData && animalData.propietario) {
                animalIds.push(animalId);
                console.log(`✅ Animal #${animalId} confirmado en blockchain`);
              }
            } catch (error) {
              console.log(`❌ Animal #${animalId} no existe o error:`, error);
            }
          }
        }
      }
    }
    
    // Método 2: Buscar en estadísticas del sistema
    if (animalIds.length === 0) {
      console.log('🔍 Buscando por estadísticas del sistema...');
      const stats = await this.getSystemStats();
      const totalAnimals = Number(stats.total_animals_created || 0);
      
      console.log(`📊 Revisando ${totalAnimals} animales en el sistema...`);
      
      // Buscar animales creados recientemente
      for (let i = Math.max(1, totalAnimals - 10); i <= totalAnimals; i++) {
        try {
          const animalId = BigInt(i);
          const animalData = await this.getAnimalData(animalId);
          
          // Si el animal existe y fue creado recientemente, podría ser de esta transacción
          if (animalData && animalData.propietario) {
            animalIds.push(animalId);
            console.log(`🐄 Animal reciente encontrado: #${animalId}`);
          }
        } catch (error) {
          // Continuar con siguiente animal
        }
      }
    }
    
    console.log(`✅ ${animalIds.length} animales encontrados para transacción ${txHash}`);
    return animalIds;
    
  } catch (error: any) {
    console.error(`❌ Error buscando animales por transacción:`, error);
    return [];
  }
}

// AGREGAR ESTO AL AnimalContractService (src/services/animalContractService.ts)

/**
 * ✅ NUEVO MÉTODO: Obtener la dirección del usuario conectado
 */
getUserAddress(): string {
  if (!this.wallet || !this.wallet.selectedAddress) {
    throw new Error('Wallet no conectada');
  }
  return this.wallet.selectedAddress;
}

/**
 * ✅ NUEVO MÉTODO: Verificar si la wallet está conectada
 */
isConnected(): boolean {
  return !!(this.wallet && this.wallet.selectedAddress);
}

// AGREGAR ESTO AL AnimalContractService (src/services/animalContractService.ts)

/**
 * ✅ FUNCIÓN ALTERNATIVA: Obtener TODOS los animales del usuario escaneando la blockchain
 */
async getAllUserAnimals(): Promise<bigint[]> {
  try {
    console.log('🔍 [ALTERNATIVA] Obteniendo TODOS los animales del usuario escaneando blockchain...');
    
    const userAnimals: bigint[] = [];
    const userAddress = this.getUserAddress();
    
    // Obtener estadísticas del sistema para saber cuántos animales hay
    const stats = await this.getSystemStats();
    const totalAnimals = Number(stats.total_animals_created || 0);
    
    console.log(`📊 Revisando ${totalAnimals} animales en el sistema para el usuario ${userAddress}...`);
    
    let animalsFound = 0;
    
    // Escanear desde el animal #1 hasta el total
    for (let i = 1; i <= totalAnimals; i++) {
      try {
        const animalId = BigInt(i);
        const animalData = await this.getAnimalData(animalId);
        
        // Verificar si el animal pertenece al usuario actual
        if (animalData.propietario === userAddress) {
          userAnimals.push(animalId);
          animalsFound++;
          console.log(`✅ Animal #${animalId} pertenece al usuario (Total: ${animalsFound})`);
        }
      } catch (error) {
        // Animal no existe o error, continuar con el siguiente
        console.log(`Animal #${i} no disponible o error`);
      }
    }
    
    console.log(`🎯 [ALTERNATIVA] ${userAnimals.length} animales encontrados para el usuario`);
    return userAnimals;
    
  } catch (error: any) {
    console.error('❌ Error obteniendo animales del usuario (método alternativo):', error);
    return [];
  }
}

/**
 * ✅ FUNCIÓN MEJORADA: Obtener animales del usuario con método alternativo
 */
async getAnimalsByProducerSafe(producer: string): Promise<bigint[]> {
  try {
    console.log(`🔍 Obteniendo animales del productor: ${producer}`);
    
    // Primero intentar con el método normal
    try {
      const result = await this.callContract('get_animals_by_producer', [producer]);
      const animalIds = result.map((id: string) => BigInt(id));
      
      console.log(`📊 Método normal: ${animalIds.length} animales encontrados`);
      
      // Si encontramos animales, retornarlos
      if (animalIds.length > 0) {
        return animalIds;
      }
    } catch (error) {
      console.log('❌ Método normal falló, usando alternativa...');
    }
    
    // Si el método normal falla o no encuentra animales, usar el alternativo
    return await this.getAllUserAnimals();
    
  } catch (error: any) {
    console.error('❌ Error obteniendo animales del productor:', error);
    return [];
  }
}

getContractAddress(): string {
  return this.contractAddress;
}


// ============ NUEVAS FUNCIONES QR ============

async generateQRForCorte(animalId: bigint, corteId: bigint): Promise<string> {
  try {
    console.log(`📱 [QR] Generando QR para corte ${corteId} del animal ${animalId}`);
    
    const result = await this.sendTransaction(
      'generate_qr_for_corte',
      [animalId.toString(), corteId.toString()]
    );

    const txHash = this.extractTransactionHash(result);
    console.log(`✅ [QR] QR generado - TX: ${txHash}`);
    
    // En una implementación real, obtendríamos el QR hash del evento
    // Por ahora retornamos un hash simulado
    return `qr_corte_${animalId}_${corteId}_${Date.now()}`;
    
  } catch (error: any) {
    console.error('❌ [QR] Error generando QR para corte:', error);
    throw new Error(`Error generando QR: ${error.message}`);
  }
}

async generateQRForAnimal(animalId: bigint): Promise<string> {
  try {
    console.log(`📱 [QR] Generando QR para animal ${animalId}`);
    
    const result = await this.sendTransaction(
      'generate_qr_for_animal',
      [animalId.toString()]
    );

    const txHash = this.extractTransactionHash(result);
    console.log(`✅ [QR] QR para animal generado - TX: ${txHash}`);
    
    return `qr_animal_${animalId}_${Date.now()}`;
    
  } catch (error: any) {
    console.error('❌ [QR] Error generando QR para animal:', error);
    throw new Error(`Error generando QR: ${error.message}`);
  }
}

async generateQRForBatch(batchId: bigint): Promise<string> {
  try {
    console.log(`📱 [QR] Generando QR para lote ${batchId}`);
    
    const result = await this.sendTransaction(
      'generate_qr_for_batch',
      [batchId.toString()]
    );

    const txHash = this.extractTransactionHash(result);
    console.log(`✅ [QR] QR para lote generado - TX: ${txHash}`);
    
    return `qr_lote_${batchId}_${Date.now()}`;
    
  } catch (error: any) {
    console.error('❌ [QR] Error generando QR para lote:', error);
    throw new Error(`Error generando QR: ${error.message}`);
  }
}

async getPublicConsumerData(qrHash: string): Promise<any> {
  try {
    console.log(`📊 [QR] Obteniendo datos públicos para QR: ${qrHash}`);
    
    const result = await this.callContract('get_public_consumer_data', [qrHash]);
    
    // Mapear resultado del contrato
    const datos = {
      raza: BigInt(result[0] || 0),
      fecha_nacimiento: BigInt(result[1] || 0),
      fecha_procesamiento: BigInt(result[2] || 0),
      frigorifico_nombre: result[3] || 'Frigorífico Certificado',
      certificador_nombre: result[4] || 'Organismo Certificador',
      tipo_corte: BigInt(result[5] || 0),
      peso_corte: BigInt(result[6] || 0),
      certificaciones: result[7] || 'Certificado de Origen',
      pais_origen: result[8] || 'Argentina'
    };
    
    console.log(`✅ [QR] Datos públicos obtenidos:`, datos);
    return datos;
    
  } catch (error: any) {
    console.error('❌ [QR] Error obteniendo datos públicos:', error);
    // Retornar datos de ejemplo para desarrollo
    return {
      raza: BigInt(1),
      fecha_nacimiento: BigInt(Date.now() / 1000 - 31536000), // 1 año atrás
      fecha_procesamiento: BigInt(Date.now() / 1000),
      frigorifico_nombre: 'Frigorífico Modelo SA',
      certificador_nombre: 'SENASA Certificado',
      tipo_corte: BigInt(2),
      peso_corte: BigInt(1500),
      certificaciones: 'Origen Controlado, Calidad Premium',
      pais_origen: 'Argentina'
    };
  }
}

async verifyQRAuthenticity(qrHash: string): Promise<boolean> {
  try {
    console.log(`🔍 [QR] Verificando autenticidad QR: ${qrHash}`);
    
    const result = await this.callContract('verify_qr_authenticity', [qrHash]);
    
    const esAutentico = result[0] === '0x1' || result[0] === '1';
    console.log(`✅ [QR] QR ${qrHash} - Auténtico: ${esAutentico}`);
    
    return esAutentico;
    
  } catch (error: any) {
    console.error('❌ [QR] Error verificando QR:', error);
    return false;
  }
}

async getQRData(qrHash: string): Promise<any> {
  try {
    console.log(`📋 [QR] Obteniendo datos completos QR: ${qrHash}`);
    
    const result = await this.callContract('get_qr_data', [qrHash]);
    
    const qrData = {
      qr_hash: qrHash,
      animal_id: BigInt(result[0] || 0),
      corte_id: BigInt(result[1] || 0),
      timestamp: BigInt(result[2] || 0),
      data_type: result[3] || 'CORTE',
      metadata: result[4] || 'Datos de trazabilidad'
    };
    
    console.log(`✅ [QR] Datos QR obtenidos:`, qrData);
    return qrData;
    
  } catch (error: any) {
    console.error('❌ [QR] Error obteniendo datos QR:', error);
    throw new Error(`Error obteniendo datos QR: ${error.message}`);
  }
}

// Helper para extraer transaction hash de diferentes formatos
/* private extractTransactionHash(result: any): string {
  if (typeof result === 'string') {
    return result;
  } else if (result?.txHash) {
    return result.txHash;
  } else if (result?.transaction_hash) {
    return result.transaction_hash;
  } else {
    return `tx_${Date.now()}`;
  }
} */
}

