/**
 * Trading Interface Component - REVAMPED
 * Buy/Sell YES/NO tokens with real-time reserves and probabilities
 */

import { useState, useEffect } from 'react';
import { useYellowSession } from '../hooks/useYellowSession';
import { ChildMarketModal } from './ChildMarketModal';
import { ethers } from 'ethers';
import { LvrMarketABI, ERC20ABI } from '../lib/contracts';

export function TradingInterface({ market }) {
    const {
        isSessionActive,
        marketBuy,
        marketSell,
        positions,
        balance,
    } = useYellowSession();

    const [amount, setAmount] = useState('10');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('buy');
    const [isChildModalOpen, setIsChildModalOpen] = useState(false);

    // Real-time reserves and probabilities
    const [reserves, setReserves] = useState({
        yesReserve: 0,
        noReserve: 0,
        liquidity: 0,
        yesProbability: 50,
        noProbability: 50
    });
    const [loadingReserves, setLoadingReserves] = useState(true);

    // Fetch reserves on mount and every 3 seconds
    useEffect(() => {
        if (market?.address) {
            fetchReserves();
            const interval = setInterval(fetchReserves, 3000);
            return () => clearInterval(interval);
        }
    }, [market?.address]);

    const fetchReserves = async () => {
        if (!market?.address || !window.ethereum) return;

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const marketContract = new ethers.Contract(market.address, LvrMarketABI, provider);

            const yesTokenAddr = await marketContract.yesToken();
            const noTokenAddr = await marketContract.noToken();

            const yesToken = new ethers.Contract(yesTokenAddr, ERC20ABI, provider);
            const noToken = new ethers.Contract(noTokenAddr, ERC20ABI, provider);

            const yesReserve = await yesToken.balanceOf(market.address);
            const noReserve = await noToken.balanceOf(market.address);

            const marketDetails = await marketContract.getMarketDetails();
            const liquidity = marketDetails[3];

            // Calculate probabilities from reserves
            const totalReserve = yesReserve + noReserve;
            const yesProbability = totalReserve > 0n
                ? (Number(noReserve) / Number(totalReserve)) * 100  // Lower reserve = Higher probability
                : 50;
            const noProbability = 100 - yesProbability;

            setReserves({
                yesReserve: Number(yesReserve) / 1e18,
                noReserve: Number(noReserve) / 1e18,
                liquidity: Number(liquidity) / 1e18,
                yesProbability: yesProbability,
                noProbability: noProbability
            });
            setLoadingReserves(false);
        } catch (error) {
            console.error('Failed to fetch reserves:', error);
            setLoadingReserves(false);
        }
    };

    // Find user's position in this market
    const userPosition = positions?.find(p => p.market === market?.address);
    const hasPosition = !!userPosition;
    const userTokens = userPosition ? Number(userPosition.tokenAmount) / 1e18 : 0;

    if (!market) {
        return (
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 text-center">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Select a Market</h3>
                <p className="text-gray-500">Choose a prediction market to start trading</p>
            </div>
        );
    }

    if (!isSessionActive) {
        return (
            <div className="bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl p-8 text-center border border-violet-200">
                <div className="text-5xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Session Required</h3>
                <p className="text-gray-500">Open a Yellow session above to start trading</p>
            </div>
        );
    }

    const handleBuy = async (side) => {
        try {
            setIsLoading(true);
            const buyAmount = BigInt(amount) * BigInt(10 ** 18);
            const result = await marketBuy(market.address, side, buyAmount);

            alert(`✅ Trade Executed!

💰 Received: ${result.tokensReceived.toFixed(4)} ${side ? 'YES' : 'NO'} tokens
📝 Tx Hash: ${result.txHash}
🔄 State Version: ${result.stateVersion}`);
            setAmount('10');
            fetchReserves(); // Refresh immediately
        } catch (error) {
            console.error('Buy failed:', error);
            alert('❌ Trade failed: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSell = async (side, tokenAmount) => {
        try {
            setIsLoading(true);
            const result = await marketSell(market.address, side, tokenAmount);

            alert(`✅ Sell Executed!

💰 Received: $${(Number(result.payout) / 1e18).toFixed(2)} USDC
📝 Tx Hash: ${result.txHash}
🔄 State Version: ${result.stateVersion}`);
            setAmount('10');
            fetchReserves();
        } catch (error) {
            console.error('Sell failed:', error);
            alert('❌ Sell failed: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Market Header with Probabilities */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <h2 className="text-xl font-bold mb-2">{market.title || market.question}</h2>
                <p className="text-indigo-100 text-sm mb-4">{market.description}</p>

                {/* Probability Pills */}
                <div className="flex gap-4 mb-4">
                    <div className="flex-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-white/90 text-sm font-medium">✅ YES</span>
                        </div>
                        <div className="text-3xl font-bold">
                            {reserves.yesProbability.toFixed(1)}%
                        </div>
                    </div>
                    <div className="flex-1 bg-gradient-to-r from-red-400 to-rose-500 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-white/90 text-sm font-medium">❌ NO</span>
                        </div>
                        <div className="text-3xl font-bold">
                            {reserves.noProbability.toFixed(1)}%
                        </div>
                    </div>
                </div>

                {/* Probability Bar */}
                <div className="h-3 bg-white/20 rounded-full overflow-hidden flex">
                    <div
                        className="bg-green-400 transition-all duration-500"
                        style={{ width: `${reserves.yesProbability}%` }}
                    />
                    <div
                        className="bg-red-400 transition-all duration-500"
                        style={{ width: `${reserves.noProbability}%` }}
                    />
                </div>
            </div>

            {/* Reserves Display */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-6">
                        <div>
                            <span className="text-gray-500">YES Reserve: </span>
                            <span className="font-bold text-green-600">{reserves.yesReserve.toFixed(2)} tokens</span>
                        </div>
                        <div>
                            <span className="text-gray-500">NO Reserve: </span>
                            <span className="font-bold text-red-600">{reserves.noReserve.toFixed(2)} tokens</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-gray-500">Liquidity: </span>
                        <span className="font-bold text-indigo-600">${reserves.liquidity.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* User Balance & Position Quick View */}
            <div className="bg-gray-50 p-4 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">💰 Available:</span>
                        <span className="font-bold text-gray-900">
                            ${balance?.available ? (Number(balance.available) / 1e18).toFixed(2) : '0.00'}
                        </span>
                    </div>
                    {hasPosition && (
                        <div className="flex items-center gap-2 bg-indigo-100 px-3 py-1 rounded-full">
                            <span className="text-sm text-indigo-800">
                                {userPosition.side ? '✅ YES' : '❌ NO'}:
                            </span>
                            <span className="font-bold text-indigo-900">
                                {userTokens.toFixed(2)} tokens
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab('buy')}
                    className={`flex-1 py-3 font-medium transition-colors ${activeTab === 'buy'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    💰 Buy
                </button>
                <button
                    onClick={() => setActiveTab('sell')}
                    disabled={!hasPosition}
                    className={`flex-1 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === 'sell'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    💸 Sell {hasPosition && `(${userTokens.toFixed(0)})`}
                </button>
                <button
                    onClick={() => setActiveTab('chain')}
                    className={`flex-1 py-3 font-medium transition-colors ${activeTab === 'chain'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    🔗 Child Markets
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                {activeTab === 'buy' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount to Spend (USDC)
                            </label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-bold"
                                placeholder="10"
                                min="1"
                            />
                            <div className="flex gap-2 mt-2">
                                {[10, 25, 50, 100].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setAmount(v.toString())}
                                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                                    >
                                        ${v}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleBuy(true)}
                                disabled={isLoading || !amount}
                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            >
                                <div className="text-lg">{isLoading ? '⏳ Buying...' : '✅ Buy YES'}</div>
                                <div className="text-xs text-white/80 mt-1">
                                    {reserves.yesProbability.toFixed(0)}% probability
                                </div>
                            </button>
                            <button
                                onClick={() => handleBuy(false)}
                                disabled={isLoading || !amount}
                                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            >
                                <div className="text-lg">{isLoading ? '⏳ Buying...' : '❌ Buy NO'}</div>
                                <div className="text-xs text-white/80 mt-1">
                                    {reserves.noProbability.toFixed(0)}% probability
                                </div>
                            </button>
                        </div>

                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                            <div className="flex items-center gap-2 text-amber-800">
                                <span className="text-lg">⚡</span>
                                <span className="font-semibold">Instant & Free via Yellow Network</span>
                            </div>
                            <p className="text-xs text-amber-700 mt-1">
                                $0 gas fees • &lt;1 second confirmation • Off-chain state channels
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'sell' && (
                    <div className="space-y-4">
                        {hasPosition ? (
                            <>
                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                                    <div className="text-sm text-gray-600 mb-2">Your Position in This Market</div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className={`text-2xl font-bold ${userPosition.side ? 'text-green-600' : 'text-red-600'}`}>
                                                {userTokens.toFixed(4)} {userPosition.side ? 'YES' : 'NO'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Invested: ${(Number(userPosition.investmentAmount) / 1e18).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleSell(userPosition.side, userPosition.tokenAmount / 2n)}
                                        disabled={isLoading}
                                        className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 shadow-lg"
                                    >
                                        <div>Sell 50%</div>
                                        <div className="text-xs text-white/80 mt-1">
                                            {(userTokens / 2).toFixed(2)} tokens
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => handleSell(userPosition.side, userPosition.tokenAmount)}
                                        disabled={isLoading}
                                        className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 shadow-lg"
                                    >
                                        <div>Sell All</div>
                                        <div className="text-xs text-white/80 mt-1">
                                            {userTokens.toFixed(2)} tokens
                                        </div>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <div className="text-4xl mb-2">📭</div>
                                <p>No position in this market</p>
                                <p className="text-sm text-gray-400 mt-1">Buy tokens first to sell them</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'chain' && (
                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">🔗</span>
                                <span className="font-bold text-purple-900">Conviction Chains</span>
                            </div>
                            <p className="text-sm text-purple-700">
                                Create child markets using your position as collateral. If your prediction wins, your chain's liquidity activates!
                            </p>
                        </div>

                        {hasPosition && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="text-sm text-gray-600 mb-2">Available Collateral</div>
                                <div className="text-3xl font-bold text-purple-600">
                                    ${((Number(userPosition.investmentAmount) / 1e18) * 0.6).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    60% of your ${(Number(userPosition.investmentAmount) / 1e18).toFixed(2)} position
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setIsChildModalOpen(true)}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
                        >
                            🔗 Create Child Market
                        </button>

                        {!hasPosition && (
                            <p className="text-center text-sm text-gray-500">
                                💡 Buy a position first to create child markets with it as collateral
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Child Market Modal */}
            <ChildMarketModal
                isOpen={isChildModalOpen}
                onClose={() => setIsChildModalOpen(false)}
                parentPosition={userPosition}
                parentMarket={market}
            />
        </div>
    );
}
