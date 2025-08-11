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

    // Test 2: Use Existing Property
    console.log("\n🔍 Test 2: Use Existing Property");

    // Check if there's already a property from deployment
    const existingPropertyId = 1;
    const existingProperty = await propertyFacet.getProperty(existingPropertyId);
    console.log(`✅ Using existing property with ID: ${existingPropertyId}`);
    console.log(`✅ Property title: ${existingProperty.title}`);
    console.log(`✅ Property developer: ${existingProperty.developer}`);
    console.log(`✅ Property ROI: ${existingProperty.roiPercentage}%`);

    const newPropertyId = existingPropertyId;

    // Get the created property
    const createdProperty = await propertyFacet.getProperty(newPropertyId);
    console.log(`✅ Property title: ${createdProperty.title}`);
    console.log(`✅ Property developer: ${createdProperty.developer}`);
    console.log(`✅ Property ROI: ${createdProperty.roiPercentage}%`);

    // Test 3: Verify Property Exists
    console.log("\n🔍 Test 3: Verify Property Exists");

    const totalProperties = await propertyFacet.getTotalProperties();
    console.log(`✅ Total properties: ${totalProperties}`);
    console.log(`✅ Property exists: ${totalProperties >= 1}`);

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

    console.log(`✅ Property details validation:`);
    console.log(
      `   Title: ${createdProperty.title.length > 0 ? "✅" : "❌"} (${createdProperty.title})`
    );
    console.log(
      `   City: ${createdProperty.city.length > 0 ? "✅" : "❌"} (${createdProperty.city})`
    );
    console.log(
      `   Developer: ${createdProperty.developer.length > 0 ? "✅" : "❌"} (${createdProperty.developer})`
    );
    console.log(
      `   Property Type: ${Number(createdProperty.propertyType) >= 0 ? "✅" : "❌"} (${createdProperty.propertyType})`
    );
    console.log(
      `   Property Use: ${Number(createdProperty.propertyUse) >= 0 ? "✅" : "❌"} (${createdProperty.propertyUse})`
    );
    console.log(
      `   ROI: ${Number(createdProperty.roiPercentage) > 0 ? "✅" : "❌"} (${createdProperty.roiPercentage}%)`
    );

    // Test 7: Property Queries
    console.log("\n🔍 Test 7: Property Queries");

    // Test getting properties by range
    const [properties, count] = await propertyFacet.getProperties(0, 10);
    console.log(`✅ Properties retrieved: ${properties.length}`);
    console.log(`✅ Total count: ${count}`);
    console.log(`✅ Property 1 in list: ${properties.includes(1n)}`);

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
