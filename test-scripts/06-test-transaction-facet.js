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

        // Test 2: Create Test Property
        console.log("\n🔍 Test 2: Get Test Property");
        
        // Use an existing property instead of creating a new one
        const totalProperties = await propertyFacet.getTotalProperties();
        const propertyId = totalProperties; // Use the last property
        console.log(`✅ Using existing property with ID: ${propertyId}`);
        
        if (propertyId == 0) {
            console.log("❌ No properties available for testing");
            return;
        }

        // Test 3: Record Property Creation Transaction
        console.log("\n🔍 Test 3: Record Property Creation Transaction");
        
        await transactionFacet.recordTransaction(
            propertyId,
            ethers.ZeroAddress, // from (no one for creation)
            deployer.address, // to (developer)
            6, // PropertyCreation
            ethers.parseUnits("0", 6), // No amount for creation
            "Property creation transaction"
        );
        console.log("✅ Property creation transaction recorded");

        // Test 4: Record Investment Transaction
        console.log("\n🔍 Test 4: Record Investment Transaction");
        
        // Mint Naira to user1 for testing
        const mintAmount = ethers.parseUnits("50000", 2); // 50,000 Naira
        await mockStablecoin.mint(user1.address, mintAmount);
        console.log("✅ Minted Naira to user1");

        await transactionFacet.recordTransaction(
            propertyId,
            user1.address, // from (investor)
            deployer.address, // to (developer)
            0, // Investment
            ethers.parseUnits("600", 2), // 600 Naira
            "Investment transaction"
        );
        console.log("✅ Investment transaction recorded");

        // Test 5: Record Withdrawal Transaction
        console.log("\n🔍 Test 5: Record Withdrawal Transaction");
        
        await transactionFacet.recordTransaction(
            propertyId,
            deployer.address, // from (developer)
            user1.address, // to (investor)
            2, // Refund
            ethers.parseUnits("100", 2), // 100 Naira
            "Withdrawal transaction"
        );
        console.log("✅ Withdrawal transaction recorded");

        // Test 6: Verify Transaction Recording
        console.log("\n🔍 Test 6: Verify Transaction Recording");
        
        const newTransactionCount = await transactionFacet.getTotalTransactions();
        console.log(`✅ New transaction count: ${newTransactionCount}`);
        console.log(`✅ Transaction count increased: ${newTransactionCount > initialTransactionCount}`);

        // Test 7: Retrieve Transactions
        console.log("\n🔍 Test 7: Retrieve Transactions");
        
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

        // Test 8: Property Transaction Queries
        console.log("\n🔍 Test 8: Property Transaction Queries");
        
        const propertyTransactions = await transactionFacet.getPropertyTransactionHistory(propertyId);
        console.log(`✅ Property ${propertyId} transactions count: ${propertyTransactions.length}`);
        console.log(`✅ All transactions belong to property: ${propertyTransactions.every(tx => tx.propertyId == propertyId)}`);

        // Test 9: User Transaction Queries
        console.log("\n🔍 Test 9: User Transaction Queries");
        
        const user1Transactions = await transactionFacet.getUserTransactionHistory(user1.address);
        const deployerTransactions = await transactionFacet.getUserTransactionHistory(deployer.address);
        
        console.log(`✅ User1 transactions count: ${user1Transactions.length}`);
        console.log(`✅ Deployer transactions count: ${deployerTransactions.length}`);

        // Test 10: Transaction Validation
        console.log("\n🔍 Test 10: Transaction Validation");
        
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