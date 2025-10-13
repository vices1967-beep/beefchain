// src/components/frigorifico/types/index.ts - VERSIÓN CORREGIDA
// Re-exportar TIPOS desde animalContractTypes usando 'export type'
export type {
  // Tipos del frigorífico
  StarknetAnimalData,
  AnimalEnFrigorifico,
  Corte,
  LotePendiente,
  TransferenciasPendientes,
  
  // Props de componentes
  LotePendienteCardProps,
  AnimalPendienteCardProps,
  
  // Enums y constantes
  TransferStatus,
  ProcessingStage
} from '@/services/animalContractTypes';

// ✅ AGREGAR cualquier tipo específico del componente que no esté en animalContractTypes
export interface FrigorificoDashboardState {
  isLoading: boolean;
  error: string | null;
  selectedTab: 'animals' | 'batches' | 'cortes';
  filterStatus: 'all' | 'pending' | 'processed';
}

export interface ProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  animalId?: bigint;
  batchId?: bigint;
  onSuccess: () => void;
}

// ✅ Re-exportar ENUMS como valores (no como tipos)
export { RazaAnimal, EstadoAnimal, TipoCorte } from '@/contracts/config';