/**
 * Yellow Network Client for ChainBet
 * 
 * This is a simplified implementation based on Yellow's Nitro RPC protocol
 * For production, use the official Yellow SDK when available
 */

import { ethers } from 'ethers';
import { getSwapAmount, calcPrice } from './swapMath.js';

// Yellow Network Configuration
const YELLOW_CONFIG = {
    // These will be updated with actual Yellow testnet values
    CLEARNODE_URL: import.meta.env.VITE_YELLOW_CLEARNODE_URL || 'ws://localhost:8545',
    CUSTODY_CONTRACT: import.meta.env.VITE_YELLOW_CUSTODY_CONTRACT || '0x0000000000000000000000000000000000000000',
    CHAIN_ID: 11155111, // Sepolia
};

// Session state structure
export class SessionState {
    constructor(sessionId, user) {
        this.sessionId = sessionId;
        this.user = user;
        this.availableBalance = 0n;
        this.positions = [];
        this.collateralChains = {};
        this.stateVersion = 0;
        this.timestamp = Date.now();
    }
}

// Position structure
export class Position {
    constructor(market, side, tokenAmount, investmentAmount, isCollateralBased = false, parentMarket = null) {
        this.market = market;
        this.side = side; // true = YES, false = NO
        this.tokenAmount = tokenAmount;
        this.investmentAmount = investmentAmount;
        this.isCollateralBased = isCollateralBased;
        this.parentMarket = parentMarket;
        this.timestamp = Date.now();
    }
}

/**
 * Yellow Network Client
 * Manages off-chain trading sessions via Nitro RPC
 */
export class YellowClient {
    constructor(provider, signer) {
        this.provider = provider;
        this.signer = signer;
        this.ws = null;
        this.sessionState = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.eventListeners = new Map();

        // Cache for market reserves (updated from contract)
        this.marketReserves = new Map(); // marketId -> { yesReserve, noReserve, liquidity }
    }

    /**
     * Connect to Yellow Clearnode
     */
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(YELLOW_CONFIG.CLEARNODE_URL);

