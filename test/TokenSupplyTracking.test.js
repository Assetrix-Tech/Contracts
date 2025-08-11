const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token Supply Tracking", function () {
  let diamond, investmentFacet, adminFacet, propertyFacet, fiatPaymentFacet, mockStablecoin;
  let owner, backendSigner, user1, user2, developer;

  beforeEach(async function () {
    [owner, backendSigner, user1, user2, developer] = await ethers.getSigners();

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
      "0x80521c91", "0xc4c5f624"
    ];

    const investmentSelectors = [
      "0x8bf0af3e", "0xef57e2d2", "0xe2d253c9", "0xf2934a02", "0xda2a1bb5",
      "0x0117b0ed", "0x1b48a3b0", "0x19580150", "0x93838cdb", "0xb8af3d3e",
      "0xdae21c58", "0xad41f119", "0x93ffcce3", "0xb79f9f67", "0xb7ddac87",
      "0x1a4847e9", "0x372896f1", "0x8682c64d", "0x7ad226dc"
    ];

    const propertySelectors = [
      "0x1f346f07", "0x32665ffb", "0xb16aa470", "0x17aaf5ed", "0x4835ec06",
      "0x759c7de8", "0x17fc2f96", "0x7ca28bc6", "0xc2f6f25c", "0x5ec231ba",
      "0xe52097a0"
    ];

    const transactionSelectors = [
      "0x9751e5fe", "0xb5c604ff", "0x33ea3dc8", "0xc51309db", "0x70c548f6"
    ];

    const milestoneSelectors = [
      "0x359b3123", "0xe8049da1", "0xbc643619", "0x5cae48f5", "0x54d49e46",
      "0xeb9d9a5d"
    ];

    const diamondLoupeSelectors = [
      "0xcdffacc6", "0x52ef6b2c", "0xadfca15e", "0x7a0ed627"
    ];

    const fiatPaymentSelectors = [
      "0xe474f042", "0xf7770056", "0xd9e359cd", "0x5cf0e8a4", "0xed24911d",
      "0x6834e3a8", "0x2ff79161", "0x591723fd", "0x149f2e88", "0x85e69128",
      "0x36f95670"
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
    await adminFacet.setGlobalTokenPrice(ethers.parseEther("100000")); // 100,000 Naira per token
    await adminFacet.setMinTokensPerInvestment(1);
    await adminFacet.setMinTokensPerProperty(100);
    await adminFacet.setMaxTokensPerProperty(10000);
    await fiatPaymentFacet.setBackendSigner(backendSigner.address);
    await fiatPaymentFacet.initializeDomainSeparator();

    // Mint some Naira to owner for testing
    await mockStablecoin.mint(owner.address, ethers.parseEther("1000000"));

    // Create a sample property for testing
    const propertyData = {
      title: "Test Property for Token Tracking",
      description: "A property to test token supply tracking",
      propertyType: 1, // LuxuryResidentialTowers
      propertyUse: 0, // Commercial
      developerName: "Test Developer",
      developerAddress: owner.address,
      city: "Test City",
      state: "Test State",
      country: "Test Country",
      ipfsImagesHash: "QmTestImages123",
      ipfsMetadataHash: "QmTestMetadata123",
      size: 1000,
      bedrooms: 2,
      bathrooms: 2,
      amountToRaise: ethers.parseEther("10000000"), // 10M Naira = 100 tokens at 100,000 Naira each
      investmentDuration: 0, // OneMonth
      milestoneTitles: ["Foundation", "Structure", "Finishing"],
      milestoneDescriptions: [
        "Foundation work",
        "Structural work", 
        "Finishing touches"
      ],
      milestonePercentages: [30, 40, 30],
      roiPercentage: 15
    };

    await propertyFacet.createProperty(propertyData);
  });

  describe("Initial Token Supply", function () {
    it("Should create property with correct initial token supply", async function () {
      const property = await propertyFacet.getProperty(1);
      
      // Property should have 100 tokens total (10M Naira / 100,000 Naira per token)
      expect(property.totalTokens).to.equal(100);
      expect(property.tokensSold).to.equal(0);
      expect(property.tokensLeft).to.equal(100);
      expect(property.isFullyFunded).to.be.false;
    });

    it("Should calculate token price correctly", async function () {
      const property = await propertyFacet.getProperty(1);
      const expectedTokenPrice = ethers.parseEther("100000"); // 100,000 Naira
      
      expect(property.tokenPrice).to.equal(expectedTokenPrice);
    });
  });

  describe("Token Supply After Purchases", function () {
    it("Should track tokens sold and remaining after first purchase", async function () {
      const propertyId = 1;
      const tokenAmount = 20; // Buy 20 tokens
      const fiatAmount = ethers.parseEther("2000000"); // 2M Naira (20 * 100,000)
      const paymentReference = "PAY_TEST_001";
      const nonce = await fiatPaymentFacet.getUserNonce(user1.address);

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
        user: user1.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      // Process the fiat payment
      await fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user1.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
      );

      // Check property token supply
      const property = await propertyFacet.getProperty(propertyId);
      expect(property.tokensSold).to.equal(20);
      expect(property.tokensLeft).to.equal(80);
      expect(property.totalTokens).to.equal(100);
      expect(property.isFullyFunded).to.be.false;

      // Check user token balance
      const userBalance = await investmentFacet.getTokenBalance(propertyId, user1.address);
      expect(userBalance).to.equal(20);
    });

    it("Should track multiple purchases correctly", async function () {
      const propertyId = 1;
      
      // First purchase: 30 tokens
      const tokenAmount1 = 30;
      const fiatAmount1 = ethers.parseEther("3000000"); // 3M Naira
      const paymentReference1 = "PAY_TEST_002";
      const nonce1 = await fiatPaymentFacet.getUserNonce(user1.address);

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
          { name: "nonce", type: "uint256" },
        ]
      };

      const value1 = {
        user: user1.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount1,
        fiatAmount: fiatAmount1,
        paymentReference: paymentReference1,
        nonce: nonce1
      };

      const signature1 = await backendSigner.signTypedData(domain, types, value1);

      await fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user1.address, tokenAmount1, fiatAmount1, paymentReference1, nonce1, signature1
      );

      // Second purchase: 25 tokens by different user
      const tokenAmount2 = 25;
      const fiatAmount2 = ethers.parseEther("2500000"); // 2.5M Naira
      const paymentReference2 = "PAY_TEST_003";
      const nonce2 = await fiatPaymentFacet.getUserNonce(user2.address);

      const value2 = {
        user: user2.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount2,
        fiatAmount: fiatAmount2,
        paymentReference: paymentReference2,
        nonce: nonce2
      };

      const signature2 = await backendSigner.signTypedData(domain, types, value2);

      await fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user2.address, tokenAmount2, fiatAmount2, paymentReference2, nonce2, signature2
      );

      // Check final property token supply
      const property = await propertyFacet.getProperty(propertyId);
      expect(property.tokensSold).to.equal(55); // 30 + 25
      expect(property.tokensLeft).to.equal(45); // 100 - 55
      expect(property.totalTokens).to.equal(100);
      expect(property.isFullyFunded).to.be.false;

      // Check user balances
      const user1Balance = await investmentFacet.getTokenBalance(propertyId, user1.address);
      const user2Balance = await investmentFacet.getTokenBalance(propertyId, user2.address);
      expect(user1Balance).to.equal(30);
      expect(user2Balance).to.equal(25);
    });

    it("Should become fully funded when all tokens are sold", async function () {
      const propertyId = 1;
      
      // Buy all 100 tokens in one transaction
      const tokenAmount = 100;
      const fiatAmount = ethers.parseEther("10000000"); // 10M Naira
      const paymentReference = "PAY_TEST_004";
      const nonce = await fiatPaymentFacet.getUserNonce(user1.address);

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
        user: user1.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      // Process the fiat payment
      await fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user1.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
      );

      // Check property is now fully funded
      const property = await propertyFacet.getProperty(propertyId);
      expect(property.tokensSold).to.equal(100);
      expect(property.tokensLeft).to.equal(0);
      expect(property.totalTokens).to.equal(100);
      expect(property.isFullyFunded).to.be.true;

      // Check user balance
      const userBalance = await investmentFacet.getTokenBalance(propertyId, user1.address);
      expect(userBalance).to.equal(100);
    });
  });

  describe("Token Supply Validation", function () {
    it("Should reject purchase when not enough tokens left", async function () {
      const propertyId = 1;
      
      // Try to buy more tokens than available (101 tokens when only 100 exist)
      const tokenAmount = 101;
      const fiatAmount = ethers.parseEther("10100000"); // 10.1M Naira
      const paymentReference = "PAY_TEST_005";
      const nonce = await fiatPaymentFacet.getUserNonce(user1.address);

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
        user: user1.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      // Should revert with "Not enough tokens left"
      await expect(
        fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
          propertyId, user1.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
        )
      ).to.be.revertedWith("Not enough tokens left");
    });

    it("Should maintain correct token counts after multiple transactions", async function () {
      const propertyId = 1;
      
      // Buy 10 tokens
      const tokenAmount1 = 10;
      const fiatAmount1 = ethers.parseEther("1000000"); // 1M Naira
      const paymentReference1 = "PAY_TEST_006";
      const nonce1 = await fiatPaymentFacet.getUserNonce(user1.address);

      const domain = {
        name: "Assetrix",
        "version": "1",
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

      const value1 = {
        user: user1.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount1,
        fiatAmount: fiatAmount1,
        paymentReference: paymentReference1,
        nonce: nonce1
      };

      const signature1 = await backendSigner.signTypedData(domain, types, value1);

      await fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user1.address, tokenAmount1, fiatAmount1, paymentReference1, nonce1, signature1
      );

      // Buy 15 more tokens
      const tokenAmount2 = 15;
      const fiatAmount2 = ethers.parseEther("1500000"); // 1.5M Naira
      const paymentReference2 = "PAY_TEST_007";
      const nonce2 = await fiatPaymentFacet.getUserNonce(user1.address);

      const value2 = {
        user: user1.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount2,
        fiatAmount: fiatAmount2,
        paymentReference: paymentReference2,
        nonce: nonce2
      };

      const signature2 = await backendSigner.signTypedData(domain, types, value2);

      await fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user1.address, tokenAmount2, fiatAmount2, paymentReference2, nonce2, signature2
      );

      // Verify total balance and remaining tokens
      const property = await propertyFacet.getProperty(propertyId);
      const userBalance = await investmentFacet.getTokenBalance(propertyId, user1.address);
      
      expect(property.tokensSold).to.equal(25); // 10 + 15
      expect(property.tokensLeft).to.equal(75); // 100 - 25
      expect(userBalance).to.equal(25);
      expect(property.tokensSold + property.tokensLeft).to.equal(property.totalTokens);
    });
  });

  describe("Property Funding Status", function () {
    it("Should track funding percentage correctly", async function () {
      const propertyId = 1;
      
      // Buy 50 tokens (50% of total)
      const tokenAmount = 50;
      const fiatAmount = ethers.parseEther("5000000"); // 5M Naira
      const paymentReference = "PAY_TEST_008";
      const nonce = await fiatPaymentFacet.getUserNonce(user1.address);

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
        user: user1.address,
        propertyId: propertyId,
        tokenAmount: tokenAmount,
        fiatAmount: fiatAmount,
        paymentReference: paymentReference,
        nonce: nonce
      };

      const signature = await backendSigner.signTypedData(domain, types, value);

      await fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
        propertyId, user1.address, tokenAmount, fiatAmount, paymentReference, nonce, signature
      );

      // Check funding status
      const property = await propertyFacet.getProperty(propertyId);
      expect(property.tokensSold).to.equal(50);
      expect(property.tokensLeft).to.equal(50);
      expect(property.isFullyFunded).to.be.false;
      
      // Funding percentage should be 50%
      const fundingPercentage = Number(property.tokensSold) * 100 / Number(property.totalTokens);
      expect(fundingPercentage).to.equal(50);
    });
  });
});
