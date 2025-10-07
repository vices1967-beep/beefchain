// src/types/starknet-window.d.ts
interface StarknetWindowObject {
  request: (args: { type: string }) => Promise<string[]>;
  enable: () => Promise<string[]>;
  isConnected: boolean;
  provider: any;
  account: any;
  selectedAddress?: string;
}

interface Window {
  starknet_braavos?: StarknetWindowObject;
  starknet_argentX?: StarknetWindowObject;
  ethereum?: any;
}