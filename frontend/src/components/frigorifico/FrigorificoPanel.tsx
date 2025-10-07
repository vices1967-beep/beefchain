// src/components/frigorifico/FrigorificoPanel.tsx - COMPLETO Y CORREGIDO
'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';
import { EstadoAnimal, TipoCorte, RazaAnimal } from '@/contracts/config';

interface AnimalEnFrigorifico {
  id: bigint;
  raza: RazaAnimal;
  peso: bigint;
  propietario: string;
  fechaRecepcion: bigint;
  estado: EstadoAnimal;
  loteId?: bigint;
  metadataHash?: string;
  frigorifico?: string;
  tipo?: 'individual' | 'lote';
}

interface Corte {
  id: bigint;
  animalId: bigint;
  tipoCorte: TipoCorte;
  peso: bigint;
  fechaProcesamiento: bigint;
  certificado: boolean;
  qrHash?: string;
  propietario: string;
  frigorifico: string;
}

interface LotePendiente {
  id: bigint;
  propietario: string;
  frigorifico: string;
  cantidad_animales: number;
  peso_total: bigint;
  animal_ids: bigint[];
  tipo: 'lote';
}

export function FrigorificoPanel() {
  const { address, contractService, userRole } = useStarknet();
  const [animalesRecibidos, setAnimalesRecibidos] = useState<AnimalEnFrigorifico[]>([]);
  const [cortesCreados, setCortesCreados] = useState<Corte[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'recepcion' | 'procesamiento' | 'cortes' | 'exportacion' | 'pendientes'>('pendientes');
  const [selectedAnimal, setSelectedAnimal] = useState<bigint | null>(null);
  const [tipoCorte, setTipoCorte] = useState<TipoCorte>(TipoCorte.LOMO);
  const [pesoCorte, setPesoCorte] = useState<string>('');
  const [procesandoAnimal, setProcesandoAnimal] = useState<bigint | null>(null);
  const [creandoCorte, setCreandoCorte] = useState(false);
  const [exportadorAddress, setExportadorAddress] = useState<string>('');
  const [cortesSeleccionados, setCortesSeleccionados] = useState<bigint[]>([]);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  // Nuevos estados para transferencias pendientes
  const [transferenciasPendientes, setTransferenciasPendientes] = useState<{
    animals: AnimalEnFrigorifico[];
    batches: LotePendiente[];
  }>({ animals: [], batches: [] });
  const [aceptandoTransferencia, setAceptandoTransferencia] = useState<bigint | null>(null);
  const [tipoTransferencia, setTipoTransferencia] = useState<'animal' | 'lote' | null>(null);

  // Verificar si tiene rol de frigorífico
  const tieneRolFrigorifico = userRole.includes('Frigorífico') || userRole.includes('FRIGORIFICO') || userRole.includes('FRIGORIFICO_ROLE');

  // ============ FUNCIONES NUEVAS PARA TRANSFERENCIAS PENDIENTES ============

  // Cargar transferencias pendientes de aceptación
  const cargarTransferenciasPendientes = async () => {
    if (!contractService || !address) return;
    
    try {
      console.log('🔄 Cargando transferencias pendientes...');
      
      // Usar las nuevas funciones del servicio
      const pendientes = await contractService.getAllPendingTransfers();
      setTransferenciasPendientes(pendientes);
      console.log(`✅ ${pendientes.animals.length} animales + ${pendientes.batches.length} lotes pendientes`);
      
    } catch (error) {
      console.error('❌ Error cargando transferencias pendientes:', error);
      setError('Error al cargar transferencias pendientes');
    }
  };

  // Aceptar transferencia con pago
  const aceptarTransferencia = async (id: bigint, tipo: 'animal' | 'lote') => {
    if (!contractService) return;
    
    try {
      setAceptandoTransferencia(id);
      setTipoTransferencia(tipo);
      setError('');
      
      console.log(`💰 Aceptando ${tipo} #${id} con pago...`);
      
      let result;
      if (tipo === 'animal') {
        result = await contractService.acceptAnimalWithPayment(id);
      } else {
        result = await contractService.acceptBatchWithPayment(id);
      }
      
      setTxHash(result.txHash);
      
      // Recargar datos
      await cargarTransferenciasPendientes();
      await cargarAnimalesRecibidos();
      
      console.log(`✅ ${tipo} #${id} aceptado y pagado exitosamente`);
      
    } catch (error: any) {
      console.error(`❌ Error aceptando ${tipo}:`, error);
      setError(`Error aceptando ${tipo}: ${error.message}`);
    } finally {
      setAceptandoTransferencia(null);
      setTipoTransferencia(null);
    }
  };

  // ============ FUNCIONES EXISTENTES (ACTUALIZADAS) ============

  // Cargar animales recibidos por el frigorífico - ACTUALIZADA
  const cargarAnimalesRecibidos = async () => {
    if (!contractService || !address) return;
    
    try {
      setIsLoading(true);
      console.log('🔄 Cargando animales recibidos...');
      
      // Usar la nueva función específica para frigorífico
      const animales = await contractService.getAnimalsByFrigorifico();
      setAnimalesRecibidos(animales);
      console.log(`✅ ${animales.length} animales cargados para procesar`);
      
    } catch (error) {
      console.error('❌ Error cargando animales:', error);
      setError('Error al cargar animales recibidos');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar cortes creados por el frigorífico - ACTUALIZADA
  const cargarCortesCreados = async () => {
    if (!contractService || !address) return;
    
    try {
      console.log('🔄 Cargando cortes creados...');
      
      // Usar la nueva función específica para frigorífico
      const cortes = await contractService.getCortesByFrigorifico();
      setCortesCreados(cortes);
      console.log(`✅ ${cortes.length} cortes cargados`);
      
    } catch (error) {
      console.error('❌ Error cargando cortes:', error);
      setError('Error al cargar cortes creados');
    }
  };

  // Inicializar datos - ACTUALIZADA
  useEffect(() => {
    if (contractService && address && tieneRolFrigorifico) {
      cargarTransferenciasPendientes(); // ✅ PRIMERO cargar pendientes
      cargarAnimalesRecibidos();
      cargarCortesCreados();
    }
  }, [contractService, address, tieneRolFrigorifico]);

  // Procesar animal (cambiar estado a PROCESADO)
  const procesarAnimal = async (animalId: bigint) => {
    if (!contractService) return;
    
    try {
      setProcesandoAnimal(animalId);
      setError('');
      
      console.log(`🔪 Procesando animal #${animalId}...`);
      
      const txHash = await contractService.procesarAnimal(animalId);
      setTxHash(txHash);
      
      await contractService.waitForTransaction(txHash);
      
      // Actualizar estado local
      setAnimalesRecibidos(prev => 
        prev.map(animal => 
          animal.id === animalId 
            ? { ...animal, estado: EstadoAnimal.PROCESADO }
            : animal
        )
      );
      
      console.log(`✅ Animal #${animalId} procesado exitosamente`);
      
    } catch (error: any) {
      console.error('❌ Error procesando animal:', error);
      setError(`Error procesando animal: ${error.message}`);
    } finally {
      setProcesandoAnimal(null);
    }
  };

  // Crear corte a partir de animal procesado
  const crearCorte = async () => {
    if (!contractService || !selectedAnimal || !pesoCorte) return;
    
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
      
      await cargarCortesCreados();
      
      // Limpiar formulario
      setSelectedAnimal(null);
      setPesoCorte('');
      setTipoCorte(TipoCorte.LOMO);
      
      console.log('✅ Corte creado exitosamente');
      
    } catch (error: any) {
      console.error('❌ Error creando corte:', error);
      setError(`Error creando corte: ${error.message}`);
    } finally {
      setCreandoCorte(false);
    }
  };

  // Transferir cortes a exportador
  const transferirCortesAExportador = async () => {
    if (!contractService || !exportadorAddress || cortesSeleccionados.length === 0) return;
    
    try {
      setError('');
      
      for (const corteId of cortesSeleccionados) {
        const corte = cortesCreados.find(c => c.id === corteId);
        
        if (!corte) {
          console.error(`Corte #${corteId} no encontrado`);
          continue;
        }
        
        console.log(`🌍 Transferiendo corte #${corteId} a exportador...`);
        const txHash = await contractService.transferCorteToExportador(
          corte.animalId,
          corteId,
          exportadorAddress
        );
        setTxHash(txHash);
        
        await contractService.waitForTransaction(txHash);
      }
      
      await cargarCortesCreados();
      setCortesSeleccionados([]);
      setExportadorAddress('');
      
      console.log('✅ Cortes transferidos a exportador exitosamente');
      
    } catch (error: any) {
      console.error('❌ Error transfiriendo cortes:', error);
      setError(`Error transfiriendo cortes: ${error.message}`);
    }
  };

  // Generar QR para corte
  const generarQRParaCorte = async (corteId: bigint) => {
    if (!contractService) return;
    
    try {
      setError('');
      
      console.log(`📱 Generando QR para corte #${corteId}...`);
      
      const corte = cortesCreados.find(c => c.id === corteId);
      if (!corte) {
        setError('Corte no encontrado');
        return;
      }
      
      const qrHash = await contractService.generateQrForCorte(corte.animalId, corteId);
      
      setCortesCreados(prev => 
        prev.map(c => 
          c.id === corteId 
            ? { ...c, qrHash }
            : c
        )
      );
      
      console.log(`✅ QR generado para corte #${corteId}: ${qrHash}`);
      
    } catch (error: any) {
      console.error('❌ Error generando QR:', error);
      setError(`Error generando QR: ${error.message}`);
    }
  };

  // Seleccionar/deseleccionar corte para exportación
  const toggleCorteSeleccionado = (corteId: bigint) => {
    setCortesSeleccionados(prev => 
      prev.includes(corteId)
        ? prev.filter(id => id !== corteId)
        : [...prev, corteId]
    );
  };

  // Helper functions
  const getRazaNombre = (raza: RazaAnimal): string => {
    switch (raza) {
      case RazaAnimal.ANGUS: return 'Angus';
      case RazaAnimal.HEREFORD: return 'Hereford';
      case RazaAnimal.BRANGUS: return 'Brangus';
      default: return 'Desconocida';
    }
  };

  const getTipoCorteNombre = (tipo: TipoCorte): string => {
    switch (tipo) {
      case TipoCorte.LOMO: return 'Lomo';
      case TipoCorte.BIFE_ANCHO: return 'Bife Ancho';
      case TipoCorte.BIFE_ANGOSTO: return 'Bife Angosto';
      case TipoCorte.CUADRADA: return 'Cuadrada';
      case TipoCorte.NALGA: return 'Nalga';
      case TipoCorte.COSTILLAR: return 'Costillar';
      default: return 'Desconocido';
    }
  };

  const getEstadoNombre = (estado: EstadoAnimal): string => {
    switch (estado) {
      case EstadoAnimal.CREADO: return '📥 Recibido';
      case EstadoAnimal.PROCESADO: return '🔪 Procesado';
      case EstadoAnimal.CERTIFICADO: return '🏅 Certificado';
      case EstadoAnimal.EXPORTADO: return '📤 Exportado';
      default: return 'Desconocido';
    }
  };

  const getEstadoColor = (estado: EstadoAnimal) => {
    switch (estado) {
      case EstadoAnimal.CREADO: return 'bg-blue-100 text-blue-800 border-blue-200';
      case EstadoAnimal.PROCESADO: return 'bg-green-100 text-green-800 border-green-200';
      case EstadoAnimal.CERTIFICADO: return 'bg-purple-100 text-purple-800 border-purple-200';
      case EstadoAnimal.EXPORTADO: return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatFecha = (timestamp: bigint): string => {
    if (!timestamp || timestamp === BigInt(0)) return 'No disponible';
    return new Date(Number(timestamp) * 1000).toLocaleDateString('es-ES');
  };

  // Animales procesados por ESTE frigorífico
  const animalesProcesados = animalesRecibidos.filter(animal => 
    animal.estado === EstadoAnimal.PROCESADO
  );

  // Cortes listos para exportar (no certificados aún)
  const cortesParaExportar = cortesCreados.filter(corte => !corte.certificado);

  // Si no tiene rol de frigorífico
  if (!tieneRolFrigorifico) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h3 className="text-2xl font-bold text-red-800 mb-4">Acceso Restringido</h3>
        <p className="text-red-600 mb-4">
          No tienes permisos de Frigorífico para acceder a este panel
        </p>
        <p className="text-red-500 text-sm">
          Tu rol actual: <span className="font-bold">{userRole}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header del Frigorífico */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🏭 Panel del Frigorífico</h2>
            <p className="text-orange-100">
              Procesamiento de animales y gestión de cortes para exportación
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Conectado como Frigorífico</span>
            </div>
            <p className="text-sm text-orange-200 font-mono">
              {address?.slice(0, 8)}...{address?.slice(-6)}
            </p>
          </div>
        </div>
      </div>

      {/* Navegación por pestañas - ACTUALIZADA */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-lg">
        <nav className="flex flex-wrap gap-2">
          {[
            { id: 'pendientes', label: '⏳ Pendientes', icon: '⏳' },
            { id: 'recepcion', label: '📥 Recepción', icon: '📥' },
            { id: 'procesamiento', label: '🔪 Procesamiento', icon: '🔪' },
            { id: 'cortes', label: '🥩 Cortes', icon: '🥩' },
            { id: 'exportacion', label: '🌍 Exportación', icon: '🌍' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-semibold">Error:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => setError('')}
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}

      {txHash && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-700 font-semibold">
            ✅ Transacción confirmada: {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </p>
        </div>
      )}

      {/* Contenido de las pestañas COMPLETO Y CORREGIDO */}
      <div className="space-y-8">
        
        {/* NUEVA PESTAÑA: Transferencias Pendientes */}
        {activeTab === 'pendientes' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <span>⏳</span>
                Transferencias Pendientes
              </h3>
              <button
                onClick={cargarTransferenciasPendientes}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <span>🔄</span>
                Actualizar
              </button>
            </div>

            {/* Animales Individuales Pendientes */}
            <div className="mb-8">
              <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span>🐄</span>
                Animales Individuales ({transferenciasPendientes.animals.length})
              </h4>
              
              {transferenciasPendientes.animals.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
                  <div className="text-4xl mb-4">📭</div>
                  <p className="text-gray-500">No hay animales pendientes de aceptación</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transferenciasPendientes.animals.map((animal) => (
                    <div key={animal.id.toString()} className="border border-orange-200 rounded-xl p-4 bg-orange-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h4 className="font-semibold text-lg">Animal #{animal.id.toString()}</h4>
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                              ⏳ Pendiente
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Raza:</span> {getRazaNombre(animal.raza)}
                            </div>
                            <div>
                              <span className="font-medium">Peso:</span> {animal.peso.toString()} kg
                            </div>
                            <div>
                              <span className="font-medium">Productor:</span> {animal.propietario.slice(0, 8)}...
                            </div>
                            <div>
                              <span className="font-medium">Valor estimado:</span> ${(Number(animal.peso) * 2.5).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => aceptarTransferencia(animal.id, 'animal')}
                          disabled={aceptandoTransferencia === animal.id}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors text-sm font-semibold"
                        >
                          {aceptandoTransferencia === animal.id && tipoTransferencia === 'animal' ? (
                            <span className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Procesando...
                            </span>
                          ) : (
                            '💰 Aceptar y Pagar'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lotes Pendientes */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span>📦</span>
                Lotes Completos ({transferenciasPendientes.batches.length})
              </h4>
              
              {transferenciasPendientes.batches.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl">
                  <div className="text-4xl mb-4">📦</div>
                  <p className="text-gray-500">No hay lotes pendientes de aceptación</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transferenciasPendientes.batches.map((lote) => (
                    <div key={lote.id.toString()} className="border border-blue-200 rounded-xl p-4 bg-blue-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h4 className="font-semibold text-lg">Lote #{lote.id.toString()}</h4>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              ⏳ Pendiente
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                            <div>
                              <span className="font-medium">Animales:</span> {lote.cantidad_animales}
                            </div>
                            <div>
                              <span className="font-medium">Peso total:</span> {lote.peso_total.toString()} kg
                            </div>
                            <div>
                              <span className="font-medium">Productor:</span> {lote.propietario.slice(0, 8)}...
                            </div>
                            <div>
                              <span className="font-medium">Valor estimado:</span> ${(Number(lote.peso_total) * 2.2).toFixed(2)}
                            </div>
                          </div>
                          
                          {lote.animal_ids && lote.animal_ids.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">
                                Animales en lote:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {lote.animal_ids.slice(0, 6).map((animalId: bigint) => (
                                  <span key={animalId.toString()} className="bg-white px-2 py-1 rounded text-xs border">
                                    #{animalId.toString()}
                                  </span>
                                ))}
                                {lote.animal_ids.length > 6 && (
                                  <span className="bg-white px-2 py-1 rounded text-xs">
                                    +{lote.animal_ids.length - 6} más
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => aceptarTransferencia(lote.id, 'lote')}
                          disabled={aceptandoTransferencia === lote.id}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors text-sm font-semibold"
                        >
                          {aceptandoTransferencia === lote.id && tipoTransferencia === 'lote' ? (
                            <span className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Procesando...
                            </span>
                          ) : (
                            '💰 Aceptar Lote'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pestaña: Recepción */}
        {activeTab === 'recepcion' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <span>📥</span>
                Animales Recibidos ({animalesRecibidos.length})
              </h3>
              <button
                onClick={cargarAnimalesRecibidos}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center gap-2"
              >
                <span>🔄</span>
                Actualizar
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Cargando animales...</p>
              </div>
            ) : animalesRecibidos.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🐄</div>
                <p className="text-gray-600">No hay animales recibidos</p>
                <p className="text-gray-400 text-sm mt-2">
                  Los animales transferidos por productores aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {animalesRecibidos.map((animal) => (
                  <div key={animal.id.toString()} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h4 className="font-semibold text-lg">Animal #{animal.id.toString()}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(animal.estado)}`}>
                            {getEstadoNombre(animal.estado)}
                          </span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            {getRazaNombre(animal.raza)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">Peso:</span> {animal.peso.toString()} kg
                          </div>
                          <div>
                            <span className="font-medium">Recibido:</span> {formatFecha(animal.fechaRecepcion)}
                          </div>
                          <div>
                            <span className="font-medium">Propietario:</span> {animal.propietario.slice(0, 8)}...
                          </div>
                          {animal.loteId && (
                            <div>
                              <span className="font-medium">Lote:</span> #{animal.loteId.toString()}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {animal.estado === EstadoAnimal.CREADO && (
                        <button
                          onClick={() => procesarAnimal(animal.id)}
                          disabled={procesandoAnimal === animal.id}
                          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 transition-colors text-sm font-semibold"
                        >
                          {procesandoAnimal === animal.id ? (
                            <span className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Procesando...
                            </span>
                          ) : (
                            '🔪 Procesar'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Procesamiento */}
        {activeTab === 'procesamiento' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Lista de animales para procesar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <span>🔪</span>
                Animales para Procesar ({animalesRecibidos.filter(a => a.estado === EstadoAnimal.CREADO).length})
              </h3>
              
              <div className="space-y-4">
                {animalesRecibidos
                  .filter(animal => animal.estado === EstadoAnimal.CREADO)
                  .map((animal) => (
                  <div key={animal.id.toString()} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold">Animal #{animal.id.toString()}</h4>
                        <p className="text-sm text-gray-600">
                          {getRazaNombre(animal.raza)} • {animal.peso.toString()} kg
                        </p>
                      </div>
                      <button
                        onClick={() => procesarAnimal(animal.id)}
                        disabled={procesandoAnimal === animal.id}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition-colors text-sm font-semibold"
                      >
                        {procesandoAnimal === animal.id ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Procesando...
                          </span>
                        ) : (
                          '🔪 Procesar Animal'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                
                {animalesRecibidos.filter(animal => animal.estado === EstadoAnimal.CREADO).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No hay animales pendientes de procesar</p>
                    <p className="text-sm mt-2">Los animales en estado "Recibido" aparecerán aquí</p>
                  </div>
                )}
              </div>
            </div>

            {/* Crear cortes */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <span>🥩</span>
                Crear Nuevo Corte
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Animal Procesado *
                  </label>
                  <select
                    value={selectedAnimal?.toString() || ''}
                    onChange={(e) => setSelectedAnimal(e.target.value ? BigInt(e.target.value) : null)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Seleccionar animal procesado</option>
                    {animalesProcesados.map((animal) => (
                      <option key={animal.id.toString()} value={animal.id.toString()}>
                        Animal #{animal.id.toString()} - {getRazaNombre(animal.raza)} - {animal.peso.toString()}kg
                      </option>
                    ))}
                  </select>
                  {animalesProcesados.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Primero procesa un animal para poder crear cortes
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Corte *
                  </label>
                  <select
                    value={tipoCorte}
                    onChange={(e) => setTipoCorte(parseInt(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={TipoCorte.LOMO}>Lomo</option>
                    <option value={TipoCorte.BIFE_ANCHO}>Bife Ancho</option>
                    <option value={TipoCorte.BIFE_ANGOSTO}>Bife Angosto</option>
                    <option value={TipoCorte.CUADRADA}>Cuadrada</option>
                    <option value={TipoCorte.NALGA}>Nalga</option>
                    <option value={TipoCorte.COSTILLAR}>Costillar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peso del Corte (kg) *
                  </label>
                  <input
                    type="number"
                    value={pesoCorte}
                    onChange={(e) => setPesoCorte(e.target.value)}
                    placeholder="Ej: 25"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    min="1"
                  />
                </div>

                <button
                  onClick={crearCorte}
                  disabled={!selectedAnimal || !pesoCorte || creandoCorte}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl hover:from-orange-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 transition-all font-semibold"
                >
                  {creandoCorte ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creando Corte...
                    </span>
                  ) : (
                    '🥩 Crear Corte'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pestaña: Cortes Creados */}
        {activeTab === 'cortes' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <span>🥩</span>
                Cortes Creados ({cortesCreados.length})
              </h3>
              <button
                onClick={cargarCortesCreados}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <span>🔄</span>
                Actualizar
              </button>
            </div>

            {cortesCreados.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🥩</div>
                <p className="text-gray-600">No hay cortes creados</p>
                <p className="text-gray-400 text-sm mt-2">
                  Los cortes que crees aparecerán aquí
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cortesCreados.map((corte) => (
                  <div key={corte.id.toString()} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h4 className="font-semibold text-lg">Corte #{corte.id.toString()}</h4>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            {getTipoCorteNombre(corte.tipoCorte)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            corte.certificado 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {corte.certificado ? '🏅 Certificado' : '⏳ Pendiente certificación'}
                          </span>
                          {corte.qrHash && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              📱 QR Generado
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Animal Origen:</span> #{corte.animalId.toString()}
                          </div>
                          <div>
                            <span className="font-medium">Peso:</span> {corte.peso.toString()} kg
                          </div>
                          <div>
                            <span className="font-medium">Procesado:</span> {formatFecha(corte.fechaProcesamiento)}
                          </div>
                          <div>
                            <span className="font-medium">Propietario:</span> {corte.propietario.slice(0, 8)}...
                          </div>
                        </div>
                        
                        {corte.qrHash && (
                          <div className="mt-2">
                            <span className="font-medium text-sm">QR Hash:</span>
                            <code className="text-xs bg-gray-100 p-1 rounded ml-2 font-mono">
                              {corte.qrHash.slice(0, 20)}...
                            </code>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {!corte.qrHash && (
                          <button
                            onClick={() => generarQRParaCorte(corte.id)}
                            className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
                          >
                            📱 Generar QR
                          </button>
                        )}
                        <button
                          onClick={() => toggleCorteSeleccionado(corte.id)}
                          className={`px-3 py-2 rounded-lg transition-colors text-sm font-semibold ${
                            cortesSeleccionados.includes(corte.id)
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {cortesSeleccionados.includes(corte.id) ? '✅ Seleccionado' : '🌍 Seleccionar para Exportar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Exportación */}
        {activeTab === 'exportacion' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <span>🌍</span>
              Exportación de Cortes
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Selección de cortes */}
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-4">
                    Cortes Disponibles para Exportar ({cortesParaExportar.length})
                  </h4>
                  
                  {cortesParaExportar.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-500">No hay cortes disponibles para exportar</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Todos los cortes están certificados o ya fueron exportados
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {cortesParaExportar.map((corte) => (
                        <div
                          key={corte.id.toString()}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            cortesSeleccionados.includes(corte.id)
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => toggleCorteSeleccionado(corte.id)}
                        >
                          <input
                            type="checkbox"
                            checked={cortesSeleccionados.includes(corte.id)}
                            onChange={() => toggleCorteSeleccionado(corte.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium">Corte #{corte.id.toString()}</p>
                            <p className="text-sm text-gray-600">
                              {getTipoCorteNombre(corte.tipoCorte)} • {corte.peso.toString()}kg • Animal #{corte.animalId.toString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h5 className="font-semibold text-yellow-800 mb-2">💡 Información Importante</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Solo se pueden exportar cortes no certificados</li>
                    <li>• La certificación la realiza el rol CERTIFICADOR</li>
                    <li>• Los cortes certificados están listos para exportación internacional</li>
                    <li>• Genera QR para cada corte antes de exportar</li>
                  </ul>
                </div>
              </div>

              {/* Formulario de exportación */}
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-4">Destino de Exportación</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address del Exportador *
                      </label>
                      <input
                        type="text"
                        value={exportadorAddress}
                        onChange={(e) => setExportadorAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-semibold text-blue-800 mb-2">📋 Resumen de Transferencia</h5>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p><strong>Cortes seleccionados:</strong> {cortesSeleccionados.length}</p>
                        <p><strong>Total peso:</strong> {
                          cortesSeleccionados.reduce((total, corteId) => {
                            const corte = cortesParaExportar.find(c => c.id === corteId);
                            return total + (corte ? Number(corte.peso) : 0);
                          }, 0)
                        } kg</p>
                        {cortesSeleccionados.length > 0 && (
                          <p className="text-xs mt-2">
                            Animales involucrados: {
                              [...new Set(cortesSeleccionados.map(corteId => {
                                const corte = cortesParaExportar.find(c => c.id === corteId);
                                return corte?.animalId.toString();
                              }))].filter(Boolean).join(', ')
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={transferirCortesAExportador}
                      disabled={!exportadorAddress || cortesSeleccionados.length === 0}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 transition-all font-semibold"
                    >
                      🌍 Transferir {cortesSeleccionados.length} Cortes a Exportador
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}