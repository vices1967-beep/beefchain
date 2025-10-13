// src/components/frigorifico/utils/dataAdapters.ts
import { AnimalEnFrigorifico, LotePendiente, TransferenciasPendientes } from '../types';

// ✅ Adaptar datos de animales del contrato a la interfaz
export function adaptAnimalData(animalData: any): AnimalEnFrigorifico {
  return {
    id: animalData.id || BigInt(0),
    raza: animalData.raza || 0,
    peso: animalData.peso || BigInt(0),
    propietario: animalData.propietario || '',
    fechaRecepcion: animalData.fechaRecepcion || animalData.fechaCreacion || BigInt(0),
    estado: animalData.estado || 0,
    frigorifico: animalData.frigorifico || '',
    fecha_transferencia: animalData.fecha_transferencia || animalData.fechaTransferencia || BigInt(0),
    loteId: animalData.loteId || animalData.lote_id || BigInt(0),
    metadataHash: animalData.metadataHash || '',
    tipo: animalData.tipo || 'individual',
    batchInfo: animalData.batchInfo
  };
}

// ✅ Adaptar datos de lotes del contrato a la interfaz
export function adaptBatchData(batchData: any): LotePendiente {
  return {
    id: batchData.id || BigInt(0),
    propietario: batchData.propietario || '',
    frigorifico: batchData.frigorifico || '',
    fecha_creacion: batchData.fecha_creacion || batchData.fechaCreacion || BigInt(0),
    fecha_transferencia: batchData.fecha_transferencia || batchData.fechaTransferencia || BigInt(0),
    fecha_procesamiento: batchData.fecha_procesamiento || batchData.fechaProcesamiento || BigInt(0),
    estado: batchData.estado || 0,
    cantidad_animales: batchData.cantidad_animales || batchData.cantidadAnimales || 0,
    peso_total: batchData.peso_total || batchData.pesoTotal || BigInt(0),
    animal_ids: batchData.animal_ids || batchData.animalIds || [],
    animales: batchData.animales ? batchData.animales.map(adaptAnimalData) : undefined,
    tipo: batchData.tipo || 'lote'
  };
}

// ✅ Adaptar transferencias pendientes completas
export function adaptPendingTransfers(data: any): TransferenciasPendientes {
  return {
    animals: Array.isArray(data.animals) 
      ? data.animals.map(adaptAnimalData)
      : [],
    batches: Array.isArray(data.batches)
      ? data.batches.map(adaptBatchData)
      : []
  };
}