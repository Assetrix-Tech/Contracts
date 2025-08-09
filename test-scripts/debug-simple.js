const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Simple Property Creation Debug");
    console.log("=================================");

    try {
        // Load deployment data
        const deploymentData = require("../deployments/deployment-local.json");
        console.log("✅ Loaded deployment data");

        // Get signers
        const [deployer, user1] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`👤 User1: ${user1.address}`);

        // Get contracts
        const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
        const propertyFacet = await ethers.getContractAt("PropertyFacet", deploymentData.diamond);
        
        console.log("✅ Connected to contracts");

        // Check current state
        const owner = await adminFacet.owner();
        console.log(`✅ Current owner: ${owner}`);
        
        const globalTokenPrice = await adminFacet.getGlobalTokenPrice();
        console.log(`✅ Global token price: ${ethers.formatUnits(globalTokenPrice, 2)} Naira`);
        
        const totalProperties = await propertyFacet.getTotalProperties();
        console.log(`✅ Total properties: ${totalProperties}`);

        // Try to create a very simple property
        console.log("\n🔍 Testing Simple Property Creation...");
        
        const simplePropertyData = {
            title: "Simple Test",
            description: "Simple test property",
            city: "Test City",
            state: "TS",
            country: "Test",
            amountToRaise: ethers.parseUnits("250000", 2), // 250,000 Naira
            developerName: "Test Dev",
            developerAddress: user1.address, // Use user1 since they are the current owner
            propertyType: 1,
            propertyUse: 1,
            ipfsImagesHash: "QmTest123",
            ipfsMetadataHash: "QmTest456",
            size: 1000,
            bedrooms: 2,
            bathrooms: 1,
            investmentDuration: 7, // 7 = TwelveMonths (enum value), not 12
            milestoneTitles: ["Foundation"],
            milestoneDescriptions: ["Foundation work"],
            milestonePercentages: [90], // 90% total (changed from 95 to be safe)
            roiPercentage: 10
        };

        console.log("✅ Property data prepared");
        console.log(`   Developer: ${simplePropertyData.developerAddress}`);
        console.log(`   Caller: ${user1.address}`); // Use user1 to call the function
        console.log(`   Owner: ${owner}`);
        
        // Calculate tokens
        const expectedTokens = simplePropertyData.amountToRaise / globalTokenPrice;
        console.log(`   Expected tokens: ${expectedTokens}`);

        // Try to create property using user1 (the current owner)
        const tx = await propertyFacet.connect(user1).createProperty(simplePropertyData);
        console.log("✅ Property creation transaction sent");
        
        const receipt = await tx.wait();
        console.log(`✅ Property created successfully! Gas used: ${receipt.gasUsed}`);
        
        const newPropertyId = await propertyFacet.getTotalProperties();
        console.log(`✅ New property ID: ${newPropertyId}`);

    } catch (error) {
        console.log(`❌ Debug failed: ${error.message}`);
        if (error.data) {
            console.log(`❌ Error data: ${error.data}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 