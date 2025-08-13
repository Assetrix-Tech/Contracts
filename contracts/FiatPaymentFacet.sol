// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AssetrixStorage.sol";
import "./ITransactionFacet.sol";

contract FiatPaymentFacet {
    using AssetrixStorage for AssetrixStorage.Layout;

    // Fiat payment events
    event FiatPaymentProcessed(
        uint256 indexed propertyId,
        address indexed user,
        uint256 tokenAmount,
        uint256 fiatAmount,
        string paymentReference,
        uint256 timestamp
    );

    event BackendSignerUpdated(
        address indexed oldSigner,
        address indexed newSigner
    );

    event PropertyFullyFunded(
        uint256 indexed propertyId,
        uint256 totalTokensSold
    );

    event TokensPurchased(
        uint256 indexed propertyId,
        address indexed tokenHolder,
        uint256 tokenAmount,
        uint256 totalCost
    );

    modifier onlyOwner() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(msg.sender == s.owner, "Ownable: caller is not the owner");
        _;
    }

    modifier whenNotPaused() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(!s.paused, "Pausable: paused");
        _;
    }

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    modifier nonReentrant() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            s.reentrancyStatus != _ENTERED,
            "ReentrancyGuard: reentrant call"
        );
        s.reentrancyStatus = _ENTERED;
        _;
        s.reentrancyStatus = _NOT_ENTERED;
    }

    // EIP-712 Constants
    bytes32 public constant FIAT_PAYMENT_TYPEHASH =
        keccak256(
            "FiatPayment(address user,uint256 propertyId,uint256 tokenAmount,uint256 fiatAmount,string paymentReference,uint256 nonce)"
        );

    // Initialize EIP-712 domain separator (only owner can call this)
    function initializeDomainSeparator() external onlyOwner {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            !s.domainSeparatorInitialized,
            "Domain separator already initialized"
        );

        // Add chain ID validation and use proper domain separator format
        uint256 chainId = block.chainid;
        require(chainId > 0, "Invalid chain ID");

        s.domainSeparator = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("Assetrix")),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );
        s.domainSeparatorInitialized = true;
    }

    // Get domain separator
    function getDomainSeparator() external view returns (bytes32) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.domainSeparator;
    }

    // function to reset domain separator (only owner, for security updates)
    function resetDomainSeparator() external onlyOwner {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            s.domainSeparatorInitialized,
            "Domain separator not initialized"
        );

        // Reset to allow re-initialization
        s.domainSeparatorInitialized = false;
        s.domainSeparator = bytes32(0);
    }

    // Set backend signer (only owner can change)
    function setBackendSigner(address _backendSigner) external onlyOwner {
        require(_backendSigner != address(0), "Invalid backend signer address");
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        address oldSigner = s.backendSigner;
        s.backendSigner = _backendSigner;
        emit BackendSignerUpdated(oldSigner, _backendSigner);
    }

    // Get backend signer
    function getBackendSigner() external view returns (address) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.backendSigner;
    }

    // Main fiat-to-token distribution function
    function distributeTokensFromFiat(
        uint256 _propertyId,
        address _user,
        uint256 _tokenAmount,
        uint256 _fiatAmount,
        string memory _paymentReference,
        uint256 _nonce,
        bytes memory _signature
    ) external whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];

        require(
            msg.sender == _user || msg.sender == s.backendSigner,
            "Unauthorized caller"
        );

        require(_user != address(0), "Invalid user address");
        require(_tokenAmount > 0, "Token amount must be greater than 0");
        require(_fiatAmount > 0, "Fiat amount must be greater than 0");
        require(
            bytes(_paymentReference).length > 0,
            "Payment reference required"
        );
        require(
            !s.processedFiatPayments[_paymentReference],
            "Payment already processed"
        );
        require(s.userNonces[_user] == _nonce, "Invalid nonce");

        require(
            _propertyId > 0 && _propertyId <= s.propertyCount,
            "Property does not exist"
        );
        require(prop.isActive, "Property is not active");
        require(_tokenAmount <= prop.tokensLeft, "Not enough tokens left");

        require(_tokenAmount <= 10000000, "Token amount exceeds maximum limit");

        // Verify backend signature using EIP-712
        bool isValidSignature = verifyBackendSignature(
            _user,
            _propertyId,
            _tokenAmount,
            _fiatAmount,
            _paymentReference,
            _nonce,
            _signature
        );

        require(isValidSignature, "Invalid backend signature");

        // Mark payment as processed
        s.processedFiatPayments[_paymentReference] = true;
        s.userNonces[_user]++;

        // Calculate expected token price
        uint256 expectedCost = _tokenAmount * prop.tokenPrice;
        require(
            _fiatAmount >= expectedCost,
            "Insufficient fiat amount for tokens"
        );

        require(
            prop.tokensSold + _tokenAmount >= prop.tokensSold,
            "Overflow in tokens sold"
        );
        require(prop.tokensLeft >= _tokenAmount, "Overflow in tokens left");

        // Process token distribution (same logic as purchaseTokens but without stablecoin transfer)
        if (prop.tokenBalance[_user] == 0) {
            prop.tokenHolders.push(_user);
            prop.holderCount++;
            s.tokenHolderProperties[_user].push(_propertyId);
        }

        prop.tokenBalance[_user] += _tokenAmount;
        prop.tokensSold += _tokenAmount;
        prop.tokensLeft -= _tokenAmount;

        if (prop.tokensLeft == 0) {
            prop.isFullyFunded = true;
            emit PropertyFullyFunded(_propertyId, prop.tokensSold);
        }

        // Record transaction
        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            _user,
            prop.developerAddress,
            AssetrixStorage.TransactionType.Investment,
            expectedCost,
            string(abi.encodePacked("Fiat payment: ", _paymentReference))
        );

        emit FiatPaymentProcessed(
            _propertyId,
            _user,
            _tokenAmount,
            _fiatAmount,
            _paymentReference,
            block.timestamp
        );
        emit TokensPurchased(_propertyId, _user, _tokenAmount, expectedCost);
    }

    // EIP-712 signature verification
    function verifyBackendSignature(
        address _user,
        uint256 _propertyId,
        uint256 _tokenAmount,
        uint256 _fiatAmount,
        string memory _paymentReference,
        uint256 _nonce,
        bytes memory _signature
    ) internal view returns (bool) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(s.backendSigner != address(0), "Backend signer not set");
        require(
            s.domainSeparatorInitialized,
            "Domain separator not initialized"
        );

        // Create struct hash
        bytes32 structHash = keccak256(
            abi.encode(
                FIAT_PAYMENT_TYPEHASH,
                _user,
                _propertyId,
                _tokenAmount,
                _fiatAmount,
                keccak256(bytes(_paymentReference)),
                _nonce
            )
        );

        // Create final hash with domain separator
        bytes32 hash = keccak256(
            abi.encodePacked("\x19\x01", s.domainSeparator, structHash)
        );

        (bytes32 r, bytes32 s_, uint8 v) = splitSignature(_signature);

        require(v == 27 || v == 28, "Invalid signature 'v' value");
        require(
            s_ <=
                0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0,
            "Invalid signature 's' value"
        );

        address signer = ecrecover(hash, v, r, s_);
        require(signer != address(0), "Invalid signature");

        return signer == s.backendSigner;
    }

    // Helper function to split signature
    function splitSignature(
        bytes memory _signature
    ) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(_signature.length == 65, "Invalid signature length");

        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
    }

    // Get user nonce for backend
    function getUserNonce(address _user) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.userNonces[_user];
    }

    // Check if payment was processed
    function isPaymentProcessed(
        string memory _paymentReference
    ) external view returns (bool) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.processedFiatPayments[_paymentReference];
    }

    // function to check domain separator status
    function isDomainSeparatorInitialized() external view returns (bool) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.domainSeparatorInitialized;
    }

    // function to get current chain ID for verification
    function getCurrentChainId() external view returns (uint256) {
        return block.chainid;
    }
}

// Test comment for ABI sync, and hopefully it works.

