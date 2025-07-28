const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MilestoneFacet", function () {
  let diamond;
  let adminFacet;
  let propertyFacet;
  let investmentFacet;
  let milestoneFacet;
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
    const MilestoneFacet = await ethers.getContractFactory("MilestoneFacet");
    
    const adminFacetContract = await AdminFacet.deploy();
    const propertyFacetContract = await PropertyFacet.deploy();
    const investmentFacetContract = await InvestmentFacet.deploy();
    const milestoneFacetContract = await MilestoneFacet.deploy();

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
        facetAddress: await milestoneFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: [
          "0x54d49e46", // requestMilestoneFunds
          "0x3de1bb15", // releaseMilestoneFunds
          "0x359b3123", // getMilestoneDashboard
          "0xe8049da1", // getMilestoneStatus
          "0x5cae48f5"  // markMilestoneCompleted
        ]
      }
    ];

    // Perform diamond cut
    await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");

    // Get facet interfaces
    adminFacet = await ethers.getContractAt("AdminFacet", await diamond.getAddress());
    propertyFacet = await ethers.getContractAt("PropertyFacet", await diamond.getAddress());
    investmentFacet = await ethers.getContractAt("InvestmentFacet", await diamond.getAddress());
    milestoneFacet = await ethers.getContractAt("MilestoneFacet", await diamond.getAddress());

    // Initialize the platform
    await adminFacet.initialize(
      owner.address,
      await stablecoin.getAddress(),
      100000 // global token price
    );

    // Set min and max tokens per property
    await adminFacet.setMinTokensPerProperty(1000);
    await adminFacet.setMaxTokensPerProperty(1000000);

    // Create a test property with multiple milestones
    const propertyData = {
      title: "Test Milestone Property",
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
      milestoneTitles: ["Foundation", "Structure", "Finishing"],
      milestoneDescriptions: ["Foundation work", "Structural work", "Finishing touches"],
      milestonePercentages: [30, 40, 30],
      roiPercentage: 20
    };

    await propertyFacet.connect(developer).createProperty(propertyData);
    propertyId = 1; // First property

    // Fund the investor with stablecoin
    await stablecoin.transfer(investor.address, ethers.parseEther("1000000")); // 1M tokens
  });

  describe("Milestone Queries", function () {
    it("Should return correct milestone count", async function () {
      const count = await milestoneFacet.getMilestoneCount(propertyId);
      expect(count).to.equal(3); // 3 milestones created
    });

    it("Should return correct milestone", async function () {
      const milestone = await milestoneFacet.getMilestone(propertyId, 0);
      expect(milestone.title).to.equal("Foundation");
      expect(milestone.percentage).to.equal(30);
    });

    it("Should return all milestones", async function () {
      const milestones = await milestoneFacet.getMilestones(propertyId);
      expect(milestones.length).to.equal(3);
      expect(milestones[0].title).to.equal("Foundation");
      expect(milestones[1].title).to.equal("Structure");
      expect(milestones[2].title).to.equal("Finishing");
    });

    it("Should return milestone status", async function () {
      const status = await milestoneFacet.getMilestoneStatus(propertyId, 0);
      expect(status).to.equal(0); // Pending initially
    });

    it("Should check if milestone is completed", async function () {
      const isCompleted = await milestoneFacet.isMilestoneCompleted(propertyId, 0);
      expect(isCompleted).to.equal(false); // Not completed initially
    });

    it("Should return milestone percentage", async function () {
      const percentage = await milestoneFacet.getMilestonePercentage(propertyId, 0);
      expect(percentage).to.equal(30);
    });

    it("Should return milestone amount", async function () {
      const amount = await milestoneFacet.getMilestoneAmount(propertyId, 0);
      expect(amount).to.equal(150000000); // 30% of 500M
    });

    it("Should return total milestone percentage", async function () {
      const totalPercentage = await milestoneFacet.getTotalMilestonePercentage(propertyId);
      expect(totalPercentage).to.equal(100); // 30 + 40 + 30
    });

    it("Should return released milestone percentage", async function () {
      const releasedPercentage = await milestoneFacet.getReleasedMilestonePercentage(propertyId);
      expect(releasedPercentage).to.equal(0); // No milestones released initially
    });
  });

  describe("Milestone Progress", function () {
    it("Should return next milestone", async function () {
      const nextMilestone = await milestoneFacet.getNextMilestone(propertyId);
      expect(nextMilestone).to.equal(0); // First milestone
    });

    it("Should return milestone progress", async function () {
      const progress = await milestoneFacet.getMilestoneProgress(propertyId);
      expect(progress).to.equal(0); // No progress initially
    });

    it("Should check if can request milestone", async function () {
      const canRequest = await milestoneFacet.canRequestMilestone(propertyId);
      expect(canRequest).to.equal(false); // Property not fully funded
    });

    it("Should return milestone completion time", async function () {
      const completionTime = await milestoneFacet.getMilestoneCompletionTime(propertyId, 0);
      expect(completionTime).to.equal(0); // Not completed
    });
  });

  describe("Milestone Fund Requests", function () {
    it("Should allow developer to request milestone funds", async function () {
      // This would require the property to be fully funded
      // For now, we test that the function exists
      await expect(
        milestoneFacet.connect(developer).requestMilestoneFunds(propertyId, 0)
      ).to.not.be.reverted;
    });

    it("Should prevent non-developer from requesting milestone funds", async function () {
      await expect(
        milestoneFacet.connect(investor).requestMilestoneFunds(propertyId, 0)
      ).to.be.revertedWith("Only property developer can request milestone funds");
    });

    it("Should prevent requesting invalid milestone", async function () {
      await expect(
        milestoneFacet.connect(developer).requestMilestoneFunds(propertyId, 10)
      ).to.be.revertedWith("Invalid milestone ID");
    });
  });

  describe("Milestone Fund Release", function () {
    it("Should allow admin to release milestone funds", async function () {
      // This should be callable by admin
      await expect(
        milestoneFacet.connect(owner).releaseMilestoneFunds(propertyId, 0)
      ).to.not.be.reverted;
    });

    it("Should prevent non-admin from releasing milestone funds", async function () {
      await expect(
        milestoneFacet.connect(developer).releaseMilestoneFunds(propertyId, 0)
      ).to.be.revertedWith("Only admin can release milestone funds");
    });

    it("Should prevent releasing invalid milestone", async function () {
      await expect(
        milestoneFacet.connect(owner).releaseMilestoneFunds(propertyId, 10)
      ).to.be.revertedWith("Invalid milestone ID");
    });
  });

  describe("Milestone Workflow", function () {
    it("Should handle complete milestone workflow", async function () {
      // 1. Request milestone funds
      await milestoneFacet.connect(developer).requestMilestoneFunds(propertyId, 0);
      
      // 2. Check milestone status
      const status = await milestoneFacet.getMilestoneStatus(propertyId, 0);
      expect(status).to.equal(1); // Requested
      
      // 3. Release milestone funds
      await milestoneFacet.connect(owner).releaseMilestoneFunds(propertyId, 0);
      
      // 4. Check milestone is completed
      const isCompleted = await milestoneFacet.isMilestoneCompleted(propertyId, 0);
      expect(isCompleted).to.equal(true);
    });

    it("Should update released percentage after milestone release", async function () {
      // Release first milestone
      await milestoneFacet.connect(developer).requestMilestoneFunds(propertyId, 0);
      await milestoneFacet.connect(owner).releaseMilestoneFunds(propertyId, 0);
      
      // Check released percentage
      const releasedPercentage = await milestoneFacet.getReleasedMilestonePercentage(propertyId);
      expect(releasedPercentage).to.equal(30);
    });

    it("Should update next milestone after completion", async function () {
      // Complete first milestone
      await milestoneFacet.connect(developer).requestMilestoneFunds(propertyId, 0);
      await milestoneFacet.connect(owner).releaseMilestoneFunds(propertyId, 0);
      
      // Check next milestone
      const nextMilestone = await milestoneFacet.getNextMilestone(propertyId);
      expect(nextMilestone).to.equal(1); // Second milestone
    });
  });

  describe("Milestone Validation", function () {
    it("Should validate milestone percentages", async function () {
      // This would be tested during property creation
      // The property creation already validates milestone percentages
      expect(await milestoneFacet.getTotalMilestonePercentage(propertyId)).to.equal(100);
    });

    it("Should prevent releasing milestone twice", async function () {
      // Release milestone once
      await milestoneFacet.connect(developer).requestMilestoneFunds(propertyId, 0);
      await milestoneFacet.connect(owner).releaseMilestoneFunds(propertyId, 0);
      
      // Try to release again
      await expect(
        milestoneFacet.connect(owner).releaseMilestoneFunds(propertyId, 0)
      ).to.be.revertedWith("Milestone already completed");
    });
  });
}); 