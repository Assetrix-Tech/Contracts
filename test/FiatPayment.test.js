const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Fiat Payment Integration", function () {
  let diamond, adminFacet, investmentFacet, propertyFacet;
  let mockStablecoin, owner, backendSigner, user, developer;

  beforeEach(async function () {
    [owner, backendSigner, user, developer] = await ethers.getSigners();

    // Deploy contracts
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    mockStablecoin = await MockStablecoin.deploy();

    const Diamond = await ethers.getContractFactory("Diamond");
    diamond = await Diamond.deploy(owner.address);

    // Deploy facets
    const AdminFacet = await ethers.getContractFactory("AdminFacet");
    const adminFacetContract = await AdminFacet.deploy();

    const InvestmentFacet = await ethers.getContractFactory("InvestmentFacet");
    const investmentFacetContract = await InvestmentFacet.deploy();

    const PropertyFacet = await ethers.getContractFactory("PropertyFacet");
    const propertyFacetContract = await PropertyFacet.deploy();

    const TransactionFacet = await ethers.getContractFactory("TransactionFacet");
    const transactionFacetContract = await TransactionFacet.deploy();

    const MilestoneFacet = await ethers.getContractFactory("MilestoneFacet");
    const milestoneFacetContract = await MilestoneFacet.deploy();

    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
    const diamondLoupeFacetContract = await DiamondLoupeFacet.deploy();

    // Add facets to diamond
    const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
    const cut = [
      {
        facetAddress: await adminFacetContract.getAddress(),
        action: 0,
        functionSelectors: [
          "0x8da5cb5b", "0x1794bb3c", "0x5cd9205f", "0xcc7ac330", "0xb6f67312",
          "0x92b582e0", "0xd6c7d918", "0x8456cb59", "0x3f4ba83a", "0xf2fde38b",
          "0x5c975abb", "0x842f6221", "0xe088bfc0", "0xfe9d0872", "0x2750b0d2",
          "0xeb659dc1", "0x96241c97", "0xe109516b", "0xeec723bc", "0xdeba19e2",
          "0x80521c91", "0xc4c5f624"
        ]
      },
      {
        facetAddress: await investmentFacetContract.getAddress(),
        action: 0,
        functionSelectors: [
          "0x36f95670", "0xd9e359cd", "0xf7770056", "0x6834e3a8", "0x149f2e88",
          "0x8bf0af3e", "0xef57e2d2", "0xe2d253c9", "0xf2934a02", "0xda2a1bb5",
          "0x0117b0ed", "0x1b48a3b0", "0x19580150", "0x93838cdb", "0xb8af3d3e",
          "0xdae21c58", "0xad41f119", "0x93ffcce3", "0xb79f9f67", "0xb7ddac87",
          "0x1a4847e9", "0x372896f1", "0x8682c64d", "0x7ad226dc"
        ]
      },
      {
        facetAddress: await propertyFacetContract.getAddress(),
        action: 0,
        functionSelectors: [
          "0x1f346f07", "0x32665ffb", "0xb16aa470", "0x17aaf5ed", "0x4835ec06",
          "0x759c7de8", "0x17fc2f96", "0x7ca28bc6", "0xc2f6f25c", "0x5ec231ba",
          "0xe52097a0"
        ]
      },
      {
        facetAddress: await transactionFacetContract.getAddress(),
        action: 0,
        functionSelectors: [
          "0x9751e5fe", "0xb5c604ff", "0x33ea3dc8", "0xc51309db", "0x70c548f6"
        ]
      },
      {
        facetAddress: await milestoneFacetContract.getAddress(),
        action: 0,
        functionSelectors: [
          "0x359b3123", "0xe8049da1", "0xbc643619", "0x5cae48f5", "0x54d49e46",
          "0xeb9d9a5d"
        ]
      },
      {
        facetAddress: await diamondLoupeFacetContract.getAddress(),
        action: 0,
        functionSelectors: [
          "0xcdffacc6", "0x52ef6b2c", "0xadfca15e", "0x7a0ed627"
        ]
      }
    ];

    await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");

    // Get interfaces
    adminFacet = await ethers.getContractAt("AdminFacet", await diamond.getAddress());
    investmentFacet = await ethers.getContractAt("InvestmentFacet", await diamond.getAddress());
    propertyFacet = await ethers.getContractAt("PropertyFacet", await diamond.getAddress());

    // Initialize
    await adminFacet.initialize(owner.address, await mockStablecoin.getAddress(), ethers.parseEther("1000"));
    await investmentFacet.setBackendSigner(backendSigner.address);

    // Create test property
    const propertyData = {
      title: "Luxury Apartment Complex",
      description: "A premium residential development in Lagos",
      propertyType: 0, propertyUse: 0, developerName: "Assetrix Developers",
      developerAddress: developer.address, city: "Lagos", state: "Lagos", country: "Nigeria",
      ipfsImagesHash: "QmTestImages", ipfsMetadataHash: "QmTestMetadata",
      size: 5000, bedrooms: 10, bathrooms: 8,
      amountToRaise: ethers.parseEther("500000"),
      investmentDuration: 0, roiPercentage: 25,
      milestoneTitles: ["Foundation", "Structure", "Finishing"],
      milestoneDescriptions: ["Complete foundation", "Complete structure", "Complete finishing"],
      milestonePercentages: [30, 50, 20]
    };

    await propertyFacet.createProperty(propertyData);
  });

  describe("Backend Signer Management", function () {
    it("Should set and get backend signer correctly", async function () {
      expect(await investmentFacet.getBackendSigner()).to.equal(backendSigner.address);
    });

    it("Should only allow owner to set backend signer", async function () {
      await expect(
        investmentFacet.connect(user).setBackendSigner(user.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("User Nonce Management", function () {
    it("Should start with nonce 0", async function () {
      expect(await investmentFacet.getUserNonce(user.address)).to.equal(0);
    });

    it("Should increment nonce after successful fiat payment", async function () {
      const initialNonce = await investmentFacet.getUserNonce(user.address);
      
      const propertyId = 1, tokenAmount = 10, fiatAmount = ethers.parseEther("10000");
      const paymentReference = "PAY_TEST_001", nonce = initialNonce;

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "uint256", "uint256", "string", "uint256"],
          [user.address, propertyId, tokenAmount, fiatAmount, paymentReference, nonce]
        )
      );
      
      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      await investmentFacet.distributeTokensFromFiat(
        propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
      );

      expect(await investmentFacet.getUserNonce(user.address)).to.equal(initialNonce + 1n);
    });
  });

  describe("Payment Reference Tracking", function () {
    it("Should track processed payments", async function () {
      const paymentReference = "PAY_TEST_002";
      expect(await investmentFacet.isPaymentProcessed(paymentReference)).to.be.false;

      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("5000");
      const nonce = await investmentFacet.getUserNonce(user.address);

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "uint256", "uint256", "string", "uint256"],
          [user.address, propertyId, tokenAmount, fiatAmount, paymentReference, nonce]
        )
      );
      
      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      await investmentFacet.distributeTokensFromFiat(
        propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
      );

      expect(await investmentFacet.isPaymentProcessed(paymentReference)).to.be.true;
    });

    it("Should prevent double-spending", async function () {
      const paymentReference = "PAY_TEST_003";
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("5000");
      const nonce = await investmentFacet.getUserNonce(user.address);

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "uint256", "uint256", "string", "uint256"],
          [user.address, propertyId, tokenAmount, fiatAmount, paymentReference, nonce]
        )
      );
      
      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      await investmentFacet.distributeTokensFromFiat(
        propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
      );

      await expect(
        investmentFacet.distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce + 1n, signature
        )
      ).to.be.revertedWith("Payment already processed");
    });
  });

  describe("Signature Verification", function () {
    it("Should accept valid backend signature", async function () {
      const propertyId = 1, tokenAmount = 10, fiatAmount = ethers.parseEther("10000");
      const paymentReference = "PAY_TEST_004", nonce = await investmentFacet.getUserNonce(user.address);

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "uint256", "uint256", "string", "uint256"],
          [user.address, propertyId, tokenAmount, fiatAmount, paymentReference, nonce]
        )
      );
      
      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      await expect(
        investmentFacet.distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.not.be.reverted;
    });

    it("Should reject signature from unauthorized signer", async function () {
      const propertyId = 1, tokenAmount = 10, fiatAmount = ethers.parseEther("10000");
      const paymentReference = "PAY_TEST_005", nonce = await investmentFacet.getUserNonce(user.address);

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "uint256", "uint256", "string", "uint256"],
          [user.address, propertyId, tokenAmount, fiatAmount, paymentReference, nonce]
        )
      );
      
      const signature = await user.signMessage(ethers.getBytes(messageHash));

      await expect(
        investmentFacet.distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.be.revertedWith("Invalid backend signature");
    });
  });

  describe("Token Distribution", function () {
    it("Should distribute tokens correctly", async function () {
      const propertyId = 1, tokenAmount = 20, fiatAmount = ethers.parseEther("20000");
      const paymentReference = "PAY_TEST_006", nonce = await investmentFacet.getUserNonce(user.address);

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "uint256", "uint256", "string", "uint256"],
          [user.address, propertyId, tokenAmount, fiatAmount, paymentReference, nonce]
        )
      );
      
      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      const initialBalance = await investmentFacet.getTokenBalance(propertyId, user.address);
      const property = await propertyFacet.getProperty(propertyId);
      const initialTokensSold = property.tokensSold;
      const initialTokensLeft = property.tokensLeft;

      await investmentFacet.distributeTokensFromFiat(
        propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
      );

      expect(await investmentFacet.getTokenBalance(propertyId, user.address)).to.equal(initialBalance + BigInt(tokenAmount));
      
      const updatedProperty = await propertyFacet.getProperty(propertyId);
      expect(updatedProperty.tokensSold).to.equal(initialTokensSold + BigInt(tokenAmount));
      expect(updatedProperty.tokensLeft).to.equal(initialTokensLeft - BigInt(tokenAmount));
    });
  });

  describe("Error Handling", function () {
    it("Should reject zero user address", async function () {
      const propertyId = 1, tokenAmount = 10, fiatAmount = ethers.parseEther("10000");
      const paymentReference = "PAY_TEST_007", nonce = await investmentFacet.getUserNonce(user.address);

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "uint256", "uint256", "string", "uint256"],
          [ethers.ZeroAddress, propertyId, tokenAmount, fiatAmount, paymentReference, nonce]
        )
      );
      
      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      await expect(
        investmentFacet.distributeTokensFromFiat(
          propertyId, ethers.ZeroAddress, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.be.revertedWith("Invalid user address");
    });

    it("Should reject zero token amount", async function () {
      const propertyId = 1, tokenAmount = 0, fiatAmount = ethers.parseEther("10000");
      const paymentReference = "PAY_TEST_008", nonce = await investmentFacet.getUserNonce(user.address);

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "uint256", "uint256", "string", "uint256"],
          [user.address, propertyId, tokenAmount, fiatAmount, paymentReference, nonce]
        )
      );
      
      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      await expect(
        investmentFacet.distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.be.revertedWith("Token amount must be greater than 0");
    });

    it("Should reject insufficient tokens", async function () {
      const propertyId = 1, tokenAmount = 1000, fiatAmount = ethers.parseEther("1000000");
      const paymentReference = "PAY_TEST_009", nonce = await investmentFacet.getUserNonce(user.address);

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "uint256", "uint256", "uint256", "string", "uint256"],
          [user.address, propertyId, tokenAmount, fiatAmount, paymentReference, nonce]
        )
      );
      
      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      await expect(
        investmentFacet.distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.be.revertedWith("Not enough tokens left");
    });
  });
}); 