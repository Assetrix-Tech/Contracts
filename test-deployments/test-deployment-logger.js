const fs = require('fs');
const path = require('path');

class TestDeploymentLogger {
    constructor(testName) {
        this.testName = testName;
        this.logData = {
            testInfo: {
                name: testName,
                network: "localhost",
                deploymentType: "test",
                timestamp: new Date().toISOString()
            },
            deployment: {
                timestamp: new Date().toISOString(),
                deployer: null,
                gasUsed: 0,
                contracts: {},
                transactions: []
            },
            testResults: {
                status: "running",
                startTime: new Date().toISOString(),
                endTime: null,
                passed: false,
                error: null,
                output: null,
                summary: null
            },
            system: {
                diamond: null,
                facets: {},
                stablecoin: null,
                users: {},
                properties: [],
                investments: [],
                milestones: []
            }
        };
        
        this.logDir = path.join(__dirname);
        this.logFile = path.join(this.logDir, `${testName}-deployment.json`);
    }

    // Deployment logging methods
    logDeployment(deployer, gasUsed = 0) {
        this.logData.deployment.deployer = deployer;
        this.logData.deployment.gasUsed += gasUsed;
        console.log(`📋 Logged deployment: ${deployer} (Total gas: ${this.logData.deployment.gasUsed})`);
    }

    logContractDeployment(contractName, address, deployer, gasUsed = 0, transactionHash = null) {
        this.logData.deployment.contracts[contractName] = {
            address: address,
            deployer: deployer,
            gasUsed: gasUsed,
            transactionHash: transactionHash,
            deployedAt: new Date().toISOString()
        };
        this.logData.deployment.gasUsed += gasUsed;
        console.log(`📋 Logged ${contractName}: ${address} (Gas: ${gasUsed})`);
    }

    logDiamondSetup(diamondAddress, facetAddresses, gasUsed = 0) {
        this.logData.system.diamond = {
            address: diamondAddress,
            setupAt: new Date().toISOString(),
            gasUsed: gasUsed
        };
        this.logData.system.facets = facetAddresses;
        this.logData.deployment.gasUsed += gasUsed;
        console.log(`📋 Logged Diamond setup: ${diamondAddress} with ${Object.keys(facetAddresses).length} facets`);
    }

    logStablecoinDeployment(address, deployer, gasUsed = 0, transactionHash = null) {
        this.logData.system.stablecoin = {
            address: address,
            deployer: deployer,
            gasUsed: gasUsed,
            transactionHash: transactionHash,
            deployedAt: new Date().toISOString()
        };
        this.logData.deployment.gasUsed += gasUsed;
        console.log(`📋 Logged stablecoin: ${address} (Gas: ${gasUsed})`);
    }

    // Transaction logging methods
    logTransaction(transactionType, from, to, functionName, gasUsed, transactionHash, status = "success", data = {}) {
        const transaction = {
            type: transactionType,
            from: from,
            to: to,
            function: functionName,
            gasUsed: gasUsed,
            transactionHash: transactionHash,
            status: status,
            timestamp: new Date().toISOString(),
            data: data
        };
        
        this.logData.deployment.transactions.push(transaction);
        this.logData.deployment.gasUsed += gasUsed;
        console.log(`📋 Logged transaction: ${transactionType} - ${functionName} (Gas: ${gasUsed})`);
    }

    // System state logging methods
    logUserSetup(userName, address, balance, stablecoinBalance = null) {
        this.logData.system.users[userName] = {
            address: address,
            balance: balance,
            stablecoinBalance: stablecoinBalance,
            setupAt: new Date().toISOString()
        };
        console.log(`📋 Logged user: ${userName} at ${address}`);
    }

    logPropertyCreation(propertyId, data, creator, gasUsed = 0, transactionHash = null) {
        const property = {
            id: propertyId,
            data: data,
            creator: creator,
            gasUsed: gasUsed,
            transactionHash: transactionHash,
            createdAt: new Date().toISOString()
        };
        
        this.logData.system.properties.push(property);
        this.logData.deployment.gasUsed += gasUsed;
        console.log(`📋 Logged property: ID ${propertyId} (Gas: ${gasUsed})`);
    }

