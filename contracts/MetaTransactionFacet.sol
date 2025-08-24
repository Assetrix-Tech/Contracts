// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AssetrixStorage.sol";

contract MetaTransactionFacet is EIP712 {
    using ECDSA for bytes32;
    using AssetrixStorage for AssetrixStorage.Layout;

    // EIP-2771 Meta Transaction structure
    struct MetaTransaction {
        uint256 nonce;
        address from;
        bytes functionSignature;
        uint256 relayerFee; // Fee to pay the relayer
    }

    bytes32 public constant META_TRANSACTION_TYPEHASH = keccak256(
        "MetaTransaction(uint256 nonce,address from,bytes functionSignature,uint256 relayerFee)"
    );

    event MetaTransactionExecuted(
        address indexed userAddress,
        address indexed relayerAddress,
        bytes functionSignature,
        uint256 relayerFee
    );

    event RelayerFeePaid(
        address indexed relayer,
        address indexed user,
        uint256 amount
    );

    modifier onlyOwner() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(msg.sender == s.owner, "Ownable: caller is not the owner");
        _;
    }

    constructor() EIP712("Assetrix", "1") {}

    // Execute meta transaction with relayer compensation
    function executeMetaTransaction(
        address userAddress,
        bytes memory functionSignature,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV,
        uint256 relayerFee
    ) external payable returns (bytes memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        
        MetaTransaction memory metaTx = MetaTransaction({
            nonce: s.userNonces[userAddress],
            from: userAddress,
            functionSignature: functionSignature,
            relayerFee: relayerFee
        });

        require(
            verify(userAddress, metaTx, sigR, sigS, sigV),
            "Signer and signature do not match"
        );

        // Increase nonce to prevent replay attacks
        s.userNonces[userAddress]++;

        // Pay relayer fee if specified
        if (relayerFee > 0) {
            require(
                msg.value >= relayerFee,
                "Insufficient ETH for relayer fee"
            );
            
            // Transfer fee to relayer
            (bool feeSuccess, ) = payable(msg.sender).call{value: relayerFee}("");
            require(feeSuccess, "Failed to pay relayer fee");
            
            emit RelayerFeePaid(msg.sender, userAddress, relayerFee);
        }

        // Append userAddress at the end to extract it from calling context
        (bool success, bytes memory returnData) = address(this).call(
            abi.encodePacked(functionSignature, userAddress)
        );

        require(success, "Function call not successful");

        emit MetaTransactionExecuted(
            userAddress,
            msg.sender,
            functionSignature,
            relayerFee
        );

        return returnData;
    }

    // Execute meta transaction with stablecoin fee
    function executeMetaTransactionWithStablecoinFee(
        address userAddress,
        bytes memory functionSignature,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV,
        uint256 relayerFee
    ) external returns (bytes memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        
        MetaTransaction memory metaTx = MetaTransaction({
            nonce: s.userNonces[userAddress],
            from: userAddress,
            functionSignature: functionSignature,
            relayerFee: relayerFee
        });

        require(
            verify(userAddress, metaTx, sigR, sigS, sigV),
            "Signer and signature do not match"
        );

        // Increase nonce to prevent replay attacks
        s.userNonces[userAddress]++;

        // Pay relayer fee in stablecoins if specified
        if (relayerFee > 0) {
            require(
                s.stablecoin != address(0),
                "Stablecoin not set"
            );
            
            // Transfer stablecoin fee from user to relayer
            IERC20 stablecoin = IERC20(s.stablecoin);
            require(
                stablecoin.transferFrom(userAddress, msg.sender, relayerFee),
                "Failed to transfer relayer fee"
            );
            
            emit RelayerFeePaid(msg.sender, userAddress, relayerFee);
        }

        // Append userAddress at the end to extract it from calling context
        (bool success, bytes memory returnData) = address(this).call(
            abi.encodePacked(functionSignature, userAddress)
        );

        require(success, "Function call not successful");

        emit MetaTransactionExecuted(
            userAddress,
            msg.sender,
            functionSignature,
            relayerFee
        );

        return returnData;
    }

    // Verify the signature
    function verify(
        address user,
        MetaTransaction memory metaTx,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) internal view returns (bool) {
        bytes32 hash = hashMetaTransaction(metaTx);
        bytes32 messageHash = keccak256(abi.encodePacked("\x19\x01", _domainSeparatorV4(), hash));
        address signer = ecrecover(messageHash, sigV, sigR, sigS);
        return signer == user;
    }

    // Hash the meta transaction
    function hashMetaTransaction(MetaTransaction memory metaTx)
        internal
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encode(
                    META_TRANSACTION_TYPEHASH,
                    metaTx.nonce,
                    metaTx.from,
                    keccak256(metaTx.functionSignature),
                    metaTx.relayerFee
                )
            );
    }

    // Get nonce for a user
    function getNonce(address user) external view returns (uint256 nonce) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.userNonces[user];
    }

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

    // Estimate gas cost for meta transaction
    function estimateGasCost() external view returns (uint256) {
        // Base gas cost for meta transaction
        uint256 baseGas = 55000;
        
        // Add gas for signature verification
        uint256 signatureGas = 3000;
        
        // Add gas for nonce increment
        uint256 nonceGas = 2000;
        
        return baseGas + signatureGas + nonceGas;
    }

    // Calculate recommended relayer fee based on current gas price
    function calculateRecommendedFee() external view returns (uint256) {
        uint256 gasCost = this.estimateGasCost();
        uint256 gasPrice = tx.gasprice;
        return gasCost * gasPrice;
    }
}
