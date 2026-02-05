/**
 * ChainBet Main Page - REVAMPED
 * Yellow Network powered trading interface with proper state display
 */

import { useState } from 'react';
import { SessionManager } from '../components/SessionManager';
import { MarketList } from '../components/MarketList';
import { TradingInterface } from '../components/TradingInterface';
import { CreateMarketModal } from '../components/CreateMarketModal';
import { UserStatePanel } from '../components/UserStatePanel';
import { MarketStatePanel } from '../components/MarketStatePanel';
import { PositionsDashboard } from '../components/PositionsDashboard';

export default function ChainBet() {
    const [selectedMarket, setSelectedMarket] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white py-10">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-6">
                        <h1 className="text-4xl font-bold mb-2">
                            ⚡ ChainBet
                        </h1>
                        <p className="text-lg text-violet-100">
                            Conviction Chains • Zero Gas • Powered by Yellow Network
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                            <div className="text-2xl mb-2">⚡</div>
                            <div className="font-bold">Instant Trades</div>
                            <div className="text-xs text-violet-200">Sub-second via Yellow</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                            <div className="text-2xl mb-2">💸</div>
                            <div className="font-bold">Zero Gas</div>
                            <div className="text-xs text-violet-200">All trades off-chain</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                            <div className="text-2xl mb-2">🔗</div>
                            <div className="font-bold">Conviction Chains</div>
                            <div className="text-xs text-violet-200">Compound your bets</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - 3 Column Layout */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Session Manager - Full Width */}
                <div className="mb-6">
                    <SessionManager />
                </div>

                {/* Main Grid: User State | Markets/Trading | Market State */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column - User State Panel */}
                    <div className="lg:col-span-3">
                        <div className="sticky top-4 space-y-6">
                            <UserStatePanel />
                        </div>
                    </div>

                    {/* Center Column - Markets & Trading */}
                    <div className="lg:col-span-6 space-y-6">
                        {/* Create Market Button */}
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                            <span className="text-xl">+</span>
                            Create New Market
                        </button>

                        {/* Market List */}
                        <MarketList
                            selectedMarket={selectedMarket}
                            onSelectMarket={setSelectedMarket}
                        />

                        {/* Trading Interface */}
                        <TradingInterface market={selectedMarket} />

                        {/* Positions Dashboard */}
                        <PositionsDashboard />
                    </div>

                    {/* Right Column - Market State Panel */}
                    <div className="lg:col-span-3">
                        <div className="sticky top-4">
                            <MarketStatePanel market={selectedMarket} />
                        </div>
                    </div>
                </div>

                {/* How It Works - Compact */}
                <div className="mt-10 bg-gray-800 rounded-2xl p-6 border border-gray-700">
                    <h3 className="text-xl font-bold text-white text-center mb-6">How ChainBet Works</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-xl">1️⃣</span>
                            </div>
                            <h4 className="font-bold text-white text-sm">Deposit</h4>
                            <p className="text-xs text-gray-400">Lock funds in Yellow</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-xl">2️⃣</span>
                            </div>
                            <h4 className="font-bold text-white text-sm">Trade</h4>
                            <p className="text-xs text-gray-400">Unlimited free trades</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-xl">3️⃣</span>
                            </div>
                            <h4 className="font-bold text-white text-sm">Chain</h4>
                            <p className="text-xs text-gray-400">Use positions as collateral</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-xl">4️⃣</span>
                            </div>
                            <h4 className="font-bold text-white text-sm">Settle</h4>
                            <p className="text-xs text-gray-400">Close & withdraw</p>
                        </div>
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
