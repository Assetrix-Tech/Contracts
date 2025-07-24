# Assetrix Smart Contract Payment Architecture

## Overview

This document explains the payment architecture of the Assetrix platform, focusing on the distinction between hybrid (on-chain + off-chain) and fully centralized (off-chain only) payment systems, and the implications for smart contract design and user experience.

---

## 1. Current Hybrid Payment System

### How It Works

- **Investments (Token Purchases):**  
  Users purchase property tokens by sending stablecoins (e.g., USDT) directly to the smart contract. The contract checks and pulls funds from the user's wallet on-chain.

- **Refunds and Payouts:**  
  The contract emits events (such as `RefundAvailable` and `PayoutAvailable`) but does not transfer funds on-chain. The backend listens to these events and processes the actual money movement (crediting dashboards, bank transfers, etc.) off-chain.

### Summary Table

| Action                | On-Chain? | How?                                              |
|-----------------------|-----------|---------------------------------------------------|
| Fund account          | Yes       | User sends stablecoin via on-chain transaction     |
| Buy tokens            | Yes       | Contract pulls stablecoin from user wallet        |
| Refund                | No        | Contract emits event, backend processes refund    |
| Payout                | No        | Contract emits event, backend processes payout    |

---

## 2. Fully Centralized Payment System (All Money Movement Off-Chain)

### How It Would Work

- All user deposits, investments, refunds, and payouts are handled by the backend and payment gateway (e.g., Blockrader).
- The smart contract only tracks token balances, property status, and emits events for the backend to act on.
- No on-chain token transfers or approvals are required.

### Required Smart Contract Changes

- Remove all on-chain token transfer logic.
- The backend is responsible for ensuring users have enough off-chain balance before updating their token holdings on-chain.
- The contract only updates records and emits events for the backend to process real-world payments.
- Restrict sensitive functions (such as updating balances) to be callable only by a trusted backend address.
- Remove any unnecessary ERC20 token references from the contract code.

### Summary Table

| Change Needed                | What to Do                                      |
|------------------------------|-------------------------------------------------|
| Remove on-chain transfers    | Delete all token transfer logic                  |
| Backend enforces payment     | Only update records, backend checks balances    |
| Emit events for actions      | Keep events for backend to listen to            |
| Restrict function access     | Use a backend-only access control               |
| Remove ERC20 code            | If not needed, delete ERC20 imports/logic       |

---

## 3. Gas Fees in a Fully Off-Chain Payment System

- **Gas fees are always required for any transaction that changes the blockchain state, even if all money movement is handled off-chain.**
- This includes actions like creating a property, recording a token purchase, updating balances, or emitting events.
- Gas fees are paid in the blockchain’s native token (e.g., ETH for Ethereum, MATIC for Polygon).
- **Who pays the gas?**
  - If users interact directly with the contract, users pay the gas fee.
  - If your backend interacts with the contract on behalf of users, the backend pays the gas fee.
- Read-only/view functions (such as checking balances or viewing property info) do not require gas and can be called for free.

### Summary Table

| Action                        | Gas Fee Required? | Who Pays?           | Why?                                      |
|-------------------------------|-------------------|---------------------|--------------------------------------------|
| Create property               | Yes               | User or Backend     | Changes blockchain state                   |
| Buy tokens (on-chain/off-chain) | Yes             | User or Backend     | Changes state, even if no token transfer   |
| Refund (event or state change)  | Yes             | User or Backend     | Emits event, updates state                 |
| Read-only/view calls          | No                | N/A                 | No state change, can be called for free    |

**In summary:**  
Switching to a fully off-chain payment system does NOT eliminate gas fees for blockchain transactions. Gas is always required for any state-changing operation on the blockchain, whether initiated by the user or your backend.

---

## 4. Why Use a Centralized Payment System?

- **Compliance & KYC:** Centralized payment allows for KYC/AML and regulatory compliance.
- **User Experience:** Users can fund their dashboard with fiat or crypto, and use that balance to invest.
- **Separation of Concerns:** The blockchain only tracks investment and ownership, not actual money movement.

---

## 5. Security and Reliability Considerations

- **Backend Reliability:** The backend must reliably listen to on-chain events and process refunds/credits accordingly.
- **Event Handling:** If the backend misses an event, a user might not get their refund.
- **Transparency:** Users should be able to see both their on-chain token status and their off-chain dashboard balance.

---

## 6. Conclusion

- The current system is hybrid: on-chain for investments, off-chain for refunds/payouts.
- To move to a fully centralized payment system, remove all on-chain fund transfers and let the backend handle all money movement.
- Gas fees are always required for any state-changing blockchain transaction, regardless of payment architecture.

---

## Coming Up

- **Meta-transactions and Gas Sponsorship:** Exploring how the backend can pay gas on behalf of users.
- **Batching Transactions:** Reducing gas costs by batching multiple updates in a single transaction.
- **Event Monitoring Best Practices:** Ensuring backend reliability and user transparency.
