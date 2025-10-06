#[starknet::contract]
mod Proxy {
    use starknet::ContractAddress;
    use starknet::ClassHash;
    use starknet::get_caller_address;
    use starknet::syscalls::library_call_syscall;
    use starknet::SyscallResultTrait;
    use core::array::ArrayTrait;
    use core::array::SpanTrait;

    #[storage]
    struct Storage {
        implementation_class: ClassHash,
        admin: ContractAddress,
        initialized: bool
    }

    #[constructor]
    fn constructor(ref self: ContractState, implementation_class: ClassHash, admin: ContractAddress) {
        self.initialized.write(true);
        self.implementation_class.write(implementation_class);
        self.admin.write(admin);
    }

    #[external(v0)]
    fn upgrade(ref self: ContractState, new_implementation_class: ClassHash) {
        let caller = get_caller_address();
        let admin = self.admin.read();
        assert(caller == admin, 'Not admin');
        self.implementation_class.write(new_implementation_class);
    }

    #[external(v0)]
    fn get_implementation(self: @ContractState) -> ClassHash {
        self.implementation_class.read()
    }

    #[external(v0)]
    fn get_admin(self: @ContractState) -> ContractAddress {
        self.admin.read()
    }

    #[external(v0)]
    fn initialize(ref self: ContractState, implementation_class: ClassHash, admin: ContractAddress) {
        let initialized = self.initialized.read();
        assert(!initialized, 'Already initialized');
        self.initialized.write(true);
        self.implementation_class.write(implementation_class);
        self.admin.write(admin);
    }

    // Función para redirigir llamadas a la implementación
    #[external(v0)]
    fn __default__(self: @ContractState, selector: felt252, calldata: Array<felt252>) -> Span<felt252> {
        let implementation_class = self.implementation_class.read();
        
        // Llamar a la biblioteca con el class hash correcto
        let result = library_call_syscall(
            implementation_class,
            selector,
            calldata.span()
        );
        
        // Retornar el resultado como Span
        result.unwrap_syscall()
    }
    
    // Función adicional para llamadas que necesitan Array como retorno
    #[external(v0)]
    fn call_contract(self: @ContractState, selector: felt252, calldata: Array<felt252>) -> Array<felt252> {
        let implementation_class = self.implementation_class.read();
        
        // Llamar a la biblioteca
        let result_span = library_call_syscall(
            implementation_class,
            selector,
            calldata.span()
        ).unwrap_syscall();
        
        // Convertir Span a Array
        let mut result_array = ArrayTrait::new();
        let mut i = 0;
        loop {
            if i >= result_span.len() {
                break;
            }
            result_array.append(*result_span.at(i));
            i += 1;
        };
        
        result_array
    }
}