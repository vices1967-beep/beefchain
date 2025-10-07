// src/components/productor/CreateAnimalForm.tsx - VERSIÓN COMPLETA CORREGIDA
'use client';

import { useState } from 'react';
import { useStarknet } from '@/providers/starknet-provider';
import { RazaAnimal } from '@/contracts/config';

export function CreateAnimalForm() {
  const { address, isConnected, contractService } = useStarknet();
  const [raza, setRaza] = useState<RazaAnimal>(RazaAnimal.ANGUS);
  const [peso, setPeso] = useState<string>('');
  const [fechaNacimiento, setFechaNacimiento] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnimalId, setLastAnimalId] = useState<bigint | null>(null);
  const [error, setError] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [isWaitingConfirmation, setIsWaitingConfirmation] = useState(false);
  
  // Campos reducidos y optimizados
  const [nombre, setNombre] = useState<string>('');
  const [genero, setGenero] = useState<string>('M');
  const [alimentacion, setAlimentacion] = useState<string>('P');

  // ✅ FUNCIÓN CORREGIDA: Generar metadata hash válido para felt252
  const generateMetadataHash = (nombre: string, raza: number, genero: string, alimentacion: string): string => {
    const seed = `${nombre}${raza}${genero}${alimentacion}${Date.now()}`;
    
    // Crear un hash simple pero único
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a entero de 32 bits
    }
    
    // ✅ Asegurar que sea un hexadecimal válido para felt252
    const hexString = Math.abs(hash).toString(16).padStart(10, '0');
    return '0x' + hexString;
  };

  const handleCreateSimple = async () => {
    if (!isConnected || !address || !contractService) {
      setError('Wallet no conectada o servicio no disponible');
      return;
    }

    setIsLoading(true);
    setError('');
    setTxHash('');
    setIsWaitingConfirmation(false);

    try {
      console.log('🚀 Enviando transacción REAL: create_animal_simple');
      
      const result = await contractService.createAnimalSimple(raza);
      
      setTxHash(result.txHash);
      setIsWaitingConfirmation(true);
      
      await contractService.waitForTransaction(result.txHash);
      
      setIsWaitingConfirmation(false);
      setLastAnimalId(result.animalId);

      console.log('✅ Animal creado en StarkNet! TX:', result.txHash);
      limpiarFormulario();

    } catch (error: any) {
      console.error('❌ Error creando animal:', error);
      setError(`Error: ${error.message || 'Transacción falló'}`);
      setIsWaitingConfirmation(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FUNCIÓN COMPLETAMENTE CORREGIDA: handleCreateComplete
  const handleCreateComplete = async () => {
    if (!isConnected || !address || !contractService || !peso || !fechaNacimiento) {
      setError('Faltan datos requeridos o wallet no disponible');
      return;
    }

    setIsLoading(true);
    setError('');
    setTxHash('');
    setIsWaitingConfirmation(false);

    try {
      // ✅ Conversión segura de fecha
      const fechaDate = new Date(fechaNacimiento);
      if (isNaN(fechaDate.getTime())) {
        throw new Error('Fecha de nacimiento inválida');
      }
      const fechaTimestamp = Math.floor(fechaDate.getTime() / 1000);
      
      // ✅ METADATA HASH CORREGIDO - Usar la función generateMetadataHash
      const metadataHash = generateMetadataHash(nombre, raza, genero, alimentacion);
      
      // ✅ Validación de peso
      const pesoNum = parseInt(peso);
      if (isNaN(pesoNum) || pesoNum < 1 || pesoNum > 2000) {
        throw new Error('Peso debe ser entre 1 y 2000 kg');
      }
      const pesoBigInt = BigInt(pesoNum);
      
      console.log('📤 Enviando con parámetros CORREGIDOS:', {
        metadataHash, // ← Ahora será "0x..." hexadecimal en lugar de base64
        raza,
        fechaTimestamp,
        peso: pesoBigInt.toString()
      });

      // ✅ LLAMADA CORREGIDA al contrato
      const result = await contractService.createAnimal(
        metadataHash,
        raza,
        fechaTimestamp,
        pesoBigInt
      );
      
      setTxHash(result.txHash);
      setIsWaitingConfirmation(true);
      
      await contractService.waitForTransaction(result.txHash);
      
      setIsWaitingConfirmation(false);
      setLastAnimalId(result.animalId);

      console.log('✅ Éxito! Animal ID:', result.animalId);
      limpiarFormulario();

    } catch (error: any) {
      console.error('❌ Error creando animal:', error);
      
      // ✅ MEJOR MANEJO DE ERRORES ESPECÍFICOS
      if (error.message.includes('Failed to deserialize param')) {
        setError('Error en parámetros del contrato. Verifica los datos ingresados.');
      } else if (error.message.includes('AccessControl')) {
        setError('No tienes permisos de PRODUCTOR para crear animales.');
      } else if (error.message.includes('metadata hash')) {
        setError('Error en el formato de metadata. Intenta nuevamente.');
      } else {
        setError(`Error: ${error.message}`);
      }
      
      setIsWaitingConfirmation(false);
    } finally {
      setIsLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setNombre('');
    setPeso('');
    setFechaNacimiento('');
    setGenero('M');
    setAlimentacion('P');
  };

  const getRazaNombre = (raza: RazaAnimal): string => {
    switch (raza) {
      case RazaAnimal.ANGUS: return 'Angus';
      case RazaAnimal.HEREFORD: return 'Hereford';
      case RazaAnimal.BRANGUS: return 'Brangus';
      default: return 'Desconocida';
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
        <p className="text-yellow-700">Conecta tu wallet para crear animales</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
        <span className="text-3xl">🐄</span>
        Crear Nuevo Animal
      </h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 font-semibold">Error:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {txHash && (
        <div className={`border rounded-xl p-4 mb-6 ${
          isWaitingConfirmation 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <p className={`font-semibold ${
            isWaitingConfirmation ? 'text-blue-700' : 'text-green-700'
          }`}>
            {isWaitingConfirmation ? '⏳ Transacción Enviada' : '✅ Transacción Confirmada'}
          </p>
          <p className={`text-sm mt-1 break-all ${
            isWaitingConfirmation ? 'text-blue-600' : 'text-green-600'
          }`}>
            Hash: {txHash}
          </p>
        </div>
      )}

      {lastAnimalId && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-green-700 font-semibold text-lg">
            ✅ ¡Animal creado exitosamente!
          </p>
          <p className="text-green-600 text-sm mt-1">
            ID del animal: <strong>#{lastAnimalId.toString()}</strong>
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Formulario optimizado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre (Opcional)
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Torito"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isLoading}
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raza del Animal *
            </label>
            <select
              value={raza}
              onChange={(e) => setRaza(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isLoading}
            >
              <option value={RazaAnimal.ANGUS}>Angus</option>
              <option value={RazaAnimal.HEREFORD}>Hereford</option>
              <option value={RazaAnimal.BRANGUS}>Brangus</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Género
            </label>
            <select
              value={genero}
              onChange={(e) => setGenero(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isLoading}
            >
              <option value="M">Macho</option>
              <option value="H">Hembra</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Peso (kg) *
            </label>
            <input
              type="number"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="Ej: 250"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isLoading}
              min="1"
              max="2000"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Nacimiento *
            </label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alimentación
            </label>
            <select
              value={alimentacion}
              onChange={(e) => setAlimentacion(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              disabled={isLoading}
            >
              <option value="P">Pastura</option>
              <option value="G">Grano</option>
              <option value="M">Mixto</option>
              <option value="O">Orgánico</option>
            </select>
          </div>
        </div>

        {/* Botones de creación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700">Creación Rápida</h4>
            <p className="text-sm text-gray-600">
              Solo raza básica (menos datos en blockchain)
            </p>
            <button
              onClick={handleCreateSimple}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center justify-center font-semibold"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isWaitingConfirmation ? 'Confirmando...' : 'Enviando...'}
                </>
              ) : (
                'Crear Animal Simple'
              )}
            </button>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700">Creación Completa</h4>
            <p className="text-sm text-gray-600">
              Con datos optimizados (metadata reducida)
            </p>
            <button
              onClick={handleCreateComplete}
              disabled={isLoading || !peso || !fechaNacimiento}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 transition-colors flex items-center justify-center font-semibold"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isWaitingConfirmation ? 'Confirmando...' : 'Enviando...'}
                </>
              ) : (
                'Crear Animal Completo'
              )}
            </button>
          </div>
        </div>

        {/* Información adicional para debug */}
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span className="text-blue-500">ℹ️</span>
            Información de Depuración
          </h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Wallet:</strong> {address ? `${address.substring(0, 10)}...` : 'No conectada'}</p>
            <p><strong>Raza seleccionada:</strong> {getRazaNombre(raza)} ({raza})</p>
            <p><strong>Metadata Hash:</strong> {nombre || raza || genero || alimentacion ? 
              generateMetadataHash(nombre, raza, genero, alimentacion).substring(0, 12) + '...' : 
              'No generado'}</p>
          </div>
        </div>
      </div>

      {/* Información de estado */}
      <div className="mt-6 p-4 bg-gray-100 rounded-xl border border-gray-300">
        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <span className="text-green-500">🔗</span>
          Estado de Conexión
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>Wallet: {isConnected ? 'Conectada' : 'No conectada'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${contractService ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>Contrato: {contractService ? 'Disponible' : 'No disponible'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}