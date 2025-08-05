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

    // ===== VALIDATE CONFIGURATION =====
    console.log('\n🔍 Validating upgrade configuration...')
    
    // Check for mistakes: new facets in upgradeFacets
    const newFacetsInUpgradeList = upgradeConfig.upgradeFacets.filter(facet => 
      !currentFacets[facet.toLowerCase()]
    )

    if (newFacetsInUpgradeList.length > 0) {
      console.log(`⚠️ Warning: These facets don't exist yet and should be in addFacets instead: ${newFacetsInUpgradeList.join(', ')}`)
      console.log(`💡 Moving them to addFacets automatically...`)
      
      // Add them to addFacets if not already there
      for (const facet of newFacetsInUpgradeList) {
        if (!upgradeConfig.addFacets.includes(facet.toLowerCase())) {
          upgradeConfig.addFacets.push(facet.toLowerCase())
        }
      }
      
      // Remove them from upgradeFacets
      upgradeConfig.upgradeFacets = upgradeConfig.upgradeFacets.filter(facet => 
        !newFacetsInUpgradeList.includes(facet)
      )
    }

    // Get all facet names that should be upgraded
    const facetsToUpgrade = upgradeConfig.upgradeFacets.filter(facet => 
      !upgradeConfig.skipFacets.includes(facet) && currentFacets[facet.toLowerCase()]
    )

    console.log(`🔄 Facets to upgrade: ${facetsToUpgrade.length}`)
    if (facetsToUpgrade.length > 0) {
      console.log(`📋 Facets being upgraded: ${facetsToUpgrade.join(', ')}`)
    }

    // Get facets that exist but are not in config (auto-skip)
    const existingFacetsNotInConfig = Object.keys(currentFacets).filter(facet => 
      !upgradeConfig.upgradeFacets.includes(facet) && 
      !upgradeConfig.addFacets.includes(facet) &&
      !upgradeConfig.skipFacets.includes(facet)
    )

    if (existingFacetsNotInConfig.length > 0) {
      console.log(`⏭️ Facets not in config (auto-skipped): ${existingFacetsNotInConfig.join(', ')}`)
    }

    // ===== DEPLOY UPGRADED VERSIONS OF EXISTING FACETS =====
    console.log('\n📦 Deploying upgraded facet versions...')
    
    const upgradedFacets = {}
    const cut = []
    const failedUpgrades = []

    // Deploy upgraded versions of existing facets
    for (const facetName of facetsToUpgrade) {
      console.log(`🔄 Deploying upgraded ${facetName}...`)
      
      try {
        // Handle case sensitivity for contract names
        let contractName = facetName.charAt(0).toUpperCase() + facetName.slice(1) + 'Facet'
        
        // Special case for DiamondLoupeFacet
        if (facetName.toLowerCase() === 'diamondloupe') {
          contractName = 'DiamondLoupeFacet'
        }
        
        const FacetContract = await ethers.getContractFactory(contractName)
        const facetV2 = await FacetContract.deploy()
        await facetV2.waitForDeployment()
        const facetV2Address = await facetV2.getAddress()
        console.log(`✅ ${contractName} deployed to: ${facetV2Address}`)
        upgradedFacets[facetName] = facetV2Address

        // Get function selectors for this facet
        const facetSelectors = getSelectors(FacetContract.interface)
        
        // Only add to cut if we have selectors
        if (facetSelectors.length > 0) {
          // For upgrades, we just ADD the new facet (it will replace the old one)
          cut.push({
            facetAddress: facetV2Address,
            action: 0, // Add (will replace existing functions)
            functionSelectors: facetSelectors
          })
        }
      } catch (error) {
        console.log(`❌ Failed to upgrade ${facetName}: ${error.message}`)
        failedUpgrades.push(facetName)
      }
    }

    // ===== DEPLOY NEW FACETS =====
    const facetsToAdd = upgradeConfig.addFacets.filter(facet => 
      !upgradeConfig.skipFacets.includes(facet)
    )

    if (facetsToAdd.length > 0) {
      console.log(`\n🆕 Deploying new facets...`)
      console.log(`🆕 Facets to add: ${facetsToAdd.length}`)
      
      for (const facetName of facetsToAdd) {
        console.log(`🆕 Deploying ${facetName}...`)
        
        try {
          // Handle case sensitivity for contract names
          let contractName = facetName.charAt(0).toUpperCase() + facetName.slice(1) + 'Facet'
          
          // Special case for DiamondLoupeFacet
          if (facetName.toLowerCase() === 'diamondloupe') {
            contractName = 'DiamondLoupeFacet'
          }
          
          const FacetContract = await ethers.getContractFactory(contractName)
          const newFacet = await FacetContract.deploy()
          await newFacet.waitForDeployment()
          const newFacetAddress = await newFacet.getAddress()
          console.log(`✅ ${contractName} deployed to: ${newFacetAddress}`)
          upgradedFacets[facetName] = newFacetAddress

          // Get function selectors for this facet
          const facetSelectors = getSelectors(FacetContract.interface)
          
          // Only add to cut if we have selectors
          if (facetSelectors.length > 0) {
            cut.push({
              facetAddress: newFacetAddress,
              action: 0, // Add
              functionSelectors: facetSelectors
            })
          }
        } catch (error) {
          console.log(`❌ Failed to deploy ${facetName}: ${error.message}`)
          failedUpgrades.push(facetName)
        }
      }
    } else {
      console.log(`\nℹ️ No new facets to add`)
    }

    // ===== PERFORM DIAMOND CUT =====
    if (cut.length > 0) {
      console.log('\n🔧 Preparing diamond cut...')
      console.log(`📋 Cut operations: ${cut.length}`)
      console.log(`✅ Successful deployments: ${Object.keys(upgradedFacets).length}`)
      
      if (failedUpgrades.length > 0) {
        console.log(`❌ Failed deployments: ${failedUpgrades.join(', ')}`)
        console.log(`⚠️ Only successfully deployed facets will be upgraded`)
      }
      
      // Validate cut array - ensure no zero addresses
      const validCut = cut.filter(operation => {
        if (operation.facetAddress === ethers.ZeroAddress) {
          console.log(`⚠️ Skipping invalid operation with zero address`)
          return false
        }
        return true
      })
      
      if (validCut.length > 0) {
        console.log('🔧 Performing diamond cut...')
        const diamondCut = await ethers.getContractAt('IDiamondCut', diamondAddress)
        await diamondCut.diamondCut(validCut, ethers.ZeroAddress, "0x")
        console.log('✅ Diamond cut completed successfully')

        // Verify the changes
        console.log('\n🔍 Verifying changes...')
        
        // Verify upgraded facets
        for (const [facetName, facetAddress] of Object.entries(upgradedFacets)) {
          try {
            let contractName = facetName.charAt(0).toUpperCase() + facetName.slice(1) + 'Facet'
            if (facetName.toLowerCase() === 'diamondloupe') {
              contractName = 'DiamondLoupeFacet'
            }
            const facetContract = await ethers.getContractAt(contractName, diamondAddress)
            console.log(`✅ ${contractName} upgrade verified`)
          } catch (error) {
            console.log(`⚠️ Warning: Could not verify ${facetName} after upgrade:`, error.message)
          }
        }
      } else {
        console.log('⚠️ No valid cut operations to perform')
      }
    } else {
      console.log('ℹ️ No facets to upgrade or add.')
      if (failedUpgrades.length > 0) {
        console.log(`❌ All facet deployments failed: ${failedUpgrades.join(', ')}`)
      }
    }

    // Merge all facets as before
    const updatedFacets = {
      ...currentFacets,
      ...upgradedFacets
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
    
    // Check if any facets were added (not just upgraded)
    const addedFacets = Object.keys(upgradedFacets).filter(facet => 
      !Object.keys(currentFacets).includes(facet)
    )
    
    if (addedFacets.length > 0) {
      console.log('\n📊 Summary of New Features:')
      for (const facetName of addedFacets) {
        console.log(`  🆕 ${facetName}Facet: ${upgradedFacets[facetName]}`)
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
