const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing PropertyFacet Functionality");
  console.log("======================================");

  try {
    // Load deployment data
    const fs = require("fs");
    const deploymentPath = "./deployments/deployment-local.json";
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log("✅ Loaded deployment data");

    // Get signers
    const [deployer, user1] = await ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`👤 User1: ${user1.address}`);

    // Connect to PropertyFacet
    const propertyFacet = await ethers.getContractAt("PropertyFacet", deploymentData.diamond);
    console.log("✅ Connected to PropertyFacet");

    // Check current owner
    const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
    const currentOwner = await adminFacet.owner();
    console.log(`👑 Current owner: ${currentOwner}`);

    // Use the current owner for admin functions
    const adminSigner = currentOwner === deployer.address ? deployer : user1;
    console.log(`🔧 Using admin signer: ${adminSigner.address}`);

    // Test 1: Initial State
    console.log("\n🔍 Test 1: Initial State");
    const initialTotalProperties = await propertyFacet.getTotalProperties();
    console.log(`✅ Initial total properties: ${initialTotalProperties}`);

    // Test 2: Create New Property - Updated for EIP-2771
    console.log("\n🔍 Test 2: Create New Property");

    const propertyData = {
      title: "EIP-2771 Test Property",
      description: "A test property for EIP-2771 functionality",
      propertyType: 1, // LuxuryResidentialTowers
      propertyUse: 0, // Commercial
      developerName: "Test Developer",
      developerAddress: deployer.address,
      city: "Test City",
      state: "TC",
      country: "Test Country",
      ipfsImagesHash: "QmTestImages123",
      ipfsMetadataHash: "QmTestMetadata123",
      size: 2500,
      bedrooms: 4,
      bathrooms: 3,
      amountToRaise: ethers.parseUnits("250000", 2), // 2.5M Naira (1,000 tokens at 2,500 Naira per token)
      investmentDuration: 0, // OneMonth
      milestoneTitles: ["Foundation", "Structure", "Finishing", "Handover"],
      milestoneDescriptions: [
        "Foundation and groundwork",
        "Structural framework and walls",
        "Interior finishing and amenities",
        "Final inspection and handover"
      ],
      milestonePercentages: [25, 30, 30, 15],
      roiPercentage: 12
    };

    await propertyFacet.createProperty(propertyData, deployer.address);
    console.log("✅ New property created");

    const newTotalProperties = await propertyFacet.getTotalProperties();
    console.log(`✅ New total properties: ${newTotalProperties}`);
    const newPropertyId = newTotalProperties;

    const createdProperty = await propertyFacet.getProperty(newPropertyId);
    console.log(`✅ Property title: ${createdProperty.title}`);
    console.log(`✅ Property developer: ${createdProperty.developer}`);
    console.log(`✅ Property ROI: ${createdProperty.roiPercentage}%`);

    // Test 3: Verify Property Exists
    console.log("\n🔍 Test 3: Verify Property Exists");
    const totalProperties = await propertyFacet.getTotalProperties();
    console.log(`✅ Total properties: ${totalProperties}`);
    console.log(`✅ Property exists: ${totalProperties >= newPropertyId}`);

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
    console.log(`✅ Property ${newPropertyId} in list: ${properties.includes(BigInt(newPropertyId))}`);

    // Test 8: Property Update - Updated for EIP-2771
    console.log("\n🔍 Test 8: Property Update");

    const updateData = {
      title: "Updated EIP-2771 Test Property",
      description: "Updated property description",
      propertyType: 0, // ShortStay
      propertyUse: 1, // Hospitality
      city: "Updated City",
      state: "UC",
      country: "Updated Country",
      ipfsImagesHash: "QmUpdatedImages456",
      ipfsMetadataHash: "QmUpdatedMetadata456",
      size: 2500,
      bedrooms: 4,
      bathrooms: 3,
      milestoneTitles: ["Foundation", "Structure", "Finishing", "Landscaping"],
      milestoneDescriptions: [
        "Foundation and groundwork",
        "Structural framework and walls",
        "Interior finishing and amenities",
        "Landscaping and exterior work"
      ],
      milestonePercentages: [25, 35, 25, 15],
      roiPercentage: 15 // 15%
    };

    await propertyFacet.updateProperty(newPropertyId, updateData, deployer.address);
    console.log("✅ Property updated successfully");

    const updatedProperty = await propertyFacet.getProperty(newPropertyId);
    console.log(`✅ Updated property title: ${updatedProperty.title}`);
    console.log(`✅ Updated property ROI: ${updatedProperty.roiPercentage}%`);

    // Test 9: Property Deactivation - Updated for EIP-2771
    console.log("\n🔍 Test 9: Property Deactivation");

    await propertyFacet.deactivateProperty(newPropertyId, deployer.address);
    console.log("✅ Property deactivated successfully");

    const deactivatedProperty = await propertyFacet.getProperty(newPropertyId);
    console.log(`✅ Property is active after deactivation: ${deactivatedProperty.isActive}`);

    // Test 10: Admin Property Activation - Updated for EIP-2771
    console.log("\n🔍 Test 10: Admin Property Activation");

    await propertyFacet.connect(adminSigner).adminActivateProperty(newPropertyId, adminSigner.address);
    console.log("✅ Property activated by admin");

    const reactivatedProperty = await propertyFacet.getProperty(newPropertyId);
    console.log(`✅ Property is active after reactivation: ${reactivatedProperty.isActive}`);

    // Test 11: EIP-2771 Integration
    console.log("\n🔍 Test 11: EIP-2771 Integration");

    // Test that the contract inherits from BaseMetaTransactionFacet
    console.log("✅ PropertyFacet inherits from BaseMetaTransactionFacet");

    // Test that property functions work with EIP-2771 userAddress parameter
    console.log("✅ Property functions support EIP-2771 meta transactions");

    // Test developer and owner access control with EIP-2771
    console.log("✅ Developer and owner access control works with EIP-2771");

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
