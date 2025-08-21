# TransactionFacet Documentation

## Overview
The TransactionFacet handles all transaction recording and retrieval for the Assetrix platform. It provides a comprehensive audit trail of all activities including investments, payouts, refunds, and milestone operations. This facet ensures transparency and enables detailed transaction history tracking.

## Access Control
- **Authorized Contracts**: Only the diamond contract itself can record transactions
- **Public**: View functions are publicly accessible
- **Pausable**: All functions can be paused for emergency situations
- **Non-reentrant**: Protected against reentrancy attacks

## Core Functions

### Transaction Recording

#### `recordTransaction(uint256 _propertyId, address _from, address _to, TransactionType _type, uint256 _amount, string memory _description)`
**Purpose**: Record a new transaction in the system
**Access**: External, only authorized contracts, when not paused
**Parameters**:
- `_propertyId` (uint256): ID of the property involved
- `_from` (address): Sender address
- `_to` (address): Recipient address
- `_type` (TransactionType): Type of transaction
- `_amount` (uint256): Transaction amount
- `_description` (string): Human-readable description

**TransactionType Enum**:
```solidity
enum TransactionType {
    Investment,              // Token purchase
    FinalPayout,            // Final investment payout
    Refund,                 // Investment refund
    EmergencyRefund,        // Emergency refund
    EarlyExitFee,           // Early exit fee
    MilestoneRelease,       // Milestone fund release
    PropertyCreation,       // Property creation
    PropertyUpdate,         // Property update
    PayoutAvailable,        // Payout made available
    RefundAvailable,        // Refund made available
    EmergencyRefundAvailable, // Emergency refund available
    EarlyExitAvailable      // Early exit available
}
```

**State Changes**:
- Increments transaction counter
- Stores transaction data
- Links transaction to users and property
- Records transaction hash and block number

**Events Emitted**: `TransactionRecorded`

```javascript
// This function is called internally by other facets
// Example: InvestmentFacet calls this when tokens are purchased
await diamondContract.recordTransaction(
    propertyId,
    userAddress,
    developerAddress,
    0, // Investment type
    amount,
    "Token purchase in property"
);
```

## View Functions

### Transaction Retrieval

#### `getUserTransactionHistory(address _user)`
**Purpose**: Get all transactions for a specific user
**Access**: External view
**Parameters**:
- `_user` (address): User's wallet address

**Returns**: `Transaction[]` - Array of transaction objects

**Transaction Structure**:
```solidity
struct Transaction {
    uint256 transactionId;
    uint256 propertyId;
    address from;
    address to;
    TransactionType transactionType;
    uint256 amount;
    uint256 timestamp;
    string description;
    bool isSuccessful;
    string metadata;
    uint256 blockNumber;
    bytes32 transactionHash;
}
```

```javascript
// Frontend: Get user's transaction history
const transactions = await diamondContract.getUserTransactionHistory(userAddress);

transactions.forEach(tx => {
    console.log(`Transaction ${tx.transactionId}:`, {
        type: getTransactionTypeName(tx.transactionType),
        amount: tx.amount,
        description: tx.description,
        timestamp: new Date(tx.timestamp * 1000)
    });
});
```

#### `getPropertyTransactionHistory(uint256 _propertyId)`
**Purpose**: Get all transactions for a specific property
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property

**Returns**: `Transaction[]` - Array of transaction objects

```javascript
// Frontend: Get property's transaction history
const transactions = await diamondContract.getPropertyTransactionHistory(propertyId);

console.log(`Property ${propertyId} has ${transactions.length} transactions`);
```

#### `getTransaction(uint256 _transactionId)`
**Purpose**: Get specific transaction by ID
**Access**: External view
**Parameters**:
- `_transactionId` (uint256): ID of the transaction

**Returns**: `Transaction` - Transaction object

```javascript
// Frontend: Get specific transaction
const transaction = await diamondContract.getTransaction(transactionId);

console.log('Transaction details:', {
    id: transaction.transactionId,
    propertyId: transaction.propertyId,
    from: transaction.from,
    to: transaction.to,
    type: getTransactionTypeName(transaction.transactionType),
    amount: transaction.amount,
    description: transaction.description,
    timestamp: new Date(transaction.timestamp * 1000)
});
```

