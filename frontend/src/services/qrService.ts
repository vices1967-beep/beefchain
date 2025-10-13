// src/services/qrService.ts - VERSIÓN CORREGIDA
import { ContractService } from './contractService';

export interface QRData {
  qr_hash: string;
  animal_id: bigint;
  corte_id: bigint;
  timestamp: bigint;
  data_type: string;
  metadata: string;
}

export interface PublicConsumerData {
  raza: bigint;
  fecha_nacimiento: bigint;
  fecha_procesamiento: bigint;
  frigorifico_nombre: string;
  certificador_nombre: string;
  tipo_corte: bigint;
  peso_corte: bigint;
  certificaciones: string;
  pais_origen: string;
}

export class QRService {
  private contractService: ContractService;

  constructor(contractService: ContractService) {
    this.contractService = contractService;
  }

  /**
   * Generar código QR para un animal
   */
  async generateQRForAnimal(animalId: bigint): Promise<{ qrHash: string; txHash: string }> {
    try {
      console.log(`🏷️ Generando QR para animal #${animalId}`);
      
      const result = await this.contractService.invoke('generate_qr_for_animal', [animalId.toString()]);
      const txHash = this.extractTransactionHash(result);
      
      const qrHash = await this.extractQRHashFromTransaction(txHash, 'animal', animalId);
      
      console.log(`✅ QR generado para animal #${animalId}: ${qrHash}`);
      return { qrHash, txHash };
      
    } catch (error: any) {
      console.error('❌ Error generando QR para animal:', error);
      throw new Error(`Error generando QR: ${error.message}`);
    }
  }

  /**
   * Generar código QR para un lote
   */
  async generateQRForBatch(batchId: bigint): Promise<{ qrHash: string; txHash: string }> {
    try {
      console.log(`🏷️ Generando QR para lote #${batchId}`);
      
      const result = await this.contractService.invoke('generate_qr_for_batch', [batchId.toString()]);
      const txHash = this.extractTransactionHash(result);
      
      const qrHash = await this.extractQRHashFromTransaction(txHash, 'batch', batchId);
      
      console.log(`✅ QR generado para lote #${batchId}: ${qrHash}`);
      return { qrHash, txHash };
      
    } catch (error: any) {
      console.error('❌ Error generando QR para lote:', error);
      throw new Error(`Error generando QR: ${error.message}`);
    }
  }

  /**
   * Generar código QR para un corte
   */
  async generateQRForCorte(animalId: bigint, corteId: bigint): Promise<{ qrHash: string; txHash: string }> {
    try {
      console.log(`🏷️ Generando QR para corte #${corteId} del animal #${animalId}`);
      
      const result = await this.contractService.invoke('generate_qr_for_corte', [
        animalId.toString(),
        corteId.toString()
      ]);
      
      const txHash = this.extractTransactionHash(result);
      const qrHash = await this.extractQRHashFromTransaction(txHash, 'corte', corteId);
      
      console.log(`✅ QR generado para corte #${corteId}: ${qrHash}`);
      return { qrHash, txHash };
      
    } catch (error: any) {
      console.error('❌ Error generando QR para corte:', error);
      throw new Error(`Error generando QR: ${error.message}`);
    }
  }

  /**
   * Obtener datos públicos para consumidores desde un QR
   */
  async getPublicConsumerData(qrHash: string): Promise<PublicConsumerData> {
    try {
      console.log(`📋 Obteniendo datos públicos del QR: ${qrHash}`);
      
      const result = await this.contractService.call('get_public_consumer_data', [qrHash]);
      
      if (result && result.length >= 9) {
        const consumerData: PublicConsumerData = {
          raza: BigInt(result[0]),
          fecha_nacimiento: BigInt(result[1]),
          fecha_procesamiento: BigInt(result[2]),
          frigorifico_nombre: result[3],
          certificador_nombre: result[4],
          tipo_corte: BigInt(result[5]),
          peso_corte: BigInt(result[6]),
          certificaciones: result[7],
          pais_origen: result[8]
        };
        
        console.log(`✅ Datos públicos obtenidos del QR ${qrHash}`);
        return consumerData;
      }
      
      throw new Error('Formato de respuesta inválido para datos públicos');
      
    } catch (error: any) {
      console.error('❌ Error obteniendo datos públicos del QR:', error);
      throw new Error(`Error obteniendo datos públicos: ${error.message}`);
    }
  }

