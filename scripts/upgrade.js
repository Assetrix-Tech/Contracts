require('dotenv').config()
const { ethers } = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('🚀 Starting diamond upgrade...')
  
  try {
    const [deployer] = await ethers.getSigners()
    console.log(`Account: ${deployer.address}`)
    console.log(`Balance: ${(await ethers.provider.getBalance(deployer.address)).toString()}`)

    let diamondAddress = process.env.DIAMOND_ADDRESS
    
    if (!diamondAddress) {
      const network = await ethers.provider.getNetwork()
      const networkName = network.name === 'unknown' ? 'localhost' : network.name
      const deploymentPath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`)
      
      if (fs.existsSync(deploymentPath)) {
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath))
        diamondAddress = deploymentData.diamond
        console.log(`Diamond: ${diamondAddress}`)
      } else {
        throw new Error('DIAMOND_ADDRESS not found in .env file and no deployment file found')
      }
    }

    console.log(`Target: ${diamondAddress}`)
    
    const network = await ethers.provider.getNetwork()
    const networkName = network.name === 'unknown' ? 'localhost' : network.name
    const deploymentPath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`)
    
    if (!fs.existsSync(deploymentPath)) {
      throw new Error('Deployment file not found')
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath))
    const currentFacets = deploymentData.facets

    const configPath = path.join(__dirname, '..', 'upgrade-config.json')
    let upgradeConfig = {
      upgradeFacets: [],
      addFacets: [],
      skipFacets: []
    }

    if (fs.existsSync(configPath)) {
      upgradeConfig = JSON.parse(fs.readFileSync(configPath))
      console.log('Config loaded')
    } else {
      console.log('No config found, creating default...')
      upgradeConfig = {
        upgradeFacets: Object.keys(currentFacets),
        addFacets: [],
        skipFacets: []
      }
      fs.writeFileSync(configPath, JSON.stringify(upgradeConfig, null, 2))
      console.log('Default config created')
    }

    console.log('\n📋 Configuration:')
    
    const newFacetsInUpgradeList = upgradeConfig.upgradeFacets.filter(facet => 
      !currentFacets[facet]
    )

    if (newFacetsInUpgradeList.length > 0) {
      console.log(`⚠️  Moving new facets to addFacets: ${newFacetsInUpgradeList.join(', ')}`)
      for (const facet of newFacetsInUpgradeList) {
        if (!upgradeConfig.addFacets.includes(facet)) {
          upgradeConfig.addFacets.push(facet)
        }
      }
      upgradeConfig.upgradeFacets = upgradeConfig.upgradeFacets.filter(facet => 
        !newFacetsInUpgradeList.includes(facet)
      )
    }

    const facetsToUpgrade = upgradeConfig.upgradeFacets.filter(facet => 
      !upgradeConfig.skipFacets.includes(facet) && currentFacets[facet]
    )

    console.log(`Upgrade: ${facetsToUpgrade.join(', ') || 'none'}`)
    console.log(`Add: ${upgradeConfig.addFacets.join(', ') || 'none'}`)
    console.log(`Skip: ${upgradeConfig.skipFacets.join(', ') || 'none'}`)

    const existingFacetsNotInConfig = Object.keys(currentFacets).filter(facet => 
      !upgradeConfig.upgradeFacets.includes(facet) && 
      !upgradeConfig.addFacets.includes(facet) &&
      !upgradeConfig.skipFacets.includes(facet)
    )

    if (existingFacetsNotInConfig.length > 0) {
      console.log(`Auto-skip: ${existingFacetsNotInConfig.join(', ')}`)
    }

    console.log('\n🔄 Processing upgrades...')
    
    const upgradedFacets = {}
    const cut = []
    const failedUpgrades = []

    for (const facetName of facetsToUpgrade) {
      console.log(`\n📦 ${facetName}...`)
      
              try {
          let contractName = null;
          let FacetContract = null;
          
          const possibleNames = [
            facetName.charAt(0).toUpperCase() + facetName.slice(1) + 'Facet',
            facetName === 'fiatpayment' ? 'FiatPaymentFacet' : null,
            facetName === 'diamondloupe' ? 'DiamondLoupeFacet' : null,
            facetName.toUpperCase() + 'FACET',
            facetName + 'Facet'
          ].filter(Boolean);
          
          for (const name of possibleNames) {
            try {
              FacetContract = await ethers.getContractFactory(name);
              contractName = name;
              break;
            } catch (error) {
              // Continue to next option
            }
          }
          
          if (!contractName || !FacetContract) {
            throw new Error(`Could not find contract for facet "${facetName}". Tried: ${possibleNames.join(', ')}`);
          }
          
          const facetV2 = await FacetContract.deploy()
          await facetV2.waitForDeployment()
          const facetV2Address = await facetV2.getAddress()
          console.log(`  Deployed: ${facetV2Address}`)
          upgradedFacets[facetName] = facetV2Address

          const newFacetSelectors = getSelectors(FacetContract.interface)
          const oldFacetAddress = currentFacets[facetName]
          const diamondLoupe = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
          
          let oldFacetSelectors = []
          try {
            oldFacetSelectors = await diamondLoupe.facetFunctionSelectors(oldFacetAddress)
            console.log(`  Old functions: ${oldFacetSelectors.length}`)
          } catch (error) {
            console.log(`  Old functions: 0 (not found)`)
            oldFacetSelectors = []
          }
          
          const existingSelectors = newFacetSelectors.filter(selector => 
            oldFacetSelectors.includes(selector)
          )
          const newSelectors = newFacetSelectors.filter(selector => 
            !oldFacetSelectors.includes(selector)
          )
          
          console.log(`  New functions: ${newSelectors.length}`)
          console.log(`  Existing functions: ${existingSelectors.length}`)
          
          if (newSelectors.length > 0) {
            cut.push({
              facetAddress: facetV2Address,
              action: 0,
              functionSelectors: newSelectors
            })
            console.log(`  ✅ Add: ${newSelectors.length} functions`)
          }
          
          if (existingSelectors.length > 0) {
            // Check which functions are actually mapped to different addresses
            const diamondLoupe = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
            const selectorsToReplace = []
            
            for (const selector of existingSelectors) {
              try {
                const currentAddress = await diamondLoupe.facetAddress(selector)
                if (currentAddress !== facetV2Address) {
                  selectorsToReplace.push(selector)
                }
              } catch (error) {
                // Function not found, safe to add
                selectorsToReplace.push(selector)
              }
            }
            
            if (selectorsToReplace.length > 0) {
              cut.push({
                facetAddress: facetV2Address,
                action: 1, // REPLACE
                functionSelectors: selectorsToReplace
              })
              console.log(`  ✅ Replace: ${selectorsToReplace.length} functions with new facet`)
            } else {
              console.log(`  ℹ️  All functions already mapped to new facet`)
            }
          }
        } catch (error) {
          console.log(`  ❌ Failed: ${error.message}`)
          failedUpgrades.push(facetName)
        }
      }

    const facetsToAdd = upgradeConfig.addFacets.filter(facet => 
      !upgradeConfig.skipFacets.includes(facet)
    )

    if (facetsToAdd.length > 0) {
      console.log(`\n🆕 Adding new facets...`)
      
      for (const facetName of facetsToAdd) {
        console.log(`\n📦 ${facetName}...`)
        
        try {
          let contractName = null;
          let FacetContract = null;
          
          const possibleNames = [
            facetName.charAt(0).toUpperCase() + facetName.slice(1) + 'Facet',
            facetName === 'fiatpayment' ? 'FiatPaymentFacet' : null,
            facetName === 'diamondloupe' ? 'DiamondLoupeFacet' : null,
            facetName.toUpperCase() + 'FACET',
            facetName + 'Facet'
          ].filter(Boolean);
          
          for (const name of possibleNames) {
            try {
              FacetContract = await ethers.getContractFactory(name);
              contractName = name;
              break;
            } catch (error) {
              // Continue to next option
            }
          }
          
          if (!contractName || !FacetContract) {
            throw new Error(`Could not find contract for facet "${facetName}". Tried: ${possibleNames.join(', ')}`);
          }
          
          const newFacet = await FacetContract.deploy()
          await newFacet.waitForDeployment()
          const newFacetAddress = await newFacet.getAddress()
          console.log(`  Deployed: ${newFacetAddress}`)
          upgradedFacets[facetName] = newFacetAddress

          const facetSelectors = getSelectors(FacetContract.interface)
          
          if (facetSelectors.length > 0) {
            // For new facets, use ADD operation
            cut.push({
              facetAddress: newFacetAddress,
              action: 0, // ADD
              functionSelectors: facetSelectors
            })
            console.log(`  ✅ Add: ${facetSelectors.length} functions`)
          }
        } catch (error) {
          console.log(`  ❌ Failed: ${error.message}`)
          failedUpgrades.push(facetName)
        }
      }
    }

    if (cut.length > 0) {
      console.log('\n🔧 Executing diamond cut...')
      console.log(`Operations: ${cut.length}`)
      
              if (failedUpgrades.length > 0) {
          console.log(`Failed: ${failedUpgrades.join(', ')}`)
        }
        
        const validCut = cut.filter(operation => {
          if (operation.facetAddress === ethers.ZeroAddress && operation.action !== 2) {
            console.log(`⚠️  Skipping invalid operation with zero address`)
            return false
          }
          return true
        })
        
        if (validCut.length > 0) {
          console.log('Cut operations:')
          validCut.forEach((operation, index) => {
            const actionName = operation.action === 0 ? 'ADD' : operation.action === 1 ? 'REPLACE' : 'REMOVE'
            console.log(`  ${index + 1}. ${actionName}: ${operation.functionSelectors.length} functions`)
          })
          
          const diamondCut = await ethers.getContractAt('IDiamondCut', diamondAddress)
          
          try {
            // Set higher gas limit for diamond cut operations
            const tx = await diamondCut.diamondCut(validCut, ethers.ZeroAddress, "0x", {
              gasLimit: 5000000 // 5M gas limit
            })
            
            console.log(`⏳ Waiting for transaction: ${tx.hash}`)
            const receipt = await tx.wait()
            console.log(`✅ Diamond cut successful (gas used: ${receipt.gasUsed.toString()})`)
          } catch (error) {
            console.log(`❌ Diamond cut failed: ${error.message}`)
            
            console.log('🔄 Trying individual operations with higher gas limits...')
            
            for (const operation of validCut) {
              const actionName = operation.action === 0 ? 'ADD' : operation.action === 1 ? 'REPLACE' : 'REMOVE'
              console.log(`  Trying ${actionName} operation...`)
              
              try {
                const tx = await diamondCut.diamondCut([operation], ethers.ZeroAddress, "0x", {
                  gasLimit: 2000000 // 2M gas limit per operation
                })
                
                console.log(`  ⏳ Waiting for ${actionName} transaction: ${tx.hash}`)
                const receipt = await tx.wait()
                console.log(`  ✅ ${actionName} successful (gas used: ${receipt.gasUsed.toString()})`)
              } catch (singleError) {
                console.log(`  ❌ ${actionName} failed: ${singleError.message}`)
                
                // If REPLACE fails, try REMOVE + ADD
                if (operation.action === 1) {
                  console.log(`  🔄 Trying REMOVE + ADD for ${actionName}...`)
                  try {
                    // First remove
                    const removeTx = await diamondCut.diamondCut([{
                      facetAddress: ethers.ZeroAddress,
                      action: 2, // REMOVE
                      functionSelectors: operation.functionSelectors
                    }], ethers.ZeroAddress, "0x", {
                      gasLimit: 1000000
                    })
                    await removeTx.wait()
                    console.log(`    ✅ REMOVE successful`)
                    
                    // Then add
                    const addTx = await diamondCut.diamondCut([{
                      facetAddress: operation.facetAddress,
                      action: 0, // ADD
                      functionSelectors: operation.functionSelectors
                    }], ethers.ZeroAddress, "0x", {
                      gasLimit: 1000000
                    })
                    await addTx.wait()
                    console.log(`    ✅ ADD successful`)
                  } catch (fallbackError) {
                    console.log(`    ❌ REMOVE + ADD failed: ${fallbackError.message}`)
                  }
                }
              }
            }
          }

        console.log('\n🔍 Verifying...')
        
        for (const [facetName, facetAddress] of Object.entries(upgradedFacets)) {
          try {
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
            
            if (!contractName) {
              throw new Error(`Could not find contract for facet "${facetName}". Tried: ${possibleNames.join(', ')}`);
            }
            
            const facetContract = await ethers.getContractAt(contractName, diamondAddress)
            console.log(`✅ ${contractName} verified`)
            
            const diamondLoupe = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
            
            // Get the expected function selectors for this facet
            const expectedSelectors = getSelectors(facetContract.interface)
            console.log(`  Expected functions: ${expectedSelectors.length}`)
            
            // Check how many functions are actually routed to this facet
            let routedFunctions = 0
            let mismatchedFunctions = 0
            
            for (const selector of expectedSelectors) {
              try {
                const actualFacetAddress = await diamondLoupe.facetAddress(selector)
                if (actualFacetAddress === facetAddress) {
                  routedFunctions++
                } else if (actualFacetAddress !== ethers.ZeroAddress) {
                  mismatchedFunctions++
                  console.log(`  ⚠️  Function ${selector} routed to ${actualFacetAddress} instead of ${facetAddress}`)
                }
              } catch (error) {
                console.log(`  ❌ Function ${selector} not found in diamond`)
              }
            }
            
            if (routedFunctions === expectedSelectors.length) {
              console.log(`  ✅ ${routedFunctions}/${expectedSelectors.length} functions correctly routed`)
            } else if (routedFunctions > 0) {
              console.log(`  ⚠️  ${routedFunctions}/${expectedSelectors.length} functions routed correctly`)
              if (mismatchedFunctions > 0) {
                console.log(`  ⚠️  ${mismatchedFunctions} functions routed to wrong facet`)
              }
            } else {
              console.log(`  ❌ 0/${expectedSelectors.length} functions routed correctly - upgrade failed`)
            }
          } catch (error) {
            console.log(`⚠️  Could not verify ${facetName}: ${error.message}`)
          }
        }
      } else {
        console.log('⚠️  No valid operations to perform')
      }
    } else {
      console.log('ℹ️  No facets to upgrade or add.')
      if (failedUpgrades.length > 0) {
        console.log(`❌ All deployments failed: ${failedUpgrades.join(', ')}`)
      }
    }

    const updatedFacets = {
      ...currentFacets,
      ...upgradedFacets
    };
    
    const normalizedFacets = {};
    for (const [key, value] of Object.entries(updatedFacets)) {
      normalizedFacets[key.toLowerCase()] = value;
    }
    
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
    console.log(`\n✅ Deployment file updated`);
    console.log('🎉 Upgrade completed!');
    
    if (Object.keys(upgradedFacets).length > 0) {
      console.log('\n📊 Summary:')
      for (const [facetName, address] of Object.entries(upgradedFacets)) {
        console.log(`  ${facetName}: ${address}`)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
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
    console.error(error)
    process.exit(1)
  })

 