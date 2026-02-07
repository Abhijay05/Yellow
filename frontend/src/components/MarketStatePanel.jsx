/**
 * Market State Panel - Premium UI
 * Live market stats and probability display
 */

import { useState, useEffect, useCallback } from 'react';
import { useYellowSession } from '../hooks/useYellowSession';
import { ethers } from 'ethers';
import { LvrMarketABI, ERC20ABI } from '../lib/contracts';
import {
    BarChart3,
    Clock,
    Droplets,
    TrendingUp,
    TrendingDown,
    Zap,
    RefreshCw
} from 'lucide-react';

export function MarketStatePanel({ market }) {
    const { isSessionActive, yellowClient } = useYellowSession();
    const [marketState, setMarketState] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchMarketState = useCallback(async () => {
        if (!market?.address || !window.ethereum) return;

        try {
            setLoading(true);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const marketContract = new ethers.Contract(market.address, LvrMarketABI, provider);

            const yesTokenAddr = await marketContract.yesToken();
            const noTokenAddr = await marketContract.noToken();

            const yesToken = new ethers.Contract(yesTokenAddr, ERC20ABI, provider);
            const noToken = new ethers.Contract(noTokenAddr, ERC20ABI, provider);

            // Check for session reserves first
            let yesReserve, noReserve;
            const sessionReserves = yellowClient?.sessionState?.marketReserves?.[market.address];

            if (isSessionActive && sessionReserves) {
                yesReserve = sessionReserves.yesReserve;
                noReserve = sessionReserves.noReserve;
            } else {
                yesReserve = await yesToken.balanceOf(market.address);
                noReserve = await noToken.balanceOf(market.address);
            }

            const yesNum = Number(yesReserve) / 1e18;
            const noNum = Number(noReserve) / 1e18;
            const total = yesNum + noNum;

            // Get market details
            const details = await marketContract.getMarketDetails();

            setMarketState({
                yesReserve: yesNum,
                noReserve: noNum,
                yesPrice: (noNum / total * 100) || 50,
                noPrice: (yesNum / total * 100) || 50,
                liquidity: Number(details[3]) / 1e18,
                deadline: Number(details[4]),
                isResolved: details[5],
                isFromSession: isSessionActive && sessionReserves
            });
        } catch (error) {
            console.error('Failed to fetch market state:', error);
        } finally {
            setLoading(false);
        }
    }, [market?.address, isSessionActive, yellowClient?.sessionState?.marketReserves]);

    useEffect(() => {
        fetchMarketState();
        const interval = setInterval(fetchMarketState, 5000);
        return () => clearInterval(interval);
    }, [fetchMarketState]);

    if (!market) {
        return (
            <div className="premium-card p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4">
                    <BarChart3 className="w-8 h-8 text-violet-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Market Stats</h3>
                <p className="text-sm text-slate-400">Select a market to view live statistics</p>
            </div>
        );
    }

    return (
        <div className="premium-card overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-violet-400" />
                            Market Stats
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                            {market.question || market.title}
                        </p>
                    </div>
                    {marketState?.isFromSession && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs font-medium text-yellow-400">Yellow</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-5 space-y-5">
                {/* Probability Display */}
                <div className="space-y-3">
                    {/* YES Probability */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-medium text-slate-400">YES</span>
                            </div>
                            <span className="text-xl font-bold text-emerald-400">
                                {marketState?.yesPrice?.toFixed(1) || '50.0'}%
                            </span>
                        </div>
                        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500"
                                style={{ width: `${marketState?.yesPrice || 50}%` }}
                            />
                        </div>
                    </div>

                    {/* NO Probability */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-red-400" />
                                <span className="text-sm font-medium text-slate-400">NO</span>
                            </div>
                            <span className="text-xl font-bold text-red-400">
                                {marketState?.noPrice?.toFixed(1) || '50.0'}%
                            </span>
                        </div>
                        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500"
                                style={{ width: `${marketState?.noPrice || 50}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Liquidity */}
                    <div className="stat-card">
                        <div className="flex items-center gap-2 mb-1">
                            <Droplets className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Liquidity</span>
                        </div>
                        <p className="text-lg font-bold text-white">
                            ${(marketState?.liquidity || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                    </div>

                    {/* Time Remaining */}
                    <div className="stat-card">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-violet-400" />
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Time Left</span>
                        </div>
                        <p className="text-lg font-bold text-white">
                            {formatTimeRemaining(marketState?.deadline)}
                        </p>
                    </div>
                </div>

                {/* Reserves */}
                <div className="p-4 rounded-xl bg-white/3 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">Pool Reserves</span>
                        <button
                            onClick={fetchMarketState}
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            disabled={loading}
                        >
                            <RefreshCw className={`w-3 h-3 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-slate-500">YES Tokens</span>
                            <p className="text-sm font-bold text-emerald-400">
                                {(marketState?.yesReserve || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500">NO Tokens</span>
                            <p className="text-sm font-bold text-red-400">
                                {(marketState?.noReserve || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatTimeRemaining(deadline) {
    if (!deadline) return '--';

    const now = Math.floor(Date.now() / 1000);
    const diff = deadline - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor(diff / 60);
    return `${minutes}m`;
}
