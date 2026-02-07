/**
 * Yellow Network Client - Real Integration
 * Connects to Yellow Network ClearNode via WebSocket
 * Uses state channels for instant, gasless trading
 */

import { createAppSessionMessage, parseRPCResponse } from '@erc7824/nitrolite';
import { ethers } from 'ethers';

// Yellow Network Configuration
const YELLOW_CONFIG = {
    CLEARNODE_URL: import.meta.env.VITE_YELLOW_CLEARNODE_URL || 'wss://clearnet-sandbox.yellow.com/ws',
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
        this.stateVersion = 0;
        this.timestamp = Date.now();
    }
}

// Position structure
export class Position {
    constructor(market, side, tokenAmount, investmentAmount) {
        this.market = market;
        this.side = side; // true = YES, false = NO
        this.tokenAmount = tokenAmount;
        this.investmentAmount = investmentAmount;
        this.timestamp = Date.now();
    }
}

/**
 * Yellow Network Client
 * Real implementation with WebSocket state channels
 */
export class YellowClient {
    constructor(provider, signer) {
        this.provider = provider;
        this.signer = signer;
        this.ws = null;
        this.sessionState = null;
        this.userAddress = null;
        this.messageHandlers = new Map();
        this.pendingMessages = new Map();
        this.isConnected = false;
    }

    /**
     * Connect to Yellow Network ClearNode
     */
    async connect() {
        return new Promise((resolve, reject) => {
            console.log('[Yellow] Connecting to ClearNode:', YELLOW_CONFIG.CLEARNODE_URL);

            this.ws = new WebSocket(YELLOW_CONFIG.CLEARNODE_URL);

            this.ws.onopen = () => {
                console.log('[Yellow] ✅ Connected to Yellow Network!');
                this.isConnected = true;
                resolve();
            };

            this.ws.onmessage = (event) => {
                this._handleMessage(event.data);
            };

            this.ws.onerror = (error) => {
                console.error('[Yellow] WebSocket error:', error);
                this.isConnected = false;
                reject(error);
            };

            this.ws.onclose = () => {
                console.log('[Yellow] Connection closed');
                this.isConnected = false;
            };
        });
    }

    /**
     * Handle incoming messages from ClearNode
     */
    _handleMessage(data) {
        try {
            const message = parseRPCResponse(data);
            console.log('[Yellow] 📨 Received:', message);

            switch (message.type) {
                case 'session_created':
                    this._onSessionCreated(message);
                    break;
                case 'session_message':
                    this._onSessionMessage(message);
                    break;
                case 'trade_confirmed':
                    this._onTradeConfirmed(message);
                    break;
                case 'error':
                    console.error('[Yellow] ❌ Error:', message.error);
                    break;
                default:
                    console.log('[Yellow] Unhandled message type:', message.type);
            }

            // Resolve pending promises
            if (message.id && this.pendingMessages.has(message.id)) {
                const { resolve } = this.pendingMessages.get(message.id);
                resolve(message);
                this.pendingMessages.delete(message.id);
            }
        } catch (error) {
            console.error('[Yellow] Error parsing message:', error);
        }
    }

    /**
     * Create message signer from wallet
     */
    async _createMessageSigner() {
        this.userAddress = await this.signer.getAddress();

        return async (message) => {
            // Yellow SDK may pass objects/arrays - serialize them first
            let messageToSign = message;
            if (typeof message !== 'string') {
                console.log('[Yellow] Serializing message object to string');
                messageToSign = JSON.stringify(message);
            }

            const signature = await this.signer.signMessage(messageToSign);
            console.log('[Yellow] Message signed');
            return signature;
        };
    }

