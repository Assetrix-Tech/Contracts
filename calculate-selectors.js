const { ethers } = require("hardhat");

async function calculateSelectors() {
  console.log("Calculating function selectors for AdminFacet with EIP-2771...\n");
  
  // Function signatures with userAddress parameter
  const functions = [
    "transferOwnership(address,address)",
    "pause(address)",
    "unpause(address)",
    "setStablecoin(address,address)",
    "setGlobalTokenPrice(uint256,address)",
    "setAdminFeePercentage(uint256,address)",
    "setEarlyExitFeePercentage(uint256,address)",
    "setMinTokensPerProperty(uint256,address)",
    "setMaxTokensPerProperty(uint256,address)",
    "setMinTokensPerInvestment(uint256,address)",
    "withdrawStablecoin(address,uint256,address)"
  ];
  
  console.log("Function Selectors:");
  functions.forEach(func => {
    const selector = ethers.keccak256(ethers.toUtf8Bytes(func)).slice(0, 10);
    console.log(`"${selector}", // ${func}`);
  });
  
  console.log("\nUpdated function selectors array:");
  console.log("functionSelectors: [");
  functions.forEach(func => {
    const selector = ethers.keccak256(ethers.toUtf8Bytes(func)).slice(0, 10);
    console.log(`  "${selector}", // ${func}`);
  });
  console.log("]");
}

calculateSelectors()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
