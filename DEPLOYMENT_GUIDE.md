# Assetrix Smart Contract Deployment Guide

## 📋 Overview

This guide explains the deployment and initialization flow for the Assetrix smart contract system using the Diamond Pattern architecture.

## 🏗️ Architecture

### Diamond Pattern Components
- **Diamond.sol** - The proxy contract that delegates calls to facets
- **Facets** - Modular contracts that implement specific functionality:
  - `AdminFacet.sol` - Administrative functions and initialization
  - `PropertyFacet.sol` - Property management
  - `InvestmentFacet.sol` - Investment and token operations
  - `MilestoneFacet.sol` - Milestone management
  - `TransactionFacet.sol` - Transaction recording
  - `DiamondLoupeFacet.sol` - Diamond introspection

### Shared Storage
- **AssetrixStorage.sol** - Defines the shared storage layout for all facets

## 🚀 Deployment Flow

### 1. Initial Deployment

```bash
# Deploy all contracts and initialize
npx hardhat run scripts/deploy.js --network sepolia
```

**What happens:**
- Deploys Diamond proxy contract
- Deploys all 6 facets
- Performs diamond cut to add facets
- Initializes platform (if FULL_DEPLOYMENT=true)

### 2. Verification & Initialization

```bash
# Verify contracts and check/initialize if needed
npx hardhat run scripts/verify.js --network sepolia
```

**What happens:**
- Verifies all facets on Etherscan
- Checks if contract is properly initialized
- Compares current values with environment variables
- Initializes or re-initializes if needed

### 3. Upgrades (When Needed)

```bash
# Upgrade specific facets
npx hardhat run scripts/upgrade.js --network sepolia
```

**What happens:**
- Deploys new versions of specified facets
- Performs diamond cut to replace old facets
- Updates deployment file

## 🔧 Environment Setup

### Required Environment Variables

Create a `.env` file with:

```env
# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_here

# Contract Configuration
STABLECOIN_ADDRESS=0x7169d38820dfd117c3fa1f22a697dba58d90ba06
GLOBAL_TOKEN_PRICE=100000

# Optional: Full deployment (includes initialization)
FULL_DEPLOYMENT=true
```

### Configuration Files

#### `upgrade-config.json`
Controls which facets to upgrade:

```json
{
  "upgradeFacets": ["admin", "investment"],
  "addFacets": [],
  "skipFacets": ["property", "milestone", "transaction", "diamondloupe"]
}
```

#### `deployments/deployment-sepolia.json`
Stores deployed contract addresses:

```json
{
  "network": "sepolia",
  "diamond": "0xEEd46969193CECA2AD586Cb10B9400a870C72380",
  "facets": {
    "admin": "0x3e8098Cd46aaB6F30Cdea61C171888bAF671a06B",
    "property": "0xe771fC83f962CdbfE11515Dc91C64A75EF1e5D50",
    "investment": "0xd2fD76922941528710414129543791e270b87d00",
    "milestone": "0x7a9C68c5EA672126eDa3f1DfF2F64C917e8B3A33",
    "transaction": "0x95e6D8390fDF5eb616721DAac06876a22c3B25D0",
    "diamondLoupe": "0xB601631E1410EfbEc859715DAcF1AF3CB11ba2a9"
  }
}
```

## 🔍 Initialization Logic

### Smart Initialization Check

The `verify.js` script intelligently checks if initialization is needed:

```javascript
// Check if values match environment
const needsInitialization = 
  currentOwner === ethers.ZeroAddress || 
  currentStablecoin === ethers.ZeroAddress || 
  currentTokenPrice.toString() === "0" ||
  currentOwner !== deployer.address ||
  currentStablecoin !== stablecoinAddress ||
  currentTokenPrice.toString() !== globalTokenPrice;
```

### When Initialization Happens

1. **First deployment** - Contract is not initialized
2. **Environment changes** - `.env` values differ from contract values
3. **Manual re-initialization** - When you want to update settings

### Initialization Parameters

The `initialize()` function sets:
- **Owner address** - Who controls the contract
- **Stablecoin address** - USDT contract address
- **Global token price** - Base price for all properties

## 📊 Script Functions

### `deploy.js`
- **Purpose**: Initial deployment of all contracts
- **Modes**: 
  - `standard` (default) - Deploy facets only
  - `full` (FULL_DEPLOYMENT=true) - Deploy + initialize
- **Output**: Creates deployment file with addresses

### `verify.js`
- **Purpose**: Verify contracts and check initialization
- **Features**:
  - Verifies all facets on Etherscan
  - Smart initialization check
  - Displays contract configuration
  - Shows upgrade history
- **Output**: Contract status and configuration

### `upgrade.js`
- **Purpose**: Upgrade existing facets
- **Features**:
  - Deploys new facet versions
  - Performs diamond cut
  - Updates deployment file
- **Output**: Upgrade summary

## 🔄 Typical Workflow

### New Deployment
```bash
# 1. Deploy contracts
npx hardhat run scripts/deploy.js --network sepolia

# 2. Verify and initialize
npx hardhat run scripts/verify.js --network sepolia
```

### After Code Changes
```bash
# 1. Update upgrade-config.json with facets to upgrade

# 2. Upgrade contracts
npx hardhat run scripts/upgrade.js --network sepolia

# 3. Verify and check initialization
npx hardhat run scripts/verify.js --network sepolia
```

### Environment Changes
```bash
# 1. Update .env file with new values

# 2. Verify (will detect changes and re-initialize)
npx hardhat run scripts/verify.js --network sepolia
```

## ⚠️ Important Notes

### Gas Optimization
- **Standard deployment** saves gas by skipping initialization
- **Verify script** handles initialization separately
- **Upgrade script** only upgrades specified facets

### Error Handling
- **Network timeouts** - Scripts include retry logic
- **Insufficient funds** - Check gas settings in `hardhat.config.ts`
- **Duplicate functions** - Removed `getGlobalTokenPrice()` from InvestmentFacet

### Security
- **Access control** - Only owner can initialize
- **Validation** - Checks for valid addresses and values
- **Reentrancy protection** - Custom implementation in all facets

## 🛠️ Troubleshooting

### Common Issues

1. **"Contract not initialized"**
   - Run `verify.js` to initialize
   - Check `.env` variables are set

2. **"Duplicate function selector"**
   - Ensure no duplicate functions across facets
   - Check `generate-selectors.js` output

3. **"Insufficient funds"**
   - Reduce gas settings in `hardhat.config.ts`
   - Check account balance

4. **"Network timeout"**
   - Increase timeout in `hardhat.config.ts`
   - Check RPC URL stability

### Debug Commands

```bash
# Generate function selectors
npx hardhat run scripts/generate-selectors.js

# Check deployment status
npx hardhat run scripts/verify.js --network sepolia

# Test network connection
npx hardhat run scripts/test-network.js --network sepolia
```

## 📈 Best Practices

1. **Always verify after deployment**
2. **Check initialization status regularly**
3. **Use environment variables for configuration**
4. **Test upgrades on testnet first**
5. **Keep deployment files in version control**

## 🔗 Useful Links

- **Etherscan**: https://sepolia.etherscan.io/
- **Hardhat Docs**: https://hardhat.org/docs
- **Diamond Pattern**: https://eips.ethereum.org/EIPS/eip-2535

---

**Last Updated**: August 2024  
**Version**: 1.0  
**Maintainer**: Assetrix Team 