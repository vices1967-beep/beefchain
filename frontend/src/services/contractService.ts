// src/services/contractService.ts - VERSIÓN COMPLETA CORREGIDA PARA ROLES CON NOMBRES
import { AccountInterface, Contract, ProviderInterface, RpcProvider } from 'starknet';
import { CONTRACT_ADDRESS } from '@/contracts/config';
import { ANIMAL_NFT_ABI } from '@/contracts/animal-nft-abi';

export interface ContractServiceConfig {
  provider?: ProviderInterface; // ✅ Hacer provider opcional
  address?: string;
}

export class ContractService {
  private contract: Contract;
  private provider: ProviderInterface;
  private account: AccountInterface | null = null;

  constructor(config: ContractServiceConfig) {
    // ✅ PROVIDER MEJORADO - Con fallback y debugging
    console.log('🔄 ContractService inicializando...', {
      hasProvider: !!config.provider,
      providerType: config.provider?.constructor?.name,
      address: config.address || CONTRACT_ADDRESS
    });

    // ✅ USAR PROVIDER DE WALLET O CREAR UNO POR DEFECTO
    this.provider = config.provider || this.createDefaultProvider();
    
    const contractAddress = config.address || CONTRACT_ADDRESS;
    
    console.log('✅ Provider configurado:', {
      providerType: this.provider.constructor.name,
      contractAddress
    });

    // ✅ INICIALIZAR CONTRATO CON ABI COMPLETO
    this.contract = new Contract(ANIMAL_NFT_ABI, contractAddress, this.provider);
    
    console.log('✅ ContractService inicializado correctamente');
  }

  // ✅ CREAR PROVIDER POR DEFECTO PARA SEPOLIA
  private createDefaultProvider(): RpcProvider {
    return new RpcProvider({
      nodeUrl: 'https://starknet-sepolia.public.blastapi.io'
    });
  }

  // Conectar la cuenta para escribir
  connect(account: AccountInterface): void {
    this.account = account;
    this.contract.connect(account);
    console.log('✅ Cuenta conectada al contrato:', account.address);
  }

  // Verificar si está conectado
  isConnected(): boolean {
    return !!this.account;
  }

  // ============ MÉTODOS DE ESCRITURA ============

  async createAnimalSimple(raza: number): Promise<any> {
    try {
      console.log(`🐄 createAnimalSimple: raza ${raza}`);
      const result = await this.contract.create_animal_simple(raza);
      console.log('✅ createAnimalSimple exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en createAnimalSimple:', error.message);
      throw error;
    }
  }

  async createAnimal(
    metadataHash: string, 
    raza: number, 
    fechaNacimiento: number, 
    peso: bigint
  ): Promise<any> {
    try {
      console.log(`🐄 createAnimal: raza ${raza}, peso ${peso}`);
      const result = await this.contract.create_animal(metadataHash, raza, fechaNacimiento, peso);
      console.log('✅ createAnimal exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en createAnimal:', error.message);
      throw error;
    }
  }

  async updateAnimalWeight(animalId: bigint, newWeight: bigint): Promise<any> {
    try {
      console.log(`⚖️ updateAnimalWeight: animal ${animalId}, peso ${newWeight}`);
      const result = await this.contract.update_animal_weight(animalId.toString(), newWeight.toString());
      console.log('✅ updateAnimalWeight exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en updateAnimalWeight:', error.message);
      throw error;
    }
  }

  async createAnimalBatch(animalIds: bigint[]): Promise<any> {
    try {
      console.log(`📦 createAnimalBatch: ${animalIds.length} animales`);
      const animalIdsStr = animalIds.map(id => id.toString());
      const result = await this.contract.create_animal_batch(animalIdsStr);
      console.log('✅ createAnimalBatch exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en createAnimalBatch:', error.message);
      throw error;
    }
  }

