// src/components/common/ChipyPayLoader.tsx - CORREGIDO
'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    ChipiPay: any;
  }
}

export function ChipyPayLoader() {
  useEffect(() => {
    // Solo cargar en cliente
    if (typeof window === 'undefined') return;

    // Verificar si ya está cargado
    if ((window as any).ChipiPay) {
      console.log('✅ SDK de Chipy Pay ya está cargado');
      return;
    }

    // Cargar SDK de Chipy Pay
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@chipi-stack/sdk@latest/dist/chipi-pay.js';
    script.async = true;
    
    script.onload = () => {
      console.log('✅ SDK de Chipy Pay cargado exitosamente');
      
      // Configurar Chipy Pay
      if ((window as any).ChipiPay) {
        try {
          (window as any).ChipiPay.configure({
            apiKey: process.env.NEXT_PUBLIC_CHIPI_API_KEY || 'pk_dev_d7e6505de47e23fd8633013288c34f36',
            network: 'starknet',
            wallets: ['braavos', 'argent'],
            theme: 'dark'
          });
          console.log('🔧 Chipy Pay configurado para Bravo Wallet');
        } catch (error) {
          console.error('❌ Error configurando Chipy Pay:', error);
        }
      }
    };
    
    script.onerror = () => {
      console.warn('⚠️ No se pudo cargar el SDK de Chipy Pay - usando modo simulación');
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Limpiar script al desmontar
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return null; // Este componente no renderiza nada
}