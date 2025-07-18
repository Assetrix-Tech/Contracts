// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixModuleBase.sol";
import "../libraries/AssetrixEnums.sol";
import "../libraries/AssetrixStructs.sol";
import "./AssetrixStorage.sol";
import "../interfaces/IAssetrixEvents.sol";
import "../libraries/AssetrixUtils.sol";

contract AssetrixPropertyManagement is AssetrixModuleBase,AssetrixStorage, IAssetrixEvents {
    using AssetrixEnums for *;
    using AssetrixStructs for *;

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

        (AssetrixStructs.Milestone[] memory milestones, ) = AssetrixUtils.buildMilestones(_milestoneTitles, _milestoneDescriptions, _milestonePercentages);
        for (uint256 i = 0; i < milestones.length; i++) {
            prop.milestones.push(milestones[i]);
            emit MilestoneCreated(propertyCount, i, milestones[i].title, milestones[i].percentage);
        }
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
        (AssetrixStructs.Milestone[] memory milestones, ) = AssetrixUtils.buildMilestones(_milestoneTitles, _milestoneDescriptions, _milestonePercentages);
        for (uint256 i = 0; i < milestones.length; i++) {
            prop.milestones.push(milestones[i]);
            emit MilestoneCreated(_propertyId, i, milestones[i].title, milestones[i].percentage);
        }
        emit PropertyUpdated(_propertyId, _ipfsMetadataHash);
    }

    function deactivateProperty(uint256 _propertyId) external propertyExists(_propertyId) {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(msg.sender == prop.developerAddress || msg.sender == owner(), "Unauthorized");
        require(!prop.isFullyFunded, "Cannot deactivate a fully funded property");
        prop.isActive = false;
        emit PropertyDeactivated(_propertyId);
    }

    // function getProperty(uint256 _propertyId) public view propertyExists(_propertyId) returns (AssetrixStructs.PropertyView memory) {
    //     AssetrixStructs.Property storage prop = properties[_propertyId];
    //     return AssetrixUtils.toPropertyView(prop);
    // }

    // function getPropertiesByDeveloper(address _developer) external view returns (AssetrixStructs.PropertyView[] memory) {
    //     uint256[] memory propertyIds = developerProperties[_developer];
    //     AssetrixStructs.PropertyView[] memory result = new AssetrixStructs.PropertyView[](propertyIds.length);
    //     for (uint256 i = 0; i < propertyIds.length; i++) {
    //         AssetrixStructs.Property storage prop = properties[propertyIds[i]];
    //         result[i] = AssetrixUtils.toPropertyView(prop);
    //     }
    //     return result;
    // }

    function getTotalProperties() external view returns (uint256) {
        return propertyCount;
    }

    // function getPropertyMilestones(uint256 _propertyId) external view propertyExists(_propertyId) returns (AssetrixStructs.Milestone[] memory) {
    //     return properties[_propertyId].milestones;
    // }
} 