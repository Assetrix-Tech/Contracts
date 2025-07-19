const { run, ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  let diamondAddress = process.env.DIAMOND_ADDRESS;
  let facetAddresses = {};
  
  // If not in env, try to get from deployment file
  if (!diamondAddress) {
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === 'unknown' ? 'localhost' : network.name;
    const deploymentPath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`);
    
    if (fs.existsSync(deploymentPath)) {
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath));
      diamondAddress = deploymentData.diamond;
      facetAddresses = deploymentData.facets;
      console.log(`📁 Found addresses in deployment file: ${deploymentPath}`);
    } else {
      throw new Error("DIAMOND_ADDRESS must be set in .env file or deployment file must exist");
    }
  }

  console.log("Verifying diamond pattern contracts...");
  
  try {
    // Verify all facets
    console.log(`\n🔍 Verifying facets...`);
    
    const facets = [
      { name: 'AdminFacet', address: facetAddresses.admin },
      { name: 'PropertyFacet', address: facetAddresses.property },
      { name: 'InvestmentFacet', address: facetAddresses.investment },
      { name: 'MilestoneFacet', address: facetAddresses.milestone },
      { name: 'TransactionFacet', address: facetAddresses.transaction }
    ];

    for (const facet of facets) {
      if (facet.address) {
        console.log(`\nVerifying ${facet.name} at ${facet.address}...`);
        try {
          await run("verify:verify", {
            address: facet.address,
            constructorArguments: [],
          });
          console.log(`✅ ${facet.name} verified`);
        } catch (error) {
          if (error.message.toLowerCase().includes("already verified")) {
            console.log(`✅ ${facet.name} is already verified`);
          } else {
            console.log(`⚠️ Failed to verify ${facet.name}:`, error.message);
          }
        }
      }
    }
    
    // Note: The diamond contract is verified automatically by Etherscan
    console.log("\n✅ Verification completed!");
    console.log(`Diamond: ${diamondAddress}`);
    console.log(`Facets:`, facetAddresses);
    
    // Display contract configuration
    try {
      const AdminFacet = await ethers.getContractFactory('AdminFacet');
      const adminFacet = AdminFacet.attach(diamondAddress);
      
      const globalTokenPrice = await adminFacet.getGlobalTokenPrice();
      
      console.log("\n📋 Contract Configuration:");
      console.log(`Global Token Price: ${globalTokenPrice.toString()} Naira`);
      console.log(`Diamond Owner: ${await adminFacet.owner()}`);
    } catch (error) {
      console.log("⚠️ Could not fetch contract configuration:", error.message);
    }
    
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
