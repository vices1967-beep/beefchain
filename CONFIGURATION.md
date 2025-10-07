# BeefChain - Configuración del Proyecto

## 📋 Información del Contrato

### Contrato Principal (AnimalNFT)
- **Dirección**: `0x02d0234b0a1d7015c8fa5f13c3a5d9aed7512ac02a9df2713c3cf1650b22cafe`
- **Class Hash**: `0x72ae939679b05482c9f665f5461e604868039cbd6a414d6d0b35c43a14e4bad`
- **Network**: StarkNet Sepolia

### Wallets del Proyecto
- **Deployer**: `0x1baaeb194649d3ec0c78942f9b462bfaf602b9a4ec84275f3d8af78ea19df2e` (Cuenta fondeada)
- **Productor**: `0x0626bb9241ba6334ae978cfce1280d725e727a6acb5e61392ab4cee031a4b7ca`
- **Frigorífico**: `0x05f1ac2f722c0af3ce57828e1fcb0ace93ca7610947f595b3828e9c7116980fc`

### URLs de Exploradores
- **Contrato**: https://sepolia.voyager.online/contract/0x02d0234b0a1d7015c8fa5f13c3a5d9aed7512ac02a9df2713c3cf1650b22cafe
- **Deployer**: https://sepolia.voyager.online/contract/0x1baaeb194649d3ec0c78942f9b462bfaf602b9a4ec84275f3d8af78ea19df2e
- **Productor**: https://sepolia.voyager.online/contract/0x0626bb9241ba6334ae978cfce1280d725e727a6acb5e61392ab4cee031a4b7ca
- **Frigorífico**: https://sepolia.voyager.online/contract/0x05f1ac2f722c0af3ce57828e1fcb0ace93ca7610947f595b3828e9c7116980fc

## 🔧 Funciones del Contrato

### Para Productores
- `create_animal_simple(raza: u128)` - Crear animal simple
- `create_animal(metadata: felt252, raza: u128, fecha: u64, peso: u128)` - Crear animal completo

### Para Frigoríficos
- `procesar_animal(animal_id: u128)` - Procesar animal
- `crear_corte(animal_id: u128, tipo_corte: u128, peso: u128)` - Crear corte con QR

### Para Consumidores
- `get_info_animal(animal_id: u128)` - Obtener información del animal
- `get_info_corte(animal_id: u128, corte_id: u128)` - Obtener información del corte

## 🌐 Configuración de Red
- **RPC URL**: `https://starknet-sepolia.public.blastapi.io`
- **Explorer**: `https://sepolia.voyager.online`

## 🎯 Roles del Sistema
- **Deployer**: Cuenta principal fondeada que desplegó el contrato
- **Productor**: Registra nuevos animales en el sistema
- **Frigorífico**: Procesa animales y crea cortes con QR
- **Consumidor**: Escanea QR y consulta trazabilidad

## 🚀 Estructura del Proyecto
beefchain/
├── frontend/ # Next.js + StarkNet React
├── starknet/ # Contratos Cairo
├── backend/ # Django API (futuro)
├── mobile/ # React Native (futuro)
└── docs/ # Documentación

## 📦 Variables de Entorno
Todas las configuraciones están en `frontend/.env.local`

