// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {LvrMarket} from "./LvrMarket.sol";

/**
 * @title ChainBetAdjudicator
 * @notice Validates and settles Yellow Network session states with conviction chain logic
 * @dev Works with Yellow Custody Contract to finalize user payouts
 */
contract ChainBetAdjudicator {
    // ============ STRUCTS ============

    struct Position {
        address market;              // LvrMarket contract address
        bool side;                   // true = YES, false = NO
        uint256 tokenAmount;         // Amount of YES/NO tokens owned
        uint256 investmentAmount;    // Original USDC spent (for collateral calc)
        bool isCollateralBased;      // True if position used parent collateral
        address parentMarket;        // Parent market if collateral-based
    }

    struct SessionState {
        bytes32 sessionId;
        address user;
        Position[] positions;
        uint256 timestamp;
        uint256 stateVersion;
        bytes userSignature;
        bytes clearnodeSignature;
    }

    struct CollateralChain {
        address parentMarket;
        uint256 totalCollateralUsed;
        address[] childMarkets;
    }

    // ============ STATE ============

    address public immutable custodyContract;  // Yellow Custody Contract
    address public immutable collateralToken;  // USDC or mUSD
    
    uint256 public constant COLLATERAL_RATIO = 60; // 60% of investment can be used as collateral
    
    mapping(bytes32 => bool) public settledSessions;  // Prevent double-settlement
    mapping(address => bool) public authorizedMarkets; // Only deployed markets can settle

    // ============ EVENTS ============

    event SessionSettled(
        bytes32 indexed sessionId,
        address indexed user,
        uint256 payout,
        uint256 positionCount,
        uint256 timestamp
    );

    event MarketAuthorized(address indexed market, bool authorized);

    // ============ ERRORS ============

    error SessionAlreadySettled();
    error InvalidSignature();
    error MarketNotResolved(address market);
    error MarketNotAuthorized(address market);
    error InvalidCollateralChain();
    error InsufficientCollateral();

    // ============ CONSTRUCTOR ============

    constructor(address _custodyContract, address _collateralToken) {
        custodyContract = _custodyContract;
        collateralToken = _collateralToken;
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Authorize a market contract to be used in settlements
     * @param market Address of LvrMarket contract
     * @param authorized Whether market is authorized
     */
    function setMarketAuthorization(address market, bool authorized) external {
        // In production, add onlyOwner modifier
        authorizedMarkets[market] = authorized;
        emit MarketAuthorized(market, authorized);
    }

    // ============ SETTLEMENT FUNCTIONS ============

    /**
     * @notice Settle a Yellow Network session and calculate final payout
     * @param state The final signed state from off-chain trading
     * @return payout Total amount to be paid to user
     */
    function settleSession(SessionState calldata state) 
        external 
        returns (uint256 payout) 
    {
        // Prevent double settlement
        if (settledSessions[state.sessionId]) revert SessionAlreadySettled();
        
        // Validate signatures (simplified for hackathon - in production use ECRecover)
        _validateSignatures(state);
        
        // Calculate total payout including chain logic
        payout = _calculatePayout(state.positions);
        
        // Mark as settled
        settledSessions[state.sessionId] = true;
        
        // In production, this would trigger transfer from Yellow Custody Contract
        // For now, we'll just emit event
        emit SessionSettled(
            state.sessionId,
            state.user,
            payout,
            state.positions.length,
            block.timestamp
        );
        
        return payout;
    }

    /**
     * @notice Calculate total payout for all positions with chain logic
     * @param positions Array of all user positions
     * @return totalPayout Sum of all winning positions
     */
    function _calculatePayout(Position[] calldata positions) 
        internal 
        view 
        returns (uint256 totalPayout) 
    {
        // For hackathon simplicity: process positions twice
        // In production, use more efficient data structures
        
        // Step 1: Process all non-collateral positions (base layer)
        for (uint256 i = 0; i < positions.length; i++) {
            Position calldata pos = positions[i];
            
            if (!authorizedMarkets[pos.market]) revert MarketNotAuthorized(pos.market);
            
            // Skip collateral-based positions in first pass
            if (pos.isCollateralBased) continue;
            
            // Get market outcome
            LvrMarket market = LvrMarket(pos.market);
            (
                LvrMarket.MarketState marketState,
                ,
                uint256 outcome,
                ,,,,
            ) = market.getMarketDetails();
            
            // Market must be resolved
            if (marketState != LvrMarket.MarketState.RESOLVED) {
                revert MarketNotResolved(pos.market);
            }
            
            // Check if this position won
            bool won = (outcome == 1 && pos.side) || (outcome == 0 && !pos.side);
            
            if (won) {
                // Winner gets their tokens converted to collateral
                totalPayout += pos.tokenAmount;
            }
        }
        
        // Step 2: Process collateral-based positions (child layer)
        for (uint256 i = 0; i < positions.length; i++) {
            Position calldata pos = positions[i];
            
            if (!pos.isCollateralBased) continue;
            
            // Check if parent won (search through parent positions)
            bool parentWon = _checkParentWon(positions, pos.parentMarket);
            
            // Child position only pays out if parent won
            if (!parentWon) {
                continue;
            }
            
            // Get market outcome
            LvrMarket market = LvrMarket(pos.market);
            (
                LvrMarket.MarketState marketState,
                ,
                uint256 outcome,
                ,,,,
            ) = market.getMarketDetails();
            
            if (marketState != LvrMarket.MarketState.RESOLVED) {
                revert MarketNotResolved(pos.market);
            }
            
            // Check if this child position won
            bool won = (outcome == 1 && pos.side) || (outcome == 0 && !pos.side);
            
            if (won) {
                totalPayout += pos.tokenAmount;
            }
        }
        
        return totalPayout;
    }
    
    /**
     * @notice Check if a parent market position won
     * @param positions All positions
     * @param parentMarket Parent market to check
     * @return won Whether parent won
     */
    function _checkParentWon(Position[] calldata positions, address parentMarket) 
        internal 
        view 
        returns (bool won) 
    {
        for (uint256 i = 0; i < positions.length; i++) {
            Position calldata pos = positions[i];
            
            // Skip if not the parent we're looking for
            if (pos.market != parentMarket) continue;
            
            // Skip collateral-based positions
            if (pos.isCollateralBased) continue;
            
            // Get market outcome
            LvrMarket market = LvrMarket(pos.market);
            (
                LvrMarket.MarketState marketState,
                ,
                uint256 outcome,
                ,,,,
            ) = market.getMarketDetails();
            
            // Check if resolved and won
            if (marketState == LvrMarket.MarketState.RESOLVED) {
                return (outcome == 1 && pos.side) || (outcome == 0 && !pos.side);
            }
        }
        
        return false;
    }

    /**
     * @notice Validate user and clearnode signatures
     * @param state Session state to validate
     */
    function _validateSignatures(SessionState calldata state) internal pure {
        // Simplified for hackathon
        // In production:
        // 1. Hash the state data
        // 2. Recover signer from userSignature
        // 3. Verify signer == state.user
        // 4. Recover signer from clearnodeSignature
        // 5. Verify signer == authorized clearnode
        
        require(state.userSignature.length > 0, "Missing user signature");
        require(state.clearnodeSignature.length > 0, "Missing clearnode signature");
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Preview payout for a given session state without settling
     * @param positions Array of positions
     * @return expectedPayout What user would receive if settled now
     */
    function previewPayout(Position[] calldata positions) 
        external 
        view 
        returns (uint256 expectedPayout) 
    {
        return _calculatePayout(positions);
    }

    /**
     * @notice Check if a session has been settled
     * @param sessionId Session ID to check
     * @return settled Whether session is settled
     */
    function isSessionSettled(bytes32 sessionId) 
        external 
        view 
        returns (bool settled) 
    {
        return settledSessions[sessionId];
    }

    /**
     * @notice Validate collateral usage for a position chain
     * @param parentInvestment Total invested in parent market
     * @param collateralUsed Total collateral used in child markets
     * @return valid Whether collateral usage is within limits
     */
    function validateCollateralUsage(
        uint256 parentInvestment,
        uint256 collateralUsed
    ) 
        external 
        pure 
        returns (bool valid) 
    {
        uint256 maxCollateral = (parentInvestment * COLLATERAL_RATIO) / 100;
        return collateralUsed <= maxCollateral;
    }
}
