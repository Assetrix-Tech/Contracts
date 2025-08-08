// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library AssetrixStorage {
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
        OneMonth,
        ThreeMonths,
        FiveMonths,
        SevenMonths,
        EightMonths,
        NineMonths,
        TenMonths,
        TwelveMonths
    }
    enum TransactionType {
        Investment,
        FinalPayout,
        Refund,
        EmergencyRefund,
        EarlyExitFee,
        MilestoneRelease,
        PropertyCreation,
        PropertyUpdate,
        PayoutAvailable,
        RefundAvailable,
        EmergencyRefundAvailable,
        EarlyExitAvailable
    }

    // ============ STRUCTS ============
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
        uint256 tokenPrice;
        uint256 totalTokens;
        uint256 tokensSold;
        uint256 tokensLeft;
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
        uint256 tokenPrice;
        uint256 totalTokens;
        uint256 tokensSold;
        uint256 tokensLeft;
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

    struct PropertyCreationData {
        string title;
        string description;
        PropertyType propertyType;
        PropertyUse propertyUse;
        string developerName;
        address developerAddress;
        string city;
        string state;
        string country;
        string ipfsImagesHash;
        string ipfsMetadataHash;
        uint256 size;
        uint256 bedrooms;
        uint256 bathrooms;
        uint256 amountToRaise;
        Duration investmentDuration;
        string[] milestoneTitles;
        string[] milestoneDescriptions;
        uint256[] milestonePercentages;
        uint256 roiPercentage;
    }

    struct PropertyUpdateData {
        string title;
        string description;
        PropertyType propertyType;
        PropertyUse propertyUse;
        string city;
        string state;
        string country;
        string ipfsImagesHash;
        string ipfsMetadataHash;
        uint256 size;
        uint256 bedrooms;
        uint256 bathrooms;
        string[] milestoneTitles;
        string[] milestoneDescriptions;
        uint256[] milestonePercentages;
        uint256 roiPercentage;
    }

    struct Layout {
        // State variables
        address stablecoin;
        uint256 propertyCount;
        uint256 transactionCount;
        uint256 globalTokenPrice;
        mapping(uint256 => Property) properties;
        mapping(address => uint256[]) developerProperties;
        mapping(address => uint256[]) tokenHolderProperties;
        mapping(uint256 => uint256) releasedFunds;
        mapping(uint256 => Transaction) transactions;
        mapping(address => uint256[]) userTransactions;
        mapping(uint256 => uint256[]) propertyTransactions;
        // Access control and pausing
        address owner;
        bool paused;
        uint256 reentrancyStatus;
        // Admin fee logic
        uint256 adminFeePercentage; // e.g., 3 means 3%
        mapping(uint256 => bool) adminFeePaid; // propertyId => fee paid
        // Early exit fee logic
        uint256 earlyExitFeePercentage; // e.g., 5 means 5%
        // Tokenization dynamic variables
        uint256 minTokensPerProperty;
        uint256 maxTokensPerProperty;
        uint256 minTokensPerInvestment;
        // Payout tracking
        mapping(uint256 => mapping(address => bool)) payoutProcessed; // propertyId => tokenHolder => processed
        // Fiat payment variables
        address backendSigner; // Backend wallet that can distribute tokens from fiat payments
        mapping(string => bool) processedFiatPayments; // paymentReference => processed
        mapping(address => uint256) userNonces; // user => nonce for signature verification
    }

    bytes32 internal constant STORAGE_SLOT = keccak256("assetrix.storage.v1");

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
