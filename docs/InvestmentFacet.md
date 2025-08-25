# InvestmentFacet Documentation

## Overview
The InvestmentFacet handles all investment-related operations including token purchases, payouts, refunds, early exits, and investment calculations. This is the core facet for user interactions with property investments.

## Access Control
- **Public**: Most functions are publicly accessible
- **Owner Only**: Payout and refund functions require owner privileges
- **Pausable**: All functions can be paused for emergency situations
- **Non-reentrant**: Protected against reentrancy attacks

## Core Functions

### Token Purchase

#### `purchaseTokens(uint256 _propertyId, uint256 _tokenAmount)`
**Purpose**: Purchase tokens for a specific property using stablecoin
**Access**: External, when not paused, non-reentrant
**Parameters**:
- `_propertyId` (uint256): ID of the property to invest in
- `_tokenAmount` (uint256): Number of tokens to purchase

**Requirements**:
- Property must exist and be active
- Sufficient tokens must be available
- User must have approved stablecoin spending
- Must meet minimum investment requirements

**State Changes**:
- Transfers stablecoin from user to contract
- Credits tokens to user's balance
- Updates property token counts
- Records transaction

**Events Emitted**:
- `TokensPurchased`
- `PropertyFullyFunded` (if property becomes fully funded)

```javascript
// Frontend: User purchases tokens
const propertyId = 1;
const tokenAmount = 100;

// First approve stablecoin spending
await stablecoinContract.approve(diamondAddress, totalCost);

// Then purchase tokens
await diamondContract.purchaseTokens(propertyId, tokenAmount);
```

### Investment Payout

#### `payoutInvestment(uint256 _propertyId, address _tokenHolder, uint256 _amount)`
**Purpose**: Process investment payout for token holders
**Access**: External, owner only, when not paused, non-reentrant
**Parameters**:
- `_propertyId` (uint256): ID of the property
- `_tokenHolder` (address): Address of the token holder
- `_amount` (uint256): Payout amount in stablecoin units

**Requirements**:
- Property must be fully funded
- Investment period must have ended
- Payout must not exceed user's investment
- Payout must not have been processed before

**Events Emitted**:
- `PayoutAvailable`
- `PayoutSent`

```javascript
// Backend: Process payout for user
await diamondContract.payoutInvestment(
    propertyId,
    userAddress,
    payoutAmount
);
```

### Refund Operations

#### `refund(uint256 _propertyId, address _tokenHolder)`
**Purpose**: Refund investment to token holder
**Access**: External, owner only, when not paused, non-reentrant
**Parameters**:
- `_propertyId` (uint256): ID of the property
- `_tokenHolder` (address): Address of the token holder

**State Changes**:
- Removes user from token holders list
- Updates property token counts
- Records refund transaction

**Events Emitted**:
- `RefundAvailable`
- `Refunded`

```javascript
// Backend: Refund user investment
await diamondContract.refund(propertyId, userAddress);
```

#### `emergencyRefund(uint256 _propertyId, address _tokenHolder)`
**Purpose**: Emergency refund for token holder
**Access**: External, owner only, when not paused, non-reentrant
**Parameters**:
- `_propertyId` (uint256): ID of the property
- `_tokenHolder` (address): Address of the token holder

**Events Emitted**:
- `EmergencyRefundAvailable`
- `Refunded`

```javascript
// Backend: Emergency refund
await diamondContract.emergencyRefund(propertyId, userAddress);
```

### Early Exit

#### `earlyExit(uint256 _propertyId)`
**Purpose**: Allow users to exit investment early with fee
**Access**: External, when not paused, non-reentrant
**Parameters**:
- `_propertyId` (uint256): ID of the property

**Requirements**:
- User must have tokens in the property
- Investment period must not have ended
- No milestone funds can have been released (if fully funded)

**Fee Calculation**:
- Early exit fee = (investment amount × earlyExitFeePercentage) / 100
- Refund amount = investment amount - exit fee

**Events Emitted**:
- `EarlyExitAvailable`
- `Refunded`

```javascript
// Frontend: User exits investment early
await diamondContract.earlyExit(propertyId);
```

## View Functions

### Investment Status

#### `canAcceptTokenPurchases(uint256 _propertyId)`
**Purpose**: Check if property can accept new token purchases
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property

**Returns**: `bool` - True if property can accept purchases

```javascript
const canPurchase = await diamondContract.canAcceptTokenPurchases(propertyId);
```

#### `getTokenGap(uint256 _propertyId)`
**Purpose**: Get remaining tokens needed to fully fund property
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property

