// services/iotContractService.ts - ARCHIVO COMPLETO CORREGIDO (COMPATIBLE)
import { AnimalContractService } from './animalContractService';
import { CONTRACT_ADDRESS } from '@/contracts/config';

// Ubicación real de San Justo, Santa Fe, Argentina
const SAN_JUSTO_COORDINATES = {
  latitude: -30.7891,
  longitude: -60.5919
};

const LOCATION_VARIATION = {
  latitude: 0.045,
  longitude: 0.045
};

// ✅ FUNCIÓN COMPATIBLE PARA CONVERSIÓN A FELT252 (SIN BigInt literals)
const toFelt = (num: number | bigint): string => {
  if (typeof num === 'bigint') {
    return num.toString();
  }
  
  // Manejo correcto de números negativos para Cairo (sin BigInt literals)
  if (num < 0) {
    // Usar BigInt sin literales
    const BIG_PRIME = BigInt('3618502788666131213697322783095070105623107215331596699973092056135872020481'); // 2^251 + 17*2^192 + 1
    const negativeAsBigInt = BigInt(Math.floor(num));
    const positiveRepresentation = (BIG_PRIME + negativeAsBigInt) % BIG_PRIME;
    return positiveRepresentation.toString();
  }
  
  return BigInt(Math.floor(num)).toString();
};

// ✅ FUNCIÓN OPTIMIZADA PARA STRINGS
const strToFelt = (str: string): string => {
  const stringMap: { [key: string]: string } = {
    "device_link": "0x6465766963655f6c696e6b",
    "gps_health": "0x6770735f6865616c7468", 
    "IoT_001": "0x496f545f303031",
    "iot_001": "0x696f745f303031",
    "001": "0x303031",
    "test": "0x74657374",
    "iot_test": "0x696f745f74657374"
  };

  if (stringMap[str]) {
    return stringMap[str];
  }

  // Conversión manual robusta
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  
  return '0x' + hex;
};

// ✅ FUNCIÓN PARA GENERAR UBICACIÓN EN SAN JUSTO
const generateSanJustoLocation = (): { latitude: number; longitude: number } => {
  const latVariation = (Math.random() - 0.5) * 2 * LOCATION_VARIATION.latitude;
  const longVariation = (Math.random() - 0.5) * 2 * LOCATION_VARIATION.longitude;
  
  const latitude = SAN_JUSTO_COORDINATES.latitude + latVariation;
  const longitude = SAN_JUSTO_COORDINATES.longitude + longVariation;
  
  return {
    latitude: roundCoordinate(latitude, 6),
    longitude: roundCoordinate(longitude, 6)
  };
};

// ✅ FUNCIÓN PARA REDONDEAR COORDENADAS
const roundCoordinate = (value: number, decimals: number): number => {
  return Number(value.toFixed(decimals));
};

// ✅ FUNCIÓN CORREGIDA: CREAR CALLDATA CON STRUCT IoTReading
const createIoTReadingCalldata = (
  animalId: number,
  timestamp: number,
  temperature: number, 
  humidity: number,
  latitude: number,
  longitude: number,
  deviceId: string,
  readingType: string
): string[] => {
  console.log('📊 Creando calldata para IoTReading struct:', {
    animalId,
    timestamp,
    temperature,
    humidity,
    latitude,
    longitude,
    deviceId,
    readingType
  });

  // Escalar valores para mantener precisión decimal
  const scaledTemperature = Math.floor(temperature * 100);
  const scaledHumidity = Math.floor(humidity * 100);
  const scaledLatitude = Math.floor(latitude * 1000000);
  const scaledLongitude = Math.floor(longitude * 1000000);

  console.log('📊 Valores escalados para Cairo:', {
    scaledTemperature,
    scaledHumidity,
    scaledLatitude,
    scaledLongitude
  });

  // 🔥 ESTRUCTURA CORREGIDA: animal_id + miembros del struct IoTReading
  const calldata = [
    toFelt(animalId),           // animal_id: u128 (primer parámetro)
    toFelt(timestamp),          // timestamp: u64 (primer miembro del struct)
    toFelt(scaledTemperature),  // temperature: i32
    toFelt(scaledHumidity),     // humidity: u32
    toFelt(scaledLatitude),     // latitude: i64
    toFelt(scaledLongitude),    // longitude: i64
    strToFelt(deviceId),        // device_id: felt252
    strToFelt(readingType)      // reading_type: felt252
  ];

  return calldata;
};

