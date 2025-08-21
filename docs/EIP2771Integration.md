# EIP-2771 Integration Documentation

## Overview

The Assetrix smart contracts have been integrated with **EIP-2771 (Trusted Forwarder)** to enable gasless transactions. This allows users to interact with the platform without paying gas fees, while the backend handles gas payment and transaction relaying.

## Architecture

### Components

1. **TrustedForwarder.sol** - The main forwarder contract that relays transactions
2. **EIP2771Context.sol** - Base contract providing sender extraction functionality
3. **TransactionEncoder.sol** - Utility contract for encoding transactions with sender address
4. **Modified Facets** - All facets now inherit from EIP2771Context and use `_msgSender()`

### Flow

```
User → Frontend → Backend → TrustedForwarder → Diamond Contract
```

## Contract Modifications

### 1. AssetrixStorage.sol
- Added `trustedForwarder` field to store the forwarder address

### 2. Diamond.sol
- Now inherits from `EIP2771Context`
- Supports EIP-2771 sender extraction

### 3. All Facets
- Inherit from `EIP2771Context`
- Use `_msgSender()` instead of `msg.sender`
- Support gasless transactions

### 4. AdminFacet.sol
- Added `setTrustedForwarder()` and `getTrustedForwarder()` functions

## Functions Supporting Gasless Transactions

### Investment Operations
- `purchaseTokens(uint256 _propertyId, uint256 _tokenAmount)`
- `earlyExit(uint256 _propertyId)`

### Property Management
- `createProperty(PropertyCreationData memory _data)`
- `updateProperty(uint256 _propertyId, PropertyUpdateData memory _data)`
- `deactivateProperty(uint256 _propertyId)`

### Milestone Operations
- `requestMilestoneFunds(uint256 _propertyId, uint256 _milestoneId)`
- `markMilestoneCompleted(uint256 _propertyId, uint256 _milestoneId)`

## Setup Instructions

### 1. Deploy TrustedForwarder
```javascript
const TrustedForwarder = await ethers.getContractFactory("TrustedForwarder");
const trustedForwarder = await TrustedForwarder.deploy(diamondAddress);
await trustedForwarder.deployed();
```

### 2. Set Trusted Forwarder in Diamond
```javascript
await diamondContract.setTrustedForwarder(trustedForwarder.address);
```

### 3. Authorize Backend Relayer
```javascript
await trustedForwarder.authorizeRelayer(backendWallet.address);
```

## Frontend Integration

### 1. Transaction Encoding
```javascript
import { ethers } from 'ethers';

class GaslessTransactionManager {
    constructor(diamondContract, trustedForwarder, transactionEncoder) {
        this.diamond = diamondContract;
        this.forwarder = trustedForwarder;
        this.encoder = transactionEncoder;
    }

    async purchaseTokens(propertyId, tokenAmount, userAddress) {
        // 1. Encode the transaction with sender address
        const encodedData = await this.encoder.encodePurchaseTokens(
            userAddress,
            propertyId,
            tokenAmount
        );

        // 2. Send to backend for relaying
        const response = await fetch('/api/relay-transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: encodedData,
                user: userAddress,
                functionName: 'purchaseTokens'
            })
        });

        return await response.json();
    }

    async earlyExit(propertyId, userAddress) {
        const encodedData = await this.encoder.encodeEarlyExit(
            userAddress,
            propertyId
        );

        const response = await fetch('/api/relay-transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: encodedData,
                user: userAddress,
                functionName: 'earlyExit'
            })
        });

        return await response.json();
    }

    async createProperty(propertyData, userAddress) {
        const encodedData = await this.encoder.encodeCreateProperty(
            userAddress,
            propertyData
        );

        const response = await fetch('/api/relay-transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: encodedData,
                user: userAddress,
                functionName: 'createProperty'
            })
        });

        return await response.json();
    }
}
```

### 2. User Interface
```javascript
// Example: Purchase tokens without gas
async function handleTokenPurchase() {
    const propertyId = 1;
    const tokenAmount = 100;
    const userAddress = userWallet.address;

    try {
        // Show loading state
        setLoading(true);

        // Call gasless transaction
        const result = await gaslessManager.purchaseTokens(
            propertyId, 
            tokenAmount, 
            userAddress
        );

        if (result.success) {
            showSuccess('Tokens purchased successfully!');
        } else {
            showError('Transaction failed: ' + result.error);
        }
    } catch (error) {
        showError('Error: ' + error.message);
    } finally {
        setLoading(false);
    }
}
```

## Backend Integration

### 1. Transaction Relayer Service
```javascript
class TransactionRelayer {
    constructor(provider, relayerWallet, trustedForwarder) {
        this.provider = provider;
        this.wallet = relayerWallet;
        this.forwarder = trustedForwarder;
    }

    async relayTransaction(encodedData, userAddress) {
        try {
            // 1. Estimate gas for the transaction
            const gasEstimate = await this.forwarder.estimateGas.forward(encodedData);
            
            // 2. Get current gas price
            const gasPrice = await this.provider.getGasPrice();
            
            // 3. Prepare transaction
            const tx = {
                to: this.forwarder.address,
                data: this.forwarder.interface.encodeFunctionData('forward', [encodedData]),
                gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
                gasPrice: gasPrice
            };

            // 4. Send transaction
            const transaction = await this.wallet.sendTransaction(tx);
            
            // 5. Wait for confirmation
            const receipt = await transaction.wait();

            return {
                success: true,
                transactionHash: receipt.transactionHash,
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: gasPrice.toString()
            };

        } catch (error) {
            console.error('Relay error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}
```

