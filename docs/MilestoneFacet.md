# MilestoneFacet Documentation

## Overview
The MilestoneFacet manages the milestone system for property development projects. It handles milestone creation, fund requests, completion tracking, and fund releases with admin verification. This facet ensures transparent and controlled fund distribution during property development.

## Access Control
- **Developer**: Can request funds and mark milestones as completed
- **Owner/Admin**: Can verify and release funds for milestones
- **Public**: View functions are publicly accessible
- **Pausable**: All functions can be paused for emergency situations
- **Non-reentrant**: Protected against reentrancy attacks

## Core Functions

### Milestone Fund Management

#### `requestMilestoneFunds(uint256 _propertyId, uint256 _milestoneId)`
**Purpose**: Request funds for a specific milestone
**Access**: External, when not paused, non-reentrant
**Parameters**:
- `_propertyId` (uint256): ID of the property
- `_milestoneId` (uint256): ID of the milestone

**Requirements**:
- Property must be fully funded
- Caller must be property developer
- Milestone must exist
- Funds must not be requested or released before
- Milestone must not be completed
- Previous milestone must be completed (if not first milestone)

**State Changes**:
- Marks milestone as funds requested
- Sets requested timestamp

**Events Emitted**: `MilestoneFundsRequested`

```javascript
// Frontend: Developer requests milestone funds
await diamondContract.requestMilestoneFunds(propertyId, milestoneId);
```

#### `markMilestoneCompleted(uint256 _propertyId, uint256 _milestoneId)`
**Purpose**: Mark milestone as completed by developer
**Access**: External, when not paused, non-reentrant
**Parameters**:
- `_propertyId` (uint256): ID of the property
- `_milestoneId` (uint256): ID of the milestone

**Requirements**:
- Property must be fully funded
- Caller must be property developer
- Milestone must exist
- Funds must not be released
- Milestone must not be completed

**State Changes**:
- Marks milestone as completed
- Sets completion timestamp

**Events Emitted**: `MilestoneMarkedCompleted`

```javascript
// Frontend: Developer marks milestone as completed
await diamondContract.markMilestoneCompleted(propertyId, milestoneId);
```

#### `verifyAndMarkMilestoneCompleted(uint256 _propertyId, uint256 _milestoneId)`
**Purpose**: Verify and release funds for milestone (admin only)
**Access**: External, owner only, when not paused, non-reentrant
**Parameters**:
- `_propertyId` (uint256): ID of the property
- `_milestoneId` (uint256): ID of the milestone

**Requirements**:
- Property must be fully funded
- Milestone must exist
- Developer must have marked milestone as completed
- Funds must not be released

**State Changes**:
- Marks milestone as completed
- Releases funds to developer
- Updates released funds tracking
- Records transaction

**Events Emitted**:
- `MilestoneMarkedCompleted`
- `MilestoneVerifiedAndReleased`

```javascript
// Backend: Admin verifies and releases milestone funds
await diamondContract.verifyAndMarkMilestoneCompleted(propertyId, milestoneId);
```

## View Functions

### Milestone Data

#### `getPropertyMilestones(uint256 _propertyId)`
**Purpose**: Get all milestones for a property
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property

**Returns**: `Milestone[]` - Array of milestone objects

**Milestone Structure**:
```solidity
struct Milestone {
    uint256 id;
    string title;
    string description;
    uint256 percentage;
    bool fundsRequested;
    bool fundsReleased;
    bool isCompleted;
    uint256 completedAt;
    uint256 requestedAt;
    uint256 releasedAt;
}
```

```javascript
// Frontend: Get property milestones
const milestones = await diamondContract.getPropertyMilestones(propertyId);
console.log(`Property has ${milestones.length} milestones`);
```

#### `getMilestoneStatus(uint256 _propertyId, uint256 _milestoneId)`
**Purpose**: Get detailed status of a specific milestone
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property
- `_milestoneId` (uint256): ID of the milestone

**Returns**: Tuple containing:
- `fundsRequested` (bool): Whether funds have been requested
- `fundsReleased` (bool): Whether funds have been released
- `isCompleted` (bool): Whether milestone is completed
- `requestedAt` (uint256): Timestamp when funds were requested
- `releasedAt` (uint256): Timestamp when funds were released
- `completedAt` (uint256): Timestamp when milestone was completed

