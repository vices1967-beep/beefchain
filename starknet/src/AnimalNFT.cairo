use starknet::ContractAddress;

// ============ ESTRUCTURAS DE DATOS ============

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct AnimalData {
    pub raza: u128,
    pub fecha_nacimiento: u64,
    pub peso: u128,
    pub estado: u8, // 0: Created, 1: Processed, 2: Certified, 3: Exported
    pub propietario: ContractAddress,
    pub frigorifico: ContractAddress,
    pub certificador: ContractAddress,
    pub exportador: ContractAddress,
    pub lote_id: u128,
}

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct CorteData {
    pub tipo_corte: u128,
    pub peso: u128,
    pub fecha_procesamiento: u64,
    pub frigorifico: ContractAddress,
    pub certificado: bool,
    pub lote_exportacion: u128,
    pub propietario: ContractAddress,
    pub animal_id: u128,
}

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct LoteAnimalData {
    pub propietario: ContractAddress,
    pub frigorifico: ContractAddress,
    pub fecha_creacion: u64,
    pub fecha_transferencia: u64,
    pub fecha_procesamiento: u64,
    pub estado: u8, // 0: Creado, 1: Transferido, 2: Procesado
    pub cantidad_animales: u32,
    pub peso_total: u128,
}

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct IoTReading {
    pub timestamp: u64,
    pub temperature: i32,
    pub humidity: u32,
    pub latitude: i64,
    pub longitude: i64,
    pub device_id: felt252,
    pub reading_type: felt252,
}

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct CertificationData {
    pub certification_date: u64,
    pub certification_type: felt252,
    pub certifier: ContractAddress,
    pub expiry_date: u64,
    pub certificate_hash: felt252,
}

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct ExportData {
    pub export_date: u64,
    pub destination_country: felt252,
    pub export_permit: felt252,
    pub container_id: felt252,
    pub temperature_range: (i32, i32),
    pub exporter: ContractAddress,
}

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct ParticipantInfo {
    pub nombre: felt252,
    pub direccion: ContractAddress,
    pub fecha_registro: u64,
    pub activo: bool,
    pub metadata: felt252,
}

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct QRData {
    pub qr_hash: felt252,
    pub animal_id: u128,
    pub corte_id: u128,
    pub timestamp: u64,
    pub data_type: felt252,
    pub metadata: felt252,
}

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct PublicConsumerData {
    pub raza: u128,
    pub fecha_nacimiento: u64,
    pub fecha_procesamiento: u64,
    pub frigorifico_nombre: felt252,
    pub certificador_nombre: felt252,
    pub tipo_corte: u128,
    pub peso_corte: u128,
    pub certificaciones: felt252,
    pub pais_origen: felt252,
}

// ============ INTERFAZ DEL CONTRATO ============

#[starknet::interface]
pub trait IAnimalNFT<TContractState> {
    // === Funciones de Registro e Identificación ===
    fn register_participant(
        ref self: TContractState,
        role: felt252,
        nombre: felt252,
        metadata: felt252
    );
    fn update_participant_info(
        ref self: TContractState,
        nombre: felt252,
        metadata: felt252
    );
    fn get_participant_info(self: @TContractState, account: ContractAddress) -> ParticipantInfo;
    fn get_role_member_count(self: @TContractState, role: felt252) -> u32;
    fn get_role_member_at_index(self: @TContractState, role: felt252, index: u32) -> ContractAddress;
    fn get_all_role_members(self: @TContractState, role: felt252) -> Array<ContractAddress>;
    
    // === Funciones de Productor ===
    fn create_animal(
        ref self: TContractState,
        metadata_hash: felt252,
        raza: u128,
        fecha_nacimiento: u64,
        peso: u128
    ) -> u128;
    fn create_animal_simple(ref self: TContractState, raza: u128) -> u128;
    fn update_animal_weight(ref self: TContractState, animal_id: u128, new_weight: u128);
    
    // === Funciones de Gestión de Lotes (Productor) ===
    fn create_animal_batch(ref self: TContractState, animal_ids: Array<u128>) -> u128;
    fn add_animals_to_batch(ref self: TContractState, batch_id: u128, animal_ids: Array<u128>);
    fn transfer_batch_to_frigorifico(ref self: TContractState, batch_id: u128, frigorifico: ContractAddress);
    fn get_batch_info(self: @TContractState, batch_id: u128) -> (LoteAnimalData, Array<u128>);
    
    // === Funciones de Consulta para Productores ===
    fn get_animals_by_producer(self: @TContractState, producer: ContractAddress) -> Array<u128>;
    fn get_batches_by_producer(self: @TContractState, producer: ContractAddress) -> Array<u128>;
    fn get_producer_stats(self: @TContractState, producer: ContractAddress) -> (u32, u32, u128);
    
    // === Funciones de Frigorífico ===
    fn procesar_animal(ref self: TContractState, animal_id: u128);
    fn procesar_batch(ref self: TContractState, batch_id: u128);
    fn crear_corte(
        ref self: TContractState,
        animal_id: u128,
        tipo_corte: u128,
        peso: u128
    ) -> u128;
    fn crear_cortes_para_batch(
        ref self: TContractState,
        batch_id: u128,
        tipos_corte: Array<u128>,
        pesos: Array<u128>
    ) -> Array<u128>;
    
    // === Funciones de IoT ===
    fn record_iot_reading(
        ref self: TContractState,
        animal_id: u128,
        reading: IoTReading
    );
    fn get_latest_iot_reading(
        self: @TContractState,
        animal_id: u128,
        reading_type: felt252
    ) -> IoTReading;
    fn get_iot_history_count(
        self: @TContractState,
        animal_id: u128
    ) -> u32;
    
    // === Funciones de Veterinario ===
    fn add_health_record(
        ref self: TContractState,
        animal_id: u128,
        diagnosis: felt252,
        treatment: felt252,
        vaccination: felt252
    );
    fn quarantine_animal(ref self: TContractState, animal_id: u128, reason: felt252);
    fn clear_quarantine(ref self: TContractState, animal_id: u128);
    fn authorize_veterinarian_for_animal(ref self: TContractState, veterinarian: ContractAddress, animal_id: u128);
    fn revoke_veterinarian_authorization(ref self: TContractState, veterinarian: ContractAddress, animal_id: u128);
    
    // === Funciones de Certificador ===
    fn certify_animal(
        ref self: TContractState,
        animal_id: u128,
        certification_data: CertificationData
    );
    fn certify_corte(
        ref self: TContractState,
        animal_id: u128,
        corte_id: u128
    );
    fn certify_batch(
        ref self: TContractState,
        batch_id: u128,
        certification_data: CertificationData
    );
    fn revoke_certification(
        ref self: TContractState,
        animal_id: u128,
        reason: felt252
    );
    
    // === Funciones de Exportador ===
    fn prepare_export_batch(
        ref self: TContractState,
        animal_ids: Array<u128>,
        destination: felt252,
        container_id: felt252
    ) -> u128;
    fn confirm_export(
        ref self: TContractState,
        batch_id: u128,
        export_permit: felt252
    );
    fn update_export_temperature(
        ref self: TContractState,
        batch_id: u128,
        temperature: i32
    );
    
    // === Funciones de Administración de Roles ===
    fn grant_role(ref self: TContractState, role: felt252, account: ContractAddress);
    fn revoke_role(ref self: TContractState, role: felt252, account: ContractAddress);
    fn renounce_role(ref self: TContractState, role: felt252);
    fn has_role(self: @TContractState, role: felt252, account: ContractAddress) -> bool;
    fn get_role_admin(self: @TContractState, role: felt252) -> felt252;
    fn set_role_admin(ref self: TContractState, role: felt252, admin_role: felt252);
    
    // === Funciones de Transferencia ===
    fn transfer_animal(ref self: TContractState, to: ContractAddress, animal_id: u128);
    fn transfer_animal_to_frigorifico(ref self: TContractState, animal_id: u128, frigorifico: ContractAddress);
    fn transfer_corte_to_exportador(ref self: TContractState, animal_id: u128, corte_id: u128, exportador: ContractAddress);
    fn batch_transfer_cortes(ref self: TContractState, animal_id: u128, corte_ids: Array<u128>, exportador: ContractAddress);
    fn batch_transfer_cortes_para_lote(ref self: TContractState, batch_id: u128, exportador: ContractAddress);
    
    // === Funciones de Consulta General ===
    fn get_info_animal(self: @TContractState, animal_id: u128) -> (AnimalData, u128, felt252);
    fn get_info_corte(self: @TContractState, animal_id: u128, corte_id: u128) -> CorteData;
    fn get_certification_data(self: @TContractState, animal_id: u128) -> CertificationData;
    fn get_export_data(self: @TContractState, batch_id: u128) -> ExportData;
    fn owner_of(self: @TContractState, token_id: u128) -> ContractAddress;
    fn token_uri(self: @TContractState, token_id: u128) -> felt252;
    fn get_animal_data(self: @TContractState, animal_id: u128) -> AnimalData;
    fn get_num_cortes(self: @TContractState, animal_id: u128) -> u128;
    fn is_quarantined(self: @TContractState, animal_id: u128) -> bool;
    fn get_corte_owner(self: @TContractState, animal_id: u128, corte_id: u128) -> ContractAddress;
    fn get_animals_in_batch(self: @TContractState, batch_id: u128) -> Array<u128>;
    fn get_batch_for_animal(self: @TContractState, animal_id: u128) -> u128;
    
    // === Funciones de Estadísticas del Sistema ===
    fn get_system_stats(self: @TContractState) -> (u128, u128, u128, u128, u128, u128, u128);
    fn get_role_stats(self: @TContractState) -> (u32, u32, u32, u32, u32, u32, u32);
    
    // === Funciones de Códigos QR y Datos para Consumidores ===
    fn generate_qr_for_corte(ref self: TContractState, animal_id: u128, corte_id: u128) -> felt252;
    fn generate_qr_for_animal(ref self: TContractState, animal_id: u128) -> felt252;
    fn generate_qr_for_batch(ref self: TContractState, batch_id: u128) -> felt252;
    fn get_public_consumer_data(self: @TContractState, qr_hash: felt252) -> PublicConsumerData;
    fn verify_qr_authenticity(self: @TContractState, qr_hash: felt252) -> bool;
    fn get_qr_data(self: @TContractState, qr_hash: felt252) -> QRData;
    
    // === Funciones de Auditoría y Transparencia ===
    fn get_animal_full_history(self: @TContractState, animal_id: u128) -> Array<felt252>;
    fn get_corte_full_history(self: @TContractState, animal_id: u128, corte_id: u128) -> Array<felt252>;
    fn get_batch_audit_trail(self: @TContractState, batch_id: u128) -> Array<felt252>;
    
    // === Funciones de Reportes y Analytics ===
    fn generate_sustainability_report(self: @TContractState, animal_id: u128) -> Array<felt252>;
    fn get_carbon_footprint_estimate(self: @TContractState, animal_id: u128) -> u128;
    fn get_supply_chain_efficiency(self: @TContractState, producer: ContractAddress) -> u128;
}

// ============ IMPLEMENTACIÓN DEL CONTRATO ============

