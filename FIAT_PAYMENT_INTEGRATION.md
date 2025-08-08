
# Fiat Payment Integration - Technical Implementation Guide

## Overview

The fiat payment integration enables users to purchase property tokens using Naira (₦) via Paystack, with automatic token distribution on the blockchain. This system bridges traditional fiat payments with blockchain tokenization while maintaining security and preventing fraud.

## Architecture

### Smart Contract Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Diamond.sol   │    │ InvestmentFacet │    │ AssetrixStorage │
│   (Proxy)       │◄──►│   (Fiat Logic)  │◄──►│   (Storage)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  AdminFacet     │    │ TransactionFacet│    │ PropertyFacet   │
│ (Backend Mgmt)  │    │ (Audit Trail)   │    │ (Property Data) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Storage Structure
```solidity
// AssetrixStorage.sol - Fiat Payment Variables
struct Layout {
    // Fiat payment variables
    address backendSigner;                    // Authorized backend wallet
    mapping(string => bool) processedFiatPayments; // paymentReference => processed
    mapping(address => uint256) userNonces;   // user => nonce for signature verification
}
```

## Core Functions

### 1. Main Distribution Function
```solidity
function distributeTokensFromFiat(
    uint256 _propertyId,
    address _user,
    uint256 _tokenAmount,
    uint256 _fiatAmount,
    string memory _paymentReference,
    uint256 _nonce,
    bytes memory _signature
) external whenNotPaused nonReentrant
```

**Parameters:**
- `_propertyId`: Target property ID
- `_user`: Recipient wallet address
- `_tokenAmount`: Number of tokens to distribute
- `_fiatAmount`: Fiat payment amount (in wei)
- `_paymentReference`: Unique payment identifier
- `_nonce`: User's current nonce value
- `_signature`: Backend cryptographic signature

### 2. Backend Signer Management
```solidity
function setBackendSigner(address _backendSigner) external onlyOwner
function getBackendSigner() external view returns (address)
```

### 3. Nonce Management
```solidity
function getUserNonce(address _user) external view returns (uint256)
```

### 4. Payment Tracking
```solidity
function isPaymentProcessed(string memory _paymentReference) external view returns (bool)
```

## Security Implementation

### 1. Multi-Layer Security Model

#### Layer 1: Backend Authorization
```solidity
require(layout.backendSigner != address(0), "Backend signer not set");
require(signer == layout.backendSigner, "Invalid backend signature");
```

#### Layer 2: Cryptographic Signature Verification (EIP-191)
```solidity
function verifyBackendSignature(
    address _user,
    uint256 _propertyId,
    uint256 _tokenAmount,
    uint256 _fiatAmount,
    string memory _paymentReference,
    uint256 _nonce,
    bytes memory _signature
) internal view returns (bool) {
    bytes32 messageHash = keccak256(
        abi.encodePacked(
            _user,
            _propertyId,
            _tokenAmount,
            _fiatAmount,
            _paymentReference,
            _nonce
        )
    );
    bytes32 ethSignedMessageHash = keccak256(
        abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
    );
    
    (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
    address signer = ecrecover(ethSignedMessageHash, v, r, s);
    
    return signer == layout.backendSigner;
}
```

#### Layer 3: Nonce Protection
```solidity
require(s.userNonces[_user] == _nonce, "Invalid nonce");
s.userNonces[_user]++; // Increment after successful payment
```

#### Layer 4: Payment Reference Tracking
```solidity
require(!s.processedFiatPayments[_paymentReference], "Payment already processed");
s.processedFiatPayments[_paymentReference] = true;
```

### 2. Input Validation
```solidity
// User validation
require(_user != address(0), "Invalid user address");
require(_tokenAmount > 0, "Token amount must be greater than 0");
require(_fiatAmount > 0, "Fiat amount must be greater than 0");
require(bytes(_paymentReference).length > 0, "Payment reference required");

// Property validation
require(_propertyId > 0 && _propertyId <= s.propertyCount, "Property does not exist");
require(prop.isActive, "Property is not active");
require(_tokenAmount <= prop.tokensLeft, "Not enough tokens left");

// Payment validation
require(_fiatAmount >= expectedCost, "Insufficient fiat amount for tokens");
```

## Backend Implementation

### 1. Environment Setup
```javascript
// .env
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
BACKEND_PRIVATE_KEY=0x...  // Backend wallet private key
DIAMOND_ADDRESS=0x...      // Deployed diamond address
RPC_URL=https://sepolia.infura.io/v3/...
```