**Returns**: `uint256` - Number of tokens remaining

```javascript
const tokensLeft = await diamondContract.getTokenGap(propertyId);
```

#### `getTokenSalePercentage(uint256 _propertyId)`
**Purpose**: Get percentage of tokens sold for property
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property

**Returns**: `uint256` - Percentage (0-100)

```javascript
const salePercentage = await diamondContract.getTokenSalePercentage(propertyId);
```

### User Balances

#### `getTokenBalance(uint256 _propertyId, address _tokenHolder)`
**Purpose**: Get user's token balance for specific property
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property
- `_tokenHolder` (address): User's address

**Returns**: `uint256` - Token balance

```javascript
const balance = await diamondContract.getTokenBalance(propertyId, userAddress);
```

#### `getTokenValue(uint256 _propertyId, address _tokenHolder)`
**Purpose**: Get value of user's tokens in stablecoin
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property
- `_tokenHolder` (address): User's address

**Returns**: `uint256` - Value in stablecoin units

```javascript
const value = await diamondContract.getTokenValue(propertyId, userAddress);
```

### Investment Period

#### `getInvestmentEndTime(uint256 _propertyId)`
**Purpose**: Get investment period end time
**Access**: Public view
**Parameters**:
- `_propertyId` (uint256): ID of the property

**Returns**: `uint256` - End timestamp

```javascript
const endTime = await diamondContract.getInvestmentEndTime(propertyId);
```

#### `isInvestmentPeriodActive(uint256 _propertyId)`
**Purpose**: Check if investment period is still active
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property

**Returns**: `bool` - True if period is active

```javascript
const isActive = await diamondContract.isInvestmentPeriodActive(propertyId);
```

#### `getInvestmentPeriodRemaining(uint256 _propertyId)`
**Purpose**: Get remaining time in investment period
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property

**Returns**: `uint256` - Remaining seconds

```javascript
const remaining = await diamondContract.getInvestmentPeriodRemaining(propertyId);
```

### Calculations

#### `calculateTokensFromAmount(uint256 _amount)`
**Purpose**: Calculate tokens from stablecoin amount
**Access**: External view
**Parameters**:
- `_amount` (uint256): Amount in stablecoin units

**Returns**: `uint256` - Number of tokens

```javascript
const tokens = await diamondContract.calculateTokensFromAmount(amount);
```

#### `calculateAmountFromTokens(uint256 _tokens)`
**Purpose**: Calculate stablecoin amount from tokens
**Access**: External view
**Parameters**:
- `_tokens` (uint256): Number of tokens

**Returns**: `uint256` - Amount in stablecoin units

```javascript
const amount = await diamondContract.calculateAmountFromTokens(tokens);
```

#### `calculateExpectedROI(uint256 _propertyId, uint256 _investmentAmount)`
**Purpose**: Calculate expected ROI for investment
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property
- `_investmentAmount` (uint256): Investment amount

**Returns**: `uint256` - Expected ROI amount

```javascript
const expectedROI = await diamondContract.calculateExpectedROI(propertyId, amount);
```

#### `getExpectedROIPercentage(uint256 _propertyId)`
**Purpose**: Get expected ROI percentage for property
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property

**Returns**: `uint256` - ROI percentage

```javascript
const roiPercentage = await diamondContract.getExpectedROIPercentage(propertyId);
```

#### `getPropertyAmountToRaise(uint256 _propertyId)`
**Purpose**: Get total amount to raise for property
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property

**Returns**: `uint256` - Total amount in stablecoin units

```javascript
const totalAmount = await diamondContract.getPropertyAmountToRaise(propertyId);
```

### Payout Status

#### `isPayoutProcessed(uint256 _propertyId, address _tokenHolder)`
**Purpose**: Check if payout has been processed for user
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property
- `_tokenHolder` (address): User's address

**Returns**: `bool` - True if payout processed

```javascript
const isProcessed = await diamondContract.isPayoutProcessed(propertyId, userAddress);
```

## Events

### `TokensPurchased(uint256 indexed propertyId, address indexed tokenHolder, uint256 tokenAmount, uint256 totalCost)`
Emitted when tokens are purchased.

### `Refunded(uint256 indexed propertyId, address indexed investor, uint256 amount)`
Emitted when refund is processed.

### `PayoutSent(uint256 indexed propertyId, address indexed investor, uint256 amount)`
Emitted when payout is sent.

### `PropertyFullyFunded(uint256 indexed propertyId, uint256 totalTokensSold)`
Emitted when property becomes fully funded.

