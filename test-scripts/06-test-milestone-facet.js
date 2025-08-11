const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing MilestoneFacet Functionality");
    console.log("=======================================");

    try {
        // Load deployment data
        const deploymentData = require("../deployments/deployment-local.json");
        console.log("✅ Loaded deployment data");

        // Get signers
        const [deployer, user1] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`👤 User1: ${user1.address}`);

        // Get contracts
        const milestoneFacet = await ethers.getContractAt("MilestoneFacet", deploymentData.diamond);
        const propertyFacet = await ethers.getContractAt("PropertyFacet", deploymentData.diamond);
        const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
        console.log("✅ Connected to contracts");

        // Test 1: Initial State
        console.log("\n🔍 Test 1: Initial State");
        
        // Get total properties to see if we need to create a new one
        const totalProperties = await propertyFacet.getTotalProperties();
        console.log(`✅ Total properties: ${totalProperties}`);

        // Test 2: Create Test Property (if needed)
        console.log("\n🔍 Test 2: Create Test Property");
        
        let propertyId;
        if (totalProperties == 0) {
            const propertyData = {
                title: "Milestone Test Property",
                description: "Property for milestone testing",
                city: "Test City",
                state: "TS",
                country: "Test",
                amountToRaise: ethers.parseUnits("250000", 2), // 250,000 Naira (100 tokens at 2,500 Naira each)
                developerName: "Test Developer",
                developerAddress: deployer.address,
                propertyType: 1, // Residential
                propertyUse: 1, // Residential
                ipfsImagesHash: "QmTestImages123",
                ipfsMetadataHash: "QmTestMetadata123",
                size: 1500, // 1500 sq ft
                bedrooms: 3,
                bathrooms: 2,
                investmentDuration: 24, // 24 months
                milestoneTitles: ["Foundation", "Framing", "Finishing"],
                milestoneDescriptions: ["Foundation complete", "Framing complete", "Interior finishing"],
                milestonePercentages: [30, 30, 40],
                roiPercentage: 15 // 15%
            };

            await propertyFacet.createProperty(propertyData);
            propertyId = await propertyFacet.getTotalProperties();
            console.log(`✅ Test property created with ID: ${propertyId}`);
        } else {
            propertyId = totalProperties;
            console.log(`✅ Using existing property with ID: ${propertyId}`);
        }

        // Test 3: Get Property Milestones
        console.log("\n🔍 Test 3: Get Property Milestones");
        
        let milestones;
        try {
            milestones = await milestoneFacet.getPropertyMilestones(propertyId);
            console.log(`✅ Property has ${milestones.length} milestones`);
            
            if (milestones.length > 0) {
                for (let i = 0; i < milestones.length; i++) {
                    const milestone = milestones[i];
                    console.log(`  Milestone ${i}: ${milestone.title} - ${milestone.completionPercentage}% complete`);
                }
            }
        } catch (error) {
            console.log(`❌ Error getting milestones: ${error.message}`);
        }

        // Test 4: Get Milestone Status
        console.log("\n🔍 Test 4: Get Milestone Status");
        
        try {
            if (milestones && milestones.length > 0) {
                const milestoneStatus = await milestoneFacet.getMilestoneStatus(propertyId, 0);
                console.log(`✅ First milestone status: ${milestoneStatus}`);
            } else {
                console.log("⚠️ No milestones to check status for");
            }
        } catch (error) {
            console.log(`❌ Error getting milestone status: ${error.message}`);
        }

        // Test 5: Get Milestone Dashboard
        console.log("\n🔍 Test 5: Get Milestone Dashboard");
        
        try {
            const dashboard = await milestoneFacet.getMilestoneDashboard(propertyId);
            console.log(`✅ Dashboard retrieved for property ${propertyId}`);
            console.log(`  Total milestones: ${dashboard.totalMilestones}`);
            console.log(`  Completed milestones: ${dashboard.completedMilestones}`);
            console.log(`  Pending milestones: ${dashboard.pendingMilestones}`);
        } catch (error) {
            console.log(`❌ Error getting dashboard: ${error.message}`);
        }

        // Test 6: Test Milestone Functions (if property is fully funded)
        console.log("\n🔍 Test 6: Test Milestone Functions");
        
        try {
            const property = await propertyFacet.getProperty(propertyId);
            console.log(`✅ Property status: Active=${property.isActive}, FullyFunded=${property.isFullyFunded}`);
            
            if (property.isFullyFunded) {
                console.log("✅ Property is fully funded, testing milestone functions...");
                
                // Test requesting funds for first milestone
                try {
                    await milestoneFacet.requestMilestoneFunds(propertyId, 0);
                    console.log("✅ Successfully requested funds for first milestone");
                } catch (error) {
                    console.log(`❌ Error requesting funds: ${error.message}`);
                }
            } else {
                console.log("⚠️ Property not fully funded, skipping milestone function tests");
            }
        } catch (error) {
            console.log(`❌ Error checking property status: ${error.message}`);
        }

        console.log("\n✅ MilestoneFacet testing completed!");

    } catch (error) {
        console.error("❌ Test failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 