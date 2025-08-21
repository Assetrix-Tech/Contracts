# Assetrix Diamond Contract Documentation

## Overview

Assetrix is a comprehensive real estate investment platform built on Ethereum using the Diamond Pattern (EIP-2535). The platform enables fractional ownership of real estate properties through tokenization, with support for both stablecoin and fiat payments.

## Architecture

The Assetrix platform uses a **Diamond Pattern** architecture with multiple facets handling different aspects of the system:

```
┌─────────────────────────────────────────────────────────────┐
│                    Assetrix Diamond                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ AdminFacet  │ │InvestmentFacet│ │PropertyFacet│          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │FiatPaymentFacet│ │MilestoneFacet│ │TransactionFacet│          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Facet Documentation

### Core Facets

| Facet | Purpose | Key Features |
|-------|---------|--------------|
| **[AdminFacet](AdminFacet.md)** | Contract administration and configuration | Ownership management, fee settings, pause controls |
| **[InvestmentFacet](InvestmentFacet.md)** | Investment operations and token management | Token purchases, payouts, early exits, calculations |
| **[PropertyFacet](PropertyFacet.md)** | Property lifecycle management | Property creation, updates, retrieval, developer management |
| **[FiatPaymentFacet](FiatPaymentFacet.md)** | Fiat-to-token conversion | EIP-712 signatures, backend verification, payment processing |
| **[MilestoneFacet](MilestoneFacet.md)** | Development milestone tracking | Fund requests, completion tracking, admin verification |
| **[TransactionFacet](TransactionFacet.md)** | Transaction recording and history | Audit trail, transaction retrieval, analytics |

### Infrastructure Facets

| Facet | Purpose | Key Features |
|-------|---------|--------------|
| **Diamond** | Main diamond contract | Facet routing, fallback handling |
| **DiamondLoupeFacet** | Diamond introspection | Facet discovery, function mapping |
| **LibDiamond** | Diamond utilities | Facet management, storage access |

## Quick Start

### For Frontend Developers

1. **Connect to Contract**
```javascript
import { ethers } from 'ethers';
import AssetrixABI from './abis/Assetrix.json';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const diamondContract = new ethers.Contract(
    'DIAMOND_ADDRESS',
    AssetrixABI,
    provider
);
```

2. **User Operations**
```javascript
// Browse properties
const properties = await diamondContract.getProperties(0, 10);

// Purchase tokens directly
await diamondContract.purchaseTokens(propertyId, tokenAmount);

// View user investments
const investments = await diamondContract.getMyTokenProperties();

// Early exit from investment
await diamondContract.earlyExit(propertyId);

// View transaction history
const history = await diamondContract.getUserTransactionHistory(userAddress);
```

3. **Developer Operations**
```javascript
// Create new property
await diamondContract.createProperty(propertyData);

// Update property details
await diamondContract.updateProperty(propertyId, updateData);

// Deactivate property
await diamondContract.deactivateProperty(propertyId);

// Request milestone funds
await diamondContract.requestMilestoneFunds(propertyId, milestoneId);

// Mark milestone completed
await diamondContract.markMilestoneCompleted(propertyId, milestoneId);
```

4. **Check Documentation**
- See [InvestmentFacet](InvestmentFacet.md) for investment operations
- See [PropertyFacet](PropertyFacet.md) for property management
- See [MilestoneFacet](MilestoneFacet.md) for milestone operations
- See [TransactionFacet](TransactionFacet.md) for transaction history

### For Backend Developers

1. **Fiat Payment Processing**
```javascript
// Sign fiat payment data for token distribution
const signature = await signFiatPayment({
    propertyId, user, tokenAmount, fiatAmount, 
    paymentReference, nonce
});

// Distribute tokens after fiat payment verification
await diamondContract.distributeTokensFromFiat(
    propertyId, user, tokenAmount, fiatAmount, 
    paymentReference, nonce, signature
);
```

2. **Admin Operations**
```javascript
// Contract administration
await diamondContract.pause();
await diamondContract.setAdminFeePercentage(3);

