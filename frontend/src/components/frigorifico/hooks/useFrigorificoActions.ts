// src/components/frigorifico/hooks/useFrigorificoActions.ts
import { useState, useCallback } from 'react';
import { TipoCorte } from '@/contracts/config';
import { Corte } from '../types';

// ✅ CORREGIDO: Interface con funciones de cache opcionales
interface UseFrigorificoActionsProps {
  contractService: any;
  address: string | null;
  processAnimalAcceptance: any;
  processBatchAcceptance: any;
  setError: (error: string) => void;
  setTxHash: (txHash: string) => void;
  cargarTransferenciasPendientes: () => Promise<void>;
  cargarAnimalesRecibidos: () => Promise<void>;
  cargarCortesCreados: () => Promise<void>;
  setAceptandoTransferencia: (id: bigint | null) => void;
  setTipoTransferencia: (tipo: 'animal' | 'lote' | null) => void;
  setProcesandoAnimal: (id: bigint | null) => void;
  setCreandoCorte: (creando: boolean) => void;
  cortesCreados: Corte[];
  // ✅ CORREGIDO: Funciones de cache opcionales en la interface
  guardarTransaccion?: (transaccionData: any) => Promise<any>;
  actualizarEstado?: (hash: string, estado: 'completada' | 'fallida', blockNumber?: number) => Promise<any>;
}

