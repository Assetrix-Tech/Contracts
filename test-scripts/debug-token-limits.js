const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Debugging Token Limits and Global Token Price");
    console.log("=================================================");

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

        // Check current owner
        const owner = await adminFacet.owner();
        console.log(`✅ Current owner: ${owner}`);

        // Check global token price
        const globalTokenPrice = await adminFacet.getGlobalTokenPrice();
        console.log(`✅ Global token price: ${globalTokenPrice.toString()}`);
        console.log(`✅ Global token price (ETH): ${ethers.formatEther(globalTokenPrice)} ETH`);

        // Check token limits
        const minTokensPerProperty = await adminFacet.getMinTokensPerProperty();
        const maxTokensPerProperty = await adminFacet.getMaxTokensPerProperty();
        console.log(`✅ Min tokens per property: ${minTokensPerProperty.toString()}`);
        console.log(`✅ Max tokens per property: ${maxTokensPerProperty.toString()}`);

        // Test calculation
        const testAmountToRaise = ethers.parseEther("1000000"); // 1M ETH
        console.log(`\n🧮 Test calculation:`);
        console.log(`   Amount to raise: ${testAmountToRaise.toString()}`);
        console.log(`   Global token price: ${globalTokenPrice.toString()}`);
        
        const calculatedTokens = testAmountToRaise / globalTokenPrice;
        console.log(`   Calculated tokens: ${calculatedTokens.toString()}`);
        console.log(`   Calculated tokens (BigInt): ${calculatedTokens.toString()}`);
        
        // Check if within bounds
        const withinBounds = calculatedTokens >= minTokensPerProperty && calculatedTokens <= maxTokensPerProperty;
        console.log(`   Within bounds (${minTokensPerProperty} to ${maxTokensPerProperty}): ${withinBounds ? "✅" : "❌"}`);

        // Try with different amounts
        console.log(`\n🧮 Testing different amounts:`);
        const testAmounts = [
            ethers.parseEther("100000"),   // 100K ETH
            ethers.parseEther("500000"),   // 500K ETH
            ethers.parseEther("1000000"),  // 1M ETH
            ethers.parseEther("2000000")   // 2M ETH
        ];

        for (const amount of testAmounts) {
            const tokens = amount / globalTokenPrice;
            const within = tokens >= minTokensPerProperty && tokens <= maxTokensPerProperty;
            console.log(`   ${ethers.formatEther(amount)} ETH → ${tokens.toString()} tokens: ${within ? "✅" : "❌"}`);
        }

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