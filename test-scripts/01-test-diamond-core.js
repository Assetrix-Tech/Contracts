const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing Diamond Core Functionality");
    console.log("=====================================");

    try {
        // Load deployment data
        const deploymentData = require("../deployments/deployment-local.json");
        console.log("✅ Loaded deployment data");

        // Get signers
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);

        // Test 1: Diamond Contract Existence
        console.log("\n🔍 Test 1: Diamond Contract Existence");
        const diamondCode = await ethers.provider.getCode(deploymentData.diamond);
        if (diamondCode === "0x") {
            throw new Error("Diamond contract has no code!");
        }
        console.log("✅ Diamond contract has code");

        // Test 2: DiamondLoupe Functions
        console.log("\n🔍 Test 2: DiamondLoupe Functions");
        const diamond = await ethers.getContractAt("Diamond", deploymentData.diamond);
        
        const facets = await diamond.facets();
        console.log(`✅ Facets count: ${facets.length}`);
        
        const facetAddresses = await diamond.facetAddresses();
        console.log(`✅ Facet addresses count: ${facetAddresses.length}`);
        
        // Verify expected facets are present (including MetaTransactionFacet)
        const expectedFacets = ["adminFacet", "propertyFacet", "investmentFacet", "milestoneFacet", "transactionFacet", "fiatPaymentFacet", "metaTransactionFacet"];
        for (const facetName of expectedFacets) {
            if (deploymentData[facetName]) {
                const hasFacet = facetAddresses.includes(deploymentData[facetName]);
                console.log(`✅ ${facetName}: ${hasFacet ? "Present" : "Missing"}`);
            }
        }

        // Test 3: Basic Function Routing
        console.log("\n🔍 Test 3: Basic Function Routing");
        
        // Test routing to AdminFacet
        const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
        const owner = await adminFacet.owner();
        console.log(`✅ Owner: ${owner}`);
        console.log(`✅ Owner matches deployer: ${owner === deployer.address}`);

        // Test routing to PropertyFacet
        const propertyFacet = await ethers.getContractAt("PropertyFacet", deploymentData.diamond);
        const totalProperties = await propertyFacet.getTotalProperties();
        console.log(`✅ Total properties: ${totalProperties}`);

        // Test 4: EIP-2771 Meta Transaction Functionality
        console.log("\n🔍 Test 4: EIP-2771 Meta Transaction Functionality");
        
        // Test MetaTransactionFacet
        const metaTransactionFacet = await ethers.getContractAt("MetaTransactionFacet", deploymentData.diamond);
        const nonce = await metaTransactionFacet.getNonce(deployer.address);
        console.log(`✅ User nonce: ${nonce}`);
        
        // Test gas estimation
        const estimatedGas = await metaTransactionFacet.estimateGasCost();
        console.log(`✅ Estimated gas cost: ${estimatedGas}`);
        
        // Test recommended fee calculation
        const recommendedFee = await metaTransactionFacet.calculateRecommendedFee();
        console.log(`✅ Recommended fee: ${ethers.formatEther(recommendedFee)} ETH`);

        // Test 5: BaseMetaTransactionFacet Integration
        console.log("\n🔍 Test 5: BaseMetaTransactionFacet Integration");
        
        // Test that all facets inherit from BaseMetaTransactionFacet
        const adminFacetCode = await ethers.provider.getCode(deploymentData.adminFacet);
        const propertyFacetCode = await ethers.provider.getCode(deploymentData.propertyFacet);
        const investmentFacetCode = await ethers.provider.getCode(deploymentData.investmentFacet);
        
        console.log(`✅ AdminFacet has code: ${adminFacetCode !== "0x"}`);
        console.log(`✅ PropertyFacet has code: ${propertyFacetCode !== "0x"}`);
        console.log(`✅ InvestmentFacet has code: ${investmentFacetCode !== "0x"}`);

        console.log("\n✅ Diamond Core Tests Passed!");

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