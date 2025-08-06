// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AssetrixStorage.sol";
import "./ITransactionFacet.sol";

contract InvestmentFacet {
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

    function purchaseTokens(
        uint256 _propertyId,
        uint256 _tokenAmount
    ) external whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
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
        require(_tokenAmount <= prop.tokensLeft, "Not enough tokens left");
        require(s.stablecoin != address(0), "Stablecoin not set");

        uint256 totalCost = _tokenAmount * prop.tokenPrice;
        require(
            totalCost >= _tokenAmount &&
                totalCost / prop.tokenPrice == _tokenAmount,
            "Overflow in totalCost calculation"
        );

        require(
            IERC20(s.stablecoin).transferFrom(
                msg.sender,
                address(this),
                totalCost
            ),
            "Transfer failed"
        );
        if (prop.tokenBalance[msg.sender] == 0) {
            prop.tokenHolders.push(msg.sender);
            prop.holderCount++;
            s.tokenHolderProperties[msg.sender].push(_propertyId);
        }
        prop.tokenBalance[msg.sender] += _tokenAmount;
        prop.tokensSold += _tokenAmount;
        prop.tokensLeft -= _tokenAmount;
        if (prop.tokensLeft == 0) {
            prop.isFullyFunded = true;
            emit PropertyFullyFunded(_propertyId, prop.tokensSold);
        }
        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            msg.sender,
            prop.developerAddress,
            AssetrixStorage.TransactionType.Investment,
            totalCost,
            "Token purchase in property"
        );
        emit TokensPurchased(_propertyId, msg.sender, _tokenAmount, totalCost);
    }

    function payoutInvestment(
        uint256 _propertyId,
        address _tokenHolder,
        uint256 _amount
    ) external onlyOwner whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(_tokenHolder != address(0), "Invalid token holder address");
        require(
            prop.tokenBalance[_tokenHolder] > 0,
            "Token holder has no tokens in this property"
        );
        require(_amount > 0, "Payout amount must be greater than 0");

        uint256 userInvestment = prop.tokenBalance[_tokenHolder] *
            prop.tokenPrice;
        require(
            _amount <= userInvestment,
            "Payout amount exceeds user investment"
        );

        // Check if payout has already been processed
        require(
            !s.payoutProcessed[_propertyId][_tokenHolder],
            "Payout already processed"
        );

        require(
            block.timestamp >= getInvestmentEndTime(_propertyId),
            "Investment period has not ended yet"
        );

        // Mark payout as processed
        s.payoutProcessed[_propertyId][_tokenHolder] = true;

        // Emit event for backend to handle dashboard balance update
        // No direct USDT transfer - backend will handle conversion and bank transfer
        emit PayoutAvailable(_propertyId, _tokenHolder, _amount);

        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            msg.sender,
            _tokenHolder,
            AssetrixStorage.TransactionType.PayoutAvailable,
            _amount,
            "Investment payout available in dashboard"
        );
    }

    function refund(
        uint256 _propertyId,
        address _tokenHolder
    ) external onlyOwner whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(_tokenHolder != address(0), "Invalid token holder address");
        require(
            prop.tokenBalance[_tokenHolder] > 0,
            "Token holder has no tokens to refund"
        );
        uint256 refundTokens = prop.tokenBalance[_tokenHolder];
        uint256 refundAmount = refundTokens * prop.tokenPrice;

        // Emit event for backend to handle dashboard balance update
        emit RefundAvailable(_propertyId, _tokenHolder, refundAmount);

        // Use consistent state management
        _removeTokenHolderFromProperty(_propertyId, _tokenHolder);
        prop.tokensSold -= refundTokens;
        prop.tokensLeft += refundTokens;

        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            address(this),
            _tokenHolder,
            AssetrixStorage.TransactionType.RefundAvailable,
            refundAmount,
            "Refund available in dashboard"
        );
        emit Refunded(_propertyId, _tokenHolder, refundAmount);
    }

    function earlyExit(
        uint256 _propertyId
    ) external whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(prop.tokenBalance[msg.sender] > 0, "No tokens to exit");
        require(
            s.earlyExitFeePercentage > 0 && s.earlyExitFeePercentage <= 10,
            "Invalid exit fee percentage"
        );

        if (prop.isFullyFunded) {
            bool hasReleasedFunds = false;
            for (uint256 i = 0; i < prop.milestones.length; i++) {
                if (prop.milestones[i].fundsReleased) {
                    hasReleasedFunds = true;
                    break;
                }
            }
            require(
                !hasReleasedFunds,
                "Cannot exit after milestone funds have been released"
            );
        }
        require(
            block.timestamp < getInvestmentEndTime(_propertyId),
            "Investment period has ended, use final payout instead"
        );
        uint256 tokenAmount = prop.tokenBalance[msg.sender];
        uint256 investmentAmount = tokenAmount * prop.tokenPrice;
        uint256 exitFee = (investmentAmount * s.earlyExitFeePercentage) / 100;
        uint256 refundAmount = investmentAmount - exitFee;

        // Emit event for backend to handle dashboard balance update
        emit EarlyExitAvailable(_propertyId, msg.sender, refundAmount, exitFee);

        // Update token balances
        prop.tokensSold -= tokenAmount;
        prop.tokensLeft += tokenAmount;
        if (prop.isFullyFunded && prop.tokensLeft > 0) {
            prop.isFullyFunded = false;
        }
        _removeTokenHolderFromProperty(_propertyId, msg.sender);

        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            address(this),
            msg.sender,
            AssetrixStorage.TransactionType.EarlyExitAvailable,
            refundAmount,
            "Early exit refund available in dashboard"
        );
        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            msg.sender,
            address(this),
            AssetrixStorage.TransactionType.EarlyExitFee,
            exitFee,
            "Early exit fee"
        );
        emit Refunded(_propertyId, msg.sender, refundAmount);
    }

    //Emergency refund for token holder
    function emergencyRefund(
        uint256 _propertyId,
        address _tokenHolder
    ) external onlyOwner whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(_tokenHolder != address(0), "Invalid token holder address");
        require(
            prop.tokenBalance[_tokenHolder] > 0,
            "Token holder has no tokens to refund"
        );
        uint256 refundTokens = prop.tokenBalance[_tokenHolder];
        uint256 refundAmount = refundTokens * prop.tokenPrice;

        // Emit event for backend to handle dashboard balance update
        emit EmergencyRefundAvailable(_propertyId, _tokenHolder, refundAmount);

        // Update token balances
        prop.tokensSold -= refundTokens;
        prop.tokensLeft += refundTokens;
        _removeTokenHolderFromProperty(_propertyId, _tokenHolder);

        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            address(this),
            _tokenHolder,
            AssetrixStorage.TransactionType.EmergencyRefundAvailable,
            refundAmount,
            "Emergency refund available in dashboard"
        );
        emit Refunded(_propertyId, _tokenHolder, refundAmount);
    }

    //Helper function to check if a property can accept token purchases
    function canAcceptTokenPurchases(
        uint256 _propertyId
    ) external view returns (bool) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
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

    //Get token gap left to raise
    function getTokenGap(uint256 _propertyId) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return prop.tokensLeft;
    }

    //Get token sale percentage
    function getTokenSalePercentage(
        uint256 _propertyId
    ) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return (prop.tokensSold * 100) / prop.totalTokens;
    }

    //Get token balance of a specific token holder
    function getTokenBalance(
        uint256 _propertyId,
        address _tokenHolder
    ) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return prop.tokenBalance[_tokenHolder];
    }

    //Get token value in stablecoin
    function getTokenValue(
        uint256 _propertyId,
        address _tokenHolder
    ) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return prop.tokenBalance[_tokenHolder] * prop.tokenPrice;
    }

    //Calculate tokens from amount
    function calculateTokensFromAmount(
        uint256 _amount
    ) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(_amount > 0, "Amount must be greater than 0");
        require(
            _amount % s.globalTokenPrice == 0,
            "Amount must be divisible by token price"
        );
        return _amount / s.globalTokenPrice;
    }

    //Calculate amount from tokens
    function calculateAmountFromTokens(
        uint256 _tokens
    ) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return _tokens * s.globalTokenPrice;
    }

    //Calculate expected ROI
    function calculateExpectedROI(
        uint256 _propertyId,
        uint256 _investmentAmount
    ) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return (_investmentAmount * prop.roiPercentage) / 100;
    }

    //Get property amount to raise
    function getPropertyAmountToRaise(
        uint256 _propertyId
    ) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return prop.totalTokens * prop.tokenPrice;
    }

    //Helper function to remove token holder from property
    function _removeTokenHolderFromProperty(
        uint256 _propertyId,
        address _tokenHolder
    ) internal {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        for (uint256 i = 0; i < prop.tokenHolders.length; i++) {
            if (prop.tokenHolders[i] == _tokenHolder) {
                prop.tokenHolders[i] = prop.tokenHolders[
                    prop.tokenHolders.length - 1
                ];
                prop.tokenHolders.pop();
                break;
            }
        }
        uint256[] storage tokenHolderProps = s.tokenHolderProperties[
            _tokenHolder
        ];
        for (uint256 i = 0; i < tokenHolderProps.length; i++) {
            if (tokenHolderProps[i] == _propertyId) {
                tokenHolderProps[i] = tokenHolderProps[
                    tokenHolderProps.length - 1
                ];
                tokenHolderProps.pop();
                break;
            }
        }
        prop.tokenBalance[_tokenHolder] = 0;
        prop.holderCount--;
    }

    //Get investment end time
    function getInvestmentEndTime(
        uint256 _propertyId
    ) public view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            _propertyId > 0 && _propertyId <= s.propertyCount,
            "Property does not exist"
        );
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        uint256 durationInSeconds = getDurationInSeconds(
            AssetrixStorage.Duration(uint8(prop.investmentDuration))
        );
        return prop.createdAt + durationInSeconds;
    }

    //Helper function to get duration
    function getDurationInSeconds(
        AssetrixStorage.Duration _duration
    ) internal pure returns (uint256) {
        if (_duration == AssetrixStorage.Duration.OneMonth) return 30 days;
        if (_duration == AssetrixStorage.Duration.ThreeMonths) return 90 days;
        if (_duration == AssetrixStorage.Duration.FiveMonths) return 150 days;
        if (_duration == AssetrixStorage.Duration.SevenMonths) return 210 days;
        if (_duration == AssetrixStorage.Duration.EightMonths) return 240 days;
        if (_duration == AssetrixStorage.Duration.NineMonths) return 270 days;
        if (_duration == AssetrixStorage.Duration.TenMonths) return 300 days;
        if (_duration == AssetrixStorage.Duration.TwelveMonths) return 365 days;
        revert("Invalid duration");
    }

    //Check if investment period is active
    function isInvestmentPeriodActive(
        uint256 _propertyId
    ) external view returns (bool) {
        return block.timestamp <= getInvestmentEndTime(_propertyId);
    }

    //Get investment period remaining
    function getInvestmentPeriodRemaining(
        uint256 _propertyId
    ) external view returns (uint256) {
        uint256 endTime = getInvestmentEndTime(_propertyId);
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }

    function getExpectedROIPercentage(
        uint256 _propertyId
    ) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return prop.roiPercentage;
    }

    // Helper function to check if payout has been processed for a user's investment
    function isPayoutProcessed(
        uint256 _propertyId,
        address _tokenHolder
    ) external view returns (bool) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.payoutProcessed[_propertyId][_tokenHolder];
    }
}
