const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Assetrix Diamond Pattern", function () {
  let diamond;
  let adminFacet;
  let propertyFacet;
  let investmentFacet;
  let milestoneFacet;
  let transactionFacet;
  let diamondLoupeFacet;
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

    // Deploy all facets
    const AdminFacet = await ethers.getContractFactory("AdminFacet");
    const PropertyFacet = await ethers.getContractFactory("PropertyFacet");
    const InvestmentFacet = await ethers.getContractFactory("InvestmentFacet");
    const MilestoneFacet = await ethers.getContractFactory("MilestoneFacet");
    const TransactionFacet = await ethers.getContractFactory("TransactionFacet");
    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");

    const adminFacetContract = await AdminFacet.deploy();
    const propertyFacetContract = await PropertyFacet.deploy();
    const investmentFacetContract = await InvestmentFacet.deploy();
    const milestoneFacetContract = await MilestoneFacet.deploy();
    const transactionFacetContract = await TransactionFacet.deploy();
    const diamondLoupeFacetContract = await DiamondLoupeFacet.deploy();

    // Get diamond cut interface
    const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());

    // Add only 3 facets to diamond to test
    const cut = [
      {
        facetAddress: await adminFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: ["0x8da5cb5b", "0x1794bb3c", "0xcc7ac330", "0xb6f67312"] // owner, initialize, getGlobalTokenPrice, getStablecoin
      },
      {
        facetAddress: await propertyFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: ["0x17aaf5ed"] // getTotalProperties
      },
      {
        facetAddress: await diamondLoupeFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: ["0x7a0ed627", "0x52ef6b2c", "0xadfca15e", "0xcdffacc6"] // facets, facetAddresses, facetFunctionSelectors, facetAddress
      }
    ];

    // Perform diamond cut
    await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");

    // Get facet interfaces
    adminFacet = await ethers.getContractAt("AdminFacet", await diamond.getAddress());
    propertyFacet = await ethers.getContractAt("PropertyFacet", await diamond.getAddress());
    diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet", await diamond.getAddress());

    // Initialize the platform
    await adminFacet.initialize(
      owner.address,
      await stablecoin.getAddress(),
      100000 // global token price
    );
  });

  describe("Diamond Pattern Core Functionality", function () {
    it("Should deploy diamond successfully", async function () {
      expect(await diamond.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should have correct owner", async function () {
      const ownerAddress = await adminFacet.owner();
      expect(ownerAddress).to.equal(owner.address);
    });

    it("Should reject diamond cut from non-owner", async function () {
      const [owner, nonOwner] = await ethers.getSigners();
      
      const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
      
      const AdminFacet = await ethers.getContractFactory("AdminFacet");
      const adminFacetContract = await AdminFacet.deploy();
      
      const cut = [
        {
          facetAddress: await adminFacetContract.getAddress(),
          action: 0, // Add
          functionSelectors: ["0x8da5cb5b"] // owner function
        }
      ];

      // This should fail because non-owner is calling it
      await expect(
        diamondCut.connect(nonOwner).diamondCut(cut, ethers.ZeroAddress, "0x")
      ).to.be.revertedWith("Must be contract owner");
    });
  });

  describe("All Facets Integration", function () {
    it("Should have 3 facets registered", async function () {
      const facets = await diamondLoupeFacet.facets();
      expect(facets.length).to.equal(3); // 3 facets should be registered
    });

    it("Should be able to query all facet addresses", async function () {
      const facetAddresses = await diamondLoupeFacet.facetAddresses();
      expect(facetAddresses.length).to.equal(3);
    });

    it("Should be able to call AdminFacet functions", async function () {
      const globalTokenPrice = await adminFacet.getGlobalTokenPrice();
      expect(globalTokenPrice).to.equal(100000);
    });

    it("Should be able to call PropertyFacet functions", async function () {
      // Test that property facet is accessible
      const totalProperties = await propertyFacet.getTotalProperties();
      expect(totalProperties).to.equal(0); // Should start with 0 properties
    });

    it("Should be able to call DiamondLoupeFacet functions", async function () {
      // Test that diamond loupe facet is accessible
      const facets = await diamondLoupeFacet.facets();
      expect(facets.length).to.equal(3);
    });
  });

  describe("Storage Layout", function () {
    it("Should maintain proper storage layout across all facets", async function () {
      const globalTokenPrice = await adminFacet.getGlobalTokenPrice();
      expect(globalTokenPrice).to.equal(100000);
      
      const ownerAddress = await adminFacet.owner();
      expect(ownerAddress).to.equal(owner.address);
      
      const stablecoinAddress = await adminFacet.getStablecoin();
      expect(stablecoinAddress).to.equal(await stablecoin.getAddress());
    });
  });
});