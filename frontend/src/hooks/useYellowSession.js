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
    const [updateCounter, setUpdateCounter] = useState(0); // Force UI refresh
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

                        // Validate required fields
                        if (!sessionData.sessionId || !sessionData.availableBalance) {
                            console.warn('[useYellowSession] Invalid session data, clearing');
                            localStorage.removeItem(`yellow_session_${address}`);
                            return;
                        }

                        // Restore session to yellowClient
                        client.sessionState = {
                            sessionId: sessionData.sessionId,
                            user: address,
                            userId: address,
                            availableBalance: BigInt(sessionData.availableBalance || '0'),
                            positions: Array.isArray(sessionData.positions) ? sessionData.positions : [],
                            marketReserves: sessionData.marketReserves || {}, // Initialize reserves map
                            stateVersion: Number(sessionData.stateVersion) || 0,
                            timestamp: Number(sessionData.timestamp) || Date.now()
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
            console.log('Step 1/4: Approving USDC...');
            const routerAddress = import.meta.env.VITE_ROUTER_ADDRESS;

            const approveTx = await writeContractAsync({
                address: MOCK_USD,
                abi: ERC20ABI,
                functionName: 'approve',
                args: [routerAddress, depositAmount], // Approve Router to take funds
            });
            console.log('Approval tx:', approveTx);

            // Wait for approval to confirm
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 2: Transfer mUSD to Router (acts as custody for session)
            console.log('Step 2/4: Transferring USDC to custody...');
            const transferTx = await writeContractAsync({
                address: MOCK_USD,
                abi: ERC20ABI,
                functionName: 'transfer',
                args: [routerAddress, depositAmount], // Lock funds in Router
            });
            console.log('Transfer tx:', transferTx);
            console.log(`💰 Deposited ${Number(depositAmount) / 1e18} mUSD to custody`);

            // Step 3: Wait for confirmation
            console.log('Step 3/4: Waiting for confirmation...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 4: Create off-chain Yellow session
            console.log('Step 4/4: Creating Yellow session...');
            const sessionState = await yellowClient.openSession(depositAmount);

            setSession(sessionState);
            setIsSessionActive(true);
            setDepositTxHash(transferTx);
            updateBalance();

            // Validate session state before saving
            if (!sessionState) {
                throw new Error('Session state was not created');
            }

            console.log('[useYellowSession] Session state:', {
                sessionId: sessionState.sessionId,
                availableBalance: sessionState.availableBalance,
                user: sessionState.user,
                timestamp: sessionState.timestamp
            });

            // Save to localStorage for persistence
            const sessionData = {
                sessionId: sessionState.sessionId,
                user: address, // Save user address
                depositAmount: depositAmount ? depositAmount.toString() : '0',
                availableBalance: sessionState.availableBalance ? sessionState.availableBalance.toString() : '0',
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
            // Get market reserves - use cached if available for bonding curve
            let yesReserve, noReserve, liquidity;

            if (yellowClient.sessionState?.marketReserves?.[marketId]) {
                // Use cached reserves from session (updated after each trade)
                const cached = yellowClient.sessionState.marketReserves[marketId];
                yesReserve = cached.yesReserve;
                noReserve = cached.noReserve;
                liquidity = cached.liquidity;
                console.log('[useYellowSession] Using CACHED reserves (bonding curve active):', {
                    yesReserve: Number(yesReserve) / 1e18,
                    noReserve: Number(noReserve) / 1e18,
                    liquidity: Number(liquidity) / 1e18
                });
            } else {
                // First trade - fetch from contract
                console.log('[useYellowSession] Fetching fresh reserves from contract...');
                const provider = new ethers.BrowserProvider(window.ethereum);
                const marketContract = new ethers.Contract(marketId, LvrMarketABI, provider);

                const yesTokenAddr = await marketContract.yesToken();
                const noTokenAddr = await marketContract.noToken();

                const yesTokenContract = new ethers.Contract(yesTokenAddr, ERC20ABI, provider);
                const noTokenContract = new ethers.Contract(noTokenAddr, ERC20ABI, provider);

                yesReserve = await yesTokenContract.balanceOf(marketId);
                noReserve = await noTokenContract.balanceOf(marketId);

                const marketDetails = await marketContract.getMarketDetails();
                liquidity = marketDetails[3];

                console.log('[useYellowSession] Fetched fresh reserves:', {
                    yesReserve: yesReserve.toString(),
                    noReserve: noReserve.toString(),
                    liquidity: liquidity.toString()
                });
            }

            const result = await yellowClient.marketBuy(
                marketId,
                side,
                amount,
                {
                    yesReserve: yesReserve.toString(),
                    noReserve: noReserve.toString(),
                    liquidity: liquidity.toString()
                }
            );

            console.log('[useYellowSession] marketBuy result:', result);

            // Update UI state
            updateBalance();
            updatePositions();
            updateGasSavings();
            setUpdateCounter(c => c + 1); // Force re-render

            // Persist updated session to localStorage
            if (address && yellowClient.sessionState) {
                const sessionData = {
                    sessionId: yellowClient.sessionState.sessionId,
                    availableBalance: yellowClient.sessionState.availableBalance.toString(),
                    positions: (yellowClient.sessionState.positions || []).map(p => ({
                        ...p,
                        tokenAmount: p.tokenAmount.toString(),
                        investmentAmount: p.investmentAmount.toString()
                    })),
                    stateVersion: yellowClient.sessionState.stateVersion || 0,
                };
                // Custom replacer to handle any remaining BigInt values
                localStorage.setItem(`yellow_session_${address}`, JSON.stringify(sessionData, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                ));
                console.log('[useYellowSession] Session data saved to localStorage after trade');
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
            // Fetch reserves (similar to buy)
            const provider = new ethers.BrowserProvider(window.ethereum);
            const marketContract = new ethers.Contract(marketId, LvrMarketABI, provider);
            const yesTokenAddr = await marketContract.yesToken();
            const noTokenAddr = await marketContract.noToken();
            const yesTokenContract = new ethers.Contract(yesTokenAddr, ERC20ABI, provider);
            const noTokenContract = new ethers.Contract(noTokenAddr, ERC20ABI, provider);
            const yesReserve = await yesTokenContract.balanceOf(marketId);
            const noReserve = await noTokenContract.balanceOf(marketId);
            const marketDetails = await marketContract.getMarketDetails();
            const liquidity = marketDetails[3];

            const result = await yellowClient.marketSell(
                marketId,
                side,
                amount,
                {
                    yesReserve: yesReserve.toString(),
                    noReserve: noReserve.toString(),
                    liquidity: liquidity.toString()
                }
            );

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
     * Get market price (simplified for WebSocket client)
     */
    const getMarketPrice = useCallback(async (marketId) => {
        // In the new client, prices are calculated from reserves
        // For now, return a default or fetch from contract
        console.warn('[useYellowSession] getMarketPrice simplified in WebSocket client');
        return { yesPrice: 0.5, noPrice: 0.5 };
    }, []);

    /**
     * Update balance from session state
     */
    const updateBalance = useCallback(() => {
        if (!yellowClient || !isSessionActive) return;

        if (yellowClient.sessionState) {
            // Calculate locked balance from positions
            const locked = yellowClient.sessionState.positions.reduce(
                (sum, pos) => sum + pos.investmentAmount,
                0n
            );

            setBalance({
                available: yellowClient.sessionState.availableBalance,
                locked,
                total: yellowClient.sessionState.availableBalance + locked
            });

            console.log('[useYellowSession] Updating balance:', {
                available: yellowClient.sessionState.availableBalance.toString(),
                total: (yellowClient.sessionState.availableBalance + locked).toString()
            });
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
        if (!yellowClient || !session) return;

        // Calculate gas savings locally
        // Estimate: $5 per transaction, state channels = $0
        const transactionCount = session.stateVersion || 0;
        const estimatedGasSaved = transactionCount * 5; // $5 per tx
        setGasSavings(estimatedGasSaved);
    }, [yellowClient, session]);

    // Auto-update on session changes
    useEffect(() => {
        if (isSessionActive && yellowClient?.sessionState) {
            updateBalance();
            updatePositions();
            updateGasSavings();
        }
    }, [isSessionActive, yellowClient?.sessionState?.stateVersion]); // Trigger on trade

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
