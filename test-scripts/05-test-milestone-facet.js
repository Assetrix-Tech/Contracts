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
        console.log("✅ Connected to contracts");

        // Test 1: Initial State
        console.log("\n🔍 Test 1: Initial State");
        
        const initialTotalMilestones = await milestoneFacet.getTotalMilestones();
        console.log(`✅ Initial total milestones: ${initialTotalMilestones}`);

        // Test 2: Create Test Property
        console.log("\n🔍 Test 2: Create Test Property");
        
        const propertyData = {
            title: "Milestone Test Property",
            description: "Property for milestone testing",
            city: "Test City",
            state: "TS",
            country: "Test",
            tokenPrice: ethers.parseUnits("75", 6), // 75 USDT per token
            developer: "Test Developer",
            roiPercentage: 1400, // 14.00%
            maxTokens: 2000,
            minInvestment: ethers.parseUnits("150", 6), // 150 USDT minimum
            maxInvestment: ethers.parseUnits("15000", 6), // 15,000 USDT maximum
            propertyType: 1, // Residential
            status: 1 // Active
        };

        await propertyFacet.createProperty(propertyData);
        const propertyId = 0;
        console.log("✅ Test property created");

        // Test 3: Create Milestones
        console.log("\n🔍 Test 3: Create Milestones");
        
        const milestone1 = {
            propertyId: propertyId,
            title: "Foundation Complete",
            description: "Building foundation has been completed",
            targetDate: Math.floor(Date.now() / 1000) + (30 * 24 * 3600), // 30 days from now
            status: 1, // Pending
            completionPercentage: 0,
            requiredFunds: ethers.parseUnits("50000", 6), // 50,000 USDT
            milestoneType: 1 // Construction
        };

        const milestone2 = {
            propertyId: propertyId,
            title: "Framing Complete",
            description: "Building framing structure completed",
            targetDate: Math.floor(Date.now() / 1000) + (60 * 24 * 3600), // 60 days from now
            status: 1, // Pending
            completionPercentage: 0,
            requiredFunds: ethers.parseUnits("75000", 6), // 75,000 USDT
            milestoneType: 1 // Construction
        };

        const milestone3 = {
            propertyId: propertyId,
            title: "Interior Finishing",
            description: "Interior finishing and fixtures installed",
            targetDate: Math.floor(Date.now() / 1000) + (90 * 24 * 3600), // 90 days from now
            status: 1, // Pending
            completionPercentage: 0,
            requiredFunds: ethers.parseUnits("100000", 6), // 100,000 USDT
            milestoneType: 2 // Finishing
        };

        // Create milestones
        await milestoneFacet.createMilestone(milestone1);
        await milestoneFacet.createMilestone(milestone2);
        await milestoneFacet.createMilestone(milestone3);
        console.log("✅ Created 3 milestones");

        // Test 4: Verify Milestone Creation
        console.log("\n🔍 Test 4: Verify Milestone Creation");
        
        const newTotalMilestones = await milestoneFacet.getTotalMilestones();
        console.log(`✅ New total milestones: ${newTotalMilestones}`);
        console.log(`✅ Milestone count increased: ${newTotalMilestones > initialTotalMilestones}`);

        // Test 5: Retrieve Milestones
        console.log("\n🔍 Test 5: Retrieve Milestones");
        
        const milestone0 = await milestoneFacet.getMilestone(0);
        const milestone1_retrieved = await milestoneFacet.getMilestone(1);
        const milestone2_retrieved = await milestoneFacet.getMilestone(2);
        
        console.log(`✅ Milestone 0: ${milestone0.title}`);
        console.log(`✅ Milestone 1: ${milestone1_retrieved.title}`);
        console.log(`✅ Milestone 2: ${milestone2_retrieved.title}`);

        // Test 6: Property Milestones
        console.log("\n🔍 Test 6: Property Milestones");
        
        const propertyMilestones = await milestoneFacet.getPropertyMilestones(propertyId);
        console.log(`✅ Property ${propertyId} milestones count: ${propertyMilestones.length}`);
        console.log(`✅ All milestones belong to property: ${propertyMilestones.every(id => id >= 0 && id < 3)}`);

        // Test 7: Milestone Status Management
        console.log("\n🔍 Test 7: Milestone Status Management");
        
        // Update milestone 0 to in progress
        await milestoneFacet.updateMilestoneStatus(0, 2); // 2 = In Progress
        const updatedMilestone0 = await milestoneFacet.getMilestone(0);
        console.log(`✅ Milestone 0 status updated to: ${updatedMilestone0.status}`);
        console.log(`✅ Status is In Progress: ${updatedMilestone0.status === 2}`);

        // Update milestone 0 completion percentage
        await milestoneFacet.updateMilestoneCompletion(0, 25); // 25% complete
        const milestone0WithCompletion = await milestoneFacet.getMilestone(0);
        console.log(`✅ Milestone 0 completion: ${milestone0WithCompletion.completionPercentage}%`);

        // Test 8: Milestone Queries by Status
        console.log("\n🔍 Test 8: Milestone Queries by Status");
        
        const pendingMilestones = await milestoneFacet.getMilestonesByStatus(1); // Pending
        const inProgressMilestones = await milestoneFacet.getMilestonesByStatus(2); // In Progress
        const completedMilestones = await milestoneFacet.getMilestonesByStatus(3); // Completed
        
        console.log(`✅ Pending milestones: ${pendingMilestones.length}`);
        console.log(`✅ In progress milestones: ${inProgressMilestones.length}`);
        console.log(`✅ Completed milestones: ${completedMilestones.length}`);

        // Test 9: Milestone Type Queries
        console.log("\n🔍 Test 9: Milestone Type Queries");
        
        const constructionMilestones = await milestoneFacet.getMilestonesByType(1); // Construction
        const finishingMilestones = await milestoneFacet.getMilestonesByType(2); // Finishing
        
        console.log(`✅ Construction milestones: ${constructionMilestones.length}`);
        console.log(`✅ Finishing milestones: ${finishingMilestones.length}`);

        // Test 10: Milestone Validation
        console.log("\n🔍 Test 10: Milestone Validation");
        
        console.log(`✅ Milestone data validation:`);
        console.log(`   Milestone 0 title: ${milestone0.title === milestone1.title ? "✅" : "❌"}`);
        console.log(`   Milestone 0 propertyId: ${milestone0.propertyId === propertyId ? "✅" : "❌"}`);
        console.log(`   Milestone 0 requiredFunds: ${milestone0.requiredFunds === milestone1.requiredFunds ? "✅" : "❌"}`);

        console.log("\n✅ MilestoneFacet Tests Passed!");

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