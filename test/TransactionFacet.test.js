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
    const TransactionFacet = await ethers.getContractFactory("TransactionFacet");
    
    const adminFacetContract = await AdminFacet.deploy();
    const propertyFacetContract = await PropertyFacet.deploy();
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
          "0xeb2220e9", // createProperty
          "0x32665ffb", // getProperty
          "0xb16aa470", // getProperties
          "0x397f7952", // getMyProperties
          "0x5ccd8ca0", // getMyTokenProperties
          "0x4835ec06", // getDeveloperProperties
          "0x759c7de8", // getDeveloperPropertyCount
          "0x17fc2f96", // getPropertyTokenHolders
          "0xd4cb6ba1", // updateProperty
          "0xcecf20cd", // deactivateProperty
          "0x6e03b57d", // adminActivateProperty
          "0x380b6b29"  // adminDeactivateProperty
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

    await propertyFacet.connect(developer).createProperty(propertyData, developer.address);
    propertyId = 1; // First property

    // Fund the investor with stablecoin
    await stablecoin.transfer(investor.address, ethers.parseUnits("1000000", 2)); // 1M tokens
  });

  describe("Transaction Recording", function () {
    it("Should allow authorized contract to record transaction", async function () {
      await expect(
        transactionFacet.connect(owner).recordTransaction(
          1, // propertyId
          investor.address, // from
          developer.address, // to
          0, // transactionType (Purchase)
          10000000, // amount
          "Test transaction" // description
        )
      ).to.not.be.reverted;
    });

    it("Should prevent unauthorized users from recording transactions", async function () {
      await expect(
        transactionFacet.connect(investor).recordTransaction(
          1, // propertyId
          investor.address, // from
          developer.address, // to
          0, // transactionType (Purchase)
          10000000, // amount
          "Test transaction" // description
        )
      ).to.be.revertedWith("Only authorized contracts can record transactions");
    });

    it("Should record transaction with correct data", async function () {
      await transactionFacet.connect(owner).recordTransaction(
        1, // propertyId
        investor.address, // from
        developer.address, // to
        0, // transactionType (Purchase)
        10000000, // amount
        "Test transaction" // description
      );

      const transaction = await transactionFacet.getTransaction(1);
      expect(transaction.propertyId).to.equal(1);
      expect(transaction.from).to.equal(investor.address);
      expect(transaction.to).to.equal(developer.address);
      expect(transaction.amount).to.equal(10000000);
      expect(transaction.description).to.equal("Test transaction");
    });
  });

  describe("Transaction Queries", function () {
    beforeEach(async function () {
      // Record a test transaction
      await transactionFacet.connect(owner).recordTransaction(
        1, // propertyId
        investor.address, // from
        developer.address, // to
        0, // transactionType (Purchase)
        10000000, // amount
        "Test transaction" // description
      );
    });

    it("Should return correct transaction count", async function () {
      const count = await transactionFacet.getTotalTransactions();
      expect(count).to.equal(1);
    });

    it("Should return user transaction history", async function () {
      const userTransactions = await transactionFacet.getUserTransactionHistory(investor.address);
      expect(userTransactions.length).to.be.greaterThan(0);
    });

    it("Should return property transaction history", async function () {
      const propertyTransactions = await transactionFacet.getPropertyTransactionHistory(1);
      expect(propertyTransactions.length).to.be.greaterThan(0);
    });

    it("Should return transaction details", async function () {
      const transaction = await transactionFacet.getTransaction(1);
      expect(transaction.propertyId).to.equal(1);
      expect(transaction.from).to.equal(investor.address);
      expect(transaction.to).to.equal(developer.address);
      expect(transaction.amount).to.equal(10000000);
      expect(transaction.description).to.equal("Test transaction");
    });
  });

  describe("Transaction Types", function () {
    it("Should handle different transaction types", async function () {
      await expect(
        transactionFacet.connect(owner).recordTransaction(
          1, // propertyId
          investor.address, // from
          developer.address, // to
          0, // transactionType (Purchase)
          10000000, // amount
          "Token purchase" // description
        )
      ).to.not.be.reverted;
    });

    it("Should return correct transaction types", async function () {
      await transactionFacet.connect(owner).recordTransaction(
        1, // propertyId
        investor.address, // from
        developer.address, // to
        0, // transactionType (Purchase)
        10000000, // amount
        "Token purchase" // description
      );

      const transaction = await transactionFacet.getTransaction(1);
      expect(transaction.transactionType).to.equal(0); // Purchase
    });
  });

  describe("Transaction History", function () {
    beforeEach(async function () {
      // Record multiple test transactions
      await transactionFacet.connect(owner).recordTransaction(
        1, // propertyId
        investor.address, // from
        developer.address, // to
        0, // transactionType (Purchase)
        10000000, // amount
        "Transaction 1" // description
      );
    });

    it("Should return all user transactions", async function () {
      const userTransactions = await transactionFacet.getUserTransactionHistory(investor.address);
      expect(userTransactions.length).to.be.greaterThan(0);
    });
  });

  describe("Transaction Validation", function () {
    it("Should validate transaction parameters", async function () {
      await expect(
        transactionFacet.connect(owner).recordTransaction(
          1, // propertyId
          investor.address, // from
          developer.address, // to
          0, // transactionType (Purchase)
          10000000, // amount
          "Valid transaction" // description
        )
      ).to.not.be.reverted;
    });

    it("Should handle transaction hash generation", async function () {
      await transactionFacet.connect(owner).recordTransaction(
        1, // propertyId
        investor.address, // from
        developer.address, // to
        0, // transactionType (Purchase)
        10000000, // amount
        "Test transaction" // description
      );

      const transaction = await transactionFacet.getTransaction(1);
      expect(transaction.transactionId).to.equal(1);
    });

    it("Should return transaction block number", async function () {
      await transactionFacet.connect(owner).recordTransaction(
        1, // propertyId
        investor.address, // from
        developer.address, // to
        0, // transactionType (Purchase)
        10000000, // amount
        "Test transaction" // description
      );

      const transaction = await transactionFacet.getTransaction(1);
      expect(transaction.blockNumber).to.be.greaterThan(0);
    });
  });
}); 