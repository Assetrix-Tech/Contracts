 
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../libraries/AssetrixEnums.sol";
import "../libraries/AssetrixStructs.sol";
import "./AssetrixModuleBase.sol";
import "./AssetrixStorage.sol";
import "../interfaces/IAssetrixEvents.sol";
import "../libraries/AssetrixUtils.sol";
 
 contract AssetrixInvestmentManagement is AssetrixModuleBase,AssetrixStorage, IAssetrixEvents {
    using AssetrixEnums for *;
    using AssetrixStructs for *;


    function __AssetrixInvestmentManagement_init(address initialOwner) internal onlyInitializing {
        __AssetrixModuleBase_init(initialOwner);
    }
 
 function purchaseTokens(uint256 _propertyId, uint256 _tokenAmount) external nonReentrant whenNotPaused {
        require(_tokenAmount > 0, "Must purchase at least 1 token");
        require(_propertyId > 0 && _propertyId <= propertyCount, "Property does not exist");
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(prop.isActive, "Property is not active");
        require(_tokenAmount <= prop.tokensLeft, "Not enough tokens left");

        uint256 totalCost = _tokenAmount * prop.tokenPrice;
        require(stablecoin.transferFrom(msg.sender, address(this), totalCost), "Transfer failed");

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
            emit PropertyFullyFunded(_propertyId, prop.tokensSold);
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

        emit TokensPurchased(_propertyId, msg.sender, _tokenAmount, totalCost);
    }

    // ============ FINAL PAYOUT FUNCTION ============
    function payoutInvestment(
        uint256 _propertyId,
        address _tokenHolder,
        uint256 _amount
    ) external nonReentrant {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Only developer or owner can payout"
        );
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            prop.tokenBalance[_tokenHolder] > 0,
            "Token holder has no tokens in this property"
        );
        require(_amount > 0, "Payout amount must be greater than 0");
        require(
            block.timestamp >= AssetrixUtils.getInvestmentEndTime(properties, _propertyId),
            "Investment period has not ended yet"
        );
        require(
            stablecoin.transferFrom(msg.sender, _tokenHolder, _amount),
            "Payout transfer failed"
        );
        _recordTransaction(
            _propertyId,
            msg.sender,
            _tokenHolder,
            AssetrixEnums.TransactionType.FinalPayout,
            _amount,
            "Investment payout to token holder"
        );
        emit PayoutSent(_propertyId, _tokenHolder, _amount);
    }

    // ============ REFUND FUNCTION ============
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
        emit Refunded(_propertyId, _tokenHolder, refundAmount);
    }

    // ============ EMERGENCY REFUND FUNCTION ============
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
        emit Refunded(_propertyId, _tokenHolder, refundAmount);
    }

    // ============ EARLY EXIT FUNCTION ============
    function earlyExit(uint256 _propertyId) external nonReentrant {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(prop.tokenBalance[msg.sender] > 0, "No tokens to exit");
        if (prop.isFullyFunded) {
            require(!AssetrixUtils.hasReleasedMilestoneFunds(prop.milestones), "Cannot exit after milestone funds have been released");
        }
        require(
            block.timestamp < AssetrixUtils.getInvestmentEndTime(properties, _propertyId),
            "Investment period has ended, use final payout instead"
        );
        uint256 tokenAmount = prop.tokenBalance[msg.sender];
        uint256 investmentAmount = tokenAmount * prop.tokenPrice;
        uint256 exitFee = AssetrixUtils.calculateEarlyExitFee(investmentAmount);
        uint256 refundAmount = AssetrixUtils.calculateRefundAmount(investmentAmount, exitFee);
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
        emit Refunded(_propertyId, msg.sender, refundAmount);
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
            transactionHash: bytes32(0) 
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


     function _removeTokenHolderFromProperty(uint256 _propertyId, address _tokenHolder) internal {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        AssetrixUtils.removeAddressFromArray(prop.tokenHolders, _tokenHolder);
        AssetrixUtils.removeUintFromArray(tokenHolderProperties[_tokenHolder], _propertyId);
        prop.tokenBalance[_tokenHolder] = 0;
        prop.holderCount--;
    }
 }