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
    name: 'owner_of',
    inputs: [{ name: 'token_id', type: 'core::integer::u128' }],
    outputs: [{ type: 'core::starknet::contract_address::ContractAddress' }],
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
  }
] as const;