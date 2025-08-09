const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging Property Access Control");
    console.log("====================================");

    try {
        // Load deployment data
        const deploymentData = require("../deployments/deployment-local.json");
        console.log("✅ Loaded deployment data");

        // Get signers
        const [deployer, user1] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`👤 User1: ${user1.address}`);

        // Get AdminFacet contract to check owner
        const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
        console.log("✅ Connected to AdminFacet");

        // Check current owner
        const owner = await adminFacet.owner();
        console.log(`✅ Current owner: ${owner}`);
        console.log(`✅ Owner matches deployer: ${owner === deployer.address}`);

        // Get PropertyFacet contract
        const propertyFacet = await ethers.getContractAt("PropertyFacet", deploymentData.diamond);
        console.log("✅ Connected to PropertyFacet");

        // Check current total properties
        const totalProperties = await propertyFacet.getTotalProperties();
        console.log(`✅ Total properties: ${totalProperties}`);

        // Try to create a simple property with deployer as developer
        console.log("\n🔍 Testing property creation with deployer as developer...");
        
        const simplePropertyData = {
            title: "Test Property",
            description: "Test property for debugging",
            propertyType: 0, // ShortStay
            propertyUse: 0, // Commercial
            developerName: "Test Developer",
            developerAddress: deployer.address, // Use deployer as developer
            city: "Test City",
            state: "Test State",
            country: "Test Country",
            ipfsImagesHash: "QmTest123",
            ipfsMetadataHash: "QmTestMetadata123",
            size: 1000,
            bedrooms: 0,
            bathrooms: 0,
            amountToRaise: ethers.parseUnits("250000", 2), // 250,000 Naira (100 tokens at 2,500 Naira each)
            investmentDuration: 0, // OneMonth
            milestoneTitles: ["Test Milestone"],
            milestoneDescriptions: ["Test milestone description"],
            milestonePercentages: [100], // 100%
            roiPercentage: 15
        };

        console.log("📝 Property data prepared:");
        console.log(`   Developer Address: ${simplePropertyData.developerAddress}`);
        console.log(`   Sender (deployer): ${deployer.address}`);
        console.log(`   Owner: ${owner}`);

        // Try to create the property
        const tx = await propertyFacet.createProperty(simplePropertyData);
        const receipt = await tx.wait();
        console.log("✅ Property created successfully!");
        console.log(`   Transaction hash: ${tx.hash}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

        // Check if property count increased
        const newTotalProperties = await propertyFacet.getTotalProperties();
        console.log(`✅ New total properties: ${newTotalProperties}`);

    } catch (error) {
        console.log(`❌ Debug failed: ${error.message}`);
        console.log(`❌ Error details:`, error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 