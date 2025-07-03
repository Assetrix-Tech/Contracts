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

}