// src/contracts/chipypay-config.ts - CONFIGURACIÓN COMPLETA Y CORREGIDA

// Configuración de ChiPy Pay para transferencias con wallet de comisiones dedicada

// WALLET DEDICADA PARA COMISIONES DEL SISTEMA (STARKNET)
export const CHIPYPAY_CONFIG = {
  // Dirección de la wallet del sistema para comisiones (2%) - STARKNET
  SYSTEM_WALLET: process.env.NEXT_PUBLIC_SYSTEM_WALLET as `0x${string}` || 
                  "0x07147c9b8631C63b6c4B4aD7a2e6c6D5E2E3b1a2b3c4d5e6f7a8b9c0d1e2f3",
  
  // Wallet de respaldo para emergencias
  BACKUP_WALLET: process.env.NEXT_PUBLIC_BACKUP_WALLET as `0x${string}` ||
                 "0x089aBcDeF1234567890aBcDeF1234567890aBcDe",
  
  // Comisión del sistema (2%)
  SYSTEM_FEE_PERCENTAGE: 0.02, // 2% como decimal para cálculos
  
  // Precios base en wei (StarkNet)
  BASE_PRICES: {
    TRANSFER_ANIMAL: BigInt(1000000000000000),    // 0.001 ETH
    AUTHORIZE_VET: BigInt(500000000000000),       // 0.0005 ETH
    BATCH_TRANSFER: BigInt(2000000000000000),     // 0.002 ETH
    CERTIFICATION: BigInt(750000000000000),       // 0.00075 ETH
    ANIMAL_ACCEPTANCE: BigInt(1500000000000000),  // 0.0015 ETH
    BATCH_ACCEPTANCE: BigInt(7000000000000000)    // 0.007 ETH
  } as const,
  
  // Estados de pago
  PAYMENT_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  } as const
} as const;

// Interfaces para pagos
export interface PaymentData {
  amount: bigint;
  systemFee: bigint;
  recipientAmount: bigint;
  systemWallet: string;
  paymentStatus: string;
  txHash?: string;
}

// Interfaz principal para transferencias de pago
export interface TransferPayment {
  // Identificación
  id?: string;
  itemId: bigint;           // ID principal del item (animal, lote, etc.)
  animalId?: bigint;        // ID específico del animal (opcional)
  batchId?: bigint;         // ID del lote (opcional)
  
  // Partes involucradas
  from: string;
  to: string;
  systemWallet?: string;    // Wallet del sistema para fees
  
  // Montos
  amount: bigint;           // Monto total
  systemFee?: bigint;       // Fee del sistema
  recipientAmount?: bigint; // Monto que recibe el destinatario
  
  // Metadatos
  timestamp: bigint;
  status: 'pending' | 'completed' | 'failed';
  type: 'transfer' | 'acceptance' | 'certification' | 'authorization';
  txHash?: string;
  metadata?: any;
  description?: string;
  paymentStatus?: string;   // Compatibilidad con código existente
}

// Configuración de seguridad para wallets
export const WALLET_SECURITY = {
  MIN_SAFE_BALANCE: BigInt(100000000000000),      // 0.0001 ETH
  AUTO_TRANSFER_THRESHOLD: BigInt(1000000000000000), // 0.001 ETH
  SUSPICIOUS_AMOUNT: BigInt(10000000000000000),   // 0.01 ETH
  MAX_DAILY_TRANSACTIONS: 100,
  ALERT_THRESHOLD: BigInt(500000000000000)        // 0.0005 ETH para alertas
} as const;

// Helper functions para cálculos de pagos
export const PaymentUtils = {
  /**
   * Calcular comisión del sistema y montos para transferencia
   */
  calculatePayment(amount: bigint): PaymentData {
    const systemFee = amount * BigInt(Math.floor(CHIPYPAY_CONFIG.SYSTEM_FEE_PERCENTAGE * 100)) / BigInt(100);
    const recipientAmount = amount - systemFee;

    return {
      amount,
      systemFee,
      recipientAmount,
      systemWallet: CHIPYPAY_CONFIG.SYSTEM_WALLET,
      paymentStatus: CHIPYPAY_CONFIG.PAYMENT_STATUS.PENDING
    };
  },

  /**
   * Crear objeto de pago estándar
   */
  createPayment(
    itemId: bigint,
    from: string,
    to: string,
    amount: bigint,
    type: 'transfer' | 'acceptance' | 'certification' | 'authorization'
  ): TransferPayment {
    const paymentData = this.calculatePayment(amount);
    
    return {
      id: `${type}_${itemId.toString()}_${Date.now()}`,
      itemId,
      from,
      to,
      amount,
      systemFee: paymentData.systemFee,
      recipientAmount: paymentData.recipientAmount,
      systemWallet: paymentData.systemWallet,
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      status: 'completed',
      type,
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      description: `${type} para item #${itemId}`,
      paymentStatus: CHIPYPAY_CONFIG.PAYMENT_STATUS.COMPLETED
    };
  },

  /**
   * Validar si un pago es seguro
   */
  isPaymentSafe(payment: TransferPayment): boolean {
    if (payment.amount > WALLET_SECURITY.SUSPICIOUS_AMOUNT) {
      console.warn('⚠️ Monto sospechoso detectado:', payment.amount.toString());
      return false;
    }
    
    if (!payment.from.startsWith('0x') || !payment.to.startsWith('0x')) {
      console.warn('⚠️ Direcciones inválidas en pago');
      return false;
    }
    
    return true;
  },

  /**
   * Obtener precio base por tipo de operación
   */
  getBasePrice(operation: keyof typeof CHIPYPAY_CONFIG.BASE_PRICES): bigint {
    return CHIPYPAY_CONFIG.BASE_PRICES[operation];
  }
} as const;

// Exportar por defecto para imports más limpios - VERSIÓN CORREGIDA
export default {
  CHIPYPAY_CONFIG,
  WALLET_SECURITY,
  PaymentUtils
  // ❌ NO incluir tipos/interfaces aquí - solo valores en tiempo de ejecución
};