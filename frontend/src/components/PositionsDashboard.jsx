/**
 * Positions Dashboard - Premium UI
 * Beautiful display of all user positions
 */

import { useYellowSession } from '../hooks/useYellowSession';
import { useMarkets } from '../hooks/useContracts';
import {
    Briefcase,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Sparkles,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

export function PositionsDashboard() {
    const { isSessionActive, positions, balance } = useYellowSession();
    const { data: markets } = useMarkets();

    // Format balance safely
    const formatAmount = (value) => {
        if (!value) return '0.00';
        try {
            const num = typeof value === 'bigint' ? Number(value) / 1e18 : Number(value);
            if (!isFinite(num)) return '0.00';
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } catch {
            return '0.00';
        }
    };

    // Find market by address
    const findMarket = (marketId) => {
        return markets?.find(m => m.address?.toLowerCase() === marketId?.toLowerCase());
    };

    if (!isSessionActive) {
        return null;
    }

    if (!positions || positions.length === 0) {
        return (
            <div className="premium-card p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4">
                    <Briefcase className="w-8 h-8 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Positions Yet</h3>
                <p className="text-slate-400 max-w-sm mx-auto">
                    Start trading on any market to build your portfolio
                </p>
            </div>
        );
    }

    // Calculate totals
    const totalInvested = positions.reduce((sum, pos) => {
        const amt = typeof pos.investmentAmount === 'bigint'
            ? Number(pos.investmentAmount) / 1e18
            : Number(pos.investmentAmount || 0);
        return sum + amt;
    }, 0);

    return (
        <div className="premium-card overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20 flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Your Positions</h3>
                            <p className="text-sm text-slate-500">{positions.length} active positions</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase tracking-wide">Total Invested</p>
                        <p className="text-2xl font-bold gradient-text">${formatAmount(totalInvested * 1e18)}</p>
                    </div>
                </div>
            </div>

            {/* Positions List */}
            <div className="divide-y divide-white/5">
                {positions.map((position, index) => {
                    const market = findMarket(position.marketId);
                    const isYes = position.side === true || position.side === 'yes' || position.side === 'YES';
                    const tokens = typeof position.tokenAmount === 'bigint'
                        ? Number(position.tokenAmount) / 1e18
                        : Number(position.tokenAmount || 0);
                    const invested = typeof position.investmentAmount === 'bigint'
                        ? Number(position.investmentAmount) / 1e18
                        : Number(position.investmentAmount || 0);
                    const avgPrice = tokens > 0 ? (invested / tokens) : 0;

                    return (
                        <div
                            key={`${position.marketId}-${position.side}-${index}`}
                            className="p-5 hover:bg-white/2 transition-colors animate-slide-up"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex items-start gap-4">
                                {/* Side Icon */}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isYes
                                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                                        : 'bg-red-500/10 border border-red-500/20'
                                    }`}>
                                    {isYes ? (
                                        <TrendingUp className="w-6 h-6 text-emerald-400" />
                                    ) : (
                                        <TrendingDown className="w-6 h-6 text-red-400" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-white font-semibold truncate">
                                            {market?.question || market?.title || shortenAddress(position.marketId)}
                                        </h4>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isYes
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {isYes ? 'YES' : 'NO'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        Avg. price: {(avgPrice * 100).toFixed(1)}¢
                                    </p>
                                </div>

                                {/* Values */}
                                <div className="text-right flex-shrink-0">
                                    <p className={`text-xl font-bold ${isYes ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                        {tokens.toFixed(2)}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <DollarSign className="w-3 h-3" />
                                        {invested.toFixed(2)} invested
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function shortenAddress(address) {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
