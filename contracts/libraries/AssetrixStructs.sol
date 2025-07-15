// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "./AssetrixEnums.sol";

library AssetrixStructs {
    struct Property {
        uint256 propertyId;
        string title;
        string description;
        AssetrixEnums.PropertyType propertyType;
        AssetrixEnums.PropertyUse propertyUse;
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
        AssetrixEnums.Duration investmentDuration;
        bool isActive;
        bool isFullyFunded;
        string ipfsImagesHash;
        string ipfsMetadataHash;
        address[] tokenHolders;
        mapping(address => uint256) tokenBalance;
        uint256 holderCount;
        address developerAddress;
        Milestone[] milestones;
        uint256 createdAt;
        uint256 roiPercentage;
    }

    struct PropertyView {
        uint256 propertyId;
        string title;
        string description;
        AssetrixEnums.PropertyType propertyType;
        AssetrixEnums.PropertyUse propertyUse;
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
        AssetrixEnums.Duration investmentDuration;
        bool isActive;
        bool isFullyFunded;
        string ipfsImagesHash;
        string ipfsMetadataHash;
        address developerAddress;
        uint256 holderCount;
        Milestone[] milestones;
        uint256 roiPercentage;
    }

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

    struct Transaction {
        uint256 transactionId;
        uint256 propertyId;
        address from;
        address to;
        AssetrixEnums.TransactionType transactionType;
        uint256 amount;
        uint256 timestamp;
        string description;
        bool isSuccessful;
        string metadata;
        uint256 blockNumber;
        bytes32 transactionHash;
    }
}
