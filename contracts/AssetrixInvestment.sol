// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract Assetrix is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    IERC20 public stablecoin;

    constructor(address _stablecoin) {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        stablecoin = IERC20(_stablecoin);
    }

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
        // Basic Info
        uint256 propertyId;
        string title;
        string description;
        PropertyType propertyType;
        PropertyUse propertyUse;
        string developer;
        // Location
        string city;
        string state;
        string country;
        // Property Details
        uint256 size;
        uint256 bedrooms;
        uint256 bathrooms;
        // Investment Details
        uint256 unitPrice;
        uint256 totalUnits;
        uint256 totalInvestment;
        uint256 minInvestment;
        uint256 expectedROI;
        uint256 investmentDuration;
        InvestmentType investmentType;
        uint256 ownershipPercentage;
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

    struct PropertyView {
        // Basic Info
        uint256 propertyId;
        string title;
        string description;
        PropertyType propertyType;
        PropertyUse propertyUse;
        string developer;
        // Location
        string city;
        string state;
        string country;
        // Property Details
        uint256 size;
        uint256 bedrooms;
        uint256 bathrooms;
        // Investment Details
        uint256 unitPrice;
        uint256 totalUnits;
        uint256 totalInvestment;
        uint256 minInvestment;
        uint256 expectedROI;
        uint256 investmentDuration;
        InvestmentType investmentType;
        uint256 ownershipPercentage;
        // Status
        uint256 currentFunding;
        bool isActive;
        bool isFullyFunded;
        // Metadata
        string ipfsImagesHash;
        string ipfsMetadataHash;
        // Developer address
        address developerAddress;
        // Investor count
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

    function invest(
        uint256 _propertyId,
        uint256 _amount
    ) external nonReentrant whenNotPaused propertyExists(_propertyId) {
        Property storage prop = properties[_propertyId];

        require(!prop.isFullyFunded, "Property is already fully funded");
        require(_amount > 0, "Investment amount must be greater than 0");
        require(
            _amount >= prop.minInvestment,
            "Investment below minimum amount"
        );
        require(
            _amount % prop.unitPrice == 0,
            "Investment must be a multiple of unit price"
        );

        uint256 newFunding = prop.currentFunding + _amount;
        require(
            newFunding <= prop.totalInvestment,
            "Investment exceeds remaining funding needed"
        );

        stablecoin.safeTransferFrom(msg.sender, address(this), _amount);

        if (prop.investments[msg.sender] == 0) {
            prop.investors.push(msg.sender);
            prop.investorCount++;
            investorProperties[msg.sender].push(_propertyId);
        }
        prop.investments[msg.sender] += _amount;
        prop.currentFunding = newFunding;

        if (newFunding == prop.totalInvestment) {
            prop.isFullyFunded = true;
            emit PropertyFullyFunded(_propertyId, newFunding);
        }

        emit Invested(_propertyId, msg.sender, _amount);
    }

    function getInvestmentDetails(
        uint256 _propertyId,
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
        Property storage prop = properties[_propertyId];
        require(prop.propertyId > 0, "Property does not exist");

        investmentAmount = prop.investments[_investor];

        if (investmentAmount > 0) {
            if (prop.investmentType == InvestmentType.Equity) {
                ownershipShare =
                    (investmentAmount * prop.ownershipPercentage) /
                    prop.unitPrice;
            }

            if (prop.expectedROI > 0 && prop.investmentDuration > 0) {
                uint256 durationInYears = prop.investmentDuration / 365 days;
                estimatedReturns =
                    investmentAmount +
                    ((investmentAmount * prop.expectedROI * durationInYears) /
                        10000);
            }
        }

        return (investmentAmount, ownershipShare, estimatedReturns);
    }

    function getMyInvestments()
        external
        view
        returns (
            uint256[] memory propertyIds,
            uint256[] memory amounts,
            Property[] memory propertiesData,
            uint256[] memory ownershipShares,
            uint256[] memory estimatedReturns,
            bool[] memory isActive
        )
    {
        uint256[] memory myPropertyIds = investorProperties[msg.sender];
        uint256 count = myPropertyIds.length;

        propertyIds = new uint256[](count);
        amounts = new uint256[](count);
        propertiesData = new Property[](count);
        ownershipShares = new uint256[](count);
        estimatedReturns = new uint256[](count);
        isActive = new bool[](count);

        for (uint256 i = 0; i < count; i++) {
            uint256 propertyId = myPropertyIds[i];
            Property storage prop = properties[propertyId];

            propertyIds[i] = propertyId;
            amounts[i] = prop.investments[msg.sender];
            propertiesData[i] = prop;
            isActive[i] = prop.isActive;

            if (prop.totalInvestment > 0) {
                ownershipShares[i] = (amounts[i] * 100) / prop.totalInvestment;
            }

            if (prop.investmentDuration > 0 && prop.expectedROI > 0) {
                uint256 durationInYears = prop.investmentDuration / 365 days;
                estimatedReturns[i] =
                    amounts[i] +
                    ((amounts[i] * prop.expectedROI * durationInYears) / 10000);
            }
        }

        return (
            propertyIds,
            amounts,
            propertiesData,
            ownershipShares,
            estimatedReturns,
            isActive
        );
    }

    function getPropertyInvestors(
        uint256 _propertyId
    ) external view returns (address[] memory) {
        Property storage prop = properties[_propertyId];
        require(prop.propertyId > 0, "Property does not exist");
        return prop.investors;
    }

    function getInvestorAmount(
        uint256 _propertyId,
        address _investor
    ) external view returns (uint256) {
        Property storage prop = properties[_propertyId];
        require(prop.propertyId > 0, "Property does not exist");
        return prop.investments[_investor];
    }

    function requestRefund(
        uint256 _propertyId
    ) external nonReentrant propertyExists(_propertyId) {
        Property storage prop = properties[_propertyId];
        require(!prop.isFullyFunded, "Property is already fully funded");

        uint256 investmentAmount = prop.investments[msg.sender];
        require(investmentAmount > 0, "No investment found");

        delete prop.investments[msg.sender];
        prop.currentFunding -= investmentAmount;

        if (investmentAmount > 0) {
            for (uint256 i = 0; i < prop.investors.length; i++) {
                if (prop.investors[i] == msg.sender) {
                    prop.investors[i] = prop.investors[
                        prop.investors.length - 1
                    ];
                    prop.investors.pop();
                    prop.investorCount--;
                    break;
                }
            }

            uint256[] storage investorProps = investorProperties[msg.sender];
            for (uint256 i = 0; i < investorProps.length; i++) {
                if (investorProps[i] == _propertyId) {
                    investorProps[i] = investorProps[investorProps.length - 1];
                    investorProps.pop();
                    break;
                }
            }
        }

        stablecoin.safeTransfer(msg.sender, investmentAmount);

        emit Refunded(_propertyId, msg.sender, investmentAmount);
    }

    function addMilestone(
        uint256 _propertyId,
        string memory _title,
        string memory _description,
        uint256 _percentage
    ) external propertyExists(_propertyId) {
        Property storage prop = properties[_propertyId];
        require(
            msg.sender == prop.developerAddress,
            "Only property developer can add milestones"
        );
        require(prop.isFullyFunded, "Property must be fully funded");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_percentage > 0 && _percentage <= 100, "Invalid percentage");

        uint256 totalPercentage = _percentage;
        for (uint i = 0; i < propertyMilestones[_propertyId].length; i++) {
            totalPercentage += propertyMilestones[_propertyId][i].percentage;
        }
        require(totalPercentage <= 100, "Total percentage cannot exceed 100%");

        uint256 milestoneId = propertyMilestones[_propertyId].length;
        propertyMilestones[_propertyId].push(
            Milestone({
                id: milestoneId,
                title: _title,
                description: _description,
                percentage: _percentage,
                isCompleted: false,
                ipfsProofHash: "",
                completedAt: 0
            })
        );

        emit MilestoneCreated(_propertyId, milestoneId, _title, _percentage);
    }

    /**
     * @notice Mark a milestone as completed (Developer or Admin)
     */
    function completeMilestone(
        uint256 _propertyId,
        uint256 _milestoneId,
        string memory _ipfsProofHash
    ) external propertyExists(_propertyId) {
        Property storage prop = properties[_propertyId];
        require(
            msg.sender == owner() || msg.sender == prop.developerAddress,
            "Only property developer or owner can complete milestones"
        );
        require(
            bytes(_ipfsProofHash).length > 0,
            "IPFS proof hash is required"
        );

        Milestone[] storage milestones = propertyMilestones[_propertyId];
        require(_milestoneId < milestones.length, "Invalid milestone ID");

        Milestone storage milestone = milestones[_milestoneId];
        require(!milestone.isCompleted, "Milestone already completed");

        for (uint i = 0; i < _milestoneId; i++) {
            require(
                milestones[i].isCompleted,
                "Previous milestones must be completed first"
            );
        }

        milestone.isCompleted = true;
        milestone.ipfsProofHash = _ipfsProofHash;
        milestone.completedAt = block.timestamp;

        emit MilestoneCompleted(_propertyId, _milestoneId, _ipfsProofHash);
    }

    /**
     * @notice Release funds for a completed milestone (Admin or Devloper)
     */
    function releaseMilestoneFunds(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external nonReentrant whenNotPaused propertyExists(_propertyId) {
        require(
            msg.sender == owner() ||
                msg.sender == properties[_propertyId].developerAddress,
            "Unauthorized"
        );
        Property storage prop = properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");

        Milestone[] storage milestones = propertyMilestones[_propertyId];
        require(_milestoneId < milestones.length, "Invalid milestone ID");

        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.isCompleted, "Milestone not completed");

        uint256 totalReleasable = (prop.totalInvestment *
            milestone.percentage) / 100;
        uint256 alreadyReleased = releasedFunds[_propertyId];
        uint256 remainingInContract = prop.currentFunding + alreadyReleased;

        require(
            remainingInContract >= totalReleasable,
            "Insufficient funds in contract"
        );

        uint256 amountToRelease = totalReleasable - alreadyReleased;
        require(amountToRelease > 0, "No funds to release for this milestone");

        releasedFunds[_propertyId] += amountToRelease;
        prop.currentFunding = prop.currentFunding >= amountToRelease
            ? prop.currentFunding - amountToRelease
            : 0;

        stablecoin.safeTransfer(prop.developerAddress, amountToRelease);

        emit FundsReleased(_propertyId, _milestoneId, amountToRelease);
        emit PayoutSent(_propertyId, prop.developerAddress, amountToRelease);
    }

    function getPropertyMilestones(
        uint256 _propertyId
    ) external view returns (Milestone[] memory) {
        return propertyMilestones[_propertyId];
    }

    /**
     * @notice Get the amount of funds that can be released for a milestone
     */
    function getReleasableAmount(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external view returns (uint256 amount) {
        Property storage prop = properties[_propertyId];
        if (!prop.isFullyFunded) return 0;

        Milestone[] storage milestones = propertyMilestones[_propertyId];
        if (_milestoneId >= milestones.length) return 0;

        Milestone storage milestone = milestones[_milestoneId];
        if (!milestone.isCompleted) return 0;

        // Verify all previous milestones are completed
        for (uint i = 0; i < _milestoneId; i++) {
            if (!milestones[i].isCompleted) return 0;
        }

        uint256 totalReleasable = (prop.totalInvestment *
            milestone.percentage) / 100;
        uint256 alreadyReleased = releasedFunds[_propertyId];

        if (totalReleasable > alreadyReleased) {
            return totalReleasable - alreadyReleased;
        }
        return 0;
    }

    function emergencyRefund(
        uint256 _propertyId
    ) external onlyOwner propertyExists(_propertyId) {
        Property storage prop = properties[_propertyId];
        require(prop.isActive, "Property is not active");
        require(releasedFunds[_propertyId] == 0, "Funds already released");

        address[] memory investors = prop.investors;
        uint256 totalRefunded = 0;

        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];
            uint256 amount = prop.investments[investor];

            if (amount > 0) {
                delete prop.investments[investor];
                totalRefunded += amount;
                uint256[] storage investorProps = investorProperties[investor];
                for (uint256 j = 0; j < investorProps.length; j++) {
                    if (investorProps[j] == _propertyId) {
                        investorProps[j] = investorProps[
                            investorProps.length - 1
                        ];
                        investorProps.pop();
                        break;
                    }
                }
                stablecoin.safeTransfer(investor, amount);

                emit Refunded(_propertyId, investor, amount);
            }
        }

        delete prop.investors;
        prop.investorCount = 0;
        prop.currentFunding = 0;
        prop.isFullyFunded = false;
        prop.isActive = false;

        emit PropertyDeactivated(_propertyId);
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
                investmentType: prop.investmentType,
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

    function getTotalProperties() external view returns (uint256) {
        return propertyCount;
    }

    function pauseContract() external onlyOwner {
        _pause();
    }

    function unpauseContract() external onlyOwner {
        _unpause();
    }
}