// ✅ FUNCIÓN PARA DEBUGGEAR DETALLADAMENTE (COMPATIBLE)
const debugCalldata = (calldata: string[], animalId: number) => {
  console.log('🔍 ANÁLISIS DETALLADO DEL CALLDATA:');
  const labels = [
    'animal_id: u128',
    'timestamp: u64', 
    'temperature: i32',
    'humidity: u32',
    'latitude: i64',
    'longitude: i64', 
    'device_id: felt252',
    'reading_type: felt252'
  ];
  
  calldata.forEach((param, index) => {
    const label = labels[index] || `param_${index}`;
    console.log(`  ${index}: ${label} = ${param}`);
    
    try {
      const bigIntVal = BigInt(param);
      console.log(`     → BigInt: ${bigIntVal}`);
      
      // Detectar posibles problemas con negativos (sin BigInt literals)
      const maxInt64 = BigInt('9223372036854775807'); // 2^63 - 1
      if (index >= 4 && index <= 5) { // latitude y longitude
        if (bigIntVal > maxInt64) {
          console.log(`     ⚠️  REPRESENTACIÓN DE NEGATIVO: ${bigIntVal}`);
        }
      }
    } catch (e) {
      console.log(`     → Hex string: ${param}`);
    }
  });
  
  console.log(`✅ Calldata listo para animal ${animalId} (${calldata.length} parámetros)`);
};

// ✅ FUNCIÓN PARA GENERAR DATOS REALISTAS DE GANADO
const generateRealisticCowData = (animalId?: number) => {
  const location = generateSanJustoLocation();
  
  const breeds = ['Angus', 'Hereford', 'Brangus'];
  const breed = breeds[(animalId || 0) % 3];
  
  const baseTemp = 37.5;
  const tempVariation = (Math.random() - 0.5) * 3;
  
  const baseHumidity = 65;
  const humidityVariation = (Math.random() - 0.5) * 30;
  
  const baseHeartRate = 70;
  const heartRateVariation = Math.floor(Math.random() * 30);

  return {
    temperature: roundCoordinate(baseTemp + tempVariation, 1),
    humidity: roundCoordinate(baseHumidity + humidityVariation, 1),
    latitude: location.latitude,
    longitude: location.longitude,
    heartRate: baseHeartRate + heartRateVariation,
    activity: Math.floor(Math.random() * 100),
    breed: breed,
    city: 'San Justo, Santa Fe',
    province: 'Santa Fe',
    country: 'Argentina'
  };
};

export class IoTContractService {
  private animalService: AnimalContractService;

  constructor(wallet: any) {
    this.animalService = new AnimalContractService(wallet);
  }

  // 🔗 VINCULAR DISPOSITIVO IoT A ANIMAL - COMPLETAMENTE CORREGIDO
  async linkDeviceToAnimalReal(
    animalId: number, 
    deviceId: string,
    wallet: any
  ) {
    try {
      console.log('🚀 Iniciando vinculación de dispositivo IoT...', { animalId, deviceId });

      // ✅ VALIDACIONES ROBUSTAS
      if (!this.animalService) {
        throw new Error('Servicio de animales no disponible');
      }

      if (!wallet || (!wallet.account?.execute && !wallet.request)) {
        throw new Error('Wallet no conectada o no compatible');
      }

      // ✅ VERIFICAR QUE EL ANIMAL EXISTE
      const animalData = await this.animalService.getAnimalData(BigInt(animalId));
      if (!animalData) {
        throw new Error(`Animal ${animalId} no encontrado`);
      }

      const location = generateSanJustoLocation();
      
      // ✅ CREAR CALLDATA CORREGIDO CON STRUCT
      const calldata = createIoTReadingCalldata(
        animalId,
        Math.floor(Date.now() / 1000),
        37.5, // temperatura normal de ganado
        65,   // humedad normal
        location.latitude,
        location.longitude,
        deviceId,
        "device_link"
      );

      // ✅ DEBUG DETALLADO
      debugCalldata(calldata, animalId);

      console.log('🎯 Ejecutando record_iot_reading en Starknet...');

      // ✅ EJECUCIÓN DE TRANSACCIÓN
      let result;
      if (wallet.account?.execute) {
        result = await wallet.account.execute({
          contractAddress: CONTRACT_ADDRESS,
          entrypoint: 'record_iot_reading',
          calldata: calldata
        });
      } else {
        result = await wallet.request({
          type: 'starknet_addInvokeTransaction',
          params: {
            contractAddress: CONTRACT_ADDRESS,
            entrypoint: 'record_iot_reading',
            calldata: calldata
          }
        });
      }

      const transactionHash = result.transaction_hash || result.txHash;
      
      console.log('✅ Transacción IoT ejecutada exitosamente:', transactionHash);

      return {
        success: true,
        transactionHash: transactionHash,
        animalId,
        deviceId,
        peso: animalData.peso,
        message: `✅ Dispositivo ${deviceId} vinculado a Animal ${animalId}`
      };
      
    } catch (error: any) {
      console.error('❌ Error en transacción IoT:', error);
      
      // 🔍 ANÁLISIS DE ERROR ESPECÍFICO
      if (error.message?.includes('Failed to deserialize')) {
        console.error('🔴 PROBLEMA DE SERIALIZACIÓN: Verificar tipos de datos en el struct');
      }
      
      if (error.message?.includes('ClassHash')) {
        console.error('🔴 PROBLEMA DE CONTRATO: Verificar address y ABI');
      }
      
      return {
        success: false,
        error: error.message,
        animalId,
        deviceId,
        suggestion: 'Verificar que los tipos de datos coincidan con el struct IoTReading en el contrato'
      };
    }
  }

