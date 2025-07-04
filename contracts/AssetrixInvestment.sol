// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Assetrix is Ownable, ReentrancyGuard {
    IERC20 public stablecoin;

    constructor(address _stablecoin) {
        stablecoin = IERC20(_stablecoin);
    }

    enum RiskLevel {
        Low,
        Medium,
        High
    }
    enum IncomeFrequency {
        Monthly,
        Quarterly,
        BiAnnual,
        Annual
    }
    enum InvestmentType {
        Equity,
        Debt
    }

    // Property status enum
    enum PropertyStatus {
        PreConstruction,
        UnderConstruction,
        Completed,
        Renovation,
        UnderContract,
        Leased,
        OffMarket
    }

    // Legal information
    struct LegalInfo {
        string registrationNumber;
        string zoningType;
        bool hasEncumbrances;
        bool hasRestrictions;
        string titleDeedHash;
    }

    // Location details
    struct Location {
        string streetAddress;
        string city;
        string state;
        string postalCode;
        string country;
        string landmark;
    }

    // Property specifications
    struct PropertySpecs {
        uint256 yearBuilt;
        uint256 floorCount;
        uint256 bedroomCount;
        uint256 bathroomCount;
    }

    struct Property {
        uint256 propertyId;
        string title;
        string propertyType;
        string description;
        string[] images;
        string location;
        string city;
        string state;
        string country;
        uint256 zipCode;
        uint256 unitPrice;
        uint256 totalUnits;
        uint256 totalInvestment;
        uint256 minInvestment;
        uint256 currentFunding;
        uint256 expectedROI;
        uint256 investmentDuration;
        uint256 yearBuilt;
        uint256 size;
        uint256 bedrooms;
        uint256 bathrooms;
        bool isActive;
        string developer;
        address developerAddress;
        string ipfsBasicInfoHash;
        string ipfsFinancialsHash;
        string ipfsLegalHash;
        string ipfsMediaHash;
        uint256[] campaignIds;
    }

    struct Campaign {
        uint256 campaignId;
        uint256 propertyId;
        address developer;
        string developerName;
        uint256 targetAmount;
        uint256 totalRaised;
        uint256 deadline;
        bool isOpen;
        bool isSuccessful;
    }

    uint256 public propertyCount;
    uint256 public campaignCount;

    mapping(uint256 => Property) public properties;
    mapping(uint256 => Campaign) public campaigns;
    mapping(address => uint256[]) public developerProperties;
    mapping(uint256 => mapping(address => uint256)) public investorBalances;
    mapping(address => uint256[]) private developerCampaigns; // developer => campaignIds[]
    mapping(address => uint256[]) private investorCampaigns; // investor => campaignIds[]
    mapping(address => mapping(uint256 => bool)) private hasInvested; // investor => campaignId => bool

    // --- EVENTS ---
    event PropertyCreated(uint256 propertyId, address developer, string title);
    event PropertyUpdated(uint256 propertyId, string newIpfsHash);
    event PropertyDeactivated(uint256 propertyId);

    event CampaignCreated(
        uint256 campaignId,
        uint256 propertyId,
        uint256 targetAmount,
        uint256 deadline
    );
    event Invested(uint256 campaignId, address investor, uint256 amount);
    event Refunded(uint256 campaignId, address investor, uint256 amount);
    event PayoutSent(
        uint256 campaignId,
        address developer,
        uint256 totalRaised
    );
    event CampaignFullyFunded(uint256 indexed campaignId, uint256 totalRaised);
    event InvestmentTracked(
        address indexed investor,
        uint256 campaignId,
        uint256 amount
    );

    function createProperty(
        // Basic info
        string memory _title,
        string memory _description,
        string memory _propertyType,
        string memory _developerName,
        // Location
        string memory _location,
        string memory _city,
        string memory _state,
        string memory _country,
        uint256 _zipCode,
        // Property details
        string[] memory _images,
        uint256 _yearBuilt,
        uint256 _size,
        uint256 _bedrooms,
        uint256 _bathrooms,
        // Investment details
        uint256 _unitPrice,
        uint256 _totalUnits,
        uint256 _totalInvestment,
        uint256 _minInvestment,
        uint256 _expectedROI,
        uint256 _investmentDuration,
        // IPFS hashes
        string memory _ipfsBasicInfoHash,
        string memory _ipfsFinancialsHash,
        string memory _ipfsLegalHash,
        string memory _ipfsMediaHash
    ) external returns (uint256) {
        require(
            _minInvestment >= _unitPrice,
            "Min investment must be >= unit price"
        );
        require(
            _totalInvestment == _unitPrice * _totalUnits,
            "Total investment must equal unit price * total units"
        );
        require(
            _investmentDuration > 0,
            "Investment duration must be greater than 0"
        );

        // Input validation
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(
            bytes(_propertyType).length > 0,
            "Property type cannot be empty"
        );
        require(bytes(_location).length > 0, "Location cannot be empty");
        require(bytes(_city).length > 0, "City cannot be empty");
        require(bytes(_state).length > 0, "State cannot be empty");
        require(bytes(_country).length > 0, "Country cannot be empty");
        require(_zipCode > 0, "ZIP code must be greater than 0");
        require(_unitPrice > 0, "Unit price must be greater than 0");
        require(_totalUnits > 0, "Total units must be greater than 0");
        require(
            _totalInvestment == _unitPrice * _totalUnits,
            "Total investment must equal unit price * total units"
        );
        require(
            _investmentDuration > 0,
            "Investment duration must be greater than 0"
        );

        propertyCount++;
        Property storage prop = properties[propertyCount];

        // Core identification
        prop.propertyId = propertyCount;
        prop.title = _title;
        prop.description = _description;
        prop.propertyType = _propertyType;

        // Location details
        prop.location = _location;
        prop.city = _city;
        prop.state = _state;
        prop.country = _country;
        prop.zipCode = _zipCode;

        // Property details
        prop.images = _images;
        prop.yearBuilt = _yearBuilt;
        prop.size = _size;
        prop.bedrooms = _bedrooms;
        prop.bathrooms = _bathrooms;

        // Investment details
        prop.unitPrice = _unitPrice;
        prop.totalUnits = _totalUnits;
        prop.totalInvestment = _totalInvestment;
        prop.minInvestment = _minInvestment;
        prop.currentFunding = 0;
        prop.expectedROI = _expectedROI;
        prop.investmentDuration = _investmentDuration;

        // Status and ownership
        prop.isActive = true;
        prop.developer = _developerName;
        prop.developerAddress = msg.sender;

        // IPFS hashes for metadata
        prop.ipfsBasicInfoHash = _ipfsBasicInfoHash;
        prop.ipfsFinancialsHash = _ipfsFinancialsHash;
        prop.ipfsLegalHash = _ipfsLegalHash;
        prop.ipfsMediaHash = _ipfsMediaHash;

        developerProperties[msg.sender].push(propertyCount);

        emit PropertyCreated(propertyCount, msg.sender, _title);
        return propertyCount;
    }

    function updateProperty(
        uint256 _propertyId,
        // Basic info
        string memory _title,
        string memory _description,
        string memory _propertyType,
        string memory _developerName,
        // Location
        string memory _location,
        string memory _city,
        string memory _state,
        string memory _country,
        uint256 _zipCode,
        // Property details
        string[] memory _images,
        uint256 _yearBuilt,
        uint256 _size,
        uint256 _bedrooms,
        uint256 _bathrooms,
        // IPFS hashes
        string memory _ipfsBasicInfoHash,
        string memory _ipfsFinancialsHash,
        string memory _ipfsLegalHash,
        string memory _ipfsMediaHash
    ) external {
        Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Unauthorized"
        );
        require(prop.isActive, "Property is inactive");

        // Update basic info if provided
        if (bytes(_title).length > 0) {
            prop.title = _title;
        }
        if (bytes(_description).length > 0) {
            prop.description = _description;
        }
        if (bytes(_propertyType).length > 0) {
            prop.propertyType = _propertyType;
        }
        if (bytes(_developerName).length > 0) {
            prop.developer = _developerName;
        }

        // Update location if provided
        if (bytes(_location).length > 0) {
            prop.location = _location;
        }
        if (bytes(_city).length > 0) {
            prop.city = _city;
        }
        if (bytes(_state).length > 0) {
            prop.state = _state;
        }
        if (bytes(_country).length > 0) {
            prop.country = _country;
        }
        if (_zipCode > 0) {
            prop.zipCode = _zipCode;
        }

        // Update property details if provided
        if (_images.length > 0) {
            prop.images = _images;
        }
        if (_yearBuilt > 0) {
            prop.yearBuilt = _yearBuilt;
        }
        if (_size > 0) {
            prop.size = _size;
        }
        if (_bedrooms > 0) {
            prop.bedrooms = _bedrooms;
        }
        if (_bathrooms > 0) {
            prop.bathrooms = _bathrooms;
        }

        // Update IPFS hashes if provided
        if (bytes(_ipfsBasicInfoHash).length > 0) {
            prop.ipfsBasicInfoHash = _ipfsBasicInfoHash;
        }
        if (bytes(_ipfsFinancialsHash).length > 0) {
            prop.ipfsFinancialsHash = _ipfsFinancialsHash;
        }
        if (bytes(_ipfsLegalHash).length > 0) {
            prop.ipfsLegalHash = _ipfsLegalHash;
        }
        if (bytes(_ipfsMediaHash).length > 0) {
            prop.ipfsMediaHash = _ipfsMediaHash;
        }

        emit PropertyUpdated(
            _propertyId,
            _title,
            _location,
            _city,
            _state,
            _country
        );
    }

    function deactivateProperty(uint256 _propertyId) external {
        Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Unauthorized"
        );
        prop.isActive = false;
        emit PropertyDeactivated(_propertyId);
    }

    function createCampaign(
        uint256 _propertyId,
        uint256 _targetAmount,
        uint256 _duration
    ) external returns (uint256) {
        Property storage prop = properties[_propertyId];
        require(prop.isActive, "Property is not active");
        require(
            msg.sender == prop.developerAddress,
            "Only developer can create campaign"
        );

        campaignCount++;
        uint256 deadline = block.timestamp + _duration;

        campaigns[campaignCount] = Campaign({
            campaignId: campaignCount,
            propertyId: _propertyId,
            developer: msg.sender,
            targetAmount: _targetAmount,
            totalRaised: 0,
            deadline: deadline,
            isOpen: true,
            isSuccessful: false
        });

        prop.campaignIds.push(campaignCount);

        emit CampaignCreated(
            campaignCount,
            _propertyId,
            _targetAmount,
            deadline
        );
        return campaignCount;
    }

    function invest(
        uint256 _campaignId,
        uint256 _unitAmount
    ) external nonReentrant {
        require(_unitAmount > 0, "Must invest in at least one unit");

        Campaign storage camp = campaigns[_campaignId];
        require(camp.isOpen, "Campaign closed");
        require(block.timestamp <= camp.deadline, "Campaign expired");

        Property storage prop = properties[camp.propertyId];
        uint256 amount = _unitAmount * prop.unitPrice;
        uint256 newFunding = prop.currentFunding + amount;

        require(
            amount >= prop.minInvestment,
            "Investment below minimum amount"
        );
        require(
            newFunding <= prop.totalInvestment,
            "Exceeds total investment goal"
        );
        require(
            stablecoin.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        // Update funding amounts
        camp.totalRaised += amount;
        prop.currentFunding = newFunding;
        investorBalances[_campaignId][msg.sender] += amount;

        // Track investor's campaign if not already tracked
        if (!hasInvested[msg.sender][_campaignId]) {
            investorCampaigns[msg.sender].push(_campaignId);
            hasInvested[msg.sender][_campaignId] = true;
        }

        // Check if campaign is now fully funded
        if (newFunding >= prop.totalInvestment) {
            camp.isOpen = false;
            camp.isSuccessful = true;
            emit CampaignFullyFunded(_campaignId, newFunding);
        }

        emit Invested(_campaignId, msg.sender, amount);
        emit InvestmentTracked(msg.sender, _campaignId, amount);
    }

    function finalizeCampaign(uint256 _campaignId) external nonReentrant {
        Campaign storage camp = campaigns[_campaignId];
        require(block.timestamp > camp.deadline, "Campaign still active");
        require(camp.isOpen, "Already finalized");

        camp.isOpen = false;

        if (camp.totalRaised >= camp.targetAmount) {
            camp.isSuccessful = true;
            require(
                stablecoin.transfer(camp.developer, camp.totalRaised),
                "Payout failed"
            );
            emit PayoutSent(_campaignId, camp.developer, camp.totalRaised);
        }
    }

    function claimRefund(uint256 _campaignId) external nonReentrant {
        Campaign storage camp = campaigns[_campaignId];
        require(!camp.isSuccessful, "Campaign succeeded");
        require(!camp.isOpen, "Campaign still active");

        uint256 invested = investorBalances[_campaignId][msg.sender];
        require(invested > 0, "Nothing to refund");

        investorBalances[_campaignId][msg.sender] = 0;
        require(stablecoin.transfer(msg.sender, invested), "Refund failed");

        emit Refunded(_campaignId, msg.sender, invested);
    }

    // Property and Investment Helpers
    function getPropertyCampaigns(
        uint256 _propertyId
    ) external view returns (uint256[] memory) {
        return properties[_propertyId].campaignIds;
    }

    function getInvestmentDetails(
        uint256 _propertyId
    )
        external
        view
        returns (
            uint256 totalInvestment,
            uint256 minInvestment,
            uint256 currentFunding,
            uint256 expectedROI,
            uint256 investmentDuration,
            string memory currency,
            string memory investmentType,
            uint256 ownershipPercentage
        )
    {
        Property storage prop = properties[_propertyId];
        return (
            prop.totalInvestment,
            prop.minInvestment,
            prop.currentFunding,
            prop.expectedROI,
            prop.investmentDuration / (30 days),
            prop.currency,
            prop.investmentType == InvestmentType.Equity ? "Equity" : "Debt",
            prop.ownershipPercentage
        );
    }

    function getProperty(
        uint256 _propertyId
    )
        external
        view
        returns (
            uint256 propertyId,
            string memory title,
            string memory description,
            string memory propertyType,
            string memory developer,
            string[] memory images,
            string memory location,
            string memory city,
            string memory state,
            string memory country,
            uint256 zipCode,
            uint256 unitPrice,
            uint256 totalUnits,
            uint256 totalInvestment,
            uint256 minInvestment,
            uint256 currentFunding,
            uint256 expectedROI,
            uint256 investmentDuration,
            uint256 yearBuilt,
            uint256 size,
            uint256 bedrooms,
            uint256 bathrooms,
            bool isActive,
            string memory ipfsBasicInfoHash,
            string memory ipfsFinancialsHash,
            string memory ipfsLegalHash,
            string memory ipfsMediaHash
        )
    {
        Property storage prop = properties[_propertyId];
        return (
            prop.propertyId,
            prop.title,
            prop.description,
            prop.propertyType,
            prop.developer,
            prop.images,
            prop.location,
            prop.city,
            prop.state,
            prop.country,
            prop.zipCode,
            prop.unitPrice,
            prop.totalUnits,
            prop.totalInvestment,
            prop.minInvestment,
            prop.currentFunding,
            prop.expectedROI,
            prop.investmentDuration,
            prop.yearBuilt,
            prop.size,
            prop.bedrooms,
            prop.bathrooms,
            prop.isActive,
            prop.ipfsBasicInfoHash,
            prop.ipfsFinancialsHash,
            prop.ipfsLegalHash,
            prop.ipfsMediaHash
        );
    }

    function getProperties(
        uint256 _offset,
        uint256 _limit
    ) external view returns (Property[] memory) {
        require(_limit > 0 && _limit <= 50, "Limit must be between 1 and 50");

        uint256 totalProperties = propertyCount;
        uint256 resultCount = _limit;

        if (_offset >= totalProperties) {
            resultCount = 0;
        } else if (_offset + _limit > totalProperties) {
            resultCount = totalProperties - _offset;
        }

        Property[] memory result = new Property[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = properties[_offset + i + 1];
        }

        return result;
    }

    function getMyCampaigns() external view returns (
        uint256[] memory campaignIds,
        Campaign[] memory campaignsData,
        Property[] memory propertiesData,
        uint256[] memory fundingProgress,
        uint256[] memory timeRemaining
    ) {
        campaignIds = developerCampaigns[msg.sender];
        uint256 count = campaignIds.length;
        
        campaignsData = new Campaign[](count);
        propertiesData = new Property[](count);
        fundingProgress = new uint256[](count);
        timeRemaining = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 campaignId = campaignIds[i];
            Campaign storage campaign = campaigns[campaignId];
            Property storage property = properties[campaign.propertyId];
            
            campaignsData[i] = campaign;
            propertiesData[i] = property;
            
            // Calculate funding progress (0-100%)
            if (property.totalInvestment > 0) {
                fundingProgress[i] = (property.currentFunding * 100) / property.totalInvestment;
            }
            
            // Calculate time remaining (0 if expired)
            if (block.timestamp < campaign.deadline) {
                timeRemaining[i] = campaign.deadline - block.timestamp;
            }
        }
        
        return (campaignIds, campaignsData, propertiesData, fundingProgress, timeRemaining);
    }


    function getMyInvestments() external view returns (
        uint256[] memory campaignIds,
        uint256[] memory amounts,
        Campaign[] memory campaignsData,
        Property[] memory propertiesData,
        uint256[] memory ownershipShares,
        uint256[] memory estimatedReturns,
        bool[] memory isCampaignActive
    ) {
        campaignIds = investorCampaigns[msg.sender];
        uint256 count = campaignIds.length;
        
        amounts = new uint256[](count);
        campaignsData = new Campaign[](count);
        propertiesData = new Property[](count);
        ownershipShares = new uint256[](count);
        estimatedReturns = new uint256[](count);
        isCampaignActive = new bool[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 campaignId = campaignIds[i];
            Campaign storage campaign = campaigns[campaignId];
            Property storage property = properties[campaign.propertyId];
            
            amounts[i] = investorBalances[campaignId][msg.sender];
            campaignsData[i] = campaign;
            propertiesData[i] = property;
            isCampaignActive[i] = campaign.isOpen && block.timestamp <= campaign.deadline;
            
            // Calculate ownership share (0-100%)
            if (property.totalInvestment > 0) {
                ownershipShares[i] = (amounts[i] * 100) / property.totalInvestment;
            }
            
            // Calculate estimated returns based on ROI and investment duration
            if (property.investmentDuration > 0 && property.expectedROI > 0) {
                uint256 durationInYears = property.investmentDuration / 365 days;
                estimatedReturns[i] = amounts[i] + ((amounts[i] * property.expectedROI * durationInYears) / 10000);
            }
        }
        
        return (
            campaignIds,
            amounts,
            campaignsData,
            propertiesData,
            ownershipShares,
            estimatedReturns,
            isCampaignActive
        );
    }

    function getMyProperties() external view returns (Property[] memory) {
        uint256[] memory propertyIds = developerProperties[msg.sender];
        Property[] memory result = new Property[](propertyIds.length);

        for (uint256 i = 0; i < propertyIds.length; i++) {
            result[i] = properties[propertyIds[i]];
        }

        return result;
    }

    function getCampaign(
        uint256 _campaignId
    ) external view returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    function getInvestorBalance(
        uint256 _campaignId,
        address _user
    ) external view returns (uint256) {
        return investorBalances[_campaignId][_user];
    }

    function getInvestorShare(
        uint256 _campaignId,
        address _investor
    )
        external
        view
        returns (
            uint256 investmentAmount,
            uint256 ownershipShare,
            uint256 estimatedReturns
        )
    {
        Campaign storage camp = campaigns[_campaignId];
        Property storage prop = properties[camp.propertyId];

        investmentAmount = investorBalances[_campaignId][_investor];

        if (prop.investmentType == InvestmentType.Equity) {
            // For equity, calculate ownership percentage of the property
            ownershipShare =
                (investmentAmount * prop.ownershipPercentage * 100) /
                prop.totalInvestment;
        } else {
            // For debt, ownership share is not applicable
            ownershipShare = 0;
        }

        // Calculate estimated returns based on ROI and investment duration
        uint256 durationInYears = prop.investmentDuration / (365 days);
        estimatedReturns =
            (investmentAmount * prop.expectedROI * durationInYears) /
            10000; // ROI is in basis points

        return (investmentAmount, ownershipShare, estimatedReturns);
    }
}
