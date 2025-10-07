// components/productor/DiagnosticTool.tsx
'use client';

import { useState } from 'react';
import { useStarknet } from '@/providers/starknet-provider';
import { EstadoAnimal } from '@/contracts/config';

export function DiagnosticTool() {
  const { address, contractService } = useStarknet();
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const runDiagnostics = async () => {
    if (!contractService || !address) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 Ejecutando diagnóstico...');
      
      // 1. Obtener todos los animales del productor
      let allAnimals: bigint[] = [];
      try {
        allAnimals = await contractService.getAnimalsByProducer(address);
        console.log('📋 Todos los animales:', allAnimals);
      } catch (error) {
        console.error('❌ Error obteniendo animales:', error);
        allAnimals = [];
      }
      
      // 2. Verificar el estado de cada animal
      const animalDetails = [];
      for (const animalId of allAnimals) {
        try {
          const animalData = await contractService.getAnimalData(animalId);
          let batchId = BigInt(0);
          try {
            batchId = await contractService.getBatchForAnimal(animalId);
          } catch (batchError) {
            console.log(`No se pudo verificar lote para animal ${animalId}:`, batchError);
          }
          
          animalDetails.push({
            id: animalId.toString(),
            raza: animalData.raza,
            estado: animalData.estado,
            estadoNombre: EstadoAnimal[animalData.estado] || 'DESCONOCIDO',
            propietario: animalData.propietario,
            peso: animalData.peso?.toString() || '0',
            fechaCreacion: animalData.fechaCreacion?.toString() || '0',
            batchId: batchId.toString(),
            puedeTransferir: animalData.estado === EstadoAnimal.CREADO && batchId === BigInt(0) && animalData.propietario === address
          });
        } catch (error: any) {
          console.error(`Error con animal ${animalId}:`, error);
          animalDetails.push({
            id: animalId.toString(),
            error: error.message
          });
        }
      }
      
      // 3. Obtener todos los lotes
      let allBatches: bigint[] = [];
      try {
        allBatches = await contractService.getBatchesByProducer(address);
        console.log('📦 Todos los lotes:', allBatches);
      } catch (error) {
        console.error('❌ Error obteniendo lotes:', error);
        allBatches = [];
      }
      
      // 4. Verificar detalles de cada lote
      const batchDetails = [];
      for (const batchId of allBatches) {
        try {
          const batchInfo = await contractService.getBatchInfo(batchId);
          let animalIds: bigint[] = [];
          try {
            animalIds = await contractService.getAnimalsInBatch(batchId);
          } catch (animalError) {
            console.log(`Error obteniendo animales del lote ${batchId}:`, animalError);
            animalIds = batchInfo.animal_ids || [];
          }
          
          batchDetails.push({
            id: batchId.toString(),
            propietario: batchInfo.propietario,
            frigorifico: batchInfo.frigorifico,
            fecha_creacion: batchInfo.fecha_creacion?.toString() || '0',
            estado: batchInfo.estado,
            cantidad_animales: batchInfo.cantidad_animales || animalIds.length,
            peso_total: batchInfo.peso_total?.toString() || '0',
            animal_ids: animalIds.map(id => id.toString()),
            animal_count_real: animalIds.length
          });
        } catch (error: any) {
          console.error(`Error con lote ${batchId}:`, error);
          batchDetails.push({
            id: batchId.toString(),
            error: error.message
          });
        }
      }
      
      // 5. Verificar roles
      let userRole = 'No verificado';
      try {
        // Esta función debería existir en tu contractService
        const hasProducerRole = await contractService.hasRole('PRODUCER_ROLE', address);
        const hasAdminRole = await contractService.hasRole('DEFAULT_ADMIN_ROLE', address);
        userRole = `${hasProducerRole ? 'PRODUCER ' : ''}${hasAdminRole ? 'ADMIN' : ''}`.trim();
      } catch (roleError) {
        console.error('Error verificando roles:', roleError);
      }
      
      const diagnosticData = {
        address,
        userRole,
        totalAnimals: allAnimals.length,
        animalDetails,
        totalBatches: allBatches.length,
        batchDetails,
        animalesTransferibles: animalDetails.filter((a: any) => a.puedeTransferir && !a.error).length,
        timestamp: new Date().toISOString()
      };
      
      setDiagnostics(diagnosticData);
      console.log('✅ Diagnóstico completado:', diagnosticData);
      
    } catch (error: any) {
      console.error('❌ Error en diagnóstico:', error);
      setDiagnostics({ 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: string): string => {
    if (!timestamp || timestamp === '0') return 'No disponible';
    try {
      const date = new Date(Number(timestamp) * 1000);
      return date.toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="font-semibold text-yellow-800">🔧 Herramienta de Diagnóstico</h4>
          <p className="text-yellow-700 text-xs">Verifica el estado real de animales y lotes</p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={isLoading}
          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 disabled:bg-yellow-300 transition-colors"
        >
          {isLoading ? '🔍 Diagnosticando...' : 'Ejecutar Diagnóstico'}
        </button>
      </div>
      
      {diagnostics && (
        <div className="mt-3">
          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
            <div className="bg-white p-2 rounded border text-center">
              <div className="font-bold text-blue-600">{diagnostics.totalAnimals || 0}</div>
              <div className="text-gray-600">Animales</div>
            </div>
            <div className="bg-white p-2 rounded border text-center">
              <div className="font-bold text-green-600">{diagnostics.animalesTransferibles || 0}</div>
              <div className="text-gray-600">Transferibles</div>
            </div>
            <div className="bg-white p-2 rounded border text-center">
              <div className="font-bold text-purple-600">{diagnostics.totalBatches || 0}</div>
              <div className="text-gray-600">Lotes</div>
            </div>
            <div className="bg-white p-2 rounded border text-center">
              <div className="font-bold text-orange-600">{diagnostics.userRole || '?'}</div>
              <div className="text-gray-600">Rol</div>
            </div>
          </div>

          {/* Detalles */}
          <div className="p-3 bg-white rounded border border-yellow-300">
            <pre className="text-xs overflow-auto max-h-60">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}