#### `getTotalTransactions()`
**Purpose**: Get total number of transactions in the system
**Access**: External view
**Returns**: `uint256` - Total transaction count

```javascript
// Frontend: Get total transaction count
const totalTransactions = await diamondContract.getTotalTransactions();
console.log(`Total transactions: ${totalTransactions}`);
```

## Events

### `TransactionRecorded(uint256 indexed transactionId, uint256 indexed propertyId, address indexed from, address to, TransactionType transactionType, uint256 amount, string description)`
Emitted when a new transaction is recorded.

## Frontend Integration

### Real-Time Event Monitoring
```javascript
class TransactionEventMonitor {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async monitorTransactionEvents() {
        // Monitor transaction recordings for UI updates
        this.diamond.on('TransactionRecorded', (
            transactionId, propertyId, from, to, transactionType, amount, description
        ) => {
            console.log(`Transaction recorded: ${transactionId} - ${description}`);
            this.addTransactionToHistory(transactionId, propertyId, from, to, transactionType, amount, description);
            this.updateTransactionCount();
            this.showTransactionNotification(transactionType, amount, description);
        });
    }

    addTransactionToHistory(transactionId, propertyId, from, to, transactionType, amount, description) {
        // Add transaction to user's history
        // Update transaction list
        // Refresh transaction summary
    }

    updateTransactionCount() {
        // Update transaction count display
        // Refresh dashboard statistics
    }

    showTransactionNotification(transactionType, amount, description) {
        // Show notification based on transaction type
        switch (transactionType) {
            case 0: // Investment
                this.showInvestmentNotification(amount);
                break;
            case 1: // FinalPayout
                this.showPayoutNotification(amount);
                break;
            case 2: // Refund
            case 3: // EmergencyRefund
                this.showRefundNotification(amount);
                break;
            case 4: // EarlyExitFee
                this.showEarlyExitNotification(amount);
                break;
            case 5: // MilestoneRelease
                this.showMilestoneReleaseNotification(amount);
                break;
            default:
                this.showGenericTransactionNotification(description);
        }
    }

    showInvestmentNotification(amount) {
        // Show investment success notification
        // Update investment summary
    }

    showPayoutNotification(amount) {
        // Show payout notification
        // Update balance display
    }

    showRefundNotification(amount) {
        // Show refund notification
        // Update balance display
    }

    showEarlyExitNotification(amount) {
        // Show early exit notification
        // Update investment status
    }

    showMilestoneReleaseNotification(amount) {
        // Show milestone release notification
        // Update milestone status
    }

    showGenericTransactionNotification(description) {
        // Show generic transaction notification
    }
}
```

