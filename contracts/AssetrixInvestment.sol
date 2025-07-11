// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract Assetrix is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;
    using Address for address;

    IERC20 public stablecoin;

    // Property Type
    enum PropertyType {
        ShortStay,
        LuxuryResidentialTowers
    }

    enum PropertyUse {
        Commercial,
        Hospitality,
        MixedUse
    }

    enum PropertyStatus {
        PreConstruction,
        UnderConstruction,
        Renovation
    }

    enum Duration {
        OneMonth, // 0
        ThreeMonths, // 1
        FiveMonths, // 2
        SevenMonths, // 3
        EightMonths, // 4
        NineMonths, // 5
        TenMonths, // 6
        TwelveMonths // 7
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
        Duration investmentDuration;
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
        Duration investmentDuration;
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

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function setStablecoin(address _newStablecoin) external onlyOwner {
        require(_newStablecoin != address(0), "Invalid address");
        require(_newStablecoin.code.length > 0, "Not a contract address");
        stablecoin = IERC20(_newStablecoin);
        emit StablecoinUpdated(_newStablecoin);
    }

    function initialize(address _stablecoin) public initializer {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        stablecoin = IERC20(_stablecoin);

        __Ownable_init(msg.sender);
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
        Duration _investmentDuration,
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
        prop.investmentDuration = _investmentDuration;
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
        for (uint256 i = 0; i < resultCount; i++) {
            propertyIds[i] = _offset + i + 1;
        }
    }

    function getProperty(
        uint256 _propertyId
    ) public view returns (PropertyView memory) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );

        Property storage prop = properties[_propertyId];

        return
            PropertyView({
                propertyId: prop.propertyId,
                title: prop.title,
                description: prop.description,
                propertyType: prop.propertyType,
                propertyUse: prop.propertyUse,
                developer: prop.developer,
                city: prop.city,
                state: prop.state,
                country: prop.country,
                size: prop.size,
                bedrooms: prop.bedrooms,
                bathrooms: prop.bathrooms,
                unitPrice: prop.unitPrice,
                totalUnits: prop.totalUnits,
                totalInvestment: prop.totalInvestment,
                minInvestment: prop.minInvestment,
                expectedROI: prop.expectedROI,
                investmentDuration: prop.investmentDuration,
                ownershipPercentage: prop.ownershipPercentage,
                currentFunding: prop.currentFunding,
                isActive: prop.isActive,
                isFullyFunded: prop.isFullyFunded,
                ipfsImagesHash: prop.ipfsImagesHash,
                ipfsMetadataHash: prop.ipfsMetadataHash,
                developerAddress: prop.developerAddress,
                investorCount: prop.investorCount
            });
    }

    function getMyProperties() external view returns (PropertyView[] memory) {
        uint256[] memory propertyIds = developerProperties[msg.sender];
        PropertyView[] memory result = new PropertyView[](propertyIds.length);

        for (uint256 i = 0; i < propertyIds.length; i++) {
            uint256 propertyId = propertyIds[i];
            require(
                propertyId > 0 && propertyId <= propertyCount,
                "Invalid property ID"
            );

            Property storage prop = properties[propertyId];

            result[i] = PropertyView({
                propertyId: prop.propertyId,
                title: prop.title,
                description: prop.description,
                propertyType: prop.propertyType,
                propertyUse: prop.propertyUse,
                developer: prop.developer,
                city: prop.city,
                state: prop.state,
                country: prop.country,
                size: prop.size,
                bedrooms: prop.bedrooms,
                bathrooms: prop.bathrooms,
                unitPrice: prop.unitPrice,
                totalUnits: prop.totalUnits,
                totalInvestment: prop.totalInvestment,
                minInvestment: prop.minInvestment,
                expectedROI: prop.expectedROI,
                investmentDuration: prop.investmentDuration,
                ownershipPercentage: prop.ownershipPercentage,
                currentFunding: prop.currentFunding,
                isActive: prop.isActive,
                isFullyFunded: prop.isFullyFunded,
                ipfsImagesHash: prop.ipfsImagesHash,
                ipfsMetadataHash: prop.ipfsMetadataHash,
                developerAddress: prop.developerAddress,
                investorCount: prop.investorCount
            });
        }

        return result;
    }

    function getTotalProperties() external view returns (uint256) {
        return propertyCount;
    }

    function getPropertyInvestors(
        uint256 _propertyId
    ) external view returns (address[] memory) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        return prop.investors;
    }
}
