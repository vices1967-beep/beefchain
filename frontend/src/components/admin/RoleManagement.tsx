'use client';

import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';

const ROLES = {
  PRODUCER_ROLE: 'Productor',
  FRIGORIFICO_ROLE: 'Frigorífico', 
  CERTIFIER_ROLE: 'Certificador',
  EXPORTER_ROLE: 'Exportador',
  VET_ROLE: 'Veterinario',
  IOT_ROLE: 'Operador IoT',
  AUDITOR_ROLE: 'Auditor',
  DEFAULT_ADMIN_ROLE: 'Administrador'
};

export function RoleManagement() {
  const { contractService, address } = useStarknet();
  const [roleMembers, setRoleMembers] = useState<{[key: string]: string[]}>({});
  const [newRoleAddress, setNewRoleAddress] = useState('');
  const [selectedRole, setSelectedRole] = useState('PRODUCER_ROLE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadRoleMembers();
  }, [contractService]);

  const loadRoleMembers = async () => {
    if (!contractService) return;
    
    try {
      setError('');
      console.log('🔄 Cargando miembros de roles...');
      
      const members: {[key: string]: string[]} = {};
      
      for (const role of Object.keys(ROLES)) {
        try {
          // Obtener cantidad de miembros
          const count = await contractService.getRoleMemberCount(role);
          console.log(`📊 Rol ${role}: ${count} miembros`);
          
          const memberList = [];
          
          // Obtener cada miembro
          for (let i = 0; i < count; i++) {
            try {
              const member = await contractService.getRoleMemberAtIndex(role, i);
              memberList.push(member);
            } catch (memberError) {
              console.error(`Error obteniendo miembro ${i} del rol ${role}:`, memberError);
            }
          }
          
          members[role] = memberList;
        } catch (roleError) {
          console.error(`Error procesando rol ${role}:`, roleError);
          members[role] = [];
        }
      }
      
      setRoleMembers(members);
      console.log('✅ Miembros de roles cargados:', members);
      
    } catch (error: any) {
      console.error('❌ Error cargando miembros de roles:', error);
      setError(`Error al cargar miembros: ${error.message}`);
    }
  };

  const grantRole = async () => {
    if (!contractService || !newRoleAddress) {
      setError('Dirección de wallet requerida');
      return;
    }

    // Validación básica de dirección
    if (!newRoleAddress.startsWith('0x') || newRoleAddress.length !== 66) {
      setError('Dirección de wallet inválida. Debe comenzar con 0x y tener 66 caracteres.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      console.log(`🔄 Asignando rol ${selectedRole} a ${newRoleAddress}...`);
      
      const txHash = await contractService.grantRole(selectedRole, newRoleAddress);
      
      setSuccess(`✅ Rol asignado exitosamente. Transacción: ${txHash.slice(0, 10)}...`);
      setNewRoleAddress('');
      
      // Recargar lista después de un breve delay
      setTimeout(() => {
        loadRoleMembers();
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Error asignando rol:', error);
      setError(`Error asignando rol: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const revokeRole = async (memberAddress: string) => {
    if (!contractService) return;
    
    if (!confirm(`¿Estás seguro de revocar el rol ${ROLES[selectedRole as keyof typeof ROLES]} de ${memberAddress}?`)) return;
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      console.log(`🔄 Revocando rol ${selectedRole} de ${memberAddress}...`);
      
      const txHash = await contractService.revokeRole(selectedRole, memberAddress);
      
      setSuccess(`✅ Rol revocado exitosamente. Transacción: ${txHash.slice(0, 10)}...`);
      
      // Recargar lista después de un breve delay
      setTimeout(() => {
        loadRoleMembers();
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Error revocando rol:', error);
      setError(`Error revocando rol: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const verifyRole = async (memberAddress: string) => {
    if (!contractService) return;
    
    try {
      setLoading(true);
      const hasRole = await contractService.hasRole(selectedRole, memberAddress);
      
      alert(`El usuario ${memberAddress} ${hasRole ? 'SÍ' : 'NO'} tiene el rol ${ROLES[selectedRole as keyof typeof ROLES]}`);
      
    } catch (error: any) {
      alert(`Error verificando rol: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">👥 Gestión de Roles</h3>
        <button
          onClick={loadRoleMembers}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
        >
          {loading ? 'Actualizando...' : '🔄 Actualizar'}
        </button>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Selección de Rol */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Rol
        </label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        >
          {Object.entries(ROLES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Asignar Nuevo Rol */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-3">Asignar Nuevo Rol</h4>
        <div className="space-y-3">
          <input
            type="text"
            value={newRoleAddress}
            onChange={(e) => setNewRoleAddress(e.target.value)}
            placeholder="Dirección de wallet (0x...)"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            disabled={loading}
          />
          <button
            onClick={grantRole}
            disabled={loading || !newRoleAddress}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
          >
            {loading ? '⏳ Procesando...' : `Asignar Rol ${ROLES[selectedRole as keyof typeof ROLES]}`}
          </button>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          La dirección debe comenzar con 0x y tener 66 caracteres
        </p>
      </div>

      {/* Lista de Miembros del Rol */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-3">
          Miembros con rol: {ROLES[selectedRole as keyof typeof ROLES]}
          <span className="ml-2 text-sm text-gray-500">
            ({roleMembers[selectedRole]?.length || 0} miembros)
          </span>
        </h4>
        
        {roleMembers[selectedRole]?.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {roleMembers[selectedRole].map((member, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <p className="font-mono text-sm break-all">{member}</p>
                  {member === address && (
                    <span className="text-xs text-green-600 font-semibold">(Tú)</span>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => verifyRole(member)}
                    disabled={loading}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:bg-green-300 transition-colors"
                  >
                    Verificar
                  </button>
                  <button
                    onClick={() => revokeRole(member)}
                    disabled={loading || member === address}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:bg-red-300 transition-colors"
                  >
                    Revocar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">No hay miembros con este rol</p>
            <p className="text-gray-400 text-sm mt-1">Usa el formulario arriba para asignar el primer rol</p>
          </div>
        )}
      </div>

      {/* Información de Roles */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-2">📋 Resumen de Roles</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {Object.entries(ROLES).map(([key, label]) => (
            <div key={key} className="text-center p-2 bg-white rounded border">
              <div className="font-semibold text-gray-600">{label}</div>
              <div className="text-lg font-bold text-blue-600">
                {roleMembers[key]?.length || 0}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}