# EIP-2771 Meta Transaction Integration Guide

## Overview

This guide explains how to integrate EIP-2771 gasless meta transactions into the Assetrix platform. Meta transactions allow users to interact with smart contracts without paying gas fees, making the platform more accessible to users who don't have ETH for gas.

## Architecture

### Smart Contract Layer
- **MetaTransactionFacet**: Handles meta transaction execution and signature verification
- **BaseMetaTransactionFacet**: Base contract providing meta transaction support
- **InvestmentFacetMeta**: Meta transaction-enabled version of investment functions

### Frontend Layer
- Signature generation and transaction preparation
- Meta transaction submission to relayers

### Backend Layer
- Relayer service for executing meta transactions
- Signature verification and nonce management

## Implementation Steps

### 1. Smart Contract Deployment

```bash
# Deploy meta transaction facets
npx hardhat run scripts/deploy-meta-transactions.js --network sepolia

# Run tests
npx hardhat test test/MetaTransaction.test.js
```

### 2. Frontend Integration

#### A. Meta Transaction Service

Create `src/services/metaTransactionService.js`:

```javascript
import { ethers } from 'ethers';
import { MetaTransactionFacetABI } from '../abi';

export class MetaTransactionService {
    constructor(contractAddress, provider, signer) {
        this.contract = new ethers.Contract(contractAddress, MetaTransactionFacetABI, signer);
        this.provider = provider;
    }

    async getNonce(userAddress) {
        return await this.contract.getNonce(userAddress);
    }

    async createMetaTransaction(userAddress, functionSignature) {
        const nonce = await this.getNonce(userAddress);
        
        const metaTx = {
            nonce: nonce.toNumber(),
            from: userAddress,
            functionSignature: functionSignature
        };

        return metaTx;
    }

    async signMetaTransaction(metaTx, signer) {
        const domain = {
            name: 'Assetrix',
            version: '1',
            chainId: await this.provider.getNetwork().then(n => n.chainId),
            verifyingContract: this.contract.address
        };

        const types = {
            MetaTransaction: [
                { name: 'nonce', type: 'uint256' },
                { name: 'from', type: 'address' },
                { name: 'functionSignature', type: 'bytes' }
            ]
        };

        const signature = await signer._signTypedData(domain, types, metaTx);
        return ethers.utils.splitSignature(signature);
    }

    async executeMetaTransaction(userAddress, functionSignature, signature) {
        const { v, r, s } = signature;
        
        const tx = await this.contract.executeMetaTransaction(
            userAddress,
            functionSignature,
            r,
            s,
            v,
            { gasLimit: 300000 }
        );

        return await tx.wait();
    }
}
```

#### B. Investment Service with Meta Transactions

Create `src/services/investmentMetaService.js`:

```javascript
import { ethers } from 'ethers';
import { InvestmentFacetMetaABI } from '../abi';
import { MetaTransactionService } from './metaTransactionService';

export class InvestmentMetaService {
    constructor(diamondAddress, provider, signer) {
        this.diamond = new ethers.Contract(diamondAddress, InvestmentFacetMetaABI, signer);
        this.metaTxService = new MetaTransactionService(diamondAddress, provider, signer);
        this.provider = provider;
        this.signer = signer;
    }

    async purchaseTokensGasless(propertyId, tokenAmount) {
        const userAddress = await this.signer.getAddress();
        
        // Encode the function call
        const functionSignature = this.diamond.interface.encodeFunctionData(
            'purchaseTokens',
            [propertyId, tokenAmount]
        );

        // Create meta transaction
        const metaTx = await this.metaTxService.createMetaTransaction(
            userAddress,
            functionSignature
        );

        // Sign the meta transaction
        const signature = await this.metaTxService.signMetaTransaction(metaTx, this.signer);

        // Execute meta transaction
        return await this.metaTxService.executeMetaTransaction(
            userAddress,
            functionSignature,
            signature
        );
    }

    async requestRefundGasless(propertyId) {
        const userAddress = await this.signer.getAddress();
        
        const functionSignature = this.diamond.interface.encodeFunctionData(
            'requestRefund',
            [propertyId]
        );

        const metaTx = await this.metaTxService.createMetaTransaction(
            userAddress,
            functionSignature
        );

        const signature = await this.metaTxService.signMetaTransaction(metaTx, this.signer);

        return await this.metaTxService.executeMetaTransaction(
            userAddress,
            functionSignature,
            signature
        );
    }

    async claimPayoutGasless(propertyId) {
        const userAddress = await this.signer.getAddress();
        
        const functionSignature = this.diamond.interface.encodeFunctionData(
            'claimPayout',
            [propertyId]
        );

        const metaTx = await this.metaTxService.createMetaTransaction(
            userAddress,
            functionSignature
        );

        const signature = await this.metaTxService.signMetaTransaction(metaTx, this.signer);

        return await this.metaTxService.executeMetaTransaction(
            userAddress,
            functionSignature,
            signature
        );
    }
}
```

#### C. React Hook for Meta Transactions

Create `src/hooks/useMetaTransactions.js`:

