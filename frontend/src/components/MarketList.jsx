/**
 * Market List - Premium UI
 * Beautiful market cards with probability displays
 */

import { useState, useEffect } from 'react';
import { useMarkets } from '../hooks/useContracts';
import { TrendingUp, Clock, Users, ChevronRight, Flame, Sparkles } from 'lucide-react';

export function MarketList({ selectedMarket, onSelectMarket }) {
    const { data: markets, isLoading } = useMarkets();
    const [animatedIn, setAnimatedIn] = useState(false);

    useEffect(() => {
        setTimeout(() => setAnimatedIn(true), 100);
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="market-card animate-pulse">
                        <div className="h-6 bg-white/5 rounded w-3/4 mb-4" />
                        <div className="h-3 bg-white/5 rounded-full w-full mb-3" />
                        <div className="flex gap-4">
                            <div className="h-4 bg-white/5 rounded w-20" />
                            <div className="h-4 bg-white/5 rounded w-20" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!markets || markets.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 mb-6">
                    <Sparkles className="w-10 h-10 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Markets Yet</h3>
                <p className="text-slate-400 max-w-sm mx-auto">
                    Be the first to create a prediction market and start trading!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {markets.map((market, index) => {
                const isSelected = selectedMarket?.address === market.address;
                const yesPrice = market.yesPrice || 0.5;
                const noPrice = market.noPrice || 0.5;
                const yesPct = Math.round(yesPrice * 100);
                const noPct = Math.round(noPrice * 100);

                return (
                    <div
                        key={market.address}
                        onClick={() => onSelectMarket(market)}
                        className={`market-card ${isSelected ? 'selected' : ''} ${animatedIn ? 'animate-slide-up' : 'opacity-0'}`}
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {/* Hot Badge */}
                        {index === 0 && (
                            <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold shadow-lg">
                                <Flame className="w-3 h-3" />
                                HOT
                            </div>
                        )}

                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 pr-4">
                                <h3 className="font-bold text-white text-lg leading-tight mb-2">
                                    {market.question || market.title || 'Untitled Market'}
                                </h3>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTimeRemaining(market.deadline)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {market.participants || 0} traders
                                    </span>
                                </div>
                            </div>
                            <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${isSelected ? 'text-violet-400 rotate-90' : ''}`} />
                        </div>

                        {/* Probability Bar */}
                        <div className="mb-4">
                            <div className="probability-bar">
                                <div
                                    className="probability-bar-fill bg-gradient-to-r from-emerald-500 to-green-400"
                                    style={{ width: `${yesPct}%` }}
                                />
                            </div>
                        </div>

                        {/* Prices */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 uppercase tracking-wide">Yes</span>
                                <span className="text-lg font-bold text-emerald-400">{yesPct}¢</span>
                            </div>
                            <div className="h-4 w-px bg-white/10" />
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-red-400">{noPct}¢</span>
                                <span className="text-xs text-slate-500 uppercase tracking-wide">No</span>
                            </div>
                            <div className="h-4 w-px bg-white/10" />
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-violet-400" />
                                <span className="text-sm font-medium text-violet-400">
                                    ${formatLiquidity(market.liquidity)}
                                </span>
                            </div>
                        </div>

                        {/* Selection Indicator */}
                        {isSelected && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500 rounded-b-xl" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// Helper functions
function formatTimeRemaining(deadline) {
    if (!deadline) return 'No deadline';

    try {
        const deadlineMs = typeof deadline === 'bigint'
            ? Number(deadline) * 1000
            : Number(deadline) * 1000;
        const now = Date.now();
        const diff = deadlineMs - now;

        if (diff <= 0) return 'Ended';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h left`;
        if (hours > 0) return `${hours}h left`;
        return 'Ending soon';
    } catch {
        return 'Unknown';
    }
}

function formatLiquidity(liquidity) {
    if (!liquidity) return '0';
    try {
        const num = typeof liquidity === 'bigint'
            ? Number(liquidity) / 1e18
            : Number(liquidity);
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toFixed(0);
    } catch {
        return '0';
    }
}
