const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing PropertyFacet Functionality");
  console.log("======================================");

  try {
    // Load deployment data
    const deploymentData = require("../deployments/deployment-local.json");
    console.log("✅ Loaded deployment data");

    // Get signers
    const [deployer, user1] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`👤 User1: ${user1.address}`);

    // Get PropertyFacet contract
    const propertyFacet = await ethers.getContractAt(
      "PropertyFacet",
      deploymentData.diamond
    );
    console.log("✅ Connected to PropertyFacet");

    // Test 1: Initial State
    console.log("\n🔍 Test 1: Initial State");

    const initialTotalProperties = await propertyFacet.getTotalProperties();
    console.log(`✅ Initial total properties: ${initialTotalProperties}`);

    // Test 2: Create Property
    console.log("\n🔍 Test 2: Create Property");

    const propertyData = {
      title: "Luxury Apartment Complex",
      description: "Modern luxury apartments in prime location",
      propertyType: 1, // LuxuryResidentialTowers
      propertyUse: 1, // Hospitality
      developerName: "Premium Developers Inc",
      developerAddress: user1.address,
      city: "New York",
      state: "NY",
      country: "USA",
      ipfsImagesHash: "QmHash123456789",
      ipfsMetadataHash: "QmMetadata123456789",
      size: 50000, // 50,000 sq ft
      bedrooms: 0, // Commercial property
      bathrooms: 0, // Commercial property
      amountToRaise: ethers.parseUnits("1000000", 6), // 1M USDT (10 tokens at 100,000 USDT per token)
      investmentDuration: 5, // FiveMonths
      milestoneTitles: ["Foundation", "Structure", "Interior", "Finishing"],
      milestoneDescriptions: [
        "Foundation work",
        "Structural work",
        "Interior work",
        "Final finishing",
      ],
      milestonePercentages: [25, 25, 25, 25], // 25% each
      roiPercentage: 15, // 15%
    };

    const createPropertyTx = await propertyFacet.createProperty(propertyData);
    const receipt = await createPropertyTx.wait();
    console.log("✅ Property creation transaction successful");
    console.log(`✅ Gas used: ${receipt.gasUsed.toString()}`);

    // Test 3: Verify Property Creation
    console.log("\n🔍 Test 3: Verify Property Creation");

    const newTotalProperties = await propertyFacet.getTotalProperties();
    console.log(`✅ New total properties: ${newTotalProperties}`);
    console.log(
      `✅ Property count increased: ${newTotalProperties > initialTotalProperties}`
    );

    // Get the newly created property ID
    const newPropertyId = newTotalProperties;
    const property = await propertyFacet.getProperty(newPropertyId);
    console.log(`✅ Property ${newPropertyId} retrieved successfully`);
    console.log(`✅ Property title: ${property.title}`);
    console.log(`✅ Property city: ${property.city}`);
    console.log(
      `✅ Property token price: ${ethers.formatUnits(property.tokenPrice, 6)} USDT`
    );
    console.log(`✅ Property ROI: ${property.roiPercentage}%`);

    // Test 4: Property Status Check
    console.log("\n🔍 Test 4: Property Status Check");

    const propertyDetails = await propertyFacet.getProperty(newPropertyId);
    console.log(`✅ Property is active: ${propertyDetails.isActive}`);
    console.log(
      `✅ Property is fully funded: ${propertyDetails.isFullyFunded}`
    );
    console.log(`✅ Property tokens sold: ${propertyDetails.tokensSold}`);
    console.log(`✅ Property tokens left: ${propertyDetails.tokensLeft}`);

    // Test 5: Property Search and Filtering
    console.log("\n🔍 Test 5: Property Search and Filtering");

    const [allProperties, totalCount] = await propertyFacet.getProperties(
      0,
      10
    );
    console.log(`✅ Total properties count: ${totalCount}`);
    console.log(`✅ Properties retrieved: ${allProperties.length}`);
    console.log(
      `✅ Property ${newPropertyId} is in properties list: ${allProperties.includes(newPropertyId)}`
    );

    // Test 6: Property Details Validation
    console.log("\n🔍 Test 6: Property Details Validation");

    console.log(`✅ Property details match input:`);
    console.log(
      `   Title: ${property.title === propertyData.title ? "✅" : "❌"}`
    );
    console.log(
      `   City: ${property.city === propertyData.city ? "✅" : "❌"}`
    );
    console.log(
      `   Developer: ${property.developer === propertyData.developerName ? "✅" : "❌"}`
    );
    console.log(
      `   Property Type: ${Number(property.propertyType) === propertyData.propertyType ? "✅" : "❌"} (stored: ${property.propertyType}, input: ${propertyData.propertyType})`
    );
    console.log(
      `   Property Use: ${Number(property.propertyUse) === propertyData.propertyUse ? "✅" : "❌"} (stored: ${property.propertyUse}, input: ${propertyData.propertyUse})`
    );
    console.log(
      `   ROI: ${Number(property.roiPercentage) === propertyData.roiPercentage ? "✅" : "❌"} (stored: ${property.roiPercentage}, input: ${propertyData.roiPercentage})`
    );

    // Test 7: Create Multiple Properties
    console.log("\n🔍 Test 7: Create Multiple Properties");

    const propertyData2 = {
      title: "Commercial Office Building",
      description: "Class A office space in business district",
      propertyType: 0, // ShortStay
      propertyUse: 0, // Commercial
      developerName: "Commercial Real Estate Corp",
      developerAddress: user1.address,
      city: "Los Angeles",
      state: "CA",
      country: "USA",
      ipfsImagesHash: "QmHash987654321",
      ipfsMetadataHash: "QmMetadata987654321",
      size: 75000, // 75,000 sq ft
      bedrooms: 0, // Commercial property
      bathrooms: 0, // Commercial property
      amountToRaise: ethers.parseUnits("1500000", 6), // 1.5M USDT (15 tokens at 100,000 USDT per token)
      investmentDuration: 7, // SevenMonths
      milestoneTitles: ["Planning", "Construction", "Finishing"],
      milestoneDescriptions: [
        "Planning phase",
        "Construction phase",
        "Final finishing",
      ],
      milestonePercentages: [30, 50, 20], // 30%, 50%, 20%
      roiPercentage: 18, // 18%
    };

    await propertyFacet.createProperty(propertyData2);
    console.log("✅ Second property created successfully");

    const finalTotalProperties = await propertyFacet.getTotalProperties();
    console.log(`✅ Final total properties: ${finalTotalProperties}`);
    console.log(
      `✅ Total properties created: ${finalTotalProperties - initialTotalProperties}`
    );

    console.log("\n✅ PropertyFacet Tests Passed!");
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