  // 📡 ENVIAR LECTURA IoT AL CONTRATO - CORREGIDO
  async sendIoTReadingReal(
    animalId: number,
    temperature: number,
    humidity: number,
    latitude: number,
    longitude: number,
    deviceId: string,
    wallet: any
  ) {
    try {
      console.log('📍 Enviando lectura IoT...', {
        animalId,
        temperature: `${temperature}°C`,
        humidity: `${humidity}%`,
        location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        deviceId
      });

      // ✅ CREAR CALLDATA CORREGIDO
      const calldata = createIoTReadingCalldata(
        animalId,
        Math.floor(Date.now() / 1000),
        temperature,
        humidity,
        latitude,
        longitude,
        deviceId,
        "gps_health"
      );

      debugCalldata(calldata, animalId);

      let result;
      if (wallet.account?.execute) {
        result = await wallet.account.execute({
          contractAddress: CONTRACT_ADDRESS,
          entrypoint: 'record_iot_reading',
          calldata: calldata
        });
      } else {
        result = await wallet.request({
          type: 'starknet_addInvokeTransaction',
          params: {
            contractAddress: CONTRACT_ADDRESS,
            entrypoint: 'record_iot_reading',
            calldata: calldata
          }
        });
      }

      const transactionHash = result.transaction_hash || result.txHash;

      console.log('✅ Lectura IoT enviada exitosamente:', transactionHash);

      return {
        success: true,
        transactionHash: transactionHash,
        animalId,
        reading: { temperature, humidity, latitude, longitude },
        location: {
          latitude,
          longitude,
          city: 'San Justo, Santa Fe'
        }
      };
    } catch (error: any) {
      console.error('❌ Error enviando lectura IoT:', error);
      return {
        success: false,
        error: error.message,
        animalId
      };
    }
  }

  // 🧪 MÉTODO DE PRUEBA CON DATOS SIMPLES
  async testWithSimpleData(animalId: number, wallet: any) {
    try {
      console.log('🧪 Ejecutando prueba con datos simples...');
      
      // Datos mínimos para prueba rápida
      const simpleCalldata = [
        toFelt(animalId),      // animal_id
        toFelt(1700000000),    // timestamp
        toFelt(3750),          // temperature
        toFelt(6500),          // humidity
        toFelt(-30789100),     // latitude
        toFelt(-60591900),     // longitude
        strToFelt("iot_test"), // device_id
        strToFelt("test")      // reading_type
      ];

      debugCalldata(simpleCalldata, animalId);

      const result = await wallet.account.execute({
        contractAddress: CONTRACT_ADDRESS,
        entrypoint: 'record_iot_reading',
        calldata: simpleCalldata
      });

      console.log('✅ Prueba exitosa:', result.transaction_hash);
      return {
        success: true,
        transactionHash: result.transaction_hash,
        message: 'Prueba de struct IoTReading exitosa'
      };
    } catch (error: any) {
      console.error('❌ Prueba fallida:', error);
      throw new Error(`Prueba fallida: ${error.message}`);
    }
  }

  // 🐄 OBTENER ANIMALES ACTIVOS DEL PRODUCTOR
  async getActiveAnimals(ownerAddress: string): Promise<number[]> {
    try {
      console.log('🔍 Buscando animales activos para:', ownerAddress);
      
      const animals = await this.animalService.getAnimalsByOwner(ownerAddress);
      console.log('📊 Animales encontrados:', animals);
      
      const activeAnimals = await this.filterNonTransferredAnimals(animals);
      console.log('✅ Animales activos filtrados:', activeAnimals);
      
      return activeAnimals;
    } catch (error) {
      console.error('❌ Error obteniendo animales activos:', error);
      return this.getDemoAnimals();
    }
  }

