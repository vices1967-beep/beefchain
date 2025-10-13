// src/components/Diagnostic.tsx
'use client';

import { useEffect } from 'react';

interface DiagnosticProps {
  transferenciasPendientes: any;
  lotesProcesados: any;
  contractService: any;
  address: string | null;
}

export function Diagnostic({ transferenciasPendientes, lotesProcesados, contractService, address }: DiagnosticProps) {
  useEffect(() => {
    console.log('🔍 [DIAGNÓSTICO] INICIANDO...');
    
    console.log('📋 Transferencias Pendientes:', {
      recibido: !!transferenciasPendientes,
      animales: transferenciasPendientes?.animals?.length || 0,
      lotes: transferenciasPendientes?.batches?.length || 0,
      datos: transferenciasPendientes
    });

    console.log('📦 Lotes Procesados:', {
      recibido: !!lotesProcesados,
      cantidad: lotesProcesados?.length || 0,
      datos: lotesProcesados
    });

    console.log('⚙️ Contract Service:', {
      disponible: !!contractService,
      tipo: typeof contractService
    });

    console.log('👤 Address:', {
      disponible: !!address,
      valor: address
    });

    // Verificar datos específicos
    if (transferenciasPendientes?.animals) {
      transferenciasPendientes.animals.forEach((animal: any, index: number) => {
        console.log(`🐄 Animal ${index}:`, {
          id: animal.id,
          peso: animal.peso,
          starknet_data: animal.starknet_data,
          propietario: animal.propietario
        });
      });
    }

    if (transferenciasPendientes?.batches) {
      transferenciasPendientes.batches.forEach((lote: any, index: number) => {
        console.log(`📦 Lote ${index}:`, {
          id: lote.id,
          peso_total: lote.peso_total,
          cantidad_animales: lote.cantidad_animales,
          animal_ids: lote.animal_ids
        });
      });
    }

    if (lotesProcesados) {
      lotesProcesados.forEach((lote: any, index: number) => {
        console.log(`🔪 Lote Procesado ${index}:`, {
          id: lote.id,
          peso_total: lote.peso_total,
          estado: lote.estado,
          animales: lote.animal_ids?.length
        });
      });
    }

  }, [transferenciasPendientes, lotesProcesados, contractService, address]);

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
      <h3 className="font-bold text-red-800 mb-2">🔍 DIAGNÓSTICO</h3>
      <div className="text-sm text-red-700 space-y-1">
        <div>Transferencias: {transferenciasPendientes?.animals?.length || 0} animales, {transferenciasPendientes?.batches?.length || 0} lotes</div>
        <div>Lotes Procesados: {lotesProcesados?.length || 0}</div>
        <div>Contract: {contractService ? '✅' : '❌'}</div>
        <div>Address: {address ? '✅' : '❌'}</div>
      </div>
    </div>
  );
}