const { run, ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  let diamondAddress = process.env.DIAMOND_ADDRESS;
  let facetAddresses = {};
  
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
  console.log(`💎 Diamond: ${diamondAddress}`);
  
  try {
    console.log(`\n📦 Verifying facets...`);
    
    const facetsToVerify = [];
    
    for (const [facetName, facetAddress] of Object.entries(facetAddresses)) {
      if (facetAddress) {
        let contractName = null;
        
        const possibleNames = [
          `${facetName.charAt(0).toUpperCase() + facetName.slice(1)}Facet`,
          facetName === 'fiatpayment' ? 'FiatPaymentFacet' : null,
          facetName === 'diamondloupe' ? 'DiamondLoupeFacet' : null,
          `${facetName.toUpperCase()}FACET`,
          `${facetName}Facet`
        ].filter(Boolean);
        
        for (const name of possibleNames) {
          try {
            await ethers.getContractFactory(name);
            contractName = name;
            break;
          } catch (error) {
            // Continue to next option
          }
        }
        
        if (contractName) {
          // Create fully qualified name for Etherscan verification
          const fullyQualifiedName = `contracts/${contractName}.sol:${contractName}`;
          facetsToVerify.push({
            name: contractName,
            fullyQualifiedName: fullyQualifiedName,
            address: facetAddress,
            facetName: facetName
          });
        } else {
          console.log(`⚠️  Could not find contract for facet "${facetName}". Tried: ${possibleNames.join(', ')}`);
        }
      }
    }

    if (facetsToVerify.length === 0) {
      console.log("⚠️  No facets found to verify");
      return;
    }

    console.log(`Found ${facetsToVerify.length} facets:`);
    facetsToVerify.forEach(facet => {
      console.log(`  ${facet.name}: ${facet.address}`);
    });

    // Check if we're on localhost (skip Etherscan verification)
    const network = await ethers.provider.getNetwork();
    const isLocalhost = network.chainId === 31337n;
    
    let verifiedCount = 0;
    let alreadyVerifiedCount = 0;
    let failedCount = 0;

    if (isLocalhost) {
      console.log(`\n🔍 Skipping Etherscan verification on localhost (chain ID: ${network.chainId})`);
      console.log(`📦 Facets deployed:`);
      for (const facet of facetsToVerify) {
        console.log(`  ✅ ${facet.name}: ${facet.address}`);
        verifiedCount++;
      }
    } else {
      for (const facet of facetsToVerify) {
        console.log(`\n🔍 ${facet.name}...`);
        try {
          await run("verify:verify", {
            address: facet.address,
            contract: facet.fullyQualifiedName,
            constructorArguments: [],
          });
          console.log(`  ✅ Verified as ${facet.name}`);
          verifiedCount++;
        } catch (error) {
          if (error.message.toLowerCase().includes("already verified")) {
            console.log(`  ✅ Already verified`);
            alreadyVerifiedCount++;
          } else if (error.message.toLowerCase().includes("contract not found")) {
            console.log(`  ❌ Not found on network`);
            failedCount++;
          } else {
            console.log(`  ⚠️  Failed: ${error.message}`);
            failedCount++;
          }
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Newly verified: ${verifiedCount}`);
    console.log(`  ✅ Already verified: ${alreadyVerifiedCount}`);
    console.log(`  ❌ Failed: ${failedCount}`);
    console.log(`  📦 Total: ${facetsToVerify.length}`);
    
    console.log("\n💎 Diamond contract:");
    console.log(`   - Automatically verified by Etherscan`);
    console.log(`   - Address: ${diamondAddress}`);
    
    await checkAndInitializeContract(diamondAddress);
    
    console.log("\n📋 Configuration:");
    try {
      const diamondContract = await ethers.getContractAt('AdminFacet', diamondAddress);
      
      const globalTokenPrice = await diamondContract.getGlobalTokenPrice();
      const owner = await diamondContract.owner();
      const paused = await diamondContract.paused();
      
      console.log(`   💰 Token Price: ${globalTokenPrice.toString()} naira`);
      console.log(`   👑 Owner: ${owner}`);
      console.log(`   ⏸️  Paused: ${paused}`);
      
      try {
        const stablecoin = await diamondContract.getStablecoin();
        console.log(`   🪙 Stablecoin: ${stablecoin}`);
      } catch (error) {
        console.log(`   🪙 Stablecoin: Not set`);
      }
      
    } catch (error) {
      console.log("⚠️  Could not fetch configuration:", error.message);
    }

    await verifyUpgradeSystem(diamondAddress, facetAddresses);

    const networkName = network.name === 'unknown' ? 'localhost' : network.name;
    const deploymentPath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`);
    
    if (fs.existsSync(deploymentPath)) {
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath));
      
      if (deploymentData.deploymentType === 'upgrade') {
        console.log("\n🔄 Upgrade Info:");
        console.log(`   📅 Last upgrade: ${deploymentData.timestamp}`);
        console.log(`   📦 Facets: ${Object.keys(deploymentData.facets).join(', ')}`);
      }
    }
    
    console.log("\n🎉 Verification completed!");
    
    // Display diamond configuration (using AdminFacet)
    try {
      const adminFacet = await ethers.getContractAt('AdminFacet', diamondAddress);
      
      const globalTokenPrice = await adminFacet.getGlobalTokenPrice();
      const owner = await adminFacet.owner();
      const paused = await adminFacet.paused();
      
      console.log("\n📋 Diamond Configuration:");
      console.log(`Global Token Price: ${globalTokenPrice.toString()} Naira`);
      console.log(`Owner: ${owner}`);
      console.log(`Paused: ${paused}`);
      
      try {
        const stablecoin = await adminFacet.getStablecoin();
        console.log(`Stablecoin: ${stablecoin}`);
      } catch (error) {
        console.log(`Stablecoin: Not set`);
      }
    } catch (error) {
      console.log("⚠️ Could not fetch diamond configuration:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

async function verifyUpgradeSystem(diamondAddress, facetAddresses) {
  console.log("\n🔧 Verifying upgrade system...");
  
  try {
    const diamondLoupe = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress);
    
    const diamondFacetAddresses = await diamondLoupe.facetAddresses();
    console.log(`  Diamond facets: ${diamondFacetAddresses.length}`);
    
    const deploymentFacetCount = Object.keys(facetAddresses).length;
    console.log(`  Deployment facets: ${deploymentFacetCount}`);
    
    if (diamondFacetAddresses.length !== deploymentFacetCount) {
      console.log(`  ⚠️  Mismatch: Diamond has ${diamondFacetAddresses.length} facets, deployment shows ${deploymentFacetCount}`);
    } else {
      console.log(`  ✅ Facet count matches`);
    }
    
    console.log(`  Checking function availability...`);
    for (const [facetName, facetAddress] of Object.entries(facetAddresses)) {
      try {
        // Get the expected function selectors for this facet
        let contractName = null;
        const possibleNames = [
          facetName.charAt(0).toUpperCase() + facetName.slice(1) + 'Facet',
          facetName === 'fiatpayment' ? 'FiatPaymentFacet' : null,
          facetName === 'diamondloupe' ? 'DiamondLoupeFacet' : null,
          facetName.toUpperCase() + 'FACET',
          facetName + 'Facet'
        ].filter(Boolean);
        
        for (const name of possibleNames) {
          try {
            await ethers.getContractFactory(name);
            contractName = name;
            break;
          } catch (error) {
            // Continue to next option
          }
        }
        
        if (contractName) {
          const facetContract = await ethers.getContractAt(contractName, diamondAddress);
          const expectedSelectors = getSelectors(facetContract.interface);
          
          // Check how many functions are actually routed to this facet
          let routedFunctions = 0;
          for (const selector of expectedSelectors) {
            try {
              const actualFacetAddress = await diamondLoupe.facetAddress(selector);
              if (actualFacetAddress === facetAddress) {
                routedFunctions++;
              }
            } catch (error) {
              // Function not found
            }
          }
          
          console.log(`    ${facetName}: ${routedFunctions}/${expectedSelectors.length} functions`);
          
          if (routedFunctions === 0) {
            console.log(`    ⚠️  ${facetName} has no functions routed - may need upgrade`);
          } else if (routedFunctions < expectedSelectors.length) {
            console.log(`    ⚠️  ${facetName} has ${routedFunctions}/${expectedSelectors.length} functions routed`);
          }
        } else {
          console.log(`    ${facetName}: Could not determine contract name`);
        }
      } catch (error) {
        console.log(`    ❌ ${facetName}: Error checking functions - ${error.message}`);
      }
    }
    
    console.log(`  Testing diamond cut access...`);
    try {
      const diamondCut = await ethers.getContractAt('IDiamondCut', diamondAddress);
      console.log(`    ✅ Diamond cut interface available`);
    } catch (error) {
      console.log(`    ❌ Diamond cut interface not available`);
    }
    
  } catch (error) {
    console.log(`  ❌ Upgrade system verification failed: ${error.message}`);
  }
}

async function checkAndInitializeContract(diamondAddress) {
  try {
    console.log("\n🔧 Checking initialization...");
    
    const [deployer] = await ethers.getSigners();
    const adminFacet = await ethers.getContractAt('AdminFacet', diamondAddress);
    
    const stablecoinAddress = process.env.STABLECOIN_ADDRESS;
    const globalTokenPrice = process.env.GLOBAL_TOKEN_PRICE;

    if (!stablecoinAddress) {
      console.log('❌ STABLECOIN_ADDRESS not set');
      console.log('💡 Add STABLECOIN_ADDRESS=0x... to your .env file');
      return;
    }

    if (!globalTokenPrice) {
      console.log('❌ GLOBAL_TOKEN_PRICE not set');
      console.log('💡 Add GLOBAL_TOKEN_PRICE=1000000 to your .env file');
      return;
    }

    const currentOwner = await adminFacet.owner();
    const currentStablecoin = await adminFacet.getStablecoin();
    const currentTokenPrice = await adminFacet.getGlobalTokenPrice();
    
    const needsInitialization = 
      currentOwner === ethers.ZeroAddress || 
      currentStablecoin === ethers.ZeroAddress || 
      currentTokenPrice.toString() === "0";

    if (!needsInitialization) {
      console.log("✅ Properly initialized");
      return;
    }
    
    console.log("⚠️  Needs initialization...");
    console.log('🔧 Initializing:');
    console.log(`   Owner: ${deployer.address}`);
    console.log(`   Stablecoin: ${stablecoinAddress}`);
    console.log(`   Token Price: ${globalTokenPrice} naira`);

    console.log('⚠️  Skipping USDT validation...');
    
    console.log(' Calling initialize...');
    const tx = await adminFacet.initialize(
      deployer.address,
      stablecoinAddress,
      globalTokenPrice
    );
    
    console.log('⏳ Waiting for confirmation...');
    await tx.wait();
    console.log('✅ Initialized successfully!');
    
  } catch (error) {
    console.log('❌ Initialization failed:', error.message);
    console.log('💡 You can manually initialize later');
  }
}

function getSelectors(contractInterface) {
  const selectors = []
  for (const fragment of contractInterface.fragments) {
    if (fragment.type === 'function') {
      try {
        const selector = contractInterface.getFunction(fragment.name).selector
        selectors.push(selector)
      } catch (error) {
        console.log(`⚠️ Could not get selector for function: ${fragment.name} - ${error.message}`)
      }
    }
  }
  return selectors
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