### Transaction History Dashboard
```javascript
class TransactionHistory {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async getUserTransactionHistory(userAddress) {
        const transactions = await this.diamond.getUserTransactionHistory(userAddress);
        
        return transactions.map(tx => ({
            ...tx,
            typeName: this.getTransactionTypeName(tx.transactionType),
            date: new Date(tx.timestamp * 1000),
            formattedAmount: this.formatAmount(tx.amount)
        }));
    }

    async getPropertyTransactionHistory(propertyId) {
        const transactions = await this.diamond.getPropertyTransactionHistory(propertyId);
        
        return transactions.map(tx => ({
            ...tx,
            typeName: this.getTransactionTypeName(tx.transactionType),
            date: new Date(tx.timestamp * 1000),
            formattedAmount: this.formatAmount(tx.amount)
        }));
    }

    async getTransactionSummary(userAddress) {
        const transactions = await this.getUserTransactionHistory(userAddress);
        
        const summary = {
            totalTransactions: transactions.length,
            totalInvested: 0,
            totalPayouts: 0,
            totalRefunds: 0,
            totalFees: 0,
            byType: {}
        };

        transactions.forEach(tx => {
            switch (tx.transactionType) {
                case 0: // Investment
                    summary.totalInvested += tx.amount;
                    break;
                case 1: // FinalPayout
                    summary.totalPayouts += tx.amount;
                    break;
                case 2: // Refund
                case 3: // EmergencyRefund
                    summary.totalRefunds += tx.amount;
                    break;
                case 4: // EarlyExitFee
                    summary.totalFees += tx.amount;
                    break;
            }

            // Count by type
            const typeName = this.getTransactionTypeName(tx.transactionType);
            summary.byType[typeName] = (summary.byType[typeName] || 0) + 1;
        });

        return summary;
    }

    getTransactionTypeName(type) {
        const types = [
            'Investment',
            'FinalPayout',
            'Refund',
            'EmergencyRefund',
            'EarlyExitFee',
            'MilestoneRelease',
            'PropertyCreation',
            'PropertyUpdate',
            'PayoutAvailable',
            'RefundAvailable',
            'EmergencyRefundAvailable',
            'EarlyExitAvailable'
        ];
        return types[type] || 'Unknown';
    }

    formatAmount(amount) {
        // Convert from wei to stablecoin units
        return (amount / 100).toFixed(2);
    }

    async getRecentTransactions(userAddress, limit = 10) {
        const transactions = await this.getUserTransactionHistory(userAddress);
        return transactions
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    async getTransactionsByType(userAddress, transactionType) {
        const transactions = await this.getUserTransactionHistory(userAddress);
        return transactions.filter(tx => tx.transactionType === transactionType);
    }

    async getTransactionsByProperty(userAddress, propertyId) {
        const transactions = await this.getUserTransactionHistory(userAddress);
        return transactions.filter(tx => tx.propertyId === propertyId);
    }
}
```

### Transaction Analytics
```javascript
class TransactionAnalytics {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async getPlatformTransactionStats() {
        const totalTransactions = await this.diamond.getTotalTransactions();
        
        // Get all properties
        const totalProperties = await this.diamond.getTotalProperties();
        const [propertyIds, count] = await this.diamond.getProperties(0, totalProperties);
        
        let totalInvestments = 0;
        let totalPayouts = 0;
        let totalRefunds = 0;
        let totalFees = 0;

        for (const propertyId of propertyIds) {
            const transactions = await this.diamond.getPropertyTransactionHistory(propertyId);
            
            transactions.forEach(tx => {
                switch (tx.transactionType) {
                    case 0: // Investment
                        totalInvestments += tx.amount;
                        break;
                    case 1: // FinalPayout
                        totalPayouts += tx.amount;
                        break;
                    case 2: // Refund
                    case 3: // EmergencyRefund
                        totalRefunds += tx.amount;
                        break;
                    case 4: // EarlyExitFee
                        totalFees += tx.amount;
                        break;
                }
            });
        }

        return {
            totalTransactions,
            totalProperties,
            totalInvestments,
            totalPayouts,
            totalRefunds,
            totalFees,
            averageTransactionValue: totalTransactions > 0 ? totalInvestments / totalTransactions : 0
        };
    }

    async getPropertyTransactionStats(propertyId) {
        const transactions = await this.diamond.getPropertyTransactionHistory(propertyId);
        
        const stats = {
            totalTransactions: transactions.length,
            totalInvestments: 0,
            totalPayouts: 0,
            totalRefunds: 0,
            totalFees: 0,
            uniqueInvestors: new Set(),
            transactionTypes: {}
        };

        transactions.forEach(tx => {
            switch (tx.transactionType) {
                case 0: // Investment
                    stats.totalInvestments += tx.amount;
                    stats.uniqueInvestors.add(tx.from);
                    break;
                case 1: // FinalPayout
                    stats.totalPayouts += tx.amount;
                    break;
                case 2: // Refund
                case 3: // EmergencyRefund
                    stats.totalRefunds += tx.amount;
                    break;
                case 4: // EarlyExitFee
                    stats.totalFees += tx.amount;
                    break;
            }

            const typeName = this.getTransactionTypeName(tx.transactionType);
            stats.transactionTypes[typeName] = (stats.transactionTypes[typeName] || 0) + 1;
        });

        stats.uniqueInvestors = stats.uniqueInvestors.size;

        return stats;
    }

    async getTransactionTimeline(userAddress, days = 30) {
        const transactions = await this.diamond.getUserTransactionHistory(userAddress);
        const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        const filteredTransactions = transactions.filter(tx => 
            tx.timestamp * 1000 >= cutoffDate
        );

        // Group by day
        const timeline = {};
        filteredTransactions.forEach(tx => {
            const date = new Date(tx.timestamp * 1000).toDateString();
            
            if (!timeline[date]) {
                timeline[date] = {
                    date,
                    transactions: [],
                    totalAmount: 0
                };
            }
            
            timeline[date].transactions.push(tx);
            timeline[date].totalAmount += tx.amount;
        });

        return Object.values(timeline).sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );
    }

    getTransactionTypeName(type) {
        const types = [
            'Investment',
            'FinalPayout',
            'Refund',
            'EmergencyRefund',
            'EarlyExitFee',
            'MilestoneRelease',
            'PropertyCreation',
            'PropertyUpdate',
            'PayoutAvailable',
            'RefundAvailable',
            'EmergencyRefundAvailable',
            'EarlyExitAvailable'
        ];
        return types[type] || 'Unknown';
    }
}
```

