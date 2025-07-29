# Assetrix Investment Platform

[![Solidity](https://img.shields.io/badge/solidity-0.8.28-blue)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Diamond Pattern](https://img.shields.io/badge/diamond%20pattern-EIP--2535-orange)](https://eips.ethereum.org/EIPS/eip-2535)

A decentralized real estate investment platform built on Ethereum using the **Diamond Pattern (EIP-2535)** that enables property developers to raise funds and investors to participate in real estate opportunities with milestone-based fund releases.

## 📋 Table of Contents

- [🏗️ Architecture](#-architecture)
- [🧪 Testing & Quality Assurance](#-testing--quality-assurance)
- [🚀 Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Deployment](#-deployment)
- [🔧 Development](#-development)
- [🔒 Security](#-security)
- [📝 License](#-license)

## 🏗️ Architecture

### Diamond Pattern Implementation

The platform uses a **modular diamond pattern** architecture for scalability and upgradeability:

| Component | Purpose | Status |
|-----------|---------|--------|
| **Diamond.sol** | Proxy contract that routes calls to facets | ✅ Complete |
| **AssetrixStorage.sol** | Shared storage layout for all facets | ✅ Complete |
| **AdminFacet.sol** | Ownership, initialization, and admin functions | ✅ Complete |
| **PropertyFacet.sol** | Property creation, management, and queries | ✅ Complete |
| **InvestmentFacet.sol** | Investment, payout, refund, and token operations | ✅ Complete |
| **MilestoneFacet.sol** | Milestone workflow and fund release management | ✅ Complete |
| **TransactionFacet.sol** | Transaction recording and history | ✅ Complete |
| **DiamondLoupeFacet.sol** | Diamond structure querying (EIP-2535 standard) | ✅ Complete |

### Key Benefits

- ✅ **Modular**: Each facet handles specific functionality
- ✅ **Upgradeable**: Individual facets can be upgraded independently
- ✅ **Gas Efficient**: Only deploy what you need
- ✅ **Scalable**: Easy to add new features as new facets
- ✅ **Maintainable**: Clear separation of concerns
- ✅ **Production Ready**: All facets tested and functional

## 🧪 Testing & Quality Assurance

### Comprehensive Test Coverage

The platform includes extensive testing for all facets and the diamond pattern:

| Facet | Status | Coverage |
|-------|--------|----------|
| **AdminFacet** | ✅ Complete | All admin functions, ownership, pausing, configuration |
| **PropertyFacet** | ✅ Complete | Property creation, management, queries, updates |
| **InvestmentFacet** | ✅ Complete | Investment calculations, token operations, payouts |
| **MilestoneFacet** | ✅ Complete | Milestone workflow, fund releases, status tracking |
| **TransactionFacet** | ✅ Complete | Transaction recording, history, validation |
| **DiamondLoupeFacet** | ✅ Complete | EIP-2535 diamond loupe functions |
| **Diamond Pattern** | ✅ Complete | Core diamond functionality, routing, storage |

### Quality Assurance Features

| Feature | Status |
|---------|--------|
| **Function Routing** | ✅ Working - All function calls properly routed |
| **Access Control** | ✅ Working - Proper role-based permissions |
| **Data Validation** | ✅ Working - All inputs validated |
| **Error Handling** | ✅ Working - Comprehensive error messages |
| **Storage Consistency** | ✅ Working - Shared storage properly managed |
| **EIP-2535 Compliance** | ✅ Working - Full diamond loupe implementation |

### Running Tests

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

# Run core diamond pattern tests
npx hardhat test test/DiamondPattern.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Critical Bug Fixes Applied

During development, several critical issues were identified and resolved:

- **Function Routing Bug**: Fixed missing selector mapping in `LibDiamond.sol`
- **Data Structure Issues**: Corrected property creation and update data structures
- **Parameter Type Errors**: Fixed function parameter types across all facets
- **Missing Function Selectors**: Added all missing selectors to diamond cuts
- **Storage Layout**: Ensured consistent storage layout across upgrades

## 🚀 Features

### For Property Developers

- **Property Management**: Create and list property investment opportunities with detailed metadata
- **Funding Configuration**: Set funding goals, ROI percentages, and flexible investment terms
- **Milestone Planning**: Define project milestones with automated fund release schedules
- **Fund Receipt**: Receive funds upon milestone completion with transparent tracking
- **Documentation Management**: Manage property details, images, and documentation via IPFS
- **Property Updates**: Update property information before funding with version control
- **Developer Dashboard**: Track property performance and investor engagement

### For Investors

- **Investment Opportunities**: Browse active property investment opportunities with detailed analytics
- **Flexible Investment**: Invest in properties with minimal investment amounts and fractional ownership
- **Performance Tracking**: Track investment performance and expected ROI with real-time updates
- **Refund System**: Request refunds if funding goals aren't met with transparent processing
- **Early Exit**: Early exit with structured fee system for liquidity
- **Progress Monitoring**: Monitor project progress and milestone completion with notifications
- **Portfolio Management**: Manage multiple property investments across different projects

### Platform Features

- **Diamond Pattern Architecture**: Modular, upgradeable smart contract system
- **Milestone-Based Funding**: Automated fund releases based on project milestones
- **Tokenized Real Estate**: Fractional ownership of real estate properties
- **Multi-Network Support**: Deployable on any EVM-compatible blockchain
- **Gas Optimization**: Efficient contract design for cost-effective transactions
- **Security First**: Comprehensive security measures and audit-ready code
- **Scalable Design**: Easy to add new features and upgrade existing functionality

### Security Features

- **Reentrancy Protection**: On all critical functions with comprehensive guards
- **Pausable Contract**: For emergency stops and maintenance operations
- **Access Control**: Role-based permissions for sensitive operations
- **Input Validation**: Comprehensive validation on all user inputs
- **Secure Fund Handling**: Checks-effects-interactions pattern implementation
- **Emergency Refunds**: Capabilities for urgent situations and crisis management
- **Upgradeable Architecture**: Safe upgrade mechanisms for continuous improvement

## 📦 Installation

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

## 🚀 Deployment

### 1. Environment Configuration

Copy the example environment file and configure it:

```bash
cp env.example .env
```

**Required Environment Variables:**

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Your deployment wallet private key |
| `ETHERSCAN_API_KEY` | For contract verification |
| `STABLECOIN_ADDRESS` | USDC/USDT contract address |
| `RPC_URL` | Network RPC endpoint |

### 2. Initial Deployment

**Standard Deployment (Core Facets Only):**
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

**Full Deployment (All Facets):**
```bash
FULL_DEPLOYMENT=true npx hardhat run scripts/deploy.js --network sepolia
```

### 3. Adding New Features

Configure `upgrade-config.json`:
```json
{
  "upgradeFacets": [],
  "addFacets": ["insurance", "analytics"],
  "skipFacets": []
}
```

Deploy new features:
```bash
npx hardhat run scripts/upgrade.js --network sepolia
```

### 4. Upgrading Existing Features

Configure `upgrade-config.json`:
```json
{
  "upgradeFacets": ["property", "investment"],
  "addFacets": [],
  "skipFacets": []
}
```

Upgrade existing features:
```bash
npx hardhat run scripts/upgrade.js --network sepolia
```

### 5. Contract Verification

```bash
npx hardhat run scripts/verify.js --network sepolia
```

## 🔧 Development

### Configuration

#### upgrade-config.json
Controls which facets to upgrade or add:
```json
{
  "upgradeFacets": ["property", "investment"],
  "addFacets": ["insurance", "analytics"],
  "skipFacets": ["admin"]
}
```

#### Environment Variables
| Variable | Description |
|----------|-------------|
| `FULL_DEPLOYMENT` | Deploy all facets vs core only |
| `DIAMOND_ADDRESS` | Diamond proxy address (auto-filled) |
| `STRICT_MODE` | Fail on config mistakes vs auto-correct |
| `DRY_RUN` | Simulate deployment without executing |

### Adding New Facets

1. Create new facet contract (e.g., `InsuranceFacet.sol`)
2. Add to `upgrade-config.json` in `addFacets` array
3. Run upgrade script

### Upgrading Existing Facets

1. Modify existing facet contract
2. Add to `upgrade-config.json` in `upgradeFacets` array
3. Run upgrade script

### Testing

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/DiamondPattern.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

## 📊 Deployment Workflow

```
1. Initial Setup
   ├── deploy.js (standard) → Core facets only
   └── deploy.js (full) → All facets

2. Feature Development
   ├── upgrade.js → Add new facets
   ├── upgrade.js → Upgrade existing facets
   └── verify.js → Verify contracts

3. Production
   ├── upgrade.js → Emergency fixes
   └── upgrade.js → Feature releases
```

## 🔒 Security

### Access Control

| Role | Permissions | Security Level |
|------|-------------|---------------|
| **Owner** | Can pause/unpause, emergency operations, admin functions | High |
| **Developer** | Can manage their own properties, request milestone funds | Medium |
| **Investors** | Can invest, request refunds, early exit, view properties | Low |

### Safety Features

- **ReentrancyGuard**: Prevents reentrancy attacks on all critical functions
- **Pausable**: Emergency stop functionality for crisis management
- **Input Validation**: Comprehensive validation on all user inputs and parameters
- **Secure Transfers**: Checks-effects-interactions pattern for all fund operations
- **Role-Based Access**: Granular permissions for different user types
- **Emergency Mechanisms**: Refund and exit capabilities for urgent situations
- **Upgrade Safety**: Safe upgrade mechanisms with backward compatibility

### Security Best Practices

- **Diamond Pattern Security**: Proper implementation of EIP-2535 diamond pattern
- **Storage Layout**: Consistent storage layout across all upgrades
- **Function Selectors**: Proper mapping and validation of function selectors
- **Gas Optimization**: Efficient contract design to prevent DoS attacks
- **Error Handling**: Comprehensive error messages for debugging
- **Event Logging**: Detailed event emission for transparency and auditing

### Audit Considerations

The codebase is designed with security and auditability in mind:

- **Modular Architecture**: Clear separation of concerns for easier auditing
- **Comprehensive Testing**: Extensive test coverage for all functionality
- **Documentation**: Detailed inline documentation and external guides
- **Standard Compliance**: Adherence to EIP-2535 diamond pattern standards
- **Upgrade Safety**: Safe upgrade mechanisms with proper validation

## 📝 License

MIT License

## 🙏 Acknowledgements

- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [Ethereum Foundation](https://ethereum.org/)
- [Hardhat](https://hardhat.org/)
- [Diamond Pattern (EIP-2535)](https://eips.ethereum.org/EIPS/eip-2535)