```javascript
// Frontend: Get milestone status
const [
    fundsRequested,
    fundsReleased,
    isCompleted,
    requestedAt,
    releasedAt,
    completedAt
] = await diamondContract.getMilestoneStatus(propertyId, milestoneId);

console.log(`Milestone ${milestoneId}:`, {
    fundsRequested,
    fundsReleased,
    isCompleted,
    requestedAt: new Date(requestedAt * 1000),
    releasedAt: new Date(releasedAt * 1000),
    completedAt: new Date(completedAt * 1000)
});
```

### Milestone Dashboard

#### `getMilestoneDashboard(uint256 _propertyId)`
**Purpose**: Get comprehensive milestone dashboard data
**Access**: External view
**Parameters**:
- `_propertyId` (uint256): ID of the property

**Returns**: Tuple containing:
- `nextRequestable` (uint256): ID of next milestone that can request funds
- `readyForVerification` (uint256[]): Array of milestone IDs ready for admin verification
- `readyForCompletion` (uint256[]): Array of milestone IDs ready for developer completion

```javascript
// Frontend: Get milestone dashboard
const [nextRequestable, readyForVerification, readyForCompletion] = 
    await diamondContract.getMilestoneDashboard(propertyId);

console.log('Milestone Dashboard:', {
    nextRequestable: nextRequestable === 2**256 - 1 ? 'None' : nextRequestable,
    readyForVerification,
    readyForCompletion
});
```

## Events

### `MilestoneCreated(uint256 indexed propertyId, uint256 milestoneId, string title, uint256 percentage)`
Emitted when a milestone is created (during property creation).

### `MilestoneFundsRequested(uint256 indexed propertyId, uint256 milestoneId, address indexed developer)`
Emitted when developer requests funds for a milestone.

### `MilestoneFundsReleased(uint256 indexed propertyId, uint256 milestoneId, uint256 amount, address indexed developer)`
Emitted when funds are released for a milestone.

### `MilestoneMarkedCompleted(uint256 indexed propertyId, uint256 milestoneId)`
Emitted when milestone is marked as completed.

### `MilestoneFundsAvailable(uint256 indexed propertyId, uint256 indexed milestoneId, address indexed developer, uint256 amount)`
Emitted when funds become available for milestone.

### `MilestoneVerifiedAndReleased(uint256 indexed propertyId, uint256 indexed milestoneId, uint256 amount, address indexed developer, address verifiedBy)`
Emitted when admin verifies and releases milestone funds.

## Frontend Integration

### Real-Time Event Monitoring
```javascript
class MilestoneEventMonitor {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async monitorMilestoneEvents() {
        // Monitor milestone creation for UI updates
        this.diamond.on('MilestoneCreated', (propertyId, milestoneId, title, percentage) => {
            console.log(`Milestone created: ${title} for property ${propertyId}`);
            this.addMilestoneToProperty(propertyId, milestoneId, title, percentage);
            this.updateMilestoneCount(propertyId);
        });

        // Monitor fund requests for UI updates
        this.diamond.on('MilestoneFundsRequested', (propertyId, milestoneId, developer) => {
            console.log(`Funds requested for milestone ${milestoneId} in property ${propertyId}`);
            this.updateMilestoneStatus(propertyId, milestoneId, 'funds-requested');
            this.showFundRequestNotification(propertyId, milestoneId);
        });

        // Monitor milestone completion for UI updates
        this.diamond.on('MilestoneMarkedCompleted', (propertyId, milestoneId) => {
            console.log(`Milestone ${milestoneId} marked completed in property ${propertyId}`);
            this.updateMilestoneStatus(propertyId, milestoneId, 'completed');
            this.showCompletionNotification(propertyId, milestoneId);
            this.updateProgressBar(propertyId);
        });

        // Monitor fund releases for UI updates
        this.diamond.on('MilestoneVerifiedAndReleased', (
            propertyId, milestoneId, amount, developer, verifiedBy
        ) => {
            console.log(`Funds released for milestone ${milestoneId} in property ${propertyId}`);
            this.updateMilestoneStatus(propertyId, milestoneId, 'funds-released');
            this.showFundReleaseNotification(propertyId, milestoneId, amount);
            this.updateReleasedFundsDisplay(propertyId, amount);
        });

        // Monitor fund availability for UI updates
        this.diamond.on('MilestoneFundsAvailable', (propertyId, milestoneId, developer, amount) => {
            console.log(`Funds available for milestone ${milestoneId} in property ${propertyId}`);
            this.updateMilestoneStatus(propertyId, milestoneId, 'funds-available');
            this.showFundsAvailableNotification(propertyId, milestoneId, amount);
        });
    }

    addMilestoneToProperty(propertyId, milestoneId, title, percentage) {
        // Add milestone to property view
        // Update milestone list
    }

    updateMilestoneCount(propertyId) {
        // Update milestone count display
        // Refresh milestone dashboard
    }

    updateMilestoneStatus(propertyId, milestoneId, status) {
        // Update milestone status in UI
        // Change milestone card appearance
    }

    showFundRequestNotification(propertyId, milestoneId) {
        // Show notification about fund request
        // Update developer dashboard
    }

    showCompletionNotification(propertyId, milestoneId) {
        // Show completion notification
        // Update progress indicators
    }

    updateProgressBar(propertyId) {
        // Update overall project progress
        // Refresh progress visualization
    }

    showFundReleaseNotification(propertyId, milestoneId, amount) {
        // Show fund release notification
        // Update financial displays
    }

    updateReleasedFundsDisplay(propertyId, amount) {
        // Update released funds counter
        // Refresh financial summary
    }

    showFundsAvailableNotification(propertyId, milestoneId, amount) {
        // Show funds available notification
        // Update milestone options
    }
}
```

