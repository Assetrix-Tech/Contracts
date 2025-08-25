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

    // Deploy mock stablecoin
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    stablecoin = await MockStablecoin.deploy();

    // Deploy diamond
    const Diamond = await ethers.getContractFactory("Diamond");
    diamond = await Diamond.deploy(owner.address);

    // Deploy AdminFacet
    const AdminFacet = await ethers.getContractFactory("AdminFacet");
    const adminFacetContract = await AdminFacet.deploy();

    // Get diamond cut interface
    const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());

    // Add AdminFacet to diamond with all its functions
    const cut = [
      {
        facetAddress: await adminFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: [
          "0x8da5cb5b", // owner
          "0x1794bb3c", // initialize
          "0x5cd9205f", // initializeOwnership
          "0xcc7ac330", // getGlobalTokenPrice
          "0xb6f67312", // getStablecoin
          "0x92b582e0", // getAdminFeePercentage
          "0xd6c7d918", // getEarlyExitFeePercentage
          "0x5c975abb", // paused
          "0xeec723bc", // getMinTokensPerProperty
          "0xdeba19e2", // getMaxTokensPerProperty
          "0x80521c91", // getMinTokensPerInvestment
          "0x6d435421", // transferOwnership(address,address)
          "0x76a67a51", // pause(address)
          "0x57b001f9", // unpause(address)
          "0x0b8e33db", // setGlobalTokenPrice(uint256,address)
          "0xe12c735f", // setStablecoin(address,address)
          "0x1ae265d1", // setAdminFeePercentage(uint256,address)
          "0xd21c55e2", // setEarlyExitFeePercentage(uint256,address)
          "0x918dc7f3", // setMinTokensPerProperty(uint256,address)
          "0xc7c52652", // setMaxTokensPerProperty(uint256,address)
          "0xacc8cf7b", // setMinTokensPerInvestment(uint256,address)
          "0xd511b289"  // withdrawStablecoin(address,uint256,address)
        ]
      }
    ];

    // Perform diamond cut
    await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");

    // Get AdminFacet interface
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
      await adminFacet.transferOwnership(nonOwner.address, owner.address);
      expect(await adminFacet.owner()).to.equal(nonOwner.address);
    });

    it("Should prevent non-owner from transferring ownership", async function () {
      await expect(
        adminFacet.connect(nonOwner).transferOwnership(nonOwner.address, nonOwner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent transfer to zero address", async function () {
      await expect(
        adminFacet.transferOwnership(ethers.ZeroAddress, owner.address)
      ).to.be.revertedWith("Ownable: new owner is the zero address");
    });
  });

  describe("Pausable", function () {
    it("Should allow owner to pause", async function () {
      await adminFacet.pause(owner.address);
      expect(await adminFacet.paused()).to.equal(true);
    });

    it("Should allow owner to unpause", async function () {
      await adminFacet.pause(owner.address);
      await adminFacet.unpause(owner.address);
      expect(await adminFacet.paused()).to.equal(false);
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        adminFacet.connect(nonOwner).pause(nonOwner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent non-owner from unpausing", async function () {
      await adminFacet.pause(owner.address);
      await expect(
        adminFacet.connect(nonOwner).unpause(nonOwner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Configuration", function () {
    it("Should allow owner to set global token price", async function () {
      await adminFacet.setGlobalTokenPrice(200000, owner.address);
      expect(await adminFacet.getGlobalTokenPrice()).to.equal(200000);
    });

    it("Should prevent non-owner from setting global token price", async function () {
      await expect(
        adminFacet.connect(nonOwner).setGlobalTokenPrice(200000, nonOwner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to set stablecoin", async function () {
      const newStablecoin = await ethers.getContractFactory("MockStablecoin");
      const newStablecoinContract = await newStablecoin.deploy();
      
      await adminFacet.setStablecoin(await newStablecoinContract.getAddress(), owner.address);
      expect(await adminFacet.getStablecoin()).to.equal(await newStablecoinContract.getAddress());
    });

    it("Should allow owner to set admin fee percentage", async function () {
      await adminFacet.setAdminFeePercentage(5, owner.address);
      expect(await adminFacet.getAdminFeePercentage()).to.equal(5);
    });

    it("Should allow owner to set early exit fee percentage", async function () {
      await adminFacet.setEarlyExitFeePercentage(3, owner.address);
      expect(await adminFacet.getEarlyExitFeePercentage()).to.equal(3);
    });

    it("Should allow owner to set min tokens per property", async function () {
      await adminFacet.setMinTokensPerProperty(1000, owner.address);
      expect(await adminFacet.getMinTokensPerProperty()).to.equal(1000);
    });

    it("Should allow owner to set max tokens per property", async function () {
      await adminFacet.setMaxTokensPerProperty(10000, owner.address);
      expect(await adminFacet.getMaxTokensPerProperty()).to.equal(10000);
    });

    it("Should allow owner to set min tokens per investment", async function () {
      await adminFacet.setMinTokensPerInvestment(100, owner.address);
      expect(await adminFacet.getMinTokensPerInvestment()).to.equal(100);
    });

    it("Should prevent non-owner from setting min tokens per property", async function () {
      await expect(
        adminFacet.connect(nonOwner).setMinTokensPerProperty(1000, nonOwner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent non-owner from setting max tokens per property", async function () {
      await expect(
        adminFacet.connect(nonOwner).setMaxTokensPerProperty(10000, nonOwner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent non-owner from setting min tokens per investment", async function () {
      await expect(
        adminFacet.connect(nonOwner).setMinTokensPerInvestment(100, nonOwner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to withdraw stablecoin funds", async function () {
      // Transfer some tokens to the diamond contract
      await stablecoin.transfer(await diamond.getAddress(), ethers.parseUnits("1000", 2));
      
      const recipient = nonOwner.address;
      const amount = ethers.parseUnits("100", 2);
      
      await expect(
        adminFacet.withdrawStablecoin(recipient, amount, owner.address)
      ).to.emit(adminFacet, "StablecoinWithdrawn")
        .withArgs(recipient, amount);
    });

    it("Should prevent non-owner from withdrawing stablecoin funds", async function () {
      await expect(
        adminFacet.connect(nonOwner).withdrawStablecoin(nonOwner.address, 100, nonOwner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent withdrawal to zero address", async function () {
      await expect(
        adminFacet.withdrawStablecoin(ethers.ZeroAddress, 100, owner.address)
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("Should prevent withdrawal of zero amount", async function () {
      await expect(
        adminFacet.withdrawStablecoin(nonOwner.address, 0, owner.address)
      ).to.be.revertedWith("Amount must be greater than 0");
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
      expect(await adminFacet.getAdminFeePercentage()).to.equal(3); // Updated default value
    });

    it("Should return correct early exit fee percentage", async function () {
      expect(await adminFacet.getEarlyExitFeePercentage()).to.equal(5); // Updated default value
    });
  });
}); 