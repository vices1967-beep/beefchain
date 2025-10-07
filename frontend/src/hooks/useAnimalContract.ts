// src/hooks/useAnimalContract.ts
import { useContract } from '@starknet-react/core';
import { CONTRACT_ADDRESS } from '@/contracts/config';

// En v5.x de @starknet-react/core, useContract maneja el ABI automáticamente
export function useAnimalContract() {
  const { contract } = useContract({
    address: CONTRACT_ADDRESS,
  });
  
  return contract;
}