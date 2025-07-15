require('dotenv').config()
const { ethers, upgrades } = require('hardhat')
const fs = require('fs')
const path = require('path')

async function main() {
  console.log('Starting upgrade process')
  
  try {
    const [deployer] = await ethers.getSigners()
    console.log('Upgrading contract with the account:', deployer.address)
    console.log('Account balance:', (await ethers.provider.getBalance(deployer.address)).toString())

    // Get the proxy address from environment variables or deployment file
    let proxyAddress = process.env.PROXY_ADDRESS
    
    // If not in env, try to get from deployment file
    if (!proxyAddress) {
      const network = await ethers.provider.getNetwork()
      const networkName = network.name === 'unknown' ? 'localhost' : network.name
      const deploymentPath = path.join(__dirname, '..', 'deployments', `deployment-${networkName}.json`)
      
      if (fs.existsSync(deploymentPath)) {
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath))
        proxyAddress = deploymentData.proxy
        console.log(`Found proxy address in deployment file: ${proxyAddress}`)
      } else {
        throw new Error('PROXY_ADDRESS not found in .env file and no deployment file found')
      }
    }

    console.log(`Upgrading Assetrix at ${proxyAddress}...`)
    
    // Get the new contract factory
    const AssetrixV2 = await ethers.getContractFactory('Assetrix')
    
    // Upgrade the proxy
    console.log('Upgrading proxy...')
    const assetrix = await upgrades.upgradeProxy(proxyAddress, AssetrixV2)
    await assetrix.waitForDeployment()
    
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress)
    console.log('✅ Proxy upgraded successfully')
    console.log('✅ New implementation address:', implementationAddress)

    // Verify the contract is working after upgrade
    try {
      const globalTokenPrice = await assetrix.getGlobalTokenPrice()
      console.log('✅ Global token price after upgrade:', globalTokenPrice.toString())
    } catch (error) {
      console.log('⚠️ Warning: Could not verify contract state after upgrade:', error.message)
    }

    // Update the deployment file
    const contractsDir = path.join(__dirname, '..', 'deployments')
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true })
    }

    const network = await ethers.provider.getNetwork()
    const networkName = network.name === 'unknown' ? 'localhost' : network.name
    
    // Read existing deployment data to preserve initialization parameters
    const existingDeploymentPath = path.join(contractsDir, `deployment-${networkName}.json`)
    let existingData = {}
    if (fs.existsSync(existingDeploymentPath)) {
      existingData = JSON.parse(fs.readFileSync(existingDeploymentPath))
    }
    
    const deploymentData = {
      ...existingData,
      network: networkName,
      proxy: proxyAddress,
      implementation: implementationAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      upgraded: true,
      upgradeTimestamp: new Date().toISOString()
    }

    const deploymentPath = path.join(contractsDir, `deployment-${networkName}.json`)
    fs.writeFileSync(
      deploymentPath,
      JSON.stringify(deploymentData, null, 2)
    )

    console.log(`✅ Updated deployment info saved to ${deploymentPath}`)
    console.log('\nUpgrade completed successfully!')
    
    return deploymentData
  } catch (error) {
    console.error('❌ Error in upgrade process:', error)
    throw error
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