                this.ws.onopen = () => {
                    console.log('Connected to Yellow Clearnode');
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this._handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    console.error('Yellow Clearnode error:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('Disconnected from Yellow Clearnode');
                    this._reconnect();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle incoming messages from Clearnode
     */
    _handleMessage(data) {
        try {
            const message = JSON.parse(data);
            const [requestId, method, result] = message;

            // Handle response to request
            if (this.pendingRequests.has(requestId)) {
                const { resolve, reject } = this.pendingRequests.get(requestId);
                this.pendingRequests.delete(requestId);

                if (result.error) {
                    reject(new Error(result.error));
                } else {
                    resolve(result);
                }
            }

            // Handle push notifications
            if (method === 'balance_update' || method === 'price_update') {
                this._emit(method, result);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    /**
     * Call Nitro RPC method
     * @param {string} method - RPC method name
     * @param {object} params - Method parameters
     * @returns {Promise} - Result
     */
    async call(method, params = {}) {
        // For hackathon demo, simulate off-chain processing
        // In production, this would send actual Nitro RPC calls

        const requestId = ++this.requestId;

        console.log(`[Yellow RPC] ${method}`, params);

        // Simulate off-chain processing
        switch (method) {
            case 'market_buy':
                return this._handleMarketBuy(params);

            case 'market_sell':
                return this._handleMarketSell(params);

            case 'chain_extend':
                return this._handleChainExtend(params);

            case 'market_price':
                return this._handleMarketPrice(params);

            case 'user_positions':
                return this._handleUserPositions();

            case 'user_balance':
                return this._handleUserBalance();

            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }

    /**
     * Open a Yellow Network session
     */
    async openSession(depositAmount) {
        const address = await this.signer.getAddress();
        const sessionId = ethers.randomBytes(32);

        // Create session state
        this.sessionState = new SessionState(
            ethers.hexlify(sessionId),
            address
        );
        this.sessionState.availableBalance = depositAmount;

        console.log('[Yellow] Session opened:', {
            sessionId: this.sessionState.sessionId,
            user: address,
            balance: depositAmount.toString()
        });

        return this.sessionState;
    }

    /**
     * Close session and return final state for settlement
     */
    async closeSession() {
        if (!this.sessionState) {
            throw new Error('No active session');
        }

        // Sign final state
        const stateHash = this._hashSessionState(this.sessionState);
        const userSignature = await this.signer.signMessage(ethers.getBytes(stateHash));

        // In production, get clearnode signature too
        const clearnodeSignature = '0x' + '00'.repeat(65); // Placeholder

        const finalState = {
            sessionId: this.sessionState.sessionId,
            user: this.sessionState.user,
            positions: this.sessionState.positions,
            timestamp: Date.now(),
            stateVersion: this.sessionState.stateVersion,
            userSignature,
            clearnodeSignature
        };

        console.log('[Yellow] Session closed:', finalState);

        return finalState;
    }

    /**
     * Calculate LVR/LMSR pricing for buying tokens
     * Uses logarithmic market scoring rule for prediction markets
     */
    _calculateLMSRBuy(yesSupply, noSupply, liquidity, buyYes, amount) {
        // LMSR parameter b = liquidity / ln(2)
        // This controls market sensitivity
        const b = Number(liquidity) / Math.log(2);

        // Current reserves
        const currentYes = Number(yesSupply);
        const currentNo = Number(noSupply);

        // Cost function: C(q) = b * ln(exp(q_yes/b) + exp(q_no/b))
        const currentCost = b * Math.log(Math.exp(currentYes / b) + Math.exp(currentNo / b));

        // Calculate new reserves after purchase
        const amountNum = Number(amount) / 1e18; // Convert from wei
        let newYes, newNo, newCost;

        if (buyYes) {
            // Buying YES tokens - solve for how many tokens we get
            // We want: C(newYes, currentNo) - C(currentYes, currentNo) = amountNum
            // Approximate using iterative method for accuracy
            let tokensToReceive = amountNum; // Start with 1:1 guess
            for (let i = 0; i < 10; i++) {
                newYes = currentYes + tokensToReceive;
                newCost = b * Math.log(Math.exp(newYes / b) + Math.exp(currentNo / b));
                const actualCost = newCost - currentCost;
                const error = actualCost - amountNum;
                tokensToReceive -= error * 0.5; // Adjust
                if (Math.abs(error) < 0.001) break;
            }
            return BigInt(Math.floor(tokensToReceive * 1e18));
        } else {
            // Buying NO tokens
            let tokensToReceive = amountNum;
            for (let i = 0; i < 10; i++) {
                newNo = currentNo + tokensToReceive;
                newCost = b * Math.log(Math.exp(currentYes / b) + Math.exp(newNo / b));
                const actualCost = newCost - currentCost;
                const error = actualCost - amountNum;
                tokensToReceive -= error * 0.5;
                if (Math.abs(error) < 0.001) break;
            }
            return BigInt(Math.floor(tokensToReceive * 1e18));
        }
    }

    /**
     * Handle market buy (off-chain)
     * Matches LvrMarket.sol:buy() logic exactly
     */
    _handleMarketBuy(params) {
        const { marketId, side, amount, slippage, reserves } = params;

        if (!this.sessionState) {
            throw new Error('No active session');
        }

        if (this.sessionState.availableBalance < amount) {
            throw new Error('Insufficient balance');
        }

        // Use provided reserves or fallback to cached/default
        let yesSupply, noSupply, totalLiquidity;

        if (reserves) {
            // Use actual reserves from contract
            yesSupply = BigInt(reserves.yesReserve);
            noSupply = BigInt(reserves.noReserve);
            totalLiquidity = BigInt(reserves.liquidity);

            console.log('[Yellow] Using actual contract reserves:', {
                yesSupply: yesSupply.toString(),
                noSupply: noSupply.toString(),
                liquidity: totalLiquidity.toString()
            });
        } else {
            // Fallback to defaults (should not happen in production)
            console.warn('[Yellow] No reserves provided, using fallback 50/50');
            totalLiquidity = 1000n * BigInt(1e18);
            yesSupply = totalLiquidity / 2n;
            noSupply = totalLiquidity / 2n;
        }

        // Calculate swap amount using PMMA
        // Contract does: _swap(!isBuyYes, amountIn)
        const swapAmount = getSwapAmount(
            !side, // If buying YES, we swap NO→YES (pass false)
            yesSupply,
            noSupply,
            totalLiquidity,
            amount
        );

        // CRITICAL: Match contract exactly
        // Contract mints amountIn YES + amountIn NO,
        // then transfers amountIn + swapAmount of chosen token
        const totalTokens = amount + swapAmount;

        // Update cached reserves to simulate state change
        if (reserves) {
            const newYesReserve = side ? yesSupply + amount : yesSupply - swapAmount + amount;
            const newNoReserve = side ? noSupply - swapAmount + amount : noSupply + amount;

            this.marketReserves.set(marketId, {
                yesReserve: newYesReserve,
                noReserve: newNoReserve,
                liquidity: totalLiquidity
            });
        }

        console.log('[Yellow] PMMA pricing:', {
            investmentWei: amount.toString(),
            investmentUSD: Number(amount) / 1e18,
            swapAmountWei: swapAmount.toString(),
            swapAmountTokens: Number(swapAmount) / 1e18,
            totalTokensWei: totalTokens.toString(),
            totalTokensHuman: Number(totalTokens) / 1e18,
            side: side ? 'YES' : 'NO',
            formula: `${Number(amount) / 1e18} + ${Number(swapAmount) / 1e18} = ${Number(totalTokens) / 1e18}`
        });

        // Create position
        const position = new Position(
            marketId,
            side,
            totalTokens,
            amount,
            false,
            null
        );

        // Update state
        this.sessionState.availableBalance -= amount;
        this.sessionState.positions.push(position);
        this.sessionState.stateVersion++;

        console.log('[Yellow] Market buy executed:', {
            market: marketId,
            side: side ? 'YES' : 'NO',
            amount: amount.toString(),
            tokens: totalTokens.toString(),
            newBalance: this.sessionState.availableBalance.toString()
        });

        // Return result
        return {
            success: true,
            tokensReceived: Number(totalTokens) / 1e18,
            newBalance: this.sessionState.availableBalance,
        };
    }

    /**
     * Calculate LVR/LMSR pricing for selling tokens
     */
    _calculateLMSRSell(yesSupply, noSupply, liquidity, sellYes, tokenAmount) {
        const b = Number(liquidity) / Math.log(2);
        const currentYes = Number(yesSupply);
        const currentNo = Number(noSupply);

        const currentCost = b * Math.log(Math.exp(currentYes / b) + Math.exp(currentNo / b));

        const tokensNum = Number(tokenAmount) / 1e18;
        let newYes, newNo, newCost;

        if (sellYes) {
            newYes = currentYes - tokensNum;
            newCost = b * Math.log(Math.exp(newYes / b) + Math.exp(currentNo / b));
        } else {
            newNo = currentNo - tokensNum;
            newCost = b * Math.log(Math.exp(currentYes / b) + Math.exp(newNo / b));
        }

        const payout = currentCost - newCost; // You get back the difference
        return BigInt(Math.floor(payout * 1e18));
    }

    /**
     * Handle market sell (off-chain)
     */
    _handleMarketSell(params) {
        const { marketId, side, amount } = params;

        if (!this.sessionState) {
            throw new Error('No active session');
        }

        // Find position
        const positionIndex = this.sessionState.positions.findIndex(
            p => p.market === marketId && p.side === side && !p.isCollateralBased
        );

        if (positionIndex === -1) {
            throw new Error('No position found');
        }

        const position = this.sessionState.positions[positionIndex];

        if (position.tokenAmount < amount) {
            throw new Error('Insufficient tokens');
        }

        // Get current market state
        const totalLiquidity = 1000n * BigInt(1e18);
        const yesSupply = totalLiquidity / 2n;
        const noSupply = totalLiquidity / 2n;

        // Calculate payout using PMMA
        // Selling reverses the buy process
        const payout = getSwapAmount(
            side, // If selling YES, swap YES→NO (pass true)
            yesSupply,
            noSupply,
            totalLiquidity,
            amount
        );

        console.log('[Yellow] PMMA sell pricing:', {
            tokensWei: amount.toString(),
            tokensHuman: Number(amount) / 1e18,
            payoutWei: payout.toString(),
            payoutUSD: Number(payout) / 1e18
        });

        // Update position
        position.tokenAmount -= amount;
        if (position.tokenAmount === 0n) {
            this.sessionState.positions.splice(positionIndex, 1);
        }

        this.sessionState.availableBalance += payout;
        this.sessionState.stateVersion++;

        return {
            payout: payout,
            newBalance: this.sessionState.availableBalance,
        };
    }


    /**
 * Handle conviction chain extension (off-chain)
 */
    _handleChainExtend(params) {
        const { parentMarket, childMarket, collateralAmount, side } = params;

        if (!this.sessionState) {
            throw new Error('No active session');
        }

        // Find parent position
        const parentPosition = this.sessionState.positions.find(
            p => p.market === parentMarket && !p.isCollateralBased
        );

        if (!parentPosition) {
            throw new Error('Parent position not found');
        }

        // Calculate available collateral (60% of investment)
        const maxCollateral = (parentPosition.investmentAmount * 60n) / 100n;

        // Check existing collateral usage
        const chain = this.sessionState.collateralChains[parentMarket] || {
            totalUsed: 0n,
            children: []
        };

        const availableCollateral = maxCollateral - chain.totalUsed;

        if (availableCollateral < collateralAmount) {
            throw new Error(`Insufficient collateral. Available: ${availableCollateral}, Requested: ${collateralAmount}`);
        }

        // Simulate pricing
        const currentPrice = 0.5;
        const tokens = (Number(collateralAmount) * 1e18) / (currentPrice * 1e18);

        // Create child position
        const childPosition = new Position(
            childMarket,
            side,
            BigInt(Math.floor(tokens)),
            collateralAmount,
            true,
            parentMarket
        );

        // Update state
        this.sessionState.positions.push(childPosition);
        chain.totalUsed += collateralAmount;
        chain.children.push(childMarket);
        this.sessionState.collateralChains[parentMarket] = chain;
        this.sessionState.stateVersion++;

        console.log('[Yellow] Chain extended:', {
            parent: parentMarket,
            child: childMarket,
            collateral: collateralAmount.toString(),
            availableRemaining: (availableCollateral - collateralAmount).toString()
        });

        return {
            position: childPosition,
            availableCollateral: availableCollateral - collateralAmount,
            tokensReceived: tokens
        };
    }

    /**
     * Get market price (off-chain simulation)
     */
    _handleMarketPrice(params) {
        // In production, query actual market state
        return {
            yesPrice: 0.5,
            noPrice: 0.5
        };
    }

    /**
     * Get user positions
     */
    _handleUserPositions() {
        if (!this.sessionState) {
            return { positions: [] };
        }

        return {
            positions: this.sessionState.positions
        };
    }

    /**
     * Get user balance
     */
    _handleUserBalance() {
        if (!this.sessionState) {
            return { available: 0n, locked: 0n, total: 0n };
        }

        const locked = this.sessionState.positions.reduce(
            (sum, p) => sum + (p.isCollateralBased ? 0n : p.investmentAmount),
            0n
        );

        return {
            available: this.sessionState.availableBalance,
            locked,
            total: this.sessionState.availableBalance + locked
        };
    }

    /**
     * Hash session state for signing
     */
    _hashSessionState(state) {
        // Use user from state, or fallback to a zero address if not set
        const userAddress = state.user || state.userId || ethers.ZeroAddress;

        const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes32', 'address', 'uint256', 'uint256'],
            [state.sessionId, userAddress, state.stateVersion, state.timestamp]
        );
        return ethers.keccak256(encoded);
    }

    /**
     * Reconnect to Clearnode
     */
    async _reconnect() {
        console.log('Attempting to reconnect...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
            await this.connect();
        } catch (error) {
            console.error('Reconnection failed:', error);
        }
    }

    /**
     * Subscribe to events
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Emit event
     */
    _emit(event, data) {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => callback(data));
    }

    /**
     * Get gas savings (demo counter)
     */
    getGasSavings() {
        if (!this.sessionState) return 0;

        const transactionCount = this.sessionState.stateVersion;
        const avgGasPrice = 15; // $15 per tx on Ethereum

        return transactionCount * avgGasPrice;
    }
}

export default YellowClient;
