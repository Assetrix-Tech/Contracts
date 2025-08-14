import 'dotenv/config';
import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
//import path from 'path';
const { ethers } = hre;

export async function main() {

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

  // Deploy ALL facets (only the ones that actually exist)
  console.log('\n📦 Deploying all facets...')
  const facets = {
    admin: await deployFacet('AdminFacet'),
    property: await deployFacet('PropertyFacet'),
    investment: await deployFacet('InvestmentFacet'),
    milestone: await deployFacet('MilestoneFacet'),
    transaction: await deployFacet('TransactionFacet'),
    diamondLoupe: await deployFacet('DiamondLoupeFacet')
  }

  // Perform diamond cut for all facets
  console.log('\n🔧 Performing diamond cut for all facets...')
  await performDiamondCut(diamondAddress, facets)

  // Initialize the platform
  console.log('\n🔧 Initializing platform...')
  await initializePlatform(diamondAddress, deployer)

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
    transaction: await deployFacet('TransactionFacet'),
    diamondLoupe: await deployFacet('DiamondLoupeFacet'),
    fiatPayment: await deployFacet('FiatPaymentFacet')
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
  
  // Map of facet keys to actual contract names (only existing facets)
  const facetContractNames = {
    admin: 'AdminFacet',
    property: 'PropertyFacet',
    investment: 'InvestmentFacet',
    milestone: 'MilestoneFacet',
    transaction: 'TransactionFacet',
    diamondLoupe: 'DiamondLoupeFacet',
    fiatPayment: 'FiatPaymentFacet'
  }
  
  for (const [facetKey, facetAddress] of Object.entries(facets)) {
    if (facetAddress) {
      try {
        const contractName = facetContractNames[facetKey]
        if (!contractName) {
          console.log(`⚠️ Unknown facet key: ${facetKey}`)
          continue
        }
        
        const Facet = await ethers.getContractFactory(contractName)
        const selectors = getSelectors(Facet.interface)
        cut.push({
          facetAddress: facetAddress,
          action: 0, // Add
          functionSelectors: selectors
        })
        console.log(`✅ Added ${contractName} to diamond cut`)
      } catch (error) {
        console.log(`⚠️ Skipping ${facetKey} in diamond cut: ${error.message}`)
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

async function initializePlatform(diamondAddress, deployer) {
  try {
    // Get environment variables
    const stablecoinAddress = process.env.STABLECOIN_ADDRESS
    const globalTokenPrice = process.env.GLOBAL_TOKEN_PRICE

    if (!stablecoinAddress) {
      console.log('⚠️ STABLECOIN_ADDRESS not set in environment, skipping initialization')
      console.log('💡 Add USDT_ADDRESS=0x... to your .env file')
      return
    }

    if (!globalTokenPrice) {
      console.log('⚠️ GLOBAL_TOKEN_PRICE not set in environment, skipping initialization')
      console.log('💡 Add GLOBAL_TOKEN_PRICE=1000000 to your .env file (in naira)')
      return
    }

    // Validate USDT contract
    try {
      const usdtContract = await ethers.getContractAt('IERC20', stablecoinAddress)
      const symbol = await usdtContract.symbol()
      const decimals = await usdtContract.decimals()
      console.log(`✅ USDT contract validated: ${symbol} (${decimals} decimals)`)
    } catch (error) {
      console.log('❌ Invalid USDT contract address or contract not found')
      console.log('💡 Make sure STABLECOIN_ADDRESS points to a valid USDT contract')
      return
    }

    console.log('🔧 Initializing platform with:')
    console.log(`   Owner: ${deployer.address}`)
    console.log(`   Stablecoin: ${stablecoinAddress}`)
    console.log(`   Token Price: ${globalTokenPrice} naira (${(globalTokenPrice / 1000000).toFixed(2)}M naira)`)
    console.log(`   Network: ${networkName}`)

    // Get the AdminFacet interface
    const adminFacet = await ethers.getContractAt('AdminFacet', diamondAddress)
    
    // Call the initialize function
    const tx = await adminFacet.initialize(
      deployer.address,
      stablecoinAddress,
      globalTokenPrice
    )
    
    await tx.wait()
    console.log('✅ Platform initialized successfully')
    
  } catch (error) {
    console.log('❌ Failed to initialize platform:', error.message)
    console.log('⚠️ Platform initialization failed, but deployment completed')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
