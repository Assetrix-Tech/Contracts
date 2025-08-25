// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";

contract BaseMetaTransactionFacet {
    using AssetrixStorage for AssetrixStorage.Layout;

    // EIP-2771 compliant sender extraction
    function msgSender() internal view returns (address sender) {
        if (msg.sender == address(this)) {
            // Extract the last 20 bytes from calldata (EIP-2771 standard)
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            sender = msg.sender;
        }
        return sender;
    }

    // Helper function to get the actual sender (either direct or meta transaction)
    function getActualSender() internal view returns (address) {
        return msgSender();
    }
}