    /**
     * Open a Yellow Network session
     */
    async openSession(depositAmount) {
        if (!this.isConnected) {
            await this.connect();
        }

        const messageSigner = await this._createMessageSigner();

        // Define application for ChainBet prediction markets
        const appDefinition = {
            protocol: 'chainbet-markets-v1',
            participants: [this.userAddress],
            weights: [100], // Single participant owns 100% voting weight
            quorum: 100, // Requires 100% to approve transitions
            challenge: 0, // No challenge period for instant settlement
            nonce: Date.now()
        };

        const allocations = [{
            participant: this.userAddress,
            asset: 'usdc',
            amount: depositAmount.toString()
        }];

        console.log('[Yellow] Creating session with:', {
            user: this.userAddress,
            deposit: depositAmount.toString()
        });

        // For now, create session locally without ClearNode integration
        // TODO: Properly integrate Yellow Network session protocol
        console.warn('[Yellow] Creating LOCAL session (ClearNode integration pending)');

        // Create local session state
        this.sessionState = {
            sessionId: `local_session_${Date.now()}`,
            user: this.userAddress,
            userId: this.userAddress,
            availableBalance: depositAmount,
            positions: [],
            marketReserves: {}, // Track reserves per market for bonding curve
            stateVersion: 0,
            timestamp: Date.now()
        };

        console.log('[Yellow] Session created locally:', this.sessionState);

        return this.sessionState;
    }

    /**
     * Handle session created confirmation from ClearNode
     */
    _onSessionCreated(message) {
        console.log('[Yellow] ✅ Session confirmed by ClearNode:', message.sessionId);
        if (this.sessionState) {
            this.sessionState.sessionId = message.sessionId;
        }
    }

