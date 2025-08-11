const { execSync } = require('child_process');
const path = require('path');
const TestDeploymentLogger = require('../test-deployments/test-deployment-logger');

async function runAllTests() {
    console.log("🚀 Running All Assetrix Tests with Deployment Logging");
    console.log("==================================================");
    console.log("");

    const tests = [
        { name: "Diamond Core", file: "test-scripts/01-test-diamond-core.js" },
        { name: "Admin Facet", file: "test-scripts/02-test-admin-facet.js" },
        { name: "Property Facet", file: "test-scripts/03-test-property-facet.js" },
        { name: "Investment Facet", file: "test-scripts/04-test-investment-facet.js" },
        { name: "Fiat Payment Facet", file: "test-scripts/05-test-fiat-payment-facet.js" },
        { name: "Milestone Facet", file: "test-scripts/06-test-milestone-facet.js" },
        { name: "Transaction Facet", file: "test-scripts/07-test-transaction-facet.js" },
        { name: "System Integration", file: "test-scripts/08-test-integration.js" }
    ];

    let passedTests = 0;
    let failedTests = 0;
    const testLogs = [];

    for (const test of tests) {
        console.log(`🔍 Running ${test.name} Test...`);
        console.log(`📁 File: ${test.file}`);
        console.log("─".repeat(50));

        // Create logger for this test
        const logger = new TestDeploymentLogger(test.name.replace(/\s+/g, '-').toLowerCase());
        testLogs.push(logger);

        try {
            // Reset network state by redeploying contracts before each test
            console.log("🔄 Resetting network state...");
            try {
                execSync(`npx hardhat run scripts/deploy-local.js --network localhost`, {
                    cwd: path.join(__dirname, '..'),
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                console.log("✅ Network state reset successfully");
            } catch (deployError) {
                console.log("⚠️  Warning: Could not reset network state, continuing with current state");
            }

            const result = execSync(`npx hardhat run ${test.file} --network localhost`, {
                cwd: path.join(__dirname, '..'),
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            console.log("✅ Test Passed!");
            console.log("📋 Output:");
            console.log(result);
            
            // Mark test as completed successfully with formatted output
            logger.markTestCompleted(true, null, null, result);
            logger.saveLog();
            
            passedTests++;
            
        } catch (error) {
            console.log("❌ Test Failed!");
            console.log("📋 Error Output:");
            console.log(error.stdout || error.message);
            
            // Mark test as completed with error and formatted output
            logger.markTestCompleted(false, error.message, null, error.stdout || error.message);
            logger.saveLog();
            
            failedTests++;
        }

        console.log("─".repeat(50));
        console.log("");
    }

    // Create comprehensive summary log
    const summaryLogger = new TestDeploymentLogger('all-tests-summary');
    summaryLogger.updateField('testResults.totalTests', tests.length);
    summaryLogger.updateField('testResults.passedTests', passedTests);
    summaryLogger.updateField('testResults.failedTests', failedTests);
    summaryLogger.updateField('testResults.successRate', `${((passedTests / tests.length) * 100).toFixed(1)}%`);
    summaryLogger.updateField('testResults.status', failedTests === 0 ? 'all_passed' : 'some_failed');
    summaryLogger.updateField('testResults.passed', failedTests === 0);
    summaryLogger.updateField('testResults.endTime', new Date().toISOString());
    
    // Add individual test results
    summaryLogger.updateField('individualTests', testLogs.map(logger => ({
        testName: logger.testName,
        status: logger.getLogData().testResults.passed ? 'passed' : 'failed',
        error: logger.getLogData().testResults.error,
        logFile: logger.logFile
    })));
    
    summaryLogger.saveLog();

    // Summary
    console.log("📊 Test Summary");
    console.log("===============");
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / tests.length) * 100).toFixed(1)}%`);
    console.log("");
    console.log("📝 Deployment logs saved to: test-deployments/");
    console.log("📋 Summary log: test-deployments/all-tests-summary-deployment.json");
    console.log("");

    if (failedTests === 0) {
        console.log("🎉 All tests passed! The Assetrix system is working perfectly!");
    } else {
        console.log("⚠️  Some tests failed. Please review the output above and check individual log files.");
    }

    console.log("");
    console.log("🔧 To run individual tests:");
    tests.forEach(test => {
        console.log(`   npx hardhat run ${test.file} --network localhost`);
    });
    
    console.log("");
    console.log("📁 Individual test logs:");
    testLogs.forEach(logger => {
        const data = logger.getLogData();
        const status = data.testResults.passed ? '✅' : '❌';
        console.log(`   ${status} ${logger.testName}: ${logger.logFile}`);
    });
}

runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test runner failed:", error);
        process.exit(1);
    }); 