### Milestone Management Dashboard
```javascript
class MilestoneManager {
    constructor(diamondContract, developerWallet) {
        this.diamond = diamondContract;
        this.wallet = developerWallet;
    }

    async getMilestoneOverview(propertyId) {
        const milestones = await this.diamond.getPropertyMilestones(propertyId);
        const [nextRequestable, readyForVerification, readyForCompletion] = 
            await this.diamond.getMilestoneDashboard(propertyId);

        return {
            milestones,
            nextRequestable: nextRequestable === 2**256 - 1 ? null : nextRequestable,
            readyForVerification,
            readyForCompletion
        };
    }

    async getMilestoneDetails(propertyId, milestoneId) {
        const milestones = await this.diamond.getPropertyMilestones(propertyId);
        const milestone = milestones[milestoneId];
        
        const [
            fundsRequested,
            fundsReleased,
            isCompleted,
            requestedAt,
            releasedAt,
            completedAt
        ] = await this.diamond.getMilestoneStatus(propertyId, milestoneId);

        return {
            ...milestone,
            fundsRequested,
            fundsReleased,
            isCompleted,
            requestedAt: requestedAt > 0 ? new Date(requestedAt * 1000) : null,
            releasedAt: releasedAt > 0 ? new Date(releasedAt * 1000) : null,
            completedAt: completedAt > 0 ? new Date(completedAt * 1000) : null
        };
    }

    async requestMilestoneFunds(propertyId, milestoneId) {
        const tx = await this.diamond.requestMilestoneFunds(propertyId, milestoneId);
        return await tx.wait();
    }

    async markMilestoneCompleted(propertyId, milestoneId) {
        const tx = await this.diamond.markMilestoneCompleted(propertyId, milestoneId);
        return await tx.wait();
    }

    async getMilestoneProgress(propertyId) {
        const milestones = await this.diamond.getPropertyMilestones(propertyId);
        
        let totalCompleted = 0;
        let totalFundsReleased = 0;
        let totalPercentage = 0;

        for (const milestone of milestones) {
            const [
                fundsRequested,
                fundsReleased,
                isCompleted
            ] = await this.diamond.getMilestoneStatus(propertyId, milestone.id);

            if (isCompleted) {
                totalCompleted++;
                totalPercentage += milestone.percentage;
            }

            if (fundsReleased) {
                totalFundsReleased += milestone.percentage;
            }
        }

        return {
            totalMilestones: milestones.length,
            completedMilestones: totalCompleted,
            completionPercentage: totalPercentage,
            fundsReleasedPercentage: totalFundsReleased,
            remainingPercentage: 100 - totalPercentage
        };
    }
}
```

