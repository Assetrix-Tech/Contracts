require('dotenv').config()
const { ethers } = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('Starting diamond pattern upgrade and feature addition process')
  
  try {
    const [deployer] = await ethers.getSigners()
    console.log('Upgrading diamond with the account:', deployer.address)
    console.log('Account balance:', (await ethers.provider.getBalance(deployer.address)).toString())

    // Get the diamond address from environment variables or deployment file
    let diamondAddress = process.env.DIAMOND_ADDRESS
    
    // If not in env, try to get from deployment file
    if (!diamondAddress) {
      const network = await ethers.provider.getNetwork()
      const networkName = network.name === 'unknown' ? 'localhost' : network.name
      const deploymentPath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`)
      
      if (fs.existsSync(deploymentPath)) {
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath))
        diamondAddress = deploymentData.diamond
        console.log(`Found diamond address in deployment file: ${diamondAddress}`)
      } else {
        throw new Error('DIAMOND_ADDRESS not found in .env file and no deployment file found')
      }
    }

    console.log(`Upgrading diamond at ${diamondAddress}...`)
    
    // Get current facet addresses from deployment file
    const network = await ethers.provider.getNetwork()
    const networkName = network.name === 'unknown' ? 'localhost' : network.name
    const deploymentPath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`)
    
    if (!fs.existsSync(deploymentPath)) {
      throw new Error('Deployment file not found')
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath))
    const currentFacets = deploymentData.facets

    // ===== LOAD UPGRADE CONFIGURATION =====
    const configPath = path.join(__dirname, '..', 'upgrade-config.json')
    let upgradeConfig = {
      upgradeFacets: [],
      addFacets: [],
      skipFacets: []
    }

    if (fs.existsSync(configPath)) {
      upgradeConfig = JSON.parse(fs.readFileSync(configPath))
      console.log('📋 Loaded upgrade configuration from upgrade-config.json')
    } else {
      console.log('ℹ️ No upgrade-config.json found. Creating default configuration...')
      // Create default config with all existing facets
      upgradeConfig = {
        upgradeFacets: Object.keys(currentFacets),
        addFacets: [],
        skipFacets: []
      }
      fs.writeFileSync(configPath, JSON.stringify(upgradeConfig, null, 2))
      console.log('✅ Created default upgrade-config.json')
    }

    // ===== DEPLOY UPGRADED VERSIONS OF EXISTING FACETS =====
    console.log('\n📦 Deploying upgraded facet versions...')
    
    const upgradedFacets = {}
    const cut = []

    // Check for mistakes: new facets in upgradeFacets
    const newFacetsInUpgradeList = upgradeConfig.upgradeFacets.filter(facet => 
      !currentFacets[facet]
    )

    if (newFacetsInUpgradeList.length > 0) {
      console.log(`⚠️ Warning: These facets don't exist yet and should be in addFacets instead: ${newFacetsInUpgradeList.join(', ')}`)
      console.log(`💡 Moving them to addFacets automatically...`)
      
      // Add them to addFacets if not already there
      for (const facet of newFacetsInUpgradeList) {
        if (!upgradeConfig.addFacets.includes(facet)) {
          upgradeConfig.addFacets.push(facet)
        }
      }
      
      // Remove them from upgradeFacets
      upgradeConfig.upgradeFacets = upgradeConfig.upgradeFacets.filter(facet => 
        !newFacetsInUpgradeList.includes(facet)
      )
    }

    // Get all facet names that should be upgraded
    const facetsToUpgrade = upgradeConfig.upgradeFacets.filter(facet => 
      !upgradeConfig.skipFacets.includes(facet) && currentFacets[facet]
    )

    // Show which facets are being skipped
    const existingFacets = Object.keys(currentFacets)
    const skippedFacets = existingFacets.filter(facet => 
      !upgradeConfig.upgradeFacets.includes(facet) && !upgradeConfig.skipFacets.includes(facet)
    )
    const explicitlySkippedFacets = upgradeConfig.skipFacets.filter(facet => 
      existingFacets.includes(facet)
    )

    console.log(`🔄 Facets to upgrade: ${facetsToUpgrade.length}`)
    if (skippedFacets.length > 0) {
      console.log(`⏭️ Facets not in config (auto-skipped): ${skippedFacets.join(', ')}`)
    }
    if (explicitlySkippedFacets.length > 0) {
      console.log(`⏭️ Facets explicitly skipped: ${explicitlySkippedFacets.join(', ')}`)
    }
    
    for (const facetName of facetsToUpgrade) {
      console.log(`🔄 Upgrading ${facetName}Facet...`)
      
      try {
        const FacetContract = await ethers.getContractFactory(`${facetName.charAt(0).toUpperCase() + facetName.slice(1)}Facet`)
        const facetV2 = await FacetContract.deploy()
        await facetV2.waitForDeployment()
        const facetV2Address = await facetV2.getAddress()
        console.log(`✅ ${facetName}FacetV2 deployed to: ${facetV2Address}`)
        upgradedFacets[facetName] = facetV2Address

        // Remove old facet and add new one
        const facetSelectors = getSelectors(FacetContract.interface)
        cut.push(
          {
            facetAddress: ethers.ZeroAddress, // Remove old facet
            action: 1, // Remove
            functionSelectors: facetSelectors
          },
          {
            facetAddress: facetV2Address, // Add new facet
            action: 0, // Add
            functionSelectors: facetSelectors
          }
        )
    } catch (error) {
        console.log(`❌ Failed to upgrade ${facetName}Facet: ${error.message}`)
        console.log(`⚠️ Skipping ${facetName}Facet upgrade`)
        console.log(`💡 Check if ${facetName}Facet.sol exists and compiles correctly`)
      }
    }

    // ===== DEPLOY NEW FACETS =====
    console.log('\n🆕 Deploying new facets...')
    
    const newFacets = {}

    // Get all new facets to add (exclude existing ones)
    const facetsToAdd = upgradeConfig.addFacets.filter(facet => 
      !upgradeConfig.skipFacets.includes(facet) && !currentFacets[facet]
    )

    // Check for mistakes: facets in addFacets that already exist
    const existingFacetsInAddList = upgradeConfig.addFacets.filter(facet => 
      currentFacets[facet]
    )

    if (existingFacetsInAddList.length > 0) {
      console.log(`⚠️ Warning: These facets already exist and should be in upgradeFacets instead: ${existingFacetsInAddList.join(', ')}`)
      console.log(`💡 Moving them to upgradeFacets automatically...`)
      
      // Add them to upgradeFacets if not already there
      for (const facet of existingFacetsInAddList) {
        if (!upgradeConfig.upgradeFacets.includes(facet)) {
          upgradeConfig.upgradeFacets.push(facet)
        }
      }
    }

    console.log(`🆕 Facets to add: ${facetsToAdd.length}`)
    
    for (const facetName of facetsToAdd) {
      console.log(`🆕 Deploying ${facetName}Facet...`)
      
      try {
        const FacetContract = await ethers.getContractFactory(`${facetName.charAt(0).toUpperCase() + facetName.slice(1)}Facet`)
        const newFacet = await FacetContract.deploy()
        await newFacet.waitForDeployment()
        const newFacetAddress = await newFacet.getAddress()
        console.log(`✅ ${facetName}Facet deployed to: ${newFacetAddress}`)
        newFacets[facetName] = newFacetAddress

        // Add new facet
        const facetSelectors = getSelectors(FacetContract.interface)
        cut.push({
          facetAddress: newFacetAddress,
          action: 0, // Add
          functionSelectors: facetSelectors
        })
      } catch (error) {
        console.log(`❌ Failed to deploy ${facetName}Facet: ${error.message}`)
        console.log(`⚠️ Skipping ${facetName}Facet deployment`)
      }
    }

    // ===== PERFORM DIAMOND CUT =====
    if (cut.length > 0) {
      console.log('\n🔧 Preparing diamond cut for upgrade and additions...')
      console.log(`📋 Cut operations: ${cut.length}`)
      
      // Perform diamond cut
      console.log('🔧 Performing diamond cut...')
      const diamondCut = await ethers.getContractAt('IDiamondCut', diamondAddress)
      await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x")
      console.log('✅ Diamond cut completed successfully')

      // Verify the changes
      console.log('\n🔍 Verifying changes...')
      
      // Verify upgraded facets
      for (const [facetName, facetAddress] of Object.entries(upgradedFacets)) {
        try {
          const facetContract = await ethers.getContractAt(facetName.charAt(0).toUpperCase() + facetName.slice(1) + 'Facet', diamondAddress)
          console.log(`✅ ${facetName}Facet upgrade verified`)
        } catch (error) {
          console.log(`⚠️ Warning: Could not verify ${facetName}Facet after upgrade:`, error.message)
        }
      }

      // Verify new facets
      for (const [facetName, facetAddress] of Object.entries(newFacets)) {
        try {
          const facetContract = await ethers.getContractAt(facetName.charAt(0).toUpperCase() + facetName.slice(1) + 'Facet', diamondAddress)
          console.log(`✅ ${facetName}Facet addition verified`)
        } catch (error) {
          console.log(`⚠️ Warning: Could not verify ${facetName}Facet after addition:`, error.message)
        }
      }
    } else {
      console.log('ℹ️ No facets to upgrade or add.')
      console.log('💡 Create or modify upgrade-config.json to specify which facets to modify.')
      console.log('📝 Example configuration:')
      console.log(JSON.stringify({
        upgradeFacets: ["property", "investment", "milestone"],
        addFacets: ["insurance", "analytics", "governance"],
        skipFacets: ["admin"]
      }, null, 2))
    }

    // Merge all facets as before
    const updatedFacets = {
      ...currentFacets,
      ...upgradedFacets,
      ...newFacets
    };
    // Always convert all keys to lowercase and remove duplicates
    const normalizedFacets = {};
    for (const [key, value] of Object.entries(updatedFacets)) {
      normalizedFacets[key.toLowerCase()] = value;
    }
    // Now use normalizedFacets in your deployment data
    const updatedDeploymentData = {
      network: deploymentData.network,
      diamond: deploymentData.diamond,
      facets: normalizedFacets,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      deploymentType: deploymentData.deploymentType || 'upgrade'
    };
    fs.writeFileSync(
      deploymentPath,
      JSON.stringify(updatedDeploymentData, null, 2)
    );
    console.log(`✅ Updated deployment info saved to ${deploymentPath}`);
    console.log('\n🎉 Diamond pattern upgrade and feature addition completed successfully!');
    
    // Summary
    if (Object.keys(upgradedFacets).length > 0) {
      console.log('\n📊 Summary of Upgrades:')
      for (const [facetName, address] of Object.entries(upgradedFacets)) {
        console.log(`  🔄 ${facetName}Facet: ${address}`)
      }
    }
    
    if (Object.keys(newFacets).length > 0) {
      console.log('\n📊 Summary of New Features:')
      for (const [facetName, address] of Object.entries(newFacets)) {
        console.log(`  🆕 ${facetName}Facet: ${address}`)
      }
    }
    
    return updatedDeploymentData
  } catch (error) {
    console.error('❌ Error in upgrade and addition process:', error)
    throw error
  }
}

// Helper function to get function selectors from contract interface
function getSelectors(contractInterface) {
  const selectors = []
  for (const fragment of contractInterface.fragments) {
    if (fragment.type === 'function') {
      try {
        // Use the correct method to get function selector
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
    console.error(error)
    process.exit(1)
  })
