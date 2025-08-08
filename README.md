# Assetrix Investment Platform

[![Solidity](https://img.shields.io/badge/solidity-0.8.28-blue)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Diamond Pattern](https://img.shields.io/badge/diamond%20pattern-EIP--2535-orange)](https://eips.ethereum.org/EIPS/eip-2535)

A decentralized real estate investment platform built on Ethereum using the **Diamond Pattern (EIP-2535)** that enables property developers to raise funds and investors to participate in real estate opportunities with milestone-based fund releases.

## 🏗️ Architecture

The platform uses a **modular diamond pattern** architecture for scalability and upgradeability:

| Component | Purpose |
|-----------|---------|
| **Diamond.sol** | Proxy contract that routes calls to facets |
| **AssetrixStorage.sol** | Shared storage layout for all facets |
| **AdminFacet.sol** | Ownership, initialization, and admin functions |
| **PropertyFacet.sol** | Property creation, management, and queries |
| **InvestmentFacet.sol** | Investment, payout, refund, and token operations |
| **MilestoneFacet.sol** | Milestone workflow and fund release management |
| **TransactionFacet.sol** | Transaction recording and history |
| **DiamondLoupeFacet.sol** | Diamond structure querying (EIP-2535 standard) |

## 🚀 Features

### For Property Developers

- **Property Management**: Create and list property investment opportunities
- **Funding Configuration**: Set funding goals, ROI percentages, and investment terms
- **Milestone Planning**: Define project milestones with automated fund releases
- **Fund Receipt**: Receive funds upon milestone completion with transparent tracking

### For Investors

- **Investment Opportunities**: Browse active property investment opportunities
- **Flexible Investment**: Invest with minimal amounts and fractional ownership
- **Performance Tracking**: Track investment performance and expected ROI
- **Refund System**: Request refunds if funding goals aren't met
- **Early Exit**: Early exit with structured fee system for liquidity

### Platform Features

- **Diamond Pattern Architecture**: Modular, upgradeable smart contract system
- **Milestone-Based Funding**: Automated fund releases based on project milestones
- **Tokenized Real Estate**: Fractional ownership of real estate properties
- **Multi-Network Support**: Deployable on any EVM-compatible blockchain
- **Security First**: Comprehensive security measures and audit-ready code

## 📦 Installation

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Hardhat

### Quick Start

```bash
# Clone the repository
git clone [repository-url]
cd Assetrix

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

## 🚀 Deployment

### Environment Setup

```bash
cp .env.example .env
```

**Required Environment Variables:**

- `PRIVATE_KEY` - Your deployment wallet private key
- `ETHERSCAN_API_KEY` - For contract verification
- `STABLECOIN_ADDRESS` - USDC/USDT contract address
- `RPC_URL` - Network RPC endpoint

### Deployment Commands

```bash
# Deploy to network
npx hardhat run scripts/deploy.js --network [network-name]

# Upgrade contract
npx hardhat run scripts/upgrade.js --network [network-name]

# Verify contract
npx hardhat run scripts/verify.js --network [network-name]
```

## 🧪 Testing

```bash
# Run all tests
npx hardhat test

# Run specific facet tests
npx hardhat test test/AdminFacet.test.js
npx hardhat test test/PropertyFacet.test.js
npx hardhat test test/InvestmentFacet.test.js
npx hardhat test test/MilestoneFacet.test.js
npx hardhat test test/TransactionFacet.test.js
npx hardhat test test/DiamondLoupeFacet.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

## 🔒 Security

### Access Control

- **Owner**: Can pause/unpause, emergency operations, admin functions
- **Developer**: Can manage their own properties, request milestone funds
- **Investors**: Can invest, request refunds, early exit, view properties

### Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks on all critical functions
- **Pausable**: Emergency stop functionality for crisis management
- **Access Control**: Role-based permissions for sensitive operations
- **Input Validation**: Comprehensive validation on all user inputs
- **Secure Fund Handling**: Checks-effects-interactions pattern implementation
- **Upgradeable Architecture**: Safe upgrade mechanisms for continuous improvement

## 📝 License

MIT License

## 🙏 Acknowledgements

- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [Ethereum Foundation](https://ethereum.org/)
- [Hardhat](https://hardhat.org/)
- [Diamond Pattern (EIP-2535)](https://eips.ethereum.org/EIPS/eip-2535)
