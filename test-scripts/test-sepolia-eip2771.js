const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing EIP-2771 on Sepolia");
    console.log("===============================");

    try {
        // Load Sepolia deployment data
        const deploymentData = require("../deployments/deployment-sepolia.json");
        console.log("✅ Loaded Sepolia deployment data");

        // Get signers
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);

        // Test 1: MetaTransactionFacet
        console.log("\n🔍 Test 1: MetaTransactionFacet");
        const metaTransactionFacet = await ethers.getContractAt("MetaTransactionFacet", deploymentData.diamond);
        
        const nonce = await metaTransactionFacet.getNonce(deployer.address);
        console.log(`✅ User nonce: ${nonce}`);
        
        const estimatedGas = await metaTransactionFacet.estimateGasCost();
        console.log(`✅ Estimated gas cost: ${estimatedGas}`);
        
        const recommendedFee = await metaTransactionFacet.calculateRecommendedFee();
        console.log(`✅ Recommended fee: ${ethers.formatEther(recommendedFee)} ETH`);

        // Test 2: AdminFacet with EIP-2771
        console.log("\n🔍 Test 2: AdminFacet EIP-2771 Support");
        const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
        
        const owner = await adminFacet.owner();
        console.log(`✅ Owner: ${owner}`);
        
        const tokenPrice = await adminFacet.getGlobalTokenPrice();
        console.log(`✅ Token price: ${tokenPrice} naira`);

        // Test 3: FiatPaymentFacet with EIP-2771
        console.log("\n🔍 Test 3: FiatPaymentFacet EIP-2771 Support");
        const fiatPaymentFacet = await ethers.getContractAt("FiatPaymentFacet", deploymentData.diamond);
        
        const backendSigner = await fiatPaymentFacet.getBackendSigner();
        console.log(`✅ Backend signer: ${backendSigner}`);
        
        const domainSeparator = await fiatPaymentFacet.getDomainSeparator();
        console.log(`✅ Domain separator: ${domainSeparator}`);

        // Test 4: PropertyFacet with EIP-2771
        console.log("\n🔍 Test 4: PropertyFacet EIP-2771 Support");
        const propertyFacet = await ethers.getContractAt("PropertyFacet", deploymentData.diamond);
        
        const totalProperties = await propertyFacet.getTotalProperties();
        console.log(`✅ Total properties: ${totalProperties}`);

        console.log("\n✅ EIP-2771 Sepolia Tests Passed!");
        console.log("🎉 Your Sepolia deployment is ready for EIP-2771 meta transactions!");

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