### `PayoutAvailable(uint256 indexed propertyId, address indexed investor, uint256 amount)`
Emitted when payout becomes available.

### `RefundAvailable(uint256 indexed propertyId, address indexed investor, uint256 amount)`
Emitted when refund becomes available.

### `EmergencyRefundAvailable(uint256 indexed propertyId, address indexed investor, uint256 amount)`
Emitted when emergency refund becomes available.

### `EarlyExitAvailable(uint256 indexed propertyId, address indexed investor, uint256 refundAmount, uint256 exitFee)`
Emitted when early exit is processed.

## Frontend Integration

### Data-Driven UI Updates
```javascript
class InvestmentDataManager {
    constructor(diamondContract) {
        this.diamond = diamondContract;
        this.cache = new Map();
        this.pollingIntervals = new Map();
    }

    // Get fresh investment data directly from contract
    async getInvestmentData(propertyId, userAddress) {
        const [
            tokensLeft,
            salePercentage,
            isActive,
            userBalance,
            userValue,
            canPurchase
        ] = await Promise.all([
            this.diamond.getTokenGap(propertyId),
            this.diamond.getTokenSalePercentage(propertyId),
            this.diamond.isInvestmentPeriodActive(propertyId),
            this.diamond.getTokenBalance(propertyId, userAddress),
            this.diamond.getTokenValue(propertyId, userAddress),
            this.diamond.canAcceptTokenPurchases(propertyId)
        ]);

        return {
            tokensLeft,
            salePercentage,
            isActive,
            userBalance,
            userValue,
            canPurchase,
            lastUpdated: Date.now()
        };
    }

    // Handle user actions with optimistic updates
    async handleTokenPurchase(propertyId, tokenAmount, userAddress) {
        // 1. Optimistic UI update
        this.updateUIOptimistically('purchase', { propertyId, tokenAmount });
        
        // 2. Execute transaction
        const tx = await this.diamond.purchaseTokens(propertyId, tokenAmount);
        
        // 3. Wait for confirmation
        const receipt = await tx.wait();
        
        // 4. Update with real data
        await this.refreshData(propertyId, userAddress);
        
        // 5. Show success notification
        this.showSuccessNotification('Tokens purchased successfully!');
        
        return receipt;
    }

    // Background polling for updates
    startBackgroundUpdates(propertyId, userAddress, callback) {
        const key = `${propertyId}-${userAddress}`;
        
        if (this.pollingIntervals.has(key)) {
            return; // Already polling
        }

        const poll = async () => {
            try {
                const data = await this.getInvestmentData(propertyId, userAddress);
                callback(data);
            } catch (error) {
                console.error('Background update failed:', error);
            }
        };

        // Initial call
        poll();
        
        // Set up interval (30 seconds)
        const interval = setInterval(poll, 30000);
        this.pollingIntervals.set(key, interval);
        
        // Return cleanup function
        return () => {
            clearInterval(interval);
            this.pollingIntervals.delete(key);
        };
    }

    // Transaction-based updates for immediate feedback
    async handleTransactionSuccess(txHash, propertyId, userAddress) {
        const receipt = await this.diamond.provider.waitForTransaction(txHash);
        
        // Parse events from receipt
        const events = this.parseEventsFromReceipt(receipt);
        
        // Update UI based on events
        for (const event of events) {
            switch (event.name) {
                case 'TokensPurchased':
                    await this.updateAfterTokenPurchase(event.args, userAddress);
                    break;
                case 'PropertyFullyFunded':
                    await this.updateAfterPropertyFunded(event.args);
                    break;
                case 'PayoutAvailable':
                    await this.updateAfterPayoutAvailable(event.args);
                    break;
            }
        }
        
        // Refresh data
        await this.refreshData(propertyId, userAddress);
    }

    async updateAfterTokenPurchase(args, userAddress) {
        const { propertyId, tokenHolder, tokenAmount, totalCost } = args;
        
        if (tokenHolder.toLowerCase() === userAddress.toLowerCase()) {
            // Update user's investment display
            await this.updateUserInvestmentDisplay(propertyId, userAddress);
            this.showSuccessNotification(`Purchased ${tokenAmount} tokens`);
        }
        
        // Update property funding progress
        await this.updatePropertyFundingProgress(propertyId);
    }

    async updateAfterPropertyFunded(args) {
        const { propertyId, totalTokensSold } = args;
        
        // Update property status
        await this.updatePropertyStatus(propertyId, 'fully-funded');
        this.showMilestoneOptions(propertyId);
        this.showSuccessNotification('Property fully funded!');
    }

    // Optimistic UI updates
    updateUIOptimistically(action, params) {
        switch (action) {
            case 'purchase':
                // Immediately update UI to show pending state
                this.showPendingState('Processing purchase...');
                break;
            case 'exit':
                this.showPendingState('Processing early exit...');
                break;
        }
    }

    // Helper methods
    async refreshData(propertyId, userAddress) {
        const data = await this.getInvestmentData(propertyId, userAddress);
        this.updateUI(data);
    }

    updateUI(data) {
        // Update all UI components with fresh data
        this.updatePropertyCard(data);
        this.updateUserBalance(data.userValue);
        this.updateProgressBars(data.salePercentage);
        this.updatePurchaseButton(data.canPurchase);
    }

    showSuccessNotification(message) {
        // Show success notification
        console.log('Success:', message);
    }

    showPendingState(message) {
        // Show pending state
        console.log('Pending:', message);
    }
}
```