### Developer Milestone Interface
```javascript
class DeveloperMilestoneInterface {
    constructor(diamondContract, developerWallet) {
        this.diamond = diamondContract;
        this.wallet = developerWallet;
    }

    async getMyMilestones() {
        // Get developer's properties
        const properties = await this.diamond.getMyProperties();
        
        const milestoneData = await Promise.all(
            properties.map(async (property) => {
                const milestones = await this.diamond.getPropertyMilestones(property.propertyId);
                const [nextRequestable, readyForVerification, readyForCompletion] = 
                    await this.diamond.getMilestoneDashboard(property.propertyId);

                return {
                    property,
                    milestones,
                    nextRequestable,
                    readyForVerification,
                    readyForCompletion
                };
            })
        );

        return milestoneData;
    }

    async canRequestFunds(propertyId, milestoneId) {
        const [nextRequestable, readyForVerification, readyForCompletion] = 
            await this.diamond.getMilestoneDashboard(propertyId);

        return nextRequestable === milestoneId;
    }

    async canMarkCompleted(propertyId, milestoneId) {
        const [nextRequestable, readyForVerification, readyForCompletion] = 
            await this.diamond.getMilestoneDashboard(propertyId);

        return readyForCompletion.includes(milestoneId);
    }

    async getMilestoneTimeline(propertyId) {
        const milestones = await this.diamond.getPropertyMilestones(propertyId);
        
        const timeline = await Promise.all(
            milestones.map(async (milestone) => {
                const [
                    fundsRequested,
                    fundsReleased,
                    isCompleted,
                    requestedAt,
                    releasedAt,
                    completedAt
                ] = await this.diamond.getMilestoneStatus(propertyId, milestone.id);

                return {
                    ...milestone,
                    fundsRequested,
                    fundsReleased,
                    isCompleted,
                    requestedAt: requestedAt > 0 ? new Date(requestedAt * 1000) : null,
                    releasedAt: releasedAt > 0 ? new Date(releasedAt * 1000) : null,
                    completedAt: completedAt > 0 ? new Date(completedAt * 1000) : null
                };
            })
        );

        return timeline.sort((a, b) => a.id - b.id);
    }
}
```

## Backend Integration

### Milestone Monitoring
```javascript
class MilestoneMonitor {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async monitorMilestoneEvents() {
        // Monitor fund requests
        this.diamond.on('MilestoneFundsRequested', (propertyId, milestoneId, developer) => {
            console.log(`Funds requested for milestone ${milestoneId} in property ${propertyId}`);
            this.handleFundRequest(propertyId, milestoneId, developer);
        });

        // Monitor milestone completion
        this.diamond.on('MilestoneMarkedCompleted', (propertyId, milestoneId) => {
            console.log(`Milestone ${milestoneId} marked completed in property ${propertyId}`);
            this.handleMilestoneCompleted(propertyId, milestoneId);
        });

        // Monitor fund releases
        this.diamond.on('MilestoneVerifiedAndReleased', (
            propertyId, milestoneId, amount, developer, verifiedBy
        ) => {
            console.log(`Funds released for milestone ${milestoneId} in property ${propertyId}`);
            this.handleFundRelease(propertyId, milestoneId, amount, developer, verifiedBy);
        });
    }

    async handleFundRequest(propertyId, milestoneId, developer) {
        // Notify admin
        // Update database
        // Send notification to developer
    }

    async handleMilestoneCompleted(propertyId, milestoneId) {
        // Notify admin for verification
        // Update database
        // Send notification to admin
    }

    async handleFundRelease(propertyId, milestoneId, amount, developer, verifiedBy) {
        // Update database
        // Send confirmation to developer
        // Update accounting records
        // Check if all milestones completed
    }
}
```