#[starknet::contract]
pub mod AnimalNFT {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::get_block_timestamp;
    use starknet::storage::Map;
    use core::traits::Into;
    use core::traits::TryInto;
    use core::option::OptionTrait;
    use core::array::ArrayTrait;
    
    // Importar todas las estructuras
    use super::{
        AnimalData, CorteData, LoteAnimalData, IoTReading, CertificationData, 
        ExportData, ParticipantInfo, QRData, PublicConsumerData
    };

    // === DEFINICIÓN DE ROLES ===
    const DEFAULT_ADMIN_ROLE: felt252 = 0;
    const PRODUCER_ROLE: felt252 = 'PRODUCER_ROLE';
    const FRIGORIFICO_ROLE: felt252 = 'FRIGORIFICO_ROLE';
    const VET_ROLE: felt252 = 'VET_ROLE';
    const IOT_ROLE: felt252 = 'IOT_ROLE';
    const CERTIFIER_ROLE: felt252 = 'CERTIFIER_ROLE';
    const EXPORTER_ROLE: felt252 = 'EXPORTER_ROLE';
    const AUDITOR_ROLE: felt252 = 'AUDITOR_ROLE';

    // === STORAGE ===
    #[storage]
    pub struct Storage {
        // NFT data
        next_token_id: u128,
        token_owner: Map<u128, ContractAddress>,
        token_uri: Map<u128, felt252>,
        
        // Animal data
        animal_data: Map<u128, AnimalData>,
        animal_cortes: Map<u128, u128>,
        cortes_data: Map<(u128, u128), CorteData>,
        qr_data: Map<u128, felt252>,
        
        // Propiedad de cortes
        corte_owner: Map<(u128, u128), ContractAddress>,
        
        // Health & Quarantine
        quarantined_animals: Map<u128, bool>,
        quarantine_reason: Map<u128, felt252>,
        health_records_count: Map<u128, u32>,
        
        // Autorizaciones de veterinarios
        authorized_veterinarians: Map<(u128, ContractAddress), bool>,
        
        // IoT data
        iot_readings: Map<(u128, u32), IoTReading>,
        iot_readings_count: Map<u128, u32>,
        latest_reading_by_type: Map<(u128, felt252), IoTReading>,
        
        // Certification data
        certifications: Map<u128, CertificationData>,
        certified_animals: Map<u128, bool>,
        
        // Export data
        next_batch_id: u128,
        export_batches: Map<u128, ExportData>,
        animal_export_batch: Map<u128, u128>,
        batch_animals_count: Map<u128, u32>,
        
        // Access Control
        role_members: Map<(felt252, ContractAddress), bool>,
        role_admin: Map<felt252, felt252>,
        role_member_count: Map<felt252, u32>,
        
        // Sistema de identificación de participantes
        participant_info: Map<ContractAddress, ParticipantInfo>,
        
        // === SISTEMA CORREGIDO PARA ARRAYS EN STORAGE ===
        // Para role_members_array
        role_members_count: Map<felt252, u32>,
        role_member_at_index: Map<(felt252, u32), ContractAddress>,
        
        // Para animals_by_owner
        animals_by_owner_count: Map<ContractAddress, u32>,
        animal_at_owner_index: Map<(ContractAddress, u32), u128>,
        
        // Para batches_by_owner  
        batches_by_owner_count: Map<ContractAddress, u32>,
        batch_at_owner_index: Map<(ContractAddress, u32), u128>,
        
        // Para historiales
        animal_history_count: Map<u128, u32>,
        animal_history_at_index: Map<(u128, u32), felt252>,
        
        corte_history_count: Map<(u128, u128), u32>,
        corte_history_at_index: Map<(u128, u128, u32), felt252>,
        
        batch_audit_count: Map<u128, u32>,
        batch_audit_at_index: Map<(u128, u32), felt252>,
        
        // Estadísticas de transferencias
        transfer_count: Map<u128, u32>,
        last_transfer_time: Map<u128, u64>,
        
        // Sistema de Lotes de Animales
        next_lote_id: u128,
        lotes_animales: Map<u128, LoteAnimalData>,
        animales_en_lote: Map<(u128, u128), bool>,
        lotes_por_animal: Map<u128, u128>,
        animales_por_lote_count: Map<u128, u32>,
        
        // Contadores globales
        total_animals_created: u128,
        total_batches_created: u128,
        total_cortes_created: u128,
        
        // Sistema de Códigos QR
        qr_codes: Map<felt252, QRData>,
        qr_to_animal: Map<felt252, u128>,
        qr_to_corte: Map<felt252, (u128, u128)>,
        qr_to_batch: Map<felt252, u128>,
        next_qr_nonce: u128,
        
        // Métricas de sostenibilidad
        carbon_footprint: Map<u128, u128>,
        water_usage: Map<u128, u128>,
        supply_chain_efficiency: Map<ContractAddress, u128>,
    }