  /**
   * Verificar autenticidad de un código QR
   */
  async verifyQRAuthenticity(qrHash: string): Promise<boolean> {
    try {
      console.log(`🔍 Verificando autenticidad del QR: ${qrHash}`);
      
      const result = await this.contractService.call('verify_qr_authenticity', [qrHash]);
      
      // ✅ CORRECCIÓN: Conversión segura a boolean
      const isValid = this.safeToBoolean(result[0]);
      
      console.log(`✅ QR ${qrHash} - Autenticidad: ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
      return isValid;
      
    } catch (error: any) {
      console.error('❌ Error verificando autenticidad del QR:', error);
      return false;
    }
  }

  /**
   * Obtener datos completos de un código QR
   */
  async getQRData(qrHash: string): Promise<QRData> {
    try {
      console.log(`📊 Obteniendo datos completos del QR: ${qrHash}`);
      
      const result = await this.contractService.call('get_qr_data', [qrHash]);
      
      if (result && result.length >= 6) {
        const qrData: QRData = {
          qr_hash: qrHash,
          animal_id: BigInt(result[0]),
          corte_id: BigInt(result[1]),
          timestamp: BigInt(result[2]),
          data_type: result[3],
          metadata: result[4]
        };
        
        console.log(`✅ Datos completos obtenidos del QR ${qrHash}`);
        return qrData;
      }
      
      throw new Error('Formato de respuesta inválido para datos QR');
      
    } catch (error: any) {
      console.error('❌ Error obteniendo datos del QR:', error);
      throw new Error(`Error obteniendo datos QR: ${error.message}`);
    }
  }

  /**
   * Generar múltiples QR para un lote de cortes
   */
  async generateQRForBatchCortes(batchId: bigint, corteIds: bigint[]): Promise<{ qrHashes: string[]; txHash: string }> {
    try {
      console.log(`🏷️ Generando ${corteIds.length} QR para cortes del lote #${batchId}`);
      
      const qrHashes: string[] = [];
      let lastTxHash = '';
      
      for (const corteId of corteIds) {
        try {
          // Buscar el animalId asociado al corte
          const animalId = await this.findAnimalIdForCorte(corteId);
          if (animalId) {
            const { qrHash, txHash } = await this.generateQRForCorte(animalId, corteId);
            qrHashes.push(qrHash);
            lastTxHash = txHash;
          }
        } catch (error) {
          console.log(`❌ Error generando QR para corte #${corteId}:`, error);
        }
      }
      
      console.log(`✅ ${qrHashes.length} QR generados para lote #${batchId}`);
      return { 
        qrHashes, 
        txHash: lastTxHash || 'batch_qr_generation'
      };
      
    } catch (error: any) {
      console.error('❌ Error generando QR para lote de cortes:', error);
      throw new Error(`Error generando QR en lote: ${error.message}`);
    }
  }

  /**
   * Validar y escanear código QR (para apps móviles)
   */
  async scanAndValidateQR(qrHash: string): Promise<{
    isValid: boolean;
    consumerData?: PublicConsumerData;
    qrData?: QRData;
    message: string;
  }> {
    try {
      console.log(`📱 Escaneando y validando QR: ${qrHash}`);
      
      // 1. Verificar autenticidad
      const isValid = await this.verifyQRAuthenticity(qrHash);
      
      if (!isValid) {
        return { 
          isValid: false, 
          message: 'Código QR inválido o adulterado' 
        };
      }
      
      // 2. Obtener datos públicos
      const consumerData = await this.getPublicConsumerData(qrHash);
      
      // 3. Obtener datos completos del QR
      const qrData = await this.getQRData(qrHash);
      
      return {
        isValid: true,
        consumerData,
        qrData,
        message: 'Código QR válido - Producto auténtico'
      };
      
    } catch (error: any) {
      console.error('❌ Error escaneando QR:', error);
      return {
        isValid: false,
        message: `Error escaneando QR: ${error.message}`
      };
    }
  }

  // ============ MÉTODOS AUXILIARES PRIVADOS ============

  private extractTransactionHash(result: any): string {
    const txHash = result.transaction_hash || result.tx_hash || result.hash || result.transactionHash;
    
    if (!txHash) {
      console.error('❌ No se pudo extraer hash de transacción de:', result);
      throw new Error('No se pudo obtener el hash de transacción');
    }
    
    return txHash;
  }

  /**
   * ✅ NUEVO MÉTODO: Conversión segura a boolean
   * Maneja '0x1', '1', '0x0', '0', true, false, etc.
   */
  private safeToBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value === '0x1' || value === '1' || value === 'true';
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    return false;
  }

