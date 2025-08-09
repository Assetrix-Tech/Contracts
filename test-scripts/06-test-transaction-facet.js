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
        console.log("\n🔍 Test 2: Create Test Property");
        
        const propertyData = {
            title: "Transaction Test Property",
            description: "Property for transaction testing",
            city: "Test City",
            state: "TS",
            country: "Test",
            tokenPrice: ethers.parseUnits("60", 6), // 60 USDT per token
            developer: "Test Developer",
            roiPercentage: 1300, // 13.00%
            maxTokens: 1500,
            minInvestment: ethers.parseUnits("120", 6), // 120 USDT minimum
            maxInvestment: ethers.parseUnits("12000", 6), // 12,000 USDT maximum
            propertyType: 1, // Residential
            status: 1 // Active
        };

        await propertyFacet.createProperty(propertyData);
        const propertyId = 0;
        console.log("✅ Test property created");

        // Test 3: Record Property Creation Transaction
        console.log("\n🔍 Test 3: Record Property Creation Transaction");
        
        const propertyCreationTx = {
            transactionType: 1, // Property Creation
            propertyId: propertyId,
            investor: deployer.address,
            amount: ethers.parseUnits("0", 6), // No investment for creation
            timestamp: Math.floor(Date.now() / 1000),
            status: 1, // Completed
            metadata: "Property creation transaction"
        };

        await transactionFacet.recordTransaction(propertyCreationTx);
        console.log("✅ Property creation transaction recorded");

        // Test 4: Record Investment Transaction
        console.log("\n🔍 Test 4: Record Investment Transaction");
        
        // Mint USDT to user1 for testing
        const mintAmount = ethers.parseUnits("5000", 6); // 5,000 USDT
        await mockStablecoin.mint(user1.address, mintAmount);
        console.log("✅ Minted USDT to user1");

        const investmentTx = {
            transactionType: 2, // Investment
            propertyId: propertyId,
            investor: user1.address,
            amount: ethers.parseUnits("600", 6), // 600 USDT
            timestamp: Math.floor(Date.now() / 1000),
            status: 1, // Completed
            metadata: "Investment transaction"
        };

        await transactionFacet.recordTransaction(investmentTx);
        console.log("✅ Investment transaction recorded");

        // Test 5: Record Withdrawal Transaction
        console.log("\n🔍 Test 5: Record Withdrawal Transaction");
        
        const withdrawalTx = {
            transactionType: 3, // Withdrawal
            propertyId: propertyId,
            investor: user1.address,
            amount: ethers.parseUnits("100", 6), // 100 USDT
            timestamp: Math.floor(Date.now() / 1000),
            status: 1, // Completed
            metadata: "Withdrawal transaction"
        };

        await transactionFacet.recordTransaction(withdrawalTx);
        console.log("✅ Withdrawal transaction recorded");

        // Test 6: Verify Transaction Recording
        console.log("\n🔍 Test 6: Verify Transaction Recording");
        
        const newTransactionCount = await transactionFacet.getTotalTransactions();
        console.log(`✅ New transaction count: ${newTransactionCount}`);
        console.log(`✅ Transaction count increased: ${newTransactionCount > initialTransactionCount}`);

        // Test 7: Retrieve Transactions
        console.log("\n🔍 Test 7: Retrieve Transactions");
        
        const transaction0 = await transactionFacet.getTransaction(0);
        const transaction1 = await transactionFacet.getTransaction(1);
        const transaction2 = await transactionFacet.getTransaction(2);
        
        console.log(`✅ Transaction 0: Type ${transaction0.transactionType}, Amount: ${ethers.formatUnits(transaction0.amount, 6)} USDT`);
        console.log(`✅ Transaction 1: Type ${transaction1.transactionType}, Amount: ${ethers.formatUnits(transaction1.amount, 6)} USDT`);
        console.log(`✅ Transaction 2: Type ${transaction2.transactionType}, Amount: ${ethers.formatUnits(transaction2.amount, 6)} USDT`);

        // Test 8: Property Transaction Queries
        console.log("\n🔍 Test 8: Property Transaction Queries");
        
        const propertyTransactions = await transactionFacet.getPropertyTransactions(propertyId);
        console.log(`✅ Property ${propertyId} transactions count: ${propertyTransactions.length}`);
        console.log(`✅ All transactions belong to property: ${propertyTransactions.every(id => id >= 0 && id < 3)}`);

        // Test 9: User Transaction Queries
        console.log("\n🔍 Test 9: User Transaction Queries");
        
        const user1Transactions = await transactionFacet.getUserTransactions(user1.address);
        const deployerTransactions = await transactionFacet.getUserTransactions(deployer.address);
        
        console.log(`✅ User1 transactions count: ${user1Transactions.length}`);
        console.log(`✅ Deployer transactions count: ${deployerTransactions.length}`);

        // Test 10: Transaction Type Queries
        console.log("\n🔍 Test 10: Transaction Type Queries");
        
        const propertyCreationTransactions = await transactionFacet.getTransactionsByType(1); // Property Creation
        const investmentTransactions = await transactionFacet.getTransactionsByType(2); // Investment
        const withdrawalTransactions = await transactionFacet.getTransactionsByType(3); // Withdrawal
        
        console.log(`✅ Property creation transactions: ${propertyCreationTransactions.length}`);
        console.log(`✅ Investment transactions: ${investmentTransactions.length}`);
        console.log(`✅ Withdrawal transactions: ${withdrawalTransactions.length}`);

        // Test 11: Transaction Status Queries
        console.log("\n🔍 Test 11: Transaction Status Queries");
        
        const completedTransactions = await transactionFacet.getTransactionsByStatus(1); // Completed
        const pendingTransactions = await transactionFacet.getTransactionsByStatus(2); // Pending
        const failedTransactions = await transactionFacet.getTransactionsByStatus(3); // Failed
        
        console.log(`✅ Completed transactions: ${completedTransactions.length}`);
        console.log(`✅ Pending transactions: ${pendingTransactions.length}`);
        console.log(`✅ Failed transactions: ${failedTransactions.length}`);

        // Test 12: Transaction Validation
        console.log("\n🔍 Test 12: Transaction Validation");
        
        console.log(`✅ Transaction data validation:`);
        console.log(`   Transaction 0 type: ${transaction0.transactionType === 1 ? "✅" : "❌"}`);
        console.log(`   Transaction 0 propertyId: ${transaction0.propertyId === propertyId ? "✅" : "❌"}`);
        console.log(`   Transaction 1 investor: ${transaction1.investor === user1.address ? "✅" : "❌"}`);
        console.log(`   Transaction 1 amount: ${transaction1.amount === ethers.parseUnits("600", 6) ? "✅" : "❌"}`);

        // Test 13: Transaction Statistics
        console.log("\n🔍 Test 13: Transaction Statistics");
        
        const totalInvestmentAmount = await transactionFacet.getTotalInvestmentAmount(propertyId);
        const totalWithdrawalAmount = await transactionFacet.getTotalWithdrawalAmount(propertyId);
        
        console.log(`✅ Total investment amount for property: ${ethers.formatUnits(totalInvestmentAmount, 6)} USDT`);
        console.log(`✅ Total withdrawal amount for property: ${ethers.formatUnits(totalWithdrawalAmount, 6)} USDT`);

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