# PropertyFacet Documentation

## Overview

The `PropertyFacet` manages the lifecycle of real estate properties within the Assetrix platform. It handles property creation, updates, deactivation, and provides comprehensive querying capabilities for properties and their associated data.

## Core Functionality

### Property Lifecycle Management
- **Creation**: Developers can create new property listings with detailed information
- **Updates**: Property details can be modified before funding completion
- **Deactivation**: Properties can be deactivated by developers or admins
- **Admin Controls**: Administrative functions for property activation/deactivation

### Data Retrieval
- **Property Details**: Comprehensive property information retrieval
- **Developer Properties**: Properties created by specific developers
- **Token Holder Properties**: Properties where a user holds tokens
- **Pagination Support**: Efficient property listing with offset/limit pagination

## Functions

### Property Creation

#### `createProperty(PropertyCreationData memory _data) external returns (uint256)`
Creates a new property listing with associated milestones.

**Parameters:**
- `_data`: Struct containing all property creation data including:
  - `title`: Property title (required)
  - `description`: Property description
  - `propertyType`: Type of property (enum)
  - `propertyUse`: Intended use of property (enum)
  - `developerName`: Name of the developer (required)
  - `developerAddress`: Developer's wallet address (required)
  - `city`, `state`, `country`: Location details (required)
  - `size`: Property size
  - `bedrooms`, `bathrooms`: Property specifications
  - `amountToRaise`: Total funding amount (must be divisible by token price)
  - `roiPercentage`: Expected return on investment (1-100%)
  - `investmentDuration`: Investment period (enum)
  - `ipfsImagesHash`: IPFS hash for property images
  - `ipfsMetadataHash`: IPFS hash for additional metadata
  - `milestoneTitles[]`: Array of milestone titles
  - `milestoneDescriptions[]`: Array of milestone descriptions
  - `milestonePercentages[]`: Array of milestone funding percentages

**Returns:** `uint256` - The newly created property ID

**Access Control:** Developer or admin only
**State Changes:** Creates new property, increments property count, creates milestones

### Property Updates

#### `updateProperty(uint256 _propertyId, PropertyUpdateData memory _data) external`
Updates an existing property's details and milestones.

**Parameters:**
- `_propertyId`: ID of the property to update
- `_data`: Struct containing updated property data (similar to creation data)

**Access Control:** Property developer or admin only
**Restrictions:** Cannot update fully funded properties
**State Changes:** Updates property details and recreates milestones

### Property Deactivation

#### `deactivateProperty(uint256 _propertyId) external`
Deactivates a property, preventing further investments.

**Parameters:**
- `_propertyId`: ID of the property to deactivate

**Access Control:** Property developer or admin only
**Restrictions:** Cannot deactivate fully funded properties
**State Changes:** Sets property as inactive

### Admin Functions

#### `adminActivateProperty(uint256 _propertyId) external`
Administratively activates a property for funding.

**Parameters:**
- `_propertyId`: ID of the property to activate

**Access Control:** Admin only
**State Changes:** Sets property as active

#### `adminDeactivateProperty(uint256 _propertyId) external`
Administratively deactivates a property (emergency function).

**Parameters:**
- `_propertyId`: ID of the property to deactivate

**Access Control:** Admin only
**State Changes:** Sets property as inactive

### Data Retrieval Functions

#### `getProperty(uint256 _propertyId) public view returns (PropertyView memory)`
Retrieves comprehensive details of a specific property.

**Parameters:**
- `_propertyId`: ID of the property to retrieve

**Returns:** `PropertyView` struct containing all property details including milestones

#### `getTotalProperties() external view returns (uint256)`
Returns the total number of properties in the system.

**Returns:** `uint256` - Total property count

#### `getProperties(uint256 _offset, uint256 _limit) external view returns (uint256[] memory propertyIds, uint256 totalCount)`
Retrieves a paginated list of property IDs.

**Parameters:**
- `_offset`: Starting position for pagination
- `_limit`: Maximum number of properties to return (1-50)

**Returns:** 
- `propertyIds[]`: Array of property IDs
- `totalCount`: Total number of properties in the system

#### `getMyProperties() external view returns (PropertyView[] memory)`
Retrieves all properties created by the calling user (developer).

**Returns:** `PropertyView[]` - Array of properties created by the caller

#### `getMyTokenProperties() external view returns (PropertyView[] memory)`
Retrieves all properties where the calling user holds tokens.

**Returns:** `PropertyView[]` - Array of properties where caller holds tokens

#### `getDeveloperPropertyCount(address _developer) external view returns (uint256)`
Returns the number of properties created by a specific developer.

