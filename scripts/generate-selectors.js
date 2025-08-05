const { ethers } = require('hardhat');

async function main() {
  const facets = ['AdminFacet', 'PropertyFacet', 'InvestmentFacet', 'MilestoneFacet', 'TransactionFacet', 'DiamondLoupeFacet'];
  
  for (const facetName of facets) {
    console.log(`\n🔍 Generating function selectors for ${facetName}...`);
    
    try {
      const Facet = await ethers.getContractFactory(facetName);
      const interface = Facet.interface;
      
      console.log(`📋 Function Selectors for ${facetName}:`);
      for (const fragment of interface.fragments) {
        if (fragment.type === 'function') {
          const selector = interface.getFunction(fragment.name).selector;
          console.log(`  "${selector}", // ${fragment.name}`);
        }
      }
    } catch (error) {
      console.log(`❌ Error with ${facetName}: ${error.message}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 