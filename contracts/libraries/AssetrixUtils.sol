// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "./AssetrixEnums.sol";
import "./AssetrixStructs.sol";

import "../modules/AssetrixStorage.sol";

library AssetrixUtils {
    function getDurationInSeconds(AssetrixEnums.Duration _duration) internal pure returns (uint256) {
        if (_duration == AssetrixEnums.Duration.OneMonth) return 30 days;
        if (_duration == AssetrixEnums.Duration.ThreeMonths) return 90 days;
        if (_duration == AssetrixEnums.Duration.FiveMonths) return 150 days;
        if (_duration == AssetrixEnums.Duration.SevenMonths) return 210 days;
        if (_duration == AssetrixEnums.Duration.EightMonths) return 240 days;
        if (_duration == AssetrixEnums.Duration.NineMonths) return 270 days;
        if (_duration == AssetrixEnums.Duration.TenMonths) return 300 days;
        if (_duration == AssetrixEnums.Duration.TwelveMonths) return 365 days;
        revert("Invalid duration");
    }

    function validateMilestonePercentages(uint256[] memory _percentages) internal pure returns (bool) {
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _percentages.length; i++) {
            if (_percentages[i] == 0 || _percentages[i] > 100) {
                return false;
            }
            totalPercentage += _percentages[i];
        }
        return totalPercentage <= 100;
    }

    function calculateTokensFromAmount(uint256 _amount, uint256 _tokenPrice) internal pure returns (uint256) {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount % _tokenPrice == 0, "Amount must be divisible by token price");
        return _amount / _tokenPrice;
    }

    function calculateAmountFromTokens(uint256 _tokens, uint256 _tokenPrice) internal pure returns (uint256) {
        return _tokens * _tokenPrice;
    }

    function calculateROI(uint256 _investmentAmount, uint256 _roiPercentage) internal pure returns (uint256) {
        return (_investmentAmount * _roiPercentage) / 100;
    }

    function calculateEarlyExitFee(uint256 investmentAmount) internal pure returns (uint256) {
        return (investmentAmount * 5) / 100;
    }

    function calculateRefundAmount(uint256 investmentAmount, uint256 exitFee) internal pure returns (uint256) {
        return investmentAmount - exitFee;
    }

    function getInvestmentEndTime(
        mapping(uint256 => AssetrixStructs.Property) storage properties,
        uint256 _propertyId
    ) public view returns (uint256) {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        uint256 durationInSeconds = getDurationInSeconds(prop.investmentDuration);
        return prop.createdAt + durationInSeconds;
    }

    function toPropertyView(AssetrixStructs.Property storage prop) internal view returns (AssetrixStructs.PropertyView memory) {
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

    function buildMilestones(
        string[] memory titles,
        string[] memory descriptions,
        uint256[] memory percentages
    ) internal pure returns (AssetrixStructs.Milestone[] memory milestones, uint256 totalPercentage) {
        require(
            titles.length == descriptions.length && titles.length == percentages.length,
            "Milestone arrays must have matching lengths"
        );
        require(titles.length > 0 && titles.length <= 4, "Maximum 4 milestones allowed");
        milestones = new AssetrixStructs.Milestone[](titles.length);
        totalPercentage = 0;
        for (uint256 i = 0; i < titles.length; i++) {
            require(percentages[i] > 0 && percentages[i] <= 100, "Invalid milestone percentage");
            totalPercentage += percentages[i];
            milestones[i] = AssetrixStructs.Milestone({
                id: i,
                title: titles[i],
                description: descriptions[i],
                percentage: percentages[i],
                fundsRequested: false,
                fundsReleased: false,
                isCompleted: false,
                completedAt: 0,
                requestedAt: 0,
                releasedAt: 0
            });
        }
        require(totalPercentage <= 100, "Total milestone percentage cannot exceed 100%");
    }

    function removeAddressFromArray(address[] storage array, address toRemove) internal {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == toRemove) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }

    function removeUintFromArray(uint256[] storage array, uint256 toRemove) internal {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == toRemove) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }

    function hasReleasedMilestoneFunds(AssetrixStructs.Milestone[] storage milestones) internal view returns (bool) {
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].fundsReleased) {
                return true;
            }
        }
        return false;
    }
}