export function useFrigorificoActions({
  contractService,
  address,
  processAnimalAcceptance,
  processBatchAcceptance,
  setError,
  setTxHash,
  cargarTransferenciasPendientes,
  cargarAnimalesRecibidos,
  cargarCortesCreados,
  setAceptandoTransferencia,
  setTipoTransferencia,
  setProcesandoAnimal,
  setCreandoCorte,
  cortesCreados,
  // ✅ CORREGIDO: Sin opcionales en la implementación
  guardarTransaccion,
  actualizarEstado
}: UseFrigorificoActionsProps) {
  // Estados de UI
  const [selectedAnimal, setSelectedAnimal] = useState<bigint | null>(null);
  const [tipoCorte, setTipoCorte] = useState<TipoCorte>(TipoCorte.LOMO);
  const [pesoCorte, setPesoCorte] = useState<string>('');
  const [exportadorAddress, setExportadorAddress] = useState<string>('');
  const [cortesSeleccionados, setCortesSeleccionados] = useState<bigint[]>([]);

  // Aceptar transferencia con pago Y CACHE
  const aceptarTransferencia = useCallback(async (id: bigint, tipo: 'animal' | 'lote') => {
    if (!contractService || !address) return;
    
    // ✅ CORREGIDO: Declarar variables fuera del try para que estén en el scope del catch
    let contractResult: any;
    let paymentResult: any;
    
    try {
      setAceptandoTransferencia(id);
      setTipoTransferencia(tipo);
      setError('');
      
      console.log(`💰 Aceptando ${tipo} #${id} con Chipy Pay...`);
      
      if (tipo === 'animal') {
        const animalData = await contractService.getAnimalData(id);
        paymentResult = await processAnimalAcceptance(id, address, animalData.propietario);
        setTxHash(paymentResult.txHash);
        contractResult = await contractService.acceptAnimalTransfer(id);
      } else {
        const batchData = await contractService.getBatchData(id);
        const animalCount = batchData.cantidad_animales || 1;
        paymentResult = await processBatchAcceptance(id, address, batchData.propietario, animalCount);
        setTxHash(paymentResult.txHash);
        contractResult = await contractService.acceptBatchTransfer(id);
      }
      
      console.log(`✅ ${tipo} #${id} aceptado y pagado exitosamente`);
      
      // ✅ NUEVO: Guardar en cache si está disponible
      if (guardarTransaccion && contractResult?.transaction_hash) {
        try {
          await guardarTransaccion({
            hash: contractResult.transaction_hash,
            tipo: `aceptar_${tipo}`,
            from: address,
            to: address,
            data: { 
              id: id.toString(), 
              tipo,
              paymentTxHash: paymentResult.txHash
            },
            estado: 'completada'
          });
          console.log(`💾 Transacción guardada en cache: ${contractResult.transaction_hash}`);
        } catch (cacheError) {
          console.warn('⚠️ No se pudo guardar en cache:', cacheError);
        }
      }
      
      // Recargar datos
      await Promise.all([
        cargarTransferenciasPendientes(),
        cargarAnimalesRecibidos()
      ]);
      
    } catch (error: any) {
      console.error(`❌ Error aceptando ${tipo}:`, error);
      
      // ✅ CORREGIDO: contractResult ahora está en el scope
      if (actualizarEstado && contractResult?.transaction_hash) {
        try {
          await actualizarEstado(contractResult.transaction_hash, 'fallida');
        } catch (cacheError) {
          console.warn('⚠️ No se pudo actualizar cache:', cacheError);
        }
      }
      
      setError(`Error aceptando ${tipo}: ${error.message}`);
    } finally {
      setAceptandoTransferencia(null);
      setTipoTransferencia(null);
    }
  }, [
    contractService, 
    address, 
    processAnimalAcceptance, 
    processBatchAcceptance, 
    setError, 
    setTxHash, 
    cargarTransferenciasPendientes, 
    cargarAnimalesRecibidos, 
    setAceptandoTransferencia, 
    setTipoTransferencia,
    guardarTransaccion,
    actualizarEstado
  ]);

  // Procesar animal CON CACHE
  const procesarAnimal = useCallback(async (animalId: bigint) => {
    if (!contractService) return;
    
    // ✅ CORREGIDO: Inicializar con string vacío y asegurar que siempre sea string
    let txHash = '';
    
    try {
      setProcesandoAnimal(animalId);
      setError('');
      
      console.log(`🔪 Procesando animal #${animalId}...`);
      const result = await contractService.procesarAnimal(animalId);
      txHash = result.txHash || result;
      
      // ✅ CORREGIDO: Asegurar que txHash es string antes de pasarlo
      if (typeof txHash !== 'string') {
        txHash = String(txHash);
      }
      
      setTxHash(txHash);
      await contractService.waitForTransaction(txHash);
      
      console.log(`✅ Animal #${animalId} procesado exitosamente`);
      
      // ✅ NUEVO: Guardar en cache si está disponible
      if (guardarTransaccion && txHash) {
        try {
          await guardarTransaccion({
            hash: txHash,
            tipo: 'procesar_animal',
            from: address!,
            to: address!,
            data: { animalId: animalId.toString() },
            estado: 'completada'
          });
          console.log(`💾 Procesamiento guardado en cache: ${txHash}`);
        } catch (cacheError) {
          console.warn('⚠️ No se pudo guardar procesamiento en cache:', cacheError);
        }
      }
      
      await cargarAnimalesRecibidos();
      
    } catch (error: any) {
      console.error('❌ Error procesando animal:', error);
      
      // ✅ CORREGIDO: txHash ahora está en el scope y es string
      if (actualizarEstado && txHash) {
        try {
          await actualizarEstado(txHash, 'fallida');
        } catch (cacheError) {
          console.warn('⚠️ No se pudo actualizar cache:', cacheError);
        }
      }
      
      setError(`Error procesando animal: ${error.message}`);
    } finally {
      setProcesandoAnimal(null);
    }
  }, [
    contractService, 
    cortesCreados,  // ✅ FALTA ESTA DEPENDENCIA
    setError, 
    setTxHash, 
    cargarAnimalesRecibidos, 
    setProcesandoAnimal,
    address,
    guardarTransaccion,
    actualizarEstado
  ]);

  // Crear corte CON CACHE
  const crearCorte = useCallback(async () => {
    if (!contractService || !selectedAnimal || !pesoCorte) return;
    
    // ✅ CORREGIDO: Inicializar con string vacío
    let txHash = '';
    
    try {
      setCreandoCorte(true);
      setError('');
      
      const peso = BigInt(pesoCorte);
      if (peso <= BigInt(0)) {
        setError('El peso debe ser mayor a 0');
        return;
      }

      console.log(`🥩 Creando corte para animal #${selectedAnimal}...`);
      const result = await contractService.crearCorte(selectedAnimal, tipoCorte, peso);
      txHash = result.txHash || result;
      
      // ✅ CORREGIDO: Asegurar que txHash es string
      if (typeof txHash !== 'string') {
        txHash = String(txHash);
      }
      
      setTxHash(txHash);
      
      // ✅ NUEVO: Guardar en cache si está disponible
      if (guardarTransaccion && txHash) {
        try {
          await guardarTransaccion({
            hash: txHash,
            tipo: 'crear_corte',
            from: address!,
            to: address!,
            data: { 
              animalId: selectedAnimal.toString(),
              tipoCorte: tipoCorte.toString(),
              peso: pesoCorte
            },
            estado: 'completada'
          });
          console.log(`💾 Corte guardado en cache: ${txHash}`);
        } catch (cacheError) {
          console.warn('⚠️ No se pudo guardar corte en cache:', cacheError);
        }
      }
      
      await cargarCortesCreados();
      
      // Limpiar formulario
      setSelectedAnimal(null);
      setPesoCorte('');
      setTipoCorte(TipoCorte.LOMO);
      
      console.log('✅ Corte creado exitosamente');
      
    } catch (error: any) {
      console.error('❌ Error creando corte:', error);
      
      // ✅ CORREGIDO: txHash ahora está en el scope y es string
      if (actualizarEstado && txHash) {
        try {
          await actualizarEstado(txHash, 'fallida');
        } catch (cacheError) {
          console.warn('⚠️ No se pudo actualizar cache:', cacheError);
        }
      }
      
      setError(`Error creando corte: ${error.message}`);
    } finally {
      setCreandoCorte(false);
    }
  }, [
    contractService, 
    selectedAnimal, 
    pesoCorte, 
    tipoCorte, 
    setError, 
    setTxHash, 
    cargarCortesCreados, 
    setCreandoCorte,
    address,
    guardarTransaccion,
    actualizarEstado
  ]);

  // Transferir cortes a exportador CON CACHE
  const transferirCortesAExportador = useCallback(async () => {
    if (!contractService || !exportadorAddress || cortesSeleccionados.length === 0) return;
    
    try {
      setError('');
      
      for (const corteId of cortesSeleccionados) {
        const corte = cortesCreados.find(c => c.id === corteId);
        if (!corte) continue;
        
        console.log(`🌍 Transferiendo corte #${corteId} a exportador...`);
        let txHash = await contractService.transferCorteToExportador(
          corte.animalId,
          corteId,
          exportadorAddress
        );
        
        // ✅ CORREGIDO: Asegurar que txHash es string
        if (typeof txHash !== 'string') {
          txHash = String(txHash);
        }
        
        setTxHash(txHash);
        await contractService.waitForTransaction(txHash);
        
        // ✅ NUEVO: Guardar en cache si está disponible
        if (guardarTransaccion) {
          try {
            await guardarTransaccion({
              hash: txHash,
              tipo: 'transferir_corte',
              from: address!,
              to: exportadorAddress,
              data: { 
                corteId: corteId.toString(),
                animalId: corte.animalId.toString(),
                exportador: exportadorAddress
              },
              estado: 'completada'
            });
            console.log(`💾 Transferencia de corte guardada en cache: ${txHash}`);
          } catch (cacheError) {
            console.warn('⚠️ No se pudo guardar transferencia en cache:', cacheError);
          }
        }
      }
      
      await cargarCortesCreados();
      setCortesSeleccionados([]);
      setExportadorAddress('');
      
      console.log('✅ Cortes transferidos a exportador exitosamente');
      
    } catch (error: any) {
      console.error('❌ Error transfiriendo cortes:', error);
      setError(`Error transfiriendo cortes: ${error.message}`);
    }
  }, [
    contractService, 
    exportadorAddress, 
    cortesSeleccionados, 
    cortesCreados,
    setError, 
    setTxHash, 
    cargarCortesCreados,
    address,
    guardarTransaccion
  ]);

  // Generar QR para corte CON CACHE
  // En useFrigorificoActions.ts - CORREGIDO
const generarQRParaCorte = useCallback(async (corteId: bigint) => {
  if (!contractService) return;
  
  try {
    setError('');
    console.log(`📱 Generando QR para corte #${corteId}...`);
    
    const corte = cortesCreados.find(c => c.id === corteId);
    if (!corte) {
      setError('Corte no encontrado');
      return;
    }
    
    let qrHash = await contractService.generateQrForCorte(corte.animalId, corteId);
    
    if (typeof qrHash !== 'string') {
      qrHash = String(qrHash);
    }
    
    if (guardarTransaccion) {
      try {
        await guardarTransaccion({
          hash: qrHash,
          tipo: 'generar_qr',
          from: address!,
          to: address!,
          data: { 
            corteId: corteId.toString(),
            animalId: corte.animalId.toString()
          },
          estado: 'completada'
        });
        console.log(`💾 QR guardado en cache: ${qrHash}`);
      } catch (cacheError) {
        console.warn('⚠️ No se pudo guardar QR en cache:', cacheError);
      }
    }
    
    await cargarCortesCreados();
    
    console.log(`✅ QR generado para corte #${corteId}: ${qrHash}`);
    
  } catch (error: any) {
    console.error('❌ Error generando QR:', error);
    setError(`Error generando QR: ${error.message}`);
  }
}, [
  contractService, 
  cortesCreados,  // ✅ AGREGAR ESTA DEPENDENCIA
  setError, 
  cargarCortesCreados,
  address,
  guardarTransaccion
]);
  // Toggle selección de corte
  const toggleCorteSeleccionado = useCallback((corteId: bigint) => {
    setCortesSeleccionados(prev => 
      prev.includes(corteId)
        ? prev.filter(id => id !== corteId)
        : [...prev, corteId]
    );
  }, []);

  return {
    // Estados de UI
    selectedAnimal,
    tipoCorte,
    pesoCorte,
    exportadorAddress,
    cortesSeleccionados,
    
    // Setters
    setSelectedAnimal,
    setTipoCorte,
    setPesoCorte,
    setExportadorAddress,
    setCortesSeleccionados,
    
    // Acciones
    aceptarTransferencia,
    procesarAnimal,
    crearCorte,
    transferirCortesAExportador,
    generarQRParaCorte,
    toggleCorteSeleccionado
  };
}