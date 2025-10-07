// src/components/common/TestConnection.tsx
'use client';

import { useAccount } from '@starknet-react/core';

export function TestConnection() {
  const { address, status } = useAccount();
  
  console.log('TestConnection - Status:', status);
  console.log('TestConnection - Address:', address);

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-purple-800">Debug Info</h3>
      <p className="text-sm text-purple-700">Status: {status}</p>
      <p className="text-sm text-purple-700">Address: {address || 'No connected'}</p>
    </div>
  );
}