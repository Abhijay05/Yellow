/**
 * Session Manager - Premium UI
 * Yellow Network session control with beautiful status display
 */

import { useState } from 'react';
import { useYellowSession } from '../hooks/useYellowSession';
import { useMUSDBalance } from '../hooks/useContracts';
import { useAccount } from 'wagmi';
import {
    Wallet,
    Zap,
    LogOut,
    Loader2,
    DollarSign,
    TrendingUp,
    Shield,
    Sparkles,
    ArrowRight,
    Lock,
    Unlock
} from 'lucide-react';

export function SessionManager() {
    const { address, isConnected } = useAccount();
    const { data: musdBalance } = useMUSDBalance();
    const {
        isSessionActive,
        openSession,
        closeSession,
        balance,
        gasSavings,
        positions
    } = useYellowSession();

    const [depositAmount, setDepositAmount] = useState('1000');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleOpenSession = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const amount = BigInt(parseFloat(depositAmount) * 10 ** 18);
            await openSession(amount);
        } catch (err) {
            setError(err.message);
            console.error('Failed to open session:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseSession = async () => {
        try {
            setIsLoading(true);
            await closeSession();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Format balance safely
    const formatBalance = (value) => {
        if (!value) return '0.00';
        try {
            const num = typeof value === 'bigint' ? Number(value) / 1e18 : Number(value) / 1e18;
            if (!isFinite(num)) return '0.00';
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } catch {
            return '0.00';
        }
    };

    if (!isConnected) {
        return (
            <div className="premium-card p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4">
                    <Wallet className="w-8 h-8 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                    Connect your wallet to access instant, gasless prediction market trading
                </p>
            </div>
        );
    }

    if (!isSessionActive) {
        return (
            <div className="premium-card overflow-hidden">
                {/* Header */}
                <div className="relative p-6 bg-gradient-to-r from-violet-600/20 via-purple-600/10 to-transparent border-b border-white/5">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="relative flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                            <Zap className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Open Yellow Session</h2>
                            <p className="text-sm text-slate-400">Lock funds once, trade unlimited times with zero gas</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Wallet Balance */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide">Wallet Balance</p>
                                <p className="text-lg font-bold text-white">
                                    ${formatBalance(musdBalance ? BigInt(Math.floor(Number(musdBalance) * 1e18)) : 0n)}
                                </p>
                            </div>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                    </div>

                    {/* Deposit Amount */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            Session Deposit Amount
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="number"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                className="premium-input pl-12 pr-20 text-2xl font-bold"
                                placeholder="1000"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                                mUSD
                            </span>
                        </div>
                        <div className="flex gap-2 mt-3">
                            {[100, 500, 1000, 5000].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setDepositAmount(amount.toString())}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${depositAmount === amount.toString()
                                        ? 'bg-violet-600 text-white border-2 border-violet-400 shadow-lg shadow-violet-500/30'
                                        : 'bg-slate-800 text-slate-300 border-2 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    ${amount}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Benefits */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { icon: Zap, label: 'Zero Gas', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' },
                            { icon: TrendingUp, label: 'Instant Trades', color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40' },
                            { icon: Shield, label: 'Secure', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' }
                        ].map((item, i) => (
                            <div key={i} className={`flex items-center gap-2 p-4 rounded-xl ${item.bg} border-2 ${item.border}`}>
                                <item.icon className={`w-5 h-5 ${item.color}`} />
                                <span className={`text-sm font-semibold ${item.color}`}>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Open Session Button - HIGHLY VISIBLE */}
                    <button
                        onClick={handleOpenSession}
                        disabled={isLoading || !depositAmount}
                        className="w-full py-5 text-xl font-bold flex items-center justify-center gap-4 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 text-white border-2 border-violet-400 shadow-2xl shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span>Opening Session...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-6 h-6" />
                                <span>Open Session</span>
                                <ArrowRight className="w-6 h-6" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // Active Session View
    return (
        <div className="premium-card overflow-hidden">
            {/* Header with Glow */}
            <div className="relative p-5 bg-gradient-to-r from-emerald-600/20 via-green-600/10 to-transparent border-b border-white/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white">Yellow Session Active</h2>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-medium text-emerald-400">Live</span>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400">Trading with zero gas fees</p>
                        </div>
                    </div>
                    <button
                        onClick={handleCloseSession}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm font-medium"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <LogOut className="w-4 h-4" />
                        )}
                        Close Session
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Available Balance */}
                    <div className="stat-card">
                        <div className="flex items-center gap-2 mb-2">
                            <Unlock className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Available</span>
                        </div>
                        <p className="text-2xl font-bold text-white">${formatBalance(balance?.available)}</p>
                    </div>

                    {/* Locked in Positions */}
                    <div className="stat-card">
                        <div className="flex items-center gap-2 mb-2">
                            <Lock className="w-4 h-4 text-violet-400" />
                            <span className="text-xs text-slate-500 uppercase tracking-wide">In Positions</span>
                        </div>
                        <p className="text-2xl font-bold text-white">${formatBalance(balance?.locked)}</p>
                    </div>

                    {/* Total Balance */}
                    <div className="stat-card">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Total</span>
                        </div>
                        <p className="text-2xl font-bold gradient-text">${formatBalance(balance?.total)}</p>
                    </div>

                    {/* Gas Saved */}
                    <div className="stat-card bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Gas Saved</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-400">${gasSavings || 0}</p>
                    </div>
                </div>

                {/* Positions Count */}
                {positions && positions.length > 0 && (
                    <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                        <span className="text-sm text-slate-400">Active Positions</span>
                        <span className="text-lg font-bold text-violet-400">{positions.length}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
