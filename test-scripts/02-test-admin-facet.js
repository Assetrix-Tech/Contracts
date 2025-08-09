const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing AdminFacet Functionality");
    console.log("===================================");

    try {
        // Load deployment data
        const deploymentData = require("../deployments/deployment-local.json");
        console.log("✅ Loaded deployment data");

        // Get signers
        const [deployer, user1] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`👤 User1: ${user1.address}`);

        // Get AdminFacet contract
        const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
        console.log("✅ Connected to AdminFacet");

        // Test 1: Ownership Functions
        console.log("\n🔍 Test 1: Ownership Functions");
        
        const owner = await adminFacet.owner();
        console.log(`✅ Current owner: ${owner}`);
        console.log(`✅ Owner matches deployer: ${owner === deployer.address}`);

        // Test 2: Global Token Price
        console.log("\n🔍 Test 2: Global Token Price");
        
        const globalTokenPrice = await adminFacet.getGlobalTokenPrice();
        console.log(`✅ Global token price: ${ethers.formatUnits(globalTokenPrice, 2)} Naira`);

        // Test 3: Stablecoin Configuration
        console.log("\n🔍 Test 3: Stablecoin Configuration");
        
        const stablecoinAddress = await adminFacet.getStablecoin();
        console.log(`✅ Stablecoin address: ${stablecoinAddress}`);
        console.log(`✅ Matches deployment: ${stablecoinAddress === deploymentData.mockStablecoin}`);

        // Test 4: Access Control
        console.log("\n🔍 Test 4: Access Control");
        
        // Test that non-owner cannot call admin functions
        try {
            await adminFacet.connect(user1).setGlobalTokenPrice(ethers.parseUnits("2000", 2));
            console.log("❌ Non-owner was able to set global token price (should fail)");
        } catch (error) {
            console.log("✅ Non-owner cannot set global token price (expected)");
        }

        // Test 5: Admin Functions (Owner Only)
        console.log("\n🔍 Test 5: Admin Functions (Owner Only)");
        
        const newTokenPrice = ethers.parseUnits("1500", 2);
        await adminFacet.setGlobalTokenPrice(newTokenPrice);
        console.log("✅ Owner set new global token price");
        
        const updatedPrice = await adminFacet.getGlobalTokenPrice();
        console.log(`✅ Updated token price: ${ethers.formatUnits(updatedPrice, 2)} Naira`);
        console.log(`✅ Price updated correctly: ${updatedPrice === newTokenPrice}`);


        // Test 6: Transfer Ownership
        console.log("\n🔍 Test 6: Transfer Ownership");
        
        await adminFacet.transferOwnership(user1.address);
        console.log("✅ Ownership transferred to user1");
        
        const newOwner = await adminFacet.owner();
        console.log(`✅ New owner: ${newOwner}`);
        console.log(`✅ New owner matches user1: ${newOwner === user1.address}`);

        // Test 7: New Owner Can Call Admin Functions
        console.log("\n🔍 Test 7: New Owner Can Call Admin Functions");
        
        const newPrice = ethers.parseUnits("2500", 2);
        await adminFacet.connect(user1).setGlobalTokenPrice(newPrice);
        console.log("✅ New owner set global token price");
        
        const finalPrice = await adminFacet.getGlobalTokenPrice();
        console.log(`✅ Final token price: ${ethers.formatUnits(finalPrice, 2)} Naira`);

        console.log("\n✅ AdminFacet Tests Passed!");

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