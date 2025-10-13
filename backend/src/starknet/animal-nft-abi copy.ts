// src/contracts/animal-nft-abi.ts
export const ANIMAL_NFT_ABI = [
  // ============ CONSTRUCTOR ============
  {
    type: 'constructor',
    name: 'constructor',
    inputs: [
      { name: 'admin', type: 'core::starknet::contract_address::ContractAddress' }
    ],
    outputs: []
  },

  // ============ FUNCIONES DE REGISTRO E IDENTIFICACIÓN ============
  {
    type: 'function',
    name: 'register_participant',
    inputs: [
      { name: 'role', type: 'core::felt252' },
      { name: 'nombre', type: 'core::felt252' },
      { name: 'metadata', type: 'core::felt252' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'update_participant_info',
    inputs: [
      { name: 'nombre', type: 'core::felt252' },
      { name: 'metadata', type: 'core::felt252' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'get_participant_info',
    inputs: [{ name: 'account', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          { name: 'nombre', type: 'core::felt252' },
          { name: 'direccion', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'fecha_registro', type: 'core::integer::u64' },
          { name: 'activo', type: 'core::bool' },
          { name: 'metadata', type: 'core::felt252' }
        ]
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_role_member_count',
    inputs: [{ name: 'role', type: 'core::felt252' }],
    outputs: [{ type: 'core::integer::u32' }],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_role_member_at_index',
    inputs: [
      { name: 'role', type: 'core::felt252' },
      { name: 'index', type: 'core::integer::u32' }
    ],
    outputs: [{ type: 'core::starknet::contract_address::ContractAddress' }],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_all_role_members',
    inputs: [{ name: 'role', type: 'core::felt252' }],
    outputs: [
      {
        type: 'core::array::Array::<core::starknet::contract_address::ContractAddress>'
      }
    ],
    state_mutability: 'view'
  },

  // ============ FUNCIONES DE PRODUCTOR ============
  // ============ FUNCIONES DE CREACIÓN Y REGISTRO ============
  {
    type: 'function',
    name: 'create_animal_simple',
    inputs: [{ name: 'raza', type: 'core::integer::u128' }],
    outputs: [{ type: 'core::integer::u128' }],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'create_animal',
    inputs: [
      { name: 'metadata_hash', type: 'core::felt252' },
      { name: 'raza', type: 'core::integer::u128' },
      { name: 'fecha_nacimiento', type: 'core::integer::u64' },
      { name: 'peso', type: 'core::integer::u128' }
    ],
    outputs: [{ type: 'core::integer::u128' }],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'update_animal_weight',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'new_weight', type: 'core::integer::u128' }
    ],
    outputs: [],
    state_mutability: 'external'
  },

  // ============ FUNCIONES DE GESTIÓN DE LOTES ============
  {
    type: 'function',
    name: 'create_animal_batch',
    inputs: [
      {
        name: 'animal_ids',
        type: 'core::array::Array::<core::integer::u128>'
      }
    ],
    outputs: [{ type: 'core::integer::u128' }],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'add_animals_to_batch',
    inputs: [
      { name: 'batch_id', type: 'core::integer::u128' },
      {
        name: 'animal_ids',
        type: 'core::array::Array::<core::integer::u128>'
      }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'transfer_batch_to_frigorifico',
    inputs: [
      { name: 'batch_id', type: 'core::integer::u128' },
      { name: 'frigorifico', type: 'core::starknet::contract_address::ContractAddress' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'get_batch_info',
    inputs: [{ name: 'batch_id', type: 'core::integer::u128' }],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          {
            type: 'core::tuple',
            components: [
              { name: 'propietario', type: 'core::starknet::contract_address::ContractAddress' },
              { name: 'frigorifico', type: 'core::starknet::contract_address::ContractAddress' },
              { name: 'fecha_creacion', type: 'core::integer::u64' },
              { name: 'fecha_transferencia', type: 'core::integer::u64' },
              { name: 'fecha_procesamiento', type: 'core::integer::u64' },
              { name: 'estado', type: 'core::integer::u8' },
              { name: 'cantidad_animales', type: 'core::integer::u32' },
              { name: 'peso_total', type: 'core::integer::u128' }
            ]
          },
          {
            type: 'core::array::Array::<core::integer::u128>'
          }
        ]
      }
    ],
    state_mutability: 'view'
  },

  // ============ FUNCIONES DE CONSULTA PARA PRODUCTORES ============
  {
    type: 'function',
    name: 'get_animals_by_producer',
    inputs: [{ name: 'producer', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [
      {
        type: 'core::array::Array::<core::integer::u128>'
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_batches_by_producer',
    inputs: [{ name: 'producer', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [
      {
        type: 'core::array::Array::<core::integer::u128>'
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_producer_stats',
    inputs: [{ name: 'producer', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          { type: 'core::integer::u32' },
          { type: 'core::integer::u32' },
          { type: 'core::integer::u128' }
        ]
      }
    ],
    state_mutability: 'view'
  },

  // ============ FUNCIONES DE FRIGORÍFICO ============
  {
    type: 'function',
    name: 'procesar_animal',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'procesar_batch',
    inputs: [{ name: 'batch_id', type: 'core::integer::u128' }],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'crear_corte',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'tipo_corte', type: 'core::integer::u128' },
      { name: 'peso', type: 'core::integer::u128' }
    ],
    outputs: [{ type: 'core::integer::u128' }],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'crear_cortes_para_batch',
    inputs: [
      { name: 'batch_id', type: 'core::integer::u128' },
      {
        name: 'tipos_corte',
        type: 'core::array::Array::<core::integer::u128>'
      },
      {
        name: 'pesos',
        type: 'core::array::Array::<core::integer::u128>'
      }
    ],
    outputs: [
      {
        type: 'core::array::Array::<core::integer::u128>'
      }
    ],
    state_mutability: 'external'
  },

  // ============ FUNCIONES DE VETERINARIO ============
  {
    type: 'function',
    name: 'authorize_veterinarian_for_animal',
    inputs: [
      { name: 'veterinarian', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'animal_id', type: 'core::integer::u128' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'revoke_veterinarian_authorization',
    inputs: [
      { name: 'veterinarian', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'animal_id', type: 'core::integer::u128' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'add_health_record',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'diagnosis', type: 'core::felt252' },
      { name: 'treatment', type: 'core::felt252' },
      { name: 'vaccination', type: 'core::felt252' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'quarantine_animal',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'reason', type: 'core::felt252' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'clear_quarantine',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [],
    state_mutability: 'external'
  },

  // ============ FUNCIONES DE IoT ============
  {
    type: 'function',
    name: 'record_iot_reading',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      {
        name: 'reading',
        type: 'core::tuple',
        components: [
          { name: 'timestamp', type: 'core::integer::u64' },
          { name: 'temperature', type: 'core::integer::i32' },
          { name: 'humidity', type: 'core::integer::u32' },
          { name: 'latitude', type: 'core::integer::i64' },
          { name: 'longitude', type: 'core::integer::i64' },
          { name: 'device_id', type: 'core::felt252' },
          { name: 'reading_type', type: 'core::felt252' }
        ]
      }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'get_latest_iot_reading',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'reading_type', type: 'core::felt252' }
    ],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          { name: 'timestamp', type: 'core::integer::u64' },
          { name: 'temperature', type: 'core::integer::i32' },
          { name: 'humidity', type: 'core::integer::u32' },
          { name: 'latitude', type: 'core::integer::i64' },
          { name: 'longitude', type: 'core::integer::i64' },
          { name: 'device_id', type: 'core::felt252' },
          { name: 'reading_type', type: 'core::felt252' }
        ]
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_iot_history_count',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [{ type: 'core::integer::u32' }],
    state_mutability: 'view'
  },

  // ============ FUNCIONES DE CERTIFICACIÓN ============
  {
    type: 'function',
    name: 'certify_animal',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      {
        name: 'certification_data',
        type: 'core::tuple',
        components: [
          { name: 'certification_date', type: 'core::integer::u64' },
          { name: 'certification_type', type: 'core::felt252' },
          { name: 'certifier', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'expiry_date', type: 'core::integer::u64' },
          { name: 'certificate_hash', type: 'core::felt252' }
        ]
      }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'certify_corte',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'corte_id', type: 'core::integer::u128' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'certify_batch',
    inputs: [
      { name: 'batch_id', type: 'core::integer::u128' },
      {
        name: 'certification_data',
        type: 'core::tuple',
        components: [
          { name: 'certification_date', type: 'core::integer::u64' },
          { name: 'certification_type', type: 'core::felt252' },
          { name: 'certifier', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'expiry_date', type: 'core::integer::u64' },
          { name: 'certificate_hash', type: 'core::felt252' }
        ]
      }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'revoke_certification',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'reason', type: 'core::felt252' }
    ],
    outputs: [],
    state_mutability: 'external'
  },

  // ============ FUNCIONES DE EXPORTACIÓN ============
  {
    type: 'function',
    name: 'prepare_export_batch',
    inputs: [
      {
        name: 'animal_ids',
        type: 'core::array::Array::<core::integer::u128>'
      },
      { name: 'destination', type: 'core::felt252' },
      { name: 'container_id', type: 'core::felt252' }
    ],
    outputs: [{ type: 'core::integer::u128' }],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'confirm_export',
    inputs: [
      { name: 'batch_id', type: 'core::integer::u128' },
      { name: 'export_permit', type: 'core::felt252' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'update_export_temperature',
    inputs: [
      { name: 'batch_id', type: 'core::integer::u128' },
      { name: 'temperature', type: 'core::integer::i32' }
    ],
    outputs: [],
    state_mutability: 'external'
  },

  // ============ FUNCIONES DE ADMINISTRACIÓN DE ROLES ============
  {
    type: 'function',
    name: 'grant_role',
    inputs: [
      { name: 'role', type: 'core::felt252' },
      { name: 'account', type: 'core::starknet::contract_address::ContractAddress' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'revoke_role',
    inputs: [
      { name: 'role', type: 'core::felt252' },
      { name: 'account', type: 'core::starknet::contract_address::ContractAddress' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'renounce_role',
    inputs: [{ name: 'role', type: 'core::felt252' }],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'has_role',
    inputs: [
      { name: 'role', type: 'core::felt252' },
      { name: 'account', type: 'core::starknet::contract_address::ContractAddress' }
    ],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_role_admin',
    inputs: [{ name: 'role', type: 'core::felt252' }],
    outputs: [{ type: 'core::felt252' }],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'set_role_admin',
    inputs: [
      { name: 'role', type: 'core::felt252' },
      { name: 'admin_role', type: 'core::felt252' }
    ],
    outputs: [],
    state_mutability: 'external'
  },

  // ============ FUNCIONES DE TRANSFERENCIA ============
  {
    type: 'function',
    name: 'transfer_animal',
    inputs: [
      { name: 'to', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'animal_id', type: 'core::integer::u128' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'transfer_animal_to_frigorifico',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'frigorifico', type: 'core::starknet::contract_address::ContractAddress' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'transfer_corte_to_exportador',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'corte_id', type: 'core::integer::u128' },
      { name: 'exportador', type: 'core::starknet::contract_address::ContractAddress' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'batch_transfer_cortes',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      {
        name: 'corte_ids',
        type: 'core::array::Array::<core::integer::u128>'
      },
      { name: 'exportador', type: 'core::starknet::contract_address::ContractAddress' }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'batch_transfer_cortes_para_lote',
    inputs: [
      { name: 'batch_id', type: 'core::integer::u128' },
      { name: 'exportador', type: 'core::starknet::contract_address::ContractAddress' }
    ],
    outputs: [],
    state_mutability: 'external'
  },

  // ============ FUNCIONES DE CONSULTA GENERAL ============
  {
    type: 'function',
    name: 'get_info_animal',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          {
            type: 'core::tuple',
            components: [
              { name: 'raza', type: 'core::integer::u128' },
              { name: 'fecha_nacimiento', type: 'core::integer::u64' },
              { name: 'peso', type: 'core::integer::u128' },
              { name: 'estado', type: 'core::integer::u8' },
              { name: 'propietario', type: 'core::starknet::contract_address::ContractAddress' },
              { name: 'frigorifico', type: 'core::starknet::contract_address::ContractAddress' },
              { name: 'certificador', type: 'core::starknet::contract_address::ContractAddress' },
              { name: 'exportador', type: 'core::starknet::contract_address::ContractAddress' },
              { name: 'lote_id', type: 'core::integer::u128' }
            ]
          },
          { type: 'core::integer::u128' },
          { type: 'core::felt252' }
        ]
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_info_corte',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'corte_id', type: 'core::integer::u128' }
    ],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          { name: 'tipo_corte', type: 'core::integer::u128' },
          { name: 'peso', type: 'core::integer::u128' },
          { name: 'fecha_procesamiento', type: 'core::integer::u64' },
          { name: 'frigorifico', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'certificado', type: 'core::bool' },
          { name: 'lote_exportacion', type: 'core::integer::u128' },
          { name: 'propietario', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'animal_id', type: 'core::integer::u128' }
        ]
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_certification_data',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          { name: 'certification_date', type: 'core::integer::u64' },
          { name: 'certification_type', type: 'core::felt252' },
          { name: 'certifier', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'expiry_date', type: 'core::integer::u64' },
          { name: 'certificate_hash', type: 'core::felt252' }
        ]
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_export_data',
    inputs: [{ name: 'batch_id', type: 'core::integer::u128' }],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          { name: 'export_date', type: 'core::integer::u64' },
          { name: 'destination_country', type: 'core::felt252' },
          { name: 'export_permit', type: 'core::felt252' },
          { name: 'container_id', type: 'core::felt252' },
          {
            name: 'temperature_range',
            type: 'core::tuple',
            components: [
              { type: 'core::integer::i32' },
              { type: 'core::integer::i32' }
            ]
          },
          { name: 'exporter', type: 'core::starknet::contract_address::ContractAddress' }
        ]
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'owner_of',
    inputs: [{ name: 'token_id', type: 'core::integer::u128' }],
    outputs: [{ type: 'core::starknet::contract_address::ContractAddress' }],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'token_uri',
    inputs: [{ name: 'token_id', type: 'core::integer::u128' }],
    outputs: [{ type: 'core::felt252' }],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_animal_data',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          { name: 'raza', type: 'core::integer::u128' },
          { name: 'fecha_nacimiento', type: 'core::integer::u64' },
          { name: 'peso', type: 'core::integer::u128' },
          { name: 'estado', type: 'core::integer::u8' },
          { name: 'propietario', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'frigorifico', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'certificador', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'exportador', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'lote_id', type: 'core::integer::u128' }
        ]
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_num_cortes',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [{ type: 'core::integer::u128' }],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'is_quarantined',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_corte_owner',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'corte_id', type: 'core::integer::u128' }
    ],
    outputs: [{ type: 'core::starknet::contract_address::ContractAddress' }],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_animals_in_batch',
    inputs: [{ name: 'batch_id', type: 'core::integer::u128' }],
    outputs: [
      {
        type: 'core::array::Array::<core::integer::u128>'
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_batch_for_animal',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [{ type: 'core::integer::u128' }],
    state_mutability: 'view'
  },

  // ============ FUNCIONES DE ESTADÍSTICAS DEL SISTEMA ============
  {
    type: 'function',
    name: 'get_system_stats',
    inputs: [],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          { type: 'core::integer::u128' },
          { type: 'core::integer::u128' },
          { type: 'core::integer::u128' },
          { type: 'core::integer::u128' },
          { type: 'core::integer::u128' },
          { type: 'core::integer::u128' },
          { type: 'core::integer::u128' }
        ]
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_role_stats',
    inputs: [],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          { type: 'core::integer::u32' },
          { type: 'core::integer::u32' },
          { type: 'core::integer::u32' },
          { type: 'core::integer::u32' },
          { type: 'core::integer::u32' },
          { type: 'core::integer::u32' },
          { type: 'core::integer::u32' }
        ]
      }
    ],
    state_mutability: 'view'
  },

  // ============ FUNCIONES DE CÓDIGOS QR ============
  {
    type: 'function',
    name: 'generate_qr_for_corte',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'corte_id', type: 'core::integer::u128' }
    ],
    outputs: [{ type: 'core::felt252' }],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'generate_qr_for_animal',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [{ type: 'core::felt252' }],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'generate_qr_for_batch',
    inputs: [{ name: 'batch_id', type: 'core::integer::u128' }],
    outputs: [{ type: 'core::felt252' }],
    state_mutability: 'external'
  },
  {
    type: 'function',
    name: 'get_public_consumer_data',
    inputs: [{ name: 'qr_hash', type: 'core::felt252' }],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          { name: 'raza', type: 'core::integer::u128' },
          { name: 'fecha_nacimiento', type: 'core::integer::u64' },
          { name: 'fecha_procesamiento', type: 'core::integer::u64' },
          { name: 'frigorifico_nombre', type: 'core::felt252' },
          { name: 'certificador_nombre', type: 'core::felt252' },
          { name: 'tipo_corte', type: 'core::integer::u128' },
          { name: 'peso_corte', type: 'core::integer::u128' },
          { name: 'certificaciones', type: 'core::felt252' },
          { name: 'pais_origen', type: 'core::felt252' }
        ]
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'verify_qr_authenticity',
    inputs: [{ name: 'qr_hash', type: 'core::felt252' }],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_qr_data',
    inputs: [{ name: 'qr_hash', type: 'core::felt252' }],
    outputs: [
      {
        type: 'core::tuple',
        components: [
          { name: 'qr_hash', type: 'core::felt252' },
          { name: 'animal_id', type: 'core::integer::u128' },
          { name: 'corte_id', type: 'core::integer::u128' },
          { name: 'timestamp', type: 'core::integer::u64' },
          { name: 'data_type', type: 'core::felt252' },
          { name: 'metadata', type: 'core::felt252' }
        ]
      }
    ],
    state_mutability: 'view'
  },

  // ============ FUNCIONES DE AUDITORÍA ============
  {
    type: 'function',
    name: 'get_animal_full_history',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [
      {
        type: 'core::array::Array::<core::felt252>'
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_corte_full_history',
    inputs: [
      { name: 'animal_id', type: 'core::integer::u128' },
      { name: 'corte_id', type: 'core::integer::u128' }
    ],
    outputs: [
      {
        type: 'core::array::Array::<core::felt252>'
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_batch_audit_trail',
    inputs: [{ name: 'batch_id', type: 'core::integer::u128' }],
    outputs: [
      {
        type: 'core::array::Array::<core::felt252>'
      }
    ],
    state_mutability: 'view'
  },

  // ============ FUNCIONES DE SOSTENIBILIDAD ============
  {
    type: 'function',
    name: 'generate_sustainability_report',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [
      {
        type: 'core::array::Array::<core::felt252>'
      }
    ],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_carbon_footprint_estimate',
    inputs: [{ name: 'animal_id', type: 'core::integer::u128' }],
    outputs: [{ type: 'core::integer::u128' }],
    state_mutability: 'view'
  },
  {
    type: 'function',
    name: 'get_supply_chain_efficiency',
    inputs: [{ name: 'producer', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [{ type: 'core::integer::u128' }],
    state_mutability: 'view'
  },

  // ============ EVENTOS ============
  {
    type: 'event',
    name: 'ganadochain::AnimalNFT::AnimalNFT::AnimalCreated',
    kind: 'struct',
    members: [
      { name: 'token_id', type: 'core::integer::u128', kind: 'data' },
      { name: 'owner', type: 'core::starknet::contract_address::ContractAddress', kind: 'data' },
      { name: 'metadata_hash', type: 'core::felt252', kind: 'data' },
      { name: 'raza', type: 'core::integer::u128', kind: 'data' },
      { name: 'peso', type: 'core::integer::u128', kind: 'data' }
    ]
  },
  {
    type: 'event',
    name: 'ganadochain::AnimalNFT::AnimalNFT::AnimalProcesado',
    kind: 'struct',
    members: [
      { name: 'animal_id', type: 'core::integer::u128', kind: 'data' },
      { name: 'frigorifico', type: 'core::starknet::contract_address::ContractAddress', kind: 'data' },
      { name: 'timestamp', type: 'core::integer::u64', kind: 'data' }
    ]
  },
  {
    type: 'event',
    name: 'ganadochain::AnimalNFT::AnimalNFT::CorteCreado',
    kind: 'struct',
    members: [
      { name: 'animal_id', type: 'core::integer::u128', kind: 'data' },
      { name: 'corte_id', type: 'core::integer::u128', kind: 'data' },
      { name: 'tipo_corte', type: 'core::integer::u128', kind: 'data' },
      { name: 'peso', type: 'core::integer::u128', kind: 'data' },
      { name: 'frigorifico', type: 'core::starknet::contract_address::ContractAddress', kind: 'data' },
      { name: 'qr_hash', type: 'core::felt252', kind: 'data' }
    ]
  },
  {
    type: 'event',
    name: 'ganadochain::AnimalNFT::AnimalNFT::AnimalCertified',
    kind: 'struct',
    members: [
      { name: 'animal_id', type: 'core::integer::u128', kind: 'data' },
      { name: 'certification_type', type: 'core::felt252', kind: 'data' },
      { name: 'certifier', type: 'core::starknet::contract_address::ContractAddress', kind: 'data' },
      { name: 'timestamp', type: 'core::integer::u64', kind: 'data' }
    ]
  },
  {
    type: 'event',
    name: 'ganadochain::AnimalNFT::AnimalNFT::ExportBatchCreated',
    kind: 'struct',
    members: [
      { name: 'batch_id', type: 'core::integer::u128', kind: 'data' },
      { name: 'destination', type: 'core::felt252', kind: 'data' },
      { name: 'container_id', type: 'core::felt252', kind: 'data' },
      { name: 'exporter', type: 'core::starknet::contract_address::ContractAddress', kind: 'data' },
      { name: 'timestamp', type: 'core::integer::u64', kind: 'data' }
    ]
  }
] as const;