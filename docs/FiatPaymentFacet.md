# FiatPaymentFacet Documentation

## Overview
The FiatPaymentFacet handles fiat-to-token conversions using EIP-712 signatures for secure backend verification. This facet enables users to purchase tokens using traditional fiat payments while maintaining blockchain security.

## Access Control
- **Public**: View functions are publicly accessible
- **User/Backend**: Main functions can be called by user or authorized backend
- **Owner Only**: Domain separator management requires owner privileges
- **Pausable**: All functions can be paused for emergency situations
- **Non-reentrant**: Protected against reentrancy attacks

## Core Functions

### Fiat Payment Processing

#### `distributeTokensFromFiat(uint256 _propertyId, address _user, uint256 _tokenAmount, uint256 _fiatAmount, string memory _paymentReference, uint256 _nonce, bytes memory _signature)`
**Purpose**: Distribute tokens based on fiat payment with backend signature verification
**Access**: External, when not paused, non-reentrant
**Parameters**:
- `_propertyId` (uint256): ID of the property
- `_user` (address): User's wallet address
- `_tokenAmount` (uint256): Number of tokens to distribute
- `_fiatAmount` (uint256): Fiat amount paid (in stablecoin units)
- `_paymentReference` (string): Unique payment reference
- `_nonce` (uint256): User's current nonce
- `_signature` (bytes): Backend EIP-712 signature

**Requirements**:
- Caller must be user or backend signer
- Payment reference must not be processed before
- Nonce must match user's current nonce
- Backend signature must be valid
- Property must exist and be active
- Sufficient tokens must be available

**State Changes**:
- Marks payment as processed
- Increments user nonce
- Distributes tokens to user
- Updates property token counts
- Records transaction

**Events Emitted**:
- `FiatPaymentProcessed`
- `TokensPurchased`
- `PropertyFullyFunded` (if property becomes fully funded)

```javascript
// Backend: Process fiat payment
const paymentData = {
    propertyId: 1,
    user: userAddress,
    tokenAmount: 100,
    fiatAmount: 10000, // 100 stablecoin units
    paymentReference: "PAY_12345",
    nonce: 0
};

const signature = await generateBackendSignature(paymentData);

await diamondContract.distributeTokensFromFiat(
    paymentData.propertyId,
    paymentData.user,
    paymentData.tokenAmount,
    paymentData.fiatAmount,
    paymentData.paymentReference,
    paymentData.nonce,
    signature
);
```

### EIP-712 Domain Management

#### `initializeDomainSeparator()`
**Purpose**: Initialize EIP-712 domain separator
**Access**: External, owner only
**Requirements**:
- Domain separator must not be initialized
- Chain ID must be valid

**State Changes**:
- Sets domain separator
- Marks domain as initialized

```javascript
// Backend: Initialize domain separator
await diamondContract.initializeDomainSeparator();
```

#### `getDomainSeparator()`
**Purpose**: Get current domain separator
**Access**: External view
**Returns**: `bytes32` - Current domain separator

```javascript
const domainSeparator = await diamondContract.getDomainSeparator();
```

#### `resetDomainSeparator()`
**Purpose**: Reset domain separator for security updates
**Access**: External, owner only
**Requirements**:
- Domain separator must be initialized

**State Changes**:
- Resets domain separator to zero
- Marks domain as not initialized

```javascript
// Backend: Reset domain separator
await diamondContract.resetDomainSeparator();
```

#### `isDomainSeparatorInitialized()`
**Purpose**: Check if domain separator is initialized
**Access**: External view
**Returns**: `bool` - True if initialized

```javascript
const isInitialized = await diamondContract.isDomainSeparatorInitialized();
```

### User Nonce Management

#### `getUserNonce(address _user)`
**Purpose**: Get current nonce for user
**Access**: External view
**Parameters**:
- `_user` (address): User's wallet address

**Returns**: `uint256` - Current nonce

```javascript
const nonce = await diamondContract.getUserNonce(userAddress);
```

### Payment Status

