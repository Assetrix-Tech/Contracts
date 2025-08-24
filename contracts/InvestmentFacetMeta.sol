// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AssetrixStorage.sol";
import "./ITransactionFacet.sol";
import "./BaseMetaTransactionFacet.sol";

contract InvestmentFacetMeta is BaseMetaTransactionFacet {
    using AssetrixStorage for AssetrixStorage.Layout;

    event TokensPurchased(
        uint256 indexed propertyId,
        address indexed tokenHolder,
        uint256 tokenAmount,
        uint256 totalCost
    );
    event Refunded(
        uint256 indexed propertyId,
        address indexed investor,
        uint256 amount
    );
    event PayoutSent(
        uint256 indexed propertyId,
        address indexed investor,
        uint256 amount
    );
    event PropertyFullyFunded(
        uint256 indexed propertyId,
        uint256 totalTokensSold
    );
    event PayoutAvailable(
        uint256 indexed propertyId,
        address indexed investor,
        uint256 amount
    );
    event RefundAvailable(
        uint256 indexed propertyId,
        address indexed investor,
        uint256 amount
    );
    event EmergencyRefundAvailable(
        uint256 indexed propertyId,
        address indexed investor,
        uint256 amount
    );
    event EarlyExitAvailable(
        uint256 indexed propertyId,
        address indexed investor,
        uint256 refundAmount,
        uint256 exitFee
    );

    modifier onlyOwner() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(getActualSender() == s.owner, "Ownable: caller is not the owner");
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

    // Purchase tokens for users with stablecoin (meta transaction enabled)
    function purchaseTokens(
        uint256 _propertyId,
        uint256 _tokenAmount
    ) external whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        address actualSender = getActualSender();
        
        require(_tokenAmount > 0, "Must purchase at least 1 token");
        require(
            s.minTokensPerInvestment > 0,
            "Minimum tokens per investment not set"
        );
        require(
            _tokenAmount >= s.minTokensPerInvestment,
            "Below minimum tokens per investment"
        );
        require(
            _propertyId > 0 && _propertyId <= s.propertyCount,
            "Property does not exist"
        );
        require(prop.isActive, "Property is not active");
        require(
            _tokenAmount <= prop.tokensLeft,
            "Not enough tokens available"
        );

        uint256 totalCost = _tokenAmount * prop.tokenPrice;
        IERC20 stablecoin = IERC20(s.stablecoin);

        require(
            stablecoin.balanceOf(actualSender) >= totalCost,
            "Insufficient stablecoin balance"
        );
        require(
            stablecoin.allowance(actualSender, address(this)) >= totalCost,
            "Insufficient allowance"
        );

        // Transfer stablecoins from user to contract
        require(
            stablecoin.transferFrom(actualSender, address(this), totalCost),
            "Stablecoin transfer failed"
        );

        // Update property token data
        prop.tokensSold += _tokenAmount;
        prop.tokensLeft -= _tokenAmount;

        // Update user token balance
        if (prop.tokenBalance[actualSender] == 0) {
            prop.tokenHolders.push(actualSender);
            prop.holderCount++;
        }
        prop.tokenBalance[actualSender] += _tokenAmount;

        // Check if property is fully funded
        if (prop.tokensLeft == 0) {
            prop.isFullyFunded = true;
            emit PropertyFullyFunded(_propertyId, prop.tokensSold);
        }

        // Record transaction
        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            actualSender,
            address(this),
            AssetrixStorage.TransactionType.Investment,
            totalCost,
            "Token purchase"
        );

        emit TokensPurchased(_propertyId, actualSender, _tokenAmount, totalCost);
    }

    // Request refund (meta transaction enabled)
    function requestRefund(uint256 _propertyId) external whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        address actualSender = getActualSender();

        require(
            _propertyId > 0 && _propertyId <= s.propertyCount,
            "Property does not exist"
        );
        require(prop.tokenBalance[actualSender] > 0, "No tokens to refund");
        require(!prop.isFullyFunded, "Property is fully funded");

        uint256 refundAmount = prop.tokenBalance[actualSender] * prop.tokenPrice;

        // Remove user from token holders
        prop.tokenBalance[actualSender] = 0;
        prop.holderCount--;

        // Remove from token holders array
        for (uint256 i = 0; i < prop.tokenHolders.length; i++) {
            if (prop.tokenHolders[i] == actualSender) {
                prop.tokenHolders[i] = prop.tokenHolders[prop.tokenHolders.length - 1];
                prop.tokenHolders.pop();
                break;
            }
        }

        // Return tokens to available pool
        prop.tokensSold -= prop.tokenBalance[actualSender];
        prop.tokensLeft += prop.tokenBalance[actualSender];

        // Transfer stablecoins back to user
        IERC20 stablecoin = IERC20(s.stablecoin);
        require(
            stablecoin.transfer(actualSender, refundAmount),
            "Refund transfer failed"
        );

        // Record transaction
        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            actualSender,
            address(this),
            AssetrixStorage.TransactionType.Refund,
            refundAmount,
            "Refund request"
        );

        emit Refunded(_propertyId, actualSender, refundAmount);
    }

    // Claim payout (meta transaction enabled)
    function claimPayout(uint256 _propertyId) external whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        address actualSender = getActualSender();

        require(
            _propertyId > 0 && _propertyId <= s.propertyCount,
            "Property does not exist"
        );
        require(prop.isFullyFunded, "Property is not fully funded");
        require(prop.tokenBalance[actualSender] > 0, "No tokens to claim payout for");
        require(!s.payoutProcessed[_propertyId][actualSender], "Payout already processed");

        uint256 payoutAmount = prop.tokenBalance[actualSender] * prop.tokenPrice;
        uint256 roiAmount = (payoutAmount * prop.roiPercentage) / 100;
        uint256 totalPayout = payoutAmount + roiAmount;

        // Mark payout as processed
        s.payoutProcessed[_propertyId][actualSender] = true;

        // Transfer payout to user
        IERC20 stablecoin = IERC20(s.stablecoin);
        require(
            stablecoin.transfer(actualSender, totalPayout),
            "Payout transfer failed"
        );

        // Record transaction
        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            actualSender,
            address(this),
            AssetrixStorage.TransactionType.FinalPayout,
            totalPayout,
            "Final payout"
        );

        emit PayoutSent(_propertyId, actualSender, totalPayout);
    }
}
