// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";

contract PropertyFacet {
    using AssetrixStorage for AssetrixStorage.Layout;

    event PropertyCreated(
        uint256 indexed propertyId,
        address indexed developer,
        string title
    );
    event PropertyUpdated(uint256 indexed propertyId, string ipfsMetadataHash);
    event PropertyDeactivated(uint256 indexed propertyId);
    event MilestoneCreated(
        uint256 indexed propertyId,
        uint256 milestoneId,
        string title,
        uint256 percentage
    );

    modifier onlyDeveloperOrOwner(uint256 _propertyId) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            msg.sender == s.properties[_propertyId].developerAddress ||
                msg.sender == s.owner,
            "Unauthorized: Only property developer or admin can update"
        );
        _;
    }

    modifier onlyOwner() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(msg.sender == s.owner, "Ownable: caller is not the owner");
        _;
    }

    modifier whenNotPaused() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(!s.paused, "Pausable: paused");
        _;
    }

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    modifier nonReentrant() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            s.reentrancyStatus != _ENTERED,
            "ReentrancyGuard: reentrant call"
        );
        s.reentrancyStatus = _ENTERED;
        _;
        s.reentrancyStatus = _NOT_ENTERED;
    }

    // ============ PROPERTY CREATION ============
    function createProperty(
        AssetrixStorage.PropertyCreationData memory _data
    ) external whenNotPaused nonReentrant returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(bytes(_data.title).length > 0, "Title cannot be empty");
        require(
            bytes(_data.developerName).length > 0,
            "Developer name required"
        );
        require(
            _data.developerAddress != address(0),
            "Invalid developer address"
        );
        require(
            msg.sender == _data.developerAddress || msg.sender == s.owner,
            "Sender must be the developer or admin"
        );
        require(bytes(_data.city).length > 0, "City required");
        require(bytes(_data.state).length > 0, "State required");
        require(bytes(_data.country).length > 0, "Country required");
        require(
            _data.amountToRaise > 0,
            "Amount to raise must be greater than 0"
        );
        require(
            _data.amountToRaise % s.globalTokenPrice == 0,
            "Amount must be divisible by token price"
        );
        require(
            _data.roiPercentage > 0 && _data.roiPercentage <= 100,
            "ROI percentage must be between 1 and 100"
        );
        require(
            _data.milestoneTitles.length ==
                _data.milestoneDescriptions.length &&
                _data.milestoneTitles.length ==
                _data.milestonePercentages.length,
            "Milestone arrays must have matching lengths"
        );
        require(
            _data.milestoneTitles.length > 0 &&
                _data.milestoneTitles.length <= 4,
            "Maximum 4 milestones allowed"
        );
        require(
            _data.milestoneTitles.length > 0,
            "At least one milestone is required"
        );
        uint256 calculatedTokens = _data.amountToRaise / s.globalTokenPrice;
        require(
            calculatedTokens >= s.minTokensPerProperty &&
                calculatedTokens <= s.maxTokensPerProperty,
            "Calculated token count out of bounds"
        );
        s.propertyCount++;
        AssetrixStorage.Property storage prop = s.properties[s.propertyCount];
        prop.propertyId = s.propertyCount;
        prop.title = _data.title;
        prop.description = _data.description;
        prop.propertyType = _data.propertyType;
        prop.propertyUse = _data.propertyUse;
        prop.developer = _data.developerName;
        prop.developerAddress = _data.developerAddress;
        prop.createdAt = block.timestamp;
        prop.city = _data.city;
        prop.state = _data.state;
        prop.country = _data.country;
        prop.size = _data.size;
        prop.bedrooms = _data.bedrooms;
        prop.bathrooms = _data.bathrooms;
        prop.tokenPrice = s.globalTokenPrice;
        prop.totalTokens = calculatedTokens;
        prop.tokensSold = 0;
        prop.tokensLeft = calculatedTokens;
        prop.investmentDuration = _data.investmentDuration;
        prop.isActive = true;
        prop.isFullyFunded = false;
        prop.ipfsImagesHash = _data.ipfsImagesHash;
        prop.ipfsMetadataHash = _data.ipfsMetadataHash;
        prop.roiPercentage = _data.roiPercentage;
        s.developerProperties[_data.developerAddress].push(s.propertyCount);
        // Milestone creation logic
        require(
            _data.milestoneTitles.length > 0,
            "At least one milestone is required"
        );
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _data.milestoneTitles.length; i++) {
            require(
                _data.milestonePercentages[i] > 0 &&
                    _data.milestonePercentages[i] <= 100,
                "Invalid milestone percentage"
            );
            totalPercentage += _data.milestonePercentages[i];
            prop.milestones.push(
                AssetrixStorage.Milestone({
                    id: i,
                    title: _data.milestoneTitles[i],
                    description: _data.milestoneDescriptions[i],
                    percentage: _data.milestonePercentages[i],
                    fundsRequested: false,
                    fundsReleased: false,
                    isCompleted: false,
                    completedAt: 0,
                    requestedAt: 0,
                    releasedAt: 0
                })
            );
            emit MilestoneCreated(
                s.propertyCount,
                i,
                _data.milestoneTitles[i],
                _data.milestonePercentages[i]
            );
        }
        require(
            totalPercentage <= 100,
            "Total milestone percentage cannot exceed 100%"
        );
        emit PropertyCreated(
            s.propertyCount,
            _data.developerAddress,
            _data.title
        );
        return s.propertyCount;
    }

    // ============ PROPERTY UPDATE ============
    function updateProperty(
        uint256 _propertyId,
        AssetrixStorage.PropertyUpdateData memory _data
    ) external onlyDeveloperOrOwner(_propertyId) whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(!prop.isFullyFunded, "Cannot update a fully funded property");
        require(
            _data.milestoneTitles.length ==
                _data.milestoneDescriptions.length &&
                _data.milestoneTitles.length ==
                _data.milestonePercentages.length,
            "Milestone arrays must have matching lengths"
        );
        require(
            _data.milestoneTitles.length <= 4,
            "Maximum 4 milestones allowed"
        );
        require(
            _data.milestoneTitles.length > 0,
            "At least one milestone is required"
        );
        require(
            _data.roiPercentage > 0 && _data.roiPercentage <= 100,
            "ROI percentage must be between 1 and 100"
        );
        prop.title = _data.title;
        prop.description = _data.description;
        prop.propertyType = _data.propertyType;
        prop.propertyUse = _data.propertyUse;
        prop.city = _data.city;
        prop.state = _data.state;
        prop.country = _data.country;
        prop.size = _data.size;
        prop.bedrooms = _data.bedrooms;
        prop.bathrooms = _data.bathrooms;
        prop.ipfsImagesHash = _data.ipfsImagesHash;
        prop.ipfsMetadataHash = _data.ipfsMetadataHash;
        prop.roiPercentage = _data.roiPercentage;
        // Clear existing milestones before adding new ones(property update)
        delete prop.milestones;
        // Add new milestones
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _data.milestoneTitles.length; i++) {
            require(
                _data.milestonePercentages[i] > 0 &&
                    _data.milestonePercentages[i] <= 100,
                "Invalid milestone percentage"
            );
            totalPercentage += _data.milestonePercentages[i];
            prop.milestones.push(
                AssetrixStorage.Milestone({
                    id: i,
                    title: _data.milestoneTitles[i],
                    description: _data.milestoneDescriptions[i],
                    percentage: _data.milestonePercentages[i],
                    fundsRequested: false,
                    fundsReleased: false,
                    isCompleted: false,
                    completedAt: 0,
                    requestedAt: 0,
                    releasedAt: 0
                })
            );
            emit MilestoneCreated(
                _propertyId,
                i,
                _data.milestoneTitles[i],
                _data.milestonePercentages[i]
            );
        }
        require(
            totalPercentage <= 100,
            "Total milestone percentage cannot exceed 100%"
        );
        emit PropertyUpdated(_propertyId, _data.ipfsMetadataHash);
    }

    // Deactivate Property by developer or admin only if not fully funded
    function deactivateProperty(
        uint256 _propertyId
    ) external onlyDeveloperOrOwner(_propertyId) whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(
            !prop.isFullyFunded,
            "Cannot deactivate a fully funded property"
        );
        prop.isActive = false;
        emit PropertyDeactivated(_propertyId);
    }

    // ============ ADMIN FUNCTIONS ============

    // Activate Property by admin before active for funding
    function adminActivateProperty(
        uint256 _propertyId
    ) external onlyOwner whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(
            _propertyId > 0 && _propertyId <= s.propertyCount,
            "Property does not exist"
        );
        prop.isActive = true;
        emit PropertyUpdated(_propertyId, prop.ipfsMetadataHash);
    }

    // forcefully deactivate Property by admin for emergency cases
    function adminDeactivateProperty(
        uint256 _propertyId
    ) external onlyOwner whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(
            _propertyId > 0 && _propertyId <= s.propertyCount,
            "Property does not exist"
        );
        prop.isActive = false;
        emit PropertyDeactivated(_propertyId);
    }

    function getProperty(
        uint256 _propertyId
    ) public view returns (AssetrixStorage.PropertyView memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return
            AssetrixStorage.PropertyView({
                propertyId: prop.propertyId,
                title: prop.title,
                description: prop.description,
                propertyType: prop.propertyType,
                propertyUse: prop.propertyUse,
                developer: prop.developer,
                city: prop.city,
                state: prop.state,
                country: prop.country,
                size: prop.size,
                bedrooms: prop.bedrooms,
                bathrooms: prop.bathrooms,
                tokenPrice: prop.tokenPrice,
                totalTokens: prop.totalTokens,
                tokensSold: prop.tokensSold,
                tokensLeft: prop.tokensLeft,
                investmentDuration: prop.investmentDuration,
                isActive: prop.isActive,
                isFullyFunded: prop.isFullyFunded,
                ipfsImagesHash: prop.ipfsImagesHash,
                ipfsMetadataHash: prop.ipfsMetadataHash,
                developerAddress: prop.developerAddress,
                holderCount: prop.holderCount,
                milestones: prop.milestones,
                roiPercentage: prop.roiPercentage
            });
    }

    // ============ PROPERTY GETTERS ============

    // Get total properties
    function getTotalProperties() external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.propertyCount;
    }

    function getProperties(
        uint256 _offset,
        uint256 _limit
    ) external view returns (uint256[] memory propertyIds, uint256 totalCount) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(_limit > 0 && _limit <= 50, "Limit must be between 1 and 50");
        totalCount = s.propertyCount;
        uint256 resultCount = _limit;
        if (_offset >= totalCount) {
            resultCount = 0;
        } else if (_offset + _limit > totalCount) {
            resultCount = totalCount - _offset;
        }
        propertyIds = new uint256[](resultCount);
        for (uint256 i = 0; i < resultCount; i++) {
            propertyIds[i] = _offset + i + 1;
        }
    }

    // Get all properties of the developer
    function getMyProperties()
        external
        view
        returns (AssetrixStorage.PropertyView[] memory)
    {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        uint256[] memory propertyIds = s.developerProperties[msg.sender];
        AssetrixStorage.PropertyView[]
            memory result = new AssetrixStorage.PropertyView[](
                propertyIds.length
            );
        for (uint256 i = 0; i < propertyIds.length; i++) {
            uint256 propertyId = propertyIds[i];
            result[i] = getProperty(propertyId);
        }
        return result;
    }

    // Get all token properties of the developer
    function getMyTokenProperties()
        external
        view
        returns (AssetrixStorage.PropertyView[] memory)
    {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        uint256[] memory propertyIds = s.tokenHolderProperties[msg.sender];
        AssetrixStorage.PropertyView[]
            memory result = new AssetrixStorage.PropertyView[](
                propertyIds.length
            );
        for (uint256 i = 0; i < propertyIds.length; i++) {
            uint256 propertyId = propertyIds[i];
            result[i] = getProperty(propertyId);
        }
        return result;
    }

    // Get total properties of the developer
    function getDeveloperPropertyCount(
        address _developer
    ) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.developerProperties[_developer].length;
    }

    function getDeveloperProperties(
        address _developer
    ) external view returns (AssetrixStorage.PropertyView[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        uint256[] memory propertyIds = s.developerProperties[_developer];
        AssetrixStorage.PropertyView[]
            memory result = new AssetrixStorage.PropertyView[](
                propertyIds.length
            );
        for (uint256 i = 0; i < propertyIds.length; i++) {
            uint256 propertyId = propertyIds[i];
            result[i] = getProperty(propertyId);
        }
        return result;
    }

    // Get all token holders of the property
    function getPropertyTokenHolders(
        uint256 _propertyId
    ) external view returns (address[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return prop.tokenHolders;
    }
}