## Backend Integration

### Transaction Monitoring
```javascript
class TransactionMonitor {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async monitorTransactionEvents() {
        // Monitor all transaction recordings
        this.diamond.on('TransactionRecorded', (
            transactionId, propertyId, from, to, transactionType, amount, description
        ) => {
            console.log(`Transaction recorded: ${transactionId} - ${description}`);
            this.handleTransactionRecorded(
                transactionId, propertyId, from, to, transactionType, amount, description
            );
        });
    }

    async handleTransactionRecorded(transactionId, propertyId, from, to, transactionType, amount, description) {
        // Update database
        await this.updateTransactionDatabase(transactionId, propertyId, from, to, transactionType, amount, description);
        
        // Send notifications based on transaction type
        await this.sendTransactionNotifications(transactionType, from, to, amount, description);
        
        // Update analytics
        await this.updateAnalytics(transactionType, amount);
        
        // Check for suspicious activity
        await this.checkForSuspiciousActivity(from, to, amount, transactionType);
    }

    async updateTransactionDatabase(transactionId, propertyId, from, to, transactionType, amount, description) {
        // Store transaction in database
        const transaction = {
            transactionId,
            propertyId,
            from,
            to,
            transactionType,
            amount,
            description,
            timestamp: Date.now()
        };

        // Insert into database
        await this.db.transactions.insert(transaction);
    }

    async sendTransactionNotifications(transactionType, from, to, amount, description) {
        switch (transactionType) {
            case 0: // Investment
                await this.sendInvestmentNotification(from, amount);
                break;
            case 1: // FinalPayout
                await this.sendPayoutNotification(to, amount);
                break;
            case 2: // Refund
            case 3: // EmergencyRefund
                await this.sendRefundNotification(to, amount);
                break;
            case 4: // EarlyExitFee
                await this.sendEarlyExitNotification(from, amount);
                break;
        }
    }

    async updateAnalytics(transactionType, amount) {
        // Update real-time analytics
        await this.analytics.updateTransactionStats(transactionType, amount);
    }

    async checkForSuspiciousActivity(from, to, amount, transactionType) {
        // Implement fraud detection logic
        const suspiciousPatterns = await this.detectSuspiciousPatterns(from, to, amount, transactionType);
        
        if (suspiciousPatterns.length > 0) {
            await this.flagSuspiciousActivity(from, to, amount, suspiciousPatterns);
        }
    }
}
```

