const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Fiat Payment Integration", function () {
  let diamond, investmentFacet, adminFacet, propertyFacet, fiatPaymentFacet, mockStablecoin;
  let owner, backendSigner, user, developer;

  beforeEach(async function () {
    [owner, backendSigner, user, developer] = await ethers.getSigners();

    // Deploy MockStablecoin
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    mockStablecoin = await MockStablecoin.deploy();

    // Deploy Diamond
    const Diamond = await ethers.getContractFactory("Diamond");
    diamond = await Diamond.deploy(owner.address);

    // Deploy all facets
    const AdminFacet = await ethers.getContractFactory("AdminFacet");
    adminFacet = await AdminFacet.deploy();

    const InvestmentFacet = await ethers.getContractFactory("InvestmentFacet");
    investmentFacet = await InvestmentFacet.deploy();

    const PropertyFacet = await ethers.getContractFactory("PropertyFacet");
    propertyFacet = await PropertyFacet.deploy();

    const TransactionFacet = await ethers.getContractFactory("TransactionFacet");
    const transactionFacet = await TransactionFacet.deploy();

    const MilestoneFacet = await ethers.getContractFactory("MilestoneFacet");
    const milestoneFacet = await MilestoneFacet.deploy();

    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
    const diamondLoupeFacet = await DiamondLoupeFacet.deploy();

    const FiatPaymentFacet = await ethers.getContractFactory("FiatPaymentFacet");
    const fiatPaymentFacetContract = await FiatPaymentFacet.deploy();

    // Get function selectors for each facet
    const adminSelectors = [
      "0x8da5cb5b", "0x1794bb3c", "0x5cd9205f", "0xcc7ac330", "0xb6f67312",
      "0x92b582e0", "0xd6c7d918", "0x8456cb59", "0x3f4ba83a", "0xf2fde38b",
      "0x5c975abb", "0x842f6221", "0xe088bfc0", "0xfe9d0872", "0x2750b0d2",
      "0xeb659dc1", "0x96241c97", "0xe109516b", "0xeec723bc", "0xdeba19e2",
      "0x80521c91", "0xd511b289"  // withdrawStablecoin (updated for EIP-2771)
    ];

    const investmentSelectors = [
      "0x0334f811", // purchaseTokens
      "0x414b4eea", // payoutInvestment
      "0x96e83a40", // refund
      "0x5d76f829", // earlyExit
      "0xfa2b3963", // emergencyRefund
      "0x93838cdb", // canAcceptTokenPurchases
      "0x0117b0ed", // calculateTokensFromAmount
      "0x1b48a3b0", // calculateAmountFromTokens
      "0x19580150", // calculateExpectedROI
      "0x1a4847e9", // isInvestmentPeriodActive
      "0xad41f119", // getExpectedROIPercentage
      "0xe2d253c9", // getTokenGap
      "0xf2934a02", // getTokenSalePercentage
      "0xef57e2d2", // getTokenBalance
      "0xda2a1bb5", // getTokenValue
      "0xb7ddac87", // getPropertyAmountToRaise
      "0x93ffcce3", // getInvestmentEndTime
      "0xb79f9f67"  // getInvestmentPeriodRemaining
    ];

    const propertySelectors = [
      "0x17aaf5ed", // getTotalProperties
      "0xeb2220e9", // createProperty
      "0x32665ffb", // getProperty
      "0xb16aa470", // getProperties
      "0x397f7952", // getMyProperties
      "0x5ccd8ca0", // getMyTokenProperties
      "0x4835ec06", // getDeveloperProperties
      "0x759c7de8", // getDeveloperPropertyCount
      "0x17fc2f96", // getPropertyTokenHolders
      "0xd4cb6ba1", // updateProperty
      "0xcecf20cd", // deactivateProperty
      "0x6e03b57d", // adminActivateProperty
      "0x380b6b29"  // adminDeactivateProperty
    ];

    const transactionSelectors = [
      "0x9751e5fe", "0xb5c604ff", "0x33ea3dc8", "0xc51309db", "0x70c548f6"
    ];

    const milestoneSelectors = [
      "0x1cecea23", // requestMilestoneFunds
      "0xd47f4f69", // verifyAndMarkMilestoneCompleted
      "0x359b3123", // getMilestoneDashboard
      "0xe8049da1", // getMilestoneStatus
      "0xef8103f5", // markMilestoneCompleted
      "0xbc643619"  // getPropertyMilestones
    ];

    const diamondLoupeSelectors = [
      "0xcdffacc6", "0x52ef6b2c", "0xadfca15e", "0x7a0ed627"
    ];

    const fiatPaymentSelectors = [
      "0x0540492e", // distributeTokensFromFiat
      "0xf7770056", // getBackendSigner
      "0xd9e359cd", // getCurrentChainId
      "0x5cf0e8a4", // getDomainSeparator
      "0xed24911d", // getUserNonce
      "0x6834e3a8", // initializeDomainSeparator
      "0x2ff79161", // isDomainSeparatorInitialized
      "0x591723fd", // isPaymentProcessed
      "0x149f2e88", // resetDomainSeparator
      "0x85e69128", // setBackendSigner
      "0x36f95670"  // FIAT_PAYMENT_TYPEHASH
    ];

    // Add facets to diamond
    const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());
    
    const cut = [
      {
        facetAddress: await adminFacet.getAddress(),
        action: 0, // Add
        functionSelectors: adminSelectors
      },
      {
        facetAddress: await investmentFacet.getAddress(),
        action: 0, // Add
        functionSelectors: investmentSelectors
      },
      {
        facetAddress: await propertyFacet.getAddress(),
        action: 0, // Add
        functionSelectors: propertySelectors
      },
      {
        facetAddress: await transactionFacet.getAddress(),
        action: 0, // Add
        functionSelectors: transactionSelectors
      },
      {
        facetAddress: await milestoneFacet.getAddress(),
        action: 0, // Add
        functionSelectors: milestoneSelectors
      },
      {
        facetAddress: await diamondLoupeFacet.getAddress(),
        action: 0, // Add
        functionSelectors: diamondLoupeSelectors
      },
      {
        facetAddress: await fiatPaymentFacetContract.getAddress(),
        action: 0, // Add
        functionSelectors: fiatPaymentSelectors
      }
    ];

    await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");

    // Get contract interfaces
    adminFacet = await ethers.getContractAt("AdminFacet", await diamond.getAddress());
    investmentFacet = await ethers.getContractAt("InvestmentFacet", await diamond.getAddress());
    propertyFacet = await ethers.getContractAt("PropertyFacet", await diamond.getAddress());
    fiatPaymentFacet = await ethers.getContractAt("FiatPaymentFacet", await diamond.getAddress());

    // Initialize the platform
    await adminFacet.initializeOwnership(owner.address);
    await adminFacet.setStablecoin(await mockStablecoin.getAddress());
            await adminFacet.setGlobalTokenPrice(ethers.parseEther("100000"));
    await adminFacet.setMinTokensPerInvestment(1);
    await adminFacet.setMinTokensPerProperty(100);
    await adminFacet.setMaxTokensPerProperty(10000);
    await adminFacet.setBackendSigner(backendSigner.address);

    // Mint some Naira to owner for testing
    await mockStablecoin.mint(owner.address, ethers.parseEther("1000000"));

    // Create a sample property for testing
    const propertyData = {
      title: "Luxury Residential Tower - Lagos",
      description: "A premium residential development in the heart of Lagos",
      propertyType: 1, // LuxuryResidentialTowers
      propertyUse: 0, // Commercial
      developerName: "Assetrix Development Ltd",
      developerAddress: owner.address,
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
      ipfsImagesHash: "QmSampleImages123",
      ipfsMetadataHash: "QmSampleMetadata123",
      size: 2500,
      bedrooms: 4,
      bathrooms: 3,
              amountToRaise: ethers.parseEther("10000000"), // 10M Naira (100 tokens at 100,000 Naira per token)
      investmentDuration: 0, // OneMonth
      milestoneTitles: ["Foundation", "Structure", "Finishing", "Handover"],
      milestoneDescriptions: [
        "Foundation and groundwork",
        "Structural framework and walls",
        "Interior finishing and amenities",
        "Final inspection and handover"
      ],
      milestonePercentages: [25, 30, 30, 15],
      roiPercentage: 18
    };

    await propertyFacet.createProperty(propertyData, owner.address);
  });

  describe("Domain Separator Management", function () {
    it("Should initialize domain separator correctly", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const domainSeparator = await fiatPaymentFacet.getDomainSeparator();
      expect(domainSeparator).to.not.equal(ethers.ZeroHash);
      
      const isInitialized = await fiatPaymentFacet.isDomainSeparatorInitialized();
      expect(isInitialized).to.be.true;
    });

    it("Should only allow owner to initialize domain separator", async function () {
      await expect(
        fiatPaymentFacet.connect(user).initializeDomainSeparator()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent double initialization", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      await expect(
        fiatPaymentFacet.initializeDomainSeparator()
      ).to.be.revertedWith("Domain separator already initialized");
    });

    it("Should allow owner to reset domain separator", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      await fiatPaymentFacet.resetDomainSeparator();
      
      const isInitialized = await fiatPaymentFacet.isDomainSeparatorInitialized();
      expect(isInitialized).to.be.false;
    });
  });

  describe("Backend Signer Management", function () {
    it("Should set and get backend signer correctly", async function () {
      const signer = await adminFacet.getBackendSigner();
      expect(signer).to.equal(backendSigner.address);
    });

    it("Should only allow owner to set backend signer", async function () {
      await expect(
        adminFacet.connect(user).setBackendSigner(user.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should prevent setting zero address as backend signer", async function () {
      await expect(
        adminFacet.setBackendSigner(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid backend signer address");
    });

    it("Should emit event when backend signer is updated", async function () {
      const newSigner = user.address;
      await expect(adminFacet.setBackendSigner(newSigner))
        .to.emit(adminFacet, "BackendSignerUpdated")
        .withArgs(backendSigner.address, newSigner);
    });
  });

  describe("User Nonce Management", function () {
    it("Should start with nonce 0", async function () {
      const nonce = await fiatPaymentFacet.getUserNonce(user.address);
      expect(nonce).to.equal(0);
    });

    it("Should increment nonce after successful fiat payment", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("500000");
      const paymentReference = "PAY_TEST_001";
      const nonce = await fiatPaymentFacet.getUserNonce(user.address);
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
      await fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address
      );

      expect(await fiatPaymentFacet.getUserNonce(user.address)).to.equal(initialNonce + 1n);
    });
  });

  describe("Payment Reference Tracking", function () {
    it("Should track processed payments", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const paymentReference = "PAY_TEST_002";
      expect(await fiatPaymentFacet.isPaymentProcessed(paymentReference)).to.be.false;

      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("500000");
      const nonce = await fiatPaymentFacet.getUserNonce(user.address);

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

      await fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address
      );

      expect(await fiatPaymentFacet.isPaymentProcessed(paymentReference)).to.be.true;
    });

    it("Should prevent double-spending", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const paymentReference = "PAY_TEST_003";
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("500000");
      const nonce = await fiatPaymentFacet.getUserNonce(user.address);

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

      await fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address
      );

      await expect(
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce + 1n, signature, backendSigner.address
        )
      ).to.be.revertedWith("Payment already processed");
    });
  });

  describe("Signature Verification", function () {
    it("Should accept valid backend signature", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 10, fiatAmount = ethers.parseEther("1000000");
      const paymentReference = "PAY_TEST_004", nonce = await fiatPaymentFacet.getUserNonce(user.address);

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
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address)
      ).to.not.be.reverted;
    });

    it("Should reject signature from unauthorized signer", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 10, fiatAmount = ethers.parseEther("1000000");
      const paymentReference = "PAY_TEST_005", nonce = await fiatPaymentFacet.getUserNonce(user.address);

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
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address)
      ).to.be.revertedWith("Invalid backend signature");
    });

    it("Should reject invalid signature length", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 10, fiatAmount = ethers.parseEther("1000000");
      const paymentReference = "PAY_TEST_006", nonce = await fiatPaymentFacet.getUserNonce(user.address);
      const invalidSignature = "0x1234"; // Too short

      await expect(
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, invalidSignature, backendSigner.address)
      ).to.be.revertedWith("Invalid signature length");
    });
  });

  describe("Token Distribution", function () {
    it("Should distribute tokens correctly", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 10, fiatAmount = ethers.parseEther("1000000");
      const paymentReference = "PAY_TEST_007", nonce = await fiatPaymentFacet.getUserNonce(user.address);

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

      await fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address);

      const userTokens = await investmentFacet.getTokenBalance(propertyId, user.address);
      expect(userTokens).to.equal(tokenAmount);
    });

    it("Should emit correct events", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 15, fiatAmount = ethers.parseEther("1500000");
      const paymentReference = "PAY_TEST_008", nonce = await fiatPaymentFacet.getUserNonce(user.address);

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
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address)
      )
        .to.emit(fiatPaymentFacet, "TokensPurchased");
    });
  });

  describe("Access Control", function () {
    it("Should allow backend signer to call distributeTokensFromFiat", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("500000");
      const paymentReference = "PAY_TEST_009", nonce = await fiatPaymentFacet.getUserNonce(user.address);

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
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address)
      ).to.not.be.reverted;
    });

    it("Should allow user to call distributeTokensFromFiat for themselves", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("500000");
      const paymentReference = "PAY_TEST_010", nonce = await fiatPaymentFacet.getUserNonce(user.address);

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
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address)
      ).to.not.be.reverted;
    });

    it("Should prevent unauthorized users from calling distributeTokensFromFiat", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("500000");
      const paymentReference = "PAY_TEST_011", nonce = await fiatPaymentFacet.getUserNonce(user.address);

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

      // Try to call from unauthorized user (developer is not authorized)
      await expect(
        fiatPaymentFacet.connect(developer).distributeTokensFromFiat(propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address)
      ).to.be.revertedWith("Unauthorized caller");
    });
  });

  describe("Error Handling", function () {
    it("Should reject zero user address", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("500000");
      const paymentReference = "PAY_TEST_012", nonce = await fiatPaymentFacet.getUserNonce(user.address);

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
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, ethers.ZeroAddress, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address
        )
      ).to.be.revertedWith("Invalid user address");
    });

    it("Should reject zero token amount", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 0, fiatAmount = ethers.parseEther("0");
      const paymentReference = "PAY_TEST_013", nonce = await fiatPaymentFacet.getUserNonce(user.address);

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
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address)
      ).to.be.revertedWith("Token amount must be greater than 0");
    });

    it("Should reject insufficient tokens", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 100000, fiatAmount = ethers.parseEther("10000000000");
      const paymentReference = "PAY_TEST_014", nonce = await fiatPaymentFacet.getUserNonce(user.address);

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
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address)
      ).to.be.revertedWith("Not enough tokens left");
    });

    it("Should reject invalid nonce", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("500000");
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
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address)
      ).to.be.revertedWith("Invalid nonce");
    });

    it("Should reject when domain separator not initialized", async function () {
      const propertyId = 1, tokenAmount = 5, fiatAmount = ethers.parseEther("500000");
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
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(propertyId, user.address, tokenAmount, fiatAmount, paymentReference, nonce, signature, backendSigner.address)
      ).to.be.revertedWith("Domain separator not initialized");
    });
  });

  describe("Chain ID and Domain Management", function () {
    it("Should return correct chain ID", async function () {
      const chainId = await fiatPaymentFacet.getCurrentChainId();
      const expectedChainId = await ethers.provider.getNetwork().then(n => n.chainId);
      expect(chainId).to.equal(expectedChainId);
    });

    it("Should handle domain separator reset correctly", async function () {
      await fiatPaymentFacet.initializeDomainSeparator();
      expect(await fiatPaymentFacet.isDomainSeparatorInitialized()).to.be.true;
      
      await fiatPaymentFacet.resetDomainSeparator();
      expect(await fiatPaymentFacet.isDomainSeparatorInitialized()).to.be.false;
      
      // Should be able to re-initialize
      await fiatPaymentFacet.initializeDomainSeparator();
      expect(await fiatPaymentFacet.isDomainSeparatorInitialized()).to.be.true;
    });
  });
});
