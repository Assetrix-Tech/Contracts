const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Meta Transaction Facets...");

    // Get the signer
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Deploy MetaTransactionFacet
    console.log("📦 Deploying MetaTransactionFacet...");
    const MetaTransactionFacet = await ethers.getContractFactory("MetaTransactionFacet");
    const metaTransactionFacet = await MetaTransactionFacet.deploy();
    await metaTransactionFacet.deployed();
    console.log("✅ MetaTransactionFacet deployed to:", metaTransactionFacet.address);

    // Deploy InvestmentFacetMeta
    console.log("📦 Deploying InvestmentFacetMeta...");
    const InvestmentFacetMeta = await ethers.getContractFactory("InvestmentFacetMeta");
    const investmentFacetMeta = await InvestmentFacetMeta.deploy();
    await investmentFacetMeta.deployed();
    console.log("✅ InvestmentFacetMeta deployed to:", investmentFacetMeta.address);

    // Load existing diamond address from deployment file
    const fs = require('fs');
    const deploymentPath = './deployments/deployment-sepolia.json';
    
    if (!fs.existsSync(deploymentPath)) {
        console.error("❌ Deployment file not found. Please deploy the main diamond first.");
        return;
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    const diamondAddress = deployment.diamond;
    
    console.log("💎 Found existing diamond at:", diamondAddress);

    // Get the diamond contract
    const diamond = await ethers.getContractAt("Diamond", diamondAddress);

    // Prepare facet cuts for meta transaction facets
    const { IDiamondCut } = await ethers.getContractFactory("IDiamondCut");
    
    // Get function selectors for MetaTransactionFacet
    const metaTransactionSelectors = [
        "executeMetaTransaction(address,bytes,bytes32,bytes32,uint8)",
        "getNonce(address)",
        "msgSender()",
        "_msgSender()"
    ].map(sig => ethers.utils.id(sig).slice(0, 10));

    // Get function selectors for InvestmentFacetMeta
    const investmentMetaSelectors = [
        "purchaseTokens(uint256,uint256)",
        "requestRefund(uint256)",
        "claimPayout(uint256)"
    ].map(sig => ethers.utils.id(sig).slice(0, 10));

    // Prepare facet cuts
    const facetCuts = [
        {
            facetAddress: metaTransactionFacet.address,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: metaTransactionSelectors
        },
        {
            facetAddress: investmentFacetMeta.address,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: investmentMetaSelectors
        }
    ];

    console.log("🔧 Adding meta transaction facets to diamond...");
    
    // Execute diamond cut
    const diamondCut = await diamond.diamondCut(
        facetCuts,
        ethers.constants.AddressZero, // No init contract
        "0x" // No init data
    );

    await diamondCut.wait();
    console.log("✅ Meta transaction facets successfully added to diamond!");

    // Save deployment info
    const metaDeployment = {
        network: "sepolia",
        diamond: diamondAddress,
        facets: {
            metaTransaction: metaTransactionFacet.address,
            investmentMeta: investmentFacetMeta.address
        },
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        deploymentType: "meta-transaction-facets",
        lastUpdated: new Date().toISOString(),
        commitHash: process.env.COMMIT_HASH || "unknown",
        commitMessage: process.env.COMMIT_MESSAGE || "Meta transaction deployment"
    };

    // Save to file
    const metaDeploymentPath = './deployments/meta-transaction-deployment.json';
    fs.writeFileSync(metaDeploymentPath, JSON.stringify(metaDeployment, null, 2));
    console.log("📄 Deployment info saved to:", metaDeploymentPath);

    console.log("\n🎉 Meta Transaction Facets Deployment Complete!");
    console.log("================================================");
    console.log("Diamond Address:", diamondAddress);
    console.log("MetaTransactionFacet:", metaTransactionFacet.address);
    console.log("InvestmentFacetMeta:", investmentFacetMeta.address);
    console.log("\n📋 Next Steps:");
    console.log("1. Test meta transactions using the executeMetaTransaction function");
    console.log("2. Update frontend to support gasless transactions");
    console.log("3. Implement signature generation on the backend");
    console.log("4. Add meta transaction support to other facets as needed");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
