'use client'

import { useStarknet } from '@/providers/starknet-provider'
import { useEffect, useState } from 'react'

export function ConnectWallet() {
  const { 
    isConnected, 
    address, 
    connect, 
    disconnect, 
    isBraavosAvailable, 
    isArgentAvailable,
    userRole,
    loadingRole
  } = useStarknet()
  
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!isMounted) {
    return (
      <div className="flex gap-2">
        <div className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm animate-pulse">
          Cargando...
        </div>
      </div>
    )
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">
            {formatAddress(address)}
          </p>
          <div className="flex items-center gap-1 justify-end">
            {loadingRole ? (
              <div className="h-2 w-2 bg-accent rounded-full animate-pulse"></div>
            ) : (
              <div className="h-2 w-2 bg-success rounded-full"></div>
            )}
            <p className="text-xs text-text-muted">
              {loadingRole ? 'Verificando rol...' : userRole}
            </p>
          </div>
          <p className="text-xs text-text-muted">
            {isBraavosAvailable ? 'Braavos' : 'Argent X'}
          </p>
        </div>
        <button
          onClick={disconnect}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-semibold"
        >
          Desconectar
        </button>
      </div>
    )
  }

  const hasWallets = isBraavosAvailable || isArgentAvailable

  return (
    <div className="flex flex-col gap-2 min-w-[250px]">
      {hasWallets ? (
        <div>
          <p className="text-xs text-success text-center mb-2">
            {isBraavosAvailable && isArgentAvailable 
              ? '2 wallets detectadas' 
              : `${isBraavosAvailable ? 'Braavos' : 'Argent X'} detectada`}
          </p>
          
          <button
            onClick={connect}
            className={`w-full px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors text-sm mb-2 font-semibold ${
              isBraavosAvailable 
                ? 'bg-primary hover:bg-primary-light' 
                : 'bg-info hover:bg-info-light'
            }`}
          >
            Conectar {isBraavosAvailable ? 'Braavos' : 'Argent X'}
          </button>
          
          <div className="text-xs text-text-muted text-center space-y-1">
            <p>✅ Cualquier wallet con roles puede acceder</p>
            <p>👑 Los administradores tienen acceso completo</p>
          </div>
        </div>
      ) : (
        <div className="text-center p-4 bg-accent/10 border border-accent/20 rounded-lg">
          <p className="text-accent-dark text-sm font-semibold mb-3">
            No se detectaron wallets de StarkNet
          </p>
          
          <div className="space-y-2">
            <div className="flex gap-2 justify-center">
              <a 
                href="https://braavos.app/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3 py-2 bg-primary text-white rounded text-sm hover:bg-primary-light transition-colors flex items-center gap-1 font-semibold"
              >
                <span>📲</span>
                <span>Braavos</span>
              </a>
              <a 
                href="https://www.argent.xyz/argent-x/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3 py-2 bg-info text-white rounded text-sm hover:bg-info-light transition-colors flex items-center gap-1 font-semibold"
              >
                <span>📲</span>
                <span>Argent X</span>
              </a>
            </div>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full px-3 py-2 bg-secondary text-white rounded text-sm hover:bg-secondary-light transition-colors flex items-center justify-center gap-1 font-semibold"
            >
              <span>🔄</span>
              <span>Recargar después de instalar</span>
            </button>
            
            <div className="text-xs text-accent-dark text-left space-y-1 mt-2">
              <p><strong>Nota:</strong> Después de instalar la wallet:</p>
              <ul className="list-disc list-inside">
                <li>Cierra y reabre el navegador</li>
                <li>O recarga esta página</li>
                <li>Asegúrate de estar en StarkNet Sepolia</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}