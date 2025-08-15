const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting local deployment of Assetrix...");

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contracts with account: ${deployer.address}`);

  // Deploy MockStablecoin
  console.log("\n💰 Deploying MockStablecoin...");
  const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
  const mockStablecoin = await MockStablecoin.deploy();
  await mockStablecoin.waitForDeployment();
  console.log(`✅ MockStablecoin deployed to: ${await mockStablecoin.getAddress()}`);

  // Deploy Diamond
  console.log("\n💎 Deploying Diamond contract...");
  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(deployer.address);
  await diamond.waitForDeployment();
  console.log(`✅ Diamond deployed to: ${await diamond.getAddress()}`);

  // Deploy all facets
  console.log("\n🔧 Deploying facets...");
  
  const AdminFacet = await ethers.getContractFactory("AdminFacet");
  const adminFacet = await AdminFacet.deploy();
  await adminFacet.waitForDeployment();
  console.log(`✅ AdminFacet deployed to: ${await adminFacet.getAddress()}`);

  const InvestmentFacet = await ethers.getContractFactory("InvestmentFacet");
  const investmentFacet = await InvestmentFacet.deploy();
  await investmentFacet.waitForDeployment();
  console.log(`✅ InvestmentFacet deployed to: ${await investmentFacet.getAddress()}`);

  const PropertyFacet = await ethers.getContractFactory("PropertyFacet");
  const propertyFacet = await PropertyFacet.deploy();
  await propertyFacet.waitForDeployment();
  console.log(`✅ PropertyFacet deployed to: ${await propertyFacet.getAddress()}`);

  const TransactionFacet = await ethers.getContractFactory("TransactionFacet");
  const transactionFacet = await TransactionFacet.deploy();
  await transactionFacet.waitForDeployment();
  console.log(`✅ TransactionFacet deployed to: ${await transactionFacet.getAddress()}`);

  const MilestoneFacet = await ethers.getContractFactory("MilestoneFacet");
  const milestoneFacet = await MilestoneFacet.deploy();
  await milestoneFacet.waitForDeployment();
  console.log(`✅ MilestoneFacet deployed to: ${await milestoneFacet.getAddress()}`);

  const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
  const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
  await diamondLoupeFacet.waitForDeployment();
  console.log(`✅ DiamondLoupeFacet deployed to: ${await diamondLoupeFacet.getAddress()}`);

  const FiatPaymentFacet = await ethers.getContractFactory("FiatPaymentFacet");
  const fiatPaymentFacet = await FiatPaymentFacet.deploy();
  await fiatPaymentFacet.waitForDeployment();
  console.log(`✅ FiatPaymentFacet deployed to: ${await fiatPaymentFacet.getAddress()}`);



  // Get function selectors for each facet
  console.log("\n🔍 Getting function selectors...");
  
  const adminSelectors = [
    "0x8da5cb5b", "0x1794bb3c", "0x5cd9205f", "0xcc7ac330", "0xb6f67312",
    "0x92b582e0", "0xd6c7d918", "0x8456cb59", "0x3f4ba83a", "0xf2fde38b",
    "0x5c975abb", "0x842f6221", "0xe088bfc0", "0xfe9d0872", "0x2750b0d2",
    "0xeb659dc1", "0x96241c97", "0xe109516b", "0xeec723bc", "0xdeba19e2",
    "0x80521c91", "0xc4c5f624", "0x36f95670", "0xd9e359cd"
  ];

  const investmentSelectors = [
    "0x8bf0af3e", "0xef57e2d2", "0xe2d253c9", "0xf2934a02", "0xda2a1bb5",
    "0x0117b0ed", "0x1b48a3b0", "0x19580150", "0x93838cdb", "0xb8af3d3e",
    "0xdae21c58", "0xad41f119", "0x93ffcce3", "0xb79f9f67", "0xb7ddac87",
    "0x1a4847e9", "0x372896f1", "0x8682c64d"
  ];

  const propertySelectors = [
    "0x1f346f07", "0x5ccd8ca0", "0xb16aa470", "0x32665ffb", "0x17fc2f96", "0x17aaf5ed",
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
    "0xe474f042", "0xf7770056", "0x5cf0e8a4", "0xed24911d",
    "0x6834e3a8", "0x2ff79161", "0x591723fd", "0x149f2e88", "0x85e69128"
  ];



  // Add facets to diamond
  console.log("\n🔗 Adding facets to diamond...");
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
      facetAddress: await fiatPaymentFacet.getAddress(),
      action: 0, // Add
      functionSelectors: fiatPaymentSelectors
    },

  ];

  const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
  const receipt = await tx.wait();
  console.log("✅ All facets added to diamond successfully");
  console.log(`   Transaction hash: ${tx.hash}`);
  console.log(`   Gas used: ${receipt.gasUsed}`);
  
  // Verify the diamond cut was successful by checking if facets are accessible
  try {
    const diamondLoupe = await ethers.getContractAt("DiamondLoupeFacet", await diamond.getAddress());
    const facets = await diamondLoupe.facets();
    console.log(`   ✅ Diamond cut verified: ${facets.length} facets found`);
  } catch (error) {
    console.log(`   ❌ Diamond cut verification failed: ${error.message}`);
  }

  // Get contract interfaces
  const adminFacetInterface = await ethers.getContractAt("AdminFacet", await diamond.getAddress());
  const investmentFacetInterface = await ethers.getContractAt("InvestmentFacet", await diamond.getAddress());
  const propertyFacetInterface = await ethers.getContractAt("PropertyFacet", await diamond.getAddress());

  // Initialize the platform
  console.log("\n⚙️ Initializing platform...");
  
  // Initialize the platform with proper storage values
  await adminFacetInterface.initialize(deployer.address, await mockStablecoin.getAddress(), ethers.parseUnits("2500", 2));
  console.log("✅ Platform initialized");

  // Global token price is already set in initialize (2,500 Naira per token)
  console.log("✅ Global token price set to 2,500 Naira");

  // Investment limits are already set in initialize
  console.log("✅ Investment limits set");



  // Mint some Naira to deployer for testing
  await mockStablecoin.mint(deployer.address, ethers.parseUnits("10000000", 2));
  console.log("✅ Minted 100,000,000 Naira to deployer");

  // Create a sample property for testing
  console.log("\n🏠 Creating sample property...");
  const propertyData = {
    title: "Luxury Residential Tower - Lagos",
    description: "A premium residential development in the heart of Lagos",
    propertyType: 1, // LuxuryResidentialTowers
    propertyUse: 0, // Commercial
    developerName: "Assetrix Development Ltd",
    developerAddress: deployer.address,
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    ipfsImagesHash: "QmSampleImages123",
    ipfsMetadataHash: "QmSampleMetadata123",
    size: 2500,
    bedrooms: 4,
    bathrooms: 3,
    amountToRaise: ethers.parseUnits("2500000", 2), // 25M Naira (10,000 tokens at 2,500 Naira per token)
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

  await propertyFacetInterface.createProperty(propertyData);
  console.log("✅ Sample property created");

  // Save deployment data to file
  console.log("\n💾 Saving deployment data...");
  const deploymentData = {
    diamond: await diamond.getAddress(),
    mockStablecoin: await mockStablecoin.getAddress(),
    adminFacet: await adminFacet.getAddress(),
    investmentFacet: await investmentFacet.getAddress(),
    propertyFacet: await propertyFacet.getAddress(),
    transactionFacet: await transactionFacet.getAddress(),
    milestoneFacet: await milestoneFacet.getAddress(),
    diamondLoupeFacet: await diamondLoupeFacet.getAddress(),
    fiatPaymentFacet: await fiatPaymentFacet.getAddress(),

    deployer: deployer.address,
    backendSigner: deployer.address,
    network: "localhost",
    deployedAt: new Date().toISOString()
  };

  const fs = require("fs");
  const deploymentPath = "./deployments/deployment-local.json";
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log(`✅ Deployment data saved to ${deploymentPath}`);

  // Print deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log(`💎 Diamond Contract: ${await diamond.getAddress()}`);
  console.log(`💰 MockStablecoin: ${await mockStablecoin.getAddress()}`);
  console.log(`🔧 AdminFacet: ${await adminFacet.getAddress()}`);
  console.log(`💼 InvestmentFacet: ${await investmentFacet.getAddress()}`);
  console.log(`🏠 PropertyFacet: ${await propertyFacet.getAddress()}`);
  console.log(`💸 TransactionFacet: ${await transactionFacet.getAddress()}`);
  console.log(`📊 MilestoneFacet: ${await milestoneFacet.getAddress()}`);
  console.log(`🔍 DiamondLoupeFacet: ${await diamondLoupeFacet.getAddress()}`);
  console.log(`💳 FiatPaymentFacet: ${await fiatPaymentFacet.getAddress()}`);

  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`🔐 Backend Signer: ${deployer.address}`);
  console.log("=".repeat(60));
  console.log("\n📋 Next steps:");
  console.log("1. Run tests: npx hardhat test");
  console.log("2. Start local node: npx hardhat node");
  console.log("3. Deploy to testnet: npx hardhat run scripts/deploy.js --network sepolia");
  console.log("\n🚀 Assetrix is ready for development!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 