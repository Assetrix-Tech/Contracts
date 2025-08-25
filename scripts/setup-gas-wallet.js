const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🔧 Setting up Gas Wallet for Backend");
    console.log("====================================");

    try {
        // Get current network
        const network = await ethers.provider.getNetwork();
        const networkName = network.name === 'unknown' ? 'localhost' : network.name;
        console.log(`🌐 Network: ${networkName}`);

        // Create a new wallet for gas payments
        console.log("\n🔑 Creating gas wallet...");
        const gasWallet = ethers.Wallet.createRandom();
        
        console.log(`✅ Gas wallet created:`);
        console.log(`   Address: ${gasWallet.address}`);
        console.log(`   Private Key: ${gasWallet.privateKey}`);
        console.log(`   Mnemonic: ${gasWallet.mnemonic.phrase}`);

        // Load deployment data
        const deploymentPath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`);
        let deploymentData = {};
        
        if (fs.existsSync(deploymentPath)) {
            deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
            console.log(`✅ Loaded ${networkName} deployment data`);
        }

        // Update deployment data with gas wallet
        deploymentData.gasWallet = gasWallet.address;
        deploymentData.gasWalletSetAt = new Date().toISOString();
        deploymentData.gasWalletType = "generated";

        // Save updated deployment data
        fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
        console.log(`✅ Updated deployment file with gas wallet`);

        // Fund the gas wallet (if on localhost)
        if (networkName === 'localhost') {
            console.log("\n💰 Funding gas wallet on localhost...");
            const [deployer] = await ethers.getSigners();
            
            const fundTx = await deployer.sendTransaction({
                to: gasWallet.address,
                value: ethers.parseEther("10.0") // 10 ETH for testing
            });
            await fundTx.wait();
            console.log(`✅ Funded gas wallet with 10 ETH`);
        } else {
            console.log("\n💰 Gas wallet funding required:");
            console.log(`   Network: ${networkName}`);
            console.log(`   Address: ${gasWallet.address}`);
            console.log(`   Amount needed: ~1 ETH for gas fees`);
            console.log(`   Get test ETH from: https://sepoliafaucet.com/`);
        }

        // Test the gas wallet
        console.log("\n🧪 Testing gas wallet...");
        const gasWalletProvider = gasWallet.connect(ethers.provider);
        const balance = await gasWalletProvider.getBalance();
        console.log(`✅ Gas wallet balance: ${ethers.formatEther(balance)} ETH`);

        // Test connection to diamond
        if (deploymentData.diamond) {
            console.log("\n🔗 Testing connection to diamond...");
            const metaTransactionFacet = await ethers.getContractAt("MetaTransactionFacet", deploymentData.diamond);
            const estimatedGas = await metaTransactionFacet.connect(gasWalletProvider).estimateGasCost();
            console.log(`✅ Gas estimation works: ${estimatedGas} gas`);
        }

        console.log("\n🎉 Gas wallet setup complete!");
        console.log("====================================");
        console.log(`📋 Gas Wallet: ${gasWallet.address}`);
        console.log(`📋 Backend Signer: ${deploymentData.backendSigner || 'Not set'}`);
        console.log(`📋 Network: ${networkName}`);
        console.log(`📋 Diamond: ${deploymentData.diamond || 'Not deployed'}`);

        console.log("\n🔐 IMPORTANT: Save these securely:");
        console.log(`   Private Key: ${gasWallet.privateKey}`);
        console.log(`   Mnemonic: ${gasWallet.mnemonic.phrase}`);

        console.log("\n📋 Next Steps:");
        console.log("1. Fund the gas wallet with ETH for gas fees");
        console.log("2. Use gas wallet for meta transaction execution");
        console.log("3. Monitor gas wallet balance and refill when needed");

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