### Investment Dashboard
```javascript
class InvestmentManager {
    constructor(diamondContract, stablecoinContract) {
        this.diamond = diamondContract;
        this.stablecoin = stablecoinContract;
    }

    async getInvestmentStatus(propertyId) {
        const [
            canPurchase,
            tokensLeft,
            salePercentage,
            endTime,
            isActive,
            remaining
        ] = await Promise.all([
            this.diamond.canAcceptTokenPurchases(propertyId),
            this.diamond.getTokenGap(propertyId),
            this.diamond.getTokenSalePercentage(propertyId),
            this.diamond.getInvestmentEndTime(propertyId),
            this.diamond.isInvestmentPeriodActive(propertyId),
            this.diamond.getInvestmentPeriodRemaining(propertyId)
        ]);

        return {
            canPurchase,
            tokensLeft,
            salePercentage,
            endTime,
            isActive,
            remaining
        };
    }

    async getUserInvestments(userAddress) {
        // Get user's token properties
        const properties = await this.diamond.getMyTokenProperties();
        
        const investments = await Promise.all(
            properties.map(async (property) => {
                const balance = await this.diamond.getTokenBalance(
                    property.propertyId,
                    userAddress
                );
                const value = await this.diamond.getTokenValue(
                    property.propertyId,
                    userAddress
                );
                
                return {
                    ...property,
                    tokenBalance: balance,
                    tokenValue: value
                };
            })
        );

        return investments;
    }

    async purchaseTokens(propertyId, tokenAmount) {
        // Calculate cost
        const tokenPrice = await this.diamond.getGlobalTokenPrice();
        const totalCost = tokenAmount * tokenPrice;

        // Approve stablecoin spending
        await this.stablecoin.approve(this.diamond.address, totalCost);

        // Purchase tokens
        const tx = await this.diamond.purchaseTokens(propertyId, tokenAmount);
        return await tx.wait();
    }

    async earlyExit(propertyId) {
        const tx = await this.diamond.earlyExit(propertyId);
        return await tx.wait();
    }
}
```

### Investment Calculator
```javascript
class InvestmentCalculator {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async calculateInvestment(propertyId, amount) {
        const tokens = await this.diamond.calculateTokensFromAmount(amount);
        const expectedROI = await this.diamond.calculateExpectedROI(propertyId, amount);
        const roiPercentage = await this.diamond.getExpectedROIPercentage(propertyId);

        return {
            tokens,
            expectedROI,
            roiPercentage,
            totalReturn: amount + expectedROI
        };
    }

    async calculateFromTokens(propertyId, tokens) {
        const amount = await this.diamond.calculateAmountFromTokens(tokens);
        const expectedROI = await this.diamond.calculateExpectedROI(propertyId, amount);

        return {
            amount,
            expectedROI,
            totalReturn: amount + expectedROI
        };
    }
}
```

## Backend Integration

