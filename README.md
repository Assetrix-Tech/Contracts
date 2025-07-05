# Assetrix Investment Platform

A decentralized real estate investment platform built on Ethereum that enables property developers to raise funds and investors to participate in real estate opportunities with milestone-based fund releases.

## Features

### For Property Developers
- Create and list property investment opportunities
- Set funding goals and investment terms
- Define project milestones with fund release schedules
- Receive funds upon milestone completion
- Manage property details and documentation

### For Investors
- Browse active property investment opportunities
- Invest in properties with as little as one unit
- Track investment performance
- Request refunds if funding goals aren't met
- Monitor project progress and milestone completion

### Security Features
- Reentrancy protection on all critical functions
- Pausable contract for emergency stops
- Access control for sensitive operations
- Input validation on all user inputs
- Secure fund handling with checks-effects-interactions pattern

## Smart Contract Architecture

### Key Contracts
- **AssetrixInvestment.sol**: Main contract handling property investments and milestone management
- **Interfaces**: IERC20 for token interactions
- **OpenZeppelin**: Inherits from Ownable, ReentrancyGuard, and Pausable

### Key Data Structures
- **Property**: Contains all property and investment details
- **Milestone**: Tracks project progress and fund releases
- **Investment**: Manages investor contributions and ownership

## Installation

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Hardhat or Truffle (for local development)
- OpenZeppelin Contracts

### Setup
```bash
# Clone the repository
git clone [repository-url]
cd contract

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to network
npx hardhat run scripts/deploy.js --network [network-name]
```



## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

[Specify License]



## Acknowledgements
- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
- [Ethereum Foundation](https://ethereum.org/)
- [Hardhat](https://hardhat.org/)