### Admin Milestone Management
```javascript
class AdminMilestoneManager {
    constructor(diamondContract, adminWallet) {
        this.diamond = diamondContract;
        this.wallet = adminWallet;
    }

    async getMilestonesNeedingVerification() {
        // Get all properties
        const totalProperties = await this.diamond.getTotalProperties();
        const [propertyIds, count] = await this.diamond.getProperties(0, totalProperties);
        
        const verificationNeeded = [];

        for (const propertyId of propertyIds) {
            const [nextRequestable, readyForVerification, readyForCompletion] = 
                await this.diamond.getMilestoneDashboard(propertyId);

            if (readyForVerification.length > 0) {
                const property = await this.diamond.getProperty(propertyId);
                const milestones = await this.diamond.getPropertyMilestones(propertyId);
                
                verificationNeeded.push({
                    property,
                    milestones: readyForVerification.map(id => milestones[id])
                });
            }
        }

        return verificationNeeded;
    }

    async verifyAndReleaseFunds(propertyId, milestoneId) {
        // Admin function to verify and release milestone funds
        const tx = await this.diamond.verifyAndMarkMilestoneCompleted(propertyId, milestoneId);
        return await tx.wait();
    }

    async getMilestoneAnalytics() {
        const totalProperties = await this.diamond.getTotalProperties();
        const [propertyIds, count] = await this.diamond.getProperties(0, totalProperties);
        
        let totalMilestones = 0;
        let completedMilestones = 0;
        let fundsReleased = 0;
        let pendingVerification = 0;

        for (const propertyId of propertyIds) {
            const milestones = await this.diamond.getPropertyMilestones(propertyId);
            const [nextRequestable, readyForVerification, readyForCompletion] = 
                await this.diamond.getMilestoneDashboard(propertyId);

            totalMilestones += milestones.length;
            pendingVerification += readyForVerification.length;

            for (const milestone of milestones) {
                const [
                    fundsRequested,
                    fundsReleased: milestoneFundsReleased,
                    isCompleted
                ] = await this.diamond.getMilestoneStatus(propertyId, milestone.id);

                if (isCompleted) {
                    completedMilestones++;
                }

                if (milestoneFundsReleased) {
                    fundsReleased += milestone.percentage;
                }
            }
        }

        return {
            totalMilestones,
            completedMilestones,
            completionRate: totalMilestones > 0 ? (completedMilestones * 100) / totalMilestones : 0,
            fundsReleasedPercentage: fundsReleased,
            pendingVerification
        };
    }
}
```

### Milestone Workflow Automation
```javascript
class MilestoneWorkflow {
    constructor(diamondContract, adminWallet) {
        this.diamond = diamondContract;
        this.wallet = adminWallet;
    }

    async checkMilestoneDeadlines() {
        // Check for milestones that need attention
        const totalProperties = await this.diamond.getTotalProperties();
        const [propertyIds, count] = await this.diamond.getProperties(0, totalProperties);
        
        const overdueMilestones = [];

        for (const propertyId of propertyIds) {
            const milestones = await this.diamond.getPropertyMilestones(propertyId);
            
            for (const milestone of milestones) {
                const [
                    fundsRequested,
                    fundsReleased,
                    isCompleted,
                    requestedAt
                ] = await this.diamond.getMilestoneStatus(propertyId, milestone.id);

                // Check if funds were requested but not released within 30 days
                if (fundsRequested && !fundsReleased && requestedAt > 0) {
                    const daysSinceRequest = (Date.now() / 1000 - requestedAt) / 86400;
                    
                    if (daysSinceRequest > 30) {
                        overdueMilestones.push({
                            propertyId,
                            milestoneId: milestone.id,
                            milestone: milestone,
                            daysSinceRequest: Math.floor(daysSinceRequest)
                        });
                    }
                }
            }
        }

        return overdueMilestones;
    }

    async sendMilestoneNotifications() {
        // Send notifications for milestones needing attention
        const verificationNeeded = await this.getMilestonesNeedingVerification();
        
        for (const item of verificationNeeded) {
            // Send email to admin
            await this.sendAdminNotification(item.property, item.milestones);
        }
    }

    async sendAdminNotification(property, milestones) {
        // Implementation for sending admin notifications
        console.log(`Admin notification: ${milestones.length} milestones need verification for property ${property.title}`);
    }
}
```

## Security Considerations

1. **Access Control**: Only developers can request funds and mark completion
2. **Admin Verification**: Only admins can release funds
3. **Sequential Processing**: Milestones must be completed in order
4. **Fund Limits**: Cannot release more than 100% of total funds
5. **State Validation**: Multiple checks prevent invalid state transitions

## Gas Requirements

- **View Functions**: No gas required
- **Fund Requests**: Low gas cost
- **Milestone Completion**: Low gas cost
- **Admin Verification**: Moderate gas cost (includes fund transfer)

## Error Handling

Common error messages:
- `"Property must be fully funded"` - Property not fully funded
- `"Only property developer can request funds"` - Unauthorized caller
- `"Milestone does not exist"` - Invalid milestone ID
- `"Funds already requested"` - Funds already requested
- `"Previous milestone must be completed first"` - Sequential requirement not met
- `"Developer must mark milestone as completed"` - Developer hasn't marked completion
- `"Funds already released"` - Funds already released
