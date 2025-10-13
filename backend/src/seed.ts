import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = {
  transacciones: [
    {
      id: 'animal-1',
      tipo: 'animal',
      animalId: '9',
      frigorifico: '0x6f381d63d599d513070540d4f5ce7c1b3d6fa7d2e1817481a292366194bc4ce',
      productor: '0x1234567890abcdef',
      txHash: '0xabc123',
      fecha: Date.now() - 86400000,
      estado: 'pendiente'
    },
    {
      id: 'lote-1', 
      tipo: 'lote',
      batchId: '15',
      frigorifico: '0x6f381d63d599d513070540d4f5ce7c1b3d6fa7d2e1817481a292366194bc4ce',
      productor: '0x1234567890abcdef',
      txHash: '0xdef456',
      fecha: Date.now() - 43200000,
      estado: 'pendiente'
    }
  ],
  animales: [
    {
      id: '7',
      frigorifico: '0x6f381d63d599d513070540d4f5ce7c1b3d6fa7d2e1817481a292366194bc4ce',
      estado: 'recibido',
      fechaRecepcion: Date.now() - 172800000
    }
  ],
  cortes: []
};

const DATA_FILE = path.join(__dirname, 'data.json');

async function seed() {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('✅ Datos de prueba creados exitosamente!');
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
  }
}

seed();
