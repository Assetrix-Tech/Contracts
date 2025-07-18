// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/AssetrixStructs.sol";

contract AssetrixStorage {
    // ============ STATE VARIABLES ============
    IERC20 public stablecoin;
    uint256 public propertyCount;
    uint256 public transactionCount;
    uint256 public globalTokenPrice;

    // ============ MAPPINGS ============
    mapping(uint256 => AssetrixStructs.Property) public properties;
    mapping(address => uint256[]) public developerProperties;
    mapping(address => uint256[]) public tokenHolderProperties;
    mapping(uint256 => uint256) public releasedFunds;
    mapping(uint256 => AssetrixStructs.Transaction) public transactions;
    mapping(address => uint256[]) public userTransactions;
    mapping(uint256 => uint256[]) public propertyTransactions;

    // ============ MODIFIERS ============
    modifier propertyExists(uint256 _propertyId) {
        require(_propertyId > 0 && _propertyId <= propertyCount, "Don't exist");
        require(properties[_propertyId].isActive, "Not active");
        _;
    }
}
