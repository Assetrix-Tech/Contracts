require('dotenv').config()
const { ethers, upgrades } = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('Starting deployment process')
  
  try {
    const [deployer] = await ethers.getSigners()
    console.log('Deploying contract with the account:', deployer.address)
    console.log('Account balance:', (await ethers.provider.getBalance(deployer.address)).toString())

    // Validate environment variables
    const stablecoinAddress = process.env.STABLECOIN_ADDRESS
    const initialTokenPrice = process.env.INITIAL_TOKEN_PRICE || '100000' // N100,000 default
    const initialROIPercentage = process.env.INITIAL_ROI_PERCENTAGE || '15' // 15% default
    
    if (!stablecoinAddress) {
      throw new Error('STABLECOIN_ADDRESS is not set in .env file')
    }
    
    console.log('🪙 Using stablecoin address:', stablecoinAddress)
    console.log('💰 Initial token price:', initialTokenPrice, '(Naira)')
    console.log('📈 Initial ROI percentage:', initialROIPercentage, '%')

    console.log('Deploying Assetrix Investment...')
    
    // Deploy the contract
    const Assetrix = await ethers.getContractFactory('Assetrix')
    console.log('Deploying proxy and implementation...')
    
    console.log('⏳ Deploying proxy contract...')
    const assetrix = await upgrades.deployProxy(
      Assetrix,
      [stablecoinAddress, initialTokenPrice, initialROIPercentage],
      {
        initializer: 'initialize',
        kind: 'uups'
      }
    )
    
    // Get proxy address immediately after deployment starts
    const proxyAddress = await assetrix.getAddress()
    console.log('🔗 Proxy address:', proxyAddress)
    
    console.log('⏳ Waiting for deployment confirmation...')
    await assetrix.waitForDeployment()
    console.log('⏳ Getting implementation address...')
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress)

    console.log('✅ Assetrix deployed to:', proxyAddress)
    console.log('✅ Implementation address:', implementationAddress)

    // Verify the contract was initialized correctly
    const globalTokenPrice = await assetrix.getGlobalTokenPrice()
    const expectedROI = await assetrix.getExpectedROIPercentage()
    console.log('✅ Global token price set to:', globalTokenPrice.toString())
    console.log('✅ Expected ROI percentage set to:', expectedROI.toString(), '%')

    // Save the contract addresses
    const contractsDir = path.join(__dirname, '..', 'deployments')
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true })
    }

    const network = await ethers.provider.getNetwork()
    const networkName = network.name === 'unknown' ? 'localhost' : network.name
    
    const deploymentData = {
      network: networkName,
      proxy: proxyAddress,
      implementation: implementationAddress,
      deployer: deployer.address,
      stablecoinAddress: stablecoinAddress,
      initialTokenPrice: initialTokenPrice,
      initialROIPercentage: initialROIPercentage,
      timestamp: new Date().toISOString()
    }

    const deploymentPath = path.join(contractsDir, `deployment-${networkName}.json`)
    fs.writeFileSync(
      deploymentPath,
      JSON.stringify(deploymentData, null, 2)
    )

    console.log(`✅ Deployment info saved to ${deploymentPath}`)
    console.log('\nDeployment completed successfully!')
    
    return deploymentData
  } catch (error) {
    console.error('❌ Error in deployment process:', error)
    throw error
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
