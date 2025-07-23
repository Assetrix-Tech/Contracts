// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixModuleBase.sol";
import "../libraries/AssetrixEnums.sol";
import "../libraries/AssetrixStructs.sol";
import "./AssetrixStorage.sol";
import "../interfaces/IAssetrixEvents.sol";

contract AssetrixPropertyManagement is AssetrixModuleBase,AssetrixStorage, IAssetrixEvents {
    using AssetrixEnums for *;
    using AssetrixStructs for *;

    // ============ PROPERTY MANAGEMENT ============
    function __AssetrixPropertyManagement_init(address initialOwner) internal onlyInitializing {
        __AssetrixModuleBase_init(initialOwner);
    }

    function createProperty(
        string memory _title,
        string memory _description,
        AssetrixEnums.PropertyType _propertyType,
        AssetrixEnums.PropertyUse _propertyUse,
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
        uint256 _tokenPrice,
        uint256 _totalTokens,
        AssetrixEnums.Duration _investmentDuration,
        string[] memory _milestoneTitles,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestonePercentages,
        uint256 _roiPercentage
    ) external nonReentrant returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_developerName).length > 0, "Developer name required");
        require(_developerAddress != address(0), "Invalid developer address");
        require(msg.sender == _developerAddress, "Sender must be the developer");
        require(bytes(_city).length > 0, "City required");
        require(bytes(_state).length > 0, "State required");
        require(bytes(_country).length > 0, "Country required");
        require(_tokenPrice > 0, "Token price must be greater than 0");
        require(_totalTokens > 0, "Total tokens must be greater than 0");
        require(_milestoneTitles.length == _milestoneDescriptions.length && _milestoneTitles.length == _milestonePercentages.length, "Milestone arrays must have matching lengths");
        require(_milestoneTitles.length > 0 && _milestoneTitles.length <= 4, "Maximum 4 milestones allowed");
        require(_roiPercentage > 0 && _roiPercentage <= 100, "ROI percentage must be between 1 and 100");

        propertyCount++;
        AssetrixStructs.Property storage prop = properties[propertyCount];
        prop.propertyId = propertyCount;
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
        prop.tokenPrice = _tokenPrice;
        prop.totalTokens = _totalTokens;
        prop.tokensSold = 0;
        prop.tokensLeft = _totalTokens;
        prop.investmentDuration = _investmentDuration;
        prop.isActive = true;
        prop.isFullyFunded = false;
        prop.ipfsImagesHash = _ipfsImagesHash;
        prop.ipfsMetadataHash = _ipfsMetadataHash;
        prop.roiPercentage = _roiPercentage;
        developerProperties[msg.sender].push(propertyCount);

        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _milestoneTitles.length; i++) {
            require(_milestonePercentages[i] > 0 && _milestonePercentages[i] <= 100, "Invalid milestone percentage");
            totalPercentage += _milestonePercentages[i];
            prop.milestones.push(AssetrixStructs.Milestone({
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
            emit MilestoneCreated(propertyCount, i, _milestoneTitles[i], _milestonePercentages[i]);
        }
        require(totalPercentage <= 100, "Total milestone percentage cannot exceed 100%");
        emit PropertyCreated(propertyCount, msg.sender, _title);
        return propertyCount;
    }

    function updateProperty(
        uint256 _propertyId,
        string memory _title,
        string memory _description,
        AssetrixEnums.PropertyType _propertyType,
        AssetrixEnums.PropertyUse _propertyUse,
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
    ) external propertyExists(_propertyId) {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(msg.sender == prop.developerAddress || msg.sender == owner(), "Only property developer or owner can update");
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
        delete prop.milestones;
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _milestoneTitles.length; i++) {
            require(_milestonePercentages[i] > 0 && _milestonePercentages[i] <= 100, "Invalid milestone percentage");
            totalPercentage += _milestonePercentages[i];
            prop.milestones.push(AssetrixStructs.Milestone({
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

    function deactivateProperty(uint256 _propertyId) external propertyExists(_propertyId) {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(msg.sender == prop.developerAddress || msg.sender == owner(), "Unauthorized");
        require(!prop.isFullyFunded, "Cannot deactivate a fully funded property");
        prop.isActive = false;
        emit PropertyDeactivated(_propertyId);
    }

    // ============ PROPERTY QUERIES ============
    // function getProperty(uint256 _propertyId) public view propertyExists(_propertyId) returns (AssetrixStructs.Property memory) {
    //     return properties[_propertyId];
    // }

    function getProperty(uint256 _propertyId) public view propertyExists(_propertyId) returns (AssetrixStructs.PropertyView memory) {
    AssetrixStructs.Property storage prop = properties[_propertyId];
    return AssetrixStructs.PropertyView({
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

    function getPropertiesByDeveloper(address _developer) external view returns (AssetrixStructs.PropertyView[] memory) {
        uint256[] memory propertyIds = developerProperties[_developer];
        AssetrixStructs.PropertyView[] memory result = new AssetrixStructs.PropertyView[](propertyIds.length);
        for (uint256 i = 0; i < propertyIds.length; i++) {
            AssetrixStructs.Property storage prop = properties[propertyIds[i]];
            result[i] = AssetrixStructs.PropertyView({
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
        return result;
    }

    function getTotalProperties() external view returns (uint256) {
        return propertyCount;
    }

    function getPropertyMilestones(uint256 _propertyId) external view propertyExists(_propertyId) returns (AssetrixStructs.Milestone[] memory) {
        return properties[_propertyId].milestones;
    }
} 