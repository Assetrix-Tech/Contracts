// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

library AssetrixConstants {
    uint256 public constant MIN_TOKENS_PER_PROPERTY = 100;
    uint256 public constant MAX_TOKENS_PER_PROPERTY = 100000;
    uint256 public constant MIN_TOKENS_PER_INVESTMENT = 1;
    uint256 public constant EARLY_EXIT_FEE_PERCENTAGE = 5; // 5%
    uint256 public constant MAX_MILESTONES = 4;
    uint256 public constant MAX_PROPERTIES_PER_QUERY = 50;
}