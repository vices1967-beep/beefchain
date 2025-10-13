// src/contracts/config.ts - VERSIÓN CORREGIDA SIN DUPLICADOS
// Dirección del contrato desplegado en StarkNet Sepolia
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

// Class Hash del contrato
export const CONTRACT_CLASS_HASH = process.env.NEXT_PUBLIC_CONTRACT_CLASS_HASH as `0x${string}`;

// Wallets pre-configuradas
export const PRODUCTOR_WALLET = process.env.NEXT_PUBLIC_PRODUCTOR_WALLET as `0x${string}`;
export const FRIGORIFICO_WALLET = process.env.NEXT_PUBLIC_FRIGORIFICO_WALLET as `0x${string}`;
export const DEPLOYER_WALLET = process.env.NEXT_PUBLIC_DEPLOYER_WALLET as `0x${string}`;

// Network configuration
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL as string;
export const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL as string;
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK as string;

// Importar el ABI desde el archivo JSON
import AnimalNFTABI from './AnimalNFT.abi.json';

// Extraer solo la parte ABI del archivo completo
export const CONTRACT_ABI = AnimalNFTABI;

// Tipos TypeScript para nuestros datos
export interface AnimalData {
  raza: bigint;
  fecha_nacimiento: bigint;
  peso: bigint;
  estado: number;
  propietario: string;
  frigorifico: string;
  certificador: string;
  exportador: string;
  lote_id: bigint;
}

export interface CorteData {
  tipo_corte: bigint;
  peso: bigint;
  fecha_procesamiento: bigint;
  frigorifico: string;
  certificado: boolean;
  lote_exportacion: bigint;
  propietario: string;
  animal_id: bigint;
}

