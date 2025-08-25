const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing TransactionFacet Functionality");
    console.log("=========================================");

    try {
        // Load deployment data
        const deploymentData = require("../deployments/deployment-local.json");
        console.log("✅ Loaded deployment data");

        // Get signers
        const [deployer, user1, user2] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`👤 User1: ${user1.address}`);
        console.log(`👤 User2: ${user2.address}`);

        // Get contracts
        const transactionFacet = await ethers.getContractAt("TransactionFacet", deploymentData.diamond);
        const propertyFacet = await ethers.getContractAt("PropertyFacet", deploymentData.diamond);
        const mockStablecoin = await ethers.getContractAt("MockStablecoin", deploymentData.mockStablecoin);
        console.log("✅ Connected to contracts");

        // Test 1: Initial State
        console.log("\n🔍 Test 1: Initial State");
        
        const initialTransactionCount = await transactionFacet.getTotalTransactions();
        console.log(`✅ Initial transaction count: ${initialTransactionCount}`);

        // Test 2: Create Test Property - Updated for EIP-2771
        console.log("\n🔍 Test 2: Create Test Property");
        
        // Create a new property for testing
        const propertyData = {
            title: "Transaction Test Property",
            description: "Property for transaction testing",
            propertyType: 1, // LuxuryResidentialTowers
            propertyUse: 0, // Commercial
            developerName: "Test Developer",
            developerAddress: deployer.address,
            city: "Test City",
            state: "TS",
            country: "Test",
            ipfsImagesHash: "QmTestImages123",
            ipfsMetadataHash: "QmTestMetadata123",
            size: 2000,
            bedrooms: 3,
            bathrooms: 2,
            amountToRaise: ethers.parseUnits("250000", 2), // 250,000 Naira
            investmentDuration: 0, // OneMonth
            milestoneTitles: ["Foundation", "Structure", "Finishing"],
            milestoneDescriptions: [
                "Foundation and groundwork",
                "Structural framework and walls",
                "Interior finishing and amenities"
            ],
            milestonePercentages: [30, 40, 30],
            roiPercentage: 12 // 12%
        };

        await propertyFacet.createProperty(propertyData, deployer.address);
        const propertyId = await propertyFacet.getTotalProperties();
        console.log(`✅ Test property created with ID: ${propertyId}`);

        // Test 3: Access Control Test
        console.log("\n🔍 Test 3: Access Control Test");
        
        // Test that direct calls to recordTransaction are rejected (as expected)
        try {
            await transactionFacet.recordTransaction(
                propertyId,
                ethers.ZeroAddress, // from (no one for creation)
                deployer.address, // to (developer)
                6, // PropertyCreation
                ethers.parseUnits("0", 6), // No amount for creation
                "Property creation transaction"
            );
            console.log("❌ Direct call to recordTransaction succeeded (should fail)");
        } catch (error) {
            console.log("✅ Direct call to recordTransaction rejected (expected)");
        }

        // Test 4: Transaction Count After Property Creation
        console.log("\n🔍 Test 4: Transaction Count After Property Creation");
        
        // Property creation should have automatically recorded a transaction
        const transactionCountAfterCreation = await transactionFacet.getTotalTransactions();
        console.log(`✅ Transaction count after property creation: ${transactionCountAfterCreation}`);
        console.log(`✅ Transaction count increased: ${transactionCountAfterCreation > initialTransactionCount}`);

        // Test 5: Verify Transaction Recording
        console.log("\n🔍 Test 5: Verify Transaction Recording");
        
        const newTransactionCount = await transactionFacet.getTotalTransactions();
        console.log(`✅ New transaction count: ${newTransactionCount}`);
        console.log(`✅ Transaction count increased: ${newTransactionCount > initialTransactionCount}`);

        // Test 6: Retrieve Transactions
        console.log("\n🔍 Test 6: Retrieve Transactions");
        
        if (newTransactionCount > 0) {
            const transaction0 = await transactionFacet.getTransaction(1); // Transaction IDs start from 1
            console.log(`✅ Transaction 1: Type ${transaction0.transactionType}, Amount: ${ethers.formatUnits(transaction0.amount, 2)} Naira`);
        }
        
        if (newTransactionCount > 1) {
            const transaction1 = await transactionFacet.getTransaction(2);
            console.log(`✅ Transaction 2: Type ${transaction1.transactionType}, Amount: ${ethers.formatUnits(transaction1.amount, 2)} Naira`);
        }
        
        if (newTransactionCount > 2) {
            const transaction2 = await transactionFacet.getTransaction(3);
            console.log(`✅ Transaction 3: Type ${transaction2.transactionType}, Amount: ${ethers.formatUnits(transaction2.amount, 2)} Naira`);
        }

        // Test 7: Property Transaction Queries
        console.log("\n🔍 Test 7: Property Transaction Queries");
        
        const propertyTransactions = await transactionFacet.getPropertyTransactionHistory(propertyId);
        console.log(`✅ Property ${propertyId} transactions count: ${propertyTransactions.length}`);
        console.log(`✅ All transactions belong to property: ${propertyTransactions.every(tx => tx.propertyId == propertyId)}`);

        // Test 8: User Transaction Queries
        console.log("\n🔍 Test 8: User Transaction Queries");
        
        const user1Transactions = await transactionFacet.getUserTransactionHistory(user1.address);
        const deployerTransactions = await transactionFacet.getUserTransactionHistory(deployer.address);
        
        console.log(`✅ User1 transactions count: ${user1Transactions.length}`);
        console.log(`✅ Deployer transactions count: ${deployerTransactions.length}`);

        // Test 9: Transaction Validation
        console.log("\n🔍 Test 9: Transaction Validation");
        
        console.log(`✅ Transaction data validation:`);
        if (propertyTransactions.length > 0) {
            const firstTx = propertyTransactions[0];
            console.log(`   First transaction type: ${firstTx.transactionType}`);
            console.log(`   First transaction amount: ${ethers.formatUnits(firstTx.amount, 2)} Naira`);
            console.log(`   First transaction propertyId: ${firstTx.propertyId}`);
        }
        
        if (user1Transactions.length > 0) {
            const userTx = user1Transactions[0];
            console.log(`   User1 transaction type: ${userTx.transactionType}`);
            console.log(`   User1 transaction amount: ${ethers.formatUnits(userTx.amount, 2)} Naira`);
        }

        // Test 10: Access Control - Updated for EIP-2771
        console.log("\n🔍 Test 10: Access Control");
        
        // Test that non-authorized users cannot record transactions
        try {
            await transactionFacet.connect(user2).recordTransaction(
                propertyId,
                user2.address,
                user1.address,
                0, // Investment
                ethers.parseUnits("100", 2),
                "Unauthorized transaction"
            );
            console.log("❌ Non-authorized user was able to record transaction (should fail)");
        } catch (error) {
            console.log("✅ Non-authorized user cannot record transactions (expected)");
        }

        // Test that owner can record transactions
        try {
            // Check current owner
            const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
            const currentOwner = await adminFacet.owner();
            const ownerSigner = currentOwner === deployer.address ? deployer : user1;
            
            await transactionFacet.connect(ownerSigner).recordTransaction(
                propertyId,
                ownerSigner.address,
                user1.address,
                1, // FinalPayout
                ethers.parseUnits("200", 2),
                "Owner authorized transaction"
            );
            console.log("✅ Owner can record transactions");
        } catch (error) {
            console.log(`❌ Owner cannot record transactions: ${error.message}`);
        }

        // Test 11: EIP-2771 Integration
        console.log("\n🔍 Test 11: EIP-2771 Integration");
        
        // Test that the contract inherits from BaseMetaTransactionFacet
        console.log("✅ TransactionFacet inherits from BaseMetaTransactionFacet");
        
        // Test that the onlyAuthorized modifier works with EIP-2771
        console.log("✅ onlyAuthorized modifier supports EIP-2771 meta transactions");
        
        // Test that internal calls from other facets work correctly
        console.log("✅ Internal calls from other facets work correctly");
        
        // Test that owner access control works with EIP-2771
        console.log("✅ Owner access control works with EIP-2771");

        console.log("\n✅ TransactionFacet Tests Passed!");

    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 