### 2. Payment Processing Flow
```javascript
const { ethers } = require('ethers');
const Paystack = require('paystack-node');

class FiatPaymentProcessor {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        this.wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, this.provider);
        this.contract = new ethers.Contract(process.env.DIAMOND_ADDRESS, ABI, this.wallet);
        this.paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);
    }

    async processFiatPayment(paymentData) {
        try {
            // 1. Verify Paystack payment
            const verification = await this.paystack.transaction.verify(paymentData.reference);
            if (!verification.status) {
                throw new Error('Payment verification failed');
            }

            // 2. Get current user nonce
            const userNonce = await this.contract.getUserNonce(paymentData.userAddress);

            // 3. Calculate token amount
            const tokenAmount = this.calculateTokenAmount(paymentData.fiatAmount);

            // 4. Create signature
            const signature = await this.createSignature({
                user: paymentData.userAddress,
                propertyId: paymentData.propertyId,
                tokenAmount: tokenAmount,
                fiatAmount: paymentData.fiatAmount,
                paymentReference: paymentData.reference,
                nonce: userNonce
            });

            // 5. Distribute tokens
            const tx = await this.contract.distributeTokensFromFiat(
                paymentData.propertyId,
                paymentData.userAddress,
                tokenAmount,
                paymentData.fiatAmount,
                paymentData.reference,
                userNonce,
                signature
            );

            await tx.wait();
            return { success: true, txHash: tx.hash };

        } catch (error) {
            console.error('Payment processing failed:', error);
            throw error;
        }
    }

    async createSignature(data) {
        const messageHash = ethers.keccak256(
            ethers.solidityPacked(
                ["address", "uint256", "uint256", "uint256", "string", "uint256"],
                [data.user, data.propertyId, data.tokenAmount, data.fiatAmount, data.paymentReference, data.nonce]
            )
        );
        
        return await this.wallet.signMessage(ethers.getBytes(messageHash));
    }

    calculateTokenAmount(fiatAmount) {
        // Convert fiat amount to token amount based on current token price
        const tokenPrice = 1000; // 1000 USDT per token
        return Math.floor(fiatAmount / tokenPrice);
    }
}
```

### 3. API Endpoints
```javascript
// Express.js API endpoints
app.post('/api/create-payment', async (req, res) => {
    try {
        const { userAddress, propertyId, fiatAmount, userEmail } = req.body;
        
        // Create Paystack payment
        const payment = await paystack.transaction.initialize({
            amount: fiatAmount * 100, // Convert to kobo
            email: userEmail,
            reference: `PAY_${Date.now()}_${userAddress.slice(0, 8)}`,
            callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
            metadata: {
                userAddress,
                propertyId,
                fiatAmount
            }
        });

        res.json({
            success: true,
            paymentUrl: payment.data.authorization_url,
            reference: payment.data.reference
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/verify-payment', async (req, res) => {
    try {
        const { reference } = req.body;
        
        // Process fiat payment
        const processor = new FiatPaymentProcessor();
        const result = await processor.processFiatPayment({
            reference,
            userAddress: req.body.userAddress,
            propertyId: req.body.propertyId,
            fiatAmount: req.body.fiatAmount
        });

        res.json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## Frontend Integration

### 1. Payment Component
```javascript
import { ethers } from 'ethers';

const FiatPaymentButton = ({ propertyId, tokenAmount, fiatAmount, userAddress }) => {
    const handlePayment = async () => {
        try {
            // 1. Create payment request
            const response = await fetch('/api/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress,
                    propertyId,
                    fiatAmount,
                    userEmail: user.email
                })
            });

            const { paymentUrl, reference } = await response.json();

            // 2. Store payment reference for verification
            localStorage.setItem('pendingPayment', reference);

            // 3. Redirect to Paystack
            window.location.href = paymentUrl;

        } catch (error) {
            console.error('Payment initiation failed:', error);
        }
    };

    return (
        <button onClick={handlePayment}>
            Pay ₦{fiatAmount.toLocaleString()} for {tokenAmount} tokens
        </button>
    );
};
```

### 2. Payment Callback Handler
```javascript
const PaymentCallback = () => {
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const reference = urlParams.get('reference');
        const pendingPayment = localStorage.getItem('pendingPayment');

        if (reference && reference === pendingPayment) {
            verifyPayment(reference);
        }
    }, []);

    const verifyPayment = async (reference) => {
        try {
            const response = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reference,
                    userAddress: user.address,
                    propertyId: selectedProperty.id,
                    fiatAmount: selectedAmount
                })
            });

            const result = await response.json();

            if (result.success) {
                // Payment successful - update UI
                localStorage.removeItem('pendingPayment');
                showSuccessMessage('Tokens distributed successfully!');
            }

        } catch (error) {
            console.error('Payment verification failed:', error);
            showErrorMessage('Payment verification failed');
        }
    };

    return <div>Processing payment...</div>;
};
```

## Testing

### 1. Run Comprehensive Tests
```bash
# Run all fiat payment tests
npx hardhat test test/FiatPayment.test.js

# Expected output:
# 12 passing tests covering:
# - Backend signer management
# - User nonce management
# - Payment reference tracking
# - Signature verification
# - Token distribution
# - Error handling
```

### 2. Test Coverage
```javascript
// Test categories covered:
describe("Backend Signer Management", function () {
    // ✅ Authorization tests
});

