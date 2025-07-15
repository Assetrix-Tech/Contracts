// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./AssetrixStorage.sol";
import "./AssetrixMilestoneManagement.sol";
import "../libraries/AssetrixStructs.sol";
import "../libraries/AssetrixEnums.sol";
import "../libraries/AssetrixConstants.sol";
import "../libraries/AssetrixUtils.sol";
import "../interfaces/IAssetrixEvents.sol";

abstract contract AssetrixPropertyManagement is ReentrancyGuardUpgradeable, IAssetrixEvents {
    
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
        uint256 _amountToRaise,
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
        require(_amountToRaise > 0, "Amount to raise must be greater than 0");
        require(_amountToRaise % globalTokenPrice == 0, "Amount must be divisible by token price");
        require(_roiPercentage > 0 && _roiPercentage <= 100, "ROI percentage must be between 1 and 100");
        require(_milestoneTitles.length == _milestoneDescriptions.length && 
                _milestoneTitles.length == _milestonePercentages.length, 
                "Milestone arrays must have matching lengths");
        require(_milestoneTitles.length > 0 && _milestoneTitles.length <= AssetrixConstants.MAX_MILESTONES, 
                "Maximum 4 milestones allowed");

        uint256 calculatedTokens = AssetrixUtils.calculateTokensFromAmount(_amountToRaise, globalTokenPrice);
        require(calculatedTokens >= AssetrixConstants.MIN_TOKENS_PER_PROPERTY && 
                calculatedTokens <= AssetrixConstants.MAX_TOKENS_PER_PROPERTY, 
                "Calculated token count out of bounds");

        propertyCount++;
        AssetrixStructs.Property storage prop = properties[propertyCount];

        _setupPropertyDetails(prop, propertyCount, _title, _description, _propertyType, _propertyUse, 
                             _developerName, _developerAddress, _city, _state, _country, _size, 
                             _bedrooms, _bathrooms, _ipfsImagesHash, _ipfsMetadataHash, 
                             calculatedTokens, _investmentDuration, _roiPercentage);

        _createMilestones(prop, propertyCount, _milestoneTitles, _milestoneDescriptions, _milestonePercentages);

        developerProperties[msg.sender].push(propertyCount);
        emit PropertyCreated(propertyCount, msg.sender, _title);
        return propertyCount;
    }

    function _setupPropertyDetails(
        AssetrixStructs.Property storage prop,
        uint256 propertyId,
        string memory _title,
        string memory _description,
        AssetrixEnums.PropertyType _propertyType,
        AssetrixEnums.PropertyUse _propertyUse,
        string memory _developerName,
        address _developerAddress,
        string memory _city,
        string memory _state,
        string memory _country,
        uint256 _size,
        uint256 _bedrooms,
        uint256 _bathrooms,
        string memory _ipfsImagesHash,
        string memory _ipfsMetadataHash,
        uint256 calculatedTokens,
        AssetrixEnums.Duration _investmentDuration,
        uint256 _roiPercentage
    ) internal {
        prop.propertyId = propertyId;
        prop.title = _title;
        prop.description = _description;
        prop.propertyType = _propertyType;
        prop.propertyUse = _propertyUse;
        prop.developer = _developerName;
        prop.developerAddress = _developerAddress;
        prop.createdAt = block.timestamp;
        prop.city = _city;
        prop.state = _state;
        prop.country = _country;
        prop.size = _size;
        prop.bedrooms = _bedrooms;
        prop.bathrooms = _bathrooms;
        prop.tokenPrice = globalTokenPrice;
        prop.totalTokens = calculatedTokens;
        prop.tokensSold = 0;
        prop.tokensLeft = calculatedTokens;
        prop.investmentDuration = _investmentDuration;
        prop.isActive = true;
        prop.isFullyFunded = false;
        prop.ipfsImagesHash = _ipfsImagesHash;
        prop.ipfsMetadataHash = _ipfsMetadataHash;
        prop.roiPercentage = _roiPercentage;
    }

    function _createMilestones(
        AssetrixStructs.Property storage prop,
        uint256 propertyId,
        string[] memory _milestoneTitles,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestonePercentages
    ) internal {
        require(AssetrixUtils.validateMilestonePercentages(_milestonePercentages), 
                "Invalid milestone percentages");

        for (uint256 i = 0; i < _milestoneTitles.length; i++) {
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

            emit MilestoneCreated(propertyId, i, _milestoneTitles[i], _milestonePercentages[i]);
        }
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
        
        require(msg.sender == prop.developerAddress, "Only property developer can update");
        require(!prop.isFullyFunded, "Cannot update a fully funded property");
        require(_milestoneTitles.length == _milestoneDescriptions.length &&
                _milestoneTitles.length == _milestonePercentages.length,
                "Milestone arrays must have matching lengths");
        require(_milestoneTitles.length <= AssetrixConstants.MAX_MILESTONES, "Maximum 4 milestones allowed");
        require(_roiPercentage > 0 && _roiPercentage <= 100, "ROI percentage must be between 1 and 100");

        // Update property details
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

        // Update milestones
        delete prop.milestones;
        _createMilestones(prop, _propertyId, _milestoneTitles, _milestoneDescriptions, _milestonePercentages);
       // require(_milestonePercentage <= 100, "Total milestone percentage cannot exceed 100%");
        emit PropertyUpdated(_propertyId, _ipfsMetadataHash);
    }

    function deactivateProperty(uint256 _propertyId) external propertyExists(_propertyId) {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(msg.sender == prop.developerAddress, "Unauthorized");
        require(!prop.isFullyFunded, "Cannot deactivate a fully funded property");

        prop.isActive = false;
        emit PropertyDeactivated(_propertyId);
    }

     function getProperties(
        uint256 _offset,
        uint256 _limit
    ) external view returns (uint256[] memory propertyIds, uint256 totalCount) {
        require(_limit > 0 && _limit <= 50, "Limit must be between 1 and 50");

        totalCount = propertyCount;
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

    function getProperty(
        uint256 _propertyId
    ) public view returns (AssetrixStructs.PropertyView memory) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );

        AssetrixStructs.Property storage prop = properties[_propertyId];

        return
            AssetrixStructs.PropertyView({
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

     function getMyProperties() external view returns (AssetrixStructs.PropertyView[] memory) {
        uint256[] memory propertyIds = developerProperties[msg.sender];
        AssetrixStructs.PropertyView[] memory result = new AssetrixStructs.PropertyView[](propertyIds.length);

        for (uint256 i = 0; i < propertyIds.length; i++) {
            uint256 propertyId = propertyIds[i];
            require(
                propertyId > 0 && propertyId <= propertyCount,
                "Invalid property ID"
            );

            AssetrixStructs.Property storage prop = properties[propertyId];

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

     function getMyTokenProperties()
        external
        view
        returns (AssetrixStructs.PropertyView[] memory)
    {
        uint256[] memory propertyIds = tokenHolderProperties[msg.sender];
        AssetrixStructs.PropertyView[] memory result = new AssetrixStructs.PropertyView[](propertyIds.length);

        for (uint256 i = 0; i < propertyIds.length; i++) {
            uint256 propertyId = propertyIds[i];
            require(
                propertyId > 0 && propertyId <= propertyCount,
                "Invalid property ID"
            );

            AssetrixStructs.Property storage prop = properties[propertyId];

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

     function getDeveloperPropertyCount(
        address _developer
    ) external view returns (uint256) {
        return developerProperties[_developer].length;
    }


     function getDeveloperProperties(
        address _developer
    ) external view returns (AssetrixStructs.PropertyView[] memory) {
        uint256[] memory propertyIds = developerProperties[_developer];
        AssetrixStructs.PropertyView[] memory result = new AssetrixStructs.PropertyView[](propertyIds.length);

        for (uint256 i = 0; i < propertyIds.length; i++) {
            uint256 propertyId = propertyIds[i];
            require(
                propertyId > 0 && propertyId <= propertyCount,
                "Invalid property ID"
            );

            AssetrixStructs.Property storage prop = properties[propertyId];

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

    function getPropertyTokenHolders(
        uint256 _propertyId
    ) external view returns (address[] memory) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
       AssetrixStructs.Property storage prop = properties[_propertyId];
        return prop.tokenHolders;
    }

    function _removeTokenHolderFromProperty(uint256 _propertyId, address _tokenHolder) internal {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        // Remove from token holders array
        for (uint256 i = 0; i < prop.tokenHolders.length; i++) {
            if (prop.tokenHolders[i] == _tokenHolder) {
                prop.tokenHolders[i] = prop.tokenHolders[prop.tokenHolders.length - 1];
                prop.tokenHolders.pop();
                break;
            }
        }
        // Remove from token holder properties
        uint256[] storage tokenHolderProps = tokenHolderProperties[_tokenHolder];
        for (uint256 i = 0; i < tokenHolderProps.length; i++) {
            if (tokenHolderProps[i] == _propertyId) {
                tokenHolderProps[i] = tokenHolderProps[tokenHolderProps.length - 1];
                tokenHolderProps.pop();
                break;
            }
        }
        // Clear token balance
        prop.tokenBalance[_tokenHolder] = 0;
        prop.holderCount--;
    }


}

