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

  console.log("🔍 Verifying diamond pattern contracts...");
  console.log(`💎 Diamond Address: ${diamondAddress}`);
  
  try {
    // Verify all facets dynamically from deployment data
    console.log(`\n📦 Verifying facets...`);
    
    const facetsToVerify = [];
    
    // Add all facets from deployment data
    for (const [facetName, facetAddress] of Object.entries(facetAddresses)) {
      if (facetAddress) {
        const contractName = `${facetName.charAt(0).toUpperCase() + facetName.slice(1)}Facet`;
        facetsToVerify.push({
          name: contractName,
          address: facetAddress,
          facetName: facetName
        });
      }
    }

    if (facetsToVerify.length === 0) {
      console.log("⚠️ No facets found to verify");
      return;
    }

    console.log(`📋 Found ${facetsToVerify.length} facets to verify:`);
    facetsToVerify.forEach(facet => {
      console.log(`  - ${facet.name}: ${facet.address}`);
    });

    let verifiedCount = 0;
    let alreadyVerifiedCount = 0;
    let failedCount = 0;

    for (const facet of facetsToVerify) {
      console.log(`\n🔍 Verifying ${facet.name} at ${facet.address}...`);
      try {
        await run("verify:verify", {
          address: facet.address,
          constructorArguments: [],
        });
        console.log(`✅ ${facet.name} verified successfully`);
        verifiedCount++;
      } catch (error) {
        if (error.message.toLowerCase().includes("already verified")) {
          console.log(`✅ ${facet.name} is already verified`);
          alreadyVerifiedCount++;
        } else if (error.message.toLowerCase().includes("contract not found")) {
          console.log(`❌ ${facet.name} not found on network`);
          failedCount++;
        } else {
          console.log(`⚠️ Failed to verify ${facet.name}:`, error.message);
          failedCount++;
        }
      }
    }
    
    // Summary
    console.log(`\n📊 Verification Summary:`);
    console.log(`  ✅ Newly verified: ${verifiedCount}`);
    console.log(`  ✅ Already verified: ${alreadyVerifiedCount}`);
    console.log(`  ❌ Failed: ${failedCount}`);
    console.log(`  📦 Total facets: ${facetsToVerify.length}`);
    
    // Note: The diamond contract is verified automatically by Etherscan
    console.log("\n💎 Diamond contract verification:");
    console.log(`   - Diamond contracts are automatically verified by Etherscan`);
    console.log(`   - Diamond address: ${diamondAddress}`);
    
    // Display contract configuration
    console.log("\n📋 Contract Configuration:");
    try {
      // Use the diamond address directly to call admin functions
      const diamondContract = await ethers.getContractAt('AdminFacet', diamondAddress);
      
      const globalTokenPrice = await diamondContract.getGlobalTokenPrice();
      const owner = await diamondContract.owner();
      const paused = await diamondContract.paused();
      
      console.log(`   💰 Global Token Price: ${globalTokenPrice.toString()} wei`);
      console.log(`   👑 Diamond Owner: ${owner}`);
      console.log(`   ⏸️ Contract Paused: ${paused}`);
      
      // Try to get stablecoin address if available
      try {
        const stablecoin = await diamondContract.getStablecoin();
        console.log(`   🪙 Stablecoin: ${stablecoin}`);
      } catch (error) {
        console.log(`   🪙 Stablecoin: Not set`);
      }
      
    } catch (error) {
      console.log("⚠️ Could not fetch contract configuration:", error.message);
    }

    // Display upgrade information if available
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === 'unknown' ? 'localhost' : network.name;
    const deploymentPath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`);
    
    if (fs.existsSync(deploymentPath)) {
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath));
      
      if (deploymentData.upgraded) {
        console.log("\n🔄 Upgrade Information:");
        console.log(`   📅 Last upgraded: ${deploymentData.upgradeTimestamp}`);
        if (deploymentData.upgradeDetails) {
          if (deploymentData.upgradeDetails.upgradedFacets) {
            console.log(`   🔄 Upgraded facets: ${Object.keys(deploymentData.upgradeDetails.upgradedFacets).join(', ')}`);
          }
          if (deploymentData.upgradeDetails.newFacets) {
            console.log(`   🆕 Added facets: ${Object.keys(deploymentData.upgradeDetails.newFacets).join(', ')}`);
          }
        }
      }
    }
    
    console.log("\n🎉 Verification process completed!");
    
    // Display contract configuration
    try {
      const Assetrix = await ethers.getContractFactory('Assetrix');
      const assetrix = Assetrix.attach(proxyAddress);
      
      const globalTokenPrice = await assetrix.getGlobalTokenPrice();
      const expectedROI = await assetrix.getExpectedROIPercentage();
      
      console.log("\n📋 Contract Configuration:");
      console.log(`Global Token Price: ${globalTokenPrice.toString()} Naira`);
      console.log(`Expected ROI: ${expectedROI.toString()}%`);
    } catch (error) {
      console.log("⚠️ Could not fetch contract configuration:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
