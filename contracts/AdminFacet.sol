// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AdminFacet {
    using AssetrixStorage for AssetrixStorage.Layout;

    event StablecoinUpdated(address indexed newStablecoin);
    event GlobalTokenPriceUpdated(uint256 newTokenPrice);
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event Paused(address account);
    event Unpaused(address account);
    event AdminFeePercentageUpdated(uint256 newFeePercentage);
    event EarlyExitFeePercentageUpdated(uint256 newFeePercentage);
    event MinTokensPerPropertyUpdated(uint256 newValue);
    event MaxTokensPerPropertyUpdated(uint256 newValue);
    event MinTokensPerInvestmentUpdated(uint256 newValue);
    event StablecoinWithdrawn(address indexed to, uint256 amount);
    event BackendSignerUpdated(address indexed oldSigner, address indexed newSigner);

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

    bool private initialized;

    // Initialize the ownership of the contract
    function initializeOwnership(address _owner) external {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(s.owner == address(0), "Already initialized");
        require(_owner != address(0), "Invalid owner address");
        s.owner = _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(
            newOwner != address(0),
            "Ownable: new owner is the zero address"
        );
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        address oldOwner = s.owner;
        s.owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    function pause() external onlyOwner {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(!s.paused, "Pausable: already paused");
        s.paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(s.paused, "Pausable: not paused");
        s.paused = false;
        emit Unpaused(msg.sender);
    }

    function setStablecoin(
        address _newStablecoin
    ) external onlyOwner whenNotPaused {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(_newStablecoin != address(0), "Invalid address");
        require(_newStablecoin.code.length > 0, "Not a contract address");
        s.stablecoin = _newStablecoin;
        emit StablecoinUpdated(_newStablecoin);
    }

    function setGlobalTokenPrice(
        uint256 _newTokenPrice
    ) external onlyOwner whenNotPaused {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(_newTokenPrice > 0, "Token price must be greater than 0");
        s.globalTokenPrice = _newTokenPrice;
        emit GlobalTokenPriceUpdated(_newTokenPrice);
    }

    //Set admin fee percentage
    function setAdminFeePercentage(
        uint256 _newFeePercentage
    ) external onlyOwner whenNotPaused {
        require(_newFeePercentage <= 10, "Fee cannot exceed 10%");

        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            _newFeePercentage + s.earlyExitFeePercentage <= 20,
            "Total fees cannot exceed 20%"
        );

        s.adminFeePercentage = _newFeePercentage;
        emit AdminFeePercentageUpdated(_newFeePercentage);
    }

    //Set the early exit fee percentage for users who exit before the investment duration
    function setEarlyExitFeePercentage(
        uint256 _newFeePercentage
    ) external onlyOwner whenNotPaused {
        require(_newFeePercentage <= 10, "Fee cannot exceed 10%");

        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            _newFeePercentage + s.adminFeePercentage <= 20,
            "Total fees cannot exceed 20%"
        );

        s.earlyExitFeePercentage = _newFeePercentage;
        emit EarlyExitFeePercentageUpdated(_newFeePercentage);
    }

    // Set the minimum number of tokens required for any property
    function setMinTokensPerProperty(
        uint256 value
    ) external onlyOwner whenNotPaused {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(value > 0, "Minimum must be greater than 0");
        s.minTokensPerProperty = value;
        emit MinTokensPerPropertyUpdated(value);
    }

    // Set the maximum number of tokens allowed per property
    function setMaxTokensPerProperty(
        uint256 value
    ) external onlyOwner whenNotPaused {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(value > 0, "Maximum must be greater than 0");
        s.maxTokensPerProperty = value;
        emit MaxTokensPerPropertyUpdated(value);
    }

    // Set the minimum number of tokens an investor can purchase per investment
    function setMinTokensPerInvestment(
        uint256 value
    ) external onlyOwner whenNotPaused {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(value > 0, "Minimum must be greater than 0");
        s.minTokensPerInvestment = value;
        emit MinTokensPerInvestmentUpdated(value);
    }

    //Get min tokens per property
    function getMinTokensPerProperty() external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.minTokensPerProperty;
    }

    //Get max tokens per property
    function getMaxTokensPerProperty() external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.maxTokensPerProperty;
    }

    //Get min tokens per investment
    function getMinTokensPerInvestment() external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.minTokensPerInvestment;
    }

    function initialize(
        address _owner,
        address _stablecoin,
        uint256 _initialTokenPrice
    ) external {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(!initialized, "Already initialized");
        require(_owner != address(0), "Invalid owner address");
        require(_stablecoin != address(0), "Invalid stablecoin address");
        require(_initialTokenPrice > 0, "Invalid token price");

        initialized = true;
        s.owner = _owner;
        s.stablecoin = _stablecoin;
        s.globalTokenPrice = _initialTokenPrice;
        s.paused = false;
        s.reentrancyStatus = 1;

        // Set default values for token limits to ensure contract works immediately
        s.minTokensPerProperty = 1;
        s.maxTokensPerProperty = 1000000;
        s.minTokensPerInvestment = 1;
        s.adminFeePercentage = 3;
        s.earlyExitFeePercentage = 5;

        emit OwnershipTransferred(address(0), _owner);
        emit StablecoinUpdated(_stablecoin);
        emit GlobalTokenPriceUpdated(_initialTokenPrice);
        emit AdminFeePercentageUpdated(s.adminFeePercentage);
        emit EarlyExitFeePercentageUpdated(s.earlyExitFeePercentage);
        emit MinTokensPerPropertyUpdated(s.minTokensPerProperty);
        emit MaxTokensPerPropertyUpdated(s.maxTokensPerProperty);
        emit MinTokensPerInvestmentUpdated(s.minTokensPerInvestment);
    }

    // ============ VIEW FUNCTIONS ============
    function getGlobalTokenPrice() external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.globalTokenPrice;
    }

    function getStablecoin() external view returns (address) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.stablecoin;
    }

    function getAdminFeePercentage() external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.adminFeePercentage;
    }

    function getEarlyExitFeePercentage() external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.earlyExitFeePercentage;
    }

    // Get the owner address (Which is the contract owner)
    function owner() external view returns (address) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.owner;
    }

    // Get the paused status
    function paused() external view returns (bool) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.paused;
    }

    // Emergency withdrawal function for admin to recover stablecoin funds
    function withdrawStablecoin(
        address _to,
        uint256 _amount
    ) external onlyOwner whenNotPaused nonReentrant {
        require(_to != address(0), "Invalid recipient address");
        require(_amount > 0, "Amount must be greater than 0");

        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(s.stablecoin != address(0), "Stablecoin not set");

        IERC20 stablecoin = IERC20(s.stablecoin);
        require(
            stablecoin.balanceOf(address(this)) >= _amount,
            "Insufficient stablecoin balance"
        );

        require(
            stablecoin.transfer(_to, _amount),
            "Stablecoin transfer failed"
        );

        emit StablecoinWithdrawn(_to, _amount);
    }

    // ============ BACKEND SIGNER MANAGEMENT ============

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
}
