/**
 * ChainBet Main Page
 * Yellow Network powered trading interface
 */

import { useState } from 'react';
import { SessionManager } from '../components/SessionManager';
import { MarketList } from '../components/MarketList';
import { TradingInterface } from '../components/TradingInterface';
import { CreateMarketModal } from '../components/CreateMarketModal';

export default function ChainBet() {
    const [selectedMarket, setSelectedMarket] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white py-12">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-8">
                        <h1 className="text-5xl font-bold mb-4">
                            ⚡ ChainBet
                        </h1>
                        <p className="text-2xl text-violet-100 mb-2">
                            Conviction Chains • Zero Gas • Infinite Trades
                        </p>
                        <p className="text-lg text-violet-200">
                            Powered by Yellow Network State Channels
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                            <div className="text-4xl mb-3">⚡</div>
                            <div className="text-xl font-bold mb-2">Instant Trades</div>
                            <div className="text-sm text-violet-100">
                                Sub-second execution via Yellow Clearnode
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                            <div className="text-4xl mb-3">💸</div>
                            <div className="text-xl font-bold mb-2">Zero Gas Fees</div>
                            <div className="text-sm text-violet-100">
                                All trades off-chain, save 99% on gas
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                            <div className="text-4xl mb-3">🔗</div>
                            <div className="text-xl font-bold mb-2">Conviction Chains</div>
                            <div className="text-sm text-violet-100">
                                Leverage positions for compound returns
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Session Manager */}
                <div className="mb-8">
                    <SessionManager />
                </div>

                {/* Trading Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Market List */}
                    <div>
                        {/* Create Market Button */}
                        <div className="mb-6">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                                <span className="text-2xl">+</span>
                                Create New Market
                            </button>
                        </div>

                        <MarketList
                            selectedMarket={selectedMarket}
                            onSelectMarket={setSelectedMarket}
                        />
                    </div>

                    {/* Trading Interface */}
                    <div className="lg:sticky lg:top-24 lg:self-start">
                        <TradingInterface market={selectedMarket} />
                    </div>
                </div>

                {/* Info Banner */}
                <div className="mt-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
                    <div className="max-w-3xl mx-auto text-center">
                        <h3 className="text-2xl font-bold mb-4">
                            🚀 Why ChainBet is Revolutionary
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                            <div>
                                <div className="font-semibold mb-2">Traditional Prediction Markets:</div>
                                <ul className="space-y-1 text-sm text-blue-100">
                                    <li>• $5-50 per trade in gas</li>
                                    <li>• Can't chain positions (too expensive)</li>
                                    <li>• Active trading punished</li>
                                    <li>• Simple strategies only</li>
                                </ul>
                            </div>
                            <div>
                                <div className="font-semibold mb-2">ChainBet on Yellow Network:</div>
                                <ul className="space-y-1 text-sm text-purple-100">
                                    <li>• $0 gas for all trades</li>
                                    <li>• Infinite position chaining</li>
                                    <li>• Active trading rewarded</li>
                                    <li>• Complex strategies enabled</li>
                                </ul>
                            </div>
                        </div>
                        <div className="mt-6 p-4 bg-white/20 rounded-lg">
                            <p className="text-sm">
                                <strong>Example:</strong> Alice makes 50 trades/month. On Ethereum: <span className="line-through">$750</span> in gas fees.
                                On ChainBet: <span className="text-green-300 font-bold">$0</span> 🎉
                            </p>
                        </div>
                    </div>
                </div>

                {/* How It Works */}
                <div className="mt-12 bg-white rounded-2xl shadow-xl p-8">
                    <h3 className="text-2xl font-bold text-center mb-8">How ChainBet Works</h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">1️⃣</span>
                            </div>
                            <h4 className="font-bold mb-2">Deposit</h4>
                            <p className="text-sm text-gray-600">
                                Lock funds in Yellow Custody Contract (one-time gas fee)
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">2️⃣</span>
                            </div>
                            <h4 className="font-bold mb-2">Trade</h4>
                            <p className="text-sm text-gray-600">
                                Make unlimited trades off-chain via Yellow state channels (FREE!)
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">3️⃣</span>
                            </div>
                            <h4 className="font-bold mb-2">Chain</h4>
                            <p className="text-sm text-gray-600">
                                Use winning positions as collateral for new bets (instant, free)
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">4️⃣</span>
                            </div>
                            <h4 className="font-bold mb-2">Settle</h4>
                            <p className="text-sm text-gray-600">
                                Close session & settle final state on-chain (one-time gas fee)
                            </p>
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