    // === EVENTS ===
    #[derive(Drop, starknet::Event)]
    pub struct AnimalCreated {
        pub token_id: u128,
        pub owner: ContractAddress,
        pub metadata_hash: felt252,
        pub raza: u128,
        pub peso: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AnimalProcesado {
        pub animal_id: u128,
        pub frigorifico: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CorteCreado {
        pub animal_id: u128,
        pub corte_id: u128,
        pub tipo_corte: u128,
        pub peso: u128,
        pub frigorifico: ContractAddress,
        pub qr_hash: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct IoTDataRecorded {
        pub animal_id: u128,
        pub reading_type: felt252,
        pub device_id: felt252,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AnimalCertified {
        pub animal_id: u128,
        pub certification_type: felt252,
        pub certifier: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ExportBatchCreated {
        pub batch_id: u128,
        pub destination: felt252,
        pub container_id: felt252,
        pub exporter: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AnimalQuarantined {
        pub animal_id: u128,
        pub reason: felt252,
        pub vet: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RoleGranted {
        pub role: felt252,
        pub account: ContractAddress,
        pub sender: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RoleRevoked {
        pub role: felt252,
        pub account: ContractAddress,
        pub sender: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AnimalTransferred {
        pub animal_id: u128,
        pub from: ContractAddress,
        pub to: ContractAddress,
        pub timestamp: u64,
        pub transfer_type: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CorteTransferred {
        pub animal_id: u128,
        pub corte_id: u128,
        pub from: ContractAddress,
        pub to: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct LoteAnimalCreado {
        pub lote_id: u128,
        pub propietario: ContractAddress,
        pub cantidad_animales: u32,
        pub peso_total: u128,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct LoteAnimalTransferido {
        pub lote_id: u128,
        pub from: ContractAddress,
        pub to: ContractAddress,
        pub cantidad_animales: u32,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct LoteAnimalProcesado {
        pub lote_id: u128,
        pub frigorifico: ContractAddress,
        pub cantidad_animales: u32,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CortesBatchCreados {
        pub lote_id: u128,
        pub cantidad_cortes: u32,
        pub frigorifico: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ParticipantRegistered {
        pub account: ContractAddress,
        pub role: felt252,
        pub nombre: felt252,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VeterinarianAuthorized {
        pub animal_id: u128,
        pub veterinarian: ContractAddress,
        pub authorizer: ContractAddress,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct QRCodeGenerated {
        pub qr_hash: felt252,
        pub animal_id: u128,
        pub corte_id: u128,
        pub data_type: felt252,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ConsumerDataAccessed {
        pub qr_hash: felt252,
        pub animal_id: u128,
        pub timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SustainabilityReportGenerated {
        pub animal_id: u128,
        pub carbon_footprint: u128,
        pub water_usage: u128,
        pub timestamp: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        AnimalCreated: AnimalCreated,
        AnimalProcesado: AnimalProcesado,
        CorteCreado: CorteCreado,
        IoTDataRecorded: IoTDataRecorded,
        AnimalCertified: AnimalCertified,
        ExportBatchCreated: ExportBatchCreated,
        AnimalQuarantined: AnimalQuarantined,
        RoleGranted: RoleGranted,
        RoleRevoked: RoleRevoked,
        AnimalTransferred: AnimalTransferred,
        CorteTransferred: CorteTransferred,
        LoteAnimalCreado: LoteAnimalCreado,
        LoteAnimalTransferido: LoteAnimalTransferido,
        LoteAnimalProcesado: LoteAnimalProcesado,
        CortesBatchCreados: CortesBatchCreados,
        ParticipantRegistered: ParticipantRegistered,
        VeterinarianAuthorized: VeterinarianAuthorized,
        QRCodeGenerated: QRCodeGenerated,
        ConsumerDataAccessed: ConsumerDataAccessed,
        SustainabilityReportGenerated: SustainabilityReportGenerated,
    }

    // === CONSTRUCTOR ===
    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        // Initialize counters
        self.next_token_id.write(1);
        self.next_batch_id.write(1);
        self.next_lote_id.write(1);
        self.next_qr_nonce.write(1);
        
        // Setup role admins
        self.role_admin.write(DEFAULT_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        self.role_admin.write(PRODUCER_ROLE, DEFAULT_ADMIN_ROLE);
        self.role_admin.write(FRIGORIFICO_ROLE, DEFAULT_ADMIN_ROLE);
        self.role_admin.write(VET_ROLE, DEFAULT_ADMIN_ROLE);
        self.role_admin.write(IOT_ROLE, DEFAULT_ADMIN_ROLE);
        self.role_admin.write(CERTIFIER_ROLE, DEFAULT_ADMIN_ROLE);
        self.role_admin.write(EXPORTER_ROLE, DEFAULT_ADMIN_ROLE);
        self.role_admin.write(AUDITOR_ROLE, DEFAULT_ADMIN_ROLE);
        
        // Inicializar contadores de arrays a 0
        self.role_members_count.write(DEFAULT_ADMIN_ROLE, 0);
        self.role_members_count.write(PRODUCER_ROLE, 0);
        self.role_members_count.write(FRIGORIFICO_ROLE, 0);
        self.role_members_count.write(VET_ROLE, 0);
        self.role_members_count.write(IOT_ROLE, 0);
        self.role_members_count.write(CERTIFIER_ROLE, 0);
        self.role_members_count.write(EXPORTER_ROLE, 0);
        self.role_members_count.write(AUDITOR_ROLE, 0);
        
        // Grant admin role to deployer
        self._grant_role(DEFAULT_ADMIN_ROLE, admin);
        
        // Registrar al administrador inicial
        let admin_info = ParticipantInfo {
            nombre: 'Administrador Inicial',
            direccion: admin,
            fecha_registro: get_block_timestamp(),
            activo: true,
            metadata: 'Admin del sistema GanadoChain',
        };
        self.participant_info.write(admin, admin_info);
    }

    // === INTERNAL HELPER FUNCTIONS ===
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _has_role(self: @ContractState, role: felt252, account: ContractAddress) -> bool {
            self.role_members.read((role, account))
        }
        
        fn _check_role(self: @ContractState, role: felt252) {
            let caller = get_caller_address();
            assert!(self._has_role(role, caller), "AccessControl: account missing role");
        }
        
        fn _grant_role(ref self: ContractState, role: felt252, account: ContractAddress) {
            if !self._has_role(role, account) {
                self.role_members.write((role, account), true);
                let current_count = self.role_member_count.read(role);
                self.role_member_count.write(role, current_count + 1);
                
                // CORREGIDO: Usar nuevo sistema de arrays
                self._add_to_role_members_array(role, account);
                
                self.emit(Event::RoleGranted(RoleGranted {
                    role: role,
                    account: account,
                    sender: get_caller_address(),
                }));
            }
        }
        
        fn _revoke_role(ref self: ContractState, role: felt252, account: ContractAddress) {
            if self._has_role(role, account) {
                self.role_members.write((role, account), false);
                let current_count = self.role_member_count.read(role);
                if current_count > 0 {
                    self.role_member_count.write(role, current_count - 1);
                }
                
                // CORREGIDO: Usar nuevo sistema de arrays
                self._remove_from_role_members_array(role, account);
                
                self.emit(Event::RoleRevoked(RoleRevoked {
                    role: role,
                    account: account,
                    sender: get_caller_address(),
                }));
            }
        }
        
        fn _validate_transfer_conditions(self: @ContractState, animal_id: u128) {
            let animal = self.animal_data.read(animal_id);
            let zero_address: ContractAddress = 0.try_into().unwrap();
            assert!(animal.propietario != zero_address, "Animal does not exist");
            assert!(!self.quarantined_animals.read(animal_id), "Animal in quarantine");
        }
        
        fn _update_transfer_stats(ref self: ContractState, animal_id: u128) {
            let current_count = self.transfer_count.read(animal_id);
            self.transfer_count.write(animal_id, current_count + 1);
            self.last_transfer_time.write(animal_id, get_block_timestamp());
        }
        
        fn _transfer_animal_internal(
            ref self: ContractState,
            animal_id: u128,
            from: ContractAddress,
            to: ContractAddress
        ) {
            self.token_owner.write(animal_id, to);
            
            let animal = self.animal_data.read(animal_id);
            let updated_animal = AnimalData {
                raza: animal.raza,
                fecha_nacimiento: animal.fecha_nacimiento,
                peso: animal.peso,
                estado: animal.estado,
                propietario: to,
                frigorifico: animal.frigorifico,
                certificador: animal.certificador,
                exportador: animal.exportador,
                lote_id: animal.lote_id,
            };
            self.animal_data.write(animal_id, updated_animal);
            
            // Actualizar índices
            self._update_animal_owner_index(animal_id, from, to);
            
            self._update_transfer_stats(animal_id);
        }
        
        fn _update_animal_owner_index(
            ref self: ContractState,
            animal_id: u128,
            old_owner: ContractAddress,
            new_owner: ContractAddress
        ) {
            // Remover del dueño anterior
            let old_count = self.animals_by_owner_count.read(old_owner);
            let mut new_count: u32 = 0;
            
            let mut i: u32 = 0;
            loop {
                if i >= old_count {
                    break;
                }
                let stored_animal_id = self.animal_at_owner_index.read((old_owner, i));
                if stored_animal_id != animal_id {
                    self.animal_at_owner_index.write((old_owner, new_count), stored_animal_id);
                    new_count += 1;
                }
                i += 1;
            };
            self.animals_by_owner_count.write(old_owner, new_count);
            
            // Agregar al nuevo dueño
            let new_owner_count = self.animals_by_owner_count.read(new_owner);
            self.animal_at_owner_index.write((new_owner, new_owner_count), animal_id);
            self.animals_by_owner_count.write(new_owner, new_owner_count + 1);
        }
        
        fn _update_batch_owner_index(
            ref self: ContractState,
            batch_id: u128,
            old_owner: ContractAddress,
            new_owner: ContractAddress
        ) {
            // Remover del dueño anterior
            let old_count = self.batches_by_owner_count.read(old_owner);
            let mut new_count: u32 = 0;
            
            let mut i: u32 = 0;
            loop {
                if i >= old_count {
                    break;
                }
                let stored_batch_id = self.batch_at_owner_index.read((old_owner, i));
                if stored_batch_id != batch_id {
                    self.batch_at_owner_index.write((old_owner, new_count), stored_batch_id);
                    new_count += 1;
                }
                i += 1;
            };
            self.batches_by_owner_count.write(old_owner, new_count);
            
            // Agregar al nuevo dueño
            let new_owner_count = self.batches_by_owner_count.read(new_owner);
            self.batch_at_owner_index.write((new_owner, new_owner_count), batch_id);
            self.batches_by_owner_count.write(new_owner, new_owner_count + 1);
        }
        
        fn _get_animal_ids_in_batch(self: @ContractState, batch_id: u128) -> Array<u128> {
            let mut animal_ids = ArrayTrait::new();
            let mut i: u128 = 1;
            loop {
                if i >= self.next_token_id.read() {
                    break;
                }
                if self.animales_en_lote.read((batch_id, i)) {
                    animal_ids.append(i);
                }
                i += 1;
            };
            animal_ids
        }
        
        fn _register_participant_if_needed(
            ref self: ContractState,
            account: ContractAddress,
            role: felt252,
            nombre: felt252,
            metadata: felt252
        ) {
            let existing_info = self.participant_info.read(account);
            let zero_address: ContractAddress = 0.try_into().unwrap();
            
            if existing_info.direccion == zero_address {
                // Registrar nuevo participante
                let participant_info = ParticipantInfo {
                    nombre: nombre,
                    direccion: account,
                    fecha_registro: get_block_timestamp(),
                    activo: true,
                    metadata: metadata,
                };
                self.participant_info.write(account, participant_info);
                
                self.emit(Event::ParticipantRegistered(ParticipantRegistered {
                    account: account,
                    role: role,
                    nombre: nombre,
                    timestamp: get_block_timestamp(),
                }));
            }
        }
        
        fn _generate_qr_hash(ref self: ContractState, data: felt252) -> felt252 {
            let nonce = self.next_qr_nonce.read();
            self.next_qr_nonce.write(nonce + 1);
            data + nonce.into()
        }
        
        fn _record_animal_history(ref self: ContractState, animal_id: u128, event: felt252) {
            let count = self.animal_history_count.read(animal_id);
            self.animal_history_at_index.write((animal_id, count), event);
            self.animal_history_count.write(animal_id, count + 1);
        }
        
        fn _record_corte_history(ref self: ContractState, animal_id: u128, corte_id: u128, event: felt252) {
            let count = self.corte_history_count.read((animal_id, corte_id));
            self.corte_history_at_index.write((animal_id, corte_id, count), event);
            self.corte_history_count.write((animal_id, corte_id), count + 1);
        }
        
        fn _record_batch_audit(ref self: ContractState, batch_id: u128, event: felt252) {
            let count = self.batch_audit_count.read(batch_id);
            self.batch_audit_at_index.write((batch_id, count), event);
            self.batch_audit_count.write(batch_id, count + 1);
        }
        
        fn _calculate_carbon_footprint(self: @ContractState, animal_id: u128) -> u128 {
            let animal = self.animal_data.read(animal_id);
            let iot_count = self.iot_readings_count.read(animal_id);
            
            // Fórmula simplificada para estimar huella de carbono
            let base_footprint = animal.peso * 25; // 25 unidades por kg
            let iot_impact = iot_count * 2; // Impacto de monitoreo IoT
            base_footprint + iot_impact.into()
        }
        
        fn _anonymize_sensitive_data(self: @ContractState, animal_id: u128, corte_id: u128) -> PublicConsumerData {
            let animal = self.animal_data.read(animal_id);
            let corte = self.cortes_data.read((animal_id, corte_id));
            
            // Obtener información de participantes (solo nombres)
            let frigorifico_info = self.participant_info.read(animal.frigorifico);
            let certificador_info = self.participant_info.read(animal.certificador);
            
            // Construir string de certificaciones
            let mut certificaciones = '';
            if corte.certificado {
                let cert_data = self.certifications.read(animal_id);
                certificaciones = cert_data.certification_type;
            }
            
            PublicConsumerData {
                raza: animal.raza,
                fecha_nacimiento: animal.fecha_nacimiento,
                fecha_procesamiento: corte.fecha_procesamiento,
                frigorifico_nombre: frigorifico_info.nombre,
                certificador_nombre: certificador_info.nombre,
                tipo_corte: corte.tipo_corte,
                peso_corte: corte.peso,
                certificaciones: certificaciones,
                pais_origen: 'Uruguay',
            }
        }
        
        // === FUNCIONES HELPER PARA ARRAYS EN STORAGE ===
        fn _add_to_role_members_array(ref self: ContractState, role: felt252, account: ContractAddress) {
            let count = self.role_members_count.read(role);
            self.role_member_at_index.write((role, count), account);
            self.role_members_count.write(role, count + 1);
        }
        
        fn _remove_from_role_members_array(ref self: ContractState, role: felt252, account: ContractAddress) {
            let count = self.role_members_count.read(role);
            let mut new_count: u32 = 0;
            
            let mut i: u32 = 0;
            loop {
                if i >= count {
                    break;
                }
                let member = self.role_member_at_index.read((role, i));
                if member != account {
                    self.role_member_at_index.write((role, new_count), member);
                    new_count += 1;
                }
                i += 1;
            };
            self.role_members_count.write(role, new_count);
        }
        
        fn _get_role_member_at_index(self: @ContractState, role: felt252, index: u32) -> ContractAddress {
            self.role_member_at_index.read((role, index))
        }
        
        fn _get_role_members_count(self: @ContractState, role: felt252) -> u32 {
            self.role_members_count.read(role)
        }
        
        fn _add_animal_to_owner(ref self: ContractState, owner: ContractAddress, animal_id: u128) {
            let count = self.animals_by_owner_count.read(owner);
            self.animal_at_owner_index.write((owner, count), animal_id);
            self.animals_by_owner_count.write(owner, count + 1);
        }
        
        fn _get_animal_at_owner_index(self: @ContractState, owner: ContractAddress, index: u32) -> u128 {
            self.animal_at_owner_index.read((owner, index))
        }
        
        fn _get_animals_by_owner_count(self: @ContractState, owner: ContractAddress) -> u32 {
            self.animals_by_owner_count.read(owner)
        }
        
        fn _add_batch_to_owner(ref self: ContractState, owner: ContractAddress, batch_id: u128) {
            let count = self.batches_by_owner_count.read(owner);
            self.batch_at_owner_index.write((owner, count), batch_id);
            self.batches_by_owner_count.write(owner, count + 1);
        }
        
        fn _get_batch_at_owner_index(self: @ContractState, owner: ContractAddress, index: u32) -> u128 {
            self.batch_at_owner_index.read((owner, index))
        }
        
        fn _get_batches_by_owner_count(self: @ContractState, owner: ContractAddress) -> u32 {
            self.batches_by_owner_count.read(owner)
        }
        
        fn _get_animal_history_at_index(self: @ContractState, animal_id: u128, index: u32) -> felt252 {
            self.animal_history_at_index.read((animal_id, index))
        }
        
        fn _get_animal_history_count(self: @ContractState, animal_id: u128) -> u32 {
            self.animal_history_count.read(animal_id)
        }
        
        fn _get_corte_history_at_index(self: @ContractState, animal_id: u128, corte_id: u128, index: u32) -> felt252 {
            self.corte_history_at_index.read((animal_id, corte_id, index))
        }
        
        fn _get_corte_history_count(self: @ContractState, animal_id: u128, corte_id: u128) -> u32 {
            self.corte_history_count.read((animal_id, corte_id))
        }
        
        fn _get_batch_audit_at_index(self: @ContractState, batch_id: u128, index: u32) -> felt252 {
            self.batch_audit_at_index.read((batch_id, index))
        }
        
        fn _get_batch_audit_count(self: @ContractState, batch_id: u128) -> u32 {
            self.batch_audit_count.read(batch_id)
        }
    }

    // === IMPLEMENTACIÓN DE LA INTERFAZ ===
    #[abi(embed_v0)]
    pub impl AnimalNFTImpl of super::IAnimalNFT<ContractState> {
        
        // ========== FUNCIONES DE REGISTRO E IDENTIFICACIÓN ==========
        
        fn register_participant(
            ref self: ContractState,
            role: felt252,
            nombre: felt252,
            metadata: felt252
        ) {
            let caller = get_caller_address();
            
            // Verificar que el rol es válido
            assert!(
                role == PRODUCER_ROLE || role == FRIGORIFICO_ROLE || role == VET_ROLE ||
                role == IOT_ROLE || role == CERTIFIER_ROLE || role == EXPORTER_ROLE ||
                role == AUDITOR_ROLE,
                "Invalid role"
            );
            
            self._register_participant_if_needed(caller, role, nombre, metadata);
        }
        
        fn update_participant_info(
            ref self: ContractState,
            nombre: felt252,
            metadata: felt252
        ) {
            let caller = get_caller_address();
            let mut existing_info = self.participant_info.read(caller);
            let zero_address: ContractAddress = 0.try_into().unwrap();
            
            assert!(existing_info.direccion != zero_address, "Participant not registered");
            
            let updated_info = ParticipantInfo {
                nombre: nombre,
                direccion: existing_info.direccion,
                fecha_registro: existing_info.fecha_registro,
                activo: existing_info.activo,
                metadata: metadata,
            };
            
            self.participant_info.write(caller, updated_info);
        }
        
        fn get_participant_info(
            self: @ContractState,
            account: ContractAddress
        ) -> ParticipantInfo {
            self.participant_info.read(account)
        }
        
        fn get_role_member_count(
            self: @ContractState,
            role: felt252
        ) -> u32 {
            self.role_member_count.read(role)
        }
        
        fn get_role_member_at_index(
            self: @ContractState,
            role: felt252,
            index: u32
        ) -> ContractAddress {
            // CORREGIDO
            self._get_role_member_at_index(role, index)
        }
        
        fn get_all_role_members(
            self: @ContractState,
            role: felt252
        ) -> Array<ContractAddress> {
            // CORREGIDO: Reconstruir array desde storage
            let count = self._get_role_members_count(role);
            let mut members = ArrayTrait::new();
            
            let mut i: u32 = 0;
            loop {
                if i >= count {
                    break;
                }
                let member = self._get_role_member_at_index(role, i);
                members.append(member);
                i += 1;
            };
            members
        }

        // ========== FUNCIONES DE PRODUCTOR ==========
        
        fn create_animal(
            ref self: ContractState,
            metadata_hash: felt252,
            raza: u128,
            fecha_nacimiento: u64,
            peso: u128
        ) -> u128 {
            self._check_role(PRODUCER_ROLE);

            let token_id = self.next_token_id.read();
            self.next_token_id.write(token_id + 1);
            
            let caller = get_caller_address();
            self.token_owner.write(token_id, caller);
            self.token_uri.write(token_id, metadata_hash);
            
            let zero_address: ContractAddress = 0.try_into().unwrap();
            
            let animal_data = AnimalData {
                raza: raza,
                fecha_nacimiento: fecha_nacimiento,
                peso: peso,
                estado: 0,
                propietario: caller,
                frigorifico: zero_address,
                certificador: zero_address,
                exportador: zero_address,
                lote_id: 0,
            };
            self.animal_data.write(token_id, animal_data);
            self.animal_cortes.write(token_id, 0);
            
            let qr_hash = metadata_hash + token_id.into();
            self.qr_data.write(token_id, qr_hash);
            
            // Actualizar índices y contadores
            self._add_animal_to_owner(caller, token_id);
            
            self.total_animals_created.write(self.total_animals_created.read() + 1);
            self.transfer_count.write(token_id, 0);
            self.last_transfer_time.write(token_id, get_block_timestamp());
            
            self.emit(Event::AnimalCreated(AnimalCreated {
                token_id: token_id,
                owner: caller,
                metadata_hash: metadata_hash,
                raza: raza,
                peso: peso,
            }));
            
            token_id
        }

        fn create_animal_simple(ref self: ContractState, raza: u128) -> u128 {
            self._check_role(PRODUCER_ROLE);
            
            let timestamp = get_block_timestamp();
            let token_id = self.next_token_id.read();
            self.next_token_id.write(token_id + 1);
            
            let caller = get_caller_address();
            let metadata_hash = 'simple_animal_v1';
            self.token_owner.write(token_id, caller);
            self.token_uri.write(token_id, metadata_hash);
            
            let zero_address: ContractAddress = 0.try_into().unwrap();
            
            let animal_data = AnimalData {
                raza: raza,
                fecha_nacimiento: timestamp,
                peso: 250,
                estado: 0,
                propietario: caller,
                frigorifico: zero_address,
                certificador: zero_address,
                exportador: zero_address,
                lote_id: 0,
            };
            self.animal_data.write(token_id, animal_data);
            
            // Actualizar índices y contadores
            self._add_animal_to_owner(caller, token_id);
            
            self.total_animals_created.write(self.total_animals_created.read() + 1);
            self.transfer_count.write(token_id, 0);
            self.last_transfer_time.write(token_id, timestamp);
            
            token_id
        }
        
        fn update_animal_weight(ref self: ContractState, animal_id: u128, new_weight: u128) {
            self._check_role(PRODUCER_ROLE);
            
            let animal = self.animal_data.read(animal_id);
            assert!(animal.estado == 0, "Cannot update processed animal");
            assert!(animal.propietario == get_caller_address(), "Only owner can update");
            
            let updated_animal = AnimalData {
                raza: animal.raza,
                fecha_nacimiento: animal.fecha_nacimiento,
                peso: new_weight,
                estado: animal.estado,
                propietario: animal.propietario,
                frigorifico: animal.frigorifico,
                certificador: animal.certificador,
                exportador: animal.exportador,
                lote_id: animal.lote_id,
            };
            self.animal_data.write(animal_id, updated_animal);
        }

        // ========== FUNCIONES DE CONSULTA PARA PRODUCTORES ==========
        
        fn get_animals_by_producer(
            self: @ContractState,
            producer: ContractAddress
        ) -> Array<u128> {
            let count = self._get_animals_by_owner_count(producer);
            let mut animals = ArrayTrait::new();
            
            let mut i: u32 = 0;
            loop {
                if i >= count {
                    break;
                }
                let animal_id = self._get_animal_at_owner_index(producer, i);
                animals.append(animal_id);
                i += 1;
            };
            animals
        }
        
        fn get_batches_by_producer(
            self: @ContractState,
            producer: ContractAddress
        ) -> Array<u128> {
            let count = self._get_batches_by_owner_count(producer);
            let mut batches = ArrayTrait::new();
            
            let mut i: u32 = 0;
            loop {
                if i >= count {
                    break;
                }
                let batch_id = self._get_batch_at_owner_index(producer, i);
                batches.append(batch_id);
                i += 1;
            };
            batches
        }
        
        fn get_producer_stats(
            self: @ContractState,
            producer: ContractAddress
        ) -> (u32, u32, u128) {
            let animals_count = self._get_animals_by_owner_count(producer);
            let batches_count = self._get_batches_by_owner_count(producer);
            
            let mut total_weight: u128 = 0;
            let mut i: u32 = 0;
            loop {
                if i >= animals_count {
                    break;
                }
                let animal_id = self._get_animal_at_owner_index(producer, i);
                let animal = self.animal_data.read(animal_id);
                total_weight += animal.peso;
                i += 1;
            };
            
            (animals_count, batches_count, total_weight)
        }

        // ========== FUNCIONES DE GESTIÓN DE LOTES ==========
        
        fn create_animal_batch(ref self: ContractState, animal_ids: Array<u128>) -> u128 {
            self._check_role(PRODUCER_ROLE);
            
            let caller = get_caller_address();
            let lote_id = self.next_lote_id.read();
            self.next_lote_id.write(lote_id + 1);
            
            let mut peso_total: u128 = 0;
            let mut cantidad: u32 = 0;
            let mut i: u32 = 0;
            
            // Validar y agregar animales al lote
            loop {
                if i >= animal_ids.len() {
                    break;
                }
                
                let animal_id = *animal_ids.at(i);
                let animal = self.animal_data.read(animal_id);
                
                assert!(animal.propietario == caller, "Not owner of animal");
                assert!(animal.lote_id == 0, "Animal already in a batch");
                assert!(!self.quarantined_animals.read(animal_id), "Animal in quarantine");
                
                // Agregar al lote
                self.animales_en_lote.write((lote_id, animal_id), true);
                self.lotes_por_animal.write(animal_id, lote_id);
                
                // Actualizar animal con referencia al lote
                let updated_animal = AnimalData {
                    raza: animal.raza,
                    fecha_nacimiento: animal.fecha_nacimiento,
                    peso: animal.peso,
                    estado: animal.estado,
                    propietario: animal.propietario,
                    frigorifico: animal.frigorifico,
                    certificador: animal.certificador,
                    exportador: animal.exportador,
                    lote_id: lote_id,
                };
                self.animal_data.write(animal_id, updated_animal);
                
                peso_total += animal.peso;
                cantidad += 1;
                i += 1;
            };
            
            self.animales_por_lote_count.write(lote_id, cantidad);
            
            let lote_data = LoteAnimalData {
                propietario: caller,
                frigorifico: 0.try_into().unwrap(),
                fecha_creacion: get_block_timestamp(),
                fecha_transferencia: 0,
                fecha_procesamiento: 0,
                estado: 0,
                cantidad_animales: cantidad,
                peso_total: peso_total,
            };
            
            self.lotes_animales.write(lote_id, lote_data);
            
            // Actualizar índices
            self._add_batch_to_owner(caller, lote_id);
            
            self.total_batches_created.write(self.total_batches_created.read() + 1);
            
            self.emit(Event::LoteAnimalCreado(LoteAnimalCreado {
                lote_id: lote_id,
                propietario: caller,
                cantidad_animales: cantidad,
                peso_total: peso_total,
                timestamp: get_block_timestamp(),
            }));
            
            lote_id
        }
        
        fn add_animals_to_batch(ref self: ContractState, batch_id: u128, animal_ids: Array<u128>) {
            self._check_role(PRODUCER_ROLE);
            
            let caller = get_caller_address();
            let mut lote = self.lotes_animales.read(batch_id);
            
            assert!(lote.propietario == caller, "Not owner of batch");
            assert!(lote.estado == 0, "Batch already transferred");
            
            let mut i: u32 = 0;
            loop {
                if i >= animal_ids.len() {
                    break;
                }
                
                let animal_id = *animal_ids.at(i);
                let animal = self.animal_data.read(animal_id);
                
                assert!(animal.propietario == caller, "Not owner of animal");
                assert!(animal.lote_id == 0, "Animal already in a batch");
                assert!(!self.quarantined_animals.read(animal_id), "Animal in quarantine");
                
                // Agregar al lote
                self.animales_en_lote.write((batch_id, animal_id), true);
                self.lotes_por_animal.write(animal_id, batch_id);
                
                // Actualizar animal
                let updated_animal = AnimalData {
                    raza: animal.raza,
                    fecha_nacimiento: animal.fecha_nacimiento,
                    peso: animal.peso,
                    estado: animal.estado,
                    propietario: animal.propietario,
                    frigorifico: animal.frigorifico,
                    certificador: animal.certificador,
                    exportador: animal.exportador,
                    lote_id: batch_id,
                };
                self.animal_data.write(animal_id, updated_animal);
                
                lote.peso_total += animal.peso;
                lote.cantidad_animales += 1;
                
                i += 1;
            };
            
            self.lotes_animales.write(batch_id, lote);
            self.animales_por_lote_count.write(batch_id, lote.cantidad_animales);
        }
        
        fn transfer_batch_to_frigorifico(
            ref self: ContractState, 
            batch_id: u128, 
            frigorifico: ContractAddress
        ) {
            self._check_role(PRODUCER_ROLE);
            
            let caller = get_caller_address();
            let mut lote = self.lotes_animales.read(batch_id);
            
            assert!(lote.propietario == caller, "Not owner of batch");
            assert!(lote.estado == 0, "Batch already transferred");
            assert!(self._has_role(FRIGORIFICO_ROLE, frigorifico), "Recipient must have FRIGORIFICO_ROLE");
            
            // Transferir cada animal del lote
            let animal_ids = self._get_animal_ids_in_batch(batch_id);
            let mut i: u32 = 0;
            loop {
                if i >= animal_ids.len() {
                    break;
                }
                
                let animal_id = *animal_ids.at(i);
                self._transfer_animal_internal(animal_id, caller, frigorifico);
                
                i += 1;
            };
            
            // Actualizar datos del lote
            lote.frigorifico = frigorifico;
            lote.fecha_transferencia = get_block_timestamp();
            lote.estado = 1;
            self.lotes_animales.write(batch_id, lote);
            
            // Actualizar índices de lotes
            self._update_batch_owner_index(batch_id, caller, frigorifico);
            
            self.emit(Event::LoteAnimalTransferido(LoteAnimalTransferido {
                lote_id: batch_id,
                from: caller,
                to: frigorifico,
                cantidad_animales: lote.cantidad_animales,
                timestamp: get_block_timestamp(),
            }));
        }
        
        fn get_batch_info(
            self: @ContractState, 
            batch_id: u128
        ) -> (LoteAnimalData, Array<u128>) {
            let lote_data = self.lotes_animales.read(batch_id);
            let animal_ids = self._get_animal_ids_in_batch(batch_id);
            (lote_data, animal_ids)
        }

        // ========== FUNCIONES DE VETERINARIO CON AUTORIZACIÓN ==========
        
        fn authorize_veterinarian_for_animal(
            ref self: ContractState,
            veterinarian: ContractAddress,
            animal_id: u128
        ) {
            let caller = get_caller_address();
            let animal = self.animal_data.read(animal_id);
            
            assert!(animal.propietario == caller, "Only animal owner can authorize veterinarians");
            assert!(self._has_role(VET_ROLE, veterinarian), "Account must have VET_ROLE");
            
            self.authorized_veterinarians.write((animal_id, veterinarian), true);
            
            self.emit(Event::VeterinarianAuthorized(VeterinarianAuthorized {
                animal_id: animal_id,
                veterinarian: veterinarian,
                authorizer: caller,
                timestamp: get_block_timestamp(),
            }));
        }
        
        fn revoke_veterinarian_authorization(
            ref self: ContractState,
            veterinarian: ContractAddress,
            animal_id: u128
        ) {
            let caller = get_caller_address();
            let animal = self.animal_data.read(animal_id);
            
            assert!(animal.propietario == caller, "Only animal owner can revoke authorization");
            
            self.authorized_veterinarians.write((animal_id, veterinarian), false);
        }
        
        fn add_health_record(
            ref self: ContractState,
            animal_id: u128,
            diagnosis: felt252,
            treatment: felt252,
            vaccination: felt252
        ) {
            self._check_role(VET_ROLE);
            
            let caller = get_caller_address();
            let animal = self.animal_data.read(animal_id);
            
            // Verificar autorización o que el veterinario es el dueño
            let is_authorized = self.authorized_veterinarians.read((animal_id, caller));
            assert!(is_authorized || animal.propietario == caller, "Not authorized for this animal");
            
            let count = self.health_records_count.read(animal_id);
            self.health_records_count.write(animal_id, count + 1);
        }
        
        fn quarantine_animal(ref self: ContractState, animal_id: u128, reason: felt252) {
            self._check_role(VET_ROLE);
            
            let caller = get_caller_address();
            let animal = self.animal_data.read(animal_id);
            
            // Verificar autorización o que el veterinario es el dueño
            let is_authorized = self.authorized_veterinarians.read((animal_id, caller));
            assert!(is_authorized || animal.propietario == caller, "Not authorized for this animal");
            
            self.quarantined_animals.write(animal_id, true);
            self.quarantine_reason.write(animal_id, reason);
            
            self.emit(Event::AnimalQuarantined(AnimalQuarantined {
                animal_id: animal_id,
                reason: reason,
                vet: caller,
                timestamp: get_block_timestamp(),
            }));
        }
        
        fn clear_quarantine(ref self: ContractState, animal_id: u128) {
            self._check_role(VET_ROLE);
            
            let caller = get_caller_address();
            let animal = self.animal_data.read(animal_id);
            
            // Verificar autorización o que el veterinario es el dueño
            let is_authorized = self.authorized_veterinarians.read((animal_id, caller));
            assert!(is_authorized || animal.propietario == caller, "Not authorized for this animal");
            
            self.quarantined_animals.write(animal_id, false);
            self.quarantine_reason.write(animal_id, 0);
        }

        // ========== FUNCIONES DE FRIGORÍFICO ==========
        
        fn procesar_animal(ref self: ContractState, animal_id: u128) {
            self._check_role(FRIGORIFICO_ROLE);
            
            self._validate_transfer_conditions(animal_id);

            let caller = get_caller_address();
            let animal = self.animal_data.read(animal_id);
            
            assert!(animal.estado == 0, "Animal already processed");
            assert!(animal.propietario == caller, "Only owner can process");
            
            let updated_animal = AnimalData {
                raza: animal.raza,
                fecha_nacimiento: animal.fecha_nacimiento,
                peso: animal.peso,
                estado: 1, // Processed
                propietario: animal.propietario,
                frigorifico: caller,
                certificador: animal.certificador,
                exportador: animal.exportador,
                lote_id: animal.lote_id,
            };
            
            self.animal_data.write(animal_id, updated_animal);
            
            // REGISTRO DE HISTORIAL
            self._record_animal_history(animal_id, 'ANIMAL_PROCESADO');
            
            self.emit(Event::AnimalProcesado(AnimalProcesado {
                animal_id: animal_id,
                frigorifico: caller,
                timestamp: get_block_timestamp(),
            }));
        }
        
        fn procesar_batch(ref self: ContractState, batch_id: u128) {
            self._check_role(FRIGORIFICO_ROLE);
            
            let caller = get_caller_address();
            let mut lote = self.lotes_animales.read(batch_id);
            
            assert!(lote.frigorifico == caller, "Not assigned frigorifico");
            assert!(lote.estado == 1, "Batch not transferred or already processed");
            
            let animal_ids = self._get_animal_ids_in_batch(batch_id);
            let mut i: u32 = 0;
            let mut processed_count: u32 = 0;
            
            loop {
                if i >= animal_ids.len() {
                    break;
                }
                
                let animal_id = *animal_ids.at(i);
                let animal = self.animal_data.read(animal_id);
                
                // Solo procesar si no está procesado y no en cuarentena
                if animal.estado == 0 && !self.quarantined_animals.read(animal_id) {
                    let updated_animal = AnimalData {
                        raza: animal.raza,
                        fecha_nacimiento: animal.fecha_nacimiento,
                        peso: animal.peso,
                        estado: 1,
                        propietario: animal.propietario,
                        frigorifico: caller,
                        certificador: animal.certificador,
                        exportador: animal.exportador,
                        lote_id: animal.lote_id,
                    };
                    self.animal_data.write(animal_id, updated_animal);
                    processed_count += 1;
                }
                
                i += 1;
            };
            
            // Actualizar estado del lote
            lote.estado = 2; // Procesado
            lote.fecha_procesamiento = get_block_timestamp();
            self.lotes_animales.write(batch_id, lote);
            
            self.emit(Event::LoteAnimalProcesado(LoteAnimalProcesado {
                lote_id: batch_id,
                frigorifico: caller,
                cantidad_animales: processed_count,
                timestamp: get_block_timestamp(),
            }));
        }

        fn crear_corte(
            ref self: ContractState,
            animal_id: u128,
            tipo_corte: u128,
            peso: u128
        ) -> u128 {
            self._check_role(FRIGORIFICO_ROLE);
            
            let caller = get_caller_address();
            let animal = self.animal_data.read(animal_id);
            
            assert!(animal.estado >= 1, "Animal not processed");
            assert!(animal.frigorifico == caller, "Only assigned frigorifico");
            assert!(animal.propietario == caller, "Only owner can create cuts");
            
            let corte_count = self.animal_cortes.read(animal_id);
            let corte_id = corte_count + 1;
            
            let corte_data = CorteData {
                tipo_corte: tipo_corte,
                peso: peso,
                fecha_procesamiento: get_block_timestamp(),
                frigorifico: caller,
                certificado: false,
                lote_exportacion: 0,
                propietario: caller,
                animal_id: animal_id,
            };
            
            self.cortes_data.write((animal_id, corte_id), corte_data);
            self.corte_owner.write((animal_id, corte_id), caller);
            self.animal_cortes.write(animal_id, corte_id);
            
            // Actualizar contador global de cortes
            self.total_cortes_created.write(self.total_cortes_created.read() + 1);
            
            let qr_hash = animal_id.into() + corte_id.into();
            
            // REGISTRO DE HISTORIAL - Agregar esta línea al final
            self._record_corte_history(animal_id, corte_id, 'CORTE_CREADO');
            
            self.emit(Event::CorteCreado(CorteCreado {
                animal_id: animal_id,
                corte_id: corte_id,
                tipo_corte: tipo_corte,
                peso: peso,
                frigorifico: caller,
                qr_hash: qr_hash,
            }));
            
            corte_id
        }
        
        fn crear_cortes_para_batch(
            ref self: ContractState,
            batch_id: u128,
            tipos_corte: Array<u128>,
            pesos: Array<u128>
        ) -> Array<u128> {
            self._check_role(FRIGORIFICO_ROLE);
            
            let caller = get_caller_address();
            let lote = self.lotes_animales.read(batch_id);
            
            assert!(lote.frigorifico == caller, "Not assigned frigorifico");
            assert!(lote.estado == 2, "Batch not processed");
            
            let animal_ids = self._get_animal_ids_in_batch(batch_id);
            let mut cortes_creados = ArrayTrait::new();
            let mut total_cortes: u32 = 0;
            
            let mut i: u32 = 0;
            loop {
                if i >= animal_ids.len() {
                    break;
                }
                
                let animal_id = *animal_ids.at(i);
                let animal = self.animal_data.read(animal_id);
                
                // Solo crear cortes para animales procesados
                if animal.estado >= 1 {
                    let mut j: u32 = 0;
                    loop {
                        if j >= tipos_corte.len() {
                            break;
                        }
                        
                        let tipo_corte = *tipos_corte.at(j);
                        let peso_corte = *pesos.at(j);
                        
                        let corte_count = self.animal_cortes.read(animal_id);
                        let corte_id = corte_count + 1;
                        
                        let corte_data = CorteData {
                            tipo_corte: tipo_corte,
                            peso: peso_corte,
                            fecha_procesamiento: get_block_timestamp(),
                            frigorifico: caller,
                            certificado: false,
                            lote_exportacion: 0,
                            propietario: caller,
                            animal_id: animal_id,
                        };
                        
                        self.cortes_data.write((animal_id, corte_id), corte_data);
                        self.corte_owner.write((animal_id, corte_id), caller);
                        self.animal_cortes.write(animal_id, corte_id);
                        
                        cortes_creados.append(corte_id);
                        total_cortes += 1;
                        
                        j += 1;
                    };
                }
                
                i += 1;
            };
            
            // Actualizar contador global de cortes
            self.total_cortes_created.write(self.total_cortes_created.read() + total_cortes.into());
            
            self.emit(Event::CortesBatchCreados(CortesBatchCreados {
                lote_id: batch_id,
                cantidad_cortes: total_cortes,
                frigorifico: caller,
                timestamp: get_block_timestamp(),
            }));
            
            cortes_creados
        }

        // ========== FUNCIONES DE IoT ==========
        
        fn record_iot_reading(
            ref self: ContractState,
            animal_id: u128,
            reading: IoTReading
        ) {
            self._check_role(IOT_ROLE);
            
            // Verificar que el animal existe
            let animal = self.animal_data.read(animal_id);
            let zero_address: ContractAddress = 0.try_into().unwrap();
            assert!(animal.propietario != zero_address, "Animal does not exist");
            
            // Guardar reading
            let count = self.iot_readings_count.read(animal_id);
            self.iot_readings.write((animal_id, count), reading);
            self.iot_readings_count.write(animal_id, count + 1);
            
            // Actualizar último reading por tipo
            self.latest_reading_by_type.write((animal_id, reading.reading_type), reading);
            
            self.emit(Event::IoTDataRecorded(IoTDataRecorded {
                animal_id: animal_id,
                reading_type: reading.reading_type,
                device_id: reading.device_id,
                timestamp: reading.timestamp,
            }));
        }
        
        fn get_latest_iot_reading(
            self: @ContractState,
            animal_id: u128,
            reading_type: felt252
        ) -> IoTReading {
            self.latest_reading_by_type.read((animal_id, reading_type))
        }
        
        fn get_iot_history_count(
            self: @ContractState,
            animal_id: u128
        ) -> u32 {
            self.iot_readings_count.read(animal_id)
        }

        // ========== FUNCIONES DE CERTIFICADOR ==========
        
        fn certify_animal(
            ref self: ContractState,
            animal_id: u128,
            certification_data: CertificationData
        ) {
            self._check_role(CERTIFIER_ROLE);
            
            let animal = self.animal_data.read(animal_id);
            assert!(animal.estado >= 1, "Animal must be processed");
            assert!(!self.quarantined_animals.read(animal_id), "Animal in quarantine");
            
            self.certifications.write(animal_id, certification_data);
            self.certified_animals.write(animal_id, true);
            
            // Actualizar estado del animal
            let updated_animal = AnimalData {
                raza: animal.raza,
                fecha_nacimiento: animal.fecha_nacimiento,
                peso: animal.peso,
                estado: 2, // Certified
                propietario: animal.propietario,
                frigorifico: animal.frigorifico,
                certificador: get_caller_address(),
                exportador: animal.exportador,
                lote_id: animal.lote_id,
            };
            self.animal_data.write(animal_id, updated_animal);
            
            // REGISTRO DE HISTORIAL
            self._record_animal_history(animal_id, 'ANIMAL_CERTIFICADO');
            
            self.emit(Event::AnimalCertified(AnimalCertified {
                animal_id: animal_id,
                certification_type: certification_data.certification_type,
                certifier: certification_data.certifier,
                timestamp: certification_data.certification_date,
            }));
        }
        
        fn certify_corte(
            ref self: ContractState,
            animal_id: u128,
            corte_id: u128
        ) {
            self._check_role(CERTIFIER_ROLE);
            
            // Verificar que el animal está certificado
            assert!(self.certified_animals.read(animal_id), "Animal not certified");
            
            let corte = self.cortes_data.read((animal_id, corte_id));
            let updated_corte = CorteData {
                tipo_corte: corte.tipo_corte,
                peso: corte.peso,
                fecha_procesamiento: corte.fecha_procesamiento,
                frigorifico: corte.frigorifico,
                certificado: true,
                lote_exportacion: corte.lote_exportacion,
                propietario: corte.propietario,
                animal_id: corte.animal_id,
            };
            self.cortes_data.write((animal_id, corte_id), updated_corte);
        }
        
        fn certify_batch(
            ref self: ContractState,
            batch_id: u128,
            certification_data: CertificationData
        ) {
            self._check_role(CERTIFIER_ROLE);
            
            let animal_ids = self._get_animal_ids_in_batch(batch_id);
            let mut i: u32 = 0;
            
            loop {
                if i >= animal_ids.len() {
                    break;
                }
                
                let animal_id = *animal_ids.at(i);
                let animal = self.animal_data.read(animal_id);
                
                if animal.estado >= 1 && !self.quarantined_animals.read(animal_id) {
                    self.certifications.write(animal_id, certification_data);
                    self.certified_animals.write(animal_id, true);
                    
                    let updated_animal = AnimalData {
                        raza: animal.raza,
                        fecha_nacimiento: animal.fecha_nacimiento,
                        peso: animal.peso,
                        estado: 2, // Certified
                        propietario: animal.propietario,
                        frigorifico: animal.frigorifico,
                        certificador: get_caller_address(),
                        exportador: animal.exportador,
                        lote_id: animal.lote_id,
                    };
                    self.animal_data.write(animal_id, updated_animal);
                    
                    self.emit(Event::AnimalCertified(AnimalCertified {
                        animal_id: animal_id,
                        certification_type: certification_data.certification_type,
                        certifier: certification_data.certifier,
                        timestamp: certification_data.certification_date,
                    }));
                }
                
                i += 1;
            };
        }
        
        fn revoke_certification(
            ref self: ContractState,
            animal_id: u128,
            reason: felt252
        ) {
            self._check_role(CERTIFIER_ROLE);
            
            self.certified_animals.write(animal_id, false);
        }

        // ========== FUNCIONES DE EXPORTADOR ==========
        
        fn prepare_export_batch(
            ref self: ContractState,
            animal_ids: Array<u128>,
            destination: felt252,
            container_id: felt252
        ) -> u128 {
            self._check_role(EXPORTER_ROLE);
            
            let batch_id = self.next_batch_id.read();
            self.next_batch_id.write(batch_id + 1);
            
            let mut count: u32 = 0;
            let mut i: u32 = 0;
            loop {
                if i >= animal_ids.len() {
                    break;
                }
                
                let animal_id = *animal_ids.at(i);
                
                // Verificar que el animal está certificado
                assert!(self.certified_animals.read(animal_id), "Animal not certified");
                
                // Asociar animal al batch
                self.animal_export_batch.write(animal_id, batch_id);
                count += 1;
                i += 1;
            };
            
            self.batch_animals_count.write(batch_id, count);
            
            let export_data = ExportData {
                export_date: get_block_timestamp(),
                destination_country: destination,
                export_permit: 0, // Se actualiza en confirm_export
                container_id: container_id,
                temperature_range: (-18, -15), // Default frozen range
                exporter: get_caller_address(),
            };
            
            self.export_batches.write(batch_id, export_data);
            
            self.emit(Event::ExportBatchCreated(ExportBatchCreated {
                batch_id: batch_id,
                destination: destination,
                container_id: container_id,
                exporter: get_caller_address(),
                timestamp: get_block_timestamp(),
            }));
            
            batch_id
        }
        
        fn confirm_export(
            ref self: ContractState,
            batch_id: u128,
            export_permit: felt252
        ) {
            self._check_role(EXPORTER_ROLE);
            
            let export_data = self.export_batches.read(batch_id);
            assert!(export_data.exporter == get_caller_address(), "Not batch exporter");
            
            let updated_export = ExportData {
                export_date: export_data.export_date,
                destination_country: export_data.destination_country,
                export_permit: export_permit,
                container_id: export_data.container_id,
                temperature_range: export_data.temperature_range,
                exporter: export_data.exporter,
            };
            
            self.export_batches.write(batch_id, updated_export);
        }
        
        fn update_export_temperature(
            ref self: ContractState,
            batch_id: u128,
            temperature: i32
        ) {
            self._check_role(EXPORTER_ROLE);
            
            let export_data = self.export_batches.read(batch_id);
            let (min_temp, max_temp) = export_data.temperature_range;
            
            // Actualizar rango de temperatura si es necesario
            let new_min = if temperature < min_temp { temperature } else { min_temp };
            let new_max = if temperature > max_temp { temperature } else { max_temp };
            
            let updated_export = ExportData {
                export_date: export_data.export_date,
                destination_country: export_data.destination_country,
                export_permit: export_data.export_permit,
                container_id: export_data.container_id,
                temperature_range: (new_min, new_max),
                exporter: export_data.exporter,
            };
            
            self.export_batches.write(batch_id, updated_export);
        }

        // ========== FUNCIONES DE ADMINISTRACIÓN DE ROLES ==========
        
        fn grant_role(ref self: ContractState, role: felt252, account: ContractAddress) {
            let admin_role = self.role_admin.read(role);
            self._check_role(admin_role);
            
            // Registrar participante si no existe
            let existing_info = self.participant_info.read(account);
            let zero_address: ContractAddress = 0.try_into().unwrap();
            if existing_info.direccion == zero_address {
                let default_info = ParticipantInfo {
                    nombre: 'Participante Sin Nombre',
                    direccion: account,
                    fecha_registro: get_block_timestamp(),
                    activo: true,
                    metadata: 'Registrado auto al asignar rol',
                };
                self.participant_info.write(account, default_info);
            }
            
            self._grant_role(role, account);
        }
        
        fn revoke_role(ref self: ContractState, role: felt252, account: ContractAddress) {
            let admin_role = self.role_admin.read(role);
            self._check_role(admin_role);
            self._revoke_role(role, account);
        }
        
        fn renounce_role(ref self: ContractState, role: felt252) {
            let caller = get_caller_address();
            self._revoke_role(role, caller);
        }
        
        fn has_role(self: @ContractState, role: felt252, account: ContractAddress) -> bool {
            self._has_role(role, account)
        }
        
        fn get_role_admin(self: @ContractState, role: felt252) -> felt252 {
            self.role_admin.read(role)
        }
        
        fn set_role_admin(ref self: ContractState, role: felt252, admin_role: felt252) {
            let current_admin = self.role_admin.read(role);
            self._check_role(current_admin);
            self.role_admin.write(role, admin_role);
        }

        // ========== FUNCIONES DE TRANSFERENCIA ==========
        
        fn transfer_animal(ref self: ContractState, to: ContractAddress, animal_id: u128) {
            let caller = get_caller_address();
            let owner = self.token_owner.read(animal_id);
            
            assert!(caller == owner, "Not the owner");
            self._validate_transfer_conditions(animal_id);
            
            self._transfer_animal_internal(animal_id, caller, to);
            
            self.emit(Event::AnimalTransferred(AnimalTransferred {
                animal_id: animal_id,
                from: caller,
                to: to,
                timestamp: get_block_timestamp(),
                transfer_type: 'STANDARD_TRANSFER',
            }));
        }
        
        fn transfer_animal_to_frigorifico(
            ref self: ContractState, 
            animal_id: u128, 
            frigorifico: ContractAddress
        ) {
            self._check_role(PRODUCER_ROLE);
            
            let caller = get_caller_address();
            let owner = self.token_owner.read(animal_id);
            
            assert!(caller == owner, "Not the owner");
            self._validate_transfer_conditions(animal_id);
            
            // Verificar que el destinatario tiene rol de frigorífico
            assert!(self._has_role(FRIGORIFICO_ROLE, frigorifico), "Recipient must have FRIGORIFICO_ROLE");
            
            self._transfer_animal_internal(animal_id, caller, frigorifico);
            
            self.emit(Event::AnimalTransferred(AnimalTransferred {
                animal_id: animal_id,
                from: caller,
                to: frigorifico,
                timestamp: get_block_timestamp(),
                transfer_type: 'PRODUCER_TO_FRIGORIFICO',
            }));
        }
        
        fn transfer_corte_to_exportador(
            ref self: ContractState,
            animal_id: u128,
            corte_id: u128,
            exportador: ContractAddress
        ) {
            self._check_role(FRIGORIFICO_ROLE);
            
            let caller = get_caller_address();
            
            // Verificar que el caller es el propietario del corte
            let corte_owner = self.corte_owner.read((animal_id, corte_id));
            assert!(corte_owner == caller, "Not the owner of this cut");
            
            // Verificar que el destinatario tiene rol de exportador
            assert!(self._has_role(EXPORTER_ROLE, exportador), "Recipient must have EXPORTER_ROLE");
            
            // Transferir propiedad del corte
            self.corte_owner.write((animal_id, corte_id), exportador);
            
            // Actualizar propietario en CorteData
            let corte = self.cortes_data.read((animal_id, corte_id));
            let updated_corte = CorteData {
                tipo_corte: corte.tipo_corte,
                peso: corte.peso,
                fecha_procesamiento: corte.fecha_procesamiento,
                frigorifico: corte.frigorifico,
                certificado: corte.certificado,
                lote_exportacion: corte.lote_exportacion,
                propietario: exportador,
                animal_id: corte.animal_id,
            };
            self.cortes_data.write((animal_id, corte_id), updated_corte);
            
            self.emit(Event::CorteTransferred(CorteTransferred {
                animal_id: animal_id,
                corte_id: corte_id,
                from: caller,
                to: exportador,
                timestamp: get_block_timestamp(),
            }));
        }
        
        fn batch_transfer_cortes(
            ref self: ContractState,
            animal_id: u128,
            corte_ids: Array<u128>,
            exportador: ContractAddress
        ) {
            self._check_role(FRIGORIFICO_ROLE);
            
            let caller = get_caller_address();
            
            // Verificar que el destinatario tiene rol de exportador
            assert!(self._has_role(EXPORTER_ROLE, exportador), "Recipient must have EXPORTER_ROLE");
            
            let mut i: u32 = 0;
            loop {
                if i >= corte_ids.len() {
                    break;
                }
                
                let corte_id = *corte_ids.at(i);
                
                // Verificar que el caller es el propietario del corte
                let corte_owner = self.corte_owner.read((animal_id, corte_id));
                assert!(corte_owner == caller, "Not the owner of this cut");
                
                // Transferir propiedad del corte
                self.corte_owner.write((animal_id, corte_id), exportador);
                
                // Actualizar propietario en CorteData
                let corte = self.cortes_data.read((animal_id, corte_id));
                let updated_corte = CorteData {
                    tipo_corte: corte.tipo_corte,
                    peso: corte.peso,
                    fecha_procesamiento: corte.fecha_procesamiento,
                    frigorifico: corte.frigorifico,
                    certificado: corte.certificado,
                    lote_exportacion: corte.lote_exportacion,
                    propietario: exportador,
                    animal_id: corte.animal_id,
                };
                self.cortes_data.write((animal_id, corte_id), updated_corte);
                
                self.emit(Event::CorteTransferred(CorteTransferred {
                    animal_id: animal_id,
                    corte_id: corte_id,
                    from: caller,
                    to: exportador,
                    timestamp: get_block_timestamp(),
                }));
                
                i += 1;
            };
        }
        
        fn batch_transfer_cortes_para_lote(
            ref self: ContractState,
            batch_id: u128,
            exportador: ContractAddress
        ) {
            self._check_role(FRIGORIFICO_ROLE);
            
            let caller = get_caller_address();
            assert!(self._has_role(EXPORTER_ROLE, exportador), "Recipient must have EXPORTER_ROLE");
            
            let animal_ids = self._get_animal_ids_in_batch(batch_id);
            let mut i: u32 = 0;
            let mut cortes_transferidos: u32 = 0;
            
            loop {
                if i >= animal_ids.len() {
                    break;
                }
                
                let animal_id = *animal_ids.at(i);
                let num_cortes = self.animal_cortes.read(animal_id);
                
                // Transferir todos los cortes del animal
                if num_cortes > 0 {
                    let mut corte_id: u128 = 1;
                    loop {
                        if corte_id > num_cortes {
                            break;
                        }
                        
                        let corte_owner = self.corte_owner.read((animal_id, corte_id));
                        if corte_owner == caller {
                            self.corte_owner.write((animal_id, corte_id), exportador);
                            
                            let corte = self.cortes_data.read((animal_id, corte_id));
                            let updated_corte = CorteData {
                                tipo_corte: corte.tipo_corte,
                                peso: corte.peso,
                                fecha_procesamiento: corte.fecha_procesamiento,
                                frigorifico: corte.frigorifico,
                                certificado: corte.certificado,
                                lote_exportacion: corte.lote_exportacion,
                                propietario: exportador,
                                animal_id: corte.animal_id,
                            };
                            self.cortes_data.write((animal_id, corte_id), updated_corte);
                            
                            cortes_transferidos += 1;
                            
                            self.emit(Event::CorteTransferred(CorteTransferred {
                                animal_id: animal_id,
                                corte_id: corte_id,
                                from: caller,
                                to: exportador,
                                timestamp: get_block_timestamp(),
                            }));
                        }
                        
                        corte_id += 1;
                    };
                }
                
                i += 1;
            };
        }

        // ========== FUNCIONES DE CONSULTA GENERAL ==========
        
        fn get_info_animal(
            self: @ContractState,
            animal_id: u128
        ) -> (AnimalData, u128, felt252) {
            let animal = self.animal_data.read(animal_id);
            let num_cortes = self.animal_cortes.read(animal_id);
            let qr_hash = self.qr_data.read(animal_id);
            (animal, num_cortes, qr_hash)
        }

        fn get_info_corte(
            self: @ContractState,
            animal_id: u128,
            corte_id: u128
        ) -> CorteData {
            self.cortes_data.read((animal_id, corte_id))
        }
        
        fn get_certification_data(
            self: @ContractState,
            animal_id: u128
        ) -> CertificationData {
            self.certifications.read(animal_id)
        }
        
        fn get_export_data(
            self: @ContractState,
            batch_id: u128
        ) -> ExportData {
            self.export_batches.read(batch_id)
        }

        fn owner_of(self: @ContractState, token_id: u128) -> ContractAddress {
            self.token_owner.read(token_id)
        }

        fn token_uri(self: @ContractState, token_id: u128) -> felt252 {
            self.token_uri.read(token_id)
        }

        fn get_animal_data(self: @ContractState, animal_id: u128) -> AnimalData {
            self.animal_data.read(animal_id)
        }

        fn get_num_cortes(self: @ContractState, animal_id: u128) -> u128 {
            self.animal_cortes.read(animal_id)
        }
        
        fn is_quarantined(self: @ContractState, animal_id: u128) -> bool {
            self.quarantined_animals.read(animal_id)
        }
        
        fn get_corte_owner(self: @ContractState, animal_id: u128, corte_id: u128) -> ContractAddress {
            self.corte_owner.read((animal_id, corte_id))
        }
        
        fn get_animals_in_batch(self: @ContractState, batch_id: u128) -> Array<u128> {
            self._get_animal_ids_in_batch(batch_id)
        }
        
        fn get_batch_for_animal(self: @ContractState, animal_id: u128) -> u128 {
            self.lotes_por_animal.read(animal_id)
        }
        
        // ========== FUNCIONES DE ESTADÍSTICAS DEL SISTEMA ==========
        
        fn get_system_stats(
            self: @ContractState
        ) -> (u128, u128, u128, u128, u128, u128, u128) {
            let total_animals = self.total_animals_created.read();
            let total_batches = self.total_batches_created.read();
            let total_cortes = self.total_cortes_created.read();
            let next_token_id = self.next_token_id.read();
            let next_batch_id = self.next_batch_id.read();
            let next_lote_id = self.next_lote_id.read();
            
            // Calcular animales procesados
            let mut processed_animals: u128 = 0;
            let mut i: u128 = 1;
            loop {
                if i >= next_token_id {
                    break;
                }
                let animal = self.animal_data.read(i);
                if animal.estado >= 1 {
                    processed_animals += 1;
                }
                i += 1;
            };
            
            (total_animals, total_batches, total_cortes, processed_animals, next_token_id, next_batch_id, next_lote_id)
        }
        
        fn get_role_stats(
            self: @ContractState
        ) -> (u32, u32, u32, u32, u32, u32, u32) {
            let producers = self.role_member_count.read(PRODUCER_ROLE);
            let frigorificos = self.role_member_count.read(FRIGORIFICO_ROLE);
            let veterinarians = self.role_member_count.read(VET_ROLE);
            let iot = self.role_member_count.read(IOT_ROLE);
            let certifiers = self.role_member_count.read(CERTIFIER_ROLE);
            let exporters = self.role_member_count.read(EXPORTER_ROLE);
            let auditors = self.role_member_count.read(AUDITOR_ROLE);
            
            (producers, frigorificos, veterinarians, iot, certifiers, exporters, auditors)
        }

        // ========== FUNCIONES DE CÓDIGOS QR ==========
        
        fn generate_qr_for_corte(
            ref self: ContractState,
            animal_id: u128,
            corte_id: u128
        ) -> felt252 {
            self._check_role(FRIGORIFICO_ROLE);
            
            let caller = get_caller_address();
            let corte = self.cortes_data.read((animal_id, corte_id));
            
            assert!(corte.propietario == caller, "Not owner of this cut");
            
            let qr_data_str = animal_id.into() + ':' + corte_id.into();
            let qr_hash = self._generate_qr_hash(qr_data_str);
            
            let qr_data = QRData {
                qr_hash: qr_hash,
                animal_id: animal_id,
                corte_id: corte_id,
                timestamp: get_block_timestamp(),
                data_type: 'CORTE',
                metadata: 'Corte de carne trazable',
            };
            
            self.qr_codes.write(qr_hash, qr_data);
            self.qr_to_corte.write(qr_hash, (animal_id, corte_id));
            
            // Registrar en historial
            self._record_corte_history(animal_id, corte_id, 'QR_GENERATED');
            
            self.emit(Event::QRCodeGenerated(QRCodeGenerated {
                qr_hash: qr_hash,
                animal_id: animal_id,
                corte_id: corte_id,
                data_type: 'CORTE',
                timestamp: get_block_timestamp(),
            }));
            
            qr_hash
        }
        
        fn generate_qr_for_animal(
            ref self: ContractState,
            animal_id: u128
        ) -> felt252 {
            self._check_role(PRODUCER_ROLE);
            
            let caller = get_caller_address();
            let animal = self.animal_data.read(animal_id);
            
            assert!(animal.propietario == caller, "Not owner of this animal");
            
            let qr_data_str = animal_id.into() + ':ANIMAL';
            let qr_hash = self._generate_qr_hash(qr_data_str);
            
            let qr_data = QRData {
                qr_hash: qr_hash,
                animal_id: animal_id,
                corte_id: 0,
                timestamp: get_block_timestamp(),
                data_type: 'ANIMAL',
                metadata: 'Animal en crecimiento trazable',
            };
            
            self.qr_codes.write(qr_hash, qr_data);
            self.qr_to_animal.write(qr_hash, animal_id);
            
            // Registrar en historial
            self._record_animal_history(animal_id, 'QR_GENERATED');
            
            self.emit(Event::QRCodeGenerated(QRCodeGenerated {
                qr_hash: qr_hash,
                animal_id: animal_id,
                corte_id: 0,
                data_type: 'ANIMAL',
                timestamp: get_block_timestamp(),
            }));
            
            qr_hash
        }
        
        fn generate_qr_for_batch(
            ref self: ContractState,
            batch_id: u128
        ) -> felt252 {
            self._check_role(FRIGORIFICO_ROLE);
            
            let caller = get_caller_address();
            let batch = self.lotes_animales.read(batch_id);
            
            assert!(batch.frigorifico == caller, "Not owner of this batch");
            
            let qr_data_str = batch_id.into() + ':BATCH';
            let qr_hash = self._generate_qr_hash(qr_data_str);
            
            let qr_data = QRData {
                qr_hash: qr_hash,
                animal_id: 0,
                corte_id: 0,
                timestamp: get_block_timestamp(),
                data_type: 'LOTE',
                metadata: 'Lote de animales procesados',
            };
            
            self.qr_codes.write(qr_hash, qr_data);
            self.qr_to_batch.write(qr_hash, batch_id);
            
            // Registrar en auditoría
            self._record_batch_audit(batch_id, 'QR_GENERATED');
            
            self.emit(Event::QRCodeGenerated(QRCodeGenerated {
                qr_hash: qr_hash,
                animal_id: 0,
                corte_id: 0,
                data_type: 'LOTE',
                timestamp: get_block_timestamp(),
            }));
            
            qr_hash
        }
        
        fn get_public_consumer_data(
            self: @ContractState,
            qr_hash: felt252
        ) -> PublicConsumerData {
            let qr_data = self.qr_codes.read(qr_hash);
            
            // Emitir evento de acceso (para analytics)
            // self.emit(Event::ConsumerDataAccessed(ConsumerDataAccessed {
            //     qr_hash: qr_hash,
            //     animal_id: qr_data.animal_id,
            //     timestamp: get_block_timestamp(),
            // }));
            
            // CORREGIDO: Reemplazar match con if/else
            if qr_data.data_type == 'CORTE' {
                let (animal_id, corte_id) = self.qr_to_corte.read(qr_hash);
                self._anonymize_sensitive_data(animal_id, corte_id)
            } else if qr_data.data_type == 'ANIMAL' {
                let animal_id = self.qr_to_animal.read(qr_hash);
                // Para animales, mostrar datos básicos
                let animal = self.animal_data.read(animal_id);
                let _producer_info = self.participant_info.read(animal.propietario);
                
                PublicConsumerData {
                    raza: animal.raza,
                    fecha_nacimiento: animal.fecha_nacimiento,
                    fecha_procesamiento: 0,
                    frigorifico_nombre: '',
                    certificador_nombre: '',
                    tipo_corte: 0,
                    peso_corte: animal.peso,
                    certificaciones: 'EN_CRECIMIENTO',
                    pais_origen: 'Uruguay',
                }
            } else {
                // Tipo no soportado o datos por defecto
                PublicConsumerData {
                    raza: 0,
                    fecha_nacimiento: 0,
                    fecha_procesamiento: 0,
                    frigorifico_nombre: '',
                    certificador_nombre: '',
                    tipo_corte: 0,
                    peso_corte: 0,
                    certificaciones: 'DATOS_NO_DISPONIBLES',
                    pais_origen: '',
                }
            }
        }
        
        fn verify_qr_authenticity(
            self: @ContractState,
            qr_hash: felt252
        ) -> bool {
            let qr_data = self.qr_codes.read(qr_hash);
            let zero_hash: felt252 = 0;
            
            // Verificar que el QR existe y tiene datos válidos
            if qr_data.qr_hash == zero_hash {
                return false;
            }
            
            // CORREGIDO: Reemplazar match con if/else
            if qr_data.data_type == 'CORTE' {
                let (animal_id, corte_id) = self.qr_to_corte.read(qr_hash);
                let corte = self.cortes_data.read((animal_id, corte_id));
                corte.certificado // Solo cortes certificados son considerados auténticos
            } else if qr_data.data_type == 'ANIMAL' {
                let animal_id = self.qr_to_animal.read(qr_hash);
                let animal = self.animal_data.read(animal_id);
                animal.estado >= 1 // Animales procesados o más
            } else if qr_data.data_type == 'LOTE' {
                let batch_id = self.qr_to_batch.read(qr_hash);
                let batch = self.lotes_animales.read(batch_id);
                batch.estado >= 2 // Lotes procesados
            } else {
                false
            }
        }
        
        fn get_qr_data(
            self: @ContractState,
            qr_hash: felt252
        ) -> QRData {
            self.qr_codes.read(qr_hash)
        }

        // ========== FUNCIONES DE AUDITORÍA Y TRANSPARENCIA ==========
        
        fn get_animal_full_history(
            self: @ContractState,
            animal_id: u128
        ) -> Array<felt252> {
            let count = self._get_animal_history_count(animal_id);
            let mut history = ArrayTrait::new();
            
            let mut i: u32 = 0;
            loop {
                if i >= count {
                    break;
                }
                let event = self._get_animal_history_at_index(animal_id, i);
                history.append(event);
                i += 1;
            };
            history
        }
        
        fn get_corte_full_history(
            self: @ContractState,
            animal_id: u128,
            corte_id: u128
        ) -> Array<felt252> {
            let count = self._get_corte_history_count(animal_id, corte_id);
            let mut history = ArrayTrait::new();
            
            let mut i: u32 = 0;
            loop {
                if i >= count {
                    break;
                }
                let event = self._get_corte_history_at_index(animal_id, corte_id, i);
                history.append(event);
                i += 1;
            };
            history
        }
        
        fn get_batch_audit_trail(
            self: @ContractState,
            batch_id: u128
        ) -> Array<felt252> {
            let count = self._get_batch_audit_count(batch_id);
            let mut audit_trail = ArrayTrait::new();
            
            let mut i: u32 = 0;
            loop {
                if i >= count {
                    break;
                }
                let event = self._get_batch_audit_at_index(batch_id, i);
                audit_trail.append(event);
                i += 1;
            };
            audit_trail
        }

        // ========== FUNCIONES DE SOSTENIBILIDAD Y REPORTES ==========
        
        fn generate_sustainability_report(
            self: @ContractState,
            animal_id: u128
        ) -> Array<felt252> {
            let mut report = ArrayTrait::new();
            
            let carbon_footprint = self._calculate_carbon_footprint(animal_id);
            let animal = self.animal_data.read(animal_id);
            
            // Generar métricas de sostenibilidad
            report.append('=== REP DE SOSTENIBILIDAD ===');
            report.append('Animal ID: ' + animal_id.into());
            report.append('Huella de Carbono: ' + carbon_footprint.into() + ' unidades CO2');
            report.append('Peso del Animal: ' + animal.peso.into() + ' kg');
            report.append('Raza: ' + animal.raza.into());
            
            // Calcular eficiencia hídrica (ejemplo simplificado)
            let water_usage = animal.peso * 150; // 150L por kg
            report.append('Uso de Agua Estimado: ' + water_usage.into() + ' litros');
            
            // Obtener información del productor
            let producer_info = self.participant_info.read(animal.propietario);
            report.append('Productor: ' + producer_info.nombre);
            
            // Emitir evento del reporte
            // self.emit(Event::SustainabilityReportGenerated(SustainabilityReportGenerated {
            //     animal_id: animal_id,
            //     carbon_footprint: carbon_footprint,
            //     water_usage: water_usage,
            //     timestamp: get_block_timestamp(),
            // }));
            
            report
        }
        
        fn get_carbon_footprint_estimate(
            self: @ContractState,
            animal_id: u128
        ) -> u128 {
            self._calculate_carbon_footprint(animal_id)
        }
        
        fn get_supply_chain_efficiency(
            self: @ContractState,
            producer: ContractAddress
        ) -> u128 {
            // Calcular eficiencia basada en tiempo promedio de procesamiento
            let animals_count = self._get_animals_by_owner_count(producer);
            let mut total_efficiency: u128 = 0;
            let mut count: u128 = 0;
            
            let mut i: u32 = 0;
            loop {
                if i >= animals_count {
                    break;
                }
                
                let animal_id = self._get_animal_at_owner_index(producer, i);
                let animal = self.animal_data.read(animal_id);
                
                if animal.estado >= 2 { // Solo animales certificados
                    // Métrica simplificada: diferencia entre nacimiento y certificación
                    let processing_time = animal.fecha_nacimiento - get_block_timestamp();
                    total_efficiency += processing_time.into();
                    count += 1;
                }
                
                i += 1;
            };
            
            if count > 0 {
                total_efficiency / count
            } else {
                0
            }
        }
    }
}