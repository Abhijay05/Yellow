/**
 * Trading Interface Component
 * Buy/Sell YES/NO tokens and extend conviction chains
 */

import { useState } from 'react';
import { useYellowSession } from '../hooks/useYellowSession';
import { ChildMarketModal } from './ChildMarketModal';

export function TradingInterface({ market }) {
    const {
        isSessionActive,
        marketBuy,
        marketSell,
        extendChain,
        positions,
    } = useYellowSession();

    // For now, assume market creator can extend chain
    // In production, would check: useAccount() address === market.creator
    const isMarketCreator = false; // TODO: Implement creator check

    const [amount, setAmount] = useState('100');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('buy'); // 'buy' | 'sell' | 'chain'
    const [isChildModalOpen, setIsChildModalOpen] = useState(false);

    if (!market) {
        return (
            <div className="bg-gray-100 rounded-2xl p-8 text-center text-gray-500">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-xl font-semibold mb-2">Select a Market</h3>
                <p>Choose a prediction market to start trading</p>
            </div>
        );
    }

    if (!isSessionActive) {
        return (
            <div className="bg-gray-100 rounded-2xl p-8 text-center text-gray-500">
                <div className="text-5xl mb-4">🔒</div>
                <h3 className="text-xl font-semibold mb-2">Session Required</h3>
                <p>Open a Yellow session to start trading</p>
            </div>
        );
    }

    const handleBuy = async (side) => {
        try {
            setIsLoading(true);
            console.log('[TradingInterface] Buy clicked:', { market: market.address, side, amount });

            const buyAmount = BigInt(amount) * BigInt(10 ** 18);
            console.log('[TradingInterface] Buy amount (wei):', buyAmount.toString());

            const result = await marketBuy(market.address, side, buyAmount);
            console.log('[TradingInterface] Buy result:', result);

            alert(`Success! Received ${result.tokensReceived.toFixed(2)} ${side ? 'YES' : 'NO'} tokens`);
            setAmount('100');
        } catch (error) {
            console.error('[TradingInterface] Buy failed:', error);
            console.error('[TradingInterface] Error stack:', error.stack);
            alert('Trade failed: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSell = async (side) => {
        try {
            setIsLoading(true);
            const sellAmount = BigInt(amount);
            const result = await marketSell(market.address, side, sellAmount);

            alert(`Success! Received $${Number(result.payout) / 1e18} USDC`);
            setAmount('100');
        } catch (error) {
            console.error('Sell failed:', error);
            alert('Trade failed: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Find user's position in this market
    const userPosition = positions.find(p => p.market === market.address && !p.isCollateralBased);
    const hasPosition = !!userPosition;

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Market Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">{market.title}</h2>
                <p className="text-blue-100 text-sm">{market.description}</p>

                <div className="mt-4 flex gap-4">
                    <div className="bg-white/20 rounded-lg px-4 py-2">
                        <div className="text-xs text-blue-100">YES Price</div>
                        <div className="text-xl font-bold">$0.50</div>
                    </div>
                    <div className="bg-white/20 rounded-lg px-4 py-2">
                        <div className="text-xs text-blue-100">NO Price</div>
                        <div className="text-xl font-bold">$0.50</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('buy')}
                    className={`flex-1 py-3 font-medium transition-colors ${activeTab === 'buy'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Buy
                </button>
                <button
                    onClick={() => setActiveTab('sell')}
                    disabled={!hasPosition}
                    className={`flex-1 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === 'sell'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Sell
                </button>
                <button
                    onClick={() => setActiveTab('chain')}
                    disabled={!hasPosition}
                    className={`flex-1 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === 'chain'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    🔗 Extend Chain
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                {activeTab === 'buy' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount (USDC)
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="100"
                                min="1"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Estimated tokens: ~{amount ? (Number(amount) * 2).toFixed(2) : '0'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleBuy(true)}
                                disabled={isLoading || !amount}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                            >
                                {isLoading ? 'Buying...' : 'Buy YES ✅'}
                            </button>
                            <button
                                onClick={() => handleBuy(false)}
                                disabled={isLoading || !amount}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                            >
                                {isLoading ? 'Buying...' : 'Buy NO ❌'}
                            </button>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">⚡</span>
                                <span className="font-semibold">Instant & Free</span>
                            </div>
                            <p className="text-xs">
                                This trade executes off-chain via Yellow Network with $0 gas and instant confirmation
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'sell' && (
                    <div className="space-y-4">
                        {userPosition ? (
                            <>
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <div className="text-sm text-gray-600 mb-2">Your Position</div>
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="text-2xl font-bold">
                                                {(Number(userPosition.tokenAmount) / 1e18).toFixed(2)} {userPosition.side ? 'YES' : 'NO'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Investment: ${Number(userPosition.investmentAmount) / 1e18}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tokens to Sell
                                    </label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        max={Number(userPosition.tokenAmount)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="100"
                                        min="1"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Estimated payout: ~${amount ? (Number(amount) * 0.5).toFixed(2) : '0'}
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleSell(userPosition.side)}
                                    disabled={isLoading || !amount}
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                >
                                    {isLoading ? 'Selling...' : `Sell ${userPosition.side ? 'YES' : 'NO'} Tokens`}
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <div className="text-4xl mb-2">📭</div>
                                <p>No position in this market</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'chain' && (
                    <div className="space-y-4">
                        <div className="bg-purple-50 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">🔗</span>
                                <span className="font-semibold text-purple-900">Conviction Chains</span>
                            </div>
                            <p className="text-sm text-purple-700">
                                Use your position as collateral to bet on related outcomes. If this position wins, your chain activates!
                            </p>
                        </div>

                        {userPosition && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-sm text-gray-600 mb-2">Available Collateral</div>
                                <div className="text-3xl font-bold text-purple-600">
                                    ${(Number(userPosition.investmentAmount) * 0.6 / 1e18).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    60% of your ${Number(userPosition.investmentAmount) / 1e18} investment
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setIsChildModalOpen(true)}
                            disabled={!userPosition}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            🔗 Create Child Market
                        </button>

                        {!userPosition && (
                            <div className="text-center mt-4 text-gray-500 text-sm">
                                Buy a position first to create child markets
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Child Market Modal */}
            <ChildMarketModal
                isOpen={isChildModalOpen}
                onClose={() => setIsChildModalOpen(false)}
                parentPosition={userPosition}
            />
        </div>
    );
}
