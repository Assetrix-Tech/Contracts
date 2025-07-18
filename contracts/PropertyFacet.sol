// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";

contract PropertyFacet {
    using AssetrixStorage for AssetrixStorage.Layout;

    event PropertyCreated(uint256 indexed propertyId, address indexed developer, string title);
    event PropertyUpdated(uint256 indexed propertyId, string ipfsMetadataHash);
    event PropertyDeactivated(uint256 indexed propertyId);
    event MilestoneCreated(uint256 indexed propertyId, uint256 milestoneId, string title, uint256 percentage);

    modifier onlyDeveloperOrOwner(uint256 _propertyId) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            msg.sender == s.properties[_propertyId].developerAddress || msg.sender == address(this),
            "Unauthorized: Only property developer or owner can update"
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
        require(s.reentrancyStatus != _ENTERED, "ReentrancyGuard: reentrant call");
        s.reentrancyStatus = _ENTERED;
        _;
        s.reentrancyStatus = _NOT_ENTERED;
    }

    function createProperty(
        string memory _title,
        string memory _description,
        AssetrixStorage.PropertyType _propertyType,
        AssetrixStorage.PropertyUse _propertyUse,
        string memory _developerName,
        address _developerAddress,
        string memory _city,
        string memory _state,
        string memory _country,
        string memory _ipfsImagesHash,
        string memory _ipfsMetadataHash,
        uint256 _size,
        uint256 _bedrooms,
        uint256 _bathrooms,
        uint256 _amountToRaise,
        AssetrixStorage.Duration _investmentDuration,
        string[] memory _milestoneTitles,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestonePercentages,
        uint256 _roiPercentage
    ) external whenNotPaused nonReentrant returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_developerName).length > 0, "Developer name required");
        require(_developerAddress != address(0), "Invalid developer address");
        require(msg.sender == _developerAddress, "Sender must be the developer");
        require(bytes(_city).length > 0, "City required");
        require(bytes(_state).length > 0, "State required");
        require(bytes(_country).length > 0, "Country required");
        require(_amountToRaise > 0, "Amount to raise must be greater than 0");
        require(_amountToRaise % s.globalTokenPrice == 0, "Amount must be divisible by token price");
        require(_roiPercentage > 0 && _roiPercentage <= 100, "ROI percentage must be between 1 and 100");
        require(_milestoneTitles.length == _milestoneDescriptions.length && _milestoneTitles.length == _milestonePercentages.length, "Milestone arrays must have matching lengths");
        require(_milestoneTitles.length > 0 && _milestoneTitles.length <= 4, "Maximum 4 milestones allowed");
        uint256 calculatedTokens = _amountToRaise / s.globalTokenPrice;
        require(calculatedTokens >= 100 && calculatedTokens <= 100000, "Calculated token count out of bounds");
        s.propertyCount++;
        AssetrixStorage.Property storage prop = s.properties[s.propertyCount];
        prop.propertyId = s.propertyCount;
        prop.title = _title;
        prop.description = _description;
        prop.propertyType = _propertyType;
        prop.propertyUse = _propertyUse;
        prop.developer = _developerName;
        prop.developerAddress = msg.sender;
        prop.createdAt = block.timestamp;
        prop.city = _city;
        prop.state = _state;
        prop.country = _country;
        prop.size = _size;
        prop.bedrooms = _bedrooms;
        prop.bathrooms = _bathrooms;
        prop.tokenPrice = s.globalTokenPrice;
        prop.totalTokens = calculatedTokens;
        prop.tokensSold = 0;
        prop.tokensLeft = calculatedTokens;
        prop.investmentDuration = _investmentDuration;
        prop.isActive = true;
        prop.isFullyFunded = false;
        prop.ipfsImagesHash = _ipfsImagesHash;
        prop.ipfsMetadataHash = _ipfsMetadataHash;
        prop.roiPercentage = _roiPercentage;
        s.developerProperties[msg.sender].push(s.propertyCount);
        // Milestone creation logic
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _milestoneTitles.length; i++) {
            require(_milestonePercentages[i] > 0 && _milestonePercentages[i] <= 100, "Invalid milestone percentage");
            totalPercentage += _milestonePercentages[i];
            prop.milestones.push(AssetrixStorage.Milestone({
                id: i,
                title: _milestoneTitles[i],
                description: _milestoneDescriptions[i],
                percentage: _milestonePercentages[i],
                fundsRequested: false,
                fundsReleased: false,
                isCompleted: false,
                completedAt: 0,
                requestedAt: 0,
                releasedAt: 0
            }));
            emit MilestoneCreated(s.propertyCount, i, _milestoneTitles[i], _milestonePercentages[i]);
        }
        require(totalPercentage <= 100, "Total milestone percentage cannot exceed 100%");
        emit PropertyCreated(s.propertyCount, msg.sender, _title);
        return s.propertyCount;
    }

    function updateProperty(
        uint256 _propertyId,
        string memory _title,
        string memory _description,
        AssetrixStorage.PropertyType _propertyType,
        AssetrixStorage.PropertyUse _propertyUse,
        string memory _city,
        string memory _state,
        string memory _country,
        string memory _ipfsImagesHash,
        string memory _ipfsMetadataHash,
        uint256 _size,
        uint256 _bedrooms,
        uint256 _bathrooms,
        string[] memory _milestoneTitles,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestonePercentages,
        uint256 _roiPercentage
    ) external onlyDeveloperOrOwner(_propertyId) whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(!prop.isFullyFunded, "Cannot update a fully funded property");
        require(_milestoneTitles.length == _milestoneDescriptions.length && _milestoneTitles.length == _milestonePercentages.length, "Milestone arrays must have matching lengths");
        require(_milestoneTitles.length <= 4, "Maximum 4 milestones allowed");
        require(_roiPercentage > 0 && _roiPercentage <= 100, "ROI percentage must be between 1 and 100");
        prop.title = _title;
        prop.description = _description;
        prop.propertyType = _propertyType;
        prop.propertyUse = _propertyUse;
        prop.city = _city;
        prop.state = _state;
        prop.country = _country;
        prop.size = _size;
        prop.bedrooms = _bedrooms;
        prop.bathrooms = _bathrooms;
        prop.ipfsImagesHash = _ipfsImagesHash;
        prop.ipfsMetadataHash = _ipfsMetadataHash;
        prop.roiPercentage = _roiPercentage;
        // Clear existing milestones
        delete prop.milestones;
        // Add new milestones
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _milestoneTitles.length; i++) {
            require(_milestonePercentages[i] > 0 && _milestonePercentages[i] <= 100, "Invalid milestone percentage");
            totalPercentage += _milestonePercentages[i];
            prop.milestones.push(AssetrixStorage.Milestone({
                id: i,
                title: _milestoneTitles[i],
                description: _milestoneDescriptions[i],
                percentage: _milestonePercentages[i],
                fundsRequested: false,
                fundsReleased: false,
                isCompleted: false,
                completedAt: 0,
                requestedAt: 0,
                releasedAt: 0
            }));
            emit MilestoneCreated(_propertyId, i, _milestoneTitles[i], _milestonePercentages[i]);
        }
        require(totalPercentage <= 100, "Total milestone percentage cannot exceed 100%");
        emit PropertyUpdated(_propertyId, _ipfsMetadataHash);
    }

    function deactivateProperty(uint256 _propertyId) external onlyDeveloperOrOwner(_propertyId) whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(!prop.isFullyFunded, "Cannot deactivate a fully funded property");
        prop.isActive = false;
        emit PropertyDeactivated(_propertyId);
    }

    function getProperty(uint256 _propertyId) public view returns (AssetrixStorage.PropertyView memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return AssetrixStorage.PropertyView({
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

    function getTotalProperties() external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.propertyCount;
    }

    function getProperties(uint256 _offset, uint256 _limit) external view returns (uint256[] memory propertyIds, uint256 totalCount) {
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

    function getMyProperties() external view returns (AssetrixStorage.PropertyView[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        uint256[] memory propertyIds = s.developerProperties[msg.sender];
        AssetrixStorage.PropertyView[] memory result = new AssetrixStorage.PropertyView[](propertyIds.length);
        for (uint256 i = 0; i < propertyIds.length; i++) {
            uint256 propertyId = propertyIds[i];
            AssetrixStorage.Property storage prop = s.properties[propertyId];
            result[i] = getProperty(propertyId);
        }
        return result;
    }

    function getMyTokenProperties() external view returns (AssetrixStorage.PropertyView[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        uint256[] memory propertyIds = s.tokenHolderProperties[msg.sender];
        AssetrixStorage.PropertyView[] memory result = new AssetrixStorage.PropertyView[](propertyIds.length);
        for (uint256 i = 0; i < propertyIds.length; i++) {
            uint256 propertyId = propertyIds[i];
            AssetrixStorage.Property storage prop = s.properties[propertyId];
            result[i] = getProperty(propertyId);
        }
        return result;
    }

    function getDeveloperPropertyCount(address _developer) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.developerProperties[_developer].length;
    }

    function getDeveloperProperties(address _developer) external view returns (AssetrixStorage.PropertyView[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        uint256[] memory propertyIds = s.developerProperties[_developer];
        AssetrixStorage.PropertyView[] memory result = new AssetrixStorage.PropertyView[](propertyIds.length);
        for (uint256 i = 0; i < propertyIds.length; i++) {
            uint256 propertyId = propertyIds[i];
            AssetrixStorage.Property storage prop = s.properties[propertyId];
            result[i] = getProperty(propertyId);
        }
        return result;
    }

    function getPropertyTokenHolders(uint256 _propertyId) external view returns (address[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return prop.tokenHolders;
    }
} 