// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";

contract AdminFacet {
    using AssetrixStorage for AssetrixStorage.Layout;

    event StablecoinUpdated(address indexed newStablecoin);
    event GlobalTokenPriceUpdated(uint256 newTokenPrice);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(address account);
    event Unpaused(address account);

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
        require(s.reentrancyStatus != _ENTERED, "ReentrancyGuard: reentrant call");
        s.reentrancyStatus = _ENTERED;
        _;
        s.reentrancyStatus = _NOT_ENTERED;
    }

    function initializeOwnership(address _owner) external {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(s.owner == address(0), "Already initialized");
        s.owner = _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
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

    function setStablecoin(address _newStablecoin) external onlyOwner {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(_newStablecoin != address(0), "Invalid address");
        require(_newStablecoin.code.length > 0, "Not a contract address");
        s.stablecoin = _newStablecoin;
        emit StablecoinUpdated(_newStablecoin);
    }

    function setGlobalTokenPrice(uint256 _newTokenPrice) external onlyOwner {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(_newTokenPrice > 0, "Token price must be greater than 0");
        s.globalTokenPrice = _newTokenPrice;
        emit GlobalTokenPriceUpdated(_newTokenPrice);
    }

    function initialize(address _owner, address _stablecoin, uint256 _initialTokenPrice) external {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(s.owner == address(0), "Already initialized");
        require(_owner != address(0), "Invalid owner address");
        require(_stablecoin != address(0), "Invalid stablecoin address");
        require(_initialTokenPrice > 0, "Invalid token price");
        s.owner = _owner;
        s.stablecoin = _stablecoin;
        s.globalTokenPrice = _initialTokenPrice;
        s.paused = false;
        s.reentrancyStatus = 1;
        emit OwnershipTransferred(address(0), _owner);
        emit StablecoinUpdated(_stablecoin);
        emit GlobalTokenPriceUpdated(_initialTokenPrice);
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
    
    function owner() external view returns (address) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.owner;
    }
    
    function paused() external view returns (bool) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.paused;
    }
} 