// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {LvrMarket} from "./LvrMarket.sol";
import {ChainBetAdjudicator} from "./ChainBetAdjudicator.sol";

/**
 * @title MarketFactory
 * @notice Factory contract for creating prediction markets compatible with Yellow Network
 * @dev Creates LvrMarket instances and registers them with ChainBetAdjudicator
 */
contract MarketFactory {
    // ============ STRUCTS ============

    struct MarketMetadata {
        string title;
        string description;
        string category;
        string resolutionSource;
    }

    struct MarketInfo {
        address market;
        address creator;
        uint256 liquidity;
        uint256 createdAt;
        uint256 deadline;
        bool initialized;
        MarketMetadata metadata;
    }

    // ============ STATE ============

    IERC20 public immutable collateralToken;  // mUSD or USDC
    ChainBetAdjudicator public immutable adjudicator;
    
    address[] public allMarkets;
    bytes32[] public allMarketIds;
    
    mapping(bytes32 => MarketInfo) public markets;
    mapping(address => bytes32[]) public creatorMarkets;  // Track markets by creator

    uint256 public constant MIN_INITIAL_LIQUIDITY = 10 * 10**18;  // 10 tokens
    
    // ============ EVENTS ============

    event MarketCreated(
        bytes32 indexed marketId,
        address indexed market,
        address indexed creator,
        string title,
        string category,
        uint256 deadline,
        uint256 liquidity,
        uint256 timestamp
    );

    // ============ ERRORS ============

    error InsufficientLiquidity();
    error MarketAlreadyExists();
    error InvalidDuration();
    error EmptyTitle();

    // ============ CONSTRUCTOR ============

    constructor(address _collateralToken, address _adjudicator) {
        collateralToken = IERC20(_collateralToken);
        adjudicator = ChainBetAdjudicator(_adjudicator);
    }

    // ============ MARKET CREATION ============

    /**
     * @notice Create a new prediction market
     * @param title Market title/question
     * @param description Detailed description
     * @param category Category (e.g., "Crypto", "Politics", "Sports")
     * @param resolutionSource How market will be resolved
     * @param isDynamic Whether liquidity decays over time
     * @param duration How long until market closes (seconds)
     * @param collateralIn Initial liquidity amount
     * @return marketId Unique identifier for the market
     * @return marketAddress Address of deployed LvrMarket contract
     */
    function createMarket(
        string memory title,
        string memory description,
        string memory category,
        string memory resolutionSource,
        bool isDynamic,
        uint256 duration,
        uint256 collateralIn
    ) 
        external 
        returns (bytes32 marketId, address marketAddress) 
    {
        // Validation
        if (collateralIn < MIN_INITIAL_LIQUIDITY) revert InsufficientLiquidity();
        if (duration == 0) revert InvalidDuration();
        if (bytes(title).length == 0) revert EmptyTitle();
        
        // Generate unique market ID
        marketId = keccak256(abi.encodePacked(
            title,
            msg.sender,
            block.timestamp,
            allMarkets.length
        ));
        
        if (markets[marketId].initialized) revert MarketAlreadyExists();
        
        // Deploy new LvrMarket contract
        LvrMarket market = new LvrMarket(
            address(this),      // router (this contract acts as router)
            isDynamic,
            duration,
            address(collateralToken),
            msg.sender          // admin/creator
        );
        
        marketAddress = address(market);
        
        // Transfer collateral from creator to market
        require(
            collateralToken.transferFrom(msg.sender, marketAddress, collateralIn),
            "Transfer failed"
        );
        
        // Initialize market liquidity
        uint256 liquidity = market.initializeLiquidity(collateralIn);
        
        // Store market info
        markets[marketId] = MarketInfo({
            market: marketAddress,
            creator: msg.sender,
            liquidity: liquidity,
            createdAt: block.timestamp,
            deadline: block.timestamp + duration,
            initialized: true,
            metadata: MarketMetadata({
                title: title,
                description: description,
                category: category,
                resolutionSource: resolutionSource
            })
        });
        
        // Update arrays for enumeration
        allMarkets.push(marketAddress);
        allMarketIds.push(marketId);
        creatorMarkets[msg.sender].push(marketId);
        
        // Authorize market in adjudicator for settlements
        adjudicator.setMarketAuthorization(marketAddress, true);
        
        emit MarketCreated(
            marketId,
            marketAddress,
            msg.sender,
            title,
            category,
            block.timestamp + duration,
            liquidity,
            block.timestamp
        );
        
        return (marketId, marketAddress);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get total number of markets
     */
    function getMarketCount() external view returns (uint256) {
        return allMarkets.length;
    }

    /**
     * @notice Get market by index
     * @param index Index in allMarkets array
     */
    function getMarketAtIndex(uint256 index) 
        external 
        view 
        returns (address market, bytes32 marketId) 
    {
        require(index < allMarkets.length, "Index out of bounds");
        return (allMarkets[index], allMarketIds[index]);
    }

    /**
     * @notice Get full market metadata
     * @param marketId Market identifier
     */
    function getMarketMetadata(bytes32 marketId)
        external
        view
        returns (
            address market,
            address creator,
            uint256 liquidity,
            uint256 deadline,
            string memory title,
            string memory description,
            string memory category,
            string memory resolutionSource
        )
    {
        MarketInfo storage info = markets[marketId];
        require(info.initialized, "Market does not exist");
        
        return (
            info.market,
            info.creator,
            info.liquidity,
            info.deadline,
            info.metadata.title,
            info.metadata.description,
            info.metadata.category,
            info.metadata.resolutionSource
        );
    }

    /**
     * @notice Get all markets created by a specific address
     * @param creator Address of market creator
     */
    function getMarketsByCreator(address creator) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return creatorMarkets[creator];
    }

    /**
     * @notice Get all market addresses
     */
    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }

    /**
     * @notice Get all market IDs
     */
    function getAllMarketIds() external view returns (bytes32[] memory) {
        return allMarketIds;
    }

    /**
     * @notice Get market info by ID
     * @param marketId Market identifier
     */
    function getMarketInfo(bytes32 marketId) 
        external 
        view 
        returns (MarketInfo memory) 
    {
        require(markets[marketId].initialized, "Market does not exist");
        return markets[marketId];
    }

    // ============ ROUTER FUNCTIONS (for LvrMarket compatibility) ============
    
    // These are called by LvrMarket contracts during buy/sell/bond/redeem
    // In the original Router, these handle token transfers
    // For Yellow integration, we'll need to adapt these

    function marketBuyCallback(uint256 collateralIn, bytes calldata data) external {
        // Called by LvrMarket during buy operations
        // In Yellow context, this might not be needed since trading is off-chain
        // Keeping for compatibility
        (address collateral, address buyer) = abi.decode(data, (address, address));
        IERC20(collateral).transferFrom(buyer, msg.sender, collateralIn);
    }

    function marketSellCallback(uint256 tokenIn, bytes calldata data) external {
        (address tokenToSell, address seller) = abi.decode(data, (address, address));
        IERC20(tokenToSell).transferFrom(seller, msg.sender, tokenIn);
    }

    function marketRedeemCallback(uint256 amountYes, uint256 amountNo, bytes calldata data) external {
        (address yesToken, address noToken, address redeemer) = abi.decode(data, (address, address, address));
        IERC20(yesToken).transferFrom(redeemer, msg.sender, amountYes);
        IERC20(noToken).transferFrom(redeemer, msg.sender, amountNo);
    }

    function marketBondCallback(uint256 bond, bytes calldata data) external {
        (address collateral, address proposer) = abi.decode(data, (address, address));
        IERC20(collateral).transferFrom(proposer, msg.sender, bond);
    }
}
