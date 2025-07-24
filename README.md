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

# Deploy to network
npx hardhat run scripts/deploy.js --network [network-name]
```


## License

MIT License



## Acknowledgements
- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [Ethereum Foundation](https://ethereum.org/)
- [Hardhat](https://hardhat.org/)
- [Diamond Pattern (EIP-2535)](https://eips.ethereum.org/EIPS/eip-2535)