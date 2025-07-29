const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PropertyFacet", function () {
  let diamond;
  let adminFacet;
  let propertyFacet;
  let owner;
  let developer;
  let investor;
  let stablecoin;

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
    
    const adminFacetContract = await AdminFacet.deploy();
    const propertyFacetContract = await PropertyFacet.deploy();

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
      }
    ];

    // Perform diamond cut
    await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");

    // Get facet interfaces
    adminFacet = await ethers.getContractAt("AdminFacet", await diamond.getAddress());
    propertyFacet = await ethers.getContractAt("PropertyFacet", await diamond.getAddress());

    // Initialize the platform
    await adminFacet.initialize(
      owner.address,
      await stablecoin.getAddress(),
      100000 // global token price
    );

    // Set min and max tokens per property
    await adminFacet.setMinTokensPerProperty(1000);
    await adminFacet.setMaxTokensPerProperty(1000000);
  });

  describe("Property Creation", function () {
    it("Should allow developer to create property", async function () {
      const propertyData = {
        title: "Luxury Apartment Complex",
        description: "High-end residential development",
        propertyType: 0, // ShortStay
        propertyUse: 1, // Hospitality
        developerName: "Luxury Developers Ltd",
        developerAddress: developer.address,
        city: "Lagos",
        state: "Lagos",
        country: "Nigeria",
        ipfsImagesHash: "QmHash123",
        ipfsMetadataHash: "QmMetadata123",
        size: 5000,
        bedrooms: 50,
        bathrooms: 75,
        amountToRaise: 1000000000, // 1B naira
        investmentDuration: 5, // FiveMonths
        milestoneTitles: ["Foundation", "Structure", "Finishing"],
        milestoneDescriptions: ["Foundation work", "Structural work", "Finishing touches"],
        milestonePercentages: [30, 40, 30],
        roiPercentage: 25
      };

      await propertyFacet.connect(developer).createProperty(propertyData);

      expect(await propertyFacet.getTotalProperties()).to.equal(1);
    });

    it("Should return correct property count", async function () {
      expect(await propertyFacet.getTotalProperties()).to.equal(0);
    });

    it("Should return empty properties array initially", async function () {
      const [propertyIds, totalCount] = await propertyFacet.getProperties(0, 10);
      expect(propertyIds.length).to.equal(0);
      expect(totalCount).to.equal(0);
    });
  });

  describe("Property Queries", function () {
    beforeEach(async function () {
      // Create a test property
      const propertyData = {
        title: "Test Property",
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
        amountToRaise: 500000000,
        investmentDuration: 3,
        milestoneTitles: ["Phase 1"],
        milestoneDescriptions: ["Initial phase"],
        milestonePercentages: [100],
        roiPercentage: 20
      };

      await propertyFacet.connect(developer).createProperty(propertyData);
    });

    it("Should return correct property count after creation", async function () {
      expect(await propertyFacet.getTotalProperties()).to.equal(1);
    });

    it("Should return properties array with correct length", async function () {
      const [propertyIds, totalCount] = await propertyFacet.getProperties(0, 10);
      expect(propertyIds.length).to.equal(1);
      expect(totalCount).to.equal(1);
    });

    it("Should return developer properties", async function () {
      const developerProperties = await propertyFacet.getDeveloperProperties(developer.address);
      expect(developerProperties.length).to.equal(1);
    });

    it("Should return correct developer property count", async function () {
      const count = await propertyFacet.getDeveloperPropertyCount(developer.address);
      expect(count).to.equal(1);
    });

    it("Should return my properties for developer", async function () {
      const myProperties = await propertyFacet.connect(developer).getMyProperties();
      expect(myProperties.length).to.equal(1);
    });

    it("Should return empty my properties for non-developer", async function () {
      const myProperties = await propertyFacet.connect(investor).getMyProperties();
      expect(myProperties.length).to.equal(0);
    });
  });

  describe("Property Management", function () {
    let propertyId;

    beforeEach(async function () {
      // Create a test property
      const propertyData = {
        title: "Test Property",
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
        amountToRaise: 500000000,
        investmentDuration: 3,
        milestoneTitles: ["Phase 1"],
        milestoneDescriptions: ["Initial phase"],
        milestonePercentages: [100],
        roiPercentage: 20
      };

      await propertyFacet.connect(developer).createProperty(propertyData);
      propertyId = 1; // First property
    });

    it("Should allow developer to deactivate their property", async function () {
      await propertyFacet.connect(developer).deactivateProperty(propertyId);
      // Note: We can't directly test the property state without additional view functions
      // This test ensures the function doesn't revert
    });

    it("Should allow admin to activate property", async function () {
      await propertyFacet.connect(owner).adminActivateProperty(propertyId);
      // Note: We can't directly test the property state without additional view functions
      // This test ensures the function doesn't revert
    });

    it("Should allow admin to deactivate property", async function () {
      await propertyFacet.connect(owner).adminDeactivateProperty(propertyId);
      // Note: We can't directly test the property state without additional view functions
      // This test ensures the function doesn't revert
    });

    it("Should prevent non-developer from deactivating property", async function () {
      await expect(
        propertyFacet.connect(investor).deactivateProperty(propertyId)
      ).to.be.revertedWith("Unauthorized: Only property developer or admin can update");
    });
  });

  describe("Property Details", function () {
    it("Should return property details", async function () {
      const property = await propertyFacet.getProperty(0);
      expect(property.developer).to.equal(developer.address);
      expect(property.name).to.equal("Test Property");
      expect(property.description).to.equal("A test property");
    });

    it("Should return my token properties", async function () {
      const tokenProperties = await propertyFacet.getMyTokenProperties();
      expect(tokenProperties).to.be.an('array');
    });

    it("Should return property token holders", async function () {
      const tokenHolders = await propertyFacet.getPropertyTokenHolders(0);
      expect(tokenHolders).to.be.an('array');
    });
  });

  describe("Property Updates", function () {
    it("Should allow developer to update their property", async function () {
      await propertyFacet.updateProperty(
        0,
        "Updated Property",
        "Updated description",
        "updated-location",
        "updated-image-hash",
        "updated-document-hash",
        2000000, // new target amount
        12 // new duration
      );
      
      const updatedProperty = await propertyFacet.getProperty(0);
      expect(updatedProperty.name).to.equal("Updated Property");
      expect(updatedProperty.description).to.equal("Updated description");
    });

    it("Should prevent non-developer from updating property", async function () {
      await expect(
        propertyFacet.connect(investor).updateProperty(
          0,
          "Updated Property",
          "Updated description",
          "updated-location",
          "updated-image-hash",
          "updated-document-hash",
          2000000,
          12
        )
      ).to.be.revertedWith("Only developer can update their property");
    });
  });
}); 