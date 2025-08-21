# AdminFacet Documentation

## Overview
The AdminFacet handles all administrative functions for the Assetrix platform, including ownership management, contract configuration, fee settings, and emergency controls.

## Access Control
- **Owner Only**: Most functions require owner privileges
- **Pausable**: Functions can be paused for emergency situations
- **Non-reentrant**: Protected against reentrancy attacks

## Core Functions

### Initialization Functions

#### `initialize(address _owner, address _stablecoin, uint256 _initialTokenPrice)`
**Purpose**: Initialize the contract with essential parameters
**Access**: External, can only be called once
**Parameters**:
- `_owner` (address): The contract owner
- `_stablecoin` (address): ERC20 stablecoin contract address
- `_initialTokenPrice` (uint256): Initial token price in stablecoin units

**Default Values Set**:
- `minTokensPerProperty`: 1
- `maxTokensPerProperty`: 1,000,000
- `minTokensPerInvestment`: 1
- `adminFeePercentage`: 3%
- `earlyExitFeePercentage`: 5%

**Events Emitted**:
- `OwnershipTransferred`
- `StablecoinUpdated`
- `GlobalTokenPriceUpdated`
- `AdminFeePercentageUpdated`
- `EarlyExitFeePercentageUpdated`
- `MinTokensPerPropertyUpdated`
- `MaxTokensPerPropertyUpdated`
- `MinTokensPerInvestmentUpdated`

```javascript
// Backend initialization
await diamondContract.initialize(
    ownerAddress,
    stablecoinAddress,
    ethers.utils.parseUnits("100", 2) // 100 stablecoin units
);
```

#### `initializeOwnership(address _owner)`
**Purpose**: Set initial contract owner
**Access**: External, can only be called once
**Parameters**:
- `_owner` (address): The contract owner

```javascript
await diamondContract.initializeOwnership(ownerAddress);
```

### Ownership Management

#### `transferOwnership(address newOwner)`
**Purpose**: Transfer contract ownership
**Access**: External, owner only
**Parameters**:
- `newOwner` (address): New owner address

**Events Emitted**: `OwnershipTransferred`

```javascript
await diamondContract.transferOwnership(newOwnerAddress);
```

#### `owner()`
**Purpose**: Get current contract owner
**Access**: External view
**Returns**: `address` - Current owner address

```javascript
const owner = await diamondContract.owner();
```

### Pause Control

#### `pause()`
**Purpose**: Pause all contract operations
**Access**: External, owner only
**Events Emitted**: `Paused`

```javascript
await diamondContract.pause();
```

#### `unpause()`
**Purpose**: Resume contract operations
**Access**: External, owner only
**Events Emitted**: `Unpaused`

```javascript
await diamondContract.unpause();
```

#### `paused()`
**Purpose**: Check if contract is paused
**Access**: External view
**Returns**: `bool` - True if paused

```javascript
const isPaused = await diamondContract.paused();
```

### Configuration Functions

#### `setStablecoin(address _newStablecoin)`
**Purpose**: Update stablecoin contract address
**Access**: External, owner only, when not paused
**Parameters**:
- `_newStablecoin` (address): New stablecoin contract address

**Events Emitted**: `StablecoinUpdated`

```javascript
await diamondContract.setStablecoin(newStablecoinAddress);
```

#### `getStablecoin()`
**Purpose**: Get current stablecoin address
**Access**: External view
**Returns**: `address` - Current stablecoin address

```javascript
const stablecoinAddress = await diamondContract.getStablecoin();
```

#### `setGlobalTokenPrice(uint256 _newTokenPrice)`
**Purpose**: Update global token price
**Access**: External, owner only, when not paused
**Parameters**:
- `_newTokenPrice` (uint256): New token price in stablecoin units

**Events Emitted**: `GlobalTokenPriceUpdated`

```javascript
await diamondContract.setGlobalTokenPrice(
    ethers.utils.parseUnits("150", 2) // 150 stablecoin units
);
```

