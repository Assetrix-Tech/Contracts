// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";

/**
 * @title EIP2771Context
 * @dev Base contract for EIP-2771 support
 * Provides functionality to extract the real sender from trusted forwarder calls
 */
contract EIP2771Context {
    using AssetrixStorage for AssetrixStorage.Layout;

    /**
     * @dev Get the real sender address
     * If the transaction is coming through a trusted forwarder, extract the real sender
     * Otherwise, return msg.sender
     * @return The real sender address
     */
    function _msgSender() internal view returns (address) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        
        // Check if we have a trusted forwarder set
        if (s.trustedForwarder != address(0)) {
            // Check if the current sender is the trusted forwarder
            if (msg.sender == s.trustedForwarder) {
                // Extract the real sender from calldata
                return _extractSenderFromCalldata();
            }
        }
        
        // If no trusted forwarder or not coming through forwarder, return msg.sender
        return msg.sender;
    }

    /**
     * @dev Extract the real sender from calldata
     * The first 4 bytes are the function selector
     * The next 32 bytes should contain the sender address
     * @return The real sender address
     */
    function _extractSenderFromCalldata() internal pure returns (address) {
        // Check if we have enough data
        if (msg.data.length < 36) {
            return address(0);
        }
        
        address sender;
        assembly {
            // Load the sender address from calldata (after function selector)
            sender := shr(96, calldataload(4))
        }
        
        return sender;
    }

    /**
     * @dev Get the trusted forwarder address
     * @return The trusted forwarder address
     */
    function getTrustedForwarder() external view returns (address) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.trustedForwarder;
    }

    /**
     * @dev Check if the current transaction is coming through a trusted forwarder
     * @return True if coming through trusted forwarder, false otherwise
     */
    function isTrustedForwarder() internal view returns (bool) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.trustedForwarder != address(0) && msg.sender == s.trustedForwarder;
    }
}