#### `isPaymentProcessed(string memory _paymentReference)`
**Purpose**: Check if payment reference has been processed
**Access**: External view
**Parameters**:
- `_paymentReference` (string): Payment reference to check

**Returns**: `bool` - True if processed

```javascript
const isProcessed = await diamondContract.isPaymentProcessed("PAY_12345");
```

### Chain Information

#### `getCurrentChainId()`
**Purpose**: Get current chain ID
**Access**: External view
**Returns**: `uint256` - Current chain ID

```javascript
const chainId = await diamondContract.getCurrentChainId();
```

## EIP-712 Signature Verification

### Signature Structure
The facet uses EIP-712 for secure signature verification:

```solidity
bytes32 public constant FIAT_PAYMENT_TYPEHASH =
    keccak256(
        "FiatPayment(address user,uint256 propertyId,uint256 tokenAmount,uint256 fiatAmount,string paymentReference,uint256 nonce)"
    );
```

### Signature Verification Process
1. **Create Struct Hash**: Hash the payment data structure
2. **Create Final Hash**: Combine with domain separator
3. **Recover Signer**: Extract signer address from signature
4. **Verify Authorization**: Check if signer is authorized backend

```javascript
// Backend: Generate signature
function generateBackendSignature(paymentData) {
    const domain = {
        name: 'Assetrix',
        version: '1',
        chainId: chainId,
        verifyingContract: diamondAddress
    };
    
    const types = {
        FiatPayment: [
            { name: 'user', type: 'address' },
            { name: 'propertyId', type: 'uint256' },
            { name: 'tokenAmount', type: 'uint256' },
            { name: 'fiatAmount', type: 'uint256' },
            { name: 'paymentReference', type: 'string' },
            { name: 'nonce', type: 'uint256' }
        ]
    };
    
    const signature = backendWallet._signTypedData(domain, types, paymentData);
    return signature;
}
```

## Events

### `FiatPaymentProcessed(uint256 indexed propertyId, address indexed user, uint256 tokenAmount, uint256 fiatAmount, string paymentReference, uint256 timestamp)`
Emitted when fiat payment is processed successfully.

### `PropertyFullyFunded(uint256 indexed propertyId, uint256 totalTokensSold)`
Emitted when property becomes fully funded.

### `TokensPurchased(uint256 indexed propertyId, address indexed tokenHolder, uint256 tokenAmount, uint256 totalCost)`
Emitted when tokens are purchased.

## Frontend Integration

### Real-Time Event Monitoring
```javascript
class FiatPaymentEventMonitor {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async monitorFiatPaymentEvents() {
        // Monitor fiat payment processing for UI updates
        this.diamond.on('FiatPaymentProcessed', (
            propertyId, user, tokenAmount, fiatAmount, paymentReference, timestamp
        ) => {
            console.log(`Fiat payment processed: ${paymentReference}`);
            this.updateUserBalance(user, tokenAmount);
            this.showPaymentConfirmation(paymentReference, tokenAmount, fiatAmount);
            this.updatePropertyFundingProgress(propertyId);
        });

        // Monitor property funding via fiat payments
        this.diamond.on('PropertyFullyFunded', (propertyId, totalTokensSold) => {
            console.log(`Property ${propertyId} fully funded via fiat payments`);
            this.updatePropertyStatus(propertyId, 'fully-funded');
            this.showMilestoneOptions(propertyId);
            this.showSuccessNotification('Property fully funded!');
        });

        // Monitor token purchases from fiat payments
        this.diamond.on('TokensPurchased', (propertyId, tokenHolder, tokenAmount, totalCost) => {
            console.log(`Tokens purchased via fiat: ${tokenAmount} for ${tokenHolder}`);
            this.updateUserInvestmentDisplay(tokenHolder, propertyId, tokenAmount, totalCost);
        });
    }

    updateUserBalance(user, tokenAmount) {
        // Update user's token balance display
        // Refresh investment portfolio
    }

    showPaymentConfirmation(paymentReference, tokenAmount, fiatAmount) {
        // Show payment confirmation notification
        // Update payment status in UI
    }

    updatePropertyFundingProgress(propertyId) {
        // Update property funding progress bar
        // Refresh property card
    }

    updatePropertyStatus(propertyId, status) {
        // Update property status display
        // Show/hide milestone options
    }

    showMilestoneOptions(propertyId) {
        // Show milestone management options
        // Enable developer features
    }

    showSuccessNotification(message) {
        // Show success notification to user
    }

    updateUserInvestmentDisplay(tokenHolder, propertyId, tokenAmount, totalCost) {
        // Update user's investment display
        // Refresh portfolio summary
    }
}
```

