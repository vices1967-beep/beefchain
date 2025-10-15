// src/services/animalContractTypes.ts - VERSIÓN COMPLETA
import { RazaAnimal, EstadoAnimal, TipoCorte } from '@/contracts/config';

// ============ TIPOS DEL CONTRATO (CORE) ============

export interface AnimalBasicInfo {
  id: bigint;
  raza: number;
  fechaNacimiento: bigint;
  peso: bigint;
  estado: number;
  propietario: string;
  frigorifico: string;
  certificador: string;
  exportador: string;
  lote_id: number;
}

export interface BatchInfo {
  id: bigint;
  propietario: string;
  frigorifico: string;
  fecha_creacion: bigint;
  fecha_transferencia: bigint;
  fecha_procesamiento: bigint;
  estado: number;
  cantidad_animales: number;
  peso_total: bigint;
  animal_ids: bigint[];
}

export interface SystemStats {
  total_animals_created: bigint;
  total_batches_created: bigint;
  total_cortes_created: bigint;
  processed_animals: bigint;
  next_token_id: bigint;
  next_batch_id: bigint;
  next_lote_id: bigint;
  next_corte_id: bigint;
}

export interface CorteInfo {
  id: bigint;
  animalId: bigint;
  tipoCorte: number;
  peso: bigint;
  fechaProcesamiento: bigint;
  frigorifico: string;
  certificado: boolean;
  loteExportacion: bigint;
  propietario: string;
}

export interface TransferPayment {
  amount: bigint;
  currency: string;
  recipient: string;
  txHash: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface AnimalVerificationResult {
  available: bigint[];
  unavailable: bigint[];
  reasons: string[];
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

// ============ TIPOS PARA FRIGORÍFICO (UI) ============

export interface StarknetAnimalData {
  id: string;
  raza: number;
  fechaNacimiento: number;
  peso: string;
  estado: number;
  propietario: string;
  frigorifico: string;
  certificador: string;
  exportador: string;
  lote_id: number;
  animalId: string;
}

export interface AnimalEnFrigorifico {
  id: bigint;
  raza?: number;
  peso?: bigint;
  estado?: number;
  propietario?: string;
  frigorifico?: string;
  fechaRecepcion?: bigint;
  metadataHash?: string;
  starknet_data?: StarknetAnimalData;
  peso_gramos?: number;
  peso_kg?: number;
  precio_total?: number;
  fuente_peso?: string;
}

export interface Corte {
  id: bigint;
  animalId: bigint;
  tipoCorte: TipoCorte;
  peso: bigint;
  fechaProcesamiento: bigint;
  certificado: boolean;
  qrHash?: string;
  propietario: string;
  frigorifico: string;
  // Campos adicionales para cálculos
  peso_kg?: number;
  precio_total?: number;
}

export interface LotePendiente {
  id: bigint;
  propietario: string;
  frigorifico: string;
  fecha_creacion: bigint;
  fecha_transferencia: bigint;
  fecha_procesamiento: bigint;
  estado: number;
  cantidad_animales: number;
  peso_total: bigint;
  animal_ids: bigint[];
  animales?: AnimalEnFrigorifico[];
  peso_total_real?: number;
  peso_total_kg?: number;
  precio_total?: number;
  tipo?: string;
  animales_con_peso_real?: number;
  total_animales_procesados?: number;
  cortes?: Corte[];
}

export interface TransferenciasPendientes {
  animals: AnimalEnFrigorifico[];
  batches: LotePendiente[];
}

// ============ TIPOS PARA COMPONENTES (PROPS) ============

export interface LotePendienteCardProps {
  lote: LotePendiente;
  precioPorKilo: number;
  isProcessing: boolean;
  chipyProcessing: boolean;
  onAceptar: () => Promise<void>;
  onProcesar: () => Promise<void>;
  cacheAvailable: boolean;
  blockchainAvailable: boolean;
  isFrigorifico: boolean; // ← AGREGAR ESTA LÍNEA
}

export interface AnimalPendienteCardProps {
  animal: AnimalEnFrigorifico;
  precioPorKilo: number;
  isProcessing: boolean;
  chipyProcessing: boolean;
  onAceptar: () => Promise<void>;
  cacheAvailable: boolean;
  blockchainAvailable: boolean;
  isFrigorifico: boolean; // ← AGREGAR ESTA LÍNEA
}

// ============ TIPOS PARA CERTIFICACIÓN ============

export interface CertificationData {
  certificationType: string;
  certifier: string;
  expiryDate: bigint;
  certificateHash: string;
}

export interface AnimalCertification {
  isCertified: boolean;
  certificationType: string;
  certifier: string;
  certificationDate: bigint;
  expirationDate: bigint;
}

// ============ TIPOS PARA EXPORTACIÓN ============

export interface ExportData {
  exportDate: bigint;
  destinationCountry: string;
  exportPermit: string;
  containerId: string;
  temperatureRange: {
    min: number;
    max: number;
  };
  exporter: string;
}

// ============ TIPOS PARA AUDITORÍA ============

export interface AuditTrail {
  events: string[];
  timestamps: bigint[];
  actors: string[];
}

// ============ TIPOS PARA IOT ============

export interface IoTReading {
  timestamp: bigint;
  temperature: number;
  humidity: number;
  latitude: number;
  longitude: number;
  deviceId: string;
  readingType: string;
}

// ============ TIPOS PARA SOSTENIBILIDAD ============

export interface SustainabilityReport {
  carbonFootprint: bigint;
  waterUsage: bigint;
  landUsage: bigint;
  efficiencyScore: number;
}

// ============ TIPOS PARA ESTADÍSTICAS ============

export interface ProducerStats {
  totalAnimals: bigint;
  totalBatches: bigint;
  totalWeight: bigint;
  efficiency: number;
}

export interface RoleStats {
  producers: number;
  frigorificos: number;
  veterinarians: number;
  iot: number;
  certifiers: number;
  exporters: number;
  auditors: number;
}

// ============ TIPOS PARA PARTICIPANTES ============

export interface ParticipantInfo {
  participantType: string;
  nombre: string;
  direccion: string;
  fechaRegistro: bigint;
  activo: boolean;
  metadata: string;
}

// ============ ENUMS Y CONSTANTES ============

export enum TransferStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum ProcessingStage {
  RECEIVED = 'received',
  INSPECTED = 'inspected',
  PROCESSED = 'processed',
  CERTIFIED = 'certified',
  EXPORTED = 'exported'
}