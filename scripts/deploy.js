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
    if (!stablecoinAddress) {
      throw new Error('STABLECOIN_ADDRESS is not set in .env file')
    }

    console.log('Deploying Assetrix Investment...')
    
    // Deploy the contract
    const Assetrix = await ethers.getContractFactory('Assetrix')
    console.log('Deploying proxy and implementation...')
    
    const assetrix = await upgrades.deployProxy(
      Assetrix,
      [stablecoinAddress],
      {
        initializer: 'initialize',
        kind: 'uups'
      }
    )
    
    await assetrix.waitForDeployment()
    const proxyAddress = await assetrix.getAddress()
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress)

    console.log('✅ Assetrix deployed to:', proxyAddress)
    console.log('✅ Implementation address:', implementationAddress)

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
