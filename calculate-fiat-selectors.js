const { ethers } = require("hardhat");

async function calculateFiatSelectors() {
  console.log("Calculating function selectors for FiatPaymentFacet...\n");
  
  // All function signatures
  const functions = [
    "distributeTokensFromFiat(uint256,address,uint256,uint256,string,uint256,bytes,address)",
    "getBackendSigner()",
    "getCurrentChainId()",
    "getDomainSeparator()",
    "getUserNonce(address)",
    "initializeDomainSeparator()",
    "isDomainSeparatorInitialized()",
    "isPaymentProcessed(string)",
    "resetDomainSeparator()",
    "setBackendSigner(address,address)",
    "FIAT_PAYMENT_TYPEHASH()"
  ];
  
  console.log("Function Selectors:");
  functions.forEach(func => {
    const selector = ethers.keccak256(ethers.toUtf8Bytes(func)).slice(0, 10);
    console.log(`"${selector}", // ${func}`);
  });
  
  console.log("\nUpdated function selectors array:");
  console.log("const fiatPaymentSelectors = [");
  functions.forEach(func => {
    const selector = ethers.keccak256(ethers.toUtf8Bytes(func)).slice(0, 10);
    console.log(`  "${selector}", // ${func}`);
  });
  console.log("];");
}

calculateFiatSelectors()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
