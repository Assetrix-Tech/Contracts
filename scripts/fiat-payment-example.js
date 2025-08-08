const { ethers } = require("hardhat");

// Example backend integration for fiat payments
async function main() {
  console.log("🚀 Fiat Payment Integration Example");
  console.log("=====================================");

  // Get signers
  const [owner, backendSigner, user, developer] = await ethers.getSigners();
  
  console.log("📋 Signers:");
  console.log(`   Owner: ${owner.address}`);
  console.log(`   Backend Signer: ${backendSigner.address}`);
  console.log(`   User: ${user.address}`);
  console.log(`   Developer: ${developer.address}`);

  // Deploy contracts (in real scenario, these would already be deployed)
  console.log("\n📦 Deploying contracts...");
  
  const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
  const mockStablecoin = await MockStablecoin.deploy();

  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(owner.address);

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

  // Get diamond cut interface
  const diamondCut = await ethers.getContractAt("IDiamondCut", await diamond.getAddress());

  // Add all facets to diamond
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
        "0x8456cb59", // pause
        "0x3f4ba83a", // unpause
        "0xf2fde38b", // transferOwnership
        "0x5c975abb", // paused
        "0x842f6221", // setGlobalTokenPrice
        "0xe088bfc0", // setStablecoin
        "0xfe9d0872", // setAdminFeePercentage
        "0x2750b0d2", // setEarlyExitFeePercentage
        "0xeb659dc1", // setMinTokensPerProperty
        "0x96241c97", // setMaxTokensPerProperty
        "0xe109516b", // setMinTokensPerInvestment
        "0xeec723bc", // getMinTokensPerProperty
        "0xdeba19e2", // getMaxTokensPerProperty
        "0x80521c91", // getMinTokensPerInvestment
        "0xc4c5f624"  // withdrawStablecoin
      ]
    },
    {
      facetAddress: await investmentFacetContract.getAddress(),
      action: 0, // Add
      functionSelectors: [
        "0x36f95670", // setBackendSigner
        "0xd9e359cd", // getBackendSigner
        "0xf7770056", // distributeTokensFromFiat
        "0x6834e3a8", // getUserNonce
        "0x149f2e88", // isPaymentProcessed
        "0x8bf0af3e", // purchaseTokens
        "0xef57e2d2", // getTokenBalance
        "0xe2d253c9", // getTokenGap
        "0xf2934a02", // getTokenSalePercentage
        "0xda2a1bb5", // getTokenValue
        "0x0117b0ed", // calculateTokensFromAmount
        "0x1b48a3b0", // calculateAmountFromTokens
        "0x19580150", // calculateExpectedROI
        "0x93838cdb", // canAcceptTokenPurchases
        "0xb8af3d3e", // earlyExit
        "0xdae21c58", // emergencyRefund
        "0xad41f119", // getExpectedROIPercentage
        "0x93ffcce3", // getInvestmentEndTime
        "0xb79f9f67", // getInvestmentPeriodRemaining
        "0xb7ddac87", // getPropertyAmountToRaise
        "0x1a4847e9", // isInvestmentPeriodActive
        "0x372896f1", // isPayoutProcessed
        "0x8682c64d", // payoutInvestment
        "0x7ad226dc"  // refund
      ]
    },
    {
      facetAddress: await propertyFacetContract.getAddress(),
      action: 0, // Add
      functionSelectors: [
        "0x1f346f07", // createProperty
        "0x32665ffb", // getProperty
        "0xb16aa470", // getProperties
        "0x17aaf5ed", // getTotalProperties
        "0x4835ec06", // getDeveloperProperties
        "0x759c7de8", // getDeveloperPropertyCount
        "0x17fc2f96", // getPropertyTokenHolders
        "0x7ca28bc6", // deactivateProperty
        "0xc2f6f25c", // adminActivateProperty
        "0x5ec231ba", // adminDeactivateProperty
        "0xe52097a0"  // updateProperty
      ]
    },
    {
      facetAddress: await transactionFacetContract.getAddress(),
      action: 0, // Add
      functionSelectors: [
        "0x9751e5fe", // recordTransaction
        "0xb5c604ff", // getTotalTransactions
        "0x33ea3dc8", // getTransaction
        "0xc51309db", // getUserTransactionHistory
        "0x70c548f6"  // getPropertyTransactionHistory
      ]
    },
    {
      facetAddress: await milestoneFacetContract.getAddress(),
      action: 0, // Add
      functionSelectors: [
        "0x359b3123", // getMilestoneDashboard
        "0xe8049da1", // getMilestoneStatus
        "0xbc643619", // getPropertyMilestones
        "0x5cae48f5", // markMilestoneCompleted
        "0x54d49e46", // requestMilestoneFunds
        "0xeb9d9a5d"  // verifyAndMarkMilestoneCompleted
      ]
    },
    {
      facetAddress: await diamondLoupeFacetContract.getAddress(),
      action: 0, // Add
      functionSelectors: [
        "0xcdffacc6", // facetAddress
        "0x52ef6b2c", // facetAddresses
        "0xadfca15e", // facetFunctionSelectors
        "0x7a0ed627"  // facets
      ]
    }
  ];

  // Perform diamond cut
  await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");

  // Get facet interfaces
  const adminFacet = await ethers.getContractAt("AdminFacet", await diamond.getAddress());
  const investmentFacet = await ethers.getContractAt("InvestmentFacet", await diamond.getAddress());
  const propertyFacet = await ethers.getContractAt("PropertyFacet", await diamond.getAddress());

  // Initialize the diamond
  console.log("\n🔧 Initializing diamond...");
  await adminFacet.initialize(
    owner.address,
    await mockStablecoin.getAddress(),
    ethers.parseEther("1000") // 1000 USDT per token
  );

  // Set backend signer
  console.log("🔐 Setting backend signer...");
  await investmentFacet.setBackendSigner(backendSigner.address);
  console.log(`   Backend signer set to: ${await investmentFacet.getBackendSigner()}`);

  // Create a test property
  console.log("\n🏠 Creating test property...");
  const propertyData = {
    title: "Luxury Apartment Complex",
    description: "A premium residential development in Lagos",
    propertyType: 0, // ShortStay
    propertyUse: 0, // Commercial
    developerName: "Assetrix Developers",
    developerAddress: developer.address,
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    ipfsImagesHash: "QmTestImages",
    ipfsMetadataHash: "QmTestMetadata",
    size: 5000,
    bedrooms: 10,
    bathrooms: 8,
    amountToRaise: ethers.parseEther("500000"), // 500,000 USDT (equivalent to ₦50,000,000)
    investmentDuration: 0, // OneMonth
    milestoneTitles: ["Foundation", "Structure", "Finishing"],
    milestoneDescriptions: ["Complete foundation", "Complete structure", "Complete finishing"],
    milestonePercentages: [30, 50, 20],
    roiPercentage: 25
  };

  await propertyFacet.createProperty(propertyData);
  console.log("   Property created successfully");
  console.log("   Property created successfully");

  // Simulate fiat payment processing
  console.log("\n💰 Processing fiat payment...");
  
  const propertyId = 1;
  const tokenAmount = 50; // 50 tokens
  const fiatAmount = ethers.parseEther("50000"); // 50,000 USDT (₦50,000,000)
  const paymentReference = "PAY_" + Date.now();
  const userNonce = await investmentFacet.getUserNonce(user.address);

  console.log(`   Property ID: ${propertyId}`);
  console.log(`   User: ${user.address}`);
  console.log(`   Token Amount: ${tokenAmount}`);
  console.log(`   Fiat Amount: ${ethers.formatEther(fiatAmount)} USDT`);
  console.log(`   Payment Reference: ${paymentReference}`);
  console.log(`   User Nonce: ${userNonce}`);

  // Create signature (this would be done by your backend)
  console.log("\n✍️  Creating backend signature...");
  const messageHash = ethers.keccak256(
    ethers.solidityPacked(
      ["address", "uint256", "uint256", "uint256", "string", "uint256"],
      [user.address, propertyId, tokenAmount, fiatAmount, paymentReference, userNonce]
    )
  );
  
  const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));
  console.log(`   Signature created: ${signature}`);

  // Process fiat payment
  console.log("\n🚀 Distributing tokens from fiat payment...");
  const tx = await investmentFacet.distributeTokensFromFiat(
    propertyId,
    user.address,
    tokenAmount,
    fiatAmount,
    paymentReference,
    userNonce,
    signature
  );

  await tx.wait();
  console.log("   ✅ Tokens distributed successfully!");
  console.log(`   Transaction hash: ${tx.hash}`);

  // Verify the results
  console.log("\n📊 Verifying results...");
  
  const property = await propertyFacet.getProperty(propertyId);
  console.log(`   Property tokens sold: ${property.tokensSold}`);
  console.log(`   Property tokens left: ${property.tokensLeft}`);
  
  const isProcessed = await investmentFacet.isPaymentProcessed(paymentReference);
  console.log(`   Payment processed: ${isProcessed}`);
  
  const newNonce = await investmentFacet.getUserNonce(user.address);
  console.log(`   New user nonce: ${newNonce}`);

  // Get property details for JSON output
  const propertyDetails = await propertyFacet.getProperty(propertyId);
  console.log(`   Property tokens sold: ${propertyDetails.tokensSold}`);
  console.log(`   Property tokens left: ${propertyDetails.tokensLeft}`);

  console.log("\n🎉 Fiat payment integration completed successfully!");
  console.log("\n📝 Summary:");
  console.log("   1. User paid ₦50,000,000 via Paystack");
  console.log("   2. Backend verified payment and created signature");
  console.log("   3. Smart contract verified signature and distributed 50 tokens");
  console.log("   4. User now owns 50 tokens in the property");
  console.log("   5. Payment reference prevents double-spending");
  console.log("   6. amountToRaise: 500,000 USDT (₦50,000,000 equivalent)");

  // Save results to JSON file
  const fs = require('fs');
  const results = {
    "network": "localhost",
    "diamond": await diamond.getAddress(),
    "facets": {
      "admin": await adminFacetContract.getAddress(),
      "investment": await investmentFacetContract.getAddress(),
      "property": await propertyFacetContract.getAddress(),
      "transaction": await transactionFacetContract.getAddress(),
      "milestone": await milestoneFacetContract.getAddress(),
      "diamondloupe": await diamondLoupeFacetContract.getAddress()
    },
    "mockStablecoin": await mockStablecoin.getAddress(),
    "signers": {
      "owner": owner.address,
      "backendSigner": backendSigner.address,
      "user": user.address,
      "developer": developer.address
    },
    "fiatPayment": {
      "propertyId": propertyId,
      "tokenAmount": tokenAmount.toString(),
      "fiatAmount": fiatAmount.toString(),
      "paymentReference": paymentReference,
      "userNonce": userNonce.toString(),
      "newNonce": newNonce.toString(),
      "signature": signature,
      "transactionHash": tx.hash,
      "isProcessed": isProcessed
    },
    "property": {
      "tokensSold": property.tokensSold.toString(),
      "tokensLeft": property.tokensLeft.toString(),
      "amountToRaise": "500000000000000000000000" // 500,000 USDT (equivalent to ₦50,000,000)
    },
    "deployer": owner.address,
    "timestamp": new Date().toISOString(),
    "testType": "fiat-payment-integration"
  };

  // Save to file
  const outputPath = 'deployments/fiat-payment-example.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${outputPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 