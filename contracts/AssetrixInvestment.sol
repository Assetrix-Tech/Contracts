// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract Assetrix is Ownable, ReentrancyGuard, Pausable {
    IERC20 public stablecoin;

    constructor(address _stablecoin) {
        require(_stablecoin != address(0), "Invalid stablecoin address");
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

    
    enum PropertyUse {
        PrimaryResidence,
        SecondaryHome,
        ShortTermRental,
        LongTermRental,
        Office,
        Retail,
        Restaurant,
        HotelLodging,
        Industrial,
        Other
    }

    
    enum PropertyStatus {
        PreConstruction,
        UnderConstruction,
        Completed,
        Renovation,
        UnderContract,
        Leased,
        OffMarket
    }

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
        uint256 size;
        uint256 bedrooms;
        uint256 bathrooms;
        // Investment Details
        uint256 unitPrice;
        uint256 totalUnits;
        uint256 totalInvestment;
        uint256 minInvestment;
        uint256 expectedROI; // in basis points (1% = 100)
        uint256 investmentDuration;
        InvestmentType investmentType;
        uint256 ownershipPercentage; // for equity investments (0-10000 for 0-100%)
        // Status
        uint256 currentFunding;
        bool isActive;
        bool isFullyFunded;
        // Metadata
        string ipfsImagesHash; 
        string ipfsMetadataHash; 
        // Investment tracking
        address[] investors;
        mapping(address => uint256) investments;
        uint256 investorCount;
        address developerAddress;
    }

    struct Milestone {
        uint256 id;
        string title;
        string description;
        uint256 percentage; 
        bool isCompleted;
        string ipfsProofHash; 
        uint256 completedAt;
    }


    uint256 public propertyCount;

    // --- MAPPINGS ---
    mapping(uint256 => Property) public properties;
    mapping(address => uint256[]) public developerProperties;
    mapping(address => uint256[]) public investorProperties; 
    mapping(uint256 => Milestone[]) public propertyMilestones; // propertyId => Milestone[]
    mapping(uint256 => uint256) public releasedFunds; // propertyId => amount

    // --- EVENTS ---
    event PropertyCreated(uint256 indexed propertyId, address indexed developer, string title);
    event PropertyUpdated(uint256 indexed propertyId, string ipfsMetadataHash);
    event PropertyDeactivated(uint256 indexed propertyId);
    event Invested(uint256 indexed propertyId, address indexed investor, uint256 amount);
    event Refunded(uint256 indexed propertyId, address indexed investor, uint256 amount);
    event PayoutSent(uint256 indexed propertyId, address indexed developer, uint256 amount);
    event PropertyFullyFunded(uint256 indexed propertyId, uint256 totalRaised);
    event MilestoneCreated(uint256 indexed propertyId, uint256 milestoneId, string title, uint256 percentage);
    event MilestoneCompleted(uint256 indexed propertyId, uint256 milestoneId, string ipfsProofHash);
    event FundsReleased(uint256 indexed propertyId, uint256 milestoneId, uint256 amount);
    event StablecoinUpdated(address indexed newStablecoin);

    // Modifier to check if a property exists and is active
    modifier propertyExists(uint256 _propertyId) {
        require(_propertyId > 0 && _propertyId <= propertyCount, "Property does not exist");
        require(properties[_propertyId].isActive, "Property is not active");
        _;
    }

    function setStablecoin(address _newStablecoin) external onlyOwner {
        require(_newStablecoin != address(0), "Invalid address");
        require(Address.isContract(_newStablecoin), "Not a contract address");
        stablecoin = IERC20(_newStablecoin);
        emit StablecoinUpdated(_newStablecoin);
    }


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
        string memory _ipfsMetadataHash,
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
        InvestmentType _investmentType,
        uint256 _ownershipPercentage
    ) external nonReentrant returns (uint256) {
        // Input validation
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_developerName).length > 0, "Developer name required");
        require(bytes(_location).length > 0, "Location required");
        require(bytes(_city).length > 0, "City required");
        require(bytes(_state).length > 0, "State required");
        require(bytes(_country).length > 0, "Country required");
        require(_zipCode > 0, "Invalid ZIP code");
        require(_yearBuilt > 0, "Invalid year built");
        require(_size > 0, "Size must be greater than 0");
        require(_bedrooms >= 0, "Invalid bedrooms count");
        require(_bathrooms >= 0, "Invalid bathrooms count");
        
        // Investment validation
        require(_unitPrice > 0, "Unit price must be greater than 0");
        require(_totalUnits > 0, "Total units must be greater than 0");
        require(_totalInvestment > 0, "Total investment must be greater than 0");
        require(_minInvestment >= _unitPrice, "Min investment must be >= unit price");
        require(
            _totalInvestment == _unitPrice * _totalUnits,
            "Total investment must equal unit price * total units"
        );
        require(
            _investmentDuration > 0,
            "Investment duration must be greater than 0"
        );
        require(
            _investmentType != InvestmentType.Equity || _ownershipPercentage > 0,
            "Ownership percentage required for equity investments"
        );

        // Increment property counter and create new property
        propertyCount++;
        Property storage prop = properties[propertyCount];

        // Set basic property info
        prop.propertyId = propertyCount;
        prop.title = _title;
        prop.description = _description;
        prop.propertyType = _propertyType;
        prop.propertyUse = _propertyUse;
        prop.developer = _developerName;

        // Set location details
        prop.location = _location;
        prop.city = _city;
        prop.state = _state;
        prop.country = _country;
        prop.zipCode = _zipCode;

        // Set property details
        prop.yearBuilt = _yearBuilt;
        prop.size = _size;
        prop.bedrooms = _bedrooms;
        prop.bathrooms = _bathrooms;

        // Set investment details
        prop.unitPrice = _unitPrice;
        prop.totalUnits = _totalUnits;
        prop.totalInvestment = _totalInvestment;
        prop.minInvestment = _minInvestment;
        prop.currentFunding = 0;
        prop.expectedROI = _expectedROI;
        prop.investmentDuration = _investmentDuration * 1 days; // Convert days to seconds
        prop.investmentType = _investmentType;
        prop.ownershipPercentage = _ownershipPercentage;

        // Set status and metadata
        prop.isActive = true;
        prop.isFullyFunded = false;

        // IPFS hashes for metadata
        prop.ipfsImagesHash = _ipfsImagesHash;
        prop.ipfsMetadataHash = _ipfsMetadataHash;

        developerProperties[msg.sender].push(propertyCount);

        emit PropertyCreated(propertyCount, msg.sender, _title);x
        return propertyCount;
    }
}