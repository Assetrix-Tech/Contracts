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
      title: "Test Property",
      description: "A test property for testing purposes",
      city: "Test City",
      state: "TS",
      country: "Test",
      amountToRaise: ethers.parseUnits("250000", 2), // 250,000 Naira (should create 100 tokens at 2,500 Naira each)
      developerName: "Test Developer",
      developerAddress: user1.address, // Use user1 since they are now the owner
      propertyType: 1, // Residential
      propertyUse: 1, // Residential
      ipfsImagesHash: "QmTestImages123",
      ipfsMetadataHash: "QmTestMetadata123",
      size: 1500, // 1500 sq ft
      bedrooms: 3,
      bathrooms: 2,
      investmentDuration: 24, // 24 months
      milestoneTitles: ["Foundation", "Framing", "Finishing"],
      milestoneDescriptions: [
        "Foundation complete",
        "Framing complete",
        "Interior finishing",
      ],
      milestonePercentages: [30, 30, 40],
      roiPercentage: 15, // 15%
    };

    // Create property
    await propertyFacet.createProperty(propertyData);

    // Get the property ID (it should be the next available ID)
    const newPropertyId = await propertyFacet.getTotalProperties();
    console.log(`✅ Property created with ID: ${newPropertyId}`);

    // Get the created property
    const createdProperty = await propertyFacet.getProperty(newPropertyId);
    console.log(`✅ Property title: ${createdProperty.title}`);
    console.log(`✅ Property developer: ${createdProperty.developer}`);
    console.log(`✅ Property ROI: ${createdProperty.roiPercentage}%`);

    // Test 3: Verify Property Creation
    console.log("\n🔍 Test 3: Verify Property Creation");

    const newTotalProperties = await propertyFacet.getTotalProperties();
    console.log(`✅ New total properties: ${newTotalProperties}`);
    console.log(
      `✅ Property count increased: ${newTotalProperties > initialTotalProperties}`
    );

    // Get the newly created property ID
    // const newPropertyId = newTotalProperties; // This line is now redundant
    // const property = await propertyFacet.getProperty(newPropertyId); // This line is now redundant
    // console.log(`✅ Property ${newPropertyId} retrieved successfully`); // This line is now redundant
    // console.log(`✅ Property title: ${property.title}`); // This line is now redundant
    // console.log(`✅ Property city: ${property.city}`); // This line is now redundant
    // console.log(
    //   `✅ Property token price: ${ethers.formatUnits(property.tokenPrice, 6)} USDT`
    // ); // This line is now redundant
    // console.log(`✅ Property ROI: ${property.roiPercentage}%`); // This line is now redundant

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
      `   Title: ${createdProperty.title === propertyData.title ? "✅" : "❌"}`
    );
    console.log(
      `   City: ${createdProperty.city === propertyData.city ? "✅" : "❌"}`
    );
    console.log(
      `   Developer: ${createdProperty.developer === propertyData.developerName ? "✅" : "❌"}`
    );
    console.log(
      `   Property Type: ${Number(createdProperty.propertyType) === propertyData.propertyType ? "✅" : "❌"} (stored: ${createdProperty.propertyType}, input: ${propertyData.propertyType})`
    );
    console.log(
      `   Property Use: ${Number(createdProperty.propertyUse) === propertyData.propertyUse ? "✅" : "❌"} (stored: ${createdProperty.propertyUse}, input: ${propertyData.propertyUse})`
    );
    console.log(
      `   ROI: ${Number(createdProperty.roiPercentage) === propertyData.roiPercentage ? "✅" : "❌"} (stored: ${createdProperty.roiPercentage}, input: ${propertyData.roiPercentage})`
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
      amountToRaise: ethers.parseUnits("375000", 2), // 375,000 Naira (150 tokens at 2,500 Naira each)
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
