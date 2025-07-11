# Assetrix Investment Platform

A decentralized real estate investment platform built on Ethereum that enables property developers to raise funds and investors to participate in real estate opportunities with milestone-based fund releases.

## Features

### For Property Developers
- Create and list property investment opportunities
- Set funding goals and investment terms
- Define project milestones with fund release schedules
- Receive funds upon milestone completion
- Manage property details and documentation

### For Investors
- Browse active property investment opportunities
- Invest in properties with as little as one unit
- Track investment performance
- Request refunds if funding goals aren't met
- Monitor project progress and milestone completion

### Security Features
- Reentrancy protection on all critical functions
- Pausable contract for emergency stops
- Access control for sensitive operations
- Input validation on all user inputs
- Secure fund handling with checks-effects-interactions pattern

## Smart Contract Architecture

### Key Contracts
- **AssetrixInvestment.sol**: Main contract handling property investments and milestone management
- **Interfaces**: IERC20 for token interactions
- **OpenZeppelin**: Inherits from Ownable, ReentrancyGuard, and Pausable

### Key Data Structures
- **Property**: Contains all property and investment details
- **Milestone**: Tracks project progress and fund releases
- **Investment**: Manages investor contributions and ownership

## Installation

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Hardhat
- OpenZeppelin Contracts

### Setup
```bash
# Clone the repository
git clone [repository-url]
cd contract

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

## Deployment & Management

### Initial Deployment
```bash
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

## License

MIT License

## Acknowledgements
- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [Ethereum Foundation](https://ethereum.org/)
- [Hardhat](https://hardhat.org/)