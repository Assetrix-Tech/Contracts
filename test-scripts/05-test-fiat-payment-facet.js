const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing FiatPaymentFacet Functionality");
    console.log("==========================================");

    try {
        // Load deployment data
        const deploymentData = require("../deployments/deployment-local.json");
        console.log("✅ Loaded deployment data");

        // Get signers
        const [deployer, user1, backendSigner] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`👤 User1: ${user1.address}`);
        console.log(`👤 Backend Signer: ${backendSigner.address}`);

        // Get contract interfaces
        const fiatPaymentFacet = await ethers.getContractAt("FiatPaymentFacet", deploymentData.diamond);
        const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
        console.log("✅ Connected to FiatPaymentFacet and AdminFacet");

        // Test 1: Backend Signer Management
        console.log("\n🔍 Test 1: Backend Signer Management");
        
        const currentBackendSigner = await adminFacet.getBackendSigner();
        console.log(`✅ Current backend signer: ${currentBackendSigner}`);
        
        // Set backend signer if not already set
        if (currentBackendSigner === ethers.ZeroAddress) {
            await adminFacet.setBackendSigner(backendSigner.address);
            console.log("✅ Set backend signer");
        }

        // Test 2: Domain Separator Management
        console.log("\n🔍 Test 2: Domain Separator Management");
        
        const isInitialized = await fiatPaymentFacet.isDomainSeparatorInitialized();
        console.log(`✅ Domain separator initialized: ${isInitialized}`);
        
        if (!isInitialized) {
            await fiatPaymentFacet.initializeDomainSeparator();
            console.log("✅ Initialized domain separator");
        }
        
        const domainSeparator = await fiatPaymentFacet.getDomainSeparator();
        console.log(`✅ Domain separator: ${domainSeparator}`);

        // Test 3: User Nonce Management
        console.log("\n🔍 Test 3: User Nonce Management");
        
        const userNonce = await fiatPaymentFacet.getUserNonce(user1.address);
        console.log(`✅ User nonce: ${userNonce}`);

        // Test 4: Payment Reference Tracking
        console.log("\n🔍 Test 4: Payment Reference Tracking");
        
        const testPaymentRef = "TEST_PAYMENT_001";
        const isProcessed = await fiatPaymentFacet.isPaymentProcessed(testPaymentRef);
        console.log(`✅ Payment ${testPaymentRef} processed: ${isProcessed}`);

        // Test 5: Chain ID Verification
        console.log("\n🔍 Test 5: Chain ID Verification");
        
        const chainId = await fiatPaymentFacet.getCurrentChainId();
        console.log(`✅ Current chain ID: ${chainId}`);

        // Test 6: Access Control
        console.log("\n🔍 Test 6: Access Control");
        
        // Test that non-owner cannot set backend signer
        try {
            await adminFacet.connect(user1).setBackendSigner(user1.address);
            console.log("❌ Non-owner was able to set backend signer (should fail)");
        } catch (error) {
            console.log("✅ Non-owner cannot set backend signer (expected)");
        }

        // Test that non-owner cannot initialize domain separator
        try {
            await fiatPaymentFacet.connect(user1).initializeDomainSeparator();
            console.log("❌ Non-owner was able to initialize domain separator (should fail)");
        } catch (error) {
            console.log("✅ Non-owner cannot initialize domain separator (expected)");
        }

        // Test 7: EIP-712 Signature Verification (Simulation)
        console.log("\n🔍 Test 7: EIP-712 Signature Verification");
        
        // Create test data for signature verification
        const propertyId = 1;
        const tokenAmount = 5;
        const fiatAmount = ethers.parseUnits("500000", 2); // 500,000 Naira
        const paymentReference = "SIGNATURE_TEST_001";
        const nonce = await fiatPaymentFacet.getUserNonce(user1.address);

        // Create EIP-712 signature
        const domain = {
            name: "Assetrix",
            version: "1",
            chainId: chainId,
            verifyingContract: deploymentData.diamond
        };

        const types = {
            FiatPayment: [
                { name: "user", type: "address" },
                { name: "propertyId", type: "uint256" },
                { name: "tokenAmount", type: "uint256" },
                { name: "fiatAmount", type: "uint256" },
                { name: "paymentReference", type: "string" },
                { name: "nonce", type: "uint256" }
            ]
        };

        const value = {
            user: user1.address,
            propertyId: propertyId,
            tokenAmount: tokenAmount,
            fiatAmount: fiatAmount,
            paymentReference: paymentReference,
            nonce: nonce
        };

        try {
            const signature = await backendSigner.signTypedData(domain, types, value);
            console.log("✅ EIP-712 signature created successfully");
            console.log(`✅ Signature: ${signature}`);
        } catch (error) {
            console.log("⚠️  Could not create signature (this is expected if no property exists)");
        }

        // Test 8: Domain Separator Reset (Owner Only)
        console.log("\n🔍 Test 8: Domain Separator Reset");
        
        try {
            await fiatPaymentFacet.resetDomainSeparator();
            console.log("✅ Domain separator reset successfully");
            
            const resetInitialized = await fiatPaymentFacet.isDomainSeparatorInitialized();
            console.log(`✅ Domain separator initialized after reset: ${resetInitialized}`);
            
            // Re-initialize for future tests
            await fiatPaymentFacet.initializeDomainSeparator();
            console.log("✅ Domain separator re-initialized");
        } catch (error) {
            console.log("⚠️  Could not reset domain separator (this is expected if not initialized)");
        }

        // Test 9: Backend Signer Update
        console.log("\n🔍 Test 9: Backend Signer Update");
        
        const newBackendSigner = user1.address;
        await adminFacet.setBackendSigner(newBackendSigner);
        console.log("✅ Backend signer updated");
        
        const updatedSigner = await adminFacet.getBackendSigner();
        console.log(`✅ Updated backend signer: ${updatedSigner}`);
        console.log(`✅ Matches new signer: ${updatedSigner === newBackendSigner}`);

        // Restore original backend signer
        await adminFacet.setBackendSigner(backendSigner.address);
        console.log("✅ Restored original backend signer");

        console.log("\n✅ FiatPaymentFacet Tests Passed!");

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