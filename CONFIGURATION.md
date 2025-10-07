# **🐄 BeefChain \- Sistema de Trazabilidad Cárnica con Blockchain**

[https://img.shields.io/badge/StarkNet-L2\_Solution-blue](https://img.shields.io/badge/StarkNet-L2_Solution-blue)  
[https://img.shields.io/badge/Cairo-Smart\_Contracts-orange](https://img.shields.io/badge/Cairo-Smart_Contracts-orange)  
[https://img.shields.io/badge/Next.js-14.0-black](https://img.shields.io/badge/Next.js-14.0-black)  
[https://img.shields.io/badge/License-MIT-green](https://img.shields.io/badge/License-MIT-green)

## **📋 Descripción**

BeefChain es una plataforma integral de trazabilidad para la industria cárnica que utiliza StarkNet para garantizar transparencia, seguridad y eficiencia en toda la cadena de suministro. Desde el productor hasta el consumidor final, cada paso queda registrado de forma inmutable en la blockchain.

## **🌟 Características Principales**

### **🔗 Trazabilidad Completa**

* Historial Inmutable: Cada transacción registrada en StarkNet  
* Códigos QR Dinámicos: Códigos únicos por corte con datos en tiempo real  
* Auditoría Completa: Trail completo desde nacimiento hasta venta

### **🌱 Sostenibilidad**

* Reportes de impacto ambiental  
* Estimación de huella de carbono  
* Métricas de eficiencia en cadena de suministro

### **🔒 Seguridad y Roles**

* Sistema de permisos basado en roles (Access Control)  
* Múltiples niveles de administración  
* Funciones específicas por tipo de usuario

## **🏗️ Arquitectura del Sistema**

Hazlo en ingles, pero con la forma de \# para titulo y asi sucesivamente para poder copiar y pegar en archivo .md en github

Read 8 web pages

# **BeefChain \- Blockchain Beef Traceability System**

[https://img.shields.io/badge/StarkNet-L2\_Solution-blue](https://img.shields.io/badge/StarkNet-L2_Solution-blue)  
[https://img.shields.io/badge/Cairo-Smart\_Contracts-orange](https://img.shields.io/badge/Cairo-Smart_Contracts-orange)  
[https://img.shields.io/badge/Next.js-14.0-black](https://img.shields.io/badge/Next.js-14.0-black)  
[https://img.shields.io/badge/License-MIT-green](https://img.shields.io/badge/License-MIT-green)

## **📋 Description**

BeefChain is a comprehensive traceability platform for the meat industry that uses StarkNet to ensure transparency, security and efficiency throughout the supply chain. From producer to end consumer, every step is immutably recorded on the blockchain.

## **🌟 Key Features**

### **🔗 Complete Traceability**

* Immutable History: Every transaction recorded on StarkNet  
* Dynamic QR Codes: Unique codes per cut with real-time data  
* Full Audit Trail: Complete journey from birth to sale

### **🌱 Sustainability**

* Environmental impact reports  
* Carbon footprint estimation  
* Supply chain efficiency metrics

### **🔒 Security & Roles**

* Role-based permission system (Access Control)  
* Multiple administration levels  
* User-specific functions

## **🏗️ System Architecture**

### **Roles & Participants** 

1. Producers \- Register animals and manage batches  
2. Slaughterhouses \- Process animals and generate QR cuts  
3. Veterinarians \- Certify animal health and welfare  
4. IoT Operators \- Record real-time sensor data  
5. Certifiers \- Validate quality standards  
6. Exporters \- Manage international shipments  
7. Auditors \- Supervise regulatory compliance  
8. Consumers \- Scan QR for traceability

## **📋 Contract Information**

### **Main Contract (AnimalNFT) \- LATEST VERSION**

* Address: `0x065f45868a08c394cb54d94a6e4eb08012435b5c9803bb41d22ecb9e603e535d`  
* Class Hash: `0x0712b9eac6e7653cd2abe5e45a0da9197da4657fddfb7de8af2ba9532a3ee404`  
* Network: StarkNet Sepolia

### **Previous Contracts (Historical)**

* `0x02d0234b0a1d7015c8fa5f13c3a5d9aed7512ac02a9df2713c3cf1650b22cafe` (Previous version)

### **Project Wallets**

* Deployer: `0x1baaeb194649d3ec0c78942f9b462bfaf602b9a4ec84275f3d8af78ea19df2e` (Main funded account)  
* System Wallet: `0x3226a67cc925c443ae7f31971393cece97c0f4abb967e4c5a0dbbb936a08fd9` (2% commissions)  
* Backup Wallet: `0x154b998302478a2377bd8122fb081273494db55407efcb7e3fd8c31d6108679` (Emergencies)

### **Explorer URLs** 

* Current Contract: [Voyager Explorer](https://sepolia.voyager.online/contract/0x065f45868a08c394cb54d94a6e4eb08012435b5c9803bb41d22ecb9e603e535d)  
* Deployer: [Voyager Explorer](https://sepolia.voyager.online/contract/0x1baaeb194649d3ec0c78942f9b462bfaf602b9a4ec84275f3d8af78ea19df2e)  
* Previous Contract: [Voyager Explorer](https://sepolia.voyager.online/contract/0x02d0234b0a1d7015c8fa5f13c3a5d9aed7512ac02a9df2713c3cf1650b22cafe)

## **🔧 Core Functionalities**

### **For Producers**

* `create_animal_simple(raza)` \- Quick animal creation  
* `create_animal()` \- Complete registration with metadata  
* `create_animal_batch()` \- Batch management  
* `update_animal_weight()` \- Weight updates

### **For Slaughterhouses**

* `procesar_animal()` \- Individual processing  
* `procesar_batch()` \- Batch processing  
* `crear_corte()` \- Cut generation with QR  
* `crear_cortes_para_batch()` \- Mass production

### **For Veterinarians**

* `add_health_record()` \- Medical history recording  
* `quarantine_animal()` \- Animal quarantine  
* `authorize_veterinarian_for_animal()` \- Authorizations

### **For IoT**

* `record_iot_reading()` \- Real-time sensor data  
* `get_latest_iot_reading()` \- Metric queries

### **For Certifiers**

* `certify_animal()` \- Individual certification  
* `certify_batch()` \- Batch certification  
* `certify_corte()` \- Cut certification

### **For Exporters**

* `prepare_export_batch()` \- Shipment preparation  
* `confirm_export()` \- Export confirmation  
* `update_export_temperature()` \- Cold chain control

### **For Consumers**

* `get_public_consumer_data()` \- Traceability data  
* `verify_qr_authenticity()` \- Authenticity verification  
* `generate_qr_for_corte()` \- QR code generation

## **🚀 Quick Start**

### **Prerequisites**

* Node.js 18+  
* StarkNet wallet  
* Git

### **Installation**

1. Clone the repository

`bash`

`git clone https://github.com/your-username/beefchain.git`

`cd beefchain`

2. Install dependencies

`bash`

`cd frontend`

`npm install`

3. Configure environment

`bash`

`cp .env.example .env.local`

4. Update environment variables

`env`

`# BeefChain Configuration - StarkNet Sepolia`  
`NEXT_PUBLIC_CONTRACT_ADDRESS=0x065f45868a08c394cb54d94a6e4eb08012435b5c9803bb41d22ecb9e603e535d`  
`NEXT_PUBLIC_CONTRACT_CLASS_HASH=0x0712b9eac6e7653cd2abe5e45a0da9197da4657fddfb7de8af2ba9532a3ee404`

`NEXT_PUBLIC_RPC_URL=https://starknet-sepolia.public.blastapi.io/rpc/v0_9`

5. Run the development server

`bash`

`npm run dev`

## **📁 Project Structure** 

`text`

`beefchain/`  
`├── frontend/                 # Next.js + StarkNet React`  
`│   ├── src/`
 |   |   |__ apps/             # Aplications
`│   │   ├── contracts/        # Configuration and ABI`  
`│   │   ├── components/       # React components`  
`│   │   └── hooks/           # Custom StarkNet hooks`  
`│   └── .env.local           # Environment variables`  
`├── starknet/                # Cairo contracts`  
`│   ├── contracts/           # .cairo source code`  
`│   └── scripts/             # Deployment scripts`  
`├── backend/                 # Django API (future)`  
`├── mobile/                  # React Native (future)`

`└── docs/                    # Documentation`

## **🌐 Network Configuration**

* RPC URL: `https://starknet-sepolia.public.blastapi.io/rpc/v0_9`  
* Explorer: `https://sepolia.voyager.online`  
* Network: `sepolia`

## **🔐 ChipyPay Integration**

* Private Key: `sk_dev_916327c90fe67a75d0809810639f6705533dac27573e36afa7147a6e8a352531`  
* Public Key: `pk_dev_d7e6505de47e23fd8633013288c34f36`

## **🎯 Hackathon Features**

### **Blockchain Innovation**

* ✅ StarkNet L2: Scalability with Ethereum security  
* ✅ Animal NFTs: Unique animal tokenization  
* ✅ Dynamic QR: Real-time traceability  
* ✅ Multiple Roles: Complete participant ecosystem

### **Real Impact**

* 🥩 Total Transparency: From farm to table  
* 🌱 Sustainability: Integrated environmental metrics  
* 🔒 Food Safety: Immutable certifications  
* 📱 Consumer Access: QR with complete history

### **Technology**

* ⚡ Cairo Contracts: Business logic in StarkNet  
* 🎨 Next.js Frontend: Modern responsive interface  
* 🔗 Decentralized APIs: Direct blockchain integration  
* 📊 Real-time Dashboard: Complete system monitoring

## **🔄 Workflow**

1. Producer registers animal with basic info  
2. Veterinarian adds health records and certifications  
3. IoT devices record environmental data  
4. Slaughterhouse processes animal and creates cuts  
5. Certifier validates quality standards  
6. Exporter prepares international shipment  
7. Consumer scans QR for complete history

## **📊 Contract ABI**

The project includes comprehensive ABI for all contract functions including:

* Animal management and tracking  
* Batch processing operations  
* Certification and validation  
* QR code generation and verification  
* IoT data recording  
* Sustainability reporting

## **🤝 Contributing**

We welcome contributions\! Please see our [Contributing Guide](https://contributing.md/) for details.

## **📄 License**

This project is licensed under the MIT License \- see the [LICENSE](https://license/) file for details.

## **🆘 Support**

If you need help or have questions:

* Open an [Issue](https://github.com/your-username/beefchain/issues)  
* Check our [Documentation](https://docs/)  
* Join our [Discord Community](https://discord.gg/your-invite-link)

## **🙏 Acknowledgments**

* StarkNet Foundation for L2 infrastructure  
* Cairo language developers  
* The blockchain community for inspiration

---

BeefChain \- Revolutionizing meat traceability with cutting-edge blockchain technology. 🚀

*Transparency from Farm to Fork*  