// src/components/frigorifico/utils/helpers.ts - COMPLETO Y COMPAGINADO
import { RazaAnimal, EstadoAnimal, TipoCorte } from '@/contracts/config';

// ============ FUNCIONES DE CONVERSIÓN DE ENUMS ============

export const getRazaNombre = (raza: RazaAnimal): string => {
  switch (raza) {
    case RazaAnimal.ANGUS: return 'Angus';
    case RazaAnimal.HEREFORD: return 'Hereford';
    case RazaAnimal.BRANGUS: return 'Brangus';
    default: return 'Desconocida';
  }
};

export const getTipoCorteNombre = (tipo: TipoCorte): string => {
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

export const getEstadoNombre = (estado: EstadoAnimal): string => {
  switch (estado) {
    case EstadoAnimal.CREADO: return '📥 Recibido';
    case EstadoAnimal.PROCESADO: return '🔪 Procesado';
    case EstadoAnimal.CERTIFICADO: return '🏅 Certificado';
    case EstadoAnimal.EXPORTADO: return '📤 Exportado';
    default: return 'Desconocido';
  }
};

// ============ FUNCIONES DE CONVERSIÓN NÚMERO A ENUM ============

/**
 * Convierte un número a RazaAnimal
 */
export const numberToRazaAnimal = (value: number): RazaAnimal => {
  switch (value) {
    case 1:
      return RazaAnimal.ANGUS;
    case 2:
      return RazaAnimal.HEREFORD;
    case 3:
      return RazaAnimal.BRANGUS;
    default:
      return RazaAnimal.ANGUS; // Valor por defecto
  }
};

/**
 * Convierte un número a TipoCorte (valores 1-6 según tu config)
 */
export const numberToTipoCorte = (value: number): TipoCorte => {
  switch (value) {
    case 1:
      return TipoCorte.LOMO;
    case 2:
      return TipoCorte.BIFE_ANCHO;
    case 3:
      return TipoCorte.BIFE_ANGOSTO;
    case 4:
      return TipoCorte.CUADRADA;
    case 5:
      return TipoCorte.NALGA;
    case 6:
      return TipoCorte.COSTILLAR;
    default:
      return TipoCorte.LOMO; // Valor por defecto
  }
};

/**
 * Convierte un número a EstadoAnimal
 */
export const numberToEstadoAnimal = (value: number): EstadoAnimal => {
  switch (value) {
    case 0:
      return EstadoAnimal.CREADO;
    case 1:
      return EstadoAnimal.PROCESADO;
    case 2:
      return EstadoAnimal.CERTIFICADO;
    case 3:
      return EstadoAnimal.EXPORTADO;
    default:
      return EstadoAnimal.CREADO; // Valor por defecto
  }
};

// ============ FUNCIONES DE ESTILOS ============

export const getEstadoColor = (estado: EstadoAnimal) => {
  switch (estado) {
    case EstadoAnimal.CREADO: return 'bg-blue-100 text-blue-800 border-blue-200';
    case EstadoAnimal.PROCESADO: return 'bg-green-100 text-green-800 border-green-200';
    case EstadoAnimal.CERTIFICADO: return 'bg-purple-100 text-purple-800 border-purple-200';
    case EstadoAnimal.EXPORTADO: return 'bg-orange-100 text-orange-800 border-orange-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getTipoCorteColor = (tipo: TipoCorte) => {
  switch (tipo) {
    case TipoCorte.LOMO: return 'bg-red-100 text-red-800 border-red-200';
    case TipoCorte.BIFE_ANCHO: return 'bg-orange-100 text-orange-800 border-orange-200';
    case TipoCorte.BIFE_ANGOSTO: return 'bg-amber-100 text-amber-800 border-amber-200';
    case TipoCorte.CUADRADA: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case TipoCorte.NALGA: return 'bg-lime-100 text-lime-800 border-lime-200';
    case TipoCorte.COSTILLAR: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// ============ FUNCIONES DE FORMATEO ============

export const formatFecha = (timestamp: bigint): string => {
  if (!timestamp || timestamp === BigInt(0)) return 'No disponible';
  return new Date(Number(timestamp) * 1000).toLocaleDateString('es-ES');
};

export const formatFechaCompleta = (timestamp: bigint): string => {
  if (!timestamp || timestamp === BigInt(0)) return 'No disponible';
  return new Date(Number(timestamp) * 1000).toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatPeso = (peso: bigint): string => {
  return `${peso.toString()} kg`;
};

export const formatDireccion = (direccion: string): string => {
  if (!direccion || direccion === '0x0') return 'No asignado';
  return `${direccion.slice(0, 8)}...${direccion.slice(-6)}`;
};

// ============ FUNCIONES DE VALIDACIÓN ============

export const isValidAnimalId = (animalId: bigint): boolean => {
  return animalId > BigInt(0);
};

export const isValidPeso = (peso: bigint): boolean => {
  return peso > BigInt(0);
};

export const isValidAddress = (address: string): boolean => {
  return !!address && address !== '0x0' && address.startsWith('0x');
};
// ============ FUNCIONES PARA FORMULARIOS ============

/**
 * Opciones de tipos de corte para selects
 */
export const getOpcionesTipoCorte = () => {
  return [
    { value: TipoCorte.LOMO, label: 'Lomo' },
    { value: TipoCorte.BIFE_ANCHO, label: 'Bife Ancho' },
    { value: TipoCorte.BIFE_ANGOSTO, label: 'Bife Angosto' },
    { value: TipoCorte.CUADRADA, label: 'Cuadrada' },
    { value: TipoCorte.NALGA, label: 'Nalga' },
    { value: TipoCorte.COSTILLAR, label: 'Costillar' },
  ];
};

/**
 * Opciones de razas para selects
 */
export const getOpcionesRazas = () => {
  return [
    { value: RazaAnimal.ANGUS, label: 'Angus' },
    { value: RazaAnimal.HEREFORD, label: 'Hereford' },
    { value: RazaAnimal.BRANGUS, label: 'Brangus' },
  ];
};

// ============ FUNCIONES DE CALCULO ============

/**
 * Calcula el valor estimado de un animal basado en su peso
 */
export const calcularValorEstimado = (peso: bigint, precioPorKg: number = 2.5): string => {
  const valor = Number(peso) * precioPorKg;
  return `$${valor.toFixed(2)}`;
};

/**
 * Calcula el peso total de una lista de animales
 */
export const calcularPesoTotal = (animales: { peso: bigint }[]): bigint => {
  return animales.reduce((total, animal) => total + animal.peso, BigInt(0));
};

/**
 * Calcula la cantidad de animales por estado
 */
export const contarAnimalesPorEstado = (animales: { estado: EstadoAnimal }[]): Record<string, number> => {
  const conteo: Record<string, number> = {};
  
  animales.forEach(animal => {
    const estado = EstadoAnimal[animal.estado];
    conteo[estado] = (conteo[estado] || 0) + 1;
  });
  
  return conteo;
};