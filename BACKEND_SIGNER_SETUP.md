# Backend Signer Setup Guide

## 🎯 What is a Backend Signer?

The backend signer is a wallet that authorizes fiat payments on your smart contract. When someone pays with Naira, your backend uses this signer to approve the payment before tokens are distributed to the user.

## 🚀 Setting Up Backend Signer

### For Development (Testnet)
```bash
# Quick setup - creates a wallet automatically
npx hardhat run scripts/set-backend-signer.js --network sepolia
```

### For Production (Mainnet)
```bash
# Option 1: Use your own wallet address
set BACKEND_SIGNER_ADDRESS=0xYourWalletAddress
npx hardhat run scripts/set-backend-signer.js --network mainnet

# Option 2: Let script create a new wallet
npx hardhat run scripts/set-backend-signer.js --network mainnet
```

## 📋 What You'll Get

The script will show you important information. **Save this somewhere safe:**

```
🔑 Created wallet: 0xABC123DEF456...
🔑 Private key: 0x1234567890ABCDEF...
```

## 🔧 Using in Your Backend

### With Private Key:
```javascript
// In your backend code
const privateKey = "0x1234567890ABCDEF..."; // From the script output
const wallet = new ethers.Wallet(privateKey);

// Sign payment authorization
const signature = await wallet.signTypedData(domain, types, paymentData);
```

### With External Wallet:
```javascript
// Connect to your external wallet
const transport = await TransportWebUSB.create();
const eth = new Eth(transport);

// Sign payment authorization
const signature = await eth.signEIP712Message(path, domain, message);
```

## 🔄 Managing Different Environments

### Development Environment
```bash
# Set up for development (Sepolia testnet)
npx hardhat run scripts/set-backend-signer.js --network sepolia

# This creates a wallet for testing
# Save the private key for your development backend
```

### Production Environment
```bash
# Set up for production (Mainnet)
# Option 1: Use your own wallet
set BACKEND_SIGNER_ADDRESS=0xYourWalletAddress
npx hardhat run scripts/set-backend-signer.js --network mainnet

# Option 2: Let script create a new wallet
npx hardhat run scripts/set-backend-signer.js --network mainnet

# Both options work for real transactions
```

### Switching Between Environments

#### From Development to Production:
1. **Get your production wallet address**
2. **Update production environment**:
   ```bash
   set BACKEND_SIGNER_ADDRESS=0xYourWalletAddress
   npx hardhat run scripts/set-backend-signer.js --network mainnet
   ```
3. **Update your backend code** to use the production wallet

#### From Production to Development:
1. **Clear wallet address**:
   ```bash
   set BACKEND_SIGNER_ADDRESS=
   ```
2. **Run script for development**:
   ```bash
   npx hardhat run scripts/set-backend-signer.js --network sepolia
   ```

## 📋 What the Script Does

1. **Connects to your smart contract**
2. **Checks if a backend signer is already set**
3. **Creates a new wallet OR uses your specified wallet**
4. **Sets the wallet as the authorized signer**
5. **Prepares the system for EIP-712 signatures**
6. **Saves all information to deployment files**

## 🔍 Understanding the Output

### Successful Setup:
```
🎉 Backend signer setup complete!
📋 Backend Signer: 0xABC123DEF456...
📋 Type: Generated
```

### What Each Line Means:
- **Backend Signer**: The wallet address that can approve payments
- **Type**: "Generated" (auto-created) or "External" (from environment)

## ⚠️ Security Notes

### For Development:
- ✅ **Safe for testing**
- ❌ **Not for real money**
- 💡 **Use only for development**

### For Production:
- ✅ **Safe for real transactions**
- ✅ **Use secure wallet**
- 💡 **Keep private keys safe**

## 🎯 Common Questions

### Q: Do I need a specific wallet to start?
**A**: No! You can start with an auto-generated wallet for development.

### Q: When should I use my own wallet?
**A**: When you're ready to handle real money (production).

### Q: Can I change the backend signer later?
**A**: Yes! You can always update it by running the script again.

### Q: What happens if I lose the private key?
**A**: You'll need to create a new one and update the signer.

### Q: How do I know it's working?
**A**: The script will show "✅ Backend signer set successfully!" and display the backend signer address.

### Q: Can I use the same signer for both development and production?
**A**: No! Use different signers:
- **Development**: Generated wallet on Sepolia testnet
- **Production**: Generated or external wallet on Mainnet

### Q: How do I switch between environments?
**A**: 
- **For development**: Don't set `BACKEND_SIGNER_ADDRESS`, run script on Sepolia
- **For production**: Set `BACKEND_SIGNER_ADDRESS`, run script on Mainnet

## 📞 Getting Help

### If the script fails:
1. **Check your network connection**
2. **Make sure contracts are deployed first**
3. **Verify your wallet address format**
4. **Check the error message for clues**

### If you need to start over:
1. **Run the script again** - it will update the existing setup
2. **Or deploy contracts again** if needed

## 🎉 Summary

### For Development:
1. **Run script on Sepolia** (creates generated wallet)
2. **Save private key** for backend use
3. **Test fiat payments** safely

### For Production:
1. **Choose your approach**:
   - Use your own wallet (set BACKEND_SIGNER_ADDRESS)
   - Let script create a new wallet
2. **Run script on Mainnet**
3. **Use the wallet** in backend

**That's it! You can now manage both development and production environments.** 🚀 