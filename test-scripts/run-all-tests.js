const { execSync } = require('child_process');
const path = require('path');

async function runAllTests() {
    console.log("🚀 Running All Assetrix Tests");
    console.log("===============================");
    console.log("");

    const tests = [
        { name: "Diamond Core", file: "01-test-diamond-core.js" },
        { name: "Admin Facet", file: "02-test-admin-facet.js" },
        { name: "Property Facet", file: "03-test-property-facet.js" },
        { name: "Investment Facet", file: "04-test-investment-facet.js" },
        { name: "Milestone Facet", file: "05-test-milestone-facet.js" },
        { name: "Transaction Facet", file: "06-test-transaction-facet.js" },
        { name: "System Integration", file: "07-test-integration.js" }
    ];

    let passedTests = 0;
    let failedTests = 0;

    for (const test of tests) {
        console.log(`🔍 Running ${test.name} Test...`);
        console.log(`📁 File: ${test.file}`);
        console.log("─".repeat(50));

        try {
            const result = execSync(`npx hardhat run ${test.file} --network localhost`, {
                cwd: path.join(__dirname, '..'),
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            console.log("✅ Test Passed!");
            console.log("📋 Output:");
            console.log(result);
            passedTests++;
            
        } catch (error) {
            console.log("❌ Test Failed!");
            console.log("📋 Error Output:");
            console.log(error.stdout || error.message);
            failedTests++;
        }

        console.log("─".repeat(50));
        console.log("");
    }

    // Summary
    console.log("📊 Test Summary");
    console.log("===============");
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / tests.length) * 100).toFixed(1)}%`);
    console.log("");

    if (failedTests === 0) {
        console.log("🎉 All tests passed! The Assetrix system is working perfectly!");
    } else {
        console.log("⚠️  Some tests failed. Please review the output above.");
    }

    console.log("");
    console.log("🔧 To run individual tests:");
    tests.forEach(test => {
        console.log(`   npx hardhat run test-scripts/${test.file} --network localhost`);
    });
}

runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test runner failed:", error);
        process.exit(1);
    }); 