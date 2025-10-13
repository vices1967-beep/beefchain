// utils/cacheClient.ts
import axios from 'axios';

const CACHE_URL = process.env.NEXT_PUBLIC_CACHE_URL || 'http://localhost:3001/api/cache';
interface Transaccion {
  hash: string
  tipo: string
  from: string
  to: string
  data: string
  estado: string
}
export const cacheClient = {
  async saveTransaction({ hash, tipo, from, to, data, estado = 'pendiente' }: Transaccion) {
    try {
      await axios.post(`${CACHE_URL}/transaccion`, {
        hash, tipo, from, to, data, estado
      });
    } catch (err: any) {
      console.warn('⚠️ No se pudo guardar en cache', err.message);
    }
  },

  async updateStatus(hash: string, estado: 'pendiente' | 'completada' | 'fallida', blockNumber?: number) {
    try {
      await axios.patch(`${CACHE_URL}/transaccion/${hash}`, { estado, blockNumber });
    } catch (err: any) {
      console.warn('⚠️ No se pudo actualizar cache', err.message);
    }
  }
};
