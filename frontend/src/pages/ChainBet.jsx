/**
 * ChainBet - Premium Trading Interface
 * Powered by Yellow Network State Channels
 */

import { useState } from 'react';
import { SessionManager } from '../components/SessionManager';
import { MarketList } from '../components/MarketList';
import { TradingInterface } from '../components/TradingInterface';
import { CreateMarketModal } from '../components/CreateMarketModal';
import { MarketStatePanel } from '../components/MarketStatePanel';
import { PositionsDashboard } from '../components/PositionsDashboard';
import { Plus, Zap, TrendingUp, Shield, Clock } from 'lucide-react';

export default function ChainBet() {
    const [selectedMarket, setSelectedMarket] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <div className="min-h-screen">
            {/* Hero Section - Premium Gradient */}
            <div className="relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.1),transparent_50%)]" />

                {/* Animated Orbs */}
                <div className="absolute top-20 left-1/4 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl animate-float" />
                <div className="absolute top-40 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-1.5s' }} />

                <div className="relative max-w-7xl mx-auto px-4 py-12">
                    <div className="text-center space-y-4">
                        {/* Logo Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
                            <Zap className="w-4 h-4 text-violet-400" />
                            <span className="text-sm font-medium text-violet-300">Powered by Yellow Network</span>
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl md:text-6xl font-black tracking-tight">
                            <span className="gradient-text-violet">Chain</span>
                            <span className="text-white">Bet</span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                            Trade prediction markets with <span className="text-cyan-400 font-semibold">zero gas fees</span>.
                            Chain your conviction for exponential returns.
                        </p>

                        {/* Stats Bar */}
                        <div className="flex flex-wrap items-center justify-center gap-8 pt-6">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-sm text-slate-400">Live on Sepolia</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <TrendingUp className="w-4 h-4 text-violet-400" />
                                <span>Instant Trades</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Shield className="w-4 h-4 text-cyan-400" />
                                <span>State Channel Security</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Clock className="w-4 h-4 text-emerald-400" />
                                <span>Off-Chain Settlement</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 pb-12 -mt-8 relative z-10">
                {/* Session Manager - Premium Card */}
                <div className="mb-8">
                    <SessionManager />
                </div>

                {/* Main Grid - 2 Column */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Markets */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Create Market Button - Highly Visible */}
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="w-full py-5 px-8 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 group bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 text-white border-2 border-violet-400/50 shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02] transition-all"
                        >
                            <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
                            Create New Market
                        </button>

                        {/* Market List */}
                        <div className="premium-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-violet-400" />
                                    Active Markets
                                </h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    <span className="text-xs text-slate-500">Live</span>
                                </div>
                            </div>
                            <MarketList
                                selectedMarket={selectedMarket}
                                onSelectMarket={setSelectedMarket}
                            />
                        </div>
                    </div>

                    {/* Right Column - Trading & State */}
                    <div className="space-y-6">
                        {/* Market State Panel */}
                        <MarketStatePanel market={selectedMarket} />

                        {/* Trading Interface */}
                        <TradingInterface market={selectedMarket} />
                    </div>
                </div>

                {/* Positions Dashboard */}
                <div className="mt-10">
                    <PositionsDashboard />
                </div>

                {/* How It Works - Premium */}
                <div className="mt-10 premium-card p-8">
                    <h3 className="text-center text-sm uppercase tracking-widest text-slate-500 mb-8">
                        How ChainBet Works
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { step: '01', icon: '💰', title: 'Deposit', desc: 'Lock funds once on-chain' },
                            { step: '02', icon: '⚡', title: 'Trade', desc: 'Unlimited zero-gas trades' },
                            { step: '03', icon: '🔗', title: 'Chain', desc: 'Use positions as collateral' },
                            { step: '04', icon: '✅', title: 'Settle', desc: 'Close & withdraw anytime' }
                        ].map((item, i) => (
                            <div key={i} className="text-center group">
                                <div className="relative inline-block mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                        {item.icon}
                                    </div>
                                    <span className="absolute -top-2 -right-2 text-xs font-bold text-violet-400 bg-background px-2 py-0.5 rounded-full border border-violet-500/30">
                                        {item.step}
                                    </span>
                                </div>
                                <h4 className="font-bold text-white mb-1">{item.title}</h4>
                                <p className="text-sm text-slate-500">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Create Market Modal */}
            <CreateMarketModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
