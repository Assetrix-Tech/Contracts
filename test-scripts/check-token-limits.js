const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Checking Token Limits");
    console.log("=========================");

    try {
        // Load deployment data
        const deploymentData = require("../deployments/deployment-local.json");
        console.log("✅ Loaded deployment data");

        // Get signers
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);

        // Get admin facet
        const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
        console.log("✅ Connected to AdminFacet");

        // Check token limits
        const minTokensPerProperty = await adminFacet.getMinTokensPerProperty();
        const maxTokensPerProperty = await adminFacet.getMaxTokensPerProperty();
        const globalTokenPrice = await adminFacet.getGlobalTokenPrice();

        console.log(`✅ Min tokens per property: ${minTokensPerProperty.toString()}`);
        console.log(`✅ Max tokens per property: ${maxTokensPerProperty.toString()}`);
        console.log(`✅ Global token price: ${ethers.formatUnits(globalTokenPrice, 2)} Naira`);

        // Calculate what amount would be valid
        const minAmount = minTokensPerProperty * globalTokenPrice;
        const maxAmount = maxTokensPerProperty * globalTokenPrice;

        console.log(`✅ Min amount to raise: ${ethers.formatUnits(minAmount, 2)} Naira`);
        console.log(`✅ Max amount to raise: ${ethers.formatUnits(maxAmount, 2)} Naira`);

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 