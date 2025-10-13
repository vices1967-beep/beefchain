// src/hooks/useChipyPay.ts - COMPLETO
import { useState } from 'react';
import { chipyPayService } from '@/services/chipypay-service';

export const useChipyPay = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processAnimalAcceptance = async (
    animalId: bigint,
    frigorificoAddress: string,
    productorAddress: string
  ) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      console.log(`🐄 Procesando aceptación de animal #${animalId} con Chipy Pay...`);
      
      const result = await chipyPayService.acceptAnimalWithPayment(
        animalId, 
        frigorificoAddress, 
        productorAddress
      );
      
      console.log(`✅ Pago procesado: ${result.txHash}`);
      return result;
      
    } catch (err: any) {
      console.error('❌ Error en processAnimalAcceptance:', err);
      setError(err.message || 'Error procesando pago');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const processBatchAcceptance = async (
    batchId: bigint,
    frigorificoAddress: string,
    productorAddress: string,
    animalCount: number
  ) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      console.log(`📦 Procesando aceptación de lote #${batchId} con Chipy Pay...`);
      
      const result = await chipyPayService.acceptBatchWithPayment(
        batchId,
        frigorificoAddress,
        productorAddress,
        animalCount
      );
      
      console.log(`✅ Pago de lote procesado: ${result.txHash}`);
      return result;
      
    } catch (err: any) {
      console.error('❌ Error en processBatchAcceptance:', err);
      setError(err.message || 'Error procesando pago del lote');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const getServiceStatus = () => {
    return chipyPayService.getServiceStatus();
  };

  return {
    processAnimalAcceptance,
    processBatchAcceptance,
    getServiceStatus,
    isProcessing,
    error,
    clearError: () => setError(null)
  };
};