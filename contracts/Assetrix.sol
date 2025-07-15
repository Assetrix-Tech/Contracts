// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Module interfaces and bases
import "./modules/AssetrixModuleBase.sol";
import "./modules/AssetrixStorage.sol";
import "./modules/AssetrixPropertyManagement.sol";
import "./modules/AssetrixInvestment.sol";
import "./modules/AssetrixMilestoneManagement.sol";
import "./interfaces/IAssetrixCore.sol";
import "./interfaces/IAssetrixEvents.sol";

contract AssetrixTest is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    AssetrixStorage,
    AssetrixPropertyManagement,
    AssetrixInvestment,
    AssetrixMilestoneManagement,
    IAssetrixCore,
    IAssetrixEvents
{
    using SafeERC20 for IERC20;

    /// @notice Stablecoin used for investments and rent
    IERC20 public stablecoin;

    /// @notice Initialize all modules and set stablecoin
    function initialize(address _stablecoin) public initializer {
        // Parent initializers
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __AssetrixModuleBase_init();
        __AssetrixStorage_init();
        __AssetrixPropertyManagement_init();
        __AssetrixInvestment_init();
        __AssetrixMilestoneManagement_init();

        // Stablecoin setup
        require(_stablecoin != address(0), "Invalid stablecoin");
        require(_stablecoin.code.length > 0, "Not a contract");
        stablecoin = IERC20(_stablecoin);
        emit StablecoinUpdated(_stablecoin);
    }

    /// @dev Only owner may upgrade the implementation (UUPS)
    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ===== Admin Functions =====

    function setStablecoin(address _new) external onlyOwner {
        require(_new != address(0), "Invalid address");
        require(_new.code.length > 0, "Not a contract");
        stablecoin = IERC20(_new);
        emit StablecoinUpdated(_new);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(0), "Invalid token");
        require(_amount > 0, "Amount must be >0");
        if (_token == address(stablecoin)) {
            require(stablecoin.transfer(owner(), _amount), "Transfer failed");
        } else {
            IERC20(_token).safeTransfer(owner(), _amount);
        }
    }

    // ===== Transaction History =====

    function getUserTransactionHistory(address _user)
        external
        view
        returns (AssetrixStructs.Transaction[] memory)
    {
        uint256[] memory txIds = userTransactions[_user];
        AssetrixStructs.Transaction[] memory result = new AssetrixStructs.Transaction[](txIds.length);
        for (uint256 i = 0; i < txIds.length; i++) {
            result[i] = transactions[txIds[i]];
        }
        return result;
    }

    function getPropertyTransactionHistory(uint256 _propertyId)
        external
        view
        returns (AssetrixStructs.Transaction[] memory)
    {
        uint256[] memory txIds = propertyTransactions[_propertyId];
        AssetrixStructs.Transaction[] memory result = new AssetrixStructs.Transaction[](txIds.length);
        for (uint256 i = 0; i < txIds.length; i++) {
            result[i] = transactions[txIds[i]];
        }
        return result;
    }

    function getTransaction(uint256 _txId)
        external
        view
        returns (AssetrixStructs.Transaction memory)
    {
        require(_txId > 0 && _txId <= transactionCount, "Tx does not exist");
        return transactions[_txId];
    }

    function getTotalTransactions() external view returns (uint256) {
        return transactionCount;
    }

    // ===== Investment Period Queries =====

    function isInvestmentPeriodActive(uint256 _propertyId) external view returns (bool) {
        return block.timestamp <= getInvestmentEndTime(_propertyId);
    }

    function getInvestmentPeriodRemaining(uint256 _propertyId) external view returns (uint256) {
        uint256 endTime = getInvestmentEndTime(_propertyId);
        return block.timestamp >= endTime ? 0 : endTime - block.timestamp;
    }

    // All other module functions (invest, withdraw, milestones, rent, etc.) are inherited
}