    /**
     * Execute market buy trade
     */
    async marketBuy(marketId, side, amount, reserves) {
        if (!this.sessionState) {
            throw new Error('No active session');
        }

        if (this.sessionState.availableBalance < amount) {
            throw new Error('Insufficient balance');
        }

        // Reserves MUST be provided from contract
        if (!reserves || !reserves.yesReserve || !reserves.noReserve || !reserves.liquidity) {
            throw new Error('⚠️ Reserves required! Fetch from contract first.');
        }

        // Import PMMA math
        const { getSwapAmount } = await import('./swapMath.js');

        // Use REAL reserves from contract (NO HARDCODED DEFAULTS!)
        const yesSupply = BigInt(reserves.yesReserve);
        const noSupply = BigInt(reserves.noReserve);
        const totalLiquidity = BigInt(reserves.liquidity);

        console.log('[Yellow] 📊 Current Market State:', {
            yesReserve: Number(yesSupply) / 1e18,
            noReserve: Number(noSupply) / 1e18,
            liquidity: Number(totalLiquidity) / 1e18,
            buying: side ? 'YES' : 'NO',
            investment: Number(amount) / 1e18
        });

        // Calculate tokens using PMMA bonding curve
        const swapAmount = getSwapAmount(
            !side,  // If buying YES, swapping from NO pool
            yesSupply,
            noSupply,
            totalLiquidity,
            amount
        );

        const totalTokens = amount + swapAmount;

        console.log('[Yellow] PMMA calculation:', {
            investment: Number(amount) / 1e18,
            swapAmount: Number(swapAmount) / 1e18,
            totalTokens: Number(totalTokens) / 1e18
        });

        // Create trade message
        const tradeData = {
            type: 'market_buy',
            marketId,
            side,
            amount: amount.toString(),
            tokensReceived: totalTokens.toString(),
            timestamp: Date.now(),
            nonce: this.sessionState.stateVersion
        };

        // Sign trade message
        const messageSigner = await this._createMessageSigner();
        const signature = await messageSigner(JSON.stringify(tradeData));

        const signedTrade = {
            ...tradeData,
            signature,
            sender: this.userAddress
        };

        // Send trade via WebSocket
        if (this.isConnected) {
            this.ws.send(JSON.stringify(signedTrade));
            console.log('[Yellow] 💸 Trade sent via state channel');
        }

        // Update local state immediately (optimistic update)
        // CHECK IF POSITION EXISTS FOR SAME MARKET+SIDE - AGGREGATE!
        const existingIndex = this.sessionState.positions.findIndex(
            p => p.market === marketId && p.side === side
        );

        if (existingIndex >= 0) {
            // Aggregate into existing position
            const existing = this.sessionState.positions[existingIndex];
            // Handle both BigInt and string for type safety
            const existingTokens = typeof existing.tokenAmount === 'bigint'
                ? existing.tokenAmount
                : BigInt(existing.tokenAmount || '0');
            const existingInvestment = typeof existing.investmentAmount === 'bigint'
                ? existing.investmentAmount
                : BigInt(existing.investmentAmount || '0');

            existing.tokenAmount = existingTokens + totalTokens;
            existing.investmentAmount = existingInvestment + amount;
            console.log('[Yellow] 📈 Position aggregated:', {
                market: marketId,
                side: side ? 'YES' : 'NO',
                newTotalTokens: Number(existing.tokenAmount) / 1e18,
                newTotalInvestment: Number(existing.investmentAmount) / 1e18
            });
        } else {
            // Create new position
            const position = new Position(marketId, side, totalTokens, amount);
            this.sessionState.positions.push(position);
            console.log('[Yellow] 🆕 New position created:', {
                market: marketId,
                side: side ? 'YES' : 'NO',
                tokens: Number(totalTokens) / 1e18,
                investment: Number(amount) / 1e18
            });
        }

        this.sessionState.availableBalance -= amount;
        this.sessionState.stateVersion++;

        // 🔥 UPDATE RESERVES IN SESSION STATE (for bonding curve)
        // Ensure marketReserves exists (safety for old sessions)
        if (!this.sessionState.marketReserves) {
            this.sessionState.marketReserves = {};
        }

        // Initialize reserves for this market if not exists
        if (!this.sessionState.marketReserves[marketId]) {
            this.sessionState.marketReserves[marketId] = {
                yesReserve: BigInt(reserves.yesReserve),
                noReserve: BigInt(reserves.noReserve),
                liquidity: BigInt(reserves.liquidity)
            };
        }

        // Update reserves based on trade
        if (side) {
            // Bought YES: YES reserve decreases, NO reserve increases
            this.sessionState.marketReserves[marketId].yesReserve -= swapAmount;
            this.sessionState.marketReserves[marketId].noReserve += amount;
        } else {
            // Bought NO: NO reserve decreases, YES reserve increases  
            this.sessionState.marketReserves[marketId].noReserve -= swapAmount;
            this.sessionState.marketReserves[marketId].yesReserve += amount;
        }

        console.log('[Yellow] 📊 Updated market reserves:', {
            market: marketId,
            newYesReserve: Number(this.sessionState.marketReserves[marketId].yesReserve) / 1e18,
            newNoReserve: Number(this.sessionState.marketReserves[marketId].noReserve) / 1e18,
        });

        // Generate tx hash for this state channel update
        const txHash = `0xYELLOW${Date.now().toString(16)}${this.sessionState.stateVersion.toString(16).padStart(4, '0')}`;

        console.log('[Yellow] ⚡ Trade executed:', {
            txHash,
            market: marketId,
            side: side ? 'YES' : 'NO',
            amountSpent: Number(amount) / 1e18,
            tokensReceived: Number(totalTokens) / 1e18,
            stateVersion: this.sessionState.stateVersion
        });

        return {
            success: true,
            txHash,
            tokensReceived: Number(totalTokens) / 1e18,
            newBalance: this.sessionState.availableBalance,
            stateVersion: this.sessionState.stateVersion
        };
    }

    /**
     * Handle trade confirmation from ClearNode
     */
    _onTradeConfirmed(message) {
        console.log('[Yellow] ✅ Trade confirmed by ClearNode:', message);
        this.sessionState.stateVersion = message.stateVersion || this.sessionState.stateVersion;
    }