#### `getGlobalTokenPrice()`
**Purpose**: Get current global token price
**Access**: External view
**Returns**: `uint256` - Current token price

```javascript
const tokenPrice = await diamondContract.getGlobalTokenPrice();
```

### Fee Management

#### `setAdminFeePercentage(uint256 _newFeePercentage)`
**Purpose**: Set admin fee percentage
**Access**: External, owner only, when not paused
**Parameters**:
- `_newFeePercentage` (uint256): New fee percentage (max 10%)

**Validation**:
- Must be ≤ 10%
- Total fees (admin + early exit) must be ≤ 20%

**Events Emitted**: `AdminFeePercentageUpdated`

```javascript
await diamondContract.setAdminFeePercentage(3); // 3%
```

#### `getAdminFeePercentage()`
**Purpose**: Get current admin fee percentage
**Access**: External view
**Returns**: `uint256` - Current admin fee percentage

```javascript
const adminFee = await diamondContract.getAdminFeePercentage();
```

#### `setEarlyExitFeePercentage(uint256 _newFeePercentage)`
**Purpose**: Set early exit fee percentage
**Access**: External, owner only, when not paused
**Parameters**:
- `_newFeePercentage` (uint256): New fee percentage (max 10%)

**Validation**:
- Must be ≤ 10%
- Total fees (admin + early exit) must be ≤ 20%

**Events Emitted**: `EarlyExitFeePercentageUpdated`

```javascript
await diamondContract.setEarlyExitFeePercentage(5); // 5%
```

#### `getEarlyExitFeePercentage()`
**Purpose**: Get current early exit fee percentage
**Access**: External view
**Returns**: `uint256` - Current early exit fee percentage

```javascript
const earlyExitFee = await diamondContract.getEarlyExitFeePercentage();
```

### Token Limits

#### `setMinTokensPerProperty(uint256 value)`
**Purpose**: Set minimum tokens per property
**Access**: External, owner only, when not paused
**Parameters**:
- `value` (uint256): Minimum tokens required

**Events Emitted**: `MinTokensPerPropertyUpdated`

```javascript
await diamondContract.setMinTokensPerProperty(1000);
```

#### `getMinTokensPerProperty()`
**Purpose**: Get minimum tokens per property
**Access**: External view
**Returns**: `uint256` - Minimum tokens per property

```javascript
const minTokens = await diamondContract.getMinTokensPerProperty();
```

#### `setMaxTokensPerProperty(uint256 value)`
**Purpose**: Set maximum tokens per property
**Access**: External, owner only, when not paused
**Parameters**:
- `value` (uint256): Maximum tokens allowed

**Events Emitted**: `MaxTokensPerPropertyUpdated`

```javascript
await diamondContract.setMaxTokensPerProperty(1000000);
```

#### `getMaxTokensPerProperty()`
**Purpose**: Get maximum tokens per property
**Access**: External view
**Returns**: `uint256` - Maximum tokens per property

```javascript
const maxTokens = await diamondContract.getMaxTokensPerProperty();
```

#### `setMinTokensPerInvestment(uint256 value)`
**Purpose**: Set minimum tokens per investment
**Access**: External, owner only, when not paused
**Parameters**:
- `value` (uint256): Minimum tokens per investment

**Events Emitted**: `MinTokensPerInvestmentUpdated`

```javascript
await diamondContract.setMinTokensPerInvestment(10);
```

#### `getMinTokensPerInvestment()`
**Purpose**: Get minimum tokens per investment
**Access**: External view
**Returns**: `uint256` - Minimum tokens per investment

```javascript
const minInvestment = await diamondContract.getMinTokensPerInvestment();
```

### Backend Signer Management

#### `setBackendSigner(address _backendSigner)`
**Purpose**: Set backend signer for fiat payments
**Access**: External, owner only
**Parameters**:
- `_backendSigner` (address): Backend signer address

