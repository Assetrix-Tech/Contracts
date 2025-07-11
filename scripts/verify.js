const { run, ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  let proxyAddress = process.env.PROXY_ADDRESS;
  let implementationAddress = process.env.IMPLEMENTATION_ADDRESS;
  
  // If not in env, try to get from deployment file
  if (!proxyAddress || !implementationAddress) {
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === 'unknown' ? 'localhost' : network.name;
    const deploymentPath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`);
    
    if (fs.existsSync(deploymentPath)) {
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath));
      proxyAddress = proxyAddress || deploymentData.proxy;
      implementationAddress = implementationAddress || deploymentData.implementation;
      console.log(`📁 Found addresses in deployment file: ${deploymentPath}`);
    } else {
      throw new Error("PROXY_ADDRESS and IMPLEMENTATION_ADDRESS must be set in .env file or deployment file must exist");
    }
  }

  console.log("Verifying contracts...");
  
  try {
    // Verify implementation contract
    console.log(`\nVerifying implementation contract at ${implementationAddress}...`);
    await run("verify:verify", {
      address: implementationAddress,
      constructorArguments: [],
    });
    console.log("✅ Implementation contract verified");
    
    // Note: The proxy contract is verified automatically by Etherscan
    console.log("\n✅ Verification completed!");
    console.log(`Proxy: ${proxyAddress}`);
    console.log(`Implementation: ${implementationAddress}`);
    
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("✅ Contract is already verified");
    } else {
      console.error("Verification failed:", error);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
