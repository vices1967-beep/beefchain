'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AnimalContractService } from '@/services/animalContractService'
import { getRoleDisplayName, getAllRolesForVerification } from '@/contracts/config'

interface StarknetContextType {
  isConnected: boolean
  address: string | null
  connect: () => Promise<void>
  disconnect: () => void
  isBraavosAvailable: boolean
  isArgentAvailable: boolean
  contractService: AnimalContractService | null
  currentWallet: any
  userRole: string
  loadingRole: boolean
}

const StarknetContext = createContext<StarknetContextType>({
  isConnected: false,
  address: null,
  connect: async () => {},
  disconnect: () => {},
  isBraavosAvailable: false,
  isArgentAvailable: false,
  contractService: null,
  currentWallet: null,
  userRole: '',
  loadingRole: false
})

export function useStarknet() {
  return useContext(StarknetContext)
}

export function StarknetProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [isBraavosAvailable, setIsBraavosAvailable] = useState(false)
  const [isArgentAvailable, setIsArgentAvailable] = useState(false)
  const [currentWallet, setCurrentWallet] = useState<any>(null)
  const [contractService, setContractService] = useState<AnimalContractService | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [loadingRole, setLoadingRole] = useState(false)

  // Verificar wallets disponibles al cargar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsBraavosAvailable(!!window.starknet_braavos)
      setIsArgentAvailable(!!window.starknet_argentX)
      
      console.log('🔍 Wallets detectadas:', {
        braavos: !!window.starknet_braavos,
        argent: !!window.starknet_argentX
      })
    }
  }, [])

  // Actualizar contractService cuando cambie la wallet
  useEffect(() => {
    if (currentWallet) {
      const service = new AnimalContractService(currentWallet)
      setContractService(service)
      console.log('✅ ContractService inicializado')
    } else {
      setContractService(null)
      setUserRole('')
    }
  }, [currentWallet])

  // Cargar rol del usuario cuando se conecte o cambie la dirección
  useEffect(() => {
    const loadUserRole = async () => {
      if (!isConnected || !address || !contractService) {
        setUserRole('')
        return
      }

      setLoadingRole(true)
      try {
        console.log('🔍 Cargando rol del usuario...', address)
        
        // Usar la función helper para obtener todos los roles
        const rolesToCheck = getAllRolesForVerification()
        let detectedRole = 'Usuario Conectado'
        
        for (const role of rolesToCheck) {
          try {
            const hasRole = await contractService.hasRole(role, address)
            if (hasRole) {
              detectedRole = getRoleDisplayName(role)
              console.log(`✅ Rol detectado: ${detectedRole}`)
              break
            }
          } catch (error) {
            console.log(`⚠️ Error verificando rol ${role}:`, error)
          }
        }

        setUserRole(detectedRole)
        
      } catch (error) {
        console.error('❌ Error cargando rol:', error)
        setUserRole('Usuario Conectado')
      } finally {
        setLoadingRole(false)
      }
    }

    loadUserRole()
  }, [isConnected, address, contractService])

  const connect = async () => {
    try {
      let wallet: any = null;
      let accounts: string[] = [];

      // Intentar conectar con Braavos primero
      if (window.starknet_braavos) {
        console.log('🔄 Conectando con Braavos...')
        wallet = window.starknet_braavos;
        accounts = await wallet.enable();
      }
      // Intentar conectar con Argent X si Braavos no está disponible
      else if (window.starknet_argentX) {
        console.log('🔄 Conectando con Argent X...')
        wallet = window.starknet_argentX;
        accounts = await wallet.enable();
      }
      
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)
        setCurrentWallet(wallet)
        console.log('✅ Conectado con wallet:', accounts[0])
        return
      }
      
      // Si no hay wallets disponibles
      alert('No se encontró ninguna wallet de StarkNet. Instala Braavos o Argent X.')
      
    } catch (error: any) {
      console.error('❌ Error conectando:', error)
      alert(`Error al conectar la wallet: ${error.message}`)
    }
  }

  const disconnect = () => {
    setIsConnected(false)
    setAddress(null)
    setCurrentWallet(null)
    setContractService(null)
    setUserRole('')
    console.log('🔌 Wallet desconectada')
  }

  // Verificar conexión existente al cargar
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window === 'undefined') return
      
      try {
        let wallet: any = null;
        let accounts: string[] = [];

        // Verificar Braavos
        if (window.starknet_braavos?.isConnected) {
          wallet = window.starknet_braavos;
          accounts = await wallet.request({ type: 'wallet_requestAccounts' });
        }
        // Verificar Argent X
        else if (window.starknet_argentX?.isConnected) {
          wallet = window.starknet_argentX;
          accounts = await wallet.request({ type: 'wallet_requestAccounts' });
        }
        
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0])
          setIsConnected(true)
          setCurrentWallet(wallet)
          console.log('✅ Sesión recuperada:', accounts[0])
        }
      } catch (error) {
        console.log('ℹ️ No hay sesiones activas')
      }
    }

    checkExistingConnection()
  }, [])

  const value = {
    isConnected,
    address,
    connect,
    disconnect,
    isBraavosAvailable,
    isArgentAvailable,
    contractService,
    currentWallet,
    userRole,
    loadingRole
  }

  return (
    <StarknetContext.Provider value={value}>
      {children}
    </StarknetContext.Provider>
  )
}