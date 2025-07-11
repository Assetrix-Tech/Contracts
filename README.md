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
- Hardhat or Truffle (for local development)
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
- Deploys the initial Assetrix contract
- Sets up the proxy contract
- Initializes with stablecoin address
- Saves deployment addresses to `deployments/deployment-[network].json`

#### upgrade.js
- Deploys new implementation contract
- Upgrades the proxy to new implementation
- Maintains all existing data and state
- Updates deployment records

#### verify.js
- Verifies contract source code on Etherscan
- Includes constructor arguments
- Enables public contract interaction

### Environment Variables
Create a `.env` file with:
```env
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
ALCHEMY_API_KEY=your_alchemy_api_key
```


```

## License

MIT License

## Acknowledgements
- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [Ethereum Foundation](https://ethereum.org/)
- [Hardhat](https://hardhat.org/)