  async addAnimalsToBatch(batchId: bigint, animalIds: bigint[]): Promise<any> {
    try {
      console.log(`➕ addAnimalsToBatch: lote ${batchId}, ${animalIds.length} animales`);
      const animalIdsStr = animalIds.map(id => id.toString());
      const result = await this.contract.add_animals_to_batch(batchId.toString(), animalIdsStr);
      console.log('✅ addAnimalsToBatch exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en addAnimalsToBatch:', error.message);
      throw error;
    }
  }

  async transferBatchToFrigorifico(batchId: bigint, frigorifico: string): Promise<any> {
    try {
      console.log(`🏭 transferBatchToFrigorifico: lote ${batchId} a ${frigorifico}`);
      const result = await this.contract.transfer_batch_to_frigorifico(batchId.toString(), frigorifico);
      console.log('✅ transferBatchToFrigorifico exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en transferBatchToFrigorifico:', error.message);
      throw error;
    }
  }

  async procesarAnimal(animalId: bigint): Promise<any> {
    try {
      console.log(`🔪 procesarAnimal: animal ${animalId}`);
      const result = await this.contract.procesar_animal(animalId.toString());
      console.log('✅ procesarAnimal exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en procesarAnimal:', error.message);
      throw error;
    }
  }

  async procesarBatch(batchId: bigint): Promise<any> {
    try {
      console.log(`🔪 procesarBatch: lote ${batchId}`);
      const result = await this.contract.procesar_batch(batchId.toString());
      console.log('✅ procesarBatch exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en procesarBatch:', error.message);
      throw error;
    }
  }

  async crearCorte(animalId: bigint, tipoCorte: number, peso: bigint): Promise<any> {
    try {
      console.log(`🥩 crearCorte: animal ${animalId}, tipo ${tipoCorte}, peso ${peso}`);
      const result = await this.contract.crear_corte(animalId.toString(), tipoCorte.toString(), peso.toString());
      console.log('✅ crearCorte exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en crearCorte:', error.message);
      throw error;
    }
  }

  async crearCortesParaBatch(
    batchId: bigint, 
    tiposCorte: number[], 
    pesos: bigint[]
  ): Promise<any> {
    try {
      console.log(`🥩 crearCortesParaBatch: lote ${batchId}, ${tiposCorte.length} cortes`);
      const tiposCorteStr = tiposCorte.map(tipo => tipo.toString());
      const pesosStr = pesos.map(peso => peso.toString());
      const result = await this.contract.crear_cortes_para_batch(batchId.toString(), tiposCorteStr, pesosStr);
      console.log('✅ crearCortesParaBatch exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en crearCortesParaBatch:', error.message);
      throw error;
    }
  }

  async grantRole(role: string, account: string): Promise<any> {
    try {
      console.log(`🔄 grantRole: rol ${role} a ${account}`);
      const result = await this.contract.grant_role(role, account);
      console.log('✅ grantRole exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en grantRole:', error.message);
      throw error;
    }
  }

  async revokeRole(role: string, account: string): Promise<any> {
    try {
      console.log(`🔄 revokeRole: rol ${role} de ${account}`);
      const result = await this.contract.revoke_role(role, account);
      console.log('✅ revokeRole exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en revokeRole:', error.message);
      throw error;
    }
  }

  // ============ MÉTODOS DE LECTURA ============

  async getAnimalData(animalId: bigint): Promise<any> {
    try {
      console.log(`📖 getAnimalData: animal ${animalId}`);
      const result = await this.contract.get_animal_data(animalId.toString());
      console.log('✅ getAnimalData exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en getAnimalData:', error.message);
      throw error;
    }
  }

  async getInfoAnimal(animalId: bigint): Promise<any> {
    try {
      console.log(`📖 getInfoAnimal: animal ${animalId}`);
      const result = await this.contract.get_info_animal(animalId.toString());
      console.log('✅ getInfoAnimal exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en getInfoAnimal:', error.message);
      throw error;
    }
  }

