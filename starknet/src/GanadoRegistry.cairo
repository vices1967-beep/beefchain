#[starknet::contract]
mod GanadoRegistry {
    use starknet::{ContractAddress, get_caller_address};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        next_animal_id: u128,
        polygon_to_starknet_animal: LegacyMap<u128, u128>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AnimalMigrated: AnimalMigrated,
    }

    #[derive(Drop, starknet::Event)]
    struct AnimalMigrated {
        polygon_id: u128,
        starknet_id: u128,
        owner: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        self.owner.write(get_caller_address());
        self.next_animal_id.write(1);
    }

    #[external(v0)]
    fn migrate_animal_from_polygon(
        ref self: ContractState, polygon_id: u128, owner: ContractAddress,
    ) -> u128 {
        let caller = get_caller_address();
        let contract_owner = self.owner.read();
        assert(caller == contract_owner, 'No owner');

        let starknet_id = self.next_animal_id.read();
        self.next_animal_id.write(starknet_id + 1);
        self.polygon_to_starknet_animal.write(polygon_id, starknet_id);

        self
            .emit(
                AnimalMigrated { polygon_id: polygon_id, starknet_id: starknet_id, owner: owner },
            );

        starknet_id
    }

    #[external(v0)]
    fn get_stats(self: @ContractState) -> u128 {
        self.next_animal_id.read() - 1
    }
}
