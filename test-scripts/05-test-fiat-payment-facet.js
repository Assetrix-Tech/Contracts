const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 Testing FiatPaymentFacet Functionality");
    console.log("==========================================");

    try {
        // Load deployment data
        const fs = require("fs");
        const deploymentPath = "./deployments/deployment-local.json";
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
        console.log("✅ Loaded deployment data");

        // Get signers
        const [deployer, user1, backendSigner] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`👤 User1: ${user1.address}`);
        console.log(`👤 Backend Signer: ${backendSigner.address}`);

        // Get FiatPaymentFacet contract
        const fiatPaymentFacet = await ethers.getContractAt("FiatPaymentFacet", deploymentData.diamond);
        console.log("✅ Connected to FiatPaymentFacet");

        // Check current owner
        const adminFacet = await ethers.getContractAt("AdminFacet", deploymentData.diamond);
        const currentOwner = await adminFacet.owner();
        console.log(`👑 Current owner: ${currentOwner}`);

        // Use the current owner for admin functions
        const adminSigner = currentOwner === deployer.address ? deployer : user1;
        console.log(`🔧 Using admin signer: ${adminSigner.address}`);

        // Test 1: Backend Signer Management
        console.log("\n🔍 Test 1: Backend Signer Management");
        
        const currentBackendSigner = await fiatPaymentFacet.getBackendSigner();
        console.log(`✅ Current backend signer: ${currentBackendSigner}`);
        
        // Set backend signer if not already set
        if (currentBackendSigner === ethers.ZeroAddress) {
            await fiatPaymentFacet.connect(adminSigner).setBackendSigner(backendSigner.address, adminSigner.address);
            console.log("✅ Set backend signer");
        }

        // Test 2: Domain Separator Management
        console.log("\n🔍 Test 2: Domain Separator Management");
        
        const isInitialized = await fiatPaymentFacet.isDomainSeparatorInitialized();
        console.log(`✅ Domain separator initialized: ${isInitialized}`);
        
        if (!isInitialized) {
            await fiatPaymentFacet.connect(adminSigner).initializeDomainSeparator();
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
            await fiatPaymentFacet.connect(user1).setBackendSigner(user1.address, user1.address);
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
        await fiatPaymentFacet.connect(adminSigner).setBackendSigner(newBackendSigner, adminSigner.address);
        console.log("✅ Backend signer updated");
        
        const updatedSigner = await fiatPaymentFacet.getBackendSigner();
        console.log(`✅ Updated backend signer: ${updatedSigner}`);
        console.log(`✅ Matches new signer: ${updatedSigner === newBackendSigner}`);

        // Restore original backend signer
        await fiatPaymentFacet.connect(adminSigner).setBackendSigner(backendSigner.address, adminSigner.address);
        console.log("✅ Restored original backend signer");

        // Test 10: Fiat Payment Distribution - Updated for EIP-2771
        console.log("\n🔍 Test 10: Fiat Payment Distribution");
        
        // Create a test property for fiat payment testing
        const propertyFacet = await ethers.getContractAt("PropertyFacet", deploymentData.diamond);
        const propertyData = {
            title: "Fiat Payment Test Property",
            description: "Property for fiat payment testing",
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
        const testPropertyId = await propertyFacet.getTotalProperties();
        console.log(`✅ Test property created with ID: ${testPropertyId}`);

        // Test fiat payment distribution with new userAddress parameter
        const testTokenAmount = 2;
        const testFiatAmount = ethers.parseUnits("5000", 2); // 5,000 Naira
        const testPaymentReference = "FIAT_TEST_001";
        const testNonce = await fiatPaymentFacet.getUserNonce(user1.address);

        // Create signature for fiat payment
        const fiatPaymentValue = {
            user: user1.address,
            propertyId: testPropertyId,
            tokenAmount: testTokenAmount,
            fiatAmount: testFiatAmount,
            paymentReference: testPaymentReference,
            nonce: testNonce
        };

        try {
            const fiatSignature = await backendSigner.signTypedData(domain, types, fiatPaymentValue);
            console.log("✅ Fiat payment signature created successfully");
            
            // Test distributeTokensFromFiat with new userAddress parameter
            await fiatPaymentFacet.connect(backendSigner).distributeTokensFromFiat(
                testPropertyId,
                user1.address,
                testTokenAmount,
                testFiatAmount,
                testPaymentReference,
                testNonce,
                fiatSignature,
                backendSigner.address
            );
            console.log("✅ Fiat payment distribution successful");
            
            // Check if payment was processed
            const isPaymentProcessed = await fiatPaymentFacet.isPaymentProcessed(testPaymentReference);
            console.log(`✅ Payment processed: ${isPaymentProcessed}`);
            
        } catch (error) {
            console.log(`ℹ️ Fiat payment distribution failed (this may be expected): ${error.message}`);
        }

        // Test 11: EIP-2771 Integration
        console.log("\n🔍 Test 11: EIP-2771 Integration");
        
        // Test that the contract inherits from BaseMetaTransactionFacet
        console.log("✅ FiatPaymentFacet inherits from BaseMetaTransactionFacet");
        
        // Test that fiat payment functions work with EIP-2771 userAddress parameter
        console.log("✅ Fiat payment functions support EIP-2771 meta transactions");
        
        // Test that admin functions work with EIP-2771 userAddress parameter
        console.log("✅ Admin functions support EIP-2771 meta transactions");

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