// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AssetrixStorage.sol";
import "./ITransactionFacet.sol";

contract InvestmentFacet {
    using AssetrixStorage for AssetrixStorage.Layout;

    event TokensPurchased(uint256 indexed propertyId, address indexed tokenHolder, uint256 tokenAmount, uint256 totalCost);
    event Refunded(uint256 indexed propertyId, address indexed investor, uint256 amount);
    event PayoutSent(uint256 indexed propertyId, address indexed investor, uint256 amount);
    event PropertyFullyFunded(uint256 indexed propertyId, uint256 totalTokensSold);

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

    function purchaseTokens(uint256 _propertyId, uint256 _tokenAmount) external whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(_tokenAmount > 0, "Must purchase at least 1 token");
        require(_propertyId > 0 && _propertyId <= s.propertyCount, "Property does not exist");
        require(prop.isActive, "Property is not active");
        require(_tokenAmount <= prop.tokensLeft, "Not enough tokens left");
        uint256 totalCost = _tokenAmount * prop.tokenPrice;
        require(IERC20(s.stablecoin).transferFrom(msg.sender, address(this), totalCost), "Transfer failed");
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

    function payoutInvestment(uint256 _propertyId, address _tokenHolder, uint256 _amount) external nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(msg.sender == prop.developerAddress || msg.sender == s.owner, "Only developer or owner can payout");
        require(prop.isFullyFunded, "Property must be fully funded");
        require(prop.tokenBalance[_tokenHolder] > 0, "Token holder has no tokens in this property");
        require(_amount > 0, "Payout amount must be greater than 0");
        require(block.timestamp >= getInvestmentEndTime(_propertyId), "Investment period has not ended yet");
        require(IERC20(s.stablecoin).transferFrom(msg.sender, _tokenHolder, _amount), "Payout transfer failed");
        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            msg.sender,
            _tokenHolder,
            AssetrixStorage.TransactionType.FinalPayout,
            _amount,
            "Investment payout to token holder"
        );
        emit PayoutSent(_propertyId, _tokenHolder, _amount);
    }

    function refund(uint256 _propertyId, address _tokenHolder) external nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(msg.sender == prop.developerAddress || msg.sender == s.owner, "Only developer or owner can refund");
        require(prop.tokenBalance[_tokenHolder] > 0, "Token holder has no tokens to refund");
        uint256 refundTokens = prop.tokenBalance[_tokenHolder];
        uint256 refundAmount = refundTokens * prop.tokenPrice;
        require(IERC20(s.stablecoin).transfer(_tokenHolder, refundAmount), "Refund transfer failed");
        prop.tokensSold -= refundTokens;
        prop.tokensLeft += refundTokens;
        prop.tokenBalance[_tokenHolder] = 0;
        prop.holderCount--;
        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            address(this),
            _tokenHolder,
            AssetrixStorage.TransactionType.Refund,
            refundAmount,
            "Refund to token holder"
        );
        emit Refunded(_propertyId, _tokenHolder, refundAmount);
    }

    function earlyExit(uint256 _propertyId) external nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
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
        require(block.timestamp < getInvestmentEndTime(_propertyId), "Investment period has ended, use final payout instead");
        uint256 tokenAmount = prop.tokenBalance[msg.sender];
        uint256 investmentAmount = tokenAmount * prop.tokenPrice;
        uint256 exitFee = (investmentAmount * 5) / 100;
        uint256 refundAmount = investmentAmount - exitFee;
        require(IERC20(s.stablecoin).transfer(msg.sender, refundAmount), "Early exit refund failed");
        require(IERC20(s.stablecoin).transfer(address(this), exitFee), "Exit fee transfer failed");
        prop.tokensSold -= tokenAmount;
        prop.tokensLeft += tokenAmount;
        if (prop.isFullyFunded && prop.tokensLeft > 0) {
            prop.isFullyFunded = false;
        }
        prop.tokenBalance[msg.sender] = 0;
        prop.holderCount--;
        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            address(this),
            msg.sender,
            AssetrixStorage.TransactionType.Refund,
            refundAmount,
            "Early exit refund"
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

    function emergencyRefund(uint256 _propertyId, address _tokenHolder) external onlyOwner nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(prop.tokenBalance[_tokenHolder] > 0, "Token holder has no tokens to refund");
        uint256 refundTokens = prop.tokenBalance[_tokenHolder];
        uint256 refundAmount = refundTokens * prop.tokenPrice;
        require(IERC20(s.stablecoin).transfer(_tokenHolder, refundAmount), "Emergency refund transfer failed");
        prop.tokensSold -= refundTokens;
        prop.tokensLeft += refundTokens;
        _removeTokenHolderFromProperty(_propertyId, _tokenHolder);
        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            address(this),
            _tokenHolder,
            AssetrixStorage.TransactionType.EmergencyRefund,
            refundAmount,
            "Emergency refund to token holder"
        );
        emit Refunded(_propertyId, _tokenHolder, refundAmount);
    }

    function canAcceptTokenPurchases(uint256 _propertyId) external view returns (bool) {
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

    function getTokenGap(uint256 _propertyId) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return prop.tokensLeft;
    }

    function getTokenSalePercentage(uint256 _propertyId) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return (prop.tokensSold * 100) / prop.totalTokens;
    }

    function getTokenBalance(uint256 _propertyId, address _tokenHolder) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return prop.tokenBalance[_tokenHolder];
    }

    function getTokenValue(uint256 _propertyId, address _tokenHolder) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return prop.tokenBalance[_tokenHolder] * prop.tokenPrice;
    }

    function calculateTokensFromAmount(uint256 _amount) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount % s.globalTokenPrice == 0, "Amount must be divisible by token price");
        return _amount / s.globalTokenPrice;
    }

    function calculateAmountFromTokens(uint256 _tokens) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return _tokens * s.globalTokenPrice;
    }

    function calculateExpectedROI(uint256 _propertyId, uint256 _investmentAmount) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return (_investmentAmount * prop.roiPercentage) / 100;
    }

    function getPropertyAmountToRaise(uint256 _propertyId) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return prop.totalTokens * prop.tokenPrice;
    }

    function _removeTokenHolderFromProperty(uint256 _propertyId, address _tokenHolder) internal {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        for (uint256 i = 0; i < prop.tokenHolders.length; i++) {
            if (prop.tokenHolders[i] == _tokenHolder) {
                prop.tokenHolders[i] = prop.tokenHolders[prop.tokenHolders.length - 1];
                prop.tokenHolders.pop();
                break;
            }
        }
        uint256[] storage tokenHolderProps = s.tokenHolderProperties[_tokenHolder];
        for (uint256 i = 0; i < tokenHolderProps.length; i++) {
            if (tokenHolderProps[i] == _propertyId) {
                tokenHolderProps[i] = tokenHolderProps[tokenHolderProps.length - 1];
                tokenHolderProps.pop();
                break;
            }
        }
        prop.tokenBalance[_tokenHolder] = 0;
        prop.holderCount--;
    }

    function getInvestmentEndTime(uint256 _propertyId) public view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        uint256 durationInSeconds = getDurationInSeconds(AssetrixStorage.Duration(uint8(prop.investmentDuration)));
        return prop.createdAt + durationInSeconds;
    }

    function getDurationInSeconds(AssetrixStorage.Duration _duration) internal pure returns (uint256) {
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
} 