export interface SystemStats {
  total_animals_created: bigint;
  total_batches_created: bigint;
  total_cortes_created: bigint;
  processed_animals: bigint;
  next_token_id: bigint;
  next_batch_id: bigint;
  next_lote_id: bigint;
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

// Enums para estados y razas
export enum EstadoAnimal {
  CREADO = 0,
  PROCESADO = 1,
  CERTIFICADO = 2,
  EXPORTADO = 3
}

export enum RazaAnimal {
  ANGUS = 1,
  HEREFORD = 2,
  BRANGUS = 3
}

// Tipos de corte
export enum TipoCorte {
  LOMO = 1,
  BIFE_ANCHO = 2,
  BIFE_ANGOSTO = 3,
  CUADRADA = 4,
  NALGA = 5,
  COSTILLAR = 6
}

// Roles del sistema - USANDO LOS VALORES EXACTOS DE TU CONTRATO
export const ROLES = {
  DEFAULT_ADMIN_ROLE: '0', // En StarkNet, DEFAULT_ADMIN_ROLE es 0 como felt252
  PRODUCER_ROLE: 'PRODUCER_ROLE',
  FRIGORIFICO_ROLE: 'FRIGORIFICO_ROLE',
  VET_ROLE: 'VET_ROLE',
  IOT_ROLE: 'IOT_ROLE',
  CERTIFIER_ROLE: 'CERTIFIER_ROLE',
  EXPORTER_ROLE: 'EXPORTER_ROLE',
  AUDITOR_ROLE: 'AUDITOR_ROLE'
} as const;

// Mapeo de roles a nombres legibles
export const ROLE_DISPLAY_NAMES: { [key: string]: string } = {
  '0': 'Administrador',
  'PRODUCER_ROLE': 'Productor',
  'FRIGORIFICO_ROLE': 'Frigorífico',
  'VET_ROLE': 'Veterinario',
  'IOT_ROLE': 'Operador IoT',
  'CERTIFIER_ROLE': 'Certificador',
  'EXPORTER_ROLE': 'Exportador',
  'AUDITOR_ROLE': 'Auditor'
};

// Funciones del contrato - VERSIÓN CORREGIDA SIN DUPLICADOS
export const CONTRACT_FUNCTIONS = {
  // Funciones básicas de creación
  CREATE_ANIMAL_SIMPLE: 'create_animal_simple',
  CREATE_ANIMAL: 'create_animal',
  UPDATE_ANIMAL_WEIGHT: 'update_animal_weight',
  
  // Funciones de procesamiento
  PROCESAR_ANIMAL: 'procesar_animal',
  PROCESAR_BATCH: 'procesar_batch',
  CREAR_CORTE: 'crear_corte',
  CREAR_CORTES_PARA_BATCH: 'crear_cortes_para_batch',
  
  // Funciones de consulta básicas
  GET_INFO_ANIMAL: 'get_info_animal',
  GET_INFO_CORTE: 'get_info_corte',
  GET_ANIMAL_DATA: 'get_animal_data',
  OWNER_OF: 'owner_of',
  TOKEN_URI: 'token_uri',
  
  // Funciones de registro e identificación
  REGISTER_PARTICIPANT: 'register_participant',
  UPDATE_PARTICIPANT_INFO: 'update_participant_info',
  GET_PARTICIPANT_INFO: 'get_participant_info',
  GET_ROLE_MEMBER_COUNT: 'get_role_member_count',
  GET_ROLE_MEMBER_AT_INDEX: 'get_role_member_at_index',
  GET_ALL_ROLE_MEMBERS: 'get_all_role_members',
  
  // Funciones de gestión de lotes
  CREATE_ANIMAL_BATCH: 'create_animal_batch',
  ADD_ANIMALS_TO_BATCH: 'add_animals_to_batch',
  TRANSFER_BATCH_TO_FRIGORIFICO: 'transfer_batch_to_frigorifico',
  GET_BATCH_INFO: 'get_batch_info',
  GET_ANIMALS_IN_BATCH: 'get_animals_in_batch',
  GET_BATCH_FOR_ANIMAL: 'get_batch_for_animal',
  
  // Funciones de consulta para productores
  GET_ANIMALS_BY_PRODUCER: 'get_animals_by_producer',
  GET_BATCHES_BY_PRODUCER: 'get_batches_by_producer',
  GET_PRODUCER_STATS: 'get_producer_stats',
  
  // Funciones de veterinario
  AUTHORIZE_VETERINARIAN_FOR_ANIMAL: 'authorize_veterinarian_for_animal',
  REVOKE_VETERINARIAN_AUTHORIZATION: 'revoke_veterinarian_authorization',
  ADD_HEALTH_RECORD: 'add_health_record',
  QUARANTINE_ANIMAL: 'quarantine_animal',
  CLEAR_QUARANTINE: 'clear_quarantine',
  IS_QUARANTINED: 'is_quarantined',
  
  // Funciones de IoT
  RECORD_IOT_READING: 'record_iot_reading',
  GET_LATEST_IOT_READING: 'get_latest_iot_reading',
  GET_IOT_HISTORY_COUNT: 'get_iot_history_count',
  
  // Funciones de certificación
  CERTIFY_ANIMAL: 'certify_animal',
  CERTIFY_CORTE: 'certify_corte',
  CERTIFY_BATCH: 'certify_batch',
  REVOKE_CERTIFICATION: 'revoke_certification',
  GET_CERTIFICATION_DATA: 'get_certification_data',
  
  // Funciones de exportación
  PREPARE_EXPORT_BATCH: 'prepare_export_batch',
  CONFIRM_EXPORT: 'confirm_export',
  UPDATE_EXPORT_TEMPERATURE: 'update_export_temperature',
  GET_EXPORT_DATA: 'get_export_data',
  
  // Funciones de administración de roles
  GRANT_ROLE: 'grant_role',
  REVOKE_ROLE: 'revoke_role',
  RENOUNCE_ROLE: 'renounce_role',
  HAS_ROLE: 'has_role',
  GET_ROLE_ADMIN: 'get_role_admin',
  SET_ROLE_ADMIN: 'set_role_admin',
  
  // Funciones de transferencia
  TRANSFER_ANIMAL: 'transfer_animal',
  TRANSFER_ANIMAL_TO_FRIGORIFICO: 'transfer_animal_to_frigorifico',
  TRANSFER_CORTE_TO_EXPORTADOR: 'transfer_corte_to_exportador',
  BATCH_TRANSFER_CORTES: 'batch_transfer_cortes',
  BATCH_TRANSFER_CORTES_PARA_LOTE: 'batch_transfer_cortes_para_lote',
  
  // Funciones de consulta general
  GET_NUM_CORTES: 'get_num_cortes',
  GET_CORTE_OWNER: 'get_corte_owner',
  
  // Funciones de estadísticas del sistema
  GET_SYSTEM_STATS: 'get_system_stats',
  GET_ROLE_STATS: 'get_role_stats',
  
  // Funciones de códigos QR
  GENERATE_QR_FOR_CORTE: 'generate_qr_for_corte',
  GENERATE_QR_FOR_ANIMAL: 'generate_qr_for_animal',
  GENERATE_QR_FOR_BATCH: 'generate_qr_for_batch',
  GET_PUBLIC_CONSUMER_DATA: 'get_public_consumer_data',
  VERIFY_QR_AUTHENTICITY: 'verify_qr_authenticity',
  GET_QR_DATA: 'get_qr_data',
  
  // Funciones de auditoría
  GET_ANIMAL_FULL_HISTORY: 'get_animal_full_history',
  GET_CORTE_FULL_HISTORY: 'get_corte_full_history',
  GET_BATCH_AUDIT_TRAIL: 'get_batch_audit_trail',
  
  // Funciones de sostenibilidad
  GENERATE_SUSTAINABILITY_REPORT: 'generate_sustainability_report',
  GET_CARBON_FOOTPRINT_ESTIMATE: 'get_carbon_footprint_estimate',
  GET_SUPPLY_CHAIN_EFFICIENCY: 'get_supply_chain_efficiency'
} as const;

// URLs de exploradores
export const EXPLORER_LINKS = {
  CONTRACT: `${EXPLORER_URL}/contract/${CONTRACT_ADDRESS}`,
  PRODUCTOR: `${EXPLORER_URL}/contract/${PRODUCTOR_WALLET}`,
  FRIGORIFICO: `${EXPLORER_URL}/contract/${FRIGORIFICO_WALLET}`,
  DEPLOYER: `${EXPLORER_URL}/contract/${DEPLOYER_WALLET}`,
} as const;

// Lista de todas las wallets del proyecto para referencia
export const PROJECT_WALLETS = {
  DEPLOYER: DEPLOYER_WALLET,
  PRODUCTOR: PRODUCTOR_WALLET,
  FRIGORIFICO: FRIGORIFICO_WALLET,
} as const;

// Helper para verificar si una dirección es una wallet del proyecto
export const isProjectWallet = (address: string): boolean => {
  if (!address) return false;
  return Object.values(PROJECT_WALLETS).includes(address as `0x${string}`);
};

// Helper para obtener nombre legible del rol
export function getRoleDisplayName(role: string): string {
  return ROLE_DISPLAY_NAMES[role] || role;
}

// Helper para obtener el rol de una wallet (LEGACY - usar contrato en su lugar)
export function getWalletRole(address: string): string {
  if (!address) return 'No conectado';
  
  const addr = address.toLowerCase();
  
  // Verificar si es alguna de las wallets del proyecto
  if (addr === DEPLOYER_WALLET?.toLowerCase()) return 'Administrador';
  if (addr === PRODUCTOR_WALLET?.toLowerCase()) return 'Productor';
  if (addr === FRIGORIFICO_WALLET?.toLowerCase()) return 'Frigorífico';
  
  // Si no coincide con ninguna wallet pre-configurada
  return 'Usuario Conectado';
}

// Voyager URL para transacciones
export const VOYAGER_TX_URL = 'https://sepolia.voyager.online/tx';

// Helper para obtener todos los roles disponibles para verificación
export function getAllRolesForVerification(): string[] {
  return [
    ROLES.DEFAULT_ADMIN_ROLE, // 0 - Admin
    ROLES.PRODUCER_ROLE,
    ROLES.FRIGORIFICO_ROLE,
    ROLES.VET_ROLE,
    ROLES.IOT_ROLE,
    ROLES.CERTIFIER_ROLE,
    ROLES.EXPORTER_ROLE,
    ROLES.AUDITOR_ROLE
  ];
}

// Helper para obtener nombre del rol por clave
export function getRoleName(role: string): string {
  return ROLE_DISPLAY_NAMES[role] || role;
}

// Helper para obtener el nombre de display de una wallet del proyecto
export function getProjectWalletDisplayName(key: string): string {
  const displayMap: { [key: string]: string } = {
    'DEPLOYER': 'Administrador',
    'PRODUCTOR': 'Productor',
    'FRIGORIFICO': 'Frigorífico'
  };
  return displayMap[key] || key;
}

export default {
  CONTRACT_ADDRESS,
  CONTRACT_CLASS_HASH,
  PRODUCTOR_WALLET,
  FRIGORIFICO_WALLET,
  DEPLOYER_WALLET,
  RPC_URL,
  EXPLORER_URL,
  NETWORK,
  CONTRACT_ABI,
  ROLES,
  ROLE_DISPLAY_NAMES,
  CONTRACT_FUNCTIONS,
  EXPLORER_LINKS,
  PROJECT_WALLETS,
  isProjectWallet,
  getRoleDisplayName,
  getWalletRole,
  getAllRolesForVerification,
  getRoleName,
  getProjectWalletDisplayName
};

