import requests

response = requests.post(
    'https://api.cairo-coder.com/v1/chat/completions',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'bf167c360f33f040439303bf90dd35e490e6caad84b91c60d4b7867fe8a4a23e'
    },
    json={
        'messages': [
            {
                'role': 'user',
                'content': 'corrige este contrato' """ #[starknet::contract]
mod AnimalNFT {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::get_block_timestamp;
    use starknet::storage::Map;  // ✅ CORRECTO: Importar desde starknet::storage

    #[storage]
    struct Storage {
        next_token_id: u128,
        admin: ContractAddress,
        // Para Map necesitas usar storage_access con entry()
        token_owner: LegacyMap<u128, ContractAddress>,
        token_uri: LegacyMap<u128, felt252>,
        animal_data: LegacyMap<u128, AnimalData>,
        allowed_callers: LegacyMap<ContractAddress, bool>,
        animal_cortes: LegacyMap<u128, u128>,
        cortes_data: LegacyMap<(u128, u128), CorteData>,
        qr_data: LegacyMap<u128, felt252>,
    }

    // ... (el resto de tu código manteniendo LegacyMap por ahora)

    #[derive(Drop, starknet::Event)]
    struct AnimalCreated {
        token_id: u128,
        owner: ContractAddress,
        metadata_hash: felt252,
        raza: u128,
        peso: u128,
    }

    #[derive(Drop, starknet::Event)]
    struct AnimalProcesado {
        animal_id: u128,
        frigorifico: ContractAddress,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct CorteCreado {
        animal_id: u128,
        corte_id: u128,
        tipo_corte: u128,
        peso: u128,
        frigorifico: ContractAddress,
        qr_hash: felt252,
    }

    #[derive(Drop, Copy, starknet::Store)]
    struct AnimalData {
        raza: u128,
        fecha_nacimiento: u64,
        peso: u128,
        estado: u8,
        propietario: ContractAddress,
        frigorifico: ContractAddress,
    }

    #[derive(Drop, Copy, starknet::Store)]
    struct CorteData {
        tipo_corte: u128,
        peso: u128,
        fecha_procesamiento: u64,
        frigorifico: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AnimalCreated: AnimalCreated,
        AnimalProcesado: AnimalProcesado,
        CorteCreado: CorteCreado,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        self.next_token_id.write(1);
        self.admin.write(get_caller_address());
        
        // CONFIGURACIÓN INICIAL CON TUS DIRECCIONES
        let productor_braavos: ContractAddress = 0x0626bb9241ba6334ae978cfce1280d725e727a6acb5e61392ab4cee031a4b7ca;
        let frigorifico_braavos: ContractAddress = 0x05f1ac2f722c0af3ce57828e1fcb0ace93ca7610947f595b3828e9c7116980fc;
        
        self.allowed_callers.write(productor_braavos, true);
        self.allowed_callers.write(frigorifico_braavos, true);
    }

    // FUNCIÓN PARA PRODUCTORES (ChipyPay o Braavos)
    #[external(v0)]
    fn create_animal(
        ref self: ContractState, 
        metadata_hash: felt252,
        raza: u128,
        fecha_nacimiento: u64,
        peso: u128
    ) -> u128 {
        let caller = get_caller_address();
        let _is_allowed = self.allowed_callers.read(caller);

        let token_id = self.next_token_id.read();
        self.next_token_id.write(token_id + 1);
        
        self.token_owner.write(token_id, caller);
        self.token_uri.write(token_id, metadata_hash);
        
        let animal_data = AnimalData {
            raza: raza,
            fecha_nacimiento: fecha_nacimiento,
            peso: peso,
            estado: 0,
            propietario: caller,
            frigorifico: 0,
        };
        self.animal_data.write(token_id, animal_data);
        self.animal_cortes.write(token_id, 0);
        
        let qr_hash = metadata_hash + token_id.into();
        self.qr_data.write(token_id, qr_hash);
        
        self.emit(AnimalCreated { 
            token_id: token_id,
            owner: caller, 
            metadata_hash: metadata_hash,
            raza: raza,
            peso: peso,
        });
        
        token_id
    }

    // FUNCIÓN SIMPLIFICADA PARA CHIPYPAY
    #[external(v0)]
    fn create_animal_simple(
        ref self: ContractState,
        raza: u128
    ) -> u128 {
        let caller = get_caller_address();
        let timestamp = get_block_timestamp();
        
        let token_id = self.next_token_id.read();
        self.next_token_id.write(token_id + 1);
        
        let metadata_hash = 'chipypay_simple_v1';
        self.token_owner.write(token_id, caller);
        self.token_uri.write(token_id, metadata_hash);
        
        let animal_data = AnimalData {
            raza: raza,
            fecha_nacimiento: timestamp,
            peso: 250,
            estado: 0,
            propietario: caller,
            frigorifico: 0,
        };
        self.animal_data.write(token_id, animal_data);
        self.animal_cortes.write(token_id, 0);
        
        let qr_hash = metadata_hash + token_id.into();
        self.qr_data.write(token_id, qr_hash);
        
        self.emit(AnimalCreated { 
            token_id: token_id,
            owner: caller, 
            metadata_hash: metadata_hash,
            raza: raza,
            peso: 250,
        });
        
        token_id
    }

    // FUNCIÓN PARA FRIGORÍFICOS
    #[external(v0)]
    fn procesar_animal(
        ref self: ContractState,
        animal_id: u128
    ) {
        let caller = get_caller_address();
        let mut animal = self.animal_data.read(animal_id);
        
        assert(animal.estado == 0, 'Animal ya procesado');
        animal.estado = 1;
        animal.frigorifico = caller;
        self.animal_data.write(animal_id, animal);
        
        self.emit(AnimalProcesado {
            animal_id: animal_id,
            frigorifico: caller,
            timestamp: get_block_timestamp(),
        });
    }

    // CREAR CORTES CON GENERACIÓN DE QR
    #[external(v0)]
    fn crear_corte(
        ref self: ContractState,
        animal_id: u128,
        tipo_corte: u128,
        peso: u128
    ) -> u128 {
        let caller = get_caller_address();
        let animal = self.animal_data.read(animal_id);
        
        assert(animal.estado == 1, 'Animal no procesado');
        assert(animal.frigorifico == caller, 'Solo el frigorifico asignado');
        
        let corte_count = self.animal_cortes.read(animal_id);
        let corte_id = corte_count + 1;
        
        let corte_data = CorteData {
            tipo_corte: tipo_corte,
            peso: peso,
            fecha_procesamiento: get_block_timestamp(),
            frigorifico: caller,
        };
        
        self.cortes_data.write((animal_id, corte_id), corte_data);
        self.animal_cortes.write(animal_id, corte_id);
        
        let qr_hash = animal_id.into() + corte_id.into();
        
        self.emit(CorteCreado {
            animal_id: animal_id,
            corte_id: corte_id,
            tipo_corte: tipo_corte,
            peso: peso,
            frigorifico: caller,
            qr_hash: qr_hash,
        });
        
        corte_id
    }

    // NUEVA FUNCIÓN: Verificar si una dirección está autorizada
    #[external(v0)]
    fn is_authorized_frigorifico(
        self: @ContractState,
        address: ContractAddress
    ) -> bool {
        self.allowed_callers.read(address)
    }

    // NUEVA FUNCIÓN: Transferir animal
    #[external(v0)]
    fn transfer_animal(
        ref self: ContractState,
        to: ContractAddress,
        animal_id: u128
    ) {
        let caller = get_caller_address();
        let owner = self.token_owner.read(animal_id);
        
        assert(caller == owner, 'No eres el dueno');
        self.token_owner.write(animal_id, to);
    }

    // CONSULTA PARA QR DE CONSUMIDORES
    #[external(v0)]
    fn get_info_animal(
        self: @ContractState, 
        animal_id: u128
    ) -> (AnimalData, u128, felt252) {
        let animal = self.animal_data.read(animal_id);
        let num_cortes = self.animal_cortes.read(animal_id);
        let qr_hash = self.qr_data.read(animal_id);
        (animal, num_cortes, qr_hash)
    }

    // CONSULTA PARA CORTE ESPECÍFICO
    #[external(v0)]
    fn get_info_corte(
        self: @ContractState,
        animal_id: u128,
        corte_id: u128
    ) -> CorteData {
        self.cortes_data.read((animal_id, corte_id))
    }

    // AGREGAR CALLER AUTORIZADO
    #[external(v0)]
    fn allow_caller(
        ref self: ContractState,
        caller: ContractAddress
    ) {
        let admin = self.admin.read();
        assert(get_caller_address() == admin, 'Solo admin');
        self.allowed_callers.write(caller, true);
    }

    // FUNCIONES EXISTENTES
    #[external(v0)]
    fn owner_of(self: @ContractState, token_id: u128) -> ContractAddress {
        self.token_owner.read(token_id)
    }

    #[external(v0)]
    fn token_uri(self: @ContractState, token_id: u128) -> felt252 {
        self.token_uri.read(token_id)
    }

    // NUEVA FUNCIÓN: Obtener datos básicos del animal
    #[external(v0)]
    fn get_animal_data(self: @ContractState, animal_id: u128) -> AnimalData {
        self.animal_data.read(animal_id)
    }

    // NUEVA FUNCIÓN: Obtener número de cortes por animal
    #[external(v0)]
    fn get_num_cortes(self: @ContractState, animal_id: u128) -> u128 {
        self.animal_cortes.read(animal_id)
    }
} """
            }
        ]
    }
)

print(response.json()['choices'][0]['message']['content'])