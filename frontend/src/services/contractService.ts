// src/services/contractService.ts
import { AccountInterface, Contract, ProviderInterface } from 'starknet';
import { CONTRACT_ADDRESS } from '@/contracts/config';

// ABI mínimo como constante
const ANIMAL_NFT_ABI = [
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
  }
];

export class ContractService {
  private contract: Contract;

  constructor(provider: ProviderInterface) {
    this.contract = new Contract(ANIMAL_NFT_ABI, CONTRACT_ADDRESS, provider);
  }

  // Conectar la cuenta para escribir
  connect(account: AccountInterface) {
    this.contract.connect(account);
  }

  // Métodos para interactuar con el contrato
  async createAnimalSimple(raza: number): Promise<any> {
    return await this.contract.create_animal_simple(raza);
  }

  async createAnimal(
    metadataHash: string, 
    raza: number, 
    fechaNacimiento: number, 
    peso: bigint
  ): Promise<any> {
    return await this.contract.create_animal(metadataHash, raza, fechaNacimiento, peso);
  }
}