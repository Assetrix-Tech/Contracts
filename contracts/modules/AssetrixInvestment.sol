// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/IAssetrixCore.sol";
import "../interfaces/IAssetrixEvents.sol";
import "../libraries/AssetrixConstants.sol";
import "../libraries/AssetrixEnums.sol";
import "../libraries/AssetrixStructs.sol";
import "../libraries/AssetrixUtils.sol";
import "./AssetrixStorage.sol";

abstract contract AssetrixInvestment is AssetrixStorage,ReentrancyGuardUpgradeable,PausableUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;
    using AssetrixUtils for AssetrixStructs.Property;

    // ============ INVESTMENT FUNCTIONS ============

    function purchaseTokens(
        uint256 _propertyId,
        uint256 _tokenAmount
    ) external nonReentrant whenNotPaused {
        require(_tokenAmount > 0, "Must purchase at least 1 token");
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );

        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(prop.isActive, "Property is not active");
        require(_tokenAmount <= prop.tokensLeft, "Not enough tokens left");

        uint256 totalCost = _tokenAmount * prop.tokenPrice;
        require(
            stablecoin.transferFrom(msg.sender, address(this), totalCost),
            "Transfer failed"
        );

        // Add token holder if new
        if (prop.tokenBalance[msg.sender] == 0) {
            prop.tokenHolders.push(msg.sender);
            prop.holderCount++;
            tokenHolderProperties[msg.sender].push(_propertyId);
        }

        // Update token balance
        prop.tokenBalance[msg.sender] += _tokenAmount;
        prop.tokensSold += _tokenAmount;
        prop.tokensLeft -= _tokenAmount;

        // Mark property as fully funded if all tokens sold
        if (prop.tokensLeft == 0) {
            prop.isFullyFunded = true;
            emit IAssetrixEvents.PropertyFullyFunded(_propertyId, prop.tokensSold);
        }

        // Record transaction
        _recordTransaction(
            _propertyId,
            msg.sender,
            prop.developerAddress,
            AssetrixEnums.TransactionType.Investment,
            totalCost,
            "Token purchase in property"
        );

        emit IAssetrixEvents.TokensPurchased(_propertyId, msg.sender, _tokenAmount, totalCost);
    }

    // ============ ROI PAYOUT FUNCTION ============
    function payoutROI(
        uint256 _propertyId,
        address _tokenHolder,
        uint256 _amount
    ) external nonReentrant {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Only developer or owner can payout ROI"
        );
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            prop.tokenBalance[_tokenHolder] > 0,
            "Token holder has no tokens in this property"
        );
        require(_amount > 0, "Payout amount must be greater than 0");
        require(
            block.timestamp <= getInvestmentEndTime(_propertyId),
            "Investment period has ended, use final payout instead"
        );

        require(
            stablecoin.transferFrom(msg.sender, _tokenHolder, _amount),
            "ROI transfer failed"
        );

        _recordTransaction(
            _propertyId,
            msg.sender,
            _tokenHolder,
            AssetrixEnums.TransactionType.ROIPayout,
            _amount,
            "ROI payout to token holder"
        );

        emit IAssetrixEvents.PayoutSent(_propertyId, _tokenHolder, _amount);
    }

    // ============ FINAL PAYOUT FUNCTION ============
    function payoutFinal(
        uint256 _propertyId,
        address _tokenHolder,
        uint256 _amount
    ) external nonReentrant {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Only developer or owner can payout final amount"
        );
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            prop.tokenBalance[_tokenHolder] > 0,
            "Token holder has no tokens in this property"
        );
        require(_amount > 0, "Payout amount must be greater than 0");
        require(
            block.timestamp >= getInvestmentEndTime(_propertyId),
            "Investment period has not ended yet"
        );

        require(
            stablecoin.transferFrom(msg.sender, _tokenHolder, _amount),
            "Final payout transfer failed"
        );

        _recordTransaction(
            _propertyId,
            msg.sender,
            _tokenHolder,
            AssetrixEnums.TransactionType.FinalPayout,
            _amount,
            "Final payout to token holder"
        );

        emit IAssetrixEvents.PayoutSent(_propertyId, _tokenHolder, _amount);
    }

    // ============ REFUND FUNCTIONS ============
    function refund(
        uint256 _propertyId,
        address _tokenHolder
    ) external nonReentrant {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Only developer or owner can refund"
        );
        require(
            prop.tokenBalance[_tokenHolder] > 0,
            "Token holder has no tokens to refund"
        );

        uint256 refundTokens = prop.tokenBalance[_tokenHolder];
        uint256 refundAmount = refundTokens * prop.tokenPrice;

        require(
            stablecoin.transfer(_tokenHolder, refundAmount),
            "Refund transfer failed"
        );

        prop.tokensSold -= refundTokens;
        prop.tokensLeft += refundTokens;

        _removeTokenHolderFromProperty(_propertyId, _tokenHolder);

        _recordTransaction(
            _propertyId,
            address(this),
            _tokenHolder,
            AssetrixEnums.TransactionType.Refund,
            refundAmount,
            "Refund to token holder"
        );

        emit IAssetrixEvents.Refunded(_propertyId, _tokenHolder, refundAmount);
    }

    function emergencyRefund(
        uint256 _propertyId,
        address _tokenHolder
    ) external nonReentrant onlyOwner {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(
            prop.tokenBalance[_tokenHolder] > 0,
            "Token holder has no tokens to refund"
        );

        uint256 refundTokens = prop.tokenBalance[_tokenHolder];
        uint256 refundAmount = refundTokens * prop.tokenPrice;

        require(
            stablecoin.transfer(_tokenHolder, refundAmount),
            "Emergency refund transfer failed"
        );

        prop.tokensSold -= refundTokens;
        prop.tokensLeft += refundTokens;

        _removeTokenHolderFromProperty(_propertyId, _tokenHolder);

        _recordTransaction(
            _propertyId,
            address(this),
            _tokenHolder,
            AssetrixEnums.TransactionType.EmergencyRefund,
            refundAmount,
            "Emergency refund to token holder"
        );

        emit IAssetrixEvents.Refunded(_propertyId, _tokenHolder, refundAmount);
    }

    // ============ EARLY EXIT FUNCTION ============
    function earlyExit(uint256 _propertyId) external nonReentrant {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(prop.tokenBalance[msg.sender] > 0, "No tokens to exit");

        if (prop.isFullyFunded) {
            bool hasReleasedFunds = false;
            for (uint256 i = 0; i < prop.milestones.length; i++) {
                if (prop.milestones[i].fundsReleased) {
                    hasReleasedFunds = true;
                    break;
                }
            }
            require(!hasReleasedFunds, "Cannot exit after milestone funds have been released");
        }

        require(
            block.timestamp < getInvestmentEndTime(_propertyId),
            "Investment period has ended, use final payout instead"
        );

        uint256 tokenAmount = prop.tokenBalance[msg.sender];
        uint256 investmentAmount = tokenAmount * prop.tokenPrice;
        uint256 exitFee = (investmentAmount * AssetrixConstants.EARLY_EXIT_FEE_PERCENTAGE) / 100;
        uint256 refundAmount = investmentAmount - exitFee;

        require(
            stablecoin.transfer(msg.sender, refundAmount),
            "Early exit refund failed"
        );

        require(
            stablecoin.transfer(owner(), exitFee),
            "Exit fee transfer failed"
        );

        prop.tokensSold -= tokenAmount;
        prop.tokensLeft += tokenAmount;

        if (prop.isFullyFunded && prop.tokensLeft > 0) {
            prop.isFullyFunded = false;
        }

        _removeTokenHolderFromProperty(_propertyId, msg.sender);

        _recordTransaction(
            _propertyId,
            address(this),
            msg.sender,
            AssetrixEnums.TransactionType.Refund,
            refundAmount,
            "Early exit refund"
        );

        _recordTransaction(
            _propertyId,
            msg.sender,
            owner(),
            AssetrixEnums.TransactionType.EarlyExitFee,
            exitFee,
            "Early exit fee"
        );

        emit IAssetrixEvents.Refunded(_propertyId, msg.sender, refundAmount);
    }

    // ============ MILESTONE WORKFLOW FUNCTIONS ============

    

    // ============ QUERY FUNCTIONS ============

    function canAcceptTokenPurchases(uint256 _propertyId) external view returns (bool) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        AssetrixStructs.Property storage prop = properties[_propertyId];

        if (!prop.isActive) return false;

        bool hasReleasedFunds = false;
        for (uint256 i = 0; i < prop.milestones.length; i++) {
            if (prop.milestones[i].fundsReleased) {
                hasReleasedFunds = true;
                break;
            }
        }

        return !hasReleasedFunds && prop.tokensLeft > 0;
    }

    function getTokenGap(uint256 _propertyId) external view returns (uint256) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        return properties[_propertyId].tokensLeft;
    }

    function getTokenSalePercentage(uint256 _propertyId) external view returns (uint256) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        AssetrixStructs.Property storage prop = properties[_propertyId];
        return (prop.tokensSold * 100) / prop.totalTokens;
    }

    function getTokenBalance(uint256 _propertyId, address _tokenHolder) external view returns (uint256) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        return properties[_propertyId].tokenBalance[_tokenHolder];
    }

    function getTokenValue(uint256 _propertyId, address _tokenHolder) external view returns (uint256) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        AssetrixStructs.Property storage prop = properties[_propertyId];
        return prop.tokenBalance[_tokenHolder] * prop.tokenPrice;
    }

    function getInvestmentEndTime(uint256 _propertyId) public view returns (uint256) {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        uint256 durationInSeconds = AssetrixUtils.getDurationInSeconds(prop.investmentDuration);
        return prop.createdAt + durationInSeconds;
    }

    function isInvestmentPeriodActive(uint256 _propertyId) external view returns (bool) {
        return block.timestamp <= getInvestmentEndTime(_propertyId);
    }

    function getInvestmentPeriodRemaining(uint256 _propertyId) external view returns (uint256) {
        uint256 endTime = getInvestmentEndTime(_propertyId);
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }

    
    function _recordTransaction(
        uint256 _propertyId,
        address _from,
        address _to,
        AssetrixEnums.TransactionType _type,
        uint256 _amount,
        string memory _description
    ) internal {
        transactionCount++;

        transactions[transactionCount] = AssetrixStructs.Transaction({
            transactionId: transactionCount,
            propertyId: _propertyId,
            from: _from,
            to: _to,
            transactionType: _type,
            amount: _amount,
            timestamp: block.timestamp,
            description: _description,
            isSuccessful: true,
            metadata: "",
            blockNumber: block.number,
            transactionHash: bytes32(0) // Will be set by frontend
        });

        // Add to user transaction lists
        if (_from != address(0)) {
            userTransactions[_from].push(transactionCount);
        }
        if (_to != address(0)) {
            userTransactions[_to].push(transactionCount);
        }

        // Add to property transaction list
        propertyTransactions[_propertyId].push(transactionCount);
    }

    // ============ INTERNAL HELPER FUNCTIONS ============

    function _removeTokenHolderFromProperty(uint256 _propertyId, address _tokenHolder) internal {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        
        // Remove from token holders array
        for (uint256 i = 0; i < prop.tokenHolders.length; i++) {
            if (prop.tokenHolders[i] == _tokenHolder) {
                prop.tokenHolders[i] = prop.tokenHolders[prop.tokenHolders.length - 1];
                prop.tokenHolders.pop();
                break;
            }
        }
        
        // Remove from token holder properties
        uint256[] storage tokenHolderProps = tokenHolderProperties[_tokenHolder];
        for (uint256 i = 0; i < tokenHolderProps.length; i++) {
            if (tokenHolderProps[i] == _propertyId) {
                tokenHolderProps[i] = tokenHolderProps[tokenHolderProps.length - 1];
                tokenHolderProps.pop();
                break;
            }
        }
        
        // Clear token balance
        prop.tokenBalance[_tokenHolder] = 0;
        prop.holderCount--;
    }
}