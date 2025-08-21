// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title TransactionEncoder
 * @dev Utility contract for encoding transactions with sender address for EIP-2771
 */
contract TransactionEncoder {
    function encodeWithSender(
        address _sender,
        bytes4 _functionSelector,
        bytes memory _parameters
    ) external pure returns (bytes memory) {
        return abi.encodePacked(_functionSelector, _sender, _parameters);
    }

    function encodePurchaseTokens(
        address _sender,
        uint256 _propertyId,
        uint256 _tokenAmount
    ) external pure returns (bytes memory) {
        bytes4 selector = bytes4(keccak256("purchaseTokens(uint256,uint256)"));
        bytes memory parameters = abi.encode(_propertyId, _tokenAmount);
        return abi.encodePacked(selector, _sender, parameters);
    }

    function encodeEarlyExit(
        address _sender,
        uint256 _propertyId
    ) external pure returns (bytes memory) {
        bytes4 selector = bytes4(keccak256("earlyExit(uint256)"));
        bytes memory parameters = abi.encode(_propertyId);
        return abi.encodePacked(selector, _sender, parameters);
    }

    function encodeCreateProperty(
        address _sender,
        bytes memory _data
    ) external pure returns (bytes memory) {
        bytes4 selector = bytes4(
            keccak256(
                "createProperty((string,string,uint8,uint8,string,address,string,string,string,string,string,uint256,uint256,uint256,uint8,string[],string[],uint256[],uint256))"
            )
        );
        return abi.encodePacked(selector, _sender, _data);
    }

    function encodeUpdateProperty(
        address _sender,
        uint256 _propertyId,
        bytes memory _data
    ) external pure returns (bytes memory) {
        bytes4 selector = bytes4(
            keccak256(
                "updateProperty(uint256,(string,string,uint8,uint8,string,string,string,string,string,uint256,uint256,uint256,string[],string[],uint256[],uint256))"
            )
        );
        bytes memory parameters = abi.encode(_propertyId, _data);
        return abi.encodePacked(selector, _sender, parameters);
    }

    function encodeDeactivateProperty(
        address _sender,
        uint256 _propertyId
    ) external pure returns (bytes memory) {
        bytes4 selector = bytes4(keccak256("deactivateProperty(uint256)"));
        bytes memory parameters = abi.encode(_propertyId);
        return abi.encodePacked(selector, _sender, parameters);
    }

    function encodeRequestMilestoneFunds(
        address _sender,
        uint256 _propertyId,
        uint256 _milestoneId
    ) external pure returns (bytes memory) {
        bytes4 selector = bytes4(
            keccak256("requestMilestoneFunds(uint256,uint256)")
        );
        bytes memory parameters = abi.encode(_propertyId, _milestoneId);
        return abi.encodePacked(selector, _sender, parameters);
    }

    function encodeMarkMilestoneCompleted(
        address _sender,
        uint256 _propertyId,
        uint256 _milestoneId
    ) external pure returns (bytes memory) {
        bytes4 selector = bytes4(
            keccak256("markMilestoneCompleted(uint256,uint256)")
        );
        bytes memory parameters = abi.encode(_propertyId, _milestoneId);
        return abi.encodePacked(selector, _sender, parameters);
    }
}
