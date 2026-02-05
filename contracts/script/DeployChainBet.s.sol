// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {ChainBetAdjudicator} from "../src/ChainBetAdjudicator.sol";
import {MarketFactory} from "../src/MarketFactory.sol";

/**
 * @title DeployChainBet
 * @notice Deployment script for ChainBet contracts on Sepolia
 * @dev Run with: forge script script/DeployChainBet.s.sol:DeployChainBet --rpc-url sepolia --broadcast
 */
contract DeployChainBet is Script {
    // Yellow Custody Contract on Sepolia (placeholder - replace with actual address)
    address constant YELLOW_CUSTODY_SEPOLIA = address(0); // TODO: Get from Yellow docs
    
    function run() external returns (address, address, address) {
        // Get deployer private key from env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy MockUSD (collateral token) for testing
        MockUSD mockUSD = new MockUSD();
        
        // 2. Deploy ChainBetAdjudicator
        ChainBetAdjudicator adjudicator = new ChainBetAdjudicator(
            YELLOW_CUSTODY_SEPOLIA,  // Yellow Custody Contract
            address(mockUSD)          // Collateral token
        );
        
        // 3. Deploy MarketFactory
        MarketFactory factory = new MarketFactory(
            address(mockUSD),
            address(adjudicator)
        );
        
        // 4. Mint some MockUSD to deployer for testing
        mockUSD.mint(vm.addr(deployerPrivateKey), 100000 * 10**18); // 100k MockUSD
        
        vm.stopBroadcast();
        
        return (address(mockUSD), address(adjudicator), address(factory));
    }
}
