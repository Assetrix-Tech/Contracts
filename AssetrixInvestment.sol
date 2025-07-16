// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
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
    

    
    // Tokenization parameters - NEW APPROACH
    uint256 public constant MIN_TOKENS_PER_PROPERTY = 100; // Minimum 100 tokens per property
    uint256 public constant MAX_TOKENS_PER_PROPERTY = 100000; // Maximum 100,000 tokens per property
    uint256 public constant MIN_TOKENS_PER_INVESTMENT = 1; // Minimum 1 token per investment
    uint256 public globalTokenPrice; // Price per token in naira (e.g., 100000 for N100,000)

    // ============ ENUMS ============ , should be in AssetrixEnums.
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
        FinalPayout,
        Refund,
        EmergencyRefund,
        EarlyExitFee,
        MilestoneRelease,
        PropertyCreation,
        PropertyUpdate
    }

    // ============ STRUCTS ============ AssetrixStructs.
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
        uint256 tokenPrice; // Price per token in stablecoin (locked at creation)
        uint256 totalTokens; // Total tokens available (calculated from amount)
        uint256 tokensSold; // Tokens sold to investors
        uint256 tokensLeft; // Tokens remaining for sale
        Duration investmentDuration;
        bool isActive;
        bool isFullyFunded;
        string ipfsImagesHash;
        string ipfsMetadataHash;
        address[] tokenHolders;
        mapping(address => uint256) tokenBalance;
        uint256 holderCount;
        address developerAddress;
        Milestone[] milestones;
        uint256 createdAt;
        uint256 roiPercentage;
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
        uint256 tokenPrice; // Price per token in stablecoin
        uint256 totalTokens; // Total tokens available
        uint256 tokensSold; // Tokens sold to investors
        uint256 tokensLeft; // Tokens remaining for sale
        Duration investmentDuration;
        bool isActive;
        bool isFullyFunded;
        string ipfsImagesHash;
        string ipfsMetadataHash;
        address developerAddress;
        uint256 holderCount;
        Milestone[] milestones;
        uint256 roiPercentage;
    }

    struct Milestone {
        uint256 id;
        string title;
        string description;
        uint256 percentage;
        bool fundsRequested;
        bool fundsReleased;
        bool isCompleted;
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
        string metadata;
        uint256 blockNumber;
        bytes32 transactionHash;
    }

    // ============ MAPPINGS ============ AssetrixStorage
    mapping(uint256 => Property) public properties;
    mapping(address => uint256[]) public developerProperties;
    mapping(address => uint256[]) public tokenHolderProperties;
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
    event PropertyFullyFunded(uint256 indexed propertyId, uint256 totalTokensSold);
    event MilestoneCreated(
        uint256 indexed propertyId,
        uint256 milestoneId,
        string title,
        uint256 percentage
    );
    event MilestoneCompleted(
        uint256 indexed propertyId,
        uint256 milestoneId
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
        uint256 milestoneId
    );
    event StablecoinUpdated(address indexed newStablecoin);
    event GlobalTokenPriceUpdated(uint256 newTokenPrice);

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


    // should be in root file
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function setStablecoin(address _newStablecoin) external onlyOwner {
        require(_newStablecoin != address(0), "Invalid address");
        require(_newStablecoin.code.length > 0, "Not a contract address");
        stablecoin = IERC20(_newStablecoin);
        emit StablecoinUpdated(_newStablecoin);
    }

    // ============ ADMIN FUNCTIONS ============
    function setGlobalTokenPrice(uint256 _newTokenPrice) external onlyOwner {
        require(_newTokenPrice > 0, "Token price must be greater than 0");
        globalTokenPrice = _newTokenPrice;
        emit GlobalTokenPriceUpdated(_newTokenPrice);
    }


    function initialize(address _stablecoin, uint256 _initialTokenPrice) public initializer {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        require(_initialTokenPrice > 0, "Invalid token price");
        
        stablecoin = IERC20(_stablecoin);
        globalTokenPrice = _initialTokenPrice;
        
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
    }

    // ============ PROPERTY CREATION ============
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
        // Tokenization details - NEW APPROACH
        uint256 _amountToRaise, // Amount to raise in naira (e.g., 50000000 for N50M)
        Duration _investmentDuration,
        string[] memory _milestoneTitles,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestonePercentages,
        uint256 _roiPercentage
    ) external nonReentrant returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_developerName).length > 0, "Developer name required");
        require(_developerAddress != address(0), "Invalid developer address");
        require(msg.sender == _developerAddress, "Sender must be the developer");
        require(bytes(_city).length > 0, "City required");
        require(bytes(_state).length > 0, "State required");
        require(bytes(_country).length > 0, "Country required");
        require(_amountToRaise > 0, "Amount to raise must be greater than 0");
        require(_amountToRaise % globalTokenPrice == 0, "Amount must be divisible by token price");
        require(_roiPercentage > 0 && _roiPercentage <= 100, "ROI percentage must be between 1 and 100");
        require(_milestoneTitles.length == _milestoneDescriptions.length && 
                _milestoneTitles.length == _milestonePercentages.length, 
                "Milestone arrays must have matching lengths");
        require(_milestoneTitles.length > 0 && _milestoneTitles.length <= 4, 
                "Maximum 4 milestones allowed");

        // Calculate number of tokens based on amount to raise
        uint256 calculatedTokens = _amountToRaise / globalTokenPrice;
        require(calculatedTokens >= MIN_TOKENS_PER_PROPERTY && calculatedTokens <= MAX_TOKENS_PER_PROPERTY, 
                "Calculated token count out of bounds");

        propertyCount++;
        Property storage prop = properties[propertyCount];

        prop.propertyId = propertyCount;
        prop.title = _title;
        prop.description = _description;
        prop.propertyType = _propertyType;
        prop.propertyUse = _propertyUse;
        prop.developer = _developerName;
        prop.developerAddress = msg.sender;
        prop.createdAt = block.timestamp;
        prop.city = _city;
        prop.state = _state;
        prop.country = _country;
        prop.size = _size;
        prop.bedrooms = _bedrooms;
        prop.bathrooms = _bathrooms;

        // Tokenization setup - NEW APPROACH
        prop.tokenPrice = globalTokenPrice; 
        prop.totalTokens = calculatedTokens;
        prop.tokensSold = 0;
        prop.tokensLeft = calculatedTokens;
        prop.investmentDuration = _investmentDuration;
        prop.isActive = true;
        prop.isFullyFunded = false;
        prop.ipfsImagesHash = _ipfsImagesHash;
        prop.ipfsMetadataHash = _ipfsMetadataHash;
        prop.roiPercentage = _roiPercentage;

        developerProperties[msg.sender].push(propertyCount);

        // Create milestones
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _milestoneTitles.length; i++) {
            require(_milestonePercentages[i] > 0 && _milestonePercentages[i] <= 100, 
                    "Invalid milestone percentage");
            totalPercentage += _milestonePercentages[i];
            
            prop.milestones.push(Milestone({
                id: i,
                title: _milestoneTitles[i],
                description: _milestoneDescriptions[i],
                percentage: _milestonePercentages[i],
                fundsRequested: false,
                fundsReleased: false,
                isCompleted: false,
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
        uint256[] memory _milestonePercentages,
        uint256 _roiPercentage // NEW
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
        require(_roiPercentage > 0 && _roiPercentage <= 100, "ROI percentage must be between 1 and 100");

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
        prop.roiPercentage = _roiPercentage;

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
                tokenPrice: prop.tokenPrice,
                totalTokens: prop.totalTokens,
                tokensSold: prop.tokensSold,
                tokensLeft: prop.tokensLeft,
                investmentDuration: prop.investmentDuration,
                isActive: prop.isActive,
                isFullyFunded: prop.isFullyFunded,
                ipfsImagesHash: prop.ipfsImagesHash,
                ipfsMetadataHash: prop.ipfsMetadataHash,
                developerAddress: prop.developerAddress,
                holderCount: prop.holderCount,
                milestones: prop.milestones,
                roiPercentage: prop.roiPercentage
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
                tokenPrice: prop.tokenPrice,
                totalTokens: prop.totalTokens,
                tokensSold: prop.tokensSold,
                tokensLeft: prop.tokensLeft,
                investmentDuration: prop.investmentDuration,
                isActive: prop.isActive,
                isFullyFunded: prop.isFullyFunded,
                ipfsImagesHash: prop.ipfsImagesHash,
                ipfsMetadataHash: prop.ipfsMetadataHash,
                developerAddress: prop.developerAddress,
                holderCount: prop.holderCount,
                milestones: prop.milestones,
                roiPercentage: prop.roiPercentage
            });
        }

        return result;
    }

    function getMyTokenProperties()
        external
        view
        returns (PropertyView[] memory)
    {
        uint256[] memory propertyIds = tokenHolderProperties[msg.sender];
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
                tokenPrice: prop.tokenPrice,
                totalTokens: prop.totalTokens,
                tokensSold: prop.tokensSold,
                tokensLeft: prop.tokensLeft,
                investmentDuration: prop.investmentDuration,
                isActive: prop.isActive,
                isFullyFunded: prop.isFullyFunded,
                ipfsImagesHash: prop.ipfsImagesHash,
                ipfsMetadataHash: prop.ipfsMetadataHash,
                developerAddress: prop.developerAddress,
                holderCount: prop.holderCount,
                milestones: prop.milestones,
                roiPercentage: prop.roiPercentage
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
                tokenPrice: prop.tokenPrice,
                totalTokens: prop.totalTokens,
                tokensSold: prop.tokensSold,
                tokensLeft: prop.tokensLeft,
                investmentDuration: prop.investmentDuration,
                isActive: prop.isActive,
                isFullyFunded: prop.isFullyFunded,
                ipfsImagesHash: prop.ipfsImagesHash,
                ipfsMetadataHash: prop.ipfsMetadataHash,
                developerAddress: prop.developerAddress,
                holderCount: prop.holderCount,
                milestones: prop.milestones,
                roiPercentage: prop.roiPercentage
            });
        }

        return result;
    }

    function getTotalProperties() external view returns (uint256) {
        return propertyCount;
    }

    function getPropertyTokenHolders(
        uint256 _propertyId
    ) external view returns (address[] memory) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        return prop.tokenHolders;
    }

    function _removeTokenHolderFromProperty(uint256 _propertyId, address _tokenHolder) internal {
        Property storage prop = properties[_propertyId];
        // Remove from token holders array
        for (uint256 i = 0; i < prop.tokenHolders.length; i++) {
            if (prop.tokenHolders[i] == _tokenHolder) {
                prop.tokenHolders[i] = prop.tokenHolders[prop.tokenHolders.length - 1];
                prop.tokenHolders.pop();
                break;
            }
        }
        // Remove from token holder properties
        uint256[] storage tokenHolderProps = tokenHolderProperties[_tokenHolder];
        for (uint256 i = 0; i < tokenHolderProps.length; i++) {
            if (tokenHolderProps[i] == _propertyId) {
                tokenHolderProps[i] = tokenHolderProps[tokenHolderProps.length - 1];
                tokenHolderProps.pop();
                break;
            }
        }
        // Clear token balance
        prop.tokenBalance[_tokenHolder] = 0;
        prop.holderCount--;
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
    function purchaseTokens(uint256 _propertyId, uint256 _tokenAmount) external nonReentrant whenNotPaused {
        require(_tokenAmount > 0, "Must purchase at least 1 token");
        require(_propertyId > 0 && _propertyId <= propertyCount, "Property does not exist");
        Property storage prop = properties[_propertyId];
        require(prop.isActive, "Property is not active");
        require(_tokenAmount <= prop.tokensLeft, "Not enough tokens left");

        uint256 totalCost = _tokenAmount * prop.tokenPrice;
        require(stablecoin.transferFrom(msg.sender, address(this), totalCost), "Transfer failed");

        // Add token holder if new
        if (prop.tokenBalance[msg.sender] == 0) {
            prop.tokenHolders.push(msg.sender);
            prop.holderCount++;
            tokenHolderProperties[msg.sender].push(_propertyId);
        }
        // Update token balance
        prop.tokenBalance[msg.sender] += _tokenAmount;
        prop.tokensSold += _tokenAmount;
        prop.tokensLeft -= _tokenAmount;

        // Mark property as fully funded if all tokens sold
        if (prop.tokensLeft == 0) {
            prop.isFullyFunded = true;
            emit PropertyFullyFunded(_propertyId, prop.tokensSold);
        }

        // Record transaction
        _recordTransaction(
            _propertyId,
            msg.sender,
            prop.developerAddress,
            TransactionType.Investment,
            totalCost,
            "Token purchase in property"
        );

        emit TokensPurchased(_propertyId, msg.sender, _tokenAmount, totalCost);
    }

    // ============ FINAL PAYOUT FUNCTION ============
    function payoutInvestment(
        uint256 _propertyId,
        address _tokenHolder,
        uint256 _amount
    ) external nonReentrant {
        Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Only developer or owner can payout"
        );
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            prop.tokenBalance[_tokenHolder] > 0,
            "Token holder has no tokens in this property"
        );
        require(_amount > 0, "Payout amount must be greater than 0");
        require(
            block.timestamp >= getInvestmentEndTime(_propertyId),
            "Investment period has not ended yet"
        );
        require(
            stablecoin.transferFrom(msg.sender, _tokenHolder, _amount),
            "Payout transfer failed"
        );
        _recordTransaction(
            _propertyId,
            msg.sender,
            _tokenHolder,
            TransactionType.FinalPayout,
            _amount,
            "Investment payout to token holder"
        );
        emit PayoutSent(_propertyId, _tokenHolder, _amount);
    }

    // ============ REFUND FUNCTION ============
    function refund(
        uint256 _propertyId,
        address _tokenHolder
    ) external nonReentrant {
        Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress || msg.sender == owner(),
            "Only developer or owner can refund"
        );
        require(
            prop.tokenBalance[_tokenHolder] > 0,
            "Token holder has no tokens to refund"
        );
        uint256 refundTokens = prop.tokenBalance[_tokenHolder];
        uint256 refundAmount = refundTokens * prop.tokenPrice;
        require(
            stablecoin.transfer(_tokenHolder, refundAmount),
            "Refund transfer failed"
        );
        prop.tokensSold -= refundTokens;
        prop.tokensLeft += refundTokens;
        _removeTokenHolderFromProperty(_propertyId, _tokenHolder);
        _recordTransaction(
            _propertyId,
            address(this),
            _tokenHolder,
            TransactionType.Refund,
            refundAmount,
            "Refund to token holder"
        );
        emit Refunded(_propertyId, _tokenHolder, refundAmount);
    }

    // ============ EMERGENCY REFUND FUNCTION ============
    function emergencyRefund(
        uint256 _propertyId,
        address _tokenHolder
    ) external nonReentrant onlyOwner {
        Property storage prop = properties[_propertyId];
        require(
            prop.tokenBalance[_tokenHolder] > 0,
            "Token holder has no tokens to refund"
        );
        uint256 refundTokens = prop.tokenBalance[_tokenHolder];
        uint256 refundAmount = refundTokens * prop.tokenPrice;
        require(
            stablecoin.transfer(_tokenHolder, refundAmount),
            "Emergency refund transfer failed"
        );
        prop.tokensSold -= refundTokens;
        prop.tokensLeft += refundTokens;
        _removeTokenHolderFromProperty(_propertyId, _tokenHolder);
        _recordTransaction(
            _propertyId,
            address(this),
            _tokenHolder,
            TransactionType.EmergencyRefund,
            refundAmount,
            "Emergency refund to token holder"
        );
        emit Refunded(_propertyId, _tokenHolder, refundAmount);
    }

    // ============ EARLY EXIT FUNCTION ============
    function earlyExit(uint256 _propertyId) external nonReentrant {
        Property storage prop = properties[_propertyId];
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
        require(
            block.timestamp < getInvestmentEndTime(_propertyId),
            "Investment period has ended, use final payout instead"
        );
        uint256 tokenAmount = prop.tokenBalance[msg.sender];
        uint256 investmentAmount = tokenAmount * prop.tokenPrice;
        uint256 exitFee = (investmentAmount * 5) / 100; // 5% exit fee
        uint256 refundAmount = investmentAmount - exitFee;
        require(
            stablecoin.transfer(msg.sender, refundAmount),
            "Early exit refund failed"
        );
        require(
            stablecoin.transfer(owner(), exitFee),
            "Exit fee transfer failed"
        );
        prop.tokensSold -= tokenAmount;
        prop.tokensLeft += tokenAmount;
        if (prop.isFullyFunded && prop.tokensLeft > 0) {
            prop.isFullyFunded = false;
        }
        _removeTokenHolderFromProperty(_propertyId, msg.sender);
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

        // Calculate release amount based on tokens sold (not original total)
        uint256 totalFunds = prop.tokensSold * prop.tokenPrice;
        uint256 releaseAmount = (totalFunds * milestone.percentage) / 100;
        
        // Ensure we don't release more than available funds
        require(releaseAmount <= totalFunds, "Insufficient funds for milestone release");

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

        emit MilestoneMarkedCompleted(_propertyId, _milestoneId);
    }



    // ============ HELPER FUNCTIONS ============
    // ============ FUNDING MANAGEMENT FUNCTIONS ============
    
    // Check if property can accept more token purchases (after early exits)
    function canAcceptTokenPurchases(uint256 _propertyId) external view returns (bool) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        
        // Can accept token purchases if:
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
        
        return !hasReleasedFunds && prop.tokensLeft > 0;
    }
    
    // Get token gap (how many more tokens are needed)
    function getTokenGap(uint256 _propertyId) external view returns (uint256) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        
        return prop.tokensLeft;
    }
    
    // Get current token sale percentage
    function getTokenSalePercentage(uint256 _propertyId) external view returns (uint256) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        
        return (prop.tokensSold * 100) / prop.totalTokens;
    }

    // Get token balance for a specific address
    function getTokenBalance(uint256 _propertyId, address _tokenHolder) external view returns (uint256) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        
        return prop.tokenBalance[_tokenHolder];
    }

    // Get total value of tokens held by an address
    function getTokenValue(uint256 _propertyId, address _tokenHolder) external view returns (uint256) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        Property storage prop = properties[_propertyId];
        
        return prop.tokenBalance[_tokenHolder] * prop.tokenPrice;
    }

    // Helper function to calculate investment end time
    function getInvestmentEndTime(uint256 _propertyId) public view returns (uint256) {
        Property storage prop = properties[_propertyId];
        uint256 durationInSeconds = getDurationInSeconds(prop.investmentDuration);
        return prop.createdAt + durationInSeconds; // Need to add createdAt field
    }

    function getDurationInSeconds(Duration _duration) internal pure returns (uint256) {
        if (_duration == Duration.OneMonth) return 30 days;
        if (_duration == Duration.ThreeMonths) return 90 days;
        if (_duration == Duration.FiveMonths) return 150 days;
        if (_duration == Duration.SevenMonths) return 210 days;
        if (_duration == Duration.EightMonths) return 240 days;
        if (_duration == Duration.NineMonths) return 270 days;
        if (_duration == Duration.TenMonths) return 300 days;
        if (_duration == Duration.TwelveMonths) return 365 days;
        revert("Invalid duration");
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

    function isInvestmentPeriodActive(uint256 _propertyId) external view returns (bool) {
        return block.timestamp <= getInvestmentEndTime(_propertyId);
    }

    function getInvestmentPeriodRemaining(uint256 _propertyId) external view returns (uint256) {
        uint256 endTime = getInvestmentEndTime(_propertyId);
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }

    function getExpectedROIPercentage(uint256 _propertyId) external view returns (uint256) {
        require(_propertyId > 0 && _propertyId <= propertyCount, "Property does not exist");
        Property storage prop = properties[_propertyId];
        return prop.roiPercentage;
    }

    function getGlobalTokenPrice() external view returns (uint256) {
        return globalTokenPrice;
    }

    function calculateTokensFromAmount(uint256 _amount) external view returns (uint256) {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount % globalTokenPrice == 0, "Amount must be divisible by token price");
        return _amount / globalTokenPrice;
    }

    function calculateAmountFromTokens(uint256 _tokens) external view returns (uint256) {
        return _tokens * globalTokenPrice;
    }

    function calculateExpectedROI(uint256 _propertyId, uint256 _investmentAmount) external view returns (uint256) {
        require(_propertyId > 0 && _propertyId <= propertyCount, "Property does not exist");
        Property storage prop = properties[_propertyId];
        return (_investmentAmount * prop.roiPercentage) / 100;
    }

    function getPropertyAmountToRaise(uint256 _propertyId) external view returns (uint256) {
        require(_propertyId > 0 && _propertyId <= propertyCount, "Property does not exist");
        Property storage prop = properties[_propertyId];
        return prop.totalTokens * prop.tokenPrice;
    }
}
