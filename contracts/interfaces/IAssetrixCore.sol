// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "../libraries/AssetrixStructs.sol";
import "../libraries/AssetrixEnums.sol";

interface IAssetrixCore {
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
    ) external returns (uint256);

    function getProperty(uint256 _propertyId) external view returns (AssetrixStructs.PropertyView memory);
    function getProperties(uint256 _offset, uint256 _limit) external view returns (uint256[] memory, uint256);
    function purchaseTokens(uint256 _propertyId, uint256 _tokenAmount) external;
    function getTotalProperties() external view returns (uint256);
}