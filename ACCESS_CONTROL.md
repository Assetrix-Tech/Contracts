# Assetrix Diamond Pattern - Access Control Documentation

## Overview

Assetrix uses a diamond pattern (EIP-2535) with a two-level ownership system for secure and upgradeable smart contract architecture.

## Ownership Structure

### 🏗️ Two-Level Ownership System

#### 1. **Diamond Owner** (LibDiamond)
- **Purpose**: Technical upgrades and diamond cuts
- **Access**: `LibDiamond.contractOwner()`
- **Functions**: `diamondCut()`, `_authorizeUpgrade()`
- **Modifier**: `LibDiamond.enforceIsContractOwner()`

#### 2. **Business Owner** (AssetrixStorage)
- **Purpose**: Platform operations and admin functions
- **Access**: `s.owner` in AssetrixStorage
- **Functions**: All admin functions, property management, refunds, etc.
- **Modifier**: `onlyOwner` in facets (refers to `s.owner`)

## Access Control Matrix

### 👑 ADMIN ACCESS (Business Owner Only)

| **Function** | **Facet** | **Description** | **Access Control** | **Modifier** |
|--------------|-----------|-----------------|-------------------|--------------|
| `initialize()` | AdminFacet | Initialize the platform | Business Owner Only | `onlyOwner` |
| `transferOwnership()` | AdminFacet | Transfer business ownership | Business Owner Only | `onlyOwner` |
| `pause()` / `unpause()` | AdminFacet | Pause/unpause platform | Business Owner Only | `onlyOwner` |
| `setStablecoin()` | AdminFacet | Set stablecoin address | Business Owner Only | `onlyOwner` |
| `setGlobalTokenPrice()` | AdminFacet | Set global token price | Business Owner Only | `onlyOwner` |
| `payoutInvestment()` | InvestmentFacet | Payout to investors | **Admin Only** | `onlyOwner` |
| `refund()` | InvestmentFacet | Refund investors | **Admin Only** | `onlyOwner` |
| `emergencyRefund()` | InvestmentFacet | Emergency refund | Business Owner Only | `onlyOwner` |
| `releaseMilestoneFunds()` | MilestoneFacet | Release milestone funds | **Admin Only** | `onlyOwner` |
| `markMilestoneCompleted()` | MilestoneFacet | Mark milestone completed | Developer OR Admin | `require` |
| `adminActivateProperty()` | PropertyFacet | Activate property | Business Owner Only | `onlyOwner` |
| `adminDeactivateProperty()` | PropertyFacet | Deactivate property | Business Owner Only | `onlyOwner` |

### 🏠 DEVELOPER ACCESS

#### Property Management
| **Function** | **Facet** | **Description** | **Access Control** |
|--------------|-----------|-----------------|-------------------|
| `createProperty()` | PropertyFacet | Create new property | Developer OR Admin |
| `updateProperty()` | PropertyFacet | Update property details | Developer OR Admin (own properties only) |
| `deactivateProperty()` | PropertyFacet | Deactivate property | Developer OR Admin (own properties only) |
| `requestMilestoneFunds()` | MilestoneFacet | Request milestone funds | Developer Only (own properties only) |

#### View Functions
| **Function** | **Facet** | **Description** | **Access Control** |
|--------------|-----------|-----------------|-------------------|
| `getMyProperties()` | PropertyFacet | View own properties | Developer Only |
| `getProperty()` | PropertyFacet | View any property | Public |
| `getProperties()` | PropertyFacet | View all properties | Public |
| `getPropertyTokenHolders()` | PropertyFacet | View property token holders | Public |

### 👥 PUBLIC ACCESS

#### Investment Functions
| **Function** | **Facet** | **Description** | **Access Control** |
|--------------|-----------|-----------------|-------------------|
| `purchaseTokens()` | InvestmentFacet | Purchase property tokens | Anyone |
| `earlyExit()` | InvestmentFacet | Early exit from investment | Token Holder Only |

#### Analytics & View Functions
| **Function** | **Facet** | **Description** | **Access Control** |
|--------------|-----------|-----------------|-------------------|
| `getTokenBalance()` | InvestmentFacet | Get token balance | Public |
| `getTokenValue()` | InvestmentFacet | Get token value | Public |
| `getTokenSalePercentage()` | InvestmentFacet | Get sale percentage | Public |
| `getTokenGap()` | InvestmentFacet | Get remaining tokens | Public |
| `canAcceptTokenPurchases()` | InvestmentFacet | Check if accepting purchases | Public |
| `calculateExpectedROI()` | InvestmentFacet | Calculate expected ROI | Public |
| `getPropertyAmountToRaise()` | InvestmentFacet | Get amount to raise | Public |
| `getInvestmentEndTime()` | InvestmentFacet | Get investment end time | Public |
| `isInvestmentPeriodActive()` | InvestmentFacet | Check if period active | Public |
| `getInvestmentPeriodRemaining()` | InvestmentFacet | Get remaining time | Public |
| `getExpectedROIPercentage()` | InvestmentFacet | Get expected ROI % | Public |
| `getGlobalTokenPrice()` | InvestmentFacet | Get global token price | Public |
| `calculateTokensFromAmount()` | InvestmentFacet | Calculate tokens from amount | Public |
| `calculateAmountFromTokens()` | InvestmentFacet | Calculate amount from tokens | Public |

