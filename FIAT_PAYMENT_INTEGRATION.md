# Fiat Payment Integration Guide

## What This Does

This system allows users to pay with Naira (Nigerian currency) and automatically receive tokens on the blockchain. Think of it like buying crypto with your local bank account.

## How It Works (Simple Version)

1. **User wants to buy tokens** → Pays with Naira via Paystack
2. **Payment is processed** → Backend verifies the payment
3. **Tokens are sent** → Smart contract automatically gives tokens to the user
4. **User gets tokens** → They can now use their tokens on the platform

## Key Terms Explained

### What is a "Nonce"?
A nonce is like a unique receipt number for each transaction. It prevents the same payment from being processed twice.

**Example**: If you pay ₦10,000 today, you get receipt #001. If you pay ₦10,000 tomorrow, you get receipt #002. This prevents someone from copying your first payment and trying to use it again.

## Smart Contract Features

### Security Features
- **Signature Verification**: Only your backend can distribute tokens
- **Payment Tracking**: Each payment has a unique ID to prevent duplicates
- **Receipt Numbers**: Each user gets a unique number that increases with each payment

### No Fees
- Users pay exactly what they want to invest
- No additional processing fees
- Direct token distribution

## Backend Setup (For Developers)

### 1. Environment Variables
```bash
# .env file
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
BACKEND_PRIVATE_KEY=your_backend_private_key
DIAMOND_ADDRESS=0x...
RPC_URL=https://sepolia.infura.io/v3/...
```

### 2. Payment Flow
```javascript
// 1. User initiates payment
const payment = await paystack.createPayment({
  amount: 50000, // ₦500
  email: "user@example.com",
  reference: "PAY_123456"
});

// 2. Payment is verified
const verification = await paystack.verifyPayment(reference);

// 3. Tokens are distributed
await contract.distributeTokensFromFiat(
  propertyId,
  userAddress,
  tokenAmount,
  fiatAmount,
  paymentReference,
  userNonce,
  signature
);
```

## Frontend Integration (For Developers)

### Payment Button
```javascript
const handlePayment = async () => {
  const response = await fetch('/api/create-payment', {
    method: 'POST',
    body: JSON.stringify({
      userAddress: userWallet,
      propertyId: selectedProperty,
      fiatAmount: amount,
      userEmail: email
    })
  });
  
  const { paymentUrl } = await response.json();
  window.location.href = paymentUrl; // Redirect to Paystack
};
```

## Testing

### Run Tests
```bash
npx hardhat test test/FiatPayment.test.js
```

### Run Example
```bash
npx hardhat run scripts/fiat-payment-example.js
```

## Deployment

### Deploy to Sepolia
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Set Backend Signer
```javascript
await investmentFacet.setBackendSigner(backendWalletAddress);
```

## What Happens When User Pays

1. **User clicks "Pay with Naira"** → Redirected to Paystack
2. **User enters payment details** → Pays with card/bank transfer
3. **Payment is processed** → Backend receives confirmation
4. **Tokens are calculated** → Based on current token price
5. **Tokens are sent** → User receives tokens in their wallet
6. **Transaction is recorded** → Payment reference is marked as processed

## Security Benefits

- **No Double Spending**: Each payment can only be used once
- **Verified Payments**: Only real payments from Paystack are accepted
- **Secure Signatures**: Only your backend can distribute tokens
- **Unique Receipts**: Each payment gets a unique number

## Support

For technical questions, check the test files for working examples.

