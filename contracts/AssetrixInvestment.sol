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
    // ============ LIBRARIES ============
    using SafeERC20 for IERC20;
    using Address for address;

    // ============ STATE VARIABLES ============
    IERC20 public stablecoin;
    uint256 public propertyCount;
    uint256 public transactionCount;

    // ============ ENUMS ============
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

    enum TransactionType {
        Investment,
        ROIPayout,
        FinalPayout,
        Refund,
        EmergencyRefund,
        EarlyExitFee,
        MilestoneRelease,
        PropertyCreation,
        PropertyUpdate
    }

    // ============ STRUCTS ============
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
        Milestone[] milestones;
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
        Milestone[] milestones;
    }

    struct Milestone {
        uint256 id;
        string title;
        string description;
        uint256 percentage;
        bool fundsRequested;
        bool fundsReleased;
        bool isCompleted;
        string ipfsProofHash;
        uint256 completedAt;
        uint256 requestedAt;
        uint256 releasedAt;
    }

    // --- TRANSACTION TRACKING ---
    struct Transaction {
        uint256 transactionId;
        uint256 propertyId;
        address from;
        address to;
        TransactionType transactionType;
        uint256 amount;
        uint256 timestamp;
        string description;
        bool isSuccessful;
        string metadata; // IPFS hash for additional data
        uint256 blockNumber;
        bytes32 transactionHash;
    }

    // ============ MAPPINGS ============
    mapping(uint256 => Property) public properties;
    mapping(address => uint256[]) public developerProperties;
    mapping(address => uint256[]) public investorProperties;
    mapping(uint256 => uint256) public releasedFunds;
    mapping(uint256 => Transaction) public transactions;
    mapping(address => uint256[]) public userTransactions;
    mapping(uint256 => uint256[]) public propertyTransactions;

    // ============ EVENTS ============
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
    event MilestoneFundsRequested(
        uint256 indexed propertyId,
        uint256 milestoneId,
        address indexed developer
    );
    event MilestoneFundsReleased(
        uint256 indexed propertyId,
        uint256 milestoneId,
        uint256 amount,
        address indexed developer
    );
    event MilestoneMarkedCompleted(
        uint256 indexed propertyId,
        uint256 milestoneId,
        string ipfsProofHash
    );
    event StablecoinUpdated(address indexed newStablecoin);

    // ============ MODIFIERS ============
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
        uint256 _ownershipPercentage,
        string[] memory _milestoneTitles,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestonePercentages
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
        require(
            _milestoneTitles.length == _milestoneDescriptions.length &&
                _milestoneTitles.length == _milestonePercentages.length,
            "Milestone arrays must have matching lengths"
        );
        require(
            _milestoneTitles.length > 0 && _milestoneTitles.length <= 4,
            "Maximum 4 milestones allowed"
        );

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

        // Create milestones
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _milestoneTitles.length; i++) {
            require(_milestonePercentages[i] > 0 && _milestonePercentages[i] <= 100, "Invalid milestone percentage");
            totalPercentage += _milestonePercentages[i];
            
            prop.milestones.push(Milestone({
                id: i,
                title: _milestoneTitles[i],
                description: _milestoneDescriptions[i],
                percentage: _milestonePercentages[i],
                fundsRequested: false,
                fundsReleased: false,
                isCompleted: false,
                ipfsProofHash: "",
                completedAt: 0,
                requestedAt: 0,
                releasedAt: 0
            }));

            emit MilestoneCreated(propertyCount, i, _milestoneTitles[i], _milestonePercentages[i]);
        }
        require(totalPercentage <= 100, "Total milestone percentage cannot exceed 100%");

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
        uint256 _bathrooms,
        string[] memory _milestoneTitles,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestonePercentages
    ) external propertyExists(_propertyId) {
        Property storage prop = properties[_propertyId];

        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Unauthorized: Only property developer or owner can update"
        );

        require(!prop.isFullyFunded, "Cannot update a fully funded property");

        // Validate milestone arrays
        require(
            _milestoneTitles.length == _milestoneDescriptions.length &&
            _milestoneTitles.length == _milestonePercentages.length,
            "Milestone arrays must have matching lengths"
        );
        require(
            _milestoneTitles.length <= 4,
            "Maximum 4 milestones allowed"
        );

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

        // Clear existing milestones
        delete prop.milestones;

        // Add new milestones
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _milestoneTitles.length; i++) {
            require(_milestonePercentages[i] > 0 && _milestonePercentages[i] <= 100, "Invalid milestone percentage");
            totalPercentage += _milestonePercentages[i];
            
            prop.milestones.push(Milestone({
                id: i,
                title: _milestoneTitles[i],
                description: _milestoneDescriptions[i],
                percentage: _milestonePercentages[i],
                fundsRequested: false,
                fundsReleased: false,
                isCompleted: false,
                ipfsProofHash: "",
                completedAt: 0,
                requestedAt: 0,
                releasedAt: 0
            }));

            emit MilestoneCreated(_propertyId, i, _milestoneTitles[i], _milestonePercentages[i]);
        }
        require(totalPercentage <= 100, "Total milestone percentage cannot exceed 100%");

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
                investorCount: prop.investorCount,
                milestones: prop.milestones
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
                investorCount: prop.investorCount,
                milestones: prop.milestones
            });
        }

        return result;
    }

    function getMyInvestedProperties()
        external
        view
        returns (PropertyView[] memory)
    {
        uint256[] memory propertyIds = investorProperties[msg.sender];
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
                investorCount: prop.investorCount,
                milestones: prop.milestones
            });
        }

        return result;
    }

    // Admin functions for dashboard
    function getDeveloperPropertyCount(
        address _developer
    ) external view returns (uint256) {
        return developerProperties[_developer].length;
    }

    function getDeveloperProperties(
        address _developer
    ) external view returns (PropertyView[] memory) {
        uint256[] memory propertyIds = developerProperties[_developer];
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
                investorCount: prop.investorCount,
                milestones: prop.milestones
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

    function _removeInvestorFromProperty(uint256 _propertyId, address _investor) internal {
        Property storage prop = properties[_propertyId];
        // Remove from investors array
        for (uint256 i = 0; i < prop.investors.length; i++) {
            if (prop.investors[i] == _investor) {
                prop.investors[i] = prop.investors[prop.investors.length - 1];
                prop.investors.pop();
                break;
            }
        }
        // Remove from investor properties
        uint256[] storage investorProps = investorProperties[_investor];
        for (uint256 i = 0; i < investorProps.length; i++) {
            if (investorProps[i] == _propertyId) {
                investorProps[i] = investorProps[investorProps.length - 1];
                investorProps.pop();
                break;
            }
        }
        // Clear investment amount
        prop.investments[_investor] = 0;
        prop.investorCount--;
    }

    // ============ MILESTONE QUERIES ============
    function getPropertyMilestones(
        uint256 _propertyId
    ) external view returns (Milestone[] memory) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        return prop.milestones;
    }

    // ============ MILESTONE QUERY FUNCTIONS ============
    
    // Get milestone status for a specific milestone
    function getMilestoneStatus(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external view returns (
        bool fundsRequested,
        bool fundsReleased,
        bool isCompleted,
        uint256 requestedAt,
        uint256 releasedAt,
        uint256 completedAt
    ) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        require(
            _milestoneId < prop.milestones.length,
            "Milestone does not exist"
        );

        Milestone storage milestone = prop.milestones[_milestoneId];
        return (
            milestone.fundsRequested,
            milestone.fundsReleased,
            milestone.isCompleted,
            milestone.requestedAt,
            milestone.releasedAt,
            milestone.completedAt
        );
    }

    // Get next milestone that can be requested
    function getNextRequestableMilestone(
        uint256 _propertyId
    ) external view returns (uint256) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        
        for (uint256 i = 0; i < prop.milestones.length; i++) {
            Milestone storage milestone = prop.milestones[i];
            
            // If this milestone is already completed, check the next one
            if (milestone.isCompleted) {
                continue;
            }
            
            // If this milestone already has funds requested or released, check the next one
            if (milestone.fundsRequested || milestone.fundsReleased) {
                continue;
            }
            
            // For the first milestone, it can always be requested
            if (i == 0) {
                return i;
            }
            
            // For subsequent milestones, check if the previous one is completed
            Milestone storage prevMilestone = prop.milestones[i - 1];
            if (prevMilestone.isCompleted) {
                return i;
            }
        }
        
        // Return a high number if no milestone can be requested
        return type(uint256).max;
    }

    // Get milestones that are ready for fund release (requested but not released)
    function getMilestonesReadyForRelease(
        uint256 _propertyId
    ) external view returns (uint256[] memory) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        
        uint256[] memory tempArray = new uint256[](prop.milestones.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < prop.milestones.length; i++) {
            Milestone storage milestone = prop.milestones[i];
            if (milestone.fundsRequested && !milestone.fundsReleased && !milestone.isCompleted) {
                tempArray[count] = i;
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempArray[i];
        }
        
        return result;
    }

    // Get milestones that are ready for completion marking (released but not completed)
    function getMilestonesReadyForCompletion(
        uint256 _propertyId
    ) external view returns (uint256[] memory) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        
        uint256[] memory tempArray = new uint256[](prop.milestones.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < prop.milestones.length; i++) {
            Milestone storage milestone = prop.milestones[i];
            if (milestone.fundsReleased && !milestone.isCompleted) {
                tempArray[count] = i;
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempArray[i];
        }
        
        return result;
    }

    // ============ INVESTMENT FUNCTION ============
    function invest(
        uint256 _propertyId,
        uint256 _amount
    ) external nonReentrant whenNotPaused {
        require(_amount > 0, "Investment amount must be greater than 0");
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );

        Property storage prop = properties[_propertyId];
        require(prop.isActive, "Property is not active");
        
        // Check if property can accept investments (handles re-funding after early exits)
        bool canAccept = this.canAcceptInvestments(_propertyId);
        require(canAccept, "Property cannot accept investments at this time");
        
        require(
            _amount >= prop.minInvestment,
            "Investment below minimum required"
        );

        // Check if property will be fully funded after this investment
        bool willBeFullyFunded = (prop.currentFunding + _amount) >=
            prop.totalInvestment;
        uint256 actualInvestment = willBeFullyFunded
            ? (prop.totalInvestment - prop.currentFunding)
            : _amount;

        // Transfer stablecoin from investor to contract
        require(
            stablecoin.transferFrom(
                msg.sender,
                address(this),
                actualInvestment
            ),
            "Transfer failed"
        );

        // Update property funding
        prop.currentFunding += actualInvestment;

        // Add investor to property if not already invested
        if (prop.investments[msg.sender] == 0) {
            prop.investors.push(msg.sender);
            prop.investorCount++;
            investorProperties[msg.sender].push(_propertyId);
        }

        // Update investor's investment amount
        prop.investments[msg.sender] += actualInvestment;

        // Mark property as fully funded if needed
        if (willBeFullyFunded) {
            prop.isFullyFunded = true;
            emit PropertyFullyFunded(_propertyId, prop.currentFunding);
        }

        // Record transaction
        _recordTransaction(
            _propertyId,
            msg.sender,
            prop.developerAddress,
            TransactionType.Investment,
            actualInvestment,
            "Investment in property"
        );

        emit Invested(_propertyId, msg.sender, actualInvestment);

        // Refund excess amount if any
        if (willBeFullyFunded && _amount > actualInvestment) {
            uint256 excess = _amount - actualInvestment;
            require(
                stablecoin.transfer(msg.sender, excess),
                "Excess refund failed"
            );
        }
    }

    // ============ ROI PAYOUT FUNCTION ============
    function payoutROI(
        uint256 _propertyId,
        address _investor,
        uint256 _amount
    ) external nonReentrant {
        Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Only developer or owner can payout ROI"
        );
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            prop.investments[_investor] > 0,
            "Investor has no investment in this property"
        );
        require(_amount > 0, "Payout amount must be greater than 0");

        // Transfer stablecoin from developer to investor
        require(
            stablecoin.transferFrom(msg.sender, _investor, _amount),
            "ROI transfer failed"
        );

        // Record transaction
        _recordTransaction(
            _propertyId,
            msg.sender,
            _investor,
            TransactionType.ROIPayout,
            _amount,
            "ROI payout to investor"
        );

        emit PayoutSent(_propertyId, _investor, _amount);
    }

    // ============ FINAL PAYOUT FUNCTION ============
    function payoutFinal(
        uint256 _propertyId,
        address _investor,
        uint256 _amount
    ) external nonReentrant {
        Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Only developer or owner can payout final amount"
        );
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            prop.investments[_investor] > 0,
            "Investor has no investment in this property"
        );
        require(_amount > 0, "Payout amount must be greater than 0");

        // Transfer stablecoin from developer to investor
        require(
            stablecoin.transferFrom(msg.sender, _investor, _amount),
            "Final payout transfer failed"
        );

        // Record transaction
        _recordTransaction(
            _propertyId,
            msg.sender,
            _investor,
            TransactionType.FinalPayout,
            _amount,
            "Final payout to investor"
        );

        emit PayoutSent(_propertyId, _investor, _amount);
    }

    // ============ REFUND FUNCTION ============
    function refund(
        uint256 _propertyId,
        address _investor
    ) external nonReentrant {
        Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Only developer or owner can refund"
        );
        require(
            prop.investments[_investor] > 0,
            "Investor has no investment to refund"
        );

        uint256 refundAmount = prop.investments[_investor];

        // Transfer stablecoin from contract to investor
        require(
            stablecoin.transfer(_investor, refundAmount),
            "Refund transfer failed"
        );

        // Update property funding
        prop.currentFunding -= refundAmount;

        // Record transaction
        _recordTransaction(
            _propertyId,
            address(this),
            _investor,
            TransactionType.Refund,
            refundAmount,
            "Refund to investor"
        );

        emit Refunded(_propertyId, _investor, refundAmount);
    }

    // ============ EMERGENCY REFUND FUNCTION ============
    function emergencyRefund(
        uint256 _propertyId,
        address _investor
    ) external nonReentrant onlyOwner {
        Property storage prop = properties[_propertyId];
        require(
            prop.investments[_investor] > 0,
            "Investor has no investment to refund"
        );

        uint256 refundAmount = prop.investments[_investor];

        // Transfer stablecoin from contract to investor
        require(
            stablecoin.transfer(_investor, refundAmount),
            "Emergency refund transfer failed"
        );

        // Update property funding
        prop.currentFunding -= refundAmount;

        // Record transaction
        _recordTransaction(
            _propertyId,
            address(this),
            _investor,
            TransactionType.EmergencyRefund,
            refundAmount,
            "Emergency refund to investor"
        );

        emit Refunded(_propertyId, _investor, refundAmount);
    }

    // ============ EARLY EXIT FUNCTION ============
    function earlyExit(uint256 _propertyId) external nonReentrant {
        Property storage prop = properties[_propertyId];
        require(prop.investments[msg.sender] > 0, "No investment to exit");
        
        // Allow early exit even after full funding, but with restrictions
        if (prop.isFullyFunded) {
            // Check if any milestone funds have been released
            bool hasReleasedFunds = false;
            for (uint256 i = 0; i < prop.milestones.length; i++) {
                if (prop.milestones[i].fundsReleased) {
                    hasReleasedFunds = true;
                    break;
                }
            }
            require(!hasReleasedFunds, "Cannot exit after milestone funds have been released");
        }

        uint256 investmentAmount = prop.investments[msg.sender];
        uint256 exitFee = (investmentAmount * 5) / 100; // 5% exit fee
        uint256 refundAmount = investmentAmount - exitFee;

        // Transfer refund to investor
        require(
            stablecoin.transfer(msg.sender, refundAmount),
            "Early exit refund failed"
        );

        // Transfer fee to platform (owner)
        require(
            stablecoin.transfer(owner(), exitFee),
            "Exit fee transfer failed"
        );

        // Update property funding
        prop.currentFunding -= investmentAmount;
        
        // If property was fully funded and now isn't, update status
        if (prop.isFullyFunded && prop.currentFunding < prop.totalInvestment) {
            prop.isFullyFunded = false;
        }

        // Remove investor from property
        _removeInvestorFromProperty(_propertyId, msg.sender);

        // Record transactions
        _recordTransaction(
            _propertyId,
            address(this),
            msg.sender,
            TransactionType.Refund,
            refundAmount,
            "Early exit refund"
        );

        _recordTransaction(
            _propertyId,
            msg.sender,
            owner(),
            TransactionType.EarlyExitFee,
            exitFee,
            "Early exit fee"
        );

        emit Refunded(_propertyId, msg.sender, refundAmount);
    }

    // ============ MILESTONE WORKFLOW FUNCTIONS ============
    
    // Step 1: Developer requests funds for a milestone
    function requestMilestoneFunds(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external nonReentrant {
        Property storage prop = properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            msg.sender == prop.developerAddress,
            "Only property developer can request funds"
        );
        require(
            _milestoneId < prop.milestones.length,
            "Milestone does not exist"
        );

        Milestone storage milestone = prop.milestones[_milestoneId];
        require(!milestone.fundsRequested, "Funds already requested for this milestone");
        require(!milestone.fundsReleased, "Funds already released for this milestone");
        require(!milestone.isCompleted, "Milestone already completed");

        // Check if previous milestone is completed (if not the first milestone)
        if (_milestoneId > 0) {
            Milestone storage prevMilestone = prop.milestones[_milestoneId - 1];
            require(prevMilestone.isCompleted, "Previous milestone must be completed first");
        }

        milestone.fundsRequested = true;
        milestone.requestedAt = block.timestamp;

        emit MilestoneFundsRequested(_propertyId, _milestoneId, msg.sender);
    }

    // Step 2: Admin releases funds to developer
    function releaseMilestoneFunds(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external nonReentrant onlyOwner {
        Property storage prop = properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            _milestoneId < prop.milestones.length,
            "Milestone does not exist"
        );

        Milestone storage milestone = prop.milestones[_milestoneId];
        require(milestone.fundsRequested, "Funds must be requested before release");
        require(!milestone.fundsReleased, "Funds already released for this milestone");
        require(!milestone.isCompleted, "Milestone already completed");

        // Calculate release amount based on current funding (not original total)
        uint256 releaseAmount = (prop.currentFunding * milestone.percentage) / 100;
        
        // Ensure we don't release more than available funds
        require(releaseAmount <= prop.currentFunding, "Insufficient funds for milestone release");

        // Transfer funds to developer
        require(
            stablecoin.transfer(prop.developerAddress, releaseAmount),
            "Milestone fund release failed"
        );

        milestone.fundsReleased = true;
        milestone.releasedAt = block.timestamp;

        // Update released funds tracking
        releasedFunds[_propertyId] += releaseAmount;

        // Record transaction
        _recordTransaction(
            _propertyId,
            address(this),
            prop.developerAddress,
            TransactionType.MilestoneRelease,
            releaseAmount,
            string(abi.encodePacked("Milestone release: ", milestone.title))
        );

        emit MilestoneFundsReleased(_propertyId, _milestoneId, releaseAmount, prop.developerAddress);
    }

    // Step 3: Admin marks milestone as completed after offline inspection
        function markMilestoneCompleted(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external nonReentrant onlyOwner {
        Property storage prop = properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            _milestoneId < prop.milestones.length,
            "Milestone does not exist"
        );

        Milestone storage milestone = prop.milestones[_milestoneId];
        require(milestone.fundsReleased, "Funds must be released before marking as completed");
        require(!milestone.isCompleted, "Milestone already completed");

        milestone.isCompleted = true;
        milestone.completedAt = block.timestamp;

        emit MilestoneMarkedCompleted(_propertyId, _milestoneId, "");
    }



    // ============ HELPER FUNCTIONS ============
    // ============ FUNDING MANAGEMENT FUNCTIONS ============
    
    // Check if property can accept more investments (after early exits)
    function canAcceptInvestments(uint256 _propertyId) external view returns (bool) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        
        // Can accept investments if:
        // 1. Property is active
        // 2. Not fully funded OR was fully funded but had early exits
        // 3. No milestone funds have been released yet
        if (!prop.isActive) return false;
        
        bool hasReleasedFunds = false;
        for (uint256 i = 0; i < prop.milestones.length; i++) {
            if (prop.milestones[i].fundsReleased) {
                hasReleasedFunds = true;
                break;
            }
        }
        
        return !hasReleasedFunds && prop.currentFunding < prop.totalInvestment;
    }
    
    // Get funding gap (how much more funding is needed)
    function getFundingGap(uint256 _propertyId) external view returns (uint256) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        
        if (prop.currentFunding >= prop.totalInvestment) {
            return 0;
        }
        
        return prop.totalInvestment - prop.currentFunding;
    }
    
    // Get current funding percentage
    function getFundingPercentage(uint256 _propertyId) external view returns (uint256) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        
        return (prop.currentFunding * 100) / prop.totalInvestment;
    }

    function _recordTransaction(
        uint256 _propertyId,
        address _from,
        address _to,
        TransactionType _type,
        uint256 _amount,
        string memory _description
    ) internal {
        transactionCount++;

        transactions[transactionCount] = Transaction({
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
            transactionHash: bytes32(0) // Will be set by frontend
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

    // ============ TRANSACTION HISTORY FUNCTIONS ============
    function getUserTransactionHistory(
        address _user
    ) external view returns (Transaction[] memory) {
        uint256[] memory userTxIds = userTransactions[_user];
        Transaction[] memory result = new Transaction[](userTxIds.length);

        for (uint256 i = 0; i < userTxIds.length; i++) {
            result[i] = transactions[userTxIds[i]];
        }

        return result;
    }

    function getPropertyTransactionHistory(
        uint256 _propertyId
    ) external view returns (Transaction[] memory) {
        uint256[] memory propertyTxIds = propertyTransactions[_propertyId];
        Transaction[] memory result = new Transaction[](propertyTxIds.length);

        for (uint256 i = 0; i < propertyTxIds.length; i++) {
            result[i] = transactions[propertyTxIds[i]];
        }

        return result;
    }

    function getTransaction(
        uint256 _transactionId
    ) external view returns (Transaction memory) {
        require(
            _transactionId > 0 && _transactionId <= transactionCount,
            "Transaction does not exist"
        );
        return transactions[_transactionId];
    }

    function getTotalTransactions() external view returns (uint256) {
        return transactionCount;
    }
}