### Fiat Payment Interface
```javascript
class FiatPaymentManager {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async initiateFiatPayment(propertyId, tokenAmount, fiatAmount) {
        // Get user nonce
        const nonce = await this.diamond.getUserNonce(userAddress);
        
        // Generate payment reference
        const paymentReference = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Send payment data to backend for processing
        const paymentData = {
            propertyId,
            user: userAddress,
            tokenAmount,
            fiatAmount,
            paymentReference,
            nonce
        };

        // Backend will process payment and call distributeTokensFromFiat
        const response = await fetch('/api/fiat-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });

        return await response.json();
    }

    async checkPaymentStatus(paymentReference) {
        return await this.diamond.isPaymentProcessed(paymentReference);
    }

    async getUserNonce(userAddress) {
        return await this.diamond.getUserNonce(userAddress);
    }
}
```

### Payment Status Tracking
```javascript
class PaymentTracker {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async trackPayment(paymentReference) {
        // Poll payment status
        const checkStatus = async () => {
            const isProcessed = await this.diamond.isPaymentProcessed(paymentReference);
            
            if (isProcessed) {
                console.log('Payment processed successfully!');
                return true;
            }
            
            return false;
        };

        // Check every 5 seconds for up to 5 minutes
        for (let i = 0; i < 60; i++) {
            const processed = await checkStatus();
            if (processed) return true;
            
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        throw new Error('Payment processing timeout');
    }

    async getPaymentHistory(userAddress) {
        // Listen for FiatPaymentProcessed events
        const filter = this.diamond.filters.FiatPaymentProcessed(null, userAddress);
        const events = await this.diamond.queryFilter(filter);
        
        return events.map(event => ({
            propertyId: event.args.propertyId,
            tokenAmount: event.args.tokenAmount,
            fiatAmount: event.args.fiatAmount,
            paymentReference: event.args.paymentReference,
            timestamp: event.args.timestamp
        }));
    }
}
```

## Backend Integration

### Payment Processing Service
```javascript
class FiatPaymentProcessor {
    constructor(diamondContract, backendWallet, paymentGateway) {
        this.diamond = diamondContract;
        this.backendWallet = backendWallet;
        this.paymentGateway = paymentGateway;
    }

    async processFiatPayment(paymentData) {
        try {
            // 1. Verify payment with payment gateway
            const paymentVerified = await this.verifyPaymentWithGateway(
                paymentData.paymentReference,
                paymentData.fiatAmount
            );

            if (!paymentVerified) {
                throw new Error('Payment verification failed');
            }

            // 2. Check if payment already processed
            const isProcessed = await this.diamond.isPaymentProcessed(
                paymentData.paymentReference
            );

            if (isProcessed) {
                throw new Error('Payment already processed');
            }

            // 3. Verify user nonce
            const currentNonce = await this.diamond.getUserNonce(paymentData.user);
            if (currentNonce !== paymentData.nonce) {
                throw new Error('Invalid nonce');
            }

            // 4. Generate backend signature
            const signature = await this.generateBackendSignature(paymentData);

            // 5. Distribute tokens
            const tx = await this.diamond.distributeTokensFromFiat(
                paymentData.propertyId,
                paymentData.user,
                paymentData.tokenAmount,
                paymentData.fiatAmount,
                paymentData.paymentReference,
                paymentData.nonce,
                signature
            );

            const receipt = await tx.wait();
            return { success: true, transactionHash: receipt.transactionHash };

        } catch (error) {
            console.error('Payment processing failed:', error);
            return { success: false, error: error.message };
        }
    }

    async generateBackendSignature(paymentData) {
        const domain = {
            name: 'Assetrix',
            version: '1',
            chainId: await this.diamond.getCurrentChainId(),
            verifyingContract: this.diamond.address
        };
        
        const types = {
            FiatPayment: [
                { name: 'user', type: 'address' },
                { name: 'propertyId', type: 'uint256' },
                { name: 'tokenAmount', type: 'uint256' },
                { name: 'fiatAmount', type: 'uint256' },
                { name: 'paymentReference', type: 'string' },
                { name: 'nonce', type: 'uint256' }
            ]
        };
        
        return await this.backendWallet._signTypedData(domain, types, paymentData);
    }

    async verifyPaymentWithGateway(paymentReference, amount) {
        // Integrate with your payment gateway (Stripe, PayPal, etc.)
        return await this.paymentGateway.verifyPayment(paymentReference, amount);
    }
}
```

