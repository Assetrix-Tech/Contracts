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

    // Initialize the platform
    await adminFacet.initializeOwnership(owner.address);
    await adminFacet.setStablecoin(await mockStablecoin.getAddress());
    await adminFacet.setGlobalTokenPrice(ethers.parseEther("10000")); // 10,000 USDT per token
    await adminFacet.setMinTokensPerInvestment(1);
    await adminFacet.setMinTokensPerProperty(100);
    await adminFacet.setMaxTokensPerProperty(10000);

    // Set backend signer
    await investmentFacet.setBackendSigner(backendSigner.address);

    // Create a test property
    const propertyData = {
      title: "Test Luxury Property",
      description: "A beautiful luxury property for testing",
      propertyType: 1, // LuxuryResidentialTowers
      propertyUse: 0, // Commercial
      developerName: "Test Developer",
      developerAddress: developer.address,
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
      ipfsImagesHash: "QmTestImages123",
      ipfsMetadataHash: "QmTestMetadata123",
      size: 1000,
      bedrooms: 3,
      bathrooms: 2,
      amountToRaise: ethers.parseEther("1000000"), // 1M USDT
      investmentDuration: 0, // OneMonth
      milestoneTitles: ["Foundation", "Structure", "Finishing"],
      milestoneDescriptions: ["Foundation work", "Structural work", "Finishing touches"],
      milestonePercentages: [30, 40, 30],
      roiPercentage: 15
    };

    await propertyFacet.createProperty(propertyData);

    // Mint some USDT to the user for testing
    await mockStablecoin.mint(user.address, ethers.parseEther("1000000"));
    await mockStablecoin.mint(owner.address, ethers.parseEther("1000000"));
  });

  describe("Domain Separator Management", function () {
    it("Should initialize domain separator correctly", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const domainSeparator = await investmentFacet.getDomainSeparator();
      expect(domainSeparator).to.not.equal(ethers.ZeroHash);
      
      const isInitialized = await investmentFacet.isDomainSeparatorInitialized();
      expect(isInitialized).to.be.true;
    });

    it("Should only allow owner to initialize domain separator", async function () {
      await expect(
        investmentFacet.connect(user).initializeDomainSeparator()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent double initialization", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      await expect(
        investmentFacet.initializeDomainSeparator()
      ).to.be.revertedWith("Domain separator already initialized");
    });

    it("Should allow owner to reset domain separator", async function () {
      await investmentFacet.initializeDomainSeparator();
      await investmentFacet.resetDomainSeparator();
      
      const isInitialized = await investmentFacet.isDomainSeparatorInitialized();
      expect(isInitialized).to.be.false;
    });
  });

  describe("Backend Signer Management", function () {
    it("Should set and get backend signer correctly", async function () {
      const signer = await investmentFacet.getBackendSigner();
      expect(signer).to.equal(backendSigner.address);
    });

    it("Should only allow owner to set backend signer", async function () {
      await expect(
        investmentFacet.connect(user).setBackendSigner(user.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent setting zero address as backend signer", async function () {
      await expect(
        investmentFacet.setBackendSigner(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid backend signer address");
    });

    it("Should emit event when backend signer is updated", async function () {
      const newSigner = user.address;
      await expect(investmentFacet.setBackendSigner(newSigner))
        .to.emit(investmentFacet, "BackendSignerUpdated")
        .withArgs(backendSigner.address, newSigner);
    });
  });

  describe("User Nonce Management", function () {
    it("Should start with nonce 0", async function () {
      const nonce = await investmentFacet.getUserNonce(user.address);
      expect(nonce).to.equal(0);
    });

    it("Should increment nonce after successful fiat payment", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("50000");
      const paymentReference = "PAY_TEST_001";
      const nonce = await investmentFacet.getUserNonce(user.address);
      const initialNonce = nonce;

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      // Call from backend signer (authorized caller)
      await investmentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
      );

      expect(await investmentFacet.getUserNonce(user.address)).to.equal(initialNonce + 1n);
    });
  });

  describe("Payment Reference Tracking", function () {
    it("Should track processed payments", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const paymentReference = "PAY_TEST_002";
      expect(await investmentFacet.isPaymentProcessed(paymentReference)).to.be.false;

      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("50000");
      const nonce = await investmentFacet.getUserNonce(user.address);

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await investmentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
      );

      expect(await investmentFacet.isPaymentProcessed(paymentReference)).to.be.true;
    });

    it("Should prevent double-spending", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const paymentReference = "PAY_TEST_003";
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("50000");
      const nonce = await investmentFacet.getUserNonce(user.address);

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await investmentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
      );

      await expect(
        investmentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce + 1n, signature
        )
      ).to.be.revertedWith("Payment already processed");
    });
  });

  describe("Signature Verification", function () {
    it("Should accept valid backend signature", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 10, fiatAmount = ethers.parseEther("100000");
      const paymentReference = "PAY_TEST_004", nonce = await investmentFacet.getUserNonce(user.address);

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await expect(
        investmentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.not.be.reverted;
    });

    it("Should reject signature from unauthorized signer", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 10, fiatAmount = ethers.parseEther("100000");
      const paymentReference = "PAY_TEST_005", nonce = await investmentFacet.getUserNonce(user.address);

      // Create EIP-712 signature with wrong signer
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await user.signTypedData(domain, types, value);

      await expect(
        investmentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.be.revertedWith("Invalid backend signature");
    });

    it("Should reject invalid signature length", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 10, fiatAmount = ethers.parseEther("100000");
      const paymentReference = "PAY_TEST_006", nonce = await investmentFacet.getUserNonce(user.address);
      const invalidSignature = "0x1234"; // Too short

      await expect(
        investmentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, invalidSignature
        )
      ).to.be.revertedWith("Invalid signature length");
    });
  });

  describe("Token Distribution", function () {
    it("Should distribute tokens correctly", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 20, fiatAmount = ethers.parseEther("200000");
      const paymentReference = "PAY_TEST_007", nonce = await investmentFacet.getUserNonce(user.address);

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await investmentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
      );

      const userTokens = await investmentFacet.getTokenBalance(propertyId, user.address);
      expect(userTokens).to.equal(tokenAmount);
    });

    it("Should emit correct events", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 15, fiatAmount = ethers.parseEther("150000");
      const paymentReference = "PAY_TEST_008", nonce = await investmentFacet.getUserNonce(user.address);

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await expect(
        investmentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      )
        .to.emit(investmentFacet, "FiatPaymentProcessed")
        .and.to.emit(investmentFacet, "TokensPurchased");
    });
  });

  describe("Access Control", function () {
    it("Should allow backend signer to call distributeTokensFromFiat", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("50000");
      const paymentReference = "PAY_TEST_009", nonce = await investmentFacet.getUserNonce(user.address);

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await expect(
        investmentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.not.be.reverted;
    });

    it("Should allow user to call distributeTokensFromFiat for themselves", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("50000");
      const paymentReference = "PAY_TEST_010", nonce = await investmentFacet.getUserNonce(user.address);

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await expect(
        investmentFacet.connect(user).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.not.be.reverted;
    });

    it("Should prevent unauthorized users from calling distributeTokensFromFiat", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("50000");
      const paymentReference = "PAY_TEST_011", nonce = await investmentFacet.getUserNonce(user.address);

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      // Try to call from unauthorized user
      await expect(
        investmentFacet.connect(developer).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.be.revertedWith("Unauthorized caller");
    });
  });

  describe("Error Handling", function () {
    it("Should reject zero user address", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("50000");
      const paymentReference = "PAY_TEST_012", nonce = await investmentFacet.getUserNonce(user.address);

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: ethers.ZeroAddress,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await expect(
        investmentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, ethers.ZeroAddress, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.be.revertedWith("Invalid user address");
    });

    it("Should reject zero token amount", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 0, fiatAmount = ethers.parseEther("0");
      const paymentReference = "PAY_TEST_013", nonce = await investmentFacet.getUserNonce(user.address);

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await expect(
        investmentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.be.revertedWith("Token amount must be greater than 0");
    });

    it("Should reject insufficient tokens", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 100000, fiatAmount = ethers.parseEther("1000000000");
      const paymentReference = "PAY_TEST_014", nonce = await investmentFacet.getUserNonce(user.address);

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await expect(
        investmentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.be.revertedWith("Not enough tokens left");
    });

    it("Should reject invalid nonce", async function () {
      await investmentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("50000");
      const paymentReference = "PAY_TEST_015", nonce = 999; // Invalid nonce

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await expect(
        investmentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.be.revertedWith("Invalid nonce");
    });

    it("Should reject when domain separator not initialized", async function () {
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("50000");
      const paymentReference = "PAY_TEST_016", nonce = 0;

      // Create EIP-712 signature
      const domain = {
        name: "Assetrix",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await diamond.getAddress()
      };

      const types = {
        FiatPayment: [
          { name: "user", type: "address" },
          { name: "propertyId", type: "uint256" },
          { name: "tokenAmount", type: "uint256" },
          { name: "fiatAmount", type: "uint256" },
          { name: "paymentReference", type: "string" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = {
        user: user.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await expect(
        investmentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.be.revertedWith("Backend signer not set");
    });
  });

  describe("Chain ID and Domain Management", function () {
    it("Should return correct chain ID", async function () {
      const chainId = await investmentFacet.getCurrentChainId();
      const expectedChainId = await ethers.provider.getNetwork().then(n => n.chainId);
      expect(chainId).to.equal(expectedChainId);
    });

    it("Should handle domain separator reset correctly", async function () {
      await investmentFacet.initializeDomainSeparator();
      expect(await investmentFacet.isDomainSeparatorInitialized()).to.be.true;
      
      await investmentFacet.resetDomainSeparator();
      expect(await investmentFacet.isDomainSeparatorInitialized()).to.be.false;
      
      // Should be able to re-initialize
      await investmentFacet.initializeDomainSeparator();
      expect(await investmentFacet.isDomainSeparatorInitialized()).to.be.true;
    });
  });
});