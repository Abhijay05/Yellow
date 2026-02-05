/**
 * Yellow Session Manager Component
 * Handles deposit, session lifecycle, and balance display
 */

import { useState } from 'react';
import { useYellowSession } from '../hooks/useYellowSession';
import { formatWeiToUSD } from '../lib/formatters';

export function SessionManager() {
    const {
        isSessionActive,
        session,
        balance,
        gasSavings,
        openSession,
        closeSession,
    } = useYellowSession();

    const [depositAmount, setDepositAmount] = useState('1000');
    const [isLoading, setIsLoading] = useState(false);

    const handleOpenSession = async () => {
        try {
            setIsLoading(true);
            const amount = BigInt(depositAmount) * BigInt(10 ** 18); // Convert to wei
            await openSession(amount);
        } catch (error) {
            console.error('Failed to open session:', error);
            alert('Failed to open session: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseSession = async () => {
        try {
            setIsLoading(true);
            const finalState = await closeSession();
            console.log('Session closed:', finalState);
            alert('Session settled! Check your wallet for final balance.');
        } catch (error) {
            console.error('Failed to close session:', error);
            alert('Failed to close session: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isSessionActive) {
        return (
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold mb-2">🚀 Start Trading Session</h2>
                    <p className="text-violet-100">
                        Deposit once, trade unlimited times with ZERO gas fees
                    </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
                    <label className="block text-sm font-medium mb-2">
                        Deposit Amount (USDC)
                    </label>
                    <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="1000"
                        min="10"
                    />
                    <p className="mt-2 text-xs text-violet-100">
                        Minimum: 10 USDC • Recommended: 1000+ for multiple trades
                    </p>
                </div>

                <button
                    onClick={handleOpenSession}
                    disabled={isLoading || !depositAmount || Number(depositAmount) < 10}
                    className="w-full bg-white text-violet-600 font-bold py-4 rounded-xl hover:bg-violet-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                    {isLoading ? 'Opening Session...' : 'Open Session & Start Trading'}
                </button>

                <div className="mt-6 grid grid-cols-3 gap-4 text-center text-sm">
                    <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-2xl mb-1">⚡</div>
                        <div className="font-semibold">Instant</div>
                        <div className="text-xs text-violet-100">&lt;1 second</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-2xl mb-1">💸</div>
                        <div className="font-semibold">Free</div>
                        <div className="text-xs text-violet-100">$0 gas</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                        <div className="text-2xl mb-1">🔗</div>
                        <div className="font-semibold">Chains</div>
                        <div className="text-xs text-violet-100">Unlimited</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold">✅ Session Active</h2>
                    <p className="text-sm text-emerald-100">
                        Session ID: {session?.sessionId?.slice(0, 10)}...
                    </p>
                </div>
                <button
                    onClick={handleCloseSession}
                    disabled={isLoading}
                    className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-all border border-white/30"
                >
                    {isLoading ? 'Closing...' : 'Close Session'}
                </button>
            </div>

            {/* Balance Display */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm border border-white/30">
                    <p className="text-sm text-white/80 mb-1 font-medium">Available Balance</p>
                    <p className="text-2xl font-bold text-white">
                        ${formatWeiToUSD(balance?.available)}
                    </p>
                </div>
                <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm border border-white/30">
                    <p className="text-sm text-white/80 mb-1 font-medium">Locked in Positions</p>
                    <p className="text-2xl font-bold text-white">
                        ${formatWeiToUSD(balance?.locked)}
                    </p>
                </div>
                <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm border border-white/30">
                    <p className="text-sm text-white/80 mb-1 font-medium">Total Value</p>
                    <p className="text-2xl font-bold text-white">
                        ${formatWeiToUSD(balance?.total)}
                    </p>
                </div>
            </div>

            {/* Gas Savings Counter */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-amber-900 mb-1">
                            💰 Gas Saved with Yellow Network
                        </div>
                        <div className="text-4xl font-bold text-white">
                            ${gasSavings.toFixed(2)}
                        </div>
                        <div className="text-xs text-amber-100 mt-1">
                            {session?.stateVersion || 0} transactions • ~99% reduction
                        </div>
                    </div>
                    <div className="text-6xl">🔥</div>
                </div>
            </div>

            <div className="mt-4 p-4 bg-white/10 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></div>
                    <span>All trades are gasless and instant via Yellow state channels</span>
                </div>
            </div>
        </div>
    );
}
