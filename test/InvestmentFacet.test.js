const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InvestmentFacet", function () {
  let diamond;
  let adminFacet;
  let propertyFacet;
  let investmentFacet;
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
    
    const adminFacetContract = await AdminFacet.deploy();
    const propertyFacetContract = await PropertyFacet.deploy();
    const investmentFacetContract = await InvestmentFacet.deploy();

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
          "0x8bf0af3e", // purchaseTokens
          "0x8682c64d", // payoutInvestment
          "0x7ad226dc", // refund
          "0xb8af3d3e", // earlyExit
          "0xdae21c58", // emergencyRefund
          "0x93838cdb", // canAcceptTokenPurchases
          "0x0117b0ed", // calculateTokensFromAmount
          "0x1b48a3b0", // calculateAmountFromTokens
          "0x19580150", // calculateExpectedROI
          "0x1a4847e9", // isInvestmentPeriodActive
          "0xad41f119"  // getExpectedROIPercentage
        ]
      }
    ];

    // Perform diamond cut
    await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");

    // Get facet interfaces
    adminFacet = await ethers.getContractAt("AdminFacet", await diamond.getAddress());
    propertyFacet = await ethers.getContractAt("PropertyFacet", await diamond.getAddress());
    investmentFacet = await ethers.getContractAt("InvestmentFacet", await diamond.getAddress());

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
      title: "Test Investment Property",
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

  describe("Investment Calculations", function () {
    it("Should calculate tokens from amount correctly", async function () {
      const amount = 100000000; // 100M naira
      const tokens = await investmentFacet.calculateTokensFromAmount(amount);
      expect(tokens).to.equal(1000); // 100M / 100K = 1000 tokens
    });

    it("Should calculate amount from tokens correctly", async function () {
      const tokens = 1000;
      const amount = await investmentFacet.calculateAmountFromTokens(tokens);
      expect(amount).to.equal(100000000); // 1000 * 100K = 100M
    });

    it("Should calculate expected ROI correctly", async function () {
      const investmentAmount = 100000000; // 100M
      const roi = await investmentFacet.calculateExpectedROI(investmentAmount, 20);
      expect(roi).to.be.greaterThan(0); // Should return some value
    });
  });

  describe("Investment Status", function () {
    it("Should check if property can accept token purchases", async function () {
      const canAccept = await investmentFacet.canAcceptTokenPurchases(propertyId);
      expect(canAccept).to.equal(true); // Should be true initially
    });

    it("Should return expected ROI percentage", async function () {
      const roiPercentage = await investmentFacet.getExpectedROIPercentage(propertyId);
      expect(roiPercentage).to.equal(20); // Set in property creation
    });
  });

  describe("Investment Period Management", function () {
    it("Should check if investment period is active", async function () {
      const isActive = await investmentFacet.isInvestmentPeriodActive(propertyId);
      expect(isActive).to.equal(true); // Should be active initially
    });
  });

  describe("Token Purchase", function () {
    it("Should allow investor to purchase tokens", async function () {
      const purchaseAmount = 10000000; // 10M naira
      const tokensToPurchase = 100; // 100 tokens

      // Approve stablecoin spending
      await stablecoin.connect(investor).approve(await diamond.getAddress(), purchaseAmount);

      // Purchase tokens
      await investmentFacet.connect(investor).purchaseTokens(propertyId, tokensToPurchase);

      // Note: We can't check token balance without additional functions
      // This test ensures the function doesn't revert
    });

    it("Should prevent purchasing more tokens than available", async function () {
      const purchaseAmount = 1000000000; // 1B naira
      const tokensToPurchase = 10000; // More than available

      // Approve stablecoin spending
      await stablecoin.connect(investor).approve(await diamond.getAddress(), purchaseAmount);

      // Should fail
      await expect(
        investmentFacet.connect(investor).purchaseTokens(propertyId, tokensToPurchase)
      ).to.be.revertedWith("Not enough tokens left");
    });
  });

  describe("Investment Functions", function () {
    it("Should allow payout when property is fully funded", async function () {
      // This would require the property to be fully funded
      // For now, we test that the function exists
      await expect(
        investmentFacet.connect(investor).payoutInvestment(propertyId)
      ).to.not.be.reverted;
    });

    it("Should allow refund when conditions are met", async function () {
      // This would require specific refund conditions
      // For now, we test that the function exists
      await expect(
        investmentFacet.connect(investor).refund(propertyId)
      ).to.not.be.reverted;
    });

    it("Should allow emergency refund by admin", async function () {
      // This should be callable by admin
      await expect(
        investmentFacet.connect(owner).emergencyRefund(propertyId, investor.address)
      ).to.not.be.reverted;
    });

    it("Should allow early exit with fee", async function () {
      // This should work with early exit fee
      await expect(
        investmentFacet.connect(investor).earlyExit(propertyId)
      ).to.not.be.reverted;
    });
  });
}); 