// src/services/CacheService.ts
const API_BASE_URL = 'http://localhost:3001/api';

export interface TransaccionCache {
  id: string;
  tipo: string;
  hash: string;
  from: string;
  to: string;
  fecha: number;
  data: any;
  estado: 'pendiente' | 'completada' | 'fallida';
  blockNumber?: number;
}

class CacheService {
  // Guardar transacción en cache
  async guardarTransaccion(transaccion: Omit<TransaccionCache, 'id' | 'fecha'>, address: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/cache/transaccion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaccion),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('❌ Error guardando transacción en cache:', error);
      return false;
    }
  }

  // Obtener transacciones por address
  async obtenerTransacciones(address: string): Promise<TransaccionCache[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/cache/transacciones/${address}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error obteniendo transacciones del cache:', error);
      return [];
    }
  }

  // Obtener transacciones pendientes por address
  async obtenerTransaccionesPendientes(address: string): Promise<TransaccionCache[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/cache/pendientes/${address}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error obteniendo transacciones pendientes:', error);
      return [];
    }
  }

  // Actualizar estado de transacción
  async actualizarEstadoTransaccion(hash: string, estado: 'pendiente' | 'completada' | 'fallida', blockNumber?: number): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/cache/transaccion/${hash}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado, blockNumber }),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('❌ Error actualizando estado de transacción:', error);
      return false;
    }
  }

  // Verificar salud del servidor
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('❌ Servidor de cache no disponible:', error);
      return false;
    }
  }
}

export const cacheService = new CacheService();