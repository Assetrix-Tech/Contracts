const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AdminFacet", function () {
  let diamond;
  let adminFacet;
  let owner;
  let nonOwner;
  let stablecoin;

  beforeEach(async function () {
    [owner, nonOwner] = await ethers.getSigners();

    const getSelectors = (contract) =>
    Object.keys(contract.interface.functions).map((fn) =>
    contract.interface.getSighash(fn)
  );

  //const functionSelectors = getSelectors(adminFacetContract);


    // Deploy mock stablecoin
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    stablecoin = await MockStablecoin.deploy();

    // Deploy diamond
    const Diamond = await ethers.getContractFactory("Diamond");
    diamond = await Diamond.deploy(owner.address);

    // Deploy AdminFacet
    const AdminFacet = await ethers.getContractFactory("AdminFacet");
    const adminFacetContract = await AdminFacet.deploy();

    const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());

    console.log(getSelectors(adminFacetContract), "hello world")
    const cut = [
      {
        facetAddress: await adminFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: getSelectors(adminFacetContract)
      }
    ];

    await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");

    adminFacet = await ethers.getContractAt("AdminFacet", await diamond.getAddress());

    // Initialize the platform
    await adminFacet.initialize(
      owner.address,
      await stablecoin.getAddress(),
      100000 // global token price
    );
  });

  describe("Initialization", function () {
    it("Should initialize with correct values", async function () {
      expect(await adminFacet.owner()).to.equal(owner.address);
      expect(await adminFacet.getGlobalTokenPrice()).to.equal(100000);
      expect(await adminFacet.getStablecoin()).to.equal(await stablecoin.getAddress());
      expect(await adminFacet.paused()).to.equal(false);
    });

    it("Should prevent double initialization", async function () {
      await expect(
        adminFacet.initialize(
          nonOwner.address,
          await stablecoin.getAddress(),
          200000
        )
      ).to.be.revertedWith("Already initialized");
    });
  });

  describe("Ownership", function () {
    it("Should have correct owner", async function () {
      expect(await adminFacet.owner()).to.equal(owner.address);
    });

    it("Should allow owner to transfer ownership", async function () {
      await adminFacet.transferOwnership(nonOwner.address);
      expect(await adminFacet.owner()).to.equal(nonOwner.address);
    });

    it("Should prevent non-owner from transferring ownership", async function () {
      await expect(
        adminFacet.connect(nonOwner).transferOwnership(nonOwner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent transfer to zero address", async function () {
      await expect(
        adminFacet.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Ownable: new owner is the zero address");
    });
  });

  describe("Pausable", function () {
    it("Should allow owner to pause", async function () {
      await adminFacet.pause();
      expect(await adminFacet.paused()).to.equal(true);
    });

    it("Should allow owner to unpause", async function () {
      await adminFacet.pause();
      await adminFacet.unpause();
      expect(await adminFacet.paused()).to.equal(false);
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        adminFacet.connect(nonOwner).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent non-owner from unpausing", async function () {
      await adminFacet.pause();
      await expect(
        adminFacet.connect(nonOwner).unpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Configuration", function () {
    it("Should allow owner to set global token price", async function () {
      await adminFacet.setGlobalTokenPrice(200000);
      expect(await adminFacet.getGlobalTokenPrice()).to.equal(200000);
    });

    it("Should prevent non-owner from setting global token price", async function () {
      await expect(
        adminFacet.connect(nonOwner).setGlobalTokenPrice(200000)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to set stablecoin", async function () {
      const newStablecoin = await ethers.getContractFactory("MockStablecoin");
      const newStablecoinContract = await newStablecoin.deploy();
      
      await adminFacet.setStablecoin(await newStablecoinContract.getAddress());
      expect(await adminFacet.getStablecoin()).to.equal(await newStablecoinContract.getAddress());
    });

    it("Should allow owner to set admin fee percentage", async function () {
      await adminFacet.setAdminFeePercentage(5);
      expect(await adminFacet.getAdminFeePercentage()).to.equal(5);
    });

    it("Should allow owner to set early exit fee percentage", async function () {
      await adminFacet.setEarlyExitFeePercentage(3);
      expect(await adminFacet.getEarlyExitFeePercentage()).to.equal(3);
    });
  });

  describe("View Functions", function () {
    it("Should return correct global token price", async function () {
      expect(await adminFacet.getGlobalTokenPrice()).to.equal(100000);
    });

    it("Should return correct stablecoin address", async function () {
      expect(await adminFacet.getStablecoin()).to.equal(await stablecoin.getAddress());
    });

    it("Should return correct admin fee percentage", async function () {
      expect(await adminFacet.getAdminFeePercentage()).to.equal(0); // Default value
    });

    it("Should return correct early exit fee percentage", async function () {
      expect(await adminFacet.getEarlyExitFeePercentage()).to.equal(0); // Default value
    });
  });
}); 