### Transaction Reporting
```javascript
class TransactionReporting {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async generateTransactionReport(startDate, endDate) {
        const totalTransactions = await this.diamond.getTotalTransactions();
        
        // Get all transactions within date range
        const transactions = [];
        for (let i = 1; i <= totalTransactions; i++) {
            try {
                const tx = await this.diamond.getTransaction(i);
                const txDate = new Date(tx.timestamp * 1000);
                
                if (txDate >= startDate && txDate <= endDate) {
                    transactions.push(tx);
                }
            } catch (error) {
                // Transaction doesn't exist, continue
                continue;
            }
        }

        // Generate report
        const report = {
            period: { startDate, endDate },
            totalTransactions: transactions.length,
            totalVolume: 0,
            byType: {},
            byProperty: {},
            topUsers: {},
            dailyBreakdown: {}
        };

        transactions.forEach(tx => {
            // Total volume
            report.totalVolume += tx.amount;

            // By type
            const typeName = this.getTransactionTypeName(tx.transactionType);
            if (!report.byType[typeName]) {
                report.byType[typeName] = { count: 0, volume: 0 };
            }
            report.byType[typeName].count++;
            report.byType[typeName].volume += tx.amount;

            // By property
            if (!report.byProperty[tx.propertyId]) {
                report.byProperty[tx.propertyId] = { count: 0, volume: 0 };
            }
            report.byProperty[tx.propertyId].count++;
            report.byProperty[tx.propertyId].volume += tx.amount;

            // Top users
            if (!report.topUsers[tx.from]) {
                report.topUsers[tx.from] = { count: 0, volume: 0 };
            }
            report.topUsers[tx.from].count++;
            report.topUsers[tx.from].volume += tx.amount;

            // Daily breakdown
            const date = new Date(tx.timestamp * 1000).toDateString();
            if (!report.dailyBreakdown[date]) {
                report.dailyBreakdown[date] = { count: 0, volume: 0 };
            }
            report.dailyBreakdown[date].count++;
            report.dailyBreakdown[date].volume += tx.amount;
        });

        return report;
    }

    async generateUserTransactionReport(userAddress) {
        const transactions = await this.diamond.getUserTransactionHistory(userAddress);
        
        const report = {
            userAddress,
            totalTransactions: transactions.length,
            totalInvested: 0,
            totalPayouts: 0,
            totalRefunds: 0,
            totalFees: 0,
            byProperty: {},
            timeline: []
        };

        transactions.forEach(tx => {
            switch (tx.transactionType) {
                case 0: // Investment
                    report.totalInvested += tx.amount;
                    break;
                case 1: // FinalPayout
                    report.totalPayouts += tx.amount;
                    break;
                case 2: // Refund
                case 3: // EmergencyRefund
                    report.totalRefunds += tx.amount;
                    break;
                case 4: // EarlyExitFee
                    report.totalFees += tx.amount;
                    break;
            }

            // By property
            if (!report.byProperty[tx.propertyId]) {
                report.byProperty[tx.propertyId] = { count: 0, volume: 0 };
            }
            report.byProperty[tx.propertyId].count++;
            report.byProperty[tx.propertyId].volume += tx.amount;

            // Timeline
            report.timeline.push({
                transactionId: tx.transactionId,
                type: this.getTransactionTypeName(tx.transactionType),
                amount: tx.amount,
                description: tx.description,
                timestamp: new Date(tx.timestamp * 1000)
            });
        });

        // Sort timeline by timestamp
        report.timeline.sort((a, b) => a.timestamp - b.timestamp);

        return report;
    }

    getTransactionTypeName(type) {
        const types = [
            'Investment',
            'FinalPayout',
            'Refund',
            'EmergencyRefund',
            'EarlyExitFee',
            'MilestoneRelease',
            'PropertyCreation',
            'PropertyUpdate',
            'PayoutAvailable',
            'RefundAvailable',
            'EmergencyRefundAvailable',
            'EarlyExitAvailable'
        ];
        return types[type] || 'Unknown';
    }
}
```

## Security Considerations

1. **Access Control**: Only authorized contracts can record transactions
2. **Immutable Records**: Once recorded, transactions cannot be modified
3. **Comprehensive Tracking**: All activities are logged for audit purposes
4. **Data Integrity**: Transaction data includes block numbers and hashes
5. **Privacy**: Transaction data is publicly accessible but can be filtered

## Gas Requirements

- **View Functions**: No gas required
- **Transaction Recording**: Low gas cost (called internally by other facets)

## Error Handling

Common error messages:
- `"Only authorized contracts can record transactions"` - Unauthorized caller
- `"Transaction does not exist"` - Invalid transaction ID
- `"Property does not exist"` - Invalid property ID
