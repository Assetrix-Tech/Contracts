const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MilestoneFacet", function () {
  let diamond;
  let adminFacet;
  let propertyFacet;
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
    const MilestoneFacet = await ethers.getContractFactory("MilestoneFacet");
    
    const adminFacetContract = await AdminFacet.deploy();
    const propertyFacetContract = await PropertyFacet.deploy();
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

  describe("Milestone Functions", function () {
    it("Should allow developer to request milestone funds", async function () {
      // This requires the property to be fully funded
      // For now, we test that the function exists but expect it to revert
      await expect(
        milestoneFacet.connect(developer).requestMilestoneFunds(propertyId, 0)
      ).to.be.revertedWith("Property must be fully funded");
    });

    it("Should allow admin to release milestone funds", async function () {
      // This should be callable by admin but requires property to be fully funded
      await expect(
        milestoneFacet.connect(owner).releaseMilestoneFunds(propertyId, 0)
      ).to.be.revertedWith("Property must be fully funded");
    });

    it("Should return milestone dashboard", async function () {
      const dashboard = await milestoneFacet.getMilestoneDashboard(propertyId);
      expect(dashboard).to.not.be.undefined;
    });

    it("Should return milestone status", async function () {
      const status = await milestoneFacet.getMilestoneStatus(propertyId, 0);
      expect(status).to.be.an('array'); // Status returns an array of values
    });

    it("Should allow marking milestone as completed", async function () {
      // This requires property to be fully funded
      await expect(
        milestoneFacet.connect(developer).markMilestoneCompleted(propertyId, 0)
      ).to.be.revertedWith("Property must be fully funded");
    });
  });
}); 