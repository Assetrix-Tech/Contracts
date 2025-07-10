// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

contract Assetrix is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;

    IERC20Upgradeable public stablecoin;

    enum InvestmentType {
        Equity,
        Debt
    }

    // Property Type
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
        uint256 propertyId;
        string title;
        string description;
        PropertyType propertyType;
        PropertyUse propertyUse;
        string developer;
        string city;
        string state;
        string country;
        uint256 size;
        uint256 bedrooms;
        uint256 bathrooms;
        uint256 unitPrice;
        uint256 totalUnits;
        uint256 totalInvestment;
        uint256 minInvestment;
        uint256 expectedROI;
        uint256 investmentDuration;
        InvestmentType investmentType;
        uint256 ownershipPercentage;
        uint256 currentFunding;
        bool isActive;
        bool isFullyFunded;
        string ipfsImagesHash;
        string ipfsMetadataHash;
        address[] investors;
        mapping(address => uint256) investments;
        uint256 investorCount;
        address developerAddress;
    }

    struct PropertyView {
        uint256 propertyId;
        string title;
        string description;
        PropertyType propertyType;
        PropertyUse propertyUse;
        string developer;
        string city;
        string state;
        string country;
        uint256 size;
        uint256 bedrooms;
        uint256 bathrooms;
        uint256 unitPrice;
        uint256 totalUnits;
        uint256 totalInvestment;
        uint256 minInvestment;
        uint256 expectedROI;
        uint256 investmentDuration;
        InvestmentType investmentType;
        uint256 ownershipPercentage;
        uint256 currentFunding;
        bool isActive;
        bool isFullyFunded;
        string ipfsImagesHash;
        string ipfsMetadataHash;
        address developerAddress;
        uint256 investorCount;
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
    mapping(uint256 => Milestone[]) public propertyMilestones;
    mapping(uint256 => uint256) public releasedFunds;

    // --- EVENTS ---
    event PropertyCreated(
        uint256 indexed propertyId,
        address indexed developer,
        string title
    );
    event PropertyUpdated(uint256 indexed propertyId, string ipfsMetadataHash);
    event PropertyDeactivated(uint256 indexed propertyId);
    event Invested(
        uint256 indexed propertyId,
        address indexed investor,
        uint256 amount
    );
    event Refunded(
        uint256 indexed propertyId,
        address indexed investor,
        uint256 amount
    );
    event PayoutSent(
        uint256 indexed propertyId,
        address indexed developer,
        uint256 amount
    );
    event PropertyFullyFunded(uint256 indexed propertyId, uint256 totalRaised);
    event MilestoneCreated(
        uint256 indexed propertyId,
        uint256 milestoneId,
        string title,
        uint256 percentage
    );
    event MilestoneCompleted(
        uint256 indexed propertyId,
        uint256 milestoneId,
        string ipfsProofHash
    );
    event FundsReleased(
        uint256 indexed propertyId,
        uint256 milestoneId,
        uint256 amount
    );
    event StablecoinUpdated(address indexed newStablecoin);

    // Modifier to check if a property exists and is active
    modifier propertyExists(uint256 _propertyId) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        require(properties[_propertyId].isActive, "Property is not active");
        _;
    }

    function setStablecoin(address _newStablecoin) external onlyOwner {
        require(_newStablecoin != address(0), "Invalid address");
        require(Address.isContract(_newStablecoin), "Not a contract address");
        stablecoin = IERC20(_newStablecoin);
        emit StablecoinUpdated(_newStablecoin);
    }

    function initialize(address _stablecoin) public initializer {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        stablecoin = IERC20Upgradeable(_stablecoin);

        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
    }

    function createProperty(
        string memory _title,
        string memory _description,
        PropertyType _propertyType,
        PropertyUse _propertyUse,
        string memory _developerName,
        address _developerAddress,
        // Location
        string memory _city,
        string memory _state,
        string memory _country,
        // Property details
        string memory _ipfsImagesHash,
        string memory _ipfsMetadataHash,
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
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_developerName).length > 0, "Developer name required");
        require(_developerAddress != address(0), "Invalid developer address");
        require(
            msg.sender == _developerAddress,
            "Sender must be the developer"
        );
        require(bytes(_city).length > 0, "City required");
        require(bytes(_state).length > 0, "State required");
        require(bytes(_country).length > 0, "Country required");

        propertyCount++;
        Property storage prop = properties[propertyCount];

        prop.propertyId = propertyCount;
        prop.title = _title;
        prop.description = _description;
        prop.propertyType = _propertyType;
        prop.propertyUse = _propertyUse;
        prop.developer = _developerName;
        prop.developerAddress = msg.sender;

        prop.city = _city;
        prop.state = _state;
        prop.country = _country;
        prop.size = _size;
        prop.bedrooms = _bedrooms;
        prop.bathrooms = _bathrooms;

        prop.unitPrice = _unitPrice;
        prop.totalUnits = _totalUnits;
        prop.totalInvestment = _totalInvestment;
        prop.minInvestment = _minInvestment;
        prop.currentFunding = 0;
        prop.expectedROI = _expectedROI;
        prop.investmentDuration = _investmentDuration * 1 days;
        prop.investmentType = _investmentType;
        prop.ownershipPercentage = _ownershipPercentage;

        // Set status and metadata
        prop.isActive = true;
        prop.isFullyFunded = false;

        // IPFS hashes for metadata
        prop.ipfsImagesHash = _ipfsImagesHash;
        prop.ipfsMetadataHash = _ipfsMetadataHash;

        developerProperties[msg.sender].push(propertyCount);

        emit PropertyCreated(propertyCount, msg.sender, _title);
        return propertyCount;
    }

    function updateProperty(
        uint256 _propertyId,
        string memory _title,
        string memory _description,
        PropertyType _propertyType,
        PropertyUse _propertyUse,
        string memory _city,
        string memory _state,
        string memory _country,
        string memory _ipfsImagesHash,
        string memory _ipfsMetadataHash,
        uint256 _size,
        uint256 _bedrooms,
        uint256 _bathrooms
    ) external propertyExists(_propertyId) {
        Property storage prop = properties[_propertyId];

        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Unauthorized: Only property developer or owner can update"
        );

        require(!prop.isFullyFunded, "Cannot update a fully funded property");

        prop.title = _title;
        prop.description = _description;
        prop.propertyType = _propertyType;
        prop.propertyUse = _propertyUse;
        prop.city = _city;
        prop.state = _state;
        prop.country = _country;
        prop.size = _size;
        prop.bedrooms = _bedrooms;
        prop.bathrooms = _bathrooms;

        prop.ipfsImagesHash = _ipfsImagesHash;
        prop.ipfsMetadataHash = _ipfsMetadataHash;

        emit PropertyUpdated(_propertyId, _ipfsMetadataHash);
    }

    function deactivateProperty(
        uint256 _propertyId
    ) external propertyExists(_propertyId) {
        Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Unauthorized"
        );

        require(
            !prop.isFullyFunded,
            "Cannot deactivate a fully funded property"
        );

        prop.isActive = false;
        emit PropertyDeactivated(_propertyId);
    }
}
