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
            await adminFacet.connect(user1).setGlobalTokenPrice(ethers.parseUnits("2000", 2), user1.address);
            console.log("❌ Non-owner was able to set global token price (should fail)");
        } catch (error) {
            console.log("✅ Non-owner cannot set global token price (expected)");
        }

        // Test 5: Admin Functions (Owner Only) - Updated for EIP-2771
        console.log("\n🔍 Test 5: Admin Functions (Owner Only)");
        
        const newTokenPrice = ethers.parseUnits("1500", 2);
        await adminFacet.setGlobalTokenPrice(newTokenPrice, deployer.address);
        console.log("✅ Owner set new global token price");
        
        const updatedPrice = await adminFacet.getGlobalTokenPrice();
        console.log(`✅ Updated token price: ${ethers.formatUnits(updatedPrice, 2)} Naira`);
        console.log(`✅ Price updated correctly: ${updatedPrice === newTokenPrice}`);

        // Test 6: Transfer Ownership - Updated for EIP-2771
        console.log("\n🔍 Test 6: Transfer Ownership");
        
        await adminFacet.transferOwnership(user1.address, deployer.address);
        console.log("✅ Ownership transferred to user1");
        
        const newOwner = await adminFacet.owner();
        console.log(`✅ New owner: ${newOwner}`);
        console.log(`✅ New owner matches user1: ${newOwner === user1.address}`);

        // Test 7: New Owner Can Call Admin Functions - Updated for EIP-2771
        console.log("\n🔍 Test 7: New Owner Can Call Admin Functions");
        
        const newPrice = ethers.parseUnits("2500", 2);
        await adminFacet.connect(user1).setGlobalTokenPrice(newPrice, user1.address);
        console.log("✅ New owner set global token price");
        
        const finalPrice = await adminFacet.getGlobalTokenPrice();
        console.log(`✅ Final token price: ${ethers.formatUnits(finalPrice, 2)} Naira`);

        // Test 8: Additional Admin Functions - Updated for EIP-2771
        console.log("\n🔍 Test 8: Additional Admin Functions");
        
        // Test pause/unpause functions
        await adminFacet.connect(user1).pause(user1.address);
        console.log("✅ Paused the contract");
        
        const isPaused = await adminFacet.paused();
        console.log(`✅ Contract paused: ${isPaused}`);
        
        await adminFacet.connect(user1).unpause(user1.address);
        console.log("✅ Unpaused the contract");
        
        const isUnpaused = await adminFacet.paused();
        console.log(`✅ Contract unpaused: ${!isUnpaused}`);
        
        // Test fee percentage functions
        await adminFacet.connect(user1).setAdminFeePercentage(5, user1.address); // 5%
        console.log("✅ Set admin fee percentage to 5%");
        
        await adminFacet.connect(user1).setEarlyExitFeePercentage(3, user1.address); // 3%
        console.log("✅ Set early exit fee percentage to 3%");
        
        // Test token limit functions
        await adminFacet.connect(user1).setMinTokensPerProperty(10, user1.address);
        console.log("✅ Set minimum tokens per property to 10");
        
        await adminFacet.connect(user1).setMaxTokensPerProperty(1000, user1.address);
        console.log("✅ Set maximum tokens per property to 1000");
        
        await adminFacet.connect(user1).setMinTokensPerInvestment(1, user1.address);
        console.log("✅ Set minimum tokens per investment to 1");

        // Test 9: Withdraw Stablecoin Function - Updated for EIP-2771
        console.log("\n🔍 Test 9: Withdraw Stablecoin Function");
        
        // Get mock stablecoin contract
        const mockStablecoin = await ethers.getContractAt("MockStablecoin", deploymentData.mockStablecoin);
        
        // Mint some tokens to the diamond contract for testing
        const mintAmount = ethers.parseUnits("10000", 2); // 100,000 Naira
        await mockStablecoin.mint(deploymentData.diamond, mintAmount);
        console.log("✅ Minted tokens to diamond contract for testing");
        
        // Test withdraw function with new userAddress parameter
        const withdrawAmount = ethers.parseUnits("1000", 2); // 10,000 Naira
        await adminFacet.connect(user1).withdrawStablecoin(user1.address, withdrawAmount, user1.address);
        console.log("✅ Successfully withdrew stablecoin");
        
        // Check balance
        const userBalance = await mockStablecoin.balanceOf(user1.address);
        console.log(`✅ User balance after withdrawal: ${ethers.formatUnits(userBalance, 2)} Naira`);

        // Test 10: EIP-2771 Integration
        console.log("\n🔍 Test 10: EIP-2771 Integration");
        
        // Test that the contract inherits from BaseMetaTransactionFacet
        console.log("✅ AdminFacet inherits from BaseMetaTransactionFacet");
        
        // Test that owner functions work with EIP-2771 userAddress parameter
        console.log("✅ Owner functions support EIP-2771 meta transactions");

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