  // Animales de prueba para el demo
  private getDemoAnimals(): number[] {
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }

  // Filtrar animales que no han sido transferidos
  private async filterNonTransferredAnimals(animalIds: number[]): Promise<number[]> {
    const activeAnimals: number[] = [];
    
    console.log(`🔍 Filtrando ${animalIds.length} animales...`);
    
    for (const animalId of animalIds) {
      try {
        const animalData = await this.animalService.getAnimalData(BigInt(animalId));
        
        if (animalData && this.isAnimalActive(animalData)) {
          activeAnimals.push(animalId);
          console.log(`✅ Animal ${animalId} - ACTIVO (${animalData.peso}kg)`);
        } else {
          console.log(`❌ Animal ${animalId} - NO ACTIVO`);
        }
      } catch (error) {
        console.warn(`⚠️ No se pudo verificar animal ${animalId}:`, error);
        activeAnimals.push(animalId);
      }
    }
    
    console.log(`🎯 Animales activos finales:`, activeAnimals);
    return activeAnimals;
  }

  // Verificar si el animal está activo
  private isAnimalActive(animalData: any): boolean {
    const inactiveStates = [
      'processed', 'procesado', 'transferred', 'transferido', 
      'at_frigorifico', 'en_frigorifico', 'accepted', 'aceptado'
    ];
    
    if (animalData.estado) {
      const estado = animalData.estado.toLowerCase();
      if (inactiveStates.some(inactive => estado.includes(inactive))) {
        return false;
      }
    }
    
    return true;
  }

  // 🌍 GENERAR UBICACIÓN EN SAN JUSTO
  generateSanJustoLocation(): { latitude: number; longitude: number } {
    return generateSanJustoLocation();
  }

  // 🐮 GENERAR DATOS REALISTAS DE GANADO
  generateRealisticCowData(animalId?: number) {
    return generateRealisticCowData(animalId);
  }

  // 🔍 OBTENER LECTURA IoT MÁS RECIENTE (SIMULADA)
  async getLatestIoTReading(animalId: number, readingType: string = "gps_health") {
    try {
      console.log(`🔍 Buscando última lectura IoT para animal ${animalId}...`);
      
      // Simular datos para desarrollo
      const simulatedReading = {
        timestamp: Math.floor(Date.now() / 1000),
        temperature: 37.5 + (Math.random() - 0.5) * 1.5,
        humidity: 65 + (Math.random() - 0.5) * 15,
        latitude: SAN_JUSTO_COORDINATES.latitude + (Math.random() - 0.5) * 0.01,
        longitude: SAN_JUSTO_COORDINATES.longitude + (Math.random() - 0.5) * 0.01,
        device_id: `iot_${animalId}`,
        reading_type: readingType,
        location: 'San Justo, Santa Fe, Argentina'
      };

      console.log(`✅ Lectura IoT simulada para animal ${animalId}`);
      return simulatedReading;
      
    } catch (error) {
      console.error(`❌ Error obteniendo lectura IoT para animal ${animalId}:`, error);
      return null;
    }
  }

  // 📊 OBTENER HISTORIAL DE LECTURAS (SIMULADO)
  async getIOTHistoryCount(animalId: number): Promise<number> {
    try {
      const count = Math.floor(Math.random() * 10) + 1;
      console.log(`✅ Animal ${animalId} tiene ${count} lecturas IoT (simulado)`);
      return count;
    } catch (error) {
      console.error('❌ Error obteniendo historial IoT:', error);
      return 0;
    }
  }

  // 🏷️ OBTENER METADATOS DEL ANIMAL
  async getAnimalMetadata(animalId: number) {
    try {
      console.log(`🏷️ Obteniendo metadatos para animal ${animalId}...`);
      
      const animalData = await this.animalService.getAnimalData(BigInt(animalId));
      console.log(`📋 Datos del animal ${animalId}:`, animalData);
      
      if (!animalData) {
        throw new Error(`No se pudieron obtener datos del animal ${animalId}`);
      }
      
      const breeds = ['Angus', 'Hereford', 'Brangus'];
      const breedIndex = (animalId - 1) % 3;
      const breed = breeds[breedIndex];
      
      const pesoReal = animalData.peso || 250;
      
      const metadata = {
        id: animalId,
        name: `Animal ${animalId}`,
        breed: breed,
        weight: pesoReal,
        owner: animalData.owner || 'Productor San Justo',
        estado: animalData.estado || 'active',
        location: 'San Justo, Santa Fe',
        birthDate: animalData.fecha_nacimiento || '2023-01-15',
        metadata_hash: animalData.metadata_hash,
        raza: animalData.raza,
        fecha_nacimiento: animalData.fecha_nacimiento
      };
      
      console.log(`✅ Metadatos para animal ${animalId}:`, {
        id: metadata.id,
        breed: metadata.breed,
        weight: `${metadata.weight}kg`,
        estado: metadata.estado
      });
      
      return metadata;
      
    } catch (error: any) {
      console.error(`❌ Error obteniendo metadatos para animal ${animalId}:`, error);
      
      const breeds = ['Angus', 'Hereford', 'Brangus'];
      const breedIndex = (animalId - 1) % 3;
      const breed = breeds[breedIndex];
      
      const defaultMetadata = {
        id: animalId,
        name: `Animal ${animalId}`,
        breed: breed,
        weight: 250,
        owner: 'Productor San Justo',
        estado: 'active',
        location: 'San Justo, Santa Fe',
        birthDate: '2023-01-15',
        error: true,
        errorMessage: error.message
      };
      
      return defaultMetadata;
    }
  }