**Events Emitted**: `BackendSignerUpdated`

```javascript
await diamondContract.setBackendSigner(backendSignerAddress);
```

#### `getBackendSigner()`
**Purpose**: Get current backend signer
**Access**: External view
**Returns**: `address` - Current backend signer

```javascript
const backendSigner = await diamondContract.getBackendSigner();
```

### Fund Management

#### `withdrawStablecoin(address _to, uint256 _amount)`
**Purpose**: Withdraw stablecoin from contract
**Access**: External, owner only, when not paused, non-reentrant
**Parameters**:
- `_to` (address): Recipient address
- `_amount` (uint256): Amount to withdraw

**Events Emitted**: `StablecoinWithdrawn`

```javascript
await diamondContract.withdrawStablecoin(
    recipientAddress,
    ethers.utils.parseUnits("1000", 2)
);
```

## Events

### `OwnershipTransferred(address indexed previousOwner, address indexed newOwner)`
Emitted when ownership is transferred.

### `Paused(address account)`
Emitted when contract is paused.

### `Unpaused(address account)`
Emitted when contract is unpaused.

### `StablecoinUpdated(address indexed newStablecoin)`
Emitted when stablecoin address is updated.

### `GlobalTokenPriceUpdated(uint256 newTokenPrice)`
Emitted when global token price is updated.

### `AdminFeePercentageUpdated(uint256 newFeePercentage)`
Emitted when admin fee percentage is updated.

### `EarlyExitFeePercentageUpdated(uint256 newFeePercentage)`
Emitted when early exit fee percentage is updated.

### `MinTokensPerPropertyUpdated(uint256 newValue)`
Emitted when minimum tokens per property is updated.

### `MaxTokensPerPropertyUpdated(uint256 newValue)`
Emitted when maximum tokens per property is updated.

### `MinTokensPerInvestmentUpdated(uint256 newValue)`
Emitted when minimum tokens per investment is updated.

### `StablecoinWithdrawn(address indexed to, uint256 amount)`
Emitted when stablecoin is withdrawn.

### `BackendSignerUpdated(address indexed oldSigner, address indexed newSigner)`
Emitted when backend signer is updated.

## Frontend Integration

### Real-Time Event Monitoring
```javascript
class AdminEventMonitor {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async monitorAdminEvents() {
        // Monitor pause status for UI updates
        this.diamond.on('Paused', (account) => {
            console.log(`Contract paused by: ${account}`);
            this.showPauseBanner();
            this.disableUserActions();
        });

        this.diamond.on('Unpaused', (account) => {
            console.log(`Contract unpaused by: ${account}`);
            this.hidePauseBanner();
            this.enableUserActions();
        });

        // Monitor configuration changes for UI updates
        this.diamond.on('GlobalTokenPriceUpdated', (newPrice) => {
            console.log(`Token price updated to: ${newPrice}`);
            this.updateTokenPriceDisplay(newPrice);
            this.updateInvestmentCalculations(newPrice);
        });

        this.diamond.on('AdminFeePercentageUpdated', (newFee) => {
            console.log(`Admin fee updated to: ${newFee}%`);
            this.updateFeeDisplay(newFee);
        });

        this.diamond.on('EarlyExitFeePercentageUpdated', (newFee) => {
            console.log(`Early exit fee updated to: ${newFee}%`);
            this.updateExitFeeDisplay(newFee);
        });

        this.diamond.on('StablecoinUpdated', (newStablecoin) => {
            console.log(`Stablecoin updated to: ${newStablecoin}`);
            this.updateStablecoinReference(newStablecoin);
        });
    }

    showPauseBanner() {
        // Show pause banner in UI
        // Disable all user interactions
    }

    hidePauseBanner() {
        // Hide pause banner
        // Re-enable user interactions
    }

    updateTokenPriceDisplay(newPrice) {
        // Update all token price displays
        // Refresh investment calculators
    }

    updateFeeDisplay(newFee) {
        // Update fee displays throughout UI
    }

    updateExitFeeDisplay(newFee) {
        // Update early exit fee displays
    }

    updateStablecoinReference(newStablecoin) {
        // Update stablecoin references in UI
    }
}
```

