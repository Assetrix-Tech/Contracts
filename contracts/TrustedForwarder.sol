// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";

/**
 * @title TrustedForwarder
 * @dev EIP-2771 Trusted Forwarder for Assetrix Diamond Contract
 */
contract TrustedForwarder {
    using AssetrixStorage for AssetrixStorage.Layout;

    address public immutable diamond;
    mapping(address => bool) public authorizedRelayers;
    
    event RelayerAuthorized(address indexed relayer);
    event RelayerDeauthorized(address indexed relayer);
    event TransactionRelayed(address indexed from, address indexed to, bytes data, bool success);

    constructor(address _diamond) {
        require(_diamond != address(0), "Invalid diamond address");
        diamond = _diamond;
    }

    modifier onlyAuthorizedRelayer() {
        require(authorizedRelayers[msg.sender], "Unauthorized relayer");
        _;
    }

    function authorizeRelayer(address _relayer) external {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(msg.sender == s.owner, "Only owner can authorize relayers");
        require(_relayer != address(0), "Invalid relayer address");
        
        authorizedRelayers[_relayer] = true;
        emit RelayerAuthorized(_relayer);
    }

    function deauthorizeRelayer(address _relayer) external {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(msg.sender == s.owner, "Only owner can deauthorize relayers");
        
        authorizedRelayers[_relayer] = false;
        emit RelayerDeauthorized(_relayer);
    }

    function forward(bytes calldata _data) external onlyAuthorizedRelayer returns (bool success, bytes memory result) {
        address realSender = _extractSender(_data);
        require(realSender != address(0), "Invalid sender");

        (success, result) = diamond.call(_data);
        
        emit TransactionRelayed(realSender, diamond, _data, success);
        
        return (success, result);
    }

    function _extractSender(bytes calldata _data) internal pure returns (address) {
        require(_data.length >= 36, "Invalid data length");
        
        address sender;
        assembly {
            sender := shr(96, calldataload(4))
        }
        
        return sender;
    }

    function getSender(bytes calldata _data) external pure returns (address) {
        return _extractSender(_data);
    }

    function isAuthorizedRelayer(address _relayer) external view returns (bool) {
        return authorizedRelayers[_relayer];
    }
}
