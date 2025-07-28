const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TransactionFacet", function () {
  let diamond;
  let adminFacet;
  let propertyFacet;
  let investmentFacet;
  let transactionFacet;
  let owner;
  let developer;
  let investor;
  let stablecoin;
  let propertyId;

  beforeEach(async function () {
    [owner, developer, investor] = await ethers.getSigners();

    // Deploy mock stablecoin
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    stablecoin = await MockStablecoin.deploy();

    // Deploy diamond
    const Diamond = await ethers.getContractFactory("Diamond");
    diamond = await Diamond.deploy(owner.address);

    // Deploy facets
    const AdminFacet = await ethers.getContractFactory("AdminFacet");
    const PropertyFacet = await ethers.getContractFactory("PropertyFacet");
    const InvestmentFacet = await ethers.getContractFactory("InvestmentFacet");
    const TransactionFacet = await ethers.getContractFactory("TransactionFacet");
    
    const adminFacetContract = await AdminFacet.deploy();
    const propertyFacetContract = await PropertyFacet.deploy();
    const investmentFacetContract = await InvestmentFacet.deploy();
    const transactionFacetContract = await TransactionFacet.deploy();

    // Get diamond cut interface
    const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());

    // Add facets to diamond
    const cut = [
      {
        facetAddress: await adminFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: [
          "0x8da5cb5b", // owner
          "0x1794bb3c", // initialize
          "0xcc7ac330", // getGlobalTokenPrice
          "0xb6f67312", // getStablecoin
          "0xeb659dc1", // setMinTokensPerProperty
          "0x96241c97"  // setMaxTokensPerProperty
        ]
      },
      {
        facetAddress: await propertyFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: [
          "0x17aaf5ed", // getTotalProperties
          "0x1f346f07", // createProperty
          "0x32665ffb", // getProperty
          "0xb16aa470", // getProperties
          "0x397f7952", // getMyProperties
          "0x5ccd8ca0", // getMyTokenProperties
          "0x4835ec06", // getDeveloperProperties
          "0x759c7de8", // getDeveloperPropertyCount
          "0x17fc2f96", // getPropertyTokenHolders
          "0xe52097a0", // updateProperty
          "0x7ca28bc6", // deactivateProperty
          "0xc2f6f25c", // adminActivateProperty
          "0x5ec231ba"  // adminDeactivateProperty
        ]
      },
      {
        facetAddress: await investmentFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: [
          "0x4e71d92d", // purchaseTokens
          "0x3d18678e", // payoutInvestment
          "0x590e1ae3", // refund
          "0x3c4b6f8c", // earlyExit
          "0x4a25d94a", // emergencyRefund
          "0x2e17de78", // canAcceptTokenPurchases
          "0x8b5b9ccc", // getTokenGap
          "0x4d5e5fb3", // getTokenSalePercentage
          "0x70a08231", // getTokenBalance
          "0x18160ddd", // getTokenValue
          "0x5c19a95c", // calculateTokensFromAmount
          "0x42966c68", // calculateAmountFromTokens
          "0x18160ddd", // calculateExpectedROI
          "0x4d5e5fb3", // getPropertyAmountToRaise
          "0x8b5b9ccc", // getInvestmentEndTime
          "0x4d5e5fb3", // getDurationInSeconds
          "0x2e17de78", // isInvestmentPeriodActive
          "0x8b5b9ccc", // getInvestmentPeriodRemaining
          "0x4d5e5fb3", // getExpectedROIPercentage
          "0xcc7ac330"  // getGlobalTokenPrice
        ]
      },
      {
        facetAddress: await transactionFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: [
          "0x9751e5fe", // recordTransaction
          "0xc51309db", // getUserTransactionHistory
          "0x70c548f6", // getPropertyTransactionHistory
          "0xb5c604ff", // getTotalTransactions
          "0x33ea3dc8"  // getTransaction
        ]
      }
    ];

    // Perform diamond cut
    await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");

    // Get facet interfaces
    adminFacet = await ethers.getContractAt("AdminFacet", await diamond.getAddress());
    propertyFacet = await ethers.getContractAt("PropertyFacet", await diamond.getAddress());
    investmentFacet = await ethers.getContractAt("InvestmentFacet", await diamond.getAddress());
    transactionFacet = await ethers.getContractAt("TransactionFacet", await diamond.getAddress());

    // Initialize the platform
    await adminFacet.initialize(
      owner.address,
      await stablecoin.getAddress(),
      100000 // global token price
    );

    // Set min and max tokens per property
    await adminFacet.setMinTokensPerProperty(1000);
    await adminFacet.setMaxTokensPerProperty(1000000);

    // Create a test property
    const propertyData = {
      title: "Test Transaction Property",
      description: "Test Description",
      propertyType: 0,
      propertyUse: 0,
      developerName: "Test Developer",
      developerAddress: developer.address,
      city: "Test City",
      state: "Test State",
      country: "Test Country",
      ipfsImagesHash: "QmTest123",
      ipfsMetadataHash: "QmTestMetadata123",
      size: 1000,
      bedrooms: 10,
      bathrooms: 15,
      amountToRaise: 500000000, // 500M naira
      investmentDuration: 3, // ThreeMonths
      milestoneTitles: ["Phase 1"],
      milestoneDescriptions: ["Initial phase"],
      milestonePercentages: [100],
      roiPercentage: 20
    };

    await propertyFacet.connect(developer).createProperty(propertyData);
    propertyId = 1; // First property

    // Fund the investor with stablecoin
    await stablecoin.transfer(investor.address, ethers.parseEther("1000000")); // 1M tokens
  });

  describe("Transaction Recording", function () {
    it("Should allow authorized contract to record transaction", async function () {
      const transactionData = {
        user: investor.address,
        propertyId: propertyId,
        transactionType: 0, // TokenPurchase
        amount: 10000000, // 10M naira
        description: "Test transaction"
      };

      // Only the contract itself or owner can record transactions
      await expect(
        transactionFacet.connect(owner).recordTransaction(
          transactionData.user,
          transactionData.propertyId,
          transactionData.transactionType,
          transactionData.amount,
          transactionData.description
        )
      ).to.not.be.reverted;
    });

    it("Should prevent unauthorized users from recording transactions", async function () {
      const transactionData = {
        user: investor.address,
        propertyId: propertyId,
        transactionType: 0, // TokenPurchase
        amount: 10000000, // 10M naira
        description: "Test transaction"
      };

      await expect(
        transactionFacet.connect(investor).recordTransaction(
          transactionData.user,
          transactionData.propertyId,
          transactionData.transactionType,
          transactionData.amount,
          transactionData.description
        )
      ).to.be.revertedWith("Only authorized contracts can record transactions");
    });

    it("Should record transaction with correct data", async function () {
      const transactionData = {
        user: investor.address,
        propertyId: propertyId,
        transactionType: 0, // TokenPurchase
        amount: 10000000, // 10M naira
        description: "Test transaction"
      };

      await transactionFacet.connect(owner).recordTransaction(
        transactionData.user,
        transactionData.propertyId,
        transactionData.transactionType,
        transactionData.amount,
        transactionData.description
      );

      // Check transaction count
      const count = await transactionFacet.getTransactionCount();
      expect(count).to.equal(1);
    });
  });

  describe("Transaction Queries", function () {
    beforeEach(async function () {
      // Record a test transaction
      await transactionFacet.connect(owner).recordTransaction(
        investor.address,
        propertyId,
        0, // TokenPurchase
        10000000, // 10M naira
        "Test transaction"
      );
    });

    it("Should return correct transaction count", async function () {
      const count = await transactionFacet.getTransactionCount();
      expect(count).to.equal(1);
    });

    it("Should return user transaction history", async function () {
      const history = await transactionFacet.getUserTransactionHistory(investor.address);
      expect(history.length).to.equal(1);
    });

    it("Should return property transaction history", async function () {
      const history = await transactionFacet.getPropertyTransactionHistory(propertyId);
      expect(history.length).to.equal(1);
    });

    it("Should return transaction by index", async function () {
      const transaction = await transactionFacet.getTransactionByIndex(0);
      expect(transaction.user).to.equal(investor.address);
      expect(transaction.propertyId).to.equal(propertyId);
    });

    it("Should return transaction details", async function () {
      const transaction = await transactionFacet.getTransaction(0);
      expect(transaction.user).to.equal(investor.address);
      expect(transaction.propertyId).to.equal(propertyId);
      expect(transaction.transactionType).to.equal(0);
      expect(transaction.amount).to.equal(10000000);
    });

    it("Should return transaction type", async function () {
      const transactionType = await transactionFacet.getTransactionType(0);
      expect(transactionType).to.equal(0); // TokenPurchase
    });

    it("Should return transaction amount", async function () {
      const amount = await transactionFacet.getTransactionAmount(0);
      expect(amount).to.equal(10000000);
    });

    it("Should return transaction timestamp", async function () {
      const timestamp = await transactionFacet.getTransactionTimestamp(0);
      expect(timestamp).to.be.greaterThan(0);
    });

    it("Should return transaction status", async function () {
      const status = await transactionFacet.getTransactionStatus(0);
      expect(status).to.equal(1); // Completed
    });

    it("Should return transaction user", async function () {
      const user = await transactionFacet.getTransactionUser(0);
      expect(user).to.equal(investor.address);
    });

    it("Should return transaction property", async function () {
      const property = await transactionFacet.getTransactionProperty(0);
      expect(property).to.equal(propertyId);
    });

    it("Should return transaction description", async function () {
      const description = await transactionFacet.getTransactionDescription(0);
      expect(description).to.equal("Test transaction");
    });
  });

  describe("Transaction Types", function () {
    it("Should handle different transaction types", async function () {
      // Token Purchase
      await transactionFacet.connect(owner).recordTransaction(
        investor.address,
        propertyId,
        0, // TokenPurchase
        10000000,
        "Token purchase"
      );

      // Refund
      await transactionFacet.connect(owner).recordTransaction(
        investor.address,
        propertyId,
        1, // Refund
        5000000,
        "Refund transaction"
      );

      // Payout
      await transactionFacet.connect(owner).recordTransaction(
        investor.address,
        propertyId,
        2, // Payout
        15000000,
        "Payout transaction"
      );

      // Check transaction count
      const count = await transactionFacet.getTransactionCount();
      expect(count).to.equal(3);
    });

    it("Should return correct transaction types", async function () {
      // Record different transaction types
      await transactionFacet.connect(owner).recordTransaction(
        investor.address,
        propertyId,
        0, // TokenPurchase
        10000000,
        "Token purchase"
      );

      await transactionFacet.connect(owner).recordTransaction(
        investor.address,
        propertyId,
        1, // Refund
        5000000,
        "Refund"
      );

      // Check transaction types
      const type1 = await transactionFacet.getTransactionType(0);
      const type2 = await transactionFacet.getTransactionType(1);
      
      expect(type1).to.equal(0); // TokenPurchase
      expect(type2).to.equal(1); // Refund
    });
  });

  describe("Transaction History", function () {
    beforeEach(async function () {
      // Record multiple transactions
      await transactionFacet.connect(owner).recordTransaction(
        investor.address,
        propertyId,
        0, // TokenPurchase
        10000000,
        "Transaction 1"
      );

      await transactionFacet.connect(owner).recordTransaction(
        developer.address,
        propertyId,
        2, // Payout
        5000000,
        "Transaction 2"
      );

      await transactionFacet.connect(owner).recordTransaction(
        investor.address,
        propertyId,
        1, // Refund
        2000000,
        "Transaction 3"
      );
    });

    it("Should return all user transactions", async function () {
      const investorHistory = await transactionFacet.getUserTransactionHistory(investor.address);
      expect(investorHistory.length).to.equal(2); // 2 transactions for investor

      const developerHistory = await transactionFacet.getUserTransactionHistory(developer.address);
      expect(developerHistory.length).to.equal(1); // 1 transaction for developer
    });

    it("Should return all property transactions", async function () {
      const propertyHistory = await transactionFacet.getPropertyTransactionHistory(propertyId);
      expect(propertyHistory.length).to.equal(3); // 3 transactions for property
    });

    it("Should return empty history for non-existent user", async function () {
      const history = await transactionFacet.getUserTransactionHistory(owner.address);
      expect(history.length).to.equal(0);
    });

    it("Should return empty history for non-existent property", async function () {
      const history = await transactionFacet.getPropertyTransactionHistory(999);
      expect(history.length).to.equal(0);
    });
  });

  describe("Transaction Validation", function () {
    it("Should validate transaction parameters", async function () {
      // Valid transaction
      await expect(
        transactionFacet.connect(owner).recordTransaction(
          investor.address,
          propertyId,
          0, // TokenPurchase
          10000000,
          "Valid transaction"
        )
      ).to.not.be.reverted;

      // Invalid user address
      await expect(
        transactionFacet.connect(owner).recordTransaction(
          ethers.ZeroAddress,
          propertyId,
          0,
          10000000,
          "Invalid user"
        )
      ).to.be.revertedWith("Invalid user address");

      // Invalid property ID
      await expect(
        transactionFacet.connect(owner).recordTransaction(
          investor.address,
          0,
          0,
          10000000,
          "Invalid property"
        )
      ).to.be.revertedWith("Invalid property ID");
    });

    it("Should handle transaction hash generation", async function () {
      await transactionFacet.connect(owner).recordTransaction(
        investor.address,
        propertyId,
        0,
        10000000,
        "Test transaction"
      );

      const transactionHash = await transactionFacet.getTransactionHash(0);
      expect(transactionHash).to.not.equal(ethers.ZeroAddress);
    });

    it("Should return transaction block number", async function () {
      await transactionFacet.connect(owner).recordTransaction(
        investor.address,
        propertyId,
        0,
        10000000,
        "Test transaction"
      );

      const blockNumber = await transactionFacet.getTransactionBlock(0);
      expect(blockNumber).to.be.greaterThan(0);
    });
  });
}); 