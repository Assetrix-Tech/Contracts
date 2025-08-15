const { ethers } = require("hardhat");
const path = require('path');

async function main() {
    console.log("🔧 Setting Backend Signer for FiatPaymentFacet");
    console.log("==============================================");

    try {
        // Get current network
        const network = await ethers.provider.getNetwork();
        const networkName = network.name === 'unknown' ? 'localhost' : network.name;
        console.log(`🌐 Network: ${networkName}`);

        // Load deployment data based on network
        let deploymentData;
        try {
            const deploymentPath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`);
            deploymentData = require(deploymentPath);
            console.log(`✅ Loaded ${networkName} deployment data`);
        } catch (error) {
            console.log(`❌ No deployment data found for ${networkName}`);
            console.log(`💡 Deploy contracts first: npx hardhat run scripts/deploy.js --network ${networkName}`);
            process.exit(1);
        }

        // Get signers
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer (Owner): ${deployer.address}`);

        // Get AdminFacet contract for backend signer management
        const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
        console.log("✅ Connected to AdminFacet");

        // Check if platform is initialized
        const currentOwner = await adminFacet.owner();
        console.log(`📋 Current owner: ${currentOwner}`);

        if (currentOwner === ethers.ZeroAddress) {
            console.log("⚠️ Platform not initialized");
            console.log("💡 Run verification first: npx hardhat run scripts/verify.js --network sepolia");
            console.log("💡 This will initialize the platform automatically");
            process.exit(1);
        } else {
            console.log("✅ Platform already initialized");
        }

        // Check current backend signer
        const currentBackendSigner = await adminFacet.getBackendSigner();
        console.log(`📋 Current backend signer: ${currentBackendSigner}`);

        if (currentBackendSigner === ethers.ZeroAddress) {
            console.log("⚠️  No backend signer set");
        } else {
            console.log("✅ Backend signer already set");
        }

        // Get backend signer address from environment or create one
        let backendSignerAddress;
        let isHardwareWallet = false;
        
        if (process.env.BACKEND_SIGNER_ADDRESS) {
            backendSignerAddress = process.env.BACKEND_SIGNER_ADDRESS;
            isHardwareWallet = true;
            console.log(`🔑 Using wallet from environment: ${backendSignerAddress}`);
        } else {
            // Create a new wallet
            console.log("🔧 No wallet address provided");
            console.log("💡 Creating new wallet");
            
            const backendWallet = ethers.Wallet.createRandom();
            backendSignerAddress = backendWallet.address;
            console.log(`🔑 Created wallet: ${backendSignerAddress}`);
            console.log(`🔑 Private key: ${backendWallet.privateKey}`);
            console.log("");
        }

        // Validate the address format
        if (!ethers.isAddress(backendSignerAddress)) {
            console.log("❌ Invalid wallet address format");
            console.log("💡 Please provide a valid Ethereum address");
            process.exit(1);
        }

        // Set backend signer
        console.log("\n🔧 Setting backend signer...");
        const tx = await adminFacet.setBackendSigner(backendSignerAddress);
        await tx.wait();
        console.log("✅ Backend signer set successfully!");

        // Verify the change
        const newBackendSigner = await adminFacet.getBackendSigner();
        console.log(`✅ Verified new backend signer: ${newBackendSigner}`);
        console.log(`✅ Matches expected: ${newBackendSigner === backendSignerAddress}`);

        // Initialize domain separator if not already done (using FiatPaymentFacet)
        const fiatPaymentFacet = await ethers.getContractAt("FiatPaymentFacet", deploymentData.diamond);
        const isInitialized = await fiatPaymentFacet.isDomainSeparatorInitialized();
        if (!isInitialized) {
            console.log("\n🔧 Initializing domain separator...");
            const initTx = await fiatPaymentFacet.initializeDomainSeparator();
            await initTx.wait();
            console.log("✅ Domain separator initialized!");
        } else {
            console.log("✅ Domain separator already initialized");
        }

        // Update deployment file with backend signer
        const fs = require('fs');
        const deploymentFilePath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`);
        const deployment = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf8'));
        
        deployment.backendSigner = backendSignerAddress;
        deployment.backendSignerSetAt = new Date().toISOString();
        deployment.backendSignerType = isHardwareWallet ? "external" : "generated";
        
        fs.writeFileSync(deploymentFilePath, JSON.stringify(deployment, null, 2));
        console.log(`✅ Updated deployment file`);

        console.log("\n🎉 Backend signer setup complete!");
        console.log(`📋 Backend Signer: ${backendSignerAddress}`);
        console.log(`📋 Type: ${isHardwareWallet ? "External" : "Generated"}`);

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