#### Milestone Analytics
| **Function** | **Facet** | **Description** | **Access Control** | **Efficiency** |
|--------------|-----------|-----------------|-------------------|----------------|
| `getPropertyMilestones()` | MilestoneFacet | Get property milestones | Public | Individual |
| `getMilestoneStatus()` | MilestoneFacet | Get milestone status | Public | Individual |
| `getNextRequestableMilestone()` | MilestoneFacet | Get next requestable milestone | Public | Individual |
| `getMilestonesReadyForRelease()` | MilestoneFacet | Get milestones ready for release | Public | Individual |
| `getMilestonesReadyForCompletion()` | MilestoneFacet | Get milestones ready for completion | Public | Individual |
| `getMilestoneDashboard()` | MilestoneFacet | **Combined milestone overview** | Public | **Optimized** |

#### Transaction History
| **Function** | **Facet** | **Description** | **Access Control** |
|--------------|-----------|-----------------|-------------------|
| `getUserTransactionHistory()` | TransactionFacet | Get user transaction history | Public |
| `getPropertyTransactionHistory()` | TransactionFacet | Get property transaction history | Public |
| `getTransaction()` | TransactionFacet | Get specific transaction | Public |
| `getTotalTransactions()` | TransactionFacet | Get total transaction count | Public |

## Security Features

### 🔒 Critical Financial Operations (Admin Only)
- **Investment Payouts**: Only admin can payout investments to investors
- **Refunds**: Only admin can refund investors
- **Milestone Fund Releases**: Only admin can release milestone funds to developers
- **Emergency Refunds**: Only admin can perform emergency refunds

### 🛡️ Property Management Security
- Developers can only manage **their own properties**
- Cannot modify properties after they're **fully funded**
- Cannot access **admin-only functions**
- Cannot perform **emergency operations**

### 🔐 Access Control Modifiers

#### Business Owner Modifier (`onlyOwner`)
```solidity
modifier onlyOwner() {
    AssetrixStorage.Layout storage s = AssetrixStorage.layout();
    require(msg.sender == s.owner, "Ownable: caller is not the owner");
    _;
}
```

#### Developer or Owner Modifier (`onlyDeveloperOrOwner`)
```solidity
modifier onlyDeveloperOrOwner(uint256 _propertyId) {
    AssetrixStorage.Layout storage s = AssetrixStorage.layout();
    require(
        msg.sender == s.properties[_propertyId].developerAddress || 
        msg.sender == s.owner || 
        msg.sender == address(this),
        "Unauthorized: Only property developer or admin can update"
    );
    _;
}
```

#### Usage Pattern
- **Admin-only functions**: Use `onlyOwner` modifier
- **Developer OR Admin functions**: Use `require` statement with `msg.sender == prop.developerAddress || msg.sender == s.owner`
- **Public functions**: No access control needed

## Workflow Examples

### 🏠 Property Creation Workflow
1. **Developer** calls `createProperty()` with their address
2. **Admin** can also create properties for developers
3. **Developer** can update/deactivate their properties (before funding)
4. **Admin** can override any property operations

### 📋 Milestone Workflow Optimization

#### **Before (Multiple Calls):**
```javascript
// 3 separate calls - inefficient
const nextRequestable = await contract.getNextRequestableMilestone(propertyId);
const readyForRelease = await contract.getMilestonesReadyForRelease(propertyId);
const readyForCompletion = await contract.getMilestonesReadyForCompletion(propertyId);
```

#### **After (Single Call):**
```javascript
// 1 call gets everything - optimized
const { nextRequestable, readyForRelease, readyForCompletion } = 
    await contract.getMilestoneDashboard(propertyId);
```

#### **Benefits:**
- ✅ **Gas Efficiency**: Single call instead of 3
- ✅ **Better UX**: Faster loading times
- ✅ **Atomic Data**: All data from same block
- ✅ **Backward Compatible**: Old functions still work

### 💰 Investment Workflow
1. **Anyone** can purchase tokens via `purchaseTokens()`
2. **Token holders** can early exit via `earlyExit()`
3. **Admin only** can payout investments via `payoutInvestment()`
4. **Admin only** can refund investors via `refund()`

### 📋 Milestone Workflow
1. **Developer** requests milestone funds via `requestMilestoneFunds()`
2. **Admin only** releases funds via `releaseMilestoneFunds()`
3. **Developer OR Admin** marks milestone completed via `markMilestoneCompleted()`

## Contract Architecture

```
Diamond Proxy
├── AdminFacet (Business Owner Functions)
├── PropertyFacet (Property Management)
├── InvestmentFacet (Investment Operations)
├── MilestoneFacet (Milestone Management)
├── TransactionFacet (Transaction History)
└── AssetrixStorage (Shared Storage)
```

This access control system ensures:
- **Security**: Critical financial operations are admin-only
- **Flexibility**: Developers have control over their properties
- **Transparency**: All operations are publicly viewable
- **Upgradeability**: Diamond pattern allows for future improvements 