    logInvestment(propertyId, investor, tokenAmount, fiatAmount, gasUsed = 0, transactionHash = null) {
        const investment = {
            propertyId: propertyId,
            investor: investor,
            tokenAmount: tokenAmount,
            fiatAmount: fiatAmount,
            gasUsed: gasUsed,
            transactionHash: transactionHash,
            investedAt: new Date().toISOString()
        };
        
        this.logData.system.investments.push(investment);
        this.logData.deployment.gasUsed += gasUsed;
        console.log(`📋 Logged investment: ${fiatAmount} for property ${propertyId} (Gas: ${gasUsed})`);
    }

    logMilestoneCreation(propertyId, milestoneIndex, title, percentage, gasUsed = 0, transactionHash = null) {
        const milestone = {
            propertyId: propertyId,
            index: milestoneIndex,
            title: title,
            percentage: percentage,
            gasUsed: gasUsed,
            transactionHash: transactionHash,
            createdAt: new Date().toISOString()
        };
        
        this.logData.system.milestones.push(milestone);
        this.logData.deployment.gasUsed += gasUsed;
        console.log(`📋 Logged milestone: ${title} for property ${propertyId} (Gas: ${gasUsed})`);
    }

    // Test result methods
    markTestCompleted(passed, error = null, summary = null) {
        this.logData.testResults.status = passed ? "completed" : "failed";
        this.logData.testResults.endTime = new Date().toISOString();
        this.logData.testResults.passed = passed;
        this.logData.testResults.summary = summary;
        
        if (error) {
            this.logData.testResults.error = error;
        }
        
        console.log(`📋 Marked test as ${passed ? 'completed' : 'failed'}`);
    }

    updateField(fieldPath, value) {
        const keys = fieldPath.split('.');
        let current = this.logData;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        console.log(`📋 Updated field: ${fieldPath} = ${value}`);
    }

    // Save and format methods
    saveLog() {
        try {
            const formattedData = this.formatLogData(this.logData);
            fs.writeFileSync(this.logFile, JSON.stringify(formattedData, null, 2));
            console.log(`📝 Test deployment log saved to: ${this.logFile}`);
        } catch (error) {
            console.error(`❌ Failed to save test deployment log: ${error.message}`);
        }
    }

    formatLogData(data) {
        // Create a comprehensive, well-organized log structure
        const formatted = {
            // Test Information
            testInfo: {
                name: data.testInfo.name,
                network: data.testInfo.network,
                deploymentType: data.testInfo.deploymentType,
                timestamp: data.testInfo.timestamp
            },
            
            // Deployment Summary
            deployment: {
                timestamp: data.deployment.timestamp,
                deployer: data.deployment.deployer,
                totalGasUsed: data.deployment.gasUsed,
                contracts: data.deployment.contracts,
                transactions: data.deployment.transactions
            },
            
            // Test Results
            testResults: {
                status: data.testResults.status,
                startTime: data.testResults.startTime,
                endTime: data.testResults.endTime,
                passed: data.testResults.passed,
                error: data.testResults.error,
                output: data.testResults.output,
                summary: data.testResults.summary
            },
            
            // System State
            system: {
                diamond: data.system.diamond,
                facets: data.system.facets,
                stablecoin: data.system.stablecoin,
                users: data.system.users,
                properties: data.system.properties,
                investments: data.system.investments,
                milestones: data.system.milestones
            }
        };

        // Remove empty sections and null values
        this.cleanObject(formatted);
        
        return formatted;
    }

    cleanObject(obj) {
        Object.keys(obj).forEach(key => {
            if (obj[key] && typeof obj[key] === 'object') {
                if (Array.isArray(obj[key])) {
                    if (obj[key].length === 0) {
                        delete obj[key];
                    } else {
                        obj[key].forEach(item => {
                            if (typeof item === 'object') {
                                this.cleanObject(item);
                            }
                        });
                    }
                } else {
                    this.cleanObject(obj[key]);
                    if (Object.keys(obj[key]).length === 0) {
                        delete obj[key];
                    }
                }
            } else if (obj[key] === null || obj[key] === undefined || obj[key] === '') {
                delete obj[key];
            }
        });
    }

    getLogData() {
        return this.logData;
    }

    // Utility method to get deployment summary
    getDeploymentSummary() {
        return {
            totalContracts: Object.keys(this.logData.deployment.contracts).length,
            totalGasUsed: this.logData.deployment.gasUsed,
            totalTransactions: this.logData.deployment.transactions.length,
            deployer: this.logData.deployment.deployer,
            timestamp: this.logData.deployment.timestamp
        };
    }
}

module.exports = TestDeploymentLogger; 