### Critical Event Processing
```javascript
class InvestmentProcessor {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async monitorCriticalEvents() {
        // Monitor payouts that require backend processing
        this.diamond.on('PayoutAvailable', (propertyId, investor, amount) => {
            console.log(`Payout available: ${amount} for ${investor} in property ${propertyId}`);
            this.processPayout(propertyId, investor, amount);
        });

        // Monitor refunds that require backend processing
        this.diamond.on('RefundAvailable', (propertyId, investor, amount) => {
            console.log(`Refund available: ${amount} for ${investor} in property ${propertyId}`);
            this.processRefund(propertyId, investor, amount);
        });

        // Monitor emergency refunds that require backend processing
        this.diamond.on('EmergencyRefundAvailable', (propertyId, investor, amount) => {
            console.log(`Emergency refund available: ${amount} for ${investor} in property ${propertyId}`);
            this.processEmergencyRefund(propertyId, investor, amount);
        });

        // Monitor early exits that require backend processing
        this.diamond.on('EarlyExitAvailable', (propertyId, investor, refundAmount, exitFee) => {
            console.log(`Early exit: ${investor} exited property ${propertyId}`);
            this.processEarlyExit(propertyId, investor, refundAmount, exitFee);
        });
    }

    async processPayout(propertyId, investor, amount) {
        // Process bank transfer to user
        // Update accounting records
        // Send confirmation email
        // Update user balance in database
    }

    async processRefund(propertyId, investor, amount) {
        // Process bank transfer to user
        // Update accounting records
        // Send confirmation email
        // Update user balance in database
    }

    async processEmergencyRefund(propertyId, investor, amount) {
        // Process bank transfer to user
        // Update accounting records
        // Send confirmation email
        // Update user balance in database
    }

    async processEarlyExit(propertyId, investor, refundAmount, exitFee) {
        // Process bank transfer to user
        // Update accounting records
        // Send confirmation email
        // Update user balance in database
    }
}
```

### Admin Operations
```javascript
class InvestmentAdmin {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async processInvestmentPayout(propertyId, tokenHolder, amount) {
        // Admin function to process investment payouts
        const tx = await this.diamond.payoutInvestment(propertyId, tokenHolder, amount);
        return await tx.wait();
    }

    async processRefund(propertyId, tokenHolder) {
        // Admin function to process refunds
        const tx = await this.diamond.refund(propertyId, tokenHolder);
        return await tx.wait();
    }

    async processEmergencyRefund(propertyId, tokenHolder) {
        // Admin function for emergency refunds
        const tx = await this.diamond.emergencyRefund(propertyId, tokenHolder);
        return await tx.wait();
    }
}
```

### Investment Analytics
```javascript
class InvestmentAnalytics {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async getPropertyAnalytics(propertyId) {
        const [
            tokensLeft,
            salePercentage,
            totalAmount,
            endTime,
            isActive
        ] = await Promise.all([
            this.diamond.getTokenGap(propertyId),
            this.diamond.getTokenSalePercentage(propertyId),
            this.diamond.getPropertyAmountToRaise(propertyId),
            this.diamond.getInvestmentEndTime(propertyId),
            this.diamond.isInvestmentPeriodActive(propertyId)
        ]);

        return {
            tokensLeft,
            salePercentage,
            totalAmount,
            endTime,
            isActive,
            daysRemaining: Math.max(0, Math.floor((endTime - Date.now() / 1000) / 86400))
        };
    }

    async getUserInvestmentSummary(userAddress) {
        const properties = await this.diamond.getMyTokenProperties();
        
        let totalInvested = 0;
        let totalTokens = 0;
        let activeInvestments = 0;

        for (const property of properties) {
            const balance = await this.diamond.getTokenBalance(property.propertyId, userAddress);
            const value = await this.diamond.getTokenValue(property.propertyId, userAddress);
            
            if (balance > 0) {
                totalInvested += value;
                totalTokens += balance;
                activeInvestments++;
            }
        }

        return {
            totalInvested,
            totalTokens,
            activeInvestments,
            averageInvestment: activeInvestments > 0 ? totalInvested / activeInvestments : 0
        };
    }
}
```

## Security Considerations

1. **Reentrancy Protection**: All state-changing functions are non-reentrant
2. **Access Control**: Payout and refund functions require owner privileges
3. **Input Validation**: All parameters are validated before processing
4. **Overflow Protection**: Mathematical operations include overflow checks
5. **Pause Mechanism**: All functions can be paused for emergency situations

## Gas Requirements

- **View Functions**: No gas required
- **Token Purchase**: Moderate gas cost (includes stablecoin transfer)
- **Early Exit**: Low gas cost
- **Admin Functions**: Moderate gas cost (paid by owner)

## Error Handling

Common error messages:
- `"Property does not exist"` - Invalid property ID
- `"Property is not active"` - Property is inactive
- `"Not enough tokens left"` - Insufficient tokens available
- `"Below minimum tokens per investment"` - Investment too small
- `"Transfer failed"` - Stablecoin transfer failed
- `"Investment period has ended"` - Cannot exit after period ends
- `"Payout already processed"` - Payout already completed
