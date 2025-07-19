require('dotenv').config()
const { ethers } = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('Starting Assetrix diamond pattern deployment')
  
  try {
    const [deployer] = await ethers.getSigners()
    console.log('Deploying contracts with the account:', deployer.address)
    console.log('Account balance:', (await ethers.provider.getBalance(deployer.address)).toString())

    const network = await ethers.provider.getNetwork()
    const networkName = network.name === 'unknown' ? 'localhost' : network.name
    const deploymentPath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`)

    // Check if this is a full deployment or incremental
    const isFullDeployment = process.env.FULL_DEPLOYMENT === 'true'
    
    if (isFullDeployment) {
      console.log('🚀 Performing FULL deployment (all facets)')
      await performFullDeployment(deployer, networkName, deploymentPath)
    } else {
      console.log('📦 Performing standard deployment (core facets only)')
      await performStandardDeployment(deployer, networkName, deploymentPath)
    }

  } catch (error) {
    console.error('❌ Error in deployment process:', error)
    throw error
  }
}

async function performFullDeployment(deployer, networkName, deploymentPath) {
  console.log('\n🔧 Deploying diamond proxy...')
  const Diamond = await ethers.getContractFactory('Diamond')
  const diamond = await Diamond.deploy(deployer.address)
  await diamond.waitForDeployment()
  const diamondAddress = await diamond.getAddress()
  console.log('✅ Diamond deployed to:', diamondAddress)

  // Deploy ALL facets
  console.log('\n📦 Deploying all facets...')
  const facets = {
    admin: await deployFacet('AdminFacet'),
    property: await deployFacet('PropertyFacet'),
    investment: await deployFacet('InvestmentFacet'),
    milestone: await deployFacet('MilestoneFacet'),
    transaction: await deployFacet('TransactionFacet'),
    // Add new facets here
    insurance: await deployFacet('InsuranceFacet'),
    analytics: await deployFacet('AnalyticsFacet'),
    governance: await deployFacet('GovernanceFacet'),
    liquidity: await deployFacet('LiquidityFacet'),
    staking: await deployFacet('StakingFacet'),
    rewards: await deployFacet('RewardsFacet'),
    voting: await deployFacet('VotingFacet'),
    oracle: await deployFacet('OracleFacet'),
    bridge: await deployFacet('BridgeFacet'),
    nft: await deployFacet('NFTFacet')
  }

  // Perform diamond cut for all facets
  console.log('\n🔧 Performing diamond cut for all facets...')
  await performDiamondCut(diamondAddress, facets)

  // Save deployment data
  const deploymentData = {
    network: networkName,
    diamond: diamondAddress,
    facets: facets,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    deploymentType: 'full'
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2))
  console.log(`✅ Full deployment data saved to ${deploymentPath}`)
  
  return deploymentData
}

async function performStandardDeployment(deployer, networkName, deploymentPath) {
  console.log('\n🔧 Deploying diamond proxy...')
  const Diamond = await ethers.getContractFactory('Diamond')
  const diamond = await Diamond.deploy(deployer.address)
  await diamond.waitForDeployment()
  const diamondAddress = await diamond.getAddress()
  console.log('✅ Diamond deployed to:', diamondAddress)

  // Deploy core facets only
  console.log('\n📦 Deploying core facets...')
  const facets = {
    admin: await deployFacet('AdminFacet'),
    property: await deployFacet('PropertyFacet'),
    investment: await deployFacet('InvestmentFacet'),
    milestone: await deployFacet('MilestoneFacet'),
    transaction: await deployFacet('TransactionFacet')
  }

  // Perform diamond cut for core facets
  console.log('\n🔧 Performing diamond cut for core facets...')
  await performDiamondCut(diamondAddress, facets)

  // Save deployment data
  const deploymentData = {
    network: networkName,
    diamond: diamondAddress,
    facets: facets,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    deploymentType: 'standard',
    notes: 'Use upgrade.js to add more facets later'
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2))
  console.log(`✅ Standard deployment data saved to ${deploymentPath}`)
  console.log('\n💡 To add more facets later, use:')
  console.log('   npx hardhat run scripts/upgrade.js --network sepolia')
  
  return deploymentData
}

async function deployFacet(facetName) {
  try {
    console.log(`📦 Deploying ${facetName}...`)
    const Facet = await ethers.getContractFactory(facetName)
    const facet = await Facet.deploy()
    await facet.waitForDeployment()
    const facetAddress = await facet.getAddress()
    console.log(`✅ ${facetName} deployed to: ${facetAddress}`)
    return facetAddress
  } catch (error) {
    console.log(`❌ Failed to deploy ${facetName}: ${error.message}`)
    console.log(`⚠️ Skipping ${facetName}`)
    return null
  }
}

async function performDiamondCut(diamondAddress, facets) {
  const cut = []
  
  for (const [facetName, facetAddress] of Object.entries(facets)) {
    if (facetAddress) {
      try {
        const Facet = await ethers.getContractFactory(facetName)
        const selectors = getSelectors(Facet.interface)
        cut.push({
          facetAddress: facetAddress,
          action: 0, // Add
          functionSelectors: selectors
        })
      } catch (error) {
        console.log(`⚠️ Skipping ${facetName} in diamond cut: ${error.message}`)
      }
    }
  }

  if (cut.length > 0) {
    const diamondCut = await ethers.getContractAt('IDiamondCut', diamondAddress)
    await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x")
    console.log(`✅ Diamond cut completed with ${cut.length} facets`)
  } else {
    console.log('⚠️ No facets to add to diamond')
  }
}

function getSelectors(contractInterface) {
  const selectors = []
  for (const functionName of contractInterface.fragments) {
    if (functionName.type === 'function') {
      selectors.push(contractInterface.getSighash(functionName))
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
