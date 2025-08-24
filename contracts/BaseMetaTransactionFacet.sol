// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";

contract BaseMetaTransactionFacet {
    using AssetrixStorage for AssetrixStorage.Layout;

    // Function to get the user address from the calling context
    function msgSender() internal view returns (address sender) {
        if (msg.sender == address(this)) {
            bytes memory array = msg.data;
            uint256 index = msg.data.length;
            assembly {
                // Load the last 20 bytes
                sender := and(
                    mload(add(array, index)),
                    0xffffffffffffffffffffffffffffffffffffffff
                )
            }
        } else {
            sender = msg.sender;
        }
        return sender;
    }

    // Override _msgSender to support meta transactions
    function _msgSender() internal view returns (address) {
        return msgSender();
    }

    // Helper function to get the actual sender (either direct or meta transaction)
    function getActualSender() internal view returns (address) {
        return msgSender();
    }
}
