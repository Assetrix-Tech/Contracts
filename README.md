# Assetrix Investment Platform

A decentralized real estate investment platform built on Ethereum using the **Diamond Pattern (EIP-2535)** that enables property developers to raise funds and investors to participate in real estate opportunities with milestone-based fund releases.

## 🏗️ Smart Contract Architecture

### Diamond Pattern Implementation
The platform uses a **modular diamond pattern** architecture for scalability and upgradeability:

- **Diamond.sol**: Proxy contract that routes calls to facets
- **AssetrixStorage.sol**: Shared storage layout for all facets
- **AdminFacet.sol**: Ownership, initialization, and admin functions
- **PropertyFacet.sol**: Property creation, management, and queries
- **InvestmentFacet.sol**: Investment, payout, refund, and token operations
- **MilestoneFacet.sol**: Milestone workflow and fund release management
- **TransactionFacet.sol**: Transaction recording and history

### Key Benefits
- ✅ **Modular**: Each facet handles specific functionality
- ✅ **Upgradeable**: Individual facets can be upgraded independently
- ✅ **Gas Efficient**: Only deploy what you need
- ✅ **Scalable**: Easy to add new features as new facets
- ✅ **Maintainable**: Clear separation of concerns

## 🚀 Features

### For Property Developers
- Create and list property investment opportunities
- Set funding goals, ROI percentages, and investment terms
- Define project milestones with fund release schedules
- Receive funds upon milestone completion
- Manage property details and documentation
- Update property information before funding

### For Investors
- Browse active property investment opportunities
- Invest in properties with as little as one unit
- Track investment performance and expected ROI
- Request refunds if funding goals aren't met
- Early exit with fee structure
- Monitor project progress and milestone completion

### Security Features
- Reentrancy protection on all critical functions
- Pausable contract for emergency stops
- Access control for sensitive operations
- Input validation on all user inputs
- Secure fund handling with checks-effects-interactions pattern
- Emergency refund capabilities

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Hardhat
- OpenZeppelin Contracts

### Quick Start
```bash
# Clone the repository
git clone [repository-url]
cd Assetrix

# Install dependencies
npm install

# Setup environment
cp env.example .env
# Edit .env with your configuration

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

## Deployment & Management

# Deploy to network
npx hardhat run scripts/deploy.js --network [network-name]
```

### Contract Upgrade
```bash
# Upgrade the contract (for UUPS upgradeable contracts)
npx hardhat run scripts/upgrade.js --network [network-name]
```

### Contract Verification
```bash
# Verify contract on Etherscan/Block Explorer
npx hardhat run scripts/verify.js --network [network-name]
```

### Script Details

#### deploy.js
- Deploys the initial Assetrix contract using UUPS upgradeable pattern
- Creates both proxy and implementation contracts
- **Proxy Address**: The main contract address users will interact with (remains constant)
- **Implementation Address**: Contains the actual contract logic (can be upgraded)
- Initializes with stablecoin address
- Saves both addresses to `deployments/deployment-[network].json`
- **Output**: Provides both proxy and implementation addresses for verification

#### upgrade.js
- Deploys new implementation contract with updated logic
- Upgrades the proxy to point to the new implementation
- **Proxy Address**: Remains unchanged (same address users interact with)
- **New Implementation Address**: Updated to point to the new contract version
- Maintains all existing data and state in the proxy
- Updates deployment records with new implementation address
- **Preservation**: All user investments, properties, and milestones remain intact

#### verify.js
- Verifies both proxy and implementation contracts on Etherscan
- **Implementation Verification**: Verifies the actual contract logic
- **Proxy Verification**: Automatically handled by Etherscan (uses implementation source)
- Includes constructor arguments for proper verification
- Enables public contract interaction and transparency
- **Address Management**: Automatically retrieves addresses from deployment files or environment variables

### Address Management
The deployment system automatically manages proxy and implementation addresses:

#### Deployment File Structure
```json
{
  "network": "sepolia",
  "proxy": "0x...",           // Main contract address (constant)
  "implementation": "0x...",  // Logic contract address (changes with upgrades)
  "deployer": "0x...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Environment Variables
Create a `.env` file with:
```env
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
ALCHEMY_API_KEY=your_alchemy_api_key
STABLECOIN_ADDRESS=your_stablecoin_contract_address
PROXY_ADDRESS=your_proxy_address_here          # Optional: for upgrades
IMPLEMENTATION_ADDRESS=your_impl_address_here  # Optional: for verification
```

### Working with Contract Addresses

#### For Users
- **Always use the Proxy Address**: This is the main contract address for all interactions
- **Address Persistence**: The proxy address never changes, even after upgrades
- **Data Safety**: All your investments and data are stored in the proxy contract

#### For Developers
- **Proxy Address**: Use for all user-facing interactions and frontend integration
- **Implementation Address**: Used for contract verification and upgrade management
- **Upgrade Process**: Only the implementation address changes during upgrades

#### For Contract Verification
- **Implementation Contract**: Must be verified on Etherscan for transparency
- **Proxy Contract**: Automatically inherits verification from implementation
- **Public Access**: Both addresses are publicly accessible for verification

=======
## 🙏 Acknowledgements
>>>>>>> feature/assetrix-core
- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [Ethereum Foundation](https://ethereum.org/)
- [Hardhat](https://hardhat.org/)
- [Diamond Pattern (EIP-2535)](https://eips.ethereum.org/EIPS/eip-2535)