'use client';

import { PROJECT_WALLETS, EXPLORER_LINKS } from '@/contracts/config';
import { useState, useEffect } from 'react';
import { useStarknet } from '@/providers/starknet-provider';

export function ProjectWallets() {
  const { contractService } = useStarknet();
  const [walletRoles, setWalletRoles] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const loadWalletRoles = async () => {
      if (!contractService) return;

      const roles: {[key: string]: string} = {};
      
      for (const [role, address] of Object.entries(PROJECT_WALLETS)) {
        try {
          // Verificar si es admin (DEFAULT_ADMIN_ROLE = 0)
          const isAdmin = await contractService.hasRole('0', address);
          if (isAdmin) {
            roles[role] = 'Administrador';
            continue;
          }

          // Verificar otros roles
          const roleTypes = [
            'PRODUCER_ROLE',
            'FRIGORIFICO_ROLE', 
            'CERTIFIER_ROLE',
            'EXPORTER_ROLE',
            'VET_ROLE',
            'IOT_ROLE',
            'AUDITOR_ROLE'
          ];

          let detectedRole = 'Usuario';
          for (const roleType of roleTypes) {
            const hasRole = await contractService.hasRole(roleType, address);
            if (hasRole) {
              detectedRole = getRoleDisplayName(roleType);
              break;
            }
          }

          roles[role] = detectedRole;
        } catch (error) {
          console.error(`Error cargando rol para ${address}:`, error);
          roles[role] = 'Rol no disponible';
        }
      }

      setWalletRoles(roles);
    };

    loadWalletRoles();
  }, [contractService]);

  const getRoleDisplayName = (role: string): string => {
    const roleMap: { [key: string]: string } = {
      'PRODUCER_ROLE': 'Productor',
      'FRIGORIFICO_ROLE': 'Frigorífico',
      'CERTIFIER_ROLE': 'Certificador',
      'EXPORTER_ROLE': 'Exportador',
      'VET_ROLE': 'Veterinario',
      'IOT_ROLE': 'Operador IoT',
      'AUDITOR_ROLE': 'Auditor',
      'DEFAULT_ADMIN_ROLE': 'Administrador',
      '0': 'Administrador'
    };
    return roleMap[role] || role;
  };

  const getRoleDisplayNameFromKey = (key: string): string => {
    const roleMap: { [key: string]: string } = {
      'DEPLOYER': 'Administrador',
      'PRODUCTOR': 'Productor',
      'FRIGORIFICO': 'Frigorífico'
    };
    return roleMap[key] || key;
  };

  return (
    <div className="card-elevated p-6 lg:p-8 rounded-3xl">
      <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-6 font-display flex items-center gap-3">
        <span className="text-2xl lg:text-3xl">🏷️</span>
        Wallets del Proyecto
      </h3>
      <div className="space-y-4">
        {Object.entries(PROJECT_WALLETS).map(([role, address]) => (
          <div key={role} className="flex justify-between items-start p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground block mb-2">
                {getRoleDisplayNameFromKey(role)}:
              </span>
              {walletRoles[role] && (
                <span className={`badge text-xs ${
                  walletRoles[role] === 'Administrador' 
                    ? 'badge-primary' 
                    : 'badge-info'
                }`}>
                  {walletRoles[role]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-background px-3 py-2 rounded-xl border border-border font-mono">
                {address?.slice(0, 8)}...{address?.slice(-6)}
              </code>
              <a
                href={EXPLORER_LINKS[role as keyof typeof EXPLORER_LINKS]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-light transition-colors text-sm"
                title="Ver en explorador"
              >
                🔗
              </a>
            </div>
          </div>
        ))}
      </div>
      
      {/* Información adicional */}
      <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-2xl">
        <p className="text-sm text-success-dark font-semibold">
          💡 Cualquier wallet con roles asignados en el contrato puede acceder al sistema.
        </p>
      </div>
    </div>
  );
}