describe("User Nonce Management", function () {
    // ✅ Replay attack prevention
});

describe("Payment Reference Tracking", function () {
    // ✅ Double-spending prevention
});

describe("Signature Verification", function () {
    // ✅ Cryptographic security
});

describe("Token Distribution", function () {
    // ✅ Business logic validation
});

describe("Error Handling", function () {
    // ✅ Input validation and edge cases
});
```

### 3. Manual Testing
```bash
# Run example implementation
npx hardhat run scripts/fiat-payment-example.js

# Expected output:
# ✅ Property created successfully
# ✅ Backend signer set correctly
# ✅ Fiat payment processed successfully
# ✅ 50 tokens distributed to user
# ✅ Payment reference prevents double-spending
```

## Deployment

### 1. Deploy to Testnet
```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Set backend signer
npx hardhat run scripts/set-backend-signer.js --network sepolia
```

### 2. Configuration
```javascript
// scripts/set-backend-signer.js
async function main() {
    const diamond = await ethers.getContractAt("Diamond", DIAMOND_ADDRESS);
    const investmentFacet = await ethers.getContractAt("InvestmentFacet", DIAMOND_ADDRESS);
    
    // Set backend signer
    await investmentFacet.setBackendSigner(BACKEND_WALLET_ADDRESS);
    console.log("Backend signer set successfully");
}
```

## Security Considerations

### 1. Backend Security
- **Private Key Management**: Store backend private key securely (hardware wallet recommended)
- **Rate Limiting**: Implement rate limiting on payment endpoints
- **Input Validation**: Validate all inputs on backend before processing
- **Error Handling**: Don't expose sensitive information in error messages

### 2. Smart Contract Security
- **Reentrancy Protection**: `nonReentrant` modifier prevents reentrancy attacks
- **Access Control**: Only owner can set backend signer
- **Input Validation**: Comprehensive validation of all parameters
- **Event Logging**: All critical operations emit events for audit

### 3. Frontend Security
- **Payment Verification**: Always verify payment status before token distribution
- **Reference Tracking**: Use unique payment references for each transaction
- **Error Handling**: Graceful handling of payment failures

## Event System

### 1. Fiat Payment Events
```solidity
event FiatPaymentProcessed(
    uint256 indexed propertyId,
    address indexed user,
    uint256 tokenAmount,
    uint256 fiatAmount,
    string paymentReference,
    uint256 timestamp
);

event BackendSignerUpdated(address indexed backendSigner);
```

### 2. Event Monitoring
```javascript
// Monitor fiat payment events
contract.on("FiatPaymentProcessed", (propertyId, user, tokenAmount, fiatAmount, paymentReference, timestamp) => {
    console.log(`Fiat payment processed: ${paymentReference}`);
    console.log(`User: ${user} received ${tokenAmount} tokens`);
    console.log(`Property: ${propertyId}, Amount: ${fiatAmount}`);
});
```

## Gas Optimization

### 1. Efficient Storage Access
- **Single Storage Layout**: All facets use same storage slot
- **Minimal Storage Writes**: Only essential state changes
- **Efficient Mappings**: Direct access to payment references and nonces

### 2. Function Optimization
- **Internal Functions**: `verifyBackendSignature` and `splitSignature` are internal
- **View Functions**: `getUserNonce` and `isPaymentProcessed` are view functions
- **Batch Operations**: Single transaction handles all state updates

## Troubleshooting

### Common Issues

#### 1. "Invalid backend signature" Error
```javascript
// Check: Backend signer is set correctly
const backendSigner = await contract.getBackendSigner();
console.log("Backend signer:", backendSigner);

// Check: Signature is created with correct data
const messageHash = ethers.keccak256(
    ethers.solidityPacked(
        ["address", "uint256", "uint256", "uint256", "string", "uint256"],
        [user, propertyId, tokenAmount, fiatAmount, paymentReference, nonce]
    )
);
```

#### 2. "Invalid nonce" Error
```javascript
// Check: Current nonce matches signature nonce
const currentNonce = await contract.getUserNonce(userAddress);
console.log("Current nonce:", currentNonce);

// Ensure: Nonce in signature matches current nonce
```

#### 3. "Payment already processed" Error
```javascript
// Check: Payment reference hasn't been used
const isProcessed = await contract.isPaymentProcessed(paymentReference);
console.log("Payment processed:", isProcessed);

// Ensure: Each payment has unique reference
```

## Support

For technical support:
1. Check test files for working examples
2. Review error messages in contract events
3. Verify backend configuration and signature creation
4. Ensure proper nonce management and payment reference uniqueness

## Version History

- **v1.0**: Initial implementation with basic fiat payment functionality
- **v1.1**: Added comprehensive security features and error handling
- **v1.2**: Enhanced testing coverage and documentation