```javascript
import { useState, useCallback } from 'react';
import { useWeb3React } from '@web3-react/core';
import { InvestmentMetaService } from '../services/investmentMetaService';

export function useMetaTransactions(diamondAddress) {
    const { library, account } = useWeb3React();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const investmentService = useMemo(() => {
        if (!library || !account) return null;
        return new InvestmentMetaService(diamondAddress, library, library.getSigner());
    }, [library, account, diamondAddress]);

    const purchaseTokensGasless = useCallback(async (propertyId, tokenAmount) => {
        if (!investmentService) throw new Error('Web3 not connected');
        
        setIsLoading(true);
        setError(null);
        
        try {
            const result = await investmentService.purchaseTokensGasless(propertyId, tokenAmount);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [investmentService]);

    const requestRefundGasless = useCallback(async (propertyId) => {
        if (!investmentService) throw new Error('Web3 not connected');
        
        setIsLoading(true);
        setError(null);
        
        try {
            const result = await investmentService.requestRefundGasless(propertyId);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [investmentService]);

    const claimPayoutGasless = useCallback(async (propertyId) => {
        if (!investmentService) throw new Error('Web3 not connected');
        
        setIsLoading(true);
        setError(null);
        
        try {
            const result = await investmentService.claimPayoutGasless(propertyId);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [investmentService]);

    return {
        purchaseTokensGasless,
        requestRefundGasless,
        claimPayoutGasless,
        isLoading,
        error
    };
}
```

### 3. Backend Relayer Service

Create `src/services/relayerService.js`:

```javascript
const { ethers } = require('ethers');
const { MetaTransactionFacetABI } = require('../abi');

class RelayerService {
    constructor(diamondAddress, privateKey, rpcUrl) {
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(diamondAddress, MetaTransactionFacetABI, this.wallet);
    }

    async relayMetaTransaction(userAddress, functionSignature, signature) {
        const { v, r, s } = signature;
        
        try {
            const tx = await this.contract.executeMetaTransaction(
                userAddress,
                functionSignature,
                r,
                s,
                v,
                { gasLimit: 300000 }
            );

            const receipt = await tx.wait();
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getNonce(userAddress) {
        return await this.contract.getNonce(userAddress);
    }
}

module.exports = RelayerService;
```

### 4. API Endpoints for Meta Transactions

Create `src/routes/metaTransactions.js`:

```javascript
const express = require('express');
const RelayerService = require('../services/relayerService');
const router = express.Router();

const relayerService = new RelayerService(
    process.env.DIAMOND_ADDRESS,
    process.env.RELAYER_PRIVATE_KEY,
    process.env.RPC_URL
);

// Relay meta transaction
router.post('/relay', async (req, res) => {
    try {
        const { userAddress, functionSignature, signature } = req.body;
        
        if (!userAddress || !functionSignature || !signature) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const result = await relayerService.relayMetaTransaction(
            userAddress,
            functionSignature,
            signature
        );

        if (result.success) {
            res.json({
                success: true,
                transactionHash: result.transactionHash,
                gasUsed: result.gasUsed
            });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user nonce
router.get('/nonce/:userAddress', async (req, res) => {
    try {
        const { userAddress } = req.params;
        const nonce = await relayerService.getNonce(userAddress);
        res.json({ nonce: nonce.toString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

## Usage Examples

### Frontend Component Example

```jsx
import React, { useState } from 'react';
import { useMetaTransactions } from '../hooks/useMetaTransactions';

function PropertyInvestment({ propertyId, tokenPrice }) {
    const [tokenAmount, setTokenAmount] = useState(1);
    const { purchaseTokensGasless, isLoading, error } = useMetaTransactions(diamondAddress);

    const handlePurchase = async () => {
        try {
            const result = await purchaseTokensGasless(propertyId, tokenAmount);
            console.log('Purchase successful:', result);
        } catch (err) {
            console.error('Purchase failed:', err);
        }
    };

    return (
        <div>
            <input
                type="number"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(parseInt(e.target.value))}
                min="1"
            />
            <button onClick={handlePurchase} disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Purchase Tokens (Gasless)'}
            </button>
            {error && <p style={{color: 'red'}}>{error}</p>}
        </div>
    );
}
```

## Security Considerations

1. **Nonce Management**: Each user has a unique nonce that prevents replay attacks
2. **Signature Verification**: All meta transactions are verified using EIP-712 signatures
3. **Gas Limits**: Set appropriate gas limits to prevent DoS attacks
4. **Relayer Security**: Use secure private keys and implement rate limiting

## Gas Optimization

- Meta transactions typically use 100k-200k gas
- Consider batching multiple operations
- Use efficient signature verification methods
- Implement gas price optimization strategies

## Testing

```bash
# Run meta transaction tests
npx hardhat test test/MetaTransaction.test.js

# Test on testnet
npx hardhat run scripts/deploy-meta-transactions.js --network sepolia
```

## Deployment Checklist

- [ ] Deploy MetaTransactionFacet
- [ ] Deploy InvestmentFacetMeta
- [ ] Add facets to diamond via diamondCut
- [ ] Update frontend with meta transaction services
- [ ] Deploy backend relayer service
- [ ] Test end-to-end functionality
- [ ] Monitor gas usage and optimize
- [ ] Implement error handling and fallbacks

## Benefits

1. **User Experience**: Users don't need ETH for gas fees
2. **Adoption**: Lower barrier to entry for new users
3. **Scalability**: Relayers can batch transactions
4. **Flexibility**: Can implement complex gas strategies

## Next Steps

1. Extend meta transaction support to other facets (PropertyFacet, MilestoneFacet)
2. Implement transaction batching for better gas efficiency
3. Add support for multiple relayers
4. Implement gas price optimization strategies
5. Add analytics and monitoring for meta transaction usage
