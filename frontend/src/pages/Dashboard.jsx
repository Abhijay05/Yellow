/**
 * Dashboard Page - Premium User Profile
 * Shows Yellow session state, positions, balance, and quick actions
 */

import { Link } from "react-router-dom";
import {
  Zap,
  TrendingUp,
  Wallet,
  ArrowRight,
  Loader2,
  Activity,
  Target,
  DollarSign,
  PieChart,
  Sparkles,
  Shield,
  Gift,
  Lock,
  Unlock
} from "lucide-react";
import { useAccount } from "wagmi";
import { useMintMockUSD, useMUSDBalance, useMarkets } from "../hooks/useContracts";
import { useYellowSession } from "../hooks/useYellowSession";

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { mint, isPending: isMinting } = useMintMockUSD();
  const { data: musdBalance, isLoading: isBalanceLoading } = useMUSDBalance();
  const { data: markets } = useMarkets();
  const {
    isSessionActive,
    session,
    balance,
    positions,
    gasSavings,
  } = useYellowSession();

  const handleMint = () => mint();

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

  const shortenAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Calculate stats
  const totalPositions = positions?.length || 0;
  const totalInvested = positions?.reduce((sum, pos) => {
    try {
      const inv = typeof pos.investmentAmount === 'bigint'
        ? Number(pos.investmentAmount) / 1e18
        : Number(pos.investmentAmount || 0);
      return sum + inv;
    } catch { return sum; }
  }, 0) || 0;

  const collateralAvailable = totalInvested * 0.6;

  if (!isConnected) {
    return (
      <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="premium-card p-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20 mb-6">
              <Wallet className="w-10 h-10 text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Connect your wallet to view your dashboard and start trading with zero gas fees
            </p>
            <div className="text-slate-500 text-sm animate-pulse">
              Click "Connect Wallet" in the header
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-violet-500/25">
              {address?.slice(2, 4).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="text-slate-500 font-mono text-sm">{shortenAddress(address)}</p>
            </div>
          </div>
        </div>

        {/* Session Status Banner */}
        {isSessionActive ? (
          <div className="premium-card overflow-hidden mb-8">
            <div className="relative p-6 bg-gradient-to-r from-emerald-600/20 via-green-600/10 to-transparent">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="relative flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">Yellow Session Active</h2>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-medium text-emerald-400">Live</span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm">Trading gaslessly via state channels</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Trades</p>
                    <p className="text-lg font-bold text-cyan-400">{session?.stateVersion || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Gas Saved</p>
                    <p className="text-lg font-bold text-yellow-400">${gasSavings?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="premium-card overflow-hidden mb-8">
            <div className="relative p-6 bg-gradient-to-r from-violet-600/20 via-purple-600/10 to-transparent">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="relative flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Start Trading</h2>
                    <p className="text-slate-400 text-sm">Open a Yellow session for gasless trades</p>
                  </div>
                </div>
                <Link to="/chainbet">
                  <button className="glow-btn flex items-center gap-2">
                    Open Session
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Wallet Balance */}
          <div className="stat-card group hover:border-blue-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Wallet Balance</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              ${isBalanceLoading ? "..." : Number(musdBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">mUSD (on-chain)</p>
          </div>

          {/* Session Balance */}
          <div className="stat-card group hover:border-emerald-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Session Balance</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Unlock className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              ${formatBalance(balance?.available)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Available to trade</p>
          </div>

          {/* Locked in Positions */}
          <div className="stat-card group hover:border-violet-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wide">In Positions</span>
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Lock className="w-4 h-4 text-violet-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              ${formatBalance(balance?.locked)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{totalPositions} active position{totalPositions !== 1 ? 's' : ''}</p>
          </div>

          {/* Collateral */}
          <div className="stat-card group hover:border-purple-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Collateral (60%)</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              ${collateralAvailable.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-1">For child markets</p>
          </div>
        </div>

        {/* Positions Section */}
        <div className="premium-card overflow-hidden mb-8">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-violet-400" />
                Your Positions
              </h3>
              {totalPositions > 0 && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  {totalPositions} active
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            {!isSessionActive ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4">
                  <Shield className="w-8 h-8 text-violet-400" />
                </div>
                <p className="text-white font-semibold mb-1">No Active Session</p>
                <p className="text-sm text-slate-500">Open a Yellow session to start trading</p>
              </div>
            ) : positions?.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4">
                  <TrendingUp className="w-8 h-8 text-violet-400" />
                </div>
                <p className="text-white font-semibold mb-1">No Positions Yet</p>
                <p className="text-sm text-slate-500">Buy YES or NO tokens to see them here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {positions?.map((pos, idx) => {
                  const market = markets?.find(m => m.address === pos.market || m.address === pos.marketId);
                  const tokens = typeof pos.tokenAmount === 'bigint'
                    ? Number(pos.tokenAmount) / 1e18
                    : Number(pos.tokenAmount || 0);
                  const invested = typeof pos.investmentAmount === 'bigint'
                    ? Number(pos.investmentAmount) / 1e18
                    : Number(pos.investmentAmount || 0);
                  const isYes = pos.side === true || pos.side === 'yes' || pos.side === 'YES';

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-colors ${isYes
                          ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                          : 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${isYes ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                            }`}>
                            {isYes ? 'YES' : 'NO'}
                          </span>
                          <span className="text-white font-medium">
                            {tokens.toFixed(2)} tokens
                          </span>
                        </div>
                        <span className="text-slate-400 text-sm">
                          ${invested.toFixed(2)} invested
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm truncate">
                        {market?.title || market?.question || `Market: ${shortenAddress(pos.market || pos.marketId)}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Faucet Card */}
          <div className="premium-card p-6 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent border-amber-500/20 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded-full font-medium">TESTNET</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Mint Test mUSD</h3>
            <p className="text-slate-400 text-sm mb-4">Get 1,000 mUSD for testing</p>
            <button
              onClick={handleMint}
              disabled={isMinting}
              className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${isMinting
                  ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:shadow-lg hover:shadow-amber-500/25'
                }`}
            >
              {isMinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Minting...
                </>
              ) : (
                'Mint 1,000 mUSD'
              )}
            </button>
          </div>

          {/* Trade Card */}
          <Link to="/chainbet" className="block">
            <div className="premium-card p-6 h-full bg-gradient-to-br from-violet-500/10 via-transparent to-transparent border-violet-500/20 hover:border-violet-500/40 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-violet-400" />
                </div>
                <ArrowRight className="w-5 h-5 text-violet-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Trade Markets</h3>
              <p className="text-slate-400 text-sm">Buy & sell prediction tokens</p>
            </div>
          </Link>

          {/* Markets Card */}
          <Link to="/chainbet" className="block">
            <div className="premium-card p-6 h-full bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-emerald-400" />
                </div>
                <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Browse Markets</h3>
              <p className="text-slate-400 text-sm">{markets?.length || 0} active markets</p>
            </div>
          </Link>
        </div>

        {/* Gas Savings Banner */}
        {isSessionActive && gasSavings > 0 && (
          <div className="premium-card overflow-hidden bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 border-yellow-500/20">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/25">
                  <Zap className="w-7 h-7 text-black" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Gas Saved with Yellow Network</h3>
                  <p className="text-sm text-slate-400">{session?.stateVersion || 0} gasless transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-yellow-400 neon-text-green">${gasSavings.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