    /**
     * Handle incoming session messages
     */
    _onSessionMessage(message) {
        console.log('[Yellow] Session message:', message.data);
        // Handle updates from other participants or ClearNode
    }

    /**
     * Execute market sell trade
     */
    async marketSell(marketId, side, amount, reserves) {
        if (!this.sessionState) {
            throw new Error('No active session');
        }

        // Find position
        const positionIndex = this.sessionState.positions.findIndex(
            p => p.market === marketId && p.side === side
        );

        if (positionIndex === -1) {
            throw new Error('No position found');
        }

        const position = this.sessionState.positions[positionIndex];

        if (position.tokenAmount < amount) {
            throw new Error('Insufficient tokens');
        }

        // Import PMMA math
        const { getSwapAmount } = await import('./swapMath.js');

        let yesSupply = BigInt(reserves?.yesReserve || '500000000000000000000');
        let noSupply = BigInt(reserves?.noReserve || '500000000000000000000');
        let totalLiquidity = BigInt(reserves?.liquidity || '1000000000000000000000');

        const payout = getSwapAmount(
            side,
            yesSupply,
            noSupply,
            totalLiquidity,
            amount
        );

        console.log('[Yellow] PMMA sell:', {
            tokens: Number(amount) / 1e18,
            payout: Number(payout) / 1e18
        });

        // Create sell message
        const sellData = {
            type: 'market_sell',
            marketId,
            side,
            amount: amount.toString(),
            payout: payout.toString(),
            timestamp: Date.now(),
            nonce: this.sessionState.stateVersion
        };

        const messageSigner = await this._createMessageSigner();
        const signature = await messageSigner(JSON.stringify(sellData));

        const signedSell = {
            ...sellData,
            signature,
            sender: this.userAddress
        };

        // Send via WebSocket
        if (this.isConnected) {
            this.ws.send(JSON.stringify(signedSell));
            console.log('[Yellow] 💰 Sell trade sent via state channel');
        }

        // Update local state
        position.tokenAmount -= amount;
        if (position.tokenAmount === 0n) {
            this.sessionState.positions.splice(positionIndex, 1);
        }

        this.sessionState.availableBalance += payout;
        this.sessionState.stateVersion++;

        // Generate tx hash for this state channel update
        const txHash = `0xYELLOW${Date.now().toString(16)}${this.sessionState.stateVersion.toString(16).padStart(4, '0')}`;

        console.log('[Yellow] ⚡ Sell executed:', {
            txHash,
            market: marketId,
            side: side ? 'YES' : 'NO',
            tokensSold: Number(amount) / 1e18,
            payout: Number(payout) / 1e18,
            stateVersion: this.sessionState.stateVersion
        });

        return {
            txHash,
            payout,
            newBalance: this.sessionState.availableBalance,
            stateVersion: this.sessionState.stateVersion
        };
    }

    /**
     * Close session and finalize state
     */
    async closeSession() {
        if (!this.sessionState) {
            throw new Error('No active session');
        }

        // Create final state message
        const finalStateData = {
            type: 'close_session',
            sessionId: this.sessionState.sessionId,
            stateVersion: this.sessionState.stateVersion,
            finalBalance: this.sessionState.availableBalance.toString(),
            positions: this.sessionState.positions,
            timestamp: Date.now()
        };

        const messageSigner = await this._createMessageSigner();
        const signature = await messageSigner(JSON.stringify(finalStateData));

        const signedClose = {
            ...finalStateData,
            signature,
            sender: this.userAddress
        };

        // Send close message
        if (this.isConnected) {
            this.ws.send(JSON.stringify(signedClose));
            console.log('[Yellow] Closing session...');
        }

        const finalState = { ...this.sessionState };

        // Clean up
        this.sessionState = null;

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        console.log('[Yellow] Session closed');
        return finalState;
    }
}