### Payment Monitoring
```javascript
class PaymentMonitor {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async monitorPaymentEvents() {
        // Monitor fiat payment processing
        this.diamond.on('FiatPaymentProcessed', (
            propertyId, user, tokenAmount, fiatAmount, paymentReference, timestamp
        ) => {
            console.log(`Fiat payment processed: ${paymentReference}`);
            this.handlePaymentProcessed(propertyId, user, tokenAmount, fiatAmount, paymentReference);
        });

        // Monitor property funding
        this.diamond.on('PropertyFullyFunded', (propertyId, totalTokensSold) => {
            console.log(`Property ${propertyId} fully funded via fiat payments`);
            this.handlePropertyFullyFunded(propertyId, totalTokensSold);
        });
    }

    async handlePaymentProcessed(propertyId, user, tokenAmount, fiatAmount, paymentReference) {
        // Update database
        // Send confirmation email
        // Update user dashboard
        // Log payment for accounting
    }

    async handlePropertyFullyFunded(propertyId, totalTokensSold) {
        // Notify developer
        // Update property status
        // Start milestone tracking
    }
}
```

### Domain Management
```javascript
class DomainManager {
    constructor(diamondContract, adminWallet) {
        this.diamond = diamondContract;
        this.adminWallet = adminWallet;
    }

    async initializeDomain() {
        const isInitialized = await this.diamond.isDomainSeparatorInitialized();
        
        if (!isInitialized) {
            const tx = await this.diamond.initializeDomainSeparator();
            await tx.wait();
            console.log('Domain separator initialized');
        } else {
            console.log('Domain separator already initialized');
        }
    }

    async resetDomain() {
        const tx = await this.diamond.resetDomainSeparator();
        await tx.wait();
        console.log('Domain separator reset');
    }

    async getDomainInfo() {
        const domainSeparator = await this.diamond.getDomainSeparator();
        const isInitialized = await this.diamond.isDomainSeparatorInitialized();
        const chainId = await this.diamond.getCurrentChainId();

        return {
            domainSeparator,
            isInitialized,
            chainId
        };
    }
}
```

## Security Considerations

1. **EIP-712 Signatures**: Cryptographic proof of backend authorization
2. **Nonce Protection**: Prevents replay attacks
3. **Payment Reference Uniqueness**: Prevents double processing
4. **Access Control**: Only user or backend signer can call functions
5. **Domain Separator**: Chain-specific signature verification

## Gas Requirements

- **View Functions**: No gas required
- **Token Distribution**: Moderate gas cost
- **Domain Management**: Low gas cost (owner only)

## Error Handling

Common error messages:
- `"Unauthorized caller"` - Caller is not user or backend signer
- `"Payment already processed"` - Payment reference already used
- `"Invalid nonce"` - Nonce mismatch
- `"Invalid backend signature"` - Signature verification failed
- `"Domain separator not initialized"` - EIP-712 not set up
- `"Property does not exist"` - Invalid property ID
- `"Not enough tokens left"` - Insufficient tokens available