  async getBatchInfo(batchId: bigint): Promise<any> {
    try {
      console.log(`📦 getBatchInfo: lote ${batchId}`);
      const result = await this.contract.get_batch_info(batchId.toString());
      console.log('✅ getBatchInfo exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en getBatchInfo:', error.message);
      throw error;
    }
  }

  async getAnimalsByProducer(producer: string): Promise<any> {
    try {
      console.log(`🐄 getAnimalsByProducer: ${producer}`);
      const result = await this.contract.get_animals_by_producer(producer);
      console.log('✅ getAnimalsByProducer exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en getAnimalsByProducer:', error.message);
      throw error;
    }
  }

  async getBatchesByProducer(producer: string): Promise<any> {
    try {
      console.log(`📦 getBatchesByProducer: ${producer}`);
      const result = await this.contract.get_batches_by_producer(producer);
      console.log('✅ getBatchesByProducer exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en getBatchesByProducer:', error.message);
      throw error;
    }
  }

  async getAnimalsInBatch(batchId: bigint): Promise<any> {
    try {
      console.log(`🐄 getAnimalsInBatch: lote ${batchId}`);
      const result = await this.contract.get_animals_in_batch(batchId.toString());
      console.log('✅ getAnimalsInBatch exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en getAnimalsInBatch:', error.message);
      throw error;
    }
  }

  async getBatchForAnimal(animalId: bigint): Promise<any> {
    try {
      console.log(`📦 getBatchForAnimal: animal ${animalId}`);
      const result = await this.contract.get_batch_for_animal(animalId.toString());
      console.log('✅ getBatchForAnimal exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en getBatchForAnimal:', error.message);
      throw error;
    }
  }

  async getInfoCorte(animalId: bigint, corteId: bigint): Promise<any> {
    try {
      console.log(`🥩 getInfoCorte: animal ${animalId}, corte ${corteId}`);
      const result = await this.contract.get_info_corte(animalId.toString(), corteId.toString());
      console.log('✅ getInfoCorte exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en getInfoCorte:', error.message);
      throw error;
    }
  }

  async getSystemStats(): Promise<any> {
    try {
      console.log('📊 getSystemStats');
      const result = await this.contract.get_system_stats();
      console.log('✅ getSystemStats exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en getSystemStats:', error.message);
      throw error;
    }
  }

