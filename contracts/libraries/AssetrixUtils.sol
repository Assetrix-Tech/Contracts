// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "./AssetrixEnums.sol";

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
}
