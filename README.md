# Assetrix Investment Platform

[![Tests](https://img.shields.io/badge/tests-9%2F9%20passing-brightgreen)](https://github.com/your-repo/assetrix)
[![Solidity](https://img.shields.io/badge/solidity-0.8.28-blue)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A decentralized real estate investment platform built on Ethereum using the **Diamond Pattern (EIP-2535)** that enables property developers to raise funds and investors to participate in real estate opportunities with milestone-based fund releases.

## 📋 Table of Contents

- [🏗️ Architecture](#-architecture)
- [🧪 Testing](#-testing)
- [🚀 Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Deployment](#-deployment)
- [🔧 Development](#-development)
- [🔒 Security](#-security)
- [📝 License](#-license)

## 🏗️ Architecture

### Diamond Pattern Implementation

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

### Key Benefits

- ✅ **Modular**: Each facet handles specific functionality
- ✅ **Upgradeable**: Individual facets can be upgraded independently
- ✅ **Gas Efficient**: Only deploy what you need
- ✅ **Scalable**: Easy to add new features as new facets
- ✅ **Maintainable**: Clear separation of concerns

## 🧪 Testing

### Test Coverage

The platform includes comprehensive tests for the diamond pattern and individual facets:

| Test File | Status | Tests | Coverage |
|-----------|--------|-------|----------|
| `test/DiamondPattern.test.js` | ✅ Passing | 9/9 | Core diamond functionality |
| `test/AdminFacet.test.js` | ✅ Passing | 19/19 | Admin functions & configuration |
| `test/PropertyFacet.test.js` | ✅ Passing | 13/13 | Property creation & management |
| `test/DiamondLoupeFacet.test.js` | ✅ Passing | 15/15 | EIP-2535 diamond loupe functions |
| **Total** | **✅ Passing** | **56/56** | **Comprehensive facet testing** |

### Test Status

| Metric | Status |
|--------|--------|
| **Tests Passing** | 56/56 ✅ |
| **Facets Tested** | 4 (AdminFacet, PropertyFacet, DiamondLoupeFacet, Core Diamond) |
| **Diamond Cut** | Working ✅ |
| **Function Routing** | Working ✅ |
| **Access Control** | Working ✅ |
| **EIP-2535 Compliance** | Working ✅ |

### Running Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/AdminFacet.test.js

# Run multiple facet tests
npx hardhat test test/AdminFacet.test.js test/PropertyFacet.test.js test/DiamondLoupeFacet.test.js

# Run core diamond test
npx hardhat test test/DiamondPattern.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

## 🚀 Features

### For Property Developers

- **Property Management**: Create and list property investment opportunities
- **Funding Configuration**: Set funding goals, ROI percentages, and investment terms
- **Milestone Planning**: Define project milestones with fund release schedules
- **Fund Receipt**: Receive funds upon milestone completion
- **Documentation**: Manage property details and documentation
- **Updates**: Update property information before funding

### For Investors

- **Investment Opportunities**: Browse active property investment opportunities
- **Flexible Investment**: Invest in properties with as little as one unit
- **Performance Tracking**: Track investment performance and expected ROI
- **Refund System**: Request refunds if funding goals aren't met
- **Early Exit**: Early exit with fee structure
- **Progress Monitoring**: Monitor project progress and milestone completion

### Security Features

- **Reentrancy Protection**: On all critical functions
- **Pausable Contract**: For emergency stops
- **Access Control**: For sensitive operations
- **Input Validation**: On all user inputs
- **Secure Fund Handling**: Checks-effects-interactions pattern
- **Emergency Refunds**: Capabilities for urgent situations

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

| Role | Permissions |
|------|-------------|
| **Owner** | Can pause/unpause, emergency operations |
| **Developer** | Can manage their own properties |
| **Investors** | Can invest, request refunds, early exit |

### Safety Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Emergency stop functionality
- **Input Validation**: All user inputs validated
- **Secure Transfers**: Checks-effects-interactions pattern

## 📝 License

MIT License

## 🙏 Acknowledgements

- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [Ethereum Foundation](https://ethereum.org/)
- [Hardhat](https://hardhat.org/)
- [Diamond Pattern (EIP-2535)](https://eips.ethereum.org/EIPS/eip-2535)