const { run } = require("hardhat");
require('dotenv').config();

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  const implementationAddress = process.env.IMPLEMENTATION_ADDRESS;
  
  if (!proxyAddress || !implementationAddress) {
    throw new Error("PROXY_ADDRESS and IMPLEMENTATION_ADDRESS must be set in .env file");
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
