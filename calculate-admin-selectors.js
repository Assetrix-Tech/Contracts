const { ethers } = require("hardhat");

async function calculateAdminSelectors() {
  console.log("Calculating function selector for getBackendSigner...\n");
  
  const functionSignature = "getBackendSigner()";
  const selector = ethers.keccak256(ethers.toUtf8Bytes(functionSignature)).slice(0, 10);
  console.log(`"${selector}", // ${functionSignature}`);
}

calculateAdminSelectors()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
