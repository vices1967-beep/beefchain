// src/components/frigorifico/hooks/useFrigorificoData.ts - COMPLETO Y CORREGIDO
import { useState, useCallback } from 'react';
import { AnimalEnFrigorifico, Corte, LotePendiente } from '../types';

interface TransferenciasPendientes {
  animals: AnimalEnFrigorifico[];
  batches: LotePendiente[];
}

export function useFrigorificoData(contractService: any, address: string | null) {
  // Estados de datos
  const [transferenciasPendientes, setTransferenciasPendientes] = useState<TransferenciasPendientes>({ 
    animals: [], 
    batches: [] 
  });
  const [animalesRecibidos, setAnimalesRecibidos] = useState<AnimalEnFrigorifico[]>([]);
  const [cortesCreados, setCortesCreados] = useState<Corte[]>([]);
  
  // Estados de carga
  const [isLoading, setIsLoading] = useState(false);
  const [aceptandoTransferencia, setAceptandoTransferencia] = useState<bigint | null>(null);
  const [tipoTransferencia, setTipoTransferencia] = useState<'animal' | 'lote' | null>(null);
  const [procesandoAnimal, setProcesandoAnimal] = useState<bigint | null>(null);
  const [creandoCorte, setCreandoCorte] = useState(false);

  // Cargar transferencias pendientes
  const cargarTransferenciasPendientes = useCallback(async () => {
    if (!contractService || !address) return;
    
    try {
      console.log('🔄 Cargando transferencias pendientes...');
      const pendientes = await contractService.getAllPendingTransfers();
      setTransferenciasPendientes(pendientes);
      console.log(`✅ ${pendientes.animals.length} animales + ${pendientes.batches.length} lotes pendientes`);
    } catch (error: any) {
      console.error('❌ Error cargando transferencias pendientes:', error);
      throw error;
    }
  }, [contractService, address]);

  // Cargar animales recibidos (que ya fueron transferidos al frigorífico)
  const cargarAnimalesRecibidos = useCallback(async () => {
    if (!contractService || !address) return;
    
    try {
      setIsLoading(true);
      console.log('🔄 Cargando animales recibidos...');
      const animales = await contractService.getAnimalsByFrigorifico();
      
      // Filtrar SOLO animales que realmente pertenecen al frigorífico actual
      const animalesDelFrigorifico = animales.filter((animal: AnimalEnFrigorifico) => {
        // Verificar que el animal está asignado a este frigorífico
        const esDelFrigorifico = animal.frigorifico?.toLowerCase() === address.toLowerCase();
        const estaEnEstadoValido = animal.estado === 0; // Estado CREADO (listo para procesar)
        
        console.log(`🔍 Animal #${animal.id}: frigorifico=${animal.frigorifico}, estado=${animal.estado}, esDelFrigorifico=${esDelFrigorifico}`);
        
        return esDelFrigorifico && estaEnEstadoValido;
      });
      
      setAnimalesRecibidos(animalesDelFrigorifico);
      console.log(`✅ ${animalesDelFrigorifico.length} animales transferidos al frigorífico`);
    } catch (error: any) {
      console.error('❌ Error cargando animales:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [contractService, address]);

  // Cargar cortes creados
  const cargarCortesCreados = useCallback(async () => {
    if (!contractService || !address) return;
    
    try {
      console.log('🔄 Cargando cortes creados...');
      const cortes = await contractService.getCortesByFrigorifico();
      setCortesCreados(cortes);
      console.log(`✅ ${cortes.length} cortes cargados`);
    } catch (error: any) {
      console.error('❌ Error cargando cortes:', error);
      throw error;
    }
  }, [contractService, address]);

  // Cargar todos los datos
  const cargarTodosLosDatos = useCallback(async () => {
    if (!contractService || !address) return;
    
    try {
      console.log('🔄 Cargando todos los datos del frigorífico...');
      await Promise.all([
        cargarTransferenciasPendientes(),
        cargarAnimalesRecibidos(),
        cargarCortesCreados()
      ]);
      console.log('✅ Todos los datos cargados exitosamente');
    } catch (error: any) {
      console.error('❌ Error cargando datos del frigorífico:', error);
      throw error;
    }
  }, [contractService, address, cargarTransferenciasPendientes, cargarAnimalesRecibidos, cargarCortesCreados]);

  // Función para recargar datos específicos según la pestaña activa
  const recargarDatos = useCallback(async (activeTab?: string) => {
    if (!contractService || !address) return;
    
    try {
      console.log(`🔄 Recargando datos para pestaña: ${activeTab || 'todas'}`);
      
      switch (activeTab) {
        case 'pendientes':
          await cargarTransferenciasPendientes();
          break;
        case 'recepcion':
        case 'procesamiento':
          await cargarAnimalesRecibidos();
          break;
        case 'cortes':
        case 'exportacion':
          await cargarCortesCreados();
          break;
        default:
          await cargarTodosLosDatos();
      }
      console.log(`✅ Datos recargados para pestaña: ${activeTab}`);
    } catch (error: any) {
      console.error('❌ Error recargando datos:', error);
      throw error;
    }
  }, [contractService, address, cargarTransferenciasPendientes, cargarAnimalesRecibidos, cargarCortesCreados, cargarTodosLosDatos]);

  return {
    // Datos
    transferenciasPendientes,
    animalesRecibidos,
    cortesCreados,
    isLoading,
    
    // Estados de carga
    aceptandoTransferencia,
    tipoTransferencia,
    procesandoAnimal,
    creandoCorte,
    
    // Setters de estados de carga
    setAceptandoTransferencia,
    setTipoTransferencia,
    setProcesandoAnimal,
    setCreandoCorte,
    
    // Funciones de carga
    cargarTransferenciasPendientes,
    cargarAnimalesRecibidos,
    cargarCortesCreados,
    cargarTodosLosDatos,
    recargarDatos // ✅ AÑADIDO
  };
}