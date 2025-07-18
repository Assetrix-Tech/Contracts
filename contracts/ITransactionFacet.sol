// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";

interface ITransactionFacet {
    function recordTransaction(
        uint256 _propertyId,
        address _from,
        address _to,
        AssetrixStorage.TransactionType _type,
        uint256 _amount,
        string memory _description
    ) external;
} 