  // ✅ MÉTODO hasRole CORREGIDO PARA MANEJAR ROLES CON NOMBRES
  async hasRole(role: string, account: string): Promise<boolean> {
    try {
      console.log('🎯 hasRole llamado con:', { role, account });
      
      // ✅ PARA ROLES CON NOMBRES: Usar directamente como string
      // El contrato espera felt252, que puede ser string como 'PRODUCER_ROLE'
      let roleFelt: string;
      
      if (role.startsWith('0x')) {
        // Si ya es hexadecimal, usar directamente
        roleFelt = role;
        console.log('🔍 Role es hexadecimal, usando directamente');
      } else if (/^\d+$/.test(role)) {
        // Si es número, convertirlo a felt252
        const roleNum = BigInt(role);
        roleFelt = `0x${roleNum.toString(16).padStart(64, '0')}`;
        console.log('🔍 Role es numérico, convertido a felt252:', roleFelt);
      } else {
        // ✅ SI ES STRING COMO 'PRODUCER_ROLE', USAR DIRECTAMENTE
        // StarkNet convierte automáticamente strings a felt252
        roleFelt = role;
        console.log('🔍 Role es string, usando directamente como felt252');
      }
      
      console.log('🔍 Role final enviado al contrato:', roleFelt);
      
      // Llamar al contrato
      console.log('📞 Llamando a contrato has_role...');
      const result = await this.contract.has_role(roleFelt, account);
      console.log('📋 Resultado crudo del contrato:', result);
      
      // Parsear resultado
      let finalResult: boolean;
      if (typeof result === 'boolean') {
        finalResult = result;
      } else if (Array.isArray(result)) {
        const value = result[0];
        finalResult = value === true || value === '0x1' || value === 1 || value === '1';
      } else {
        finalResult = Boolean(result);
      }
      
      console.log(`✅ hasRole resultado final: ${finalResult} para rol "${role}"`);
      return finalResult;
      
    } catch (error: any) {
      console.error('❌ ERROR en hasRole:', {
        role,
        account,
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  // ✅ MÉTODO get_participant_info MEJORADO
  async get_participant_info(address: string): Promise<any> {
    try {
      console.log('🔍 get_participant_info llamado para:', address);
      
      const result = await this.contract.get_participant_info(address);
      console.log('📋 Resultado get_participant_info:', result);
      
      return result;
    } catch (error: any) {
      console.error('❌ ERROR en get_participant_info:', {
        address,
        error: error.message
      });
      throw error;
    }
  }

  async getRoleMemberCount(role: string): Promise<number> {
    try {
      console.log(`👥 getRoleMemberCount: rol ${role}`);
      const result = await this.contract.get_role_member_count(role);
      const count = Number(result[0] || '0');
      console.log(`✅ getRoleMemberCount: ${count} miembros`);
      return count;
    } catch (error: any) {
      console.error('❌ Error en getRoleMemberCount:', error.message);
      return 0;
    }
  }

  async getRoleMemberAtIndex(role: string, index: number): Promise<string> {
    try {
      console.log(`👥 getRoleMemberAtIndex: rol ${role}, índice ${index}`);
      const result = await this.contract.get_role_member_at_index(role, index.toString());
      const member = result[0];
      console.log('✅ getRoleMemberAtIndex exitoso');
      return member;
    } catch (error: any) {
      console.error('❌ Error en getRoleMemberAtIndex:', error.message);
      throw error;
    }
  }

  async getAllRoleMembers(role: string): Promise<string[]> {
    try {
      console.log(`👥 getAllRoleMembers: rol ${role}`);
      const result = await this.contract.get_all_role_members(role);
      console.log('✅ getAllRoleMembers exitoso');
      return result;
    } catch (error: any) {
      console.error('❌ Error en getAllRoleMembers:', error.message);
      return [];
    }
  }

  // ============ UTILIDADES ============

  getContractAddress(): string {
    return this.contract.address;
  }

  getProvider(): ProviderInterface {
    return this.provider;
  }

  // Método genérico para llamar cualquier función del ABI
  async call(entrypoint: string, calldata: any[] = []): Promise<any> {
    try {
      console.log(`📞 call: ${entrypoint}`, calldata);
      const result = await this.contract.call(entrypoint, calldata);
      console.log(`✅ call ${entrypoint} exitoso`);
      return result;
    } catch (error: any) {
      console.error(`❌ Error en call ${entrypoint}:`, error.message);
      throw error;
    }
  }

  // Método genérico para invocar cualquier función (transacción)
  async invoke(entrypoint: string, calldata: any[] = []): Promise<any> {
    try {
      console.log(`✍️ invoke: ${entrypoint}`, calldata);
      const result = await this.contract.invoke(entrypoint, calldata);
      console.log(`✅ invoke ${entrypoint} exitoso`);
      return result;
    } catch (error: any) {
      console.error(`❌ Error en invoke ${entrypoint}:`, error.message);
      throw error;
    }
  }

  // ✅ MÉTODO DE DEBUG PARA VERIFICAR CONEXIÓN
  async debugConnection(): Promise<void> {
    try {
      console.log('🐛 DEBUG CONEXIÓN CONTRATO:');
      console.log('📍 Dirección contrato:', this.contract.address);
      console.log('🔗 Provider:', this.provider.constructor.name);
      console.log('👤 Cuenta conectada:', this.account?.address || 'Ninguna');
      
      // Probar una llamada simple
      try {
        const stats = await this.getSystemStats();
        console.log('📊 Stats obtenidas:', stats);
        console.log('✅ Conexión verificada correctamente');
      } catch (error) {
        console.log('❌ Error obteniendo stats:', error);
      }
      
    } catch (error: any) {
      console.error('❌ ERROR en debugConnection:', error.message);
    }
  }
}