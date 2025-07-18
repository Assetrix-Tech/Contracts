// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./modules/AssetrixPropertyManagement.sol";
import "./modules/AssetrixInvestmentManagement.sol";

contract AssetrixTest is AssetrixPropertyManagement, AssetrixInvestmentManagement {
    function initialize(address initialOwner) public initializer {
        __AssetrixPropertyManagement_init(initialOwner);
        __AssetrixInvestmentManagement_init(initialOwner);

    }

    // function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}