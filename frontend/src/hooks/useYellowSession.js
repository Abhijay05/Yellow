/**
 * React hook for Yellow Network integration
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { YellowClient } from '../lib/yellowClient';
import { MOCK_USD } from '../lib/wagmi';
import { ERC20ABI, LvrMarketABI } from '../lib/contracts';
import { ethers } from 'ethers';

export function useYellowSession() {
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const { writeContractAsync } = useWriteContract();

    const [yellowClient, setYellowClient] = useState(null);
    const [session, setSession] = useState(null);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [balance, setBalance] = useState({ available: 0n, locked: 0n, total: 0n });
    const [positions, setPositions] = useState([]);
    const [gasSavings, setGasSavings] = useState(0);
    const [depositTxHash, setDepositTxHash] = useState(null);

    // Initialize Yellow client
    useEffect(() => {
        if (walletClient && address) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            provider.getSigner().then(signer => {
                const client = new YellowClient(provider, signer);
                setYellowClient(client);

                // Restore session from localStorage if exists
                const savedSession = localStorage.getItem(`yellow_session_${address}`);
                if (savedSession) {
                    try {
                        const sessionData = JSON.parse(savedSession);
                        console.log('[useYellowSession] Restoring session from localStorage:', sessionData);

                        // Restore session to yellowClient
                        client.sessionState = {
                            sessionId: sessionData.sessionId,
                            user: address, // Set user address for hash validation
                            userId: address,
                            depositAmount: BigInt(sessionData.depositAmount),
                            availableBalance: BigInt(sessionData.availableBalance),
                            positions: sessionData.positions || [],
                            stateVersion: sessionData.stateVersion || 0,
                            timestamp: sessionData.timestamp || Date.now()
                        };

                        setSession(sessionData);
                        setIsSessionActive(true);
                        console.log('[useYellowSession] Session restored successfully');
                    } catch (error) {
                        console.error('[useYellowSession] Failed to restore session:', error);
                        localStorage.removeItem(`yellow_session_${address}`);
                    }
                }
            });
        }
    }, [walletClient, address]);

    /**
     * Open a Yellow Network session
     */
    const openSession = useCallback(async (depositAmount) => {
        if (!yellowClient || !address) {
            throw new Error('Yellow client not initialized or wallet not connected');
        }

        try {
            console.log('Opening Yellow session with deposit:', depositAmount.toString());

            // Step 1: Approve USDC spending (triggers MetaMask)
            console.log('Step 1/3: Approving USDC...');
            const approveTx = await writeContractAsync({
                address: MOCK_USD,
                abi: ERC20ABI,
                functionName: 'approve',
                args: [address, depositAmount], // For demo, approve to self (simulating custody contract)
            });
            console.log('Approval tx:', approveTx);

            // Step 2: Simulate deposit to custody (in production, this would be a real contract call)
            // For demo purposes, we just verify the approval worked
            console.log('Step 2/3: Simulating custody deposit...');
            // In production: transfer to custody contract here

            // Step 3: Create off-chain Yellow session
            console.log('Step 3/3: Creating Yellow session...');
            const sessionState = await yellowClient.openSession(depositAmount);

            setSession(sessionState);
            setIsSessionActive(true);
            setDepositTxHash(approveTx);
            updateBalance();

            // Save to localStorage for persistence
            const sessionData = {
                sessionId: sessionState.sessionId,
                user: address, // Save user address
                depositAmount: depositAmount.toString(),
                availableBalance: sessionState.availableBalance.toString(),
                positions: sessionState.positions || [],
                stateVersion: sessionState.stateVersion || 0,
                timestamp: sessionState.timestamp || Date.now()
            };
            localStorage.setItem(`yellow_session_${address}`, JSON.stringify(sessionData));
            console.log('[useYellowSession] Session saved to localStorage');

            console.log('Session opened successfully!', sessionState);
            return sessionState;
        } catch (error) {
            console.error('Failed to open session:', error);
            throw error;
        }
    }, [yellowClient, address, writeContractAsync]);

    /**
     * Close session and return final state
     */
    const closeSession = useCallback(async () => {
        if (!yellowClient || !session) {
            throw new Error('No active session');
        }

        try {
            const finalState = await yellowClient.closeSession();

            setSession(null);
            setIsSessionActive(false);
            setBalance({ available: 0n, locked: 0n, total: 0n });
            setPositions([]);

            // Clear from localStorage
            if (address) {
                localStorage.removeItem(`yellow_session_${address}`);
                console.log('[useYellowSession] Session cleared from localStorage');
            }

            return finalState;
        } catch (error) {
            console.error('Failed to close session:', error);
            throw error;
        }
    }, [yellowClient, session, address]);

    /**
     * Buy YES or NO tokens
     */
    const marketBuy = useCallback(async (marketId, side, amount, slippage = 0.02) => {
        console.log('[useYellowSession] marketBuy called:', { marketId, side, amount: amount.toString(), isSessionActive });

        if (!yellowClient || !isSessionActive) {
            console.error('[useYellowSession] No active session for marketBuy');
            throw new Error('No active session');
        }

        try {
            // Fetch actual market reserves from contract
            console.log('[useYellowSession] Fetching market reserves for:', marketId);

            const provider = new ethers.BrowserProvider(window.ethereum);

            // Create contract instance
            const marketContract = new ethers.Contract(marketId, LvrMarketABI, provider);

            // Get YES and NO token addresses
            const yesTokenAddr = await marketContract.yesToken();
            const noTokenAddr = await marketContract.noToken();

            // Get YES and NO token balances (reserves in the market)
            const yesTokenContract = new ethers.Contract(yesTokenAddr, ERC20ABI, provider);
            const noTokenContract = new ethers.Contract(noTokenAddr, ERC20ABI, provider);

            const yesReserve = await yesTokenContract.balanceOf(marketId);
            const noReserve = await noTokenContract.balanceOf(marketId);

            // Get market details for liquidity
            const marketDetails = await marketContract.getMarketDetails();
            const liquidity = marketDetails[3]; // liquidity is at index 3

            console.log('[useYellowSession] Fetched reserves:', {
                yesReserve: yesReserve.toString(),
                noReserve: noReserve.toString(),
                liquidity: liquidity.toString()
            });

            const result = await yellowClient.call('market_buy', {
                marketId,
                side,
                amount,
                slippage,
                reserves: {
                    yesReserve: yesReserve.toString(),
                    noReserve: noReserve.toString(),
                    liquidity: liquidity.toString()
                }
            });

            console.log('[useYellowSession] marketBuy result:', result);

            // Update UI state
            updateBalance();
            updatePositions();
            updateGasSavings();

            // Persist updated session to localStorage
            if (address && yellowClient.sessionState) {
                const sessionData = {
                    sessionId: yellowClient.sessionState.sessionId,
                    depositAmount: yellowClient.sessionState.depositAmount.toString(),
                    availableBalance: yellowClient.sessionState.availableBalance.toString(),
                    positions: (yellowClient.sessionState.positions || []).map(p => ({
                        ...p,
                        size: p.size?.toString ? p.size.toString() : p.size,
                        cost: p.cost?.toString ? p.cost.toString() : p.cost,
                    })),
                    stateVersion: yellowClient.sessionState.stateVersion || 0,
                };
                // Custom replacer to handle any remaining BigInt values
                localStorage.setItem(`yellow_session_${address}`, JSON.stringify(sessionData, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                ));
                console.log('[useYellowSession] Session updated in localStorage after trade');
            }

            return result;
        } catch (error) {
            console.error('[useYellowSession] Market buy failed:', error);
            throw error;
        }
    }, [yellowClient, isSessionActive, address]); // Removed update functions to prevent re-render issues

    /**
     * Sell YES or NO tokens
     */
    const marketSell = useCallback(async (marketId, side, amount) => {
        if (!yellowClient || !isSessionActive) {
            throw new Error('No active session');
        }

        try {
            const result = await yellowClient.call('market_sell', {
                marketId,
                side,
                amount
            });

            updateBalance();
            updatePositions();
            updateGasSavings();

            return result;
        } catch (error) {
            console.error('Market sell failed:', error);
            throw error;
        }
    }, [yellowClient, isSessionActive]);

    /**
     * Extend conviction chain
     */
    const extendChain = useCallback(async (parentMarket, childMarket, collateralAmount, side) => {
        if (!yellowClient || !isSessionActive) {
            throw new Error('No active session');
        }

        try {
            const result = await yellowClient.call('chain_extend', {
                parentMarket,
                childMarket,
                collateralAmount,
                side
            });

            updateBalance();
            updatePositions();
            updateGasSavings();

            return result;
        } catch (error) {
            console.error('Chain extend failed:', error);
            throw error;
        }
    }, [yellowClient, isSessionActive]);

    /**
     * Get market price
     */
    const getMarketPrice = useCallback(async (marketId) => {
        if (!yellowClient) {
            throw new Error('Yellow client not initialized');
        }

        return await yellowClient.call('market_price', { marketId });
    }, [yellowClient]);

    /**
     * Update balance from session state
     */
    const updateBalance = useCallback(() => {
        if (!yellowClient || !isSessionActive) return;

        // Read directly from yellowClient session state
        if (yellowClient.sessionState) {
            const newBalance = {
                available: yellowClient.sessionState.availableBalance,
                locked: 0n, // TODO: calculate locked from positions
                total: yellowClient.sessionState.depositAmount
            };
            console.log('[useYellowSession] Updating balance:', {
                available: newBalance.available.toString(),
                total: newBalance.total.toString()
            });
            setBalance(newBalance);
        }
    }, [yellowClient, isSessionActive]);

    /**
     * Update positions from session state
     */
    const updatePositions = useCallback(() => {
        if (!yellowClient || !isSessionActive) return;

        // Read directly from yellowClient session state
        if (yellowClient.sessionState && yellowClient.sessionState.positions) {
            console.log('[useYellowSession] Updating positions:', yellowClient.sessionState.positions);
            setPositions(yellowClient.sessionState.positions);
        }
    }, [yellowClient, isSessionActive]);

    /**
     * Update gas savings counter
     */
    const updateGasSavings = useCallback(() => {
        if (!yellowClient) return;

        const savings = yellowClient.getGasSavings();
        setGasSavings(savings);
    }, [yellowClient]);

    // Auto-update on session changes
    useEffect(() => {
        if (isSessionActive && yellowClient?.sessionState) {
            updateBalance();
            updatePositions();
            updateGasSavings();
        }
    }, [isSessionActive, yellowClient]); // Don't include update functions to avoid infinite loop

    return {
        // Client
        yellowClient,

        // Session
        session,
        isSessionActive,
        openSession,
        closeSession,

        // Trading
        marketBuy,
        marketSell,
        extendChain,
        getMarketPrice,

        // State
        balance,
        positions,
        gasSavings,

        // Utils
        updateBalance,
        updatePositions,
    };
}