// Investment payouts
await diamondContract.payoutInvestment(propertyId, user, amount);

// Emergency refunds
await diamondContract.emergencyRefund(propertyId, user);

// Milestone verification
await diamondContract.verifyAndMarkMilestoneCompleted(propertyId, milestoneId);
```

3. **Event Monitoring**
```javascript
// Monitor investment events
diamondContract.on('TokensPurchased', (propertyId, user, amount) => {
    console.log(`User ${user} purchased ${amount} tokens for property ${propertyId}`);
});

// Monitor property events
diamondContract.on('PropertyCreated', (propertyId, developer, title) => {
    console.log(`New property created: ${title} by ${developer}`);
});
```

4. **Check Documentation**
- See [AdminFacet](AdminFacet.md) for administrative functions
- See [FiatPaymentFacet](FiatPaymentFacet.md) for fiat payment processing
- See [MilestoneFacet](MilestoneFacet.md) for milestone verification

## Key Features

### 🔐 Security
- **Diamond Pattern**: Modular, upgradeable architecture
- **Access Control**: Role-based permissions (owner, developer, user)
- **Reentrancy Protection**: All state-changing functions protected
- **Pause Mechanism**: Emergency pause functionality
- **EIP-712 Signatures**: Secure fiat payment verification

### 💰 Payment Methods
- **Stablecoin Payments**: Direct on-chain token purchases
- **Fiat Payments**: Backend-verified fiat-to-token conversion
- **Gas Sponsorship**: ERC-2771 support for gasless transactions

### 🏗️ Property Management
- **Property Creation**: Developers can create property listings
- **Milestone Tracking**: Development progress with fund releases
- **Investment Periods**: Configurable funding windows
- **ROI Calculations**: Expected returns for investments

### 📊 Analytics & Reporting
- **Transaction History**: Complete audit trail
- **Investment Tracking**: User portfolio management
- **Property Analytics**: Funding progress and statistics
- **Milestone Monitoring**: Development progress tracking

## Contract Addresses

| Network | Diamond Address | Stablecoin Address |
|---------|----------------|-------------------|
| Ethereum Mainnet | `TBD` | `TBD` |
| Polygon | `TBD` | `TBD` |
| Testnet | `TBD` | `TBD` |

## Gas Requirements

| Operation | Gas Cost | Who Pays |
|-----------|----------|----------|
| View Functions | 0 | No one |
| Token Purchase | ~150,000 | User |
| Property Creation | ~500,000 | Developer |
| Milestone Operations | ~100,000 | Developer/Admin |
| Admin Functions | ~50,000 | Admin |

## Event Monitoring

### Frontend Event Monitoring
The frontend monitors **all events** for real-time UI updates:

#### Investment Events
- `TokensPurchased` - Update user dashboard, property funding progress
- `PropertyFullyFunded` - Update property status, show milestone options
- `PayoutAvailable` - Update user balance, show payout notifications
- `EarlyExitAvailable` - Update user balance, show exit notifications
- `RefundAvailable` - Update user balance, show refund notifications
- `EmergencyRefundAvailable` - Update user balance, show emergency notifications

#### Property Events
- `PropertyCreated` - Add new property to listings
- `PropertyUpdated` - Update property details in UI
- `PropertyDeactivated` - Remove property from active listings

#### Milestone Events
- `MilestoneCreated` - Add milestones to property view
- `MilestoneFundsRequested` - Update milestone status
- `MilestoneMarkedCompleted` - Update milestone completion status
- `MilestoneVerifiedAndReleased` - Update milestone fund release status

#### Admin Events
- `Paused` / `Unpaused` - Show/hide pause banner
- `GlobalTokenPriceUpdated` - Update token price displays
- `AdminFeePercentageUpdated` - Update fee calculations
- `EarlyExitFeePercentageUpdated` - Update exit fee displays
- `StablecoinUpdated` - Update stablecoin references
- `BackendSignerUpdated` - Update backend configuration (if needed)

#### Transaction Events
- `TransactionRecorded` - Update transaction history, show notifications

#### Fiat Payment Events
- `FiatPaymentProcessed` - Update user balance, show payment confirmation

### Backend Event Monitoring
The backend monitors **only events that require backend processing**:

- `PayoutAvailable` - Process bank transfer to user
- `RefundAvailable` - Process bank transfer to user
- `EmergencyRefundAvailable` - Process bank transfer to user
- `EarlyExitAvailable` - Process bank transfer to user
- `MilestoneFundsRequested` - Trigger admin verification workflow
- `MilestoneVerifiedAndReleased` - Process bank transfer to developer
- `StablecoinWithdrawn` - Update accounting records
- `BackendSignerUpdated` - Update backend configuration

**Note**: The backend does NOT need to monitor UI events like `TokensPurchased`, `PropertyCreated`, `PropertyFullyFunded`, etc. - these are handled directly by the frontend for real-time UI updates.

## Error Handling

### Common Error Messages
- `"Ownable: caller is not the owner"` - Requires admin privileges
- `"Property does not exist"` - Invalid property ID
- `"Not enough tokens left"` - Property fully funded
- `"Investment period has ended"` - Funding window closed
- `"Invalid backend signature"` - Fiat payment verification failed

### Error Recovery
- **Paused Contract**: Wait for admin to unpause
- **Insufficient Gas**: Increase gas limit
- **Invalid Parameters**: Check parameter values
- **Signature Errors**: Verify EIP-712 signature format

## Development Guidelines

### Frontend Development
1. **Handle all user interactions** directly with the contract
2. **Monitor all contract events** for real-time UI updates
3. **Implement proper error handling** for all contract calls
4. **Cache frequently accessed data** to reduce RPC calls
5. **Provide intuitive UI** for property browsing and investment management
6. **Handle gas estimation** for state-changing functions
7. **Implement wallet connection** and transaction signing
8. **Update UI immediately** when events are received
9. **Show notifications** for user-relevant events

### Backend Development
1. **Process fiat payments** and sign token distribution data
2. **Monitor only events that require backend processing** (payouts, refunds, milestone releases)
3. **Handle administrative functions** like payouts and emergency operations
4. **Maintain audit logs** of all operations and transactions
5. **Implement proper signature verification** for fiat payment processing
6. **Provide API endpoints** for frontend data aggregation
7. **Handle off-chain verification** for milestone completion
8. **Process bank transfers** when payout/refund events are received

### Security Best Practices
1. **Never expose private keys** in frontend code
2. **Validate all user inputs** before contract calls
3. **Implement proper access controls** for admin functions
4. **Monitor for suspicious activity** patterns
5. **Keep dependencies updated** and secure

## Testing

### Local Development
```bash
# Install dependencies
npm install

# Run tests
npm test

# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

### Test Networks
- **Sepolia**: Ethereum testnet
- **Mumbai**: Polygon testnet
- **Local**: Hardhat network

## Support

### Documentation
- **Facet Documentation**: See individual facet files above
- **API Reference**: Complete function documentation in each facet
- **Examples**: Code examples for common operations

### Community
- **GitHub**: [Assetrix Repository](https://github.com/assetrix)
- **Discord**: [Assetrix Community](https://discord.gg/assetrix)
- **Documentation**: [Assetrix Docs](https://docs.assetrix.com)

### Support Channels
- **Technical Issues**: GitHub Issues
- **General Questions**: Discord Community
- **Security Issues**: security@assetrix.com

## License

This documentation is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**Note**: This documentation is for the Assetrix diamond contract. For platform-specific documentation, see the main Assetrix documentation portal.