### Contract Status Display
```javascript
// Check if contract is paused
const isPaused = await diamondContract.paused();

// Get current owner
const owner = await diamondContract.owner();

// Get current token price
const tokenPrice = await diamondContract.getGlobalTokenPrice();

// Get fee percentages
const adminFee = await diamondContract.getAdminFeePercentage();
const earlyExitFee = await diamondContract.getEarlyExitFeePercentage();
```

### Admin Interface (Owner Only)
```javascript
// Admin functions (require owner privileges)
const adminFunctions = {
    pause: () => diamondContract.pause(),
    unpause: () => diamondContract.unpause(),
    setTokenPrice: (price) => diamondContract.setGlobalTokenPrice(price),
    setAdminFee: (fee) => diamondContract.setAdminFeePercentage(fee),
    setEarlyExitFee: (fee) => diamondContract.setEarlyExitFeePercentage(fee),
    withdrawStablecoin: (to, amount) => diamondContract.withdrawStablecoin(to, amount)
};
```

## Backend Integration

### Critical Event Processing
```javascript
class AdminEventProcessor {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async monitorCriticalEvents() {
        // Monitor stablecoin withdrawals for accounting
        this.diamond.on('StablecoinWithdrawn', (to, amount) => {
            console.log(`Admin withdrew ${amount} to ${to}`);
            this.updateAccountingRecords(to, amount);
        });

        // Monitor backend signer updates
        this.diamond.on('BackendSignerUpdated', (oldSigner, newSigner) => {
            console.log(`Backend signer updated from ${oldSigner} to ${newSigner}`);
            this.updateBackendConfiguration(newSigner);
        });
    }

    async updateAccountingRecords(to, amount) {
        // Update accounting database
        // Log withdrawal for audit purposes
        // Send notification to finance team
    }

    async updateBackendConfiguration(newSigner) {
        // Update backend signer configuration
        // Restart signature services if needed
        // Update API endpoints
    }
}
```

### Configuration Management
```javascript
class AdminManager {
    constructor(diamondContract, adminWallet) {
        this.contract = diamondContract;
        this.wallet = adminWallet;
    }

    async updateTokenPrice(newPrice) {
        const tx = await this.contract.setGlobalTokenPrice(newPrice);
        return await tx.wait();
    }

    async updateFees(adminFee, earlyExitFee) {
        await this.contract.setAdminFeePercentage(adminFee);
        await this.contract.setEarlyExitFeePercentage(earlyExitFee);
    }

    async emergencyPause() {
        const tx = await this.contract.pause();
        return await tx.wait();
    }

    async resume() {
        const tx = await this.contract.unpause();
        return await tx.wait();
    }
}
```

## Security Considerations

1. **Owner Privileges**: Only the owner can call administrative functions
2. **Pause Mechanism**: Contract can be paused for emergency situations
3. **Fee Limits**: Admin and early exit fees are capped at 10% each, total 20%
4. **Non-reentrant**: Withdrawal function is protected against reentrancy
5. **Validation**: All parameters are validated before state changes

## Gas Requirements

- **View Functions**: No gas required
- **Admin Functions**: Require gas (paid by owner)
- **Initialization**: One-time gas cost
- **Configuration Updates**: Moderate gas cost

## Error Handling

Common error messages:
- `"Ownable: caller is not the owner"` - Function requires owner privileges
- `"Pausable: paused"` - Contract is paused
- `"Fee cannot exceed 10%"` - Fee percentage too high
- `"Total fees cannot exceed 20%"` - Combined fees too high
- `"Invalid address"` - Invalid address provided
- `"Amount must be greater than 0"` - Invalid amount
