/**
 * User State Panel Component
 * Displays user's session state exactly as per flowchart:
 * - Available balance in session
 * - Tokens bought with market name
 * - Tokens available for sell
 * - Collateral available for child markets
 */

import { useYellowSession } from '../hooks/useYellowSession';
import { useMarkets } from '../hooks/useContracts';
import { formatWeiToUSD } from '../lib/formatters';

export function UserStatePanel() {
    const {
        isSessionActive,
        balance,
        positions,
        session,
        gasSavings
    } = useYellowSession();
    const { data: markets } = useMarkets();

    // Format token amount safely
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

    // Calculate total collateral available (60% of all positions)
    const totalCollateral = positions?.reduce((sum, pos) => {
        const investment = typeof pos.investmentAmount === 'bigint'
            ? Number(pos.investmentAmount) / 1e18
            : Number(pos.investmentAmount) / 1e18;
        return sum + (investment * 0.6);
    }, 0) || 0;

    if (!isSessionActive) {
        return (
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    👤 USER STATE
                </h3>
                <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">🔒</div>
                    <p>No active session</p>
                    <p className="text-sm text-gray-500 mt-1">Open a Yellow session to start</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    👤 USER STATE
                </h3>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-400">Active</span>
                </div>
            </div>

            {/* Session Info */}
            <div className="text-xs text-gray-400 mb-4 font-mono bg-gray-800/50 p-2 rounded">
                Session: {session?.sessionId?.slice(0, 16)}...
            </div>

            {/* Balance Section */}
            <div className="space-y-3 mb-6">
                <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 rounded-xl p-4 border border-emerald-700/50">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-emerald-300">💰 Available Balance</span>
                        <span className="text-2xl font-bold text-white">
                            ${formatWeiToUSD(balance?.available)}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                        <span className="text-xs text-gray-400">🔐 Locked</span>
                        <p className="text-lg font-bold text-white">
                            ${formatWeiToUSD(balance?.locked)}
                        </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
                        <span className="text-xs text-gray-400">📊 Total</span>
                        <p className="text-lg font-bold text-white">
                            ${formatWeiToUSD(balance?.total)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Positions / Tokens Bought */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    🎯 Tokens Bought (by Market)
                </h4>

                {positions && positions.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {positions.map((pos, idx) => {
                            const market = markets?.find(m => m.address === pos.market);
                            const tokens = formatTokens(pos.tokenAmount);
                            const investment = typeof pos.investmentAmount === 'bigint'
                                ? Number(pos.investmentAmount) / 1e18
                                : Number(pos.investmentAmount) / 1e18;

                            return (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-lg border ${pos.side
                                        ? 'bg-green-900/30 border-green-700/50'
                                        : 'bg-red-900/30 border-red-700/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${pos.side ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                            }`}>
                                            {pos.side ? 'YES' : 'NO'}
                                        </span>
                                        <span className="text-white font-bold">{tokens} tokens</span>
                                    </div>
                                    <p className="text-xs text-gray-300 truncate">
                                        {market?.question || market?.title || `${pos.market?.slice(0, 10)}...`}
                                    </p>
                                    <div className="flex justify-between mt-1 text-xs">
                                        <span className="text-gray-400">Invested: ${investment.toFixed(2)}</span>
                                        <span className="text-amber-400">Sell avl: {tokens}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-4 text-gray-500 bg-gray-800/30 rounded-lg">
                        <p className="text-sm">No positions yet</p>
                        <p className="text-xs">Buy tokens to see them here</p>
                    </div>
                )}
            </div>

            {/* Collateral Available for Child Markets */}
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-4 border border-purple-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-sm text-purple-300">🔗 Collateral for Child Markets</span>
                        <p className="text-xs text-purple-400 mt-0.5">60% of positions available</p>
                    </div>
                    <span className="text-2xl font-bold text-white">
                        ${totalCollateral.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Gas Savings */}
            <div className="mt-4 bg-amber-900/30 rounded-lg p-3 border border-amber-700/50">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-300">⚡ Gas Saved</span>
                    <span className="font-bold text-white">${gasSavings.toFixed(2)}</span>
                </div>
                <p className="text-xs text-amber-400 mt-1">
                    {session?.stateVersion || 0} off-chain transactions
                </p>
            </div>
        </div>
    );
}
