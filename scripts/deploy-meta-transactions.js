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
        "executeMetaTransaction(address,bytes,bytes32,bytes32,uint8,uint256)",
        "executeMetaTransactionWithStablecoinFee(address,bytes,bytes32,bytes32,uint8,uint256)",
        "getNonce(address)",
        "msgSender()",
        "_msgSender()",
        "estimateGasCost()",
        "calculateRecommendedFee()"
    ].map(sig => ethers.utils.id(sig).slice(0, 10));

    // Prepare facet cuts
    const facetCuts = [
        {
            facetAddress: metaTransactionFacet.address,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: metaTransactionSelectors
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
            metaTransaction: metaTransactionFacet.address
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
    console.log("\n📋 Next Steps:");
    console.log("1. All existing facets now support EIP-2771 meta transactions");
    console.log("2. No duplicate functions - single implementation per function");
    console.log("3. Users can use gasless transactions for all operations");
    console.log("4. Update frontend to support meta transactions");
    console.log("5. Implement signature generation on the backend");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
