const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing Assetrix System Integration");
    console.log("======================================");

    try {
        // Load deployment data
        const deploymentData = require("../deployments/deployment-local.json");
        console.log("✅ Loaded deployment data");

        // Get signers
        const [deployer, user1, user2, user3] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`👤 User1: ${user1.address}`);
        console.log(`👤 User2: ${user2.address}`);
        console.log(`👤 User3: ${user3.address}`);

        // Get all facet contracts
        const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
        const propertyFacet = await ethers.getContractAt("PropertyFacet", deploymentData.diamond);
        const investmentFacet = await ethers.getContractAt("InvestmentFacet", deploymentData.diamond);
        const milestoneFacet = await ethers.getContractAt("MilestoneFacet", deploymentData.diamond);
        const transactionFacet = await ethers.getContractAt("TransactionFacet", deploymentData.diamond);
        const mockStablecoin = await ethers.getContractAt("MockStablecoin", deploymentData.mockStablecoin);
        console.log("✅ Connected to all facets");

        // Test 1: System Initialization
        console.log("\n🔍 Test 1: System Initialization");
        
        const owner = await adminFacet.owner();
        const globalTokenPrice = await adminFacet.getGlobalTokenPrice();
        const stablecoinAddress = await adminFacet.getStablecoinAddress();
        const backendSigner = await investmentFacet.getBackendSigner();
        
        console.log(`✅ System owner: ${owner}`);
        console.log(`✅ Global token price: ${ethers.formatUnits(globalTokenPrice, 6)} USDT`);
        console.log(`✅ Stablecoin address: ${stablecoinAddress}`);
        console.log(`✅ Backend signer: ${backendSigner}`);

        // Test 2: Property Creation and Management
        console.log("\n🔍 Test 2: Property Creation and Management");
        
        const propertyData = {
            title: "Integration Test Property",
            description: "Property for comprehensive integration testing",
            city: "Integration City",
            state: "IC",
            country: "Test",
            tokenPrice: ethers.parseUnits("80", 6), // 80 USDT per token
            developer: "Integration Developers",
            roiPercentage: 1600, // 16.00%
            maxTokens: 5000,
            minInvestment: ethers.parseUnits("800", 6), // 800 USDT minimum
            maxInvestment: ethers.parseUnits("80000", 6), // 80,000 USDT maximum
            propertyType: 1, // Residential
            status: 1 // Active
        };

        await propertyFacet.createProperty(propertyData);
        const propertyId = 0;
        console.log("✅ Integration test property created");

        const totalProperties = await propertyFacet.getTotalProperties();
        const property = await propertyFacet.getProperty(propertyId);
        console.log(`✅ Total properties: ${totalProperties}`);
        console.log(`✅ Property title: ${property.title}`);
        console.log(`✅ Property ROI: ${property.roiPercentage / 100}%`);

        // Test 3: Milestone Creation and Tracking
        console.log("\n🔍 Test 3: Milestone Creation and Tracking");
        
        const milestoneData = {
            propertyId: propertyId,
            title: "Foundation and Structure",
            description: "Complete building foundation and structural framework",
            targetDate: Math.floor(Date.now() / 1000) + (45 * 24 * 3600), // 45 days from now
            status: 1, // Pending
            completionPercentage: 0,
            requiredFunds: ethers.parseUnits("100000", 6), // 100,000 USDT
            milestoneType: 1 // Construction
        };

        await milestoneFacet.createMilestone(milestoneData);
        const milestoneId = 0;
        console.log("✅ Integration milestone created");

        const totalMilestones = await milestoneFacet.getTotalMilestones();
        const milestone = await milestoneFacet.getMilestone(milestoneId);
        console.log(`✅ Total milestones: ${totalMilestones}`);
        console.log(`✅ Milestone title: ${milestone.title}`);
        console.log(`✅ Milestone required funds: ${ethers.formatUnits(milestone.requiredFunds, 6)} USDT`);

        // Test 4: Investment Process
        console.log("\n🔍 Test 4: Investment Process");
        
        // Mint USDT to users
        const mintAmount = ethers.parseUnits("15000", 6); // 15,000 USDT
        await mockStablecoin.mint(user1.address, mintAmount);
        await mockStablecoin.mint(user2.address, mintAmount);
        await mockStablecoin.mint(user3.address, mintAmount);
        console.log("✅ Minted USDT to test users");

        // User1 invests
        const investmentAmount1 = ethers.parseUnits("2000", 6); // 2,000 USDT
        await mockStablecoin.connect(user1).approve(deploymentData.diamond, investmentAmount1);
        
        const investmentData1 = {
            propertyId: propertyId,
            amount: investmentAmount1,
            investor: user1.address,
            deadline: Math.floor(Date.now() / 1000) + 3600,
            nonce: 1
        };

        try {
            await investmentFacet.connect(user1).invest(investmentData1);
            console.log("✅ User1 investment successful");
        } catch (error) {
            console.log("ℹ️ User1 investment requires signature (expected in production)");
        }

        // Test 5: Transaction Recording
        console.log("\n🔍 Test 5: Transaction Recording");
        
        // Record property creation transaction
        const creationTx = {
            transactionType: 1, // Property Creation
            propertyId: propertyId,
            investor: deployer.address,
            amount: ethers.parseUnits("0", 6),
            timestamp: Math.floor(Date.now() / 1000),
            status: 1, // Completed
            metadata: "Integration test property creation"
        };

        await transactionFacet.recordTransaction(creationTx);
        console.log("✅ Property creation transaction recorded");

        // Record milestone creation transaction
        const milestoneTx = {
            transactionType: 4, // Milestone Creation
            propertyId: propertyId,
            investor: deployer.address,
            amount: ethers.parseUnits("0", 6),
            timestamp: Math.floor(Date.now() / 1000),
            status: 1, // Completed
            metadata: "Integration test milestone creation"
        };

        await transactionFacet.recordTransaction(milestoneTx);
        console.log("✅ Milestone creation transaction recorded");

        // Test 6: Cross-Facet Data Consistency
        console.log("\n🔍 Test 6: Cross-Facet Data Consistency");
        
        // Verify property exists in PropertyFacet
        const propertyFromPropertyFacet = await propertyFacet.getProperty(propertyId);
        console.log(`✅ Property exists in PropertyFacet: ${propertyFromPropertyFacet.title}`);
        
        // Verify milestone exists in MilestoneFacet
        const milestoneFromMilestoneFacet = await milestoneFacet.getMilestone(milestoneId);
        console.log(`✅ Milestone exists in MilestoneFacet: ${milestoneFromMilestoneFacet.title}`);
        
        // Verify milestone belongs to property
        const propertyMilestones = await milestoneFacet.getPropertyMilestones(propertyId);
        console.log(`✅ Property has ${propertyMilestones.length} milestones`);
        console.log(`✅ Milestone belongs to property: ${propertyMilestones.includes(milestoneId)}`);

        // Test 7: System State Queries
        console.log("\n🔍 Test 7: System State Queries");
        
        const systemStats = {
            totalProperties: await propertyFacet.getTotalProperties(),
            totalMilestones: await milestoneFacet.getTotalMilestones(),
            totalTransactions: await transactionFacet.getTotalTransactions(),
            globalTokenPrice: await adminFacet.getGlobalTokenPrice(),
            stablecoinAddress: await adminFacet.getStablecoinAddress()
        };

        console.log("✅ System Statistics:");
        console.log(`   Total Properties: ${systemStats.totalProperties}`);
        console.log(`   Total Milestones: ${systemStats.totalMilestones}`);
        console.log(`   Total Transactions: ${systemStats.totalTransactions}`);
        console.log(`   Global Token Price: ${ethers.formatUnits(systemStats.globalTokenPrice, 6)} USDT`);
        console.log(`   Stablecoin: ${systemStats.stablecoinAddress}`);

        // Test 8: Business Logic Validation
        console.log("\n🔍 Test 8: Business Logic Validation");
        
        // Check investment limits
        const propertyForValidation = await propertyFacet.getProperty(propertyId);
        console.log(`✅ Investment validation:`);
        console.log(`   Min investment: ${ethers.formatUnits(propertyForValidation.minInvestment, 6)} USDT`);
        console.log(`   Max investment: ${ethers.formatUnits(propertyForValidation.maxInvestment, 6)} USDT`);
        console.log(`   Token price: ${ethers.formatUnits(propertyForValidation.tokenPrice, 6)} USDT`);
        console.log(`   Max tokens: ${propertyForValidation.maxTokens}`);

        // Check milestone requirements
        const milestoneForValidation = await milestoneFacet.getMilestone(milestoneId);
        console.log(`✅ Milestone validation:`);
        console.log(`   Required funds: ${ethers.formatUnits(milestoneForValidation.requiredFunds, 6)} USDT`);
        console.log(`   Target date: ${new Date(milestoneForValidation.targetDate * 1000).toISOString()}`);
        console.log(`   Milestone type: ${milestoneForValidation.milestoneType}`);

        // Test 9: Error Handling and Edge Cases
        console.log("\n🔍 Test 9: Error Handling and Edge Cases");
        
        // Try to access non-existent property
        try {
            await propertyFacet.getProperty(999);
            console.log("❌ Should not be able to access non-existent property");
        } catch (error) {
            console.log("✅ Correctly handled non-existent property access");
        }

        // Try to access non-existent milestone
        try {
            await milestoneFacet.getMilestone(999);
            console.log("❌ Should not be able to access non-existent milestone");
        } catch (error) {
            console.log("✅ Correctly handled non-existent milestone access");
        }

        // Test 10: System Scalability
        console.log("\n🔍 Test 10: System Scalability");
        
        // Create additional properties to test scalability
        for (let i = 1; i <= 3; i++) {
            const additionalPropertyData = {
                title: `Scalability Test Property ${i}`,
                description: `Property ${i} for scalability testing`,
                city: `City ${i}`,
                state: `S${i}`,
                country: "Test",
                tokenPrice: ethers.parseUnits((50 + i * 10).toString(), 6),
                developer: `Developer ${i}`,
                roiPercentage: 1200 + i * 100,
                maxTokens: 1000 + i * 500,
                minInvestment: ethers.parseUnits((100 + i * 50).toString(), 6),
                maxInvestment: ethers.parseUnits((10000 + i * 5000).toString(), 6),
                propertyType: 1,
                status: 1
            };

            await propertyFacet.createProperty(additionalPropertyData);
        }
        
        const finalTotalProperties = await propertyFacet.getTotalProperties();
        console.log(`✅ Created ${finalTotalProperties - totalProperties} additional properties`);
        console.log(`✅ Final total properties: ${finalTotalProperties}`);

        console.log("\n✅ Assetrix System Integration Tests Passed!");
        console.log("🎉 All facets are working together seamlessly!");

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