  /**
   * Extraer hash del QR desde los eventos de transacción
   */
  private async extractQRHashFromTransaction(
    txHash: string, 
    type: 'animal' | 'batch' | 'corte', 
    id: bigint
  ): Promise<string> {
    // En una implementación real, buscaríamos en los eventos de la transacción
    // Por ahora, generamos un hash simulado
    const timestamp = Date.now();
    const simulatedHash = `0x${type}_${id}_${timestamp}_${Math.random().toString(16).substr(2, 8)}`;
    
    console.log(`🔍 Hash QR simulado para ${type} #${id}: ${simulatedHash}`);
    return simulatedHash;
  }

  /**
   * Buscar animalId asociado a un corte
   */
  private async findAnimalIdForCorte(corteId: bigint): Promise<bigint | null> {
    try {
      // En una implementación real, buscaríamos en el contrato o base de datos
      // Por ahora, simulamos la búsqueda
      console.log(`🔍 Buscando animalId para corte #${corteId}`);
      
      // Simulamos que encontramos un animalId
      return BigInt(1); // Valor simulado
      
    } catch (error) {
      console.error(`Error buscando animalId para corte #${corteId}:`, error);
      return null;
    }
  }

  // ============ MÉTODOS DE UTILIDAD ============

  /**
   * Obtener URL para escanear QR (para frontend)
   */
  getQRScanURL(qrHash: string): string {
    return `/qr/scan?hash=${qrHash}`;
  }

  /**
   * Obtener URL de imagen QR (para generación en frontend)
   */
  getQRImageURL(qrHash: string, size: number = 200): string {
    // En implementación real, generaríamos o obtendríamos la imagen QR
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrHash)}`;
  }

  /**
   * Validar formato de hash QR
   */
  isValidQRHash(qrHash: string): boolean {
    return qrHash && qrHash.startsWith('0x') && qrHash.length > 10;
  }

  /**
   * Generar QR data URL para uso inmediato en frontend
   */
  generateQRDataURL(qrHash: string, size: number = 200): string {
    const qrImageURL = this.getQRImageURL(qrHash, size);
    return qrImageURL; // En implementación real, podríamos generar data URL
  }
}

// ============ FUNCIÓN DE FÁBRICA PARA FACILITAR USO ============

/**
 * Crear instancia de QRService desde AnimalContractService
 */
export function createQRService(animalContractService: any): QRService {
  const contractService = animalContractService.getContractService();
  return new QRService(contractService);
}

/**
 * Crear instancia de QRService directamente desde ContractService
 */
export function createQRServiceFromContract(contractService: ContractService): QRService {
  return new QRService(contractService);
}