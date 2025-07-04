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

    enum InvestmentType {
        Equity,
        Debt
    }

    // Property Type (Physical structure)
    enum PropertyType {
        Apartment,
        House,
        Townhouse,
        Condo,
        Villa,
        Bungalow,
        Studio,
        Other
    }

    // Property Use (Purpose/Usage)
    enum PropertyUse {
        // Residential Uses
        PrimaryResidence,
        SecondaryHome,
        ShortTermRental,
        LongTermRental,
        // Commercial Uses
        Office,
        Retail,
        Restaurant,
        HotelLodging,
        Industrial,
        Other
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

    // Legal and additional details are stored in IPFS metadata

    struct Property {
        // Basic Info
        uint256 propertyId;
        string title;
        string description;
        PropertyType propertyType;
        PropertyUse propertyUse;
        string developer;
        // Location
        string location;
        string city;
        string state;
        string country;
        uint256 zipCode;
        // Property Details
        uint256 yearBuilt;
        uint256 size; // in square meters
        uint256 bedrooms;
        uint256 bathrooms;
        // Investment Details
        uint256 unitPrice;
        uint256 totalUnits;
        uint256 totalInvestment;
        uint256 minInvestment;
        uint256 expectedROI; // in basis points (1% = 100)
        uint256 investmentDuration; // in days
        InvestmentType investmentType;
        uint256 ownershipPercentage; // for equity investments (0-10000 for 0-100%)
        // Status
        uint256 currentFunding;
        bool isActive;
        // Metadata
        string ipfsImagesHash; // IPFS hash for property images
        string ipfsMetadataHash; // Consolidated metadata (basic info, financials, legal, etc.)
        // Relationships
        uint256[] campaignIds;
        address developerAddress;
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
    event PropertyUpdated(uint256 propertyId, string ipfsMetadataHash);
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
        PropertyType _propertyType,
        PropertyUse _propertyUse,
        string memory _developerName,
        // Location
        string memory _location,
        string memory _city,
        string memory _state,
        string memory _country,
        uint256 _zipCode,
        // Property details
        string memory _ipfsImagesHash,
        string memory _ipfsMetadataHash, // Consolidated metadata hash
        uint256 _yearBuilt,
        uint256 _size, // in square meters
        uint256 _bedrooms,
        uint256 _bathrooms,
        // Investment details
        uint256 _unitPrice,
        uint256 _totalUnits,
        uint256 _totalInvestment,
        uint256 _minInvestment,
        uint256 _expectedROI, // in basis points (1% = 100)
        uint256 _investmentDuration, // in days
        InvestmentType _investmentType,
        uint256 _ownershipPercentage // for equity investments (0-10000 for 0-100%)
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
            uint8(_propertyType) <= uint8(PropertyType.Other),
            "Invalid property type"
        );
        require(
            uint8(_propertyUse) <= uint8(PropertyUse.Other),
            "Invalid property use"
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
        prop.developer = _developerName;
        prop.developerAddress = msg.sender;

        // Location details
        prop.location = _location;
        prop.city = _city;
        prop.state = _state;
        prop.country = _country;
        prop.zipCode = _zipCode;

        // Property details
        prop.ipfsImagesHash = _ipfsImagesHash; // Single hash for all images
        prop.yearBuilt = _yearBuilt;
        prop.size = _size; // in square meters
        prop.bedrooms = _bedrooms;
        prop.bathrooms = _bathrooms;

        // Investment details
        prop.unitPrice = _unitPrice;
        prop.totalUnits = _totalUnits;
        prop.totalInvestment = _totalInvestment;
        prop.minInvestment = _minInvestment;
        prop.currentFunding = 0;
        prop.expectedROI = _expectedROI;
        prop.investmentDuration = _investmentDuration * 1 days; // Convert days to seconds
        prop.investmentType = _investmentType;
        prop.ownershipPercentage = _ownershipPercentage;

        // Status and metadata
        prop.isActive = true;

        // IPFS hashes for metadata
        prop.ipfsImagesHash = _ipfsImagesHash;
        prop.ipfsMetadataHash = _ipfsMetadataHash;

        developerProperties[msg.sender].push(propertyCount);

        emit PropertyCreated(propertyCount, msg.sender, _title);
        return propertyCount;
    }

    function updateProperty(
        uint256 _propertyId,
        // Basic info (updatable)
        string memory _title,
        string memory _description,
        PropertyType _propertyType,
        PropertyUse _propertyUse,
        // Location (updatable)
        string memory _location,
        string memory _city,
        string memory _state,
        string memory _country,
        uint256 _zipCode,
        // Property details (updatable)
        string memory _ipfsImagesHash,
        string memory _ipfsMetadataHash,
        uint256 _yearBuilt,
        uint256 _size,
        uint256 _bedrooms,
        uint256 _bathrooms
    ) external {
        Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress,
            "Unauthorized: Only property developer can update"
        );
        require(prop.isActive, "Property is inactive");

        // Check if any campaigns exist for this property
        require(
            prop.campaignIds.length == 0,
            "Cannot update property with active campaigns"
        );

        // Update basic info if provided
        if (bytes(_title).length > 0) {
            prop.title = _title;
        }
        if (bytes(_description).length > 0) {
            prop.description = _description;
        }
        if (uint8(_propertyType) != 0) {
            // Default enum value is 0
            prop.propertyType = _propertyType;
        }
        if (uint8(_propertyUse) != 0) {
            // Default enum value is 0
            prop.propertyUse = _propertyUse;
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
        if (bytes(_ipfsImagesHash).length > 0) {
            prop.ipfsImagesHash = _ipfsImagesHash;
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
        if (bytes(_ipfsImagesHash).length > 0) {
            prop.ipfsImagesHash = _ipfsImagesHash;
        }
        if (bytes(_ipfsMetadataHash).length > 0) {
            prop.ipfsMetadataHash = _ipfsMetadataHash;
        }

        emit PropertyUpdated(
            _propertyId,
            prop.title,
            prop.location,
            prop.city,
            prop.state,
            prop.country
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

    /**
     * @notice Get investment details for a property
     * @param _propertyId The ID of the property
     * @return totalInvestment Total investment amount for the property
     * @return minInvestment Minimum investment amount
     * @return currentFunding Current funding amount
     * @return expectedROI Expected return on investment (in basis points)
     * @return investmentDuration Investment duration in months
     * @return investmentType Type of investment
     * @return ownershipPercentage Ownership percentage per unit (in basis points)
     */
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
            InvestmentType investmentType,
            uint256 ownershipPercentage
        )
    {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        require(prop.isActive, "Property is not active");

        return (
            prop.totalInvestment,
            prop.minInvestment,
            prop.currentFunding,
            prop.expectedROI,
            prop.investmentDuration / (30 days), // Convert to months
            prop.investmentType,
            prop.ownershipPercentage
        );
    }

    /**
     * @notice Get all properties owned by the message sender
     * @return Array of Property structs owned by the sender
     */
    function getMyProperties() external view returns (Property[] memory) {
        uint256[] memory propertyIds = developerProperties[msg.sender];
        Property[] memory result = new Property[](propertyIds.length);

        for (uint256 i = 0; i < propertyIds.length; i++) {
            uint256 propertyId = propertyIds[i];
            require(
                propertyId > 0 && propertyId <= propertyCount,
                "Invalid property ID"
            );
            result[i] = properties[propertyId];
        }

        return result;
    }

    /**
     * @notice Get campaign details by ID
     * @param _campaignId The ID of the campaign
     * @return The Campaign struct with campaign details
     */
    function getCampaign(
        uint256 _campaignId
    ) external view returns (Campaign memory) {
        require(
            _campaignId > 0 && _campaignId <= campaignCount,
            "Campaign does not exist"
        );
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.propertyId > 0, "Invalid campaign");
        return campaign;
    }

    /**
     * @notice Get investor's balance for a specific campaign
     * @param _campaignId The ID of the campaign
     * @param _user The address of the investor
     * @return The investment amount
     */
    function getInvestorBalance(
        uint256 _campaignId,
        address _user
    ) external view returns (uint256) {
        require(
            _campaignId > 0 && _campaignId <= campaignCount,
            "Invalid campaign ID"
        );
        require(_user != address(0), "Invalid user address");
        return investorBalances[_campaignId][_user];
    }

    function getProperties(
        uint256 _offset,
        uint256 _limit
    ) external view returns (uint256[] memory propertyIds, uint256 totalCount) {
        require(_limit > 0 && _limit <= 50, "Limit must be between 1 and 50");

        totalCount = propertyCount;
        uint256 resultCount = _limit;

        if (_offset >= totalCount) {
            resultCount = 0;
        } else if (_offset + _limit > totalCount) {
            resultCount = totalCount - _offset;
        }

        propertyIds = new uint256[](resultCount);
        // Populate property IDs array
        for (uint256 i = 0; i < resultCount; i++) {
            propertyIds[i] = _offset + i + 1; // +1 because property IDs start at 1
        }
    }

    function getMyCampaigns()
        external
        view
        returns (
            uint256[] memory campaignIds,
            Campaign[] memory campaignsData,
            Property[] memory propertiesData,
            uint256[] memory fundingProgress,
            uint256[] memory timeRemaining
        )
    {
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
                fundingProgress[i] =
                    (property.currentFunding * 100) /
                    property.totalInvestment;
            }

            // Calculate time remaining (0 if expired)
            if (block.timestamp < campaign.deadline) {
                timeRemaining[i] = campaign.deadline - block.timestamp;
            }
        }

        return (
            campaignIds,
            campaignsData,
            propertiesData,
            fundingProgress,
            timeRemaining
        );
    }

    function getMyInvestments()
        external
        view
        returns (
            uint256[] memory campaignIds,
            uint256[] memory amounts,
            Campaign[] memory campaignsData,
            Property[] memory propertiesData,
            uint256[] memory ownershipShares,
            uint256[] memory estimatedReturns,
            bool[] memory isCampaignActive
        )
    {
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
            isCampaignActive[i] =
                campaign.isOpen &&
                block.timestamp <= campaign.deadline;

            // Calculate ownership share (0-100%)
            if (property.totalInvestment > 0) {
                ownershipShares[i] =
                    (amounts[i] * 100) /
                    property.totalInvestment;
            }

            // Calculate estimated returns based on ROI and investment duration
            if (property.investmentDuration > 0 && property.expectedROI > 0) {
                uint256 durationInYears = property.investmentDuration /
                    365 days;
                estimatedReturns[i] =
                    amounts[i] +
                    ((amounts[i] * property.expectedROI * durationInYears) /
                        10000);
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
        require(_campaignId <= campaignCount, "Invalid campaign ID");
        Campaign storage camp = campaigns[_campaignId];
        require(camp.propertyId != 0, "Campaign does not exist");

        Property storage prop = properties[camp.propertyId];
        investmentAmount = investorBalances[_campaignId][_investor];

        if (investmentAmount > 0) {
            if (prop.investmentType == InvestmentType.Equity) {
                // For equity investments, calculate ownership percentage (scaled by 100)
                ownershipShare =
                    (investmentAmount * prop.ownershipPercentage * 100) /
                    prop.totalInvestment;
            }
            // For debt investments, ownershipShare remains 0

            // Calculate estimated returns based on ROI and investment duration
            if (prop.expectedROI > 0 && prop.investmentDuration > 0) {
                uint256 durationInYears = prop.investmentDuration / 365 days;
                estimatedReturns =
                    (investmentAmount * prop.expectedROI * durationInYears) /
                    10000;
            }
        }

        return (investmentAmount, ownershipShare, estimatedReturns);
    }
}
