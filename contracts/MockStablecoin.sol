// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
 
contract MockStablecoin is ERC20 {
    constructor() ERC20("Mock Naira", "NGN") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }
    
    function decimals() public pure override returns (uint8) {
        return 2; // Naira uses 2 decimal places
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
} 