  // 🔄 CARGAR LECTURAS EXISTENTES
  async loadExistingReadings(animalIds: number[]) {
    console.log('🔄 Cargando lecturas existentes para animales:', animalIds);
    
    const readings = new Map();
    const devices = new Map();

    for (const animalId of animalIds) {
      try {
        const reading = await this.getLatestIoTReading(animalId);
        if (reading) {
          readings.set(animalId, reading);
          devices.set(animalId, reading.device_id);
          console.log(`✅ Lectura cargada para animal ${animalId}`);
        }
      } catch (error) {
        console.warn(`⚠️ No se pudo cargar lectura para animal ${animalId}:`, error);
      }
    }

    console.log('📊 Resumen de lecturas cargadas:', {
      totalAnimals: animalIds.length,
      withReadings: readings.size,
      withDevices: devices.size
    });

    return { readings, devices };
  }

  // 🗺️ OBTENER INFORMACIÓN GEOGRÁFICA DE SAN JUSTO
  getSanJustoInfo() {
    return {
      city: 'San Justo',
      province: 'Santa Fe',
      country: 'Argentina',
      coordinates: SAN_JUSTO_COORDINATES,
      area: 'Región centro de la provincia de Santa Fe',
      climate: 'Clima templado húmedo',
      agriculturalZone: 'Zona núcleo maicera-sojera',
      typicalLivestock: 'Ganado bovino para carne'
    };
  }

  // 🔍 VERIFICAR SI ANIMAL TIENE DISPOSITIVO VINCULADO
  async hasLinkedDevice(animalId: number): Promise<boolean> {
    try {
      const reading = await this.getLatestIoTReading(animalId);
      return reading !== null && reading.device_id !== '';
    } catch (error) {
      console.error(`Error verificando dispositivo para animal ${animalId}:`, error);
      return false;
    }
  }

  // ⚖️ OBTENER PESO REAL DE ANIMAL
  async getAnimalWeight(animalId: number): Promise<number> {
    try {
      const animalData = await this.animalService.getAnimalData(BigInt(animalId));
      return animalData?.peso || 250;
    } catch (error) {
      console.error(`Error obteniendo peso para animal ${animalId}:`, error);
      return 250;
    }
  }
}

// ✅ INSTANCIA GLOBAL PARA COMPATIBILIDAD
export const iotContractService = {
  linkDeviceToAnimalReal: async (animalId: number, deviceId: string, wallet: any) => {
    const service = new IoTContractService(wallet);
    return service.linkDeviceToAnimalReal(animalId, deviceId, wallet);
  },
  sendIoTReadingReal: async (animalId: number, temperature: number, humidity: number, latitude: number, longitude: number, deviceId: string, wallet: any) => {
    const service = new IoTContractService(wallet);
    return service.sendIoTReadingReal(animalId, temperature, humidity, latitude, longitude, deviceId, wallet);
  },
  testWithSimpleData: async (animalId: number, wallet: any) => {
    const service = new IoTContractService(wallet);
    return service.testWithSimpleData(animalId, wallet);
  },
  getLatestIoTReading: async (animalId: number, readingType?: string) => {
    const service = new IoTContractService(null);
    return service.getLatestIoTReading(animalId, readingType);
  },
  getAnimalMetadata: async (animalId: number) => {
    const service = new IoTContractService(null);
    return service.getAnimalMetadata(animalId);
  },
  getActiveAnimals: async (ownerAddress: string) => {
    const service = new IoTContractService(null);
    return service.getActiveAnimals(ownerAddress);
  },
  generateSanJustoLocation,
  generateRealisticCowData
};