**Parameters:**
- `_developer`: Developer's wallet address

**Returns:** `uint256` - Number of properties created by the developer

#### `getDeveloperProperties(address _developer) external view returns (PropertyView[] memory)`
Retrieves all properties created by a specific developer.

**Parameters:**
- `_developer`: Developer's wallet address

**Returns:** `PropertyView[]` - Array of properties created by the developer

#### `getPropertyTokenHolders(uint256 _propertyId) external view returns (address[] memory)`
Retrieves all token holders for a specific property.

**Parameters:**
- `_propertyId`: ID of the property

**Returns:** `address[]` - Array of token holder addresses

## Events

### `PropertyCreated(uint256 indexed propertyId, address indexed developer, string title)`
Emitted when a new property is created.

### `PropertyUpdated(uint256 indexed propertyId, string ipfsMetadataHash)`
Emitted when a property is updated.

### `PropertyDeactivated(uint256 indexed propertyId)`
Emitted when a property is deactivated.

### `MilestoneCreated(uint256 indexed propertyId, uint256 milestoneId, string title, uint256 percentage)`
Emitted when a milestone is created for a property.

## Data Structures

### PropertyCreationData
```solidity
struct PropertyCreationData {
    string title;
    string description;
    PropertyType propertyType;
    PropertyUse propertyUse;
    string developerName;
    address developerAddress;
    string city;
    string state;
    string country;
    uint256 size;
    uint256 bedrooms;
    uint256 bathrooms;
    uint256 amountToRaise;
    uint256 roiPercentage;
    Duration investmentDuration;
    string ipfsImagesHash;
    string ipfsMetadataHash;
    string[] milestoneTitles;
    string[] milestoneDescriptions;
    uint256[] milestonePercentages;
}
```

### PropertyUpdateData
```solidity
struct PropertyUpdateData {
    string title;
    string description;
    PropertyType propertyType;
    PropertyUse propertyUse;
    string city;
    string state;
    string country;
    uint256 size;
    uint256 bedrooms;
    uint256 bathrooms;
    string ipfsImagesHash;
    string ipfsMetadataHash;
    uint256 roiPercentage;
    string[] milestoneTitles;
    string[] milestoneDescriptions;
    uint256[] milestonePercentages;
}
```

### PropertyView
```solidity
struct PropertyView {
    uint256 propertyId;
    string title;
    string description;
    PropertyType propertyType;
    PropertyUse propertyUse;
    string developer;
    string city;
    string state;
    string country;
    uint256 size;
    uint256 bedrooms;
    uint256 bathrooms;
    uint256 tokenPrice;
    uint256 totalTokens;
    uint256 tokensSold;
    uint256 tokensLeft;
    Duration investmentDuration;
    bool isActive;
    bool isFullyFunded;
    string ipfsImagesHash;
    string ipfsMetadataHash;
    address developerAddress;
    uint256 holderCount;
    Milestone[] milestones;
    uint256 roiPercentage;
}
```

## Frontend Integration

### Real-Time Event Monitoring
```javascript
class PropertyEventMonitor {
    constructor(diamondContract) {
        this.diamond = diamondContract;
    }

    async monitorPropertyEvents() {
        // Monitor property creation for UI updates
        this.diamond.on('PropertyCreated', (propertyId, developer, title) => {
            console.log(`New property created: ${title} by ${developer}`);
            this.addPropertyToListing(propertyId, developer, title);
            this.updatePropertyCount();
            this.showPropertyCreatedNotification(title);
        });

        // Monitor property updates for UI updates
        this.diamond.on('PropertyUpdated', (propertyId, ipfsMetadataHash) => {
            console.log(`Property ${propertyId} updated`);
            this.updatePropertyDetails(propertyId, ipfsMetadataHash);
            this.showPropertyUpdatedNotification(propertyId);
        });

        // Monitor property deactivation for UI updates
        this.diamond.on('PropertyDeactivated', (propertyId) => {
            console.log(`Property ${propertyId} deactivated`);
            this.removePropertyFromListing(propertyId);
            this.updatePropertyCount();
            this.showPropertyDeactivatedNotification(propertyId);
        });

        // Monitor milestone creation for UI updates
        this.diamond.on('MilestoneCreated', (propertyId, milestoneId, title, percentage) => {
            console.log(`Milestone created: ${title} for property ${propertyId}`);
            this.addMilestoneToProperty(propertyId, milestoneId, title, percentage);
            this.updateMilestoneCount(propertyId);
        });
    }

    addPropertyToListing(propertyId, developer, title) {
        // Add new property to listings
        // Update property count
        // Refresh property grid
    }

    updatePropertyCount() {
        // Update total property count
        // Refresh dashboard statistics
    }

    showPropertyCreatedNotification(title) {
        // Show property created notification
        // Update developer dashboard
    }

    updatePropertyDetails(propertyId, ipfsMetadataHash) {
        // Update property details in UI
        // Refresh property card
        // Update property page
    }

    showPropertyUpdatedNotification(propertyId) {
        // Show property updated notification
        // Update property status
    }

    removePropertyFromListing(propertyId) {
        // Remove property from active listings
        // Update property status
        // Refresh property grid
    }

    showPropertyDeactivatedNotification(propertyId) {
        // Show property deactivated notification
        // Update property status
    }

    addMilestoneToProperty(propertyId, milestoneId, title, percentage) {
        // Add milestone to property view
        // Update milestone list
        // Refresh milestone display
    }

    updateMilestoneCount(propertyId) {
        // Update milestone count for property
        // Refresh milestone summary
    }
}
```

### Property Creation Flow
1. **Form Validation**: Frontend validates all required fields and data formats
2. **IPFS Upload**: Frontend uploads property images and metadata to IPFS
3. **Data Preparation**: Frontend prepares PropertyCreationData struct
4. **Transaction Submission**: Frontend calls `createProperty()` with user's wallet
5. **Confirmation**: Frontend displays success/error messages and redirects

### Property Management Dashboard
1. **Developer Dashboard**: Frontend calls `getMyProperties()` to display developer's properties
2. **Property Details**: Frontend calls `getProperty()` to display detailed property information
3. **Update Interface**: Frontend provides forms for property updates
4. **Deactivation**: Frontend provides deactivation confirmation dialogs

### Property Discovery
1. **Property Listing**: Frontend calls `getProperties()` with pagination for property browsing
2. **Search/Filter**: Frontend implements client-side search and filtering
3. **Property Cards**: Frontend displays property cards with key information
4. **Detailed Views**: Frontend navigates to detailed property pages

### User Portfolio
1. **Token Holdings**: Frontend calls `getMyTokenProperties()` to display user's investments
2. **Portfolio Overview**: Frontend aggregates investment data across properties
3. **Performance Tracking**: Frontend calculates and displays ROI information

## Backend Integration

### Administrative Functions
1. **Property Approval**: Backend can call `adminActivateProperty()` to approve properties
2. **Emergency Controls**: Backend can call `adminDeactivateProperty()` for emergency situations
3. **Developer Verification**: Backend verifies developer credentials before property creation

### Data Analytics
1. **Property Statistics**: Backend calls getter functions to gather analytics data
2. **Developer Performance**: Backend tracks developer activity and success rates
3. **Market Analysis**: Backend analyzes property trends and market data

### Content Moderation
1. **IPFS Content Verification**: Backend verifies IPFS content meets platform standards
2. **Metadata Validation**: Backend validates property metadata for accuracy
3. **Developer KYC**: Backend handles developer identity verification

## Gas Requirements

### Functions Requiring Gas
- `createProperty()` - High gas cost due to storage operations and milestone creation
- `updateProperty()` - Medium gas cost for storage updates
- `deactivateProperty()` - Low gas cost for state change
- `adminActivateProperty()` - Low gas cost for state change
- `adminDeactivateProperty()` - Low gas cost for state change

### View Functions (No Gas Required)
- All `get*` functions are view functions and don't require gas
- These can be called directly from frontend without user wallet interaction

## Security Considerations

### Access Control
- Property creation restricted to developers or admins
- Property updates restricted to property developer or admin
- Admin functions restricted to contract owner only

### Data Validation
- Comprehensive input validation for all property data
- Milestone percentage validation (total ≤ 100%)
- Token amount validation against global token price
- Property state validation (cannot update fully funded properties)

### Reentrancy Protection
- All state-changing functions protected with `nonReentrant` modifier
- Prevents reentrancy attacks during property operations

## Error Handling

### Common Error Scenarios
- **Invalid Developer**: Sender must be the developer or admin
- **Empty Required Fields**: Title, developer name, location fields required
- **Invalid Amount**: Amount must be divisible by token price
- **Invalid ROI**: ROI percentage must be between 1 and 100
- **Milestone Mismatch**: Milestone arrays must have matching lengths
- **Token Count Bounds**: Calculated tokens must be within min/max bounds
- **Fully Funded**: Cannot update/deactivate fully funded properties

### Frontend Error Handling
1. **Validation Errors**: Display specific error messages for validation failures
2. **Transaction Failures**: Handle gas estimation failures and insufficient funds
3. **Network Issues**: Implement retry mechanisms for failed transactions
4. **User Feedback**: Provide clear feedback for all user actions
