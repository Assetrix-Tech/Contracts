const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DiamondLoupeFacet", function () {
  let diamond;
  let adminFacet;
  let propertyFacet;
  let diamondLoupeFacet;
  let owner;
  let developer;
  let stablecoin;

  beforeEach(async function () {
    [owner, developer] = await ethers.getSigners();

    // Deploy mock stablecoin
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    stablecoin = await MockStablecoin.deploy();

    // Deploy diamond
    const Diamond = await ethers.getContractFactory("Diamond");
    diamond = await Diamond.deploy(owner.address);

    // Deploy facets
    const AdminFacet = await ethers.getContractFactory("AdminFacet");
    const PropertyFacet = await ethers.getContractFactory("PropertyFacet");
    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
    
    const adminFacetContract = await AdminFacet.deploy();
    const propertyFacetContract = await PropertyFacet.deploy();
    const diamondLoupeFacetContract = await DiamondLoupeFacet.deploy();

    // Get diamond cut interface
    const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());

    const getSelectors = (contract) =>
    Object.keys(contract.interface.functions).map((fn) =>
    contract.interface.getSighash(fn)
  );
    // Add facets to diamond
    const cut = [
      {
        facetAddress: await adminFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: getSelectors(adminFacetContract)
      },
      {
        facetAddress: await propertyFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: getSelectors(propertyFacetContract)
      },
      {
        facetAddress: await diamondLoupeFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: getSelectors(diamondLoupeFacetContract)
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

  describe("Diamond Structure Queries", function () {
    it("Should return all facets", async function () {
      const facets = await diamondLoupeFacet.facets();
      expect(facets.length).to.equal(3); // AdminFacet, PropertyFacet, DiamondLoupeFacet
    });

    it("Should return facet addresses", async function () {
      const facetAddresses = await diamondLoupeFacet.facetAddresses();
      expect(facetAddresses.length).to.equal(3);
      
      // All addresses should be non-zero
      for (const address of facetAddresses) {
        expect(address).to.not.equal(ethers.ZeroAddress);
      }
    });

    it("Should return function selectors for each facet", async function () {
      const facets = await diamondLoupeFacet.facets();
      
      for (const facet of facets) {
        const selectors = await diamondLoupeFacet.facetFunctionSelectors(facet.facetAddress);
        expect(selectors.length).to.be.greaterThan(0);
      }
    });

    it("Should return correct facet address for function selector", async function () {
      // Test with owner function selector
     const ownerSelector = "0x8da5cb5b";
     // const ownerSelector = diamondLoupeFacet.interface.getSighash("owner()");
      const facetAddress = diamondLoupeFacet.facetAddress(ownerSelector);
      expect(facetAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should return zero address for non-existent function", async function () {
      // Test with a non-existent function selector
      const nonExistentSelector = "0x12345678";
      const facetAddress = await diamondLoupeFacet.facetAddress(nonExistentSelector);
      expect(facetAddress).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Facet Information", function () {
    it("Should return correct number of facets", async function () {
      const facets = await diamondLoupeFacet.facets();
      expect(facets.length).to.equal(3);
    });

    it("Should return facets with correct structure", async function () {
      const facets = await diamondLoupeFacet.facets();
      
      for (const facet of facets) {
        expect(facet.facetAddress).to.not.equal(ethers.ZeroAddress);
        expect(facet.functionSelectors.length).to.be.greaterThan(0);
      }
    });

    it("Should return function selectors for AdminFacet", async function () {
      const facets = await diamondLoupeFacet.facets();
      const adminFacet = facets.find(f => 
        f.functionSelectors.includes("0x8da5cb5b") // owner function
      );
      
      expect(adminFacet).to.not.be.undefined;
      expect(adminFacet.functionSelectors.length).to.be.greaterThan(0);
    });

    it("Should return function selectors for PropertyFacet", async function () {
      const facets = await diamondLoupeFacet.facets();
      const propertyFacet = facets.find(f => 
        f.functionSelectors.includes("0x17aaf5ed") // getTotalProperties function
      );
      
      expect(propertyFacet).to.not.be.undefined;
      expect(propertyFacet.functionSelectors.length).to.be.greaterThan(0);
    });

    it("Should return function selectors for DiamondLoupeFacet", async function () {
      const facets = await diamondLoupeFacet.facets();
      const loupeFacet = facets.find(f => 
        f.functionSelectors.includes("0x7a0ed627") // facets function
      );
      
      expect(loupeFacet).to.not.be.undefined;
      expect(loupeFacet.functionSelectors.length).to.be.greaterThan(0);
    });
  });

  describe("Function Selector Queries", function () {
    it("Should return function selectors for AdminFacet address", async function () {
      const facets = await diamondLoupeFacet.facets();
      const adminFacet = facets.find(f => 
        f.functionSelectors.includes("0x8da5cb5b")
      );
      
      const selectors = await diamondLoupeFacet.facetFunctionSelectors(adminFacet.facetAddress);
      expect(selectors.length).to.be.greaterThan(0);
      expect(selectors).to.include("0x8da5cb5b"); // owner function
    });

    it("Should return function selectors for PropertyFacet address", async function () {
      const facets = await diamondLoupeFacet.facets();
      const propertyFacet = facets.find(f => 
        f.functionSelectors.includes("0x17aaf5ed")
      );
      
      const selectors = await diamondLoupeFacet.facetFunctionSelectors(propertyFacet.facetAddress);
      expect(selectors.length).to.be.greaterThan(0);
      expect(selectors).to.include("0x17aaf5ed"); // getTotalProperties function
    });

    it("Should return function selectors for DiamondLoupeFacet address", async function () {
      const facets = await diamondLoupeFacet.facets();
      const loupeFacet = facets.find(f => 
        f.functionSelectors.includes("0x7a0ed627")
      );
      
      const selectors = await diamondLoupeFacet.facetFunctionSelectors(loupeFacet.facetAddress);
      expect(selectors.length).to.be.greaterThan(0);
      expect(selectors).to.include("0x7a0ed627"); // facets function
    });
  });

  describe("EIP-2535 Compliance", function () {
    it("Should implement all required EIP-2535 functions", async function () {
      // Test that all required functions exist and work
      const facets = await diamondLoupeFacet.facets();
      expect(facets.length).to.be.greaterThan(0);
      
      const facetAddresses = await diamondLoupeFacet.facetAddresses();
      expect(facetAddresses.length).to.be.greaterThan(0);
      
      const selectors = await diamondLoupeFacet.facetFunctionSelectors(ethers.ZeroAddress);
      expect(selectors).to.be.an('array');
      
      const facetAddress = await diamondLoupeFacet.facetAddress("0x8da5cb5b");
      expect(facetAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should return consistent data across all functions", async function () {
      const facets = await diamondLoupeFacet.facets();
      const facetAddresses = await diamondLoupeFacet.facetAddresses();
      
      expect(facets.length).to.equal(facetAddresses.length);
      
      // Check that all facet addresses in facets() match facetAddresses()
      const facetAddressesFromFacets = facets.map(f => f.facetAddress);
      for (const address of facetAddresses) {
        expect(facetAddressesFromFacets).to.include(address);
      }
    });
  });
}); 