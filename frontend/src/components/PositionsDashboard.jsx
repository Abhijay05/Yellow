/**
 * Positions Dashboard Component - REVAMPED
 * Shows all active positions with tokens, market info, and sell options
 */

import { useYellowSession } from '../hooks/useYellowSession';
import { useMarkets } from '../hooks/useContracts';
import { formatWeiToUSD } from '../lib/formatters';

export function PositionsDashboard() {
    const { positions, marketSell, isSessionActive, balance } = useYellowSession();
    const { data: markets } = useMarkets();

    // Safe token formatting - handles BigInt properly
    const formatTokens = (amount) => {
        if (!amount) return '0.00';
        try {
            const num = typeof amount === 'bigint'
                ? Number(amount) / 1e18
                : Number(amount) / 1e18;
            return num.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            });
        } catch {
            return '0.00';
        }
    };

    if (!isSessionActive) {
        return (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 text-center border border-gray-200">
                <div className="text-5xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">No Active Session</h3>
                <p className="text-gray-500">
                    Open a Yellow session to start trading
                </p>
            </div>
        );
    }

    if (!positions || positions.length === 0) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 text-center border border-blue-200">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">No Positions Yet</h3>
                <p className="text-gray-500 mb-4">
                    Buy YES or NO tokens to see your portfolio here
                </p>
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm">
                    💡 Tip: Start with a $10-50 trade to test
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Portfolio Summary */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                <h2 className="text-xl font-bold mb-4">📊 Your Portfolio</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/20 rounded-xl p-4">
                        <p className="text-sm text-white/80 mb-1">Total Positions</p>
                        <p className="text-2xl font-bold">{positions.length}</p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-4">
                        <p className="text-sm text-white/80 mb-1">Invested</p>
                        <p className="text-2xl font-bold">
                            ${formatWeiToUSD(balance?.locked)}
                        </p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-4">
                        <p className="text-sm text-white/80 mb-1">Available</p>
                        <p className="text-2xl font-bold">
                            ${formatWeiToUSD(balance?.available)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Position Cards */}
            <div className="space-y-4">
                {positions.map((position, idx) => {
                    // Find corresponding market
                    const market = markets?.find(m => m.address === position.market);

                    // Format amounts safely
                    const investment = formatTokens(position.investmentAmount);
                    const tokens = formatTokens(position.tokenAmount);
                    const rawTokens = typeof position.tokenAmount === 'bigint'
                        ? Number(position.tokenAmount) / 1e18
                        : Number(position.tokenAmount) / 1e18;

                    return (
                        <div
                            key={idx}
                            className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-indigo-300 transition-all overflow-hidden"
                        >
                            {/* Position Header */}
                            <div className={`p-4 ${position.side ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'} text-white`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">
                                            {position.side ? '✅' : '❌'}
                                        </span>
                                        <div>
                                            <span className="text-lg font-bold">
                                                {position.side ? 'YES' : 'NO'} Position
                                            </span>
                                            <p className="text-sm text-white/80">
                                                {market?.question || 'Loading market...'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold">{tokens}</p>
                                        <p className="text-xs text-white/80">tokens owned</p>
                                    </div>
                                </div>
                            </div>

                            {/* Position Details */}
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">💰 Investment</p>
                                        <p className="text-xl font-bold text-gray-900">${investment}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs text-gray-500 mb-1">🎯 Token Count</p>
                                        <p className="text-xl font-bold text-gray-900">{tokens}</p>
                                    </div>
                                </div>

                                {/* Market Address */}
                                <div className="text-xs text-gray-400 mb-4 font-mono">
                                    Market: {position.market?.slice(0, 10)}...{position.market?.slice(-8)}
                                </div>

                                {/* Sell Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            const halfTokens = typeof position.tokenAmount === 'bigint'
                                                ? position.tokenAmount / 2n
                                                : BigInt(Math.floor(Number(position.tokenAmount) / 2));
                                            marketSell(position.market, position.side, halfTokens);
                                        }}
                                        className="flex-1 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg"
                                    >
                                        Sell 50% ({(rawTokens / 2).toFixed(2)} tokens)
                                    </button>
                                    <button
                                        onClick={() => {
                                            marketSell(position.market, position.side, position.tokenAmount);
                                        }}
                                        className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg"
                                    >
                                        Sell All ({rawTokens.toFixed(2)} tokens)
                                    </button>
                                </div>
                            </div>

                            {/* Market Resolved Status */}
                            {market?.isResolved && (
                                <div className="bg-purple-50 border-t border-purple-200 p-4">
                                    <p className="text-sm text-purple-800 font-medium">
                                        🎯 Market Resolved: {market.outcome ? 'YES' : 'NO'}
                                    </p>
                                    {position.side === market.outcome && (
                                        <p className="text-xs text-purple-600 mt-1">
                                            ✅ You won! Close session to claim winnings
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
