# Assetrix Investment Platform

[![Solidity](https://img.shields.io/badge/solidity-0.8.28-blue)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Diamond Pattern](https://img.shields.io/badge/diamond%20pattern-EIP--2535-orange)](https://eips.ethereum.org/EIPS/eip-2535)

A decentralized real estate investment platform built on Ethereum using the **Diamond Pattern (EIP-2535)** that enables property developers to raise funds and investors to participate in real estate opportunities with milestone-based fund releases and dual payment support (stablecoins and fiat payments). Features **EIP-2771 gasless transactions** and **EIP-712 secure signatures** for seamless user experience.

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
| **FiatPaymentFacet.sol** | Fiat payment processing with EIP-712 signatures |
| **DiamondLoupeFacet.sol** | Diamond structure querying (EIP-2535 standard) |
| **TrustedForwarder.sol** | EIP-2771 gasless transaction relay |
| **EIP2771Context.sol** | Base contract for EIP-2771 support |
| **TransactionEncoder.sol** | Utility for encoding gasless transactions |

## 🚀 Features

### For Property Developers

- **Property Management**: Create and list property investment opportunities
- **Funding Configuration**: Set funding goals, ROI percentages, and investment terms
- **Milestone Planning**: Define project milestones with automated fund releases
- **Fund Receipt**: Receive funds upon milestone completion with transparent tracking
- **Dual Payment Support**: Accept both stablecoins and fiat payments

### For Investors

- **Investment Opportunities**: Browse active property investment opportunities
- **Flexible Investment**: Invest with minimal amounts and fractional ownership
- **Multiple Payment Methods**: Pay with stablecoins or fiat currency
- **Performance Tracking**: Track investment performance and expected ROI
- **Refund System**: Request refunds if funding goals aren't met
- **Early Exit**: Early exit with structured fee system for liquidity

### Platform Features

- **Diamond Pattern Architecture**: Modular, upgradeable smart contract system
- **Milestone-Based Funding**: Automated fund releases based on project milestones
- **Tokenized Real Estate**: Fractional ownership of real estate properties
- **Fiat Payment Integration**: Secure fiat payment processing with backend verification
- **Gasless Transactions (EIP-2771)**: Users can interact without paying gas fees
- **Secure Signatures (EIP-712)**: Type-safe, secure signature verification for fiat payments
- **Multi-Network Support**: Deployable on any EVM-compatible blockchain
- **Security First**: Comprehensive security measures and audit-ready code

## 📦 Installation

### Prerequisites

- Node.js (v18+)
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

```env
# Network Configuration
PRIVATE_KEY=your_deployment_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key

# RPC URLs
SEPOLIA_RPC_URL=your_sepolia_rpc_url
MAINNET_RPC_URL=your_mainnet_rpc_url

# Optional: External wallet for backend signer
BACKEND_SIGNER_ADDRESS=your_wallet_address
```

### Deployment Commands

```bash
# Deploy to network
npx hardhat run scripts/deploy.js --network [network-name]

# Set backend signer for fiat payments
npx hardhat run scripts/set-backend-signer.js --network [network-name]

# Upgrade contract
npx hardhat run scripts/upgrade.js --network [network-name]

# Verify contract
npx hardhat run scripts/verify.js --network [network-name]
```

## 🔧 Backend Integration

### Gasless Transactions (EIP-2771)

The platform supports gasless transactions through EIP-2771 trusted forwarder:

```bash
# Deploy TrustedForwarder
npx hardhat run scripts/deploy-forwarder.js --network [network-name]

# Set trusted forwarder in Diamond
npx hardhat run scripts/set-trusted-forwarder.js --network [network-name]

# Authorize backend as relayer
npx hardhat run scripts/authorize-relayer.js --network [network-name]
```

### Fiat Payment Setup

The platform supports fiat payments through a secure backend signer system:

```bash
# Set up backend signer (creates wallet automatically)
npx hardhat run scripts/set-backend-signer.js --network sepolia

# For production, use your own wallet or let script create one
export BACKEND_SIGNER_ADDRESS=your_wallet_address
npx hardhat run scripts/set-backend-signer.js --network mainnet
```

### Backend Integration Guide

See [BACKEND_SIGNER_SETUP.md](./BACKEND_SIGNER_SETUP.md) for detailed backend integration instructions.

### Gasless Transaction Integration

See [EIP-2771.md](./docs/EIP-2771.md) for complete EIP-2771 integration guide and examples.

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
npx hardhat test test/FiatPayment.test.js
npx hardhat test test/DiamondLoupeFacet.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run test scripts
node test-scripts/run-all-tests.js
```

## 🔒 Security

### Access Control

- **Owner**: Can pause/unpause, emergency operations, admin functions
- **Backend Signer**: Authorized to sign fiat payment verifications
- **Developer**: Can manage their own properties, request milestone funds
- **Investors**: Can invest, request refunds, early exit, view properties

### Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks on all critical functions
- **Pausable**: Emergency stop functionality for crisis management
- **Access Control**: Role-based permissions for sensitive operations
- **EIP-712 Signatures**: Secure fiat payment verification
- **EIP-2771 Trusted Forwarder**: Secure gasless transaction relay
- **Input Validation**: Comprehensive validation on all user inputs
- **Secure Fund Handling**: Checks-effects-interactions pattern implementation
- **Upgradeable Architecture**: Safe upgrade mechanisms for continuous improvement

## 📚 Documentation

- [FIAT_PAYMENT_INTEGRATION.md](./FIAT_PAYMENT_INTEGRATION.md) - Fiat payment system documentation
- [BACKEND_SIGNER_SETUP.md](./BACKEND_SIGNER_SETUP.md) - Backend integration guide
- [EIP-2771.md](./docs/EIP-2771.md) - Gasless transaction integration guide
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Detailed deployment instructions
- [TEST_DOCUMENTATION.md](./TEST_DOCUMENTATION.md) - Testing guide and results

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgements

- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [Ethereum Foundation](https://ethereum.org/)
- [Hardhat](https://hardhat.org/)
- [Diamond Pattern (EIP-2535)](https://eips.ethereum.org/EIPS/eip-2535)
- [EIP-2771 (Trusted Forwarder)](https://eips.ethereum.org/EIPS/eip-2771)
- [EIP-712 (Typed Structured Data)](https://eips.ethereum.org/EIPS/eip-712)