### 2. API Endpoint
```javascript
// Express.js API endpoint
app.post('/api/relay-transaction', async (req, res) => {
    try {
        const { data, user, functionName } = req.body;

        // Validate request
        if (!data || !user || !functionName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters'
            });
        }

        // Relay the transaction
        const result = await transactionRelayer.relayTransaction(data, user);

        res.json(result);

    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
```

## Security Considerations

### 1. Relayer Authorization
- Only authorized backend addresses can relay transactions
- Owner can add/remove relayers as needed

### 2. Sender Validation
- Real sender is extracted from calldata
- Prevents impersonation attacks

### 3. Gas Limits
- Backend can set gas limits to prevent abuse
- Monitor gas costs and set reasonable limits

### 4. Rate Limiting
- Implement rate limiting on backend API
- Prevent spam transactions

## Gas Cost Management

### 1. Gas Estimation
```javascript
async function estimateGasCost(encodedData) {
    const gasEstimate = await trustedForwarder.estimateGas.forward(encodedData);
    const gasPrice = await provider.getGasPrice();
    const gasCost = gasEstimate.mul(gasPrice);
    
    return {
        gasEstimate: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
        gasCost: ethers.utils.formatEther(gasCost)
    };
}
```

### 2. Gas Optimization
- Batch multiple transactions when possible
- Use optimal gas prices based on network conditions
- Monitor and adjust gas strategies

## Monitoring and Analytics

### 1. Transaction Tracking
```javascript
// Monitor relayed transactions
trustedForwarder.on('TransactionRelayed', (from, to, data, success) => {
    console.log(`Transaction relayed: ${from} -> ${to}, Success: ${success}`);
    
    // Update analytics
    updateTransactionMetrics({
        user: from,
        success: success,
        timestamp: Date.now()
    });
});
```

### 2. Gas Usage Analytics
```javascript
// Track gas costs
async function trackGasUsage(transactionHash) {
    const receipt = await provider.getTransactionReceipt(transactionHash);
    
    const gasData = {
        transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.gasPrice.toString(),
        totalCost: receipt.gasUsed.mul(receipt.gasPrice).toString()
    };
    
    // Store in database for analytics
    await saveGasUsage(gasData);
}
```

## Testing

### 1. Unit Tests
```javascript
describe('EIP-2771 Integration', () => {
    it('should relay purchaseTokens transaction', async () => {
        const encodedData = await transactionEncoder.encodePurchaseTokens(
            user.address,
            1, // propertyId
            100 // tokenAmount
        );

        const tx = await trustedForwarder.connect(relayer).forward(encodedData);
        const receipt = await tx.wait();

        expect(receipt.status).to.equal(1);
    });
});
```

### 2. Integration Tests
```javascript
describe('Gasless Transaction Flow', () => {
    it('should complete full gasless transaction flow', async () => {
        // 1. Encode transaction
        const encodedData = await transactionEncoder.encodePurchaseTokens(
            user.address,
            1,
            100
        );

        // 2. Relay transaction
        const result = await transactionRelayer.relayTransaction(encodedData, user.address);

        // 3. Verify transaction
        expect(result.success).to.be.true;
        expect(result.transactionHash).to.not.be.undefined;

        // 4. Check state changes
        const tokenBalance = await diamond.getTokenBalance(1, user.address);
        expect(tokenBalance).to.equal(100);
    });
});
```

## Migration Guide

### For Existing Users
1. **No Breaking Changes**: Existing direct transactions still work
2. **Optional Gasless**: Users can choose between gasless and direct transactions
3. **Gradual Migration**: Can migrate to gasless transactions over time

### For Developers
1. **Update Frontend**: Use new gasless transaction methods
2. **Backend Setup**: Deploy and configure relayer service
3. **Testing**: Test both gasless and direct transaction paths

## Benefits

### For Users
- **No Gas Fees**: Users don't need to pay gas
- **Simplified UX**: No need to understand gas mechanics
- **Faster Transactions**: Backend optimizes gas prices

### For Platform
- **Lower Barriers**: Easier onboarding for non-crypto users
- **Better UX**: Seamless transaction experience
- **Cost Control**: Backend manages gas costs

### For Business
- **Increased Adoption**: Lower barriers to entry
- **User Retention**: Better user experience
- **Competitive Advantage**: Gasless transactions as a feature

## Support

For questions or issues with the EIP-2771 integration:

1. Check the contract documentation
2. Review the test files
3. Contact the development team
4. Submit issues to the repository

---

**Note**: This integration maintains backward compatibility. Users can still use direct transactions if they prefer to pay their own gas fees.
