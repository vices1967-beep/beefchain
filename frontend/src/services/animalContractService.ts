// src/services/animalContractService.ts - VERSIÓN COMPLETA CON TODAS LAS FUNCIONES
import { RazaAnimal, EstadoAnimal, TipoCorte, CONTRACT_FUNCTIONS, ROLES, ROLE_DISPLAY_NAMES  } from '@/contracts/config';
import { ChipyPayService } from './chipypay-service';
import { CHIPYPAY_CONFIG, TransferPayment } from '@/contracts/chipypay-config';

export class AnimalContractService {
  private wallet: any;
  private contractAddress: string;
  private chipyPay: ChipyPayService;

  constructor(wallet: any) {
    this.wallet = wallet;
    this.contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
    this.chipyPay = new ChipyPayService(wallet);
    
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
    const txHash = result.transaction_hash || result.tx_hash || result.hash || result.transactionHash;
    
    if (!txHash) {
      console.error('❌ No se pudo extraer hash de transacción de:', result);
      throw new Error('No se pudo obtener el hash de transacción');
    }
    
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
// ✅ FUNCIÓN CORREGIDA para create_animal_batch
// ✅ FUNCIÓN COMPLETAMENTE CORREGIDA - Estructura Cairo correcta
  async createAnimalBatchSafe(animalIds: bigint[]): Promise<{ batchId: bigint; txHash: string }> {
    try {
      console.log(`📦 [CORREGIDO] Creando lote con animales:`, animalIds.map(id => id.toString()));
      
      const verification = await this.verifyAnimalsAvailable(animalIds);
      
      if (verification.available.length === 0) {
        throw new Error(`No hay animales disponibles: ${verification.reasons.join('; ')}`);
      }

      console.log(`✅ Animales verificados:`, verification.available.map(id => id.toString()));

      // ✅ FORMA CORRECTA para Cairo - Solo el array de animal_ids
      // El contrato espera: (animal_ids: Array<u128>)
      // Pero en calldata se envía como: [longitud, ...elementos]
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
// ✅ FUNCIÓN COMPLETAMENTE CORREGIDA para add_animals_to_batch
// ✅ FUNCIÓN CORREGIDA para add_animals_to_batch - Estructura diferente
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
      // El contrato espera: (batch_id: u128, animal_ids: Array<u128>)
      // En calldata: [batch_id, longitud_array, ...elementos_array]
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

  // ✅ FUNCIÓN DE DIAGNÓSTICO DE ANIMALES DISPONIBLES
/*   const diagnoseAvailableAnimals = async () => {
    if (!contractService || !address) return;
    
    try {
      console.log(`🔍 [DIAGNÓSTICO] Verificando animales disponibles para ${address}`);
      
      // 1. Obtener todos los animales del productor
      const allAnimals = await contractService.getAnimalsByProducer(address);
      console.log(`📊 [DIAGNÓSTICO] Todos mis animales:`, allAnimals.map(a => a.toString()));
      
      // 2. Verificar cada animal individualmente
      const availableAnimals: bigint[] = [];
      const unavailableAnimals: {id: bigint, reason: string}[] = [];
      
      for (const animalId of allAnimals) {
        try {
          const animalData = await contractService.getAnimalData(animalId);
          const batchId = await contractService.getBatchForAnimal(animalId);
          
          console.log(`🐄 [DIAGNÓSTICO] Animal #${animalId}:`, {
            propietario: animalData.propietario,
            estado: animalData.estado,
            lote_id: animalData.lote_id,
            batchId_from_function: batchId.toString(),
            es_mio: animalData.propietario === address,
            estado_activo: animalData.estado === 0,
            sin_lote: batchId === BigInt(0) && animalData.lote_id === 0
          });
          
          if (animalData.propietario !== address) {
            unavailableAnimals.push({id: animalId, reason: 'No es propietario'});
          } else if (animalData.estado !== 0) {
            unavailableAnimals.push({id: animalId, reason: `Estado ${animalData.estado}`});
          } else if (batchId !== BigInt(0) || animalData.lote_id !== 0) {
            unavailableAnimals.push({id: animalId, reason: `En lote ${batchId || animalData.lote_id}`});
          } else {
            availableAnimals.push(animalId);
          }
          
        } catch (error) {
          console.log(`❌ [DIAGNÓSTICO] Error con animal #${animalId}:`, error);
          unavailableAnimals.push({id: animalId, reason: 'Error al verificar'});
        }
      }
      
      console.log(`✅ [DIAGNÓSTICO] RESULTADO:`);
      console.log(`   🟢 Disponibles:`, availableAnimals.map(a => a.toString()));
      console.log(`   🔴 No disponibles:`, unavailableAnimals);
      
      return { availableAnimals, unavailableAnimals };s
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      return { availableAnimals: [], unavailableAnimals: [] };
    }
  }; */

  // Llamar esta función para debuggear:
  // await diagnoseAvailableAnimals();

  // ============ FUNCIONES DE CONSULTA MEJORADAS ============

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

  async hasRole(role: string, account: string): Promise<boolean> {
    try {
      const result = await this.callContract('has_role', [role, account]);
      return result[0] === '0x1' || result[0] === '1';
    } catch (error: any) {
      console.error('❌ Error verificando rol:', error);
      return false;
    }
  }

  async getRoleMemberCount(role: string): Promise<number> {
    try {
      const result = await this.callContract('get_role_member_count', [role]);
      return Number(result[0] || '0');
    } catch (error: any) {
      console.error('❌ Error obteniendo cantidad de miembros del rol:', error);
      return 0;
    }
  }

  async getRoleMemberAtIndex(role: string, index: number): Promise<string> {
    try {
      const result = await this.callContract('get_role_member_at_index', [role, index.toString()]);
      return result[0];
    } catch (error: any) {
      console.error('❌ Error obteniendo miembro del rol:', error);
      throw new Error(`Error obteniendo miembro: ${error.message}`);
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


  // AGREGAR AL AnimalContractService - FUNCIONES ESPECÍFICAS PARA FRIGORÍFICO

  // ============ FUNCIONES ESPECÍFICAS PARA FRIGORÍFICO ============


  // AGREGAR ESTAS FUNCIONES AL AnimalContractService

  /**
   * Obtener animales por estado (para frigorífico)
   */
  async getAnimalsByState(estado: EstadoAnimal): Promise<any[]> {
    try {
      console.log(`🔍 Obteniendo animales en estado: ${EstadoAnimal[estado]} (${estado})`);
      
      const animals: any[] = [];
      const stats = await this.getSystemStats();
      const totalAnimals = Number(stats.total_animals_created || 0);
      
      console.log(`📊 Revisando ${totalAnimals} animales en el sistema...`);
      
      for (let i = 1; i <= totalAnimals; i++) {
        try {
          const animalId = BigInt(i);
          const animalData = await this.getAnimalData(animalId);
          
          // Verificar estado y que esté asignado a este frigorífico
          if (animalData.estado === estado && animalData.frigorifico === this.wallet.selectedAddress) {
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
                frigorifico: animalData.frigorifico,
                loteId: animalData.lote_id
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
                frigorifico: animalData.frigorifico,
                loteId: animalData.lote_id
              });
            }
          }
        } catch (error) {
          // Continuar con siguiente animal
          console.log(`Animal #${i} no disponible para estado ${estado}`);
        }
      }
      
      console.log(`✅ ${animals.length} animales encontrados en estado ${EstadoAnimal[estado]}`);
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
      console.log(`🔍 Obteniendo animales para frigorífico: ${targetAddress}`);
      
      const animals: any[] = [];
      const stats = await this.getSystemStats();
      const totalAnimals = Number(stats.total_animals_created || 0);
      
      console.log(`📊 Revisando ${totalAnimals} animales en el sistema...`);
      
      for (let i = 1; i <= totalAnimals; i++) {
        try {
          const animalId = BigInt(i);
          const animalData = await this.getAnimalData(animalId);
          
          // Verificar si el animal está asignado a este frigorífico
          if (animalData.frigorifico === targetAddress) {
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
                frigorifico: animalData.frigorifico,
                loteId: animalData.lote_id
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
                frigorifico: animalData.frigorifico,
                loteId: animalData.lote_id
              });
            }
          }
        } catch (error) {
          // Animal no existe o error al obtener datos, continuar
          console.log(`Animal #${i} no disponible`);
        }
      }
      
      console.log(`✅ ${animals.length} animales encontrados para frigorífico`);
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
 * Obtener información extendida del animal
 */

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
 * Validar que un animal puede ser procesado por este frigorífico
 */
async validateAnimalForProcessing(animalId: bigint): Promise<{ isValid: boolean; message: string }> {
  try {
    const animalData = await this.getAnimalData(animalId);
    
    if (animalData.frigorifico !== this.wallet.selectedAddress) {
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

// AGREGAR AL AnimalContractService - FUNCIONES DE ACEPTACIÓN

/**
 * Obtener animales pendientes de aceptación por el frigorífico
 */
async getPendingAnimalsForFrigorifico(): Promise<any[]> {
  try {
    console.log('🔍 Obteniendo animales pendientes de aceptación...');
    
    const pendingAnimals: any[] = [];
    const stats = await this.getSystemStats();
    const totalAnimals = Number(stats.total_animals_created || 0);
    
    for (let i = 1; i <= totalAnimals; i++) {
      try {
        const animalId = BigInt(i);
        const animalData = await this.getAnimalData(animalId);
        
        // Animales que tienen este frigorífico como destino pero aún no han sido aceptados
        // Esto generalmente se determina por el estado y el campo frigorifico
        if (animalData.frigorifico === this.wallet.selectedAddress && 
            animalData.estado === EstadoAnimal.CREADO) {
          try {
            const animalInfo = await this.getInfoAnimal(animalId);
            pendingAnimals.push({
              id: animalId,
              raza: animalData.raza,
              peso: animalData.peso,
              propietario: animalData.propietario,
              fechaRecepcion: animalInfo.fechaCreacion || BigInt(0),
              estado: animalData.estado,
              metadataHash: animalInfo.metadataHash,
              frigorifico: animalData.frigorifico,
              loteId: animalData.lote_id,
              tipo: 'individual'
            });
          } catch (error) {
            pendingAnimals.push({
              id: animalId,
              raza: animalData.raza,
              peso: animalData.peso,
              propietario: animalData.propietario,
              fechaRecepcion: BigInt(0),
              estado: animalData.estado,
              metadataHash: '',
              frigorifico: animalData.frigorifico,
              loteId: animalData.lote_id,
              tipo: 'individual'
            });
          }
        }
      } catch (error) {
        // Continuar con siguiente animal
      }
    }
    
    console.log(`✅ ${pendingAnimals.length} animales pendientes de aceptación`);
    return pendingAnimals;
    
  } catch (error: any) {
    console.error('❌ Error obteniendo animales pendientes:', error);
    return [];
  }
}

/**
 * Obtener lotes pendientes de aceptación por el frigorífico
 */
async getPendingBatchesForFrigorifico(): Promise<any[]> {
  try {
    console.log('🔍 Obteniendo lotes pendientes de aceptación...');
    
    const pendingBatches: any[] = [];
    const stats = await this.getSystemStats();
    const totalBatches = Number(stats.total_batches_created || 0);
    
    for (let i = 1; i <= totalBatches; i++) {
      try {
        const batchId = BigInt(i);
        const batchInfo = await this.getBatchInfo(batchId);
        
        // Lotes que tienen este frigorífico como destino pero aún no han sido procesados
        if (batchInfo.frigorifico === this.wallet.selectedAddress && 
            batchInfo.estado === 0) { // 0 = activo, no procesado
          const animalsInBatch = await this.getAnimalsInBatch(batchId);
          
          pendingBatches.push({
            id: batchId,
            ...batchInfo,
            animal_ids: animalsInBatch,
            cantidad_animales: animalsInBatch.length,
            tipo: 'batch'
          });
        }
      } catch (error) {
        // Continuar con siguiente lote
      }
    }
    
    console.log(`✅ ${pendingBatches.length} lotes pendientes de aceptación`);
    return pendingBatches;
    
  } catch (error: any) {
    console.error('❌ Error obteniendo lotes pendientes:', error);
    return [];
  }
}

/**
 * Aceptar y pagar por un animal individual
 */
async acceptAnimalWithPayment(animalId: bigint, paymentAmount?: bigint): Promise<{ txHash: string; payment: any }> {
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
    
    // Procesar pago a través de ChipyPay
    const payment = await this.chipyPay.processAcceptancePayment(
      animalId,
      this.wallet.selectedAddress,
      animalData.propietario,
      paymentAmount
    );
    
    // Aquí debería haber una función del contrato para confirmar la aceptación
    // Por ahora, usamos procesar_animal como placeholder
    const result = await this.sendTransaction(
      CONTRACT_FUNCTIONS.PROCESAR_ANIMAL,
      [animalId.toString()]
    );
    
    const txHash = this.extractTransactionHash(result);
    
    console.log('✅ Animal aceptado y pagado exitosamente');
    return { txHash, payment };
    
  } catch (error: any) {
    console.error('❌ Error aceptando animal:', error);
    throw new Error(`Error aceptando animal: ${error.message}`);
  }
}

/**
 * Aceptar y pagar por un lote completo
 */
// EN AnimalContractService - USAR LA FUNCIÓN CORRECTA
/**
 * Aceptar y pagar por un lote completo - VERSIÓN CORREGIDA
 */
async acceptBatchWithPayment(batchId: bigint, paymentAmount?: bigint): Promise<{ txHash: string; payment: any }> {
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
    
    // Calcular precio basado en cantidad de animales
    const basePrice = CHIPYPAY_CONFIG.BASE_PRICES.ANIMAL_ACCEPTANCE;
    const calculatedAmount = paymentAmount || (basePrice * BigInt(batchInfo.animal_ids.length));
    
    // Procesar pago
    const payment = await this.chipyPay.processAcceptancePayment(
      batchId,
      this.wallet.selectedAddress,
      batchInfo.propietario,
      calculatedAmount
    );
    
    // ✅ USAR LA FUNCIÓN CORRECTA - PROCESAR_BATCH
    const result = await this.sendTransaction(
      'procesar_batch', // Usar el string directamente
      [batchId.toString()]
    );
    
    const txHash = this.extractTransactionHash(result);
    
    console.log('✅ Lote aceptado y pagado exitosamente');
    return { txHash, payment };
    
  } catch (error: any) {
    console.error('❌ Error aceptando lote:', error);
    throw new Error(`Error aceptando lote: ${error.message}`);
  }
}

/**
 * Crear múltiples cortes para un lote
 */
async crearCortesParaBatch(
  batchId: bigint,
  tiposCorte: TipoCorte[],
  pesos: bigint[]
): Promise<{ corteIds: bigint[]; txHash: string }> {
  try {
    console.log(`🥩 Creando ${tiposCorte.length} cortes para lote #${batchId}`);
    
    if (tiposCorte.length !== pesos.length) {
      throw new Error('La cantidad de tipos de corte debe coincidir con la cantidad de pesos');
    }

    const tiposCorteStr = tiposCorte.map(tipo => tipo.toString());
    const pesosStr = pesos.map(peso => peso.toString());
    
    const result = await this.sendTransaction(
      'crear_cortes_para_batch', // String directamente
      [
        batchId.toString(),
        tiposCorteStr.length,
        ...tiposCorteStr,
        pesosStr.length,
        ...pesosStr
      ]
    );

    const txHash = this.extractTransactionHash(result);
    
    // Obtener IDs de cortes creados
    const corteIds = await this.getCortesForBatch(batchId);
    
    console.log('✅ Cortes para lote creados exitosamente:', corteIds.length);
    return { corteIds, txHash };
  } catch (error: any) {
    console.error('❌ Error creando cortes para lote:', error);
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


}