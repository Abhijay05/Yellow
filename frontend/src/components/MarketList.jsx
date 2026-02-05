/**
 * Market List Component
 * Display available prediction markets
 */

import { useState } from 'react';
import { CountdownTimer } from './CountdownTimer';
import { useMarkets } from '../hooks/useContracts';

export function MarketList({ onSelectMarket, selectedMarket }) {
    const [filter, setFilter] = useState('All');
    const { data: realMarkets, isLoading } = useMarkets();

    const categories = ['All', 'Crypto', 'Politics', 'Sports', 'Tech'];

    // Combine demo markets (for display) with real markets
    // In production you might want to only show real markets
    // const markets = realMarkets || []; 
    // For hackathon demo, let's mix them so list isn't empty if fetch fails
    const markets = realMarkets ? [...realMarkets] : [];

    const filteredMarkets = filter === 'All'
        ? markets
        : markets.filter(m => m.category === filter);

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <div className="animate-spin text-4xl">🌀</div>
            </div>
        );
    }

    if (markets.length === 0) {
        return (
            <div className="text-center p-12 bg-gray-50 rounded-xl">
                <p className="text-gray-500">No markets found. Create the first one! 🚀</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Markets</h2>

                {/* Category Filter */}
                <div className="flex gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === cat
                                ? 'bg-blue-500 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4">
                {filteredMarkets.map(market => (
                    <div
                        key={market.id}
                        onClick={() => onSelectMarket(market)}
                        className={`bg-white rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg border-2 ${selectedMarket?.id === market.id
                            ? 'border-blue-500 shadow-lg'
                            : 'border-transparent hover:border-blue-200'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                        {market.category}
                                    </span>
                                    <CountdownTimer endTime={(market.deadline || Date.now() / 1000 + 86400) * 1000} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    {market.title}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {market.description}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <div className="bg-emerald-50 rounded-lg p-3">
                                <div className="text-xs text-emerald-600 font-medium mb-1">YES</div>
                                <div className="text-xl font-bold text-emerald-700">
                                    ${Number(market?.priceYes || 0.5).toFixed(2)}
                                </div>
                            </div>

                            <div className="bg-red-50 rounded-lg p-3">
                                <div className="text-xs text-red-600 font-medium mb-1">NO</div>
                                <div className="text-xl font-bold text-red-700">
                                    ${Number(market?.priceNo || 0.5).toFixed(2)}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-600 font-medium mb-1">Volume</div>
                                <div className="text-lg font-bold text-gray-700">
                                    ${Number(market?.volume || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-600 font-medium mb-1">Liquidity</div>
                                <div className="text-lg font-bold text-gray-700">
                                    ${parseFloat(market?.liquidity || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                        </div>

                        {selectedMarket?.id === market.id && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 font-medium">
                                ✓ Selected • Ready to trade
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filteredMarkets.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <div className="text-5xl mb-4">📭</div>
                    <p className="text-lg font-medium">No markets found</p>
                    <p className="text-sm">Try a different category</p>
                </div>
            )}
        </div>
    );
}
