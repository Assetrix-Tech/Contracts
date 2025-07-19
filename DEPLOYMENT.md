# 🚀 Assetrix Deployment Guide

This guide explains how to deploy, upgrade, and manage the Assetrix diamond pattern smart contracts.

## 📋 Table of Contents

- [Overview](#-overview)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Scripts Overview](#-scripts-overview)
- [Configuration Files](#-configuration-files)
- [Deployment Workflows](#-deployment-workflows)
- [Advanced Usage](#-advanced-usage)
- [Troubleshooting](#-troubleshooting)

## 🎯 Overview

The Assetrix platform uses a **Diamond Pattern (EIP-2535)** architecture with modular facets that can be deployed and upgraded independently. This guide covers all deployment scenarios from initial setup to production upgrades.

## ✅ Prerequisites

### Required Tools
- Node.js (v16+)
- npm or yarn
- Hardhat
- Git

### Required Accounts
- **Etherscan API Key**: [Get one here](https://etherscan.io/apis)
- **Infura/Alchemy Account**: For RPC endpoints
- **Deployment Wallet**: With sufficient ETH for gas

### Environment Setup
```bash
# Clone the repository
git clone [repository-url]
cd Assetrix

# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Edit .env with your values
nano .env
```

## 🚀 Quick Start

### 1. Environment Configuration
```bash
# Required variables in .env
PRIVATE_KEY=0x1234567890abcdef...
ETHERSCAN_API_KEY=your_api_key_here
STABLECOIN_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
RPC_URL=https://sepolia.infura.io/v3/your_project_id
```

### 2. Initial Deployment
```bash
# Deploy core facets only (recommended for testing)
npx hardhat run scripts/deploy.js --network sepolia

# OR deploy all facets at once
FULL_DEPLOYMENT=true npx hardhat run scripts/deploy.js --network sepolia
```

### 3. Add New Features
```bash
# Edit upgrade-config.json
echo '{"upgradeFacets": [], "addFacets": ["insurance"], "skipFacets": []}' > upgrade-config.json

# Deploy new features
npx hardhat run scripts/upgrade.js --network sepolia
```

### 4. Verify Contracts
```bash
npx hardhat run scripts/verify.js --network sepolia
```

## 📜 Scripts Overview

### 🔧 `deploy.js` - Initial Deployment

**Purpose**: Deploy the diamond proxy and initial facets

**Two Deployment Modes**:
- **Standard**: Core facets only (cheaper, faster)
- **Full**: All facets at once (comprehensive)

**Usage**:
```bash
# Standard deployment (core facets)
npx hardhat run scripts/deploy.js --network sepolia

# Full deployment (all facets)
FULL_DEPLOYMENT=true npx hardhat run scripts/deploy.js --network sepolia
```

**What it does**:
1. Deploys `Diamond.sol` proxy contract
2. Deploys selected facets based on mode
3. Performs diamond cut to add facets
4. Saves deployment data to `deployments/deployment-{network}.json`

**Output**:
```
🚀 Performing standard deployment (core facets only)
🔧 Deploying diamond proxy...
✅ Diamond deployed to: 0x123...
📦 Deploying core facets...
✅ AdminFacet deployed to: 0x456...
✅ PropertyFacet deployed to: 0x789...
🔧 Performing diamond cut for core facets...
✅ Diamond cut completed with 5 facets
✅ Standard deployment data saved to deployments/deployment-sepolia.json
```

### 🔄 `upgrade.js` - Facet Management

**Purpose**: Upgrade existing facets and add new ones

**Key Features**:
- ✅ **Smart Configuration**: Reads from `upgrade-config.json`
- ✅ **Error Correction**: Auto-fixes configuration mistakes
- ✅ **Granular Control**: Upgrade/add specific facets only
- ✅ **Safe Execution**: Continues even if some facets fail

**Usage**:
```bash
npx hardhat run scripts/upgrade.js --network sepolia
```

**What it does**:
1. Reads `upgrade-config.json` configuration
2. Validates and corrects configuration mistakes
3. Deploys upgraded versions of existing facets
4. Deploys new facets
5. Performs diamond cut operations
6. Verifies all changes
7. Updates deployment records

**Output**:
```
📋 Loaded upgrade configuration from upgrade-config.json
🔄 Facets to upgrade: 2
⏭️ Facets not in config (auto-skipped): admin, transaction
🆕 Facets to add: 1
🔄 Upgrading propertyFacet...
✅ PropertyFacetV2 deployed to: 0xabc...
🔧 Performing diamond cut...
✅ Diamond cut completed successfully
🔍 Verifying changes...
✅ PropertyFacet upgrade verified
✅ InsuranceFacet addition verified
```

### ⚙️ `upgrade-config.json` - Configuration

**Purpose**: Control which facets to upgrade or add

**Structure**:
```json
{
  "upgradeFacets": ["property", "investment"],
  "addFacets": ["insurance", "analytics"],
  "skipFacets": ["admin"]
}
```

**Configuration Options**:

| Field | Description | Example |
|-------|-------------|---------|
| `upgradeFacets` | Existing facets to upgrade | `["property", "investment"]` |
| `addFacets` | New facets to add | `["insurance", "analytics"]` |
| `skipFacets` | Facets to skip | `["admin"]` |

**Smart Features**:
- **Auto-Correction**: Moves facets to correct arrays if misplaced
- **Validation**: Checks if facets exist before upgrading
- **Flexibility**: Empty arrays mean no action

**Example Configurations**:

**Add New Features Only**:
```json
{
  "upgradeFacets": [],
  "addFacets": ["insurance", "analytics"],
  "skipFacets": []
}
```

**Upgrade Existing Features Only**:
```json
{
  "upgradeFacets": ["property", "investment"],
  "addFacets": [],
  "skipFacets": []
}
```

**Mixed Operations**:
```json
{
  "upgradeFacets": ["property"],
  "addFacets": ["insurance"],
  "skipFacets": ["admin"]
}
```

### 🔍 `verify.js` - Contract Verification

**Purpose**: Verify all contracts on Etherscan

**Usage**:
```bash
npx hardhat run scripts/verify.js --network sepolia
```

**What it does**:
1. Reads deployment data from file or environment
2. Verifies each facet contract
3. Displays contract configuration
4. Shows verification status

**Output**:
```
🔍 Verifying facets...
Verifying AdminFacet at 0x123...
✅ AdminFacet verified
Verifying PropertyFacet at 0x456...
✅ PropertyFacet verified
📋 Contract Configuration:
Global Token Price: 100000 Naira
Diamond Owner: 0x789...
```

## 🔄 Deployment Workflows

### Workflow 1: Development Setup
```bash
# 1. Initial deployment (core only)
npx hardhat run scripts/deploy.js --network sepolia

# 2. Add features as you develop
echo '{"upgradeFacets": [], "addFacets": ["insurance"], "skipFacets": []}' > upgrade-config.json
npx hardhat run scripts/upgrade.js --network sepolia

# 3. Verify everything
npx hardhat run scripts/verify.js --network sepolia
```

### Workflow 2: Production Release
```bash
# 1. Deploy everything at once
FULL_DEPLOYMENT=true npx hardhat run scripts/deploy.js --network mainnet

# 2. Verify contracts
npx hardhat run scripts/verify.js --network mainnet
```

### Workflow 3: Emergency Fix
```bash
# 1. Fix the bug in PropertyFacet
# 2. Configure upgrade
echo '{"upgradeFacets": ["property"], "addFacets": [], "skipFacets": []}' > upgrade-config.json

# 3. Deploy fix
npx hardhat run scripts/upgrade.js --network mainnet
```

### Workflow 4: Feature Release
```bash
# 1. Add new features
echo '{"upgradeFacets": [], "addFacets": ["governance", "staking"], "skipFacets": []}' > upgrade-config.json
npx hardhat run scripts/upgrade.js --network mainnet

# 2. Verify new features
npx hardhat run scripts/verify.js --network mainnet
```

## ⚙️ Advanced Usage

### Environment Variables

**Deployment Control**:
```bash
# Full deployment mode
FULL_DEPLOYMENT=true npx hardhat run scripts/deploy.js --network sepolia

# Skip verification (faster deployment)
SKIP_VERIFICATION=true npx hardhat run scripts/deploy.js --network sepolia

# Verbose gas reporting
VERBOSE_GAS=true npx hardhat run scripts/deploy.js --network sepolia
```

**Diamond Address**:
```bash
# Use specific diamond address
DIAMOND_ADDRESS=0x123... npx hardhat run scripts/upgrade.js --network sepolia
```

### Configuration Management

**Multiple Configurations**:
```bash
# Development config
cp upgrade-config.json upgrade-config-dev.json

# Production config
cp upgrade-config.json upgrade-config-prod.json

# Use specific config
cp upgrade-config-prod.json upgrade-config.json
npx hardhat run scripts/upgrade.js --network mainnet
```

**Dynamic Configuration**:
```bash
# Generate config programmatically
echo '{"upgradeFacets": ["property"], "addFacets": ["insurance"], "skipFacets": []}' > upgrade-config.json
npx hardhat run scripts/upgrade.js --network sepolia
```

### Error Handling

**Graceful Failures**:
- If a facet fails to deploy, others continue
- Configuration mistakes are auto-corrected
- Clear error messages guide fixes

**Recovery**:
```bash
# If deployment fails, check logs and retry
npx hardhat run scripts/upgrade.js --network sepolia

# If verification fails, retry
npx hardhat run scripts/verify.js --network sepolia
```

## 🔧 Troubleshooting

### Common Issues

**1. "Contract not found" Error**:
```bash
# Solution: Compile contracts first
npx hardhat compile
```

**2. "Insufficient funds" Error**:
```bash
# Solution: Add more ETH to deployment wallet
# Check balance: npx hardhat run scripts/check-balance.js
```

**3. "Already verified" Error**:
```bash
# This is normal - contract is already verified
# Continue with deployment
```

**4. "Configuration error"**:
```bash
# Check upgrade-config.json syntax
# Ensure facet names match contract names
```

### Debug Mode

**Enable verbose logging**:
```bash
# Add to .env
VERBOSE_GAS=true
DEBUG=true

# Run with debug info
DEBUG=true npx hardhat run scripts/deploy.js --network sepolia
```

### Network Issues

**RPC Connection Problems**:
```bash
# Check RPC URL in .env
# Try alternative RPC providers
# Check network status
```

**Gas Estimation Issues**:
```bash
# Set manual gas price
GAS_PRICE=20000000000 npx hardhat run scripts/deploy.js --network sepolia

# Set gas limit
GAS_LIMIT=5000000 npx hardhat run scripts/deploy.js --network sepolia
```

## 📊 Best Practices

### 1. Testing
- Always test on testnets first
- Use different wallets for testing
- Verify contracts after deployment

### 2. Security
- Keep private keys secure
- Use different keys for different networks
- Review contracts before deployment

### 3. Gas Optimization
- Deploy only what you need
- Use standard deployment for testing
- Monitor gas costs

### 4. Documentation
- Keep deployment records
- Document configuration changes
- Track upgrade history

## 🎯 Summary

The Assetrix deployment system provides:

- ✅ **Flexible Deployment**: Standard or full deployment modes
- ✅ **Smart Upgrades**: Configuration-driven facet management
- ✅ **Error Handling**: Graceful failure recovery
- ✅ **Verification**: Automatic contract verification
- ✅ **Documentation**: Comprehensive deployment tracking

**Quick Reference**:
```bash
# Deploy: deploy.js
# Upgrade: upgrade.js + upgrade-config.json
# Verify: verify.js
# Configure: .env + upgrade-config.json
```

For more information, see the main [README.md](README.md) file. 