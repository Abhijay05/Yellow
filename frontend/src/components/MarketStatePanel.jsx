/**
 * Market State Panel Component
 * Displays market state exactly as per flowchart:
 * - Total YES/NO tokens
 * - Reserves
 * - Probability
 * - Duration countdown
 */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LvrMarketABI, ERC20ABI } from '../lib/contracts';

export function MarketStatePanel({ market }) {
    const [state, setState] = useState({
        yesReserve: 0,
        noReserve: 0,
        liquidity: 0,
        yesProbability: 50,
        noProbability: 50,
        totalYesTokens: 0,
        totalNoTokens: 0,
        timeRemaining: null,
        isResolved: false,
        loading: true
    });

    // Fetch market state every 3 seconds
    useEffect(() => {
        if (market?.address) {
            fetchMarketState();
            const interval = setInterval(fetchMarketState, 3000);
            return () => clearInterval(interval);
        }
    }, [market?.address]);

    const fetchMarketState = async () => {
        if (!market?.address || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const marketContract = new ethers.Contract(market.address, LvrMarketABI, provider);

            // Get token addresses
            const yesTokenAddr = await marketContract.yesToken();
            const noTokenAddr = await marketContract.noToken();

            // Get reserves (tokens in market contract)
            const yesToken = new ethers.Contract(yesTokenAddr, ERC20ABI, provider);
            const noToken = new ethers.Contract(noTokenAddr, ERC20ABI, provider);

            const yesReserve = await yesToken.balanceOf(market.address);
            const noReserve = await noToken.balanceOf(market.address);

            // Get total supply (all minted tokens)
            const totalYes = await yesToken.totalSupply();
            const totalNo = await noToken.totalSupply();

            // Get market details
            const marketDetails = await marketContract.getMarketDetails();
            const liquidity = marketDetails[3];
            const deadline = marketDetails[2]; // Assuming index 2 is deadline
            const isResolved = marketDetails[4] || false;

            // Calculate probabilities from reserves
            // Lower reserve = higher probability (more have been bought)
            const totalReserve = yesReserve + noReserve;
            const yesProbability = totalReserve > 0n
                ? (Number(noReserve) / Number(totalReserve)) * 100
                : 50;
            const noProbability = 100 - yesProbability;

            // Calculate time remaining
            const deadlineMs = Number(deadline) * 1000;
            const now = Date.now();
            const timeRemaining = deadlineMs > now ? deadlineMs - now : 0;

            setState({
                yesReserve: Number(yesReserve) / 1e18,
                noReserve: Number(noReserve) / 1e18,
                liquidity: Number(liquidity) / 1e18,
                yesProbability,
                noProbability,
                totalYesTokens: Number(totalYes) / 1e18,
                totalNoTokens: Number(totalNo) / 1e18,
                timeRemaining,
                isResolved,
                loading: false
            });
        } catch (error) {
            console.error('Failed to fetch market state:', error);
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    // Format time remaining
    const formatTimeRemaining = (ms) => {
        if (!ms || ms <= 0) return 'Ended';

        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    if (!market) {
        return (
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">📊 MARKET STATE</h3>
                <div className="text-center py-8 text-gray-400">
                    <p>Select a market to view state</p>
                </div>
            </div>
        );
    }

    if (state.loading) {
        return (
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 animate-pulse">
                <h3 className="text-lg font-bold text-white mb-4">📊 MARKET STATE</h3>
                <div className="space-y-4">
                    <div className="h-20 bg-gray-700 rounded"></div>
                    <div className="h-16 bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    📊 MARKET STATE
                </h3>
                {state.isResolved ? (
                    <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded-full">
                        Resolved
                    </span>
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-400">Live</span>
                    </div>
                )}
            </div>

            {/* Market Title */}
            <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-white font-medium">
                    {market.question || market.title}
                </p>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                    {market.address?.slice(0, 10)}...{market.address?.slice(-8)}
                </p>
            </div>

            {/* Probability Display - Big & Bold */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl p-4 text-center">
                    <span className="text-sm text-green-200">✅ YES</span>
                    <p className="text-3xl font-bold text-white">
                        {state.yesProbability.toFixed(1)}%
                    </p>
                </div>
                <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-xl p-4 text-center">
                    <span className="text-sm text-red-200">❌ NO</span>
                    <p className="text-3xl font-bold text-white">
                        {state.noProbability.toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Probability Bar */}
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex mb-6">
                <div
                    className="bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                    style={{ width: `${state.yesProbability}%` }}
                />
                <div
                    className="bg-gradient-to-r from-red-400 to-rose-500 transition-all duration-500"
                    style={{ width: `${state.noProbability}%` }}
                />
            </div>

            {/* Reserves */}
            <div className="space-y-2 mb-4">
                <h4 className="text-sm font-medium text-gray-300">💧 Reserves (in pool)</h4>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-900/30 rounded-lg p-3 border border-green-700/50">
                        <span className="text-xs text-green-400">YES Reserve</span>
                        <p className="text-lg font-bold text-white">
                            {state.yesReserve.toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-red-900/30 rounded-lg p-3 border border-red-700/50">
                        <span className="text-xs text-red-400">NO Reserve</span>
                        <p className="text-lg font-bold text-white">
                            {state.noReserve.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Total Tokens Minted */}
            <div className="space-y-2 mb-4">
                <h4 className="text-sm font-medium text-gray-300">🎯 Total Tokens (minted)</h4>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                        <span className="text-xs text-gray-400">Total YES</span>
                        <p className="text-lg font-bold text-green-400">
                            {state.totalYesTokens.toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                        <span className="text-xs text-gray-400">Total NO</span>
                        <p className="text-lg font-bold text-red-400">
                            {state.totalNoTokens.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Liquidity */}
            <div className="bg-indigo-900/30 rounded-lg p-3 border border-indigo-700/50 mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-indigo-300">💰 Total Liquidity</span>
                    <span className="text-xl font-bold text-white">
                        ${state.liquidity.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Duration Countdown */}
            <div className={`rounded-lg p-3 border ${state.timeRemaining && state.timeRemaining > 3600000
                    ? 'bg-blue-900/30 border-blue-700/50'
                    : 'bg-amber-900/30 border-amber-700/50'
                }`}>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">⏱️ Time Remaining</span>
                    <span className={`text-xl font-bold ${state.timeRemaining && state.timeRemaining > 3600000
                            ? 'text-blue-400'
                            : 'text-amber-400'
                        }`}>
                        {formatTimeRemaining(state.timeRemaining)}
                    </span>
                </div>
            </div>

            {/* Update indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                Updates every 3 seconds
            </div>
        </div>
    );
}
