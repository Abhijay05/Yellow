/**
 * Reserves Display Component
 * Shows real-time YES/NO reserves and liquidity for a market
 */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LvrMarketABI, ERC20ABI } from '../lib/contracts';

export function ReservesDisplay({ marketAddress }) {
    const [reserves, setReserves] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReserves();

        // Refresh every 3 seconds
        const interval = setInterval(fetchReserves, 3000);
        return () => clearInterval(interval);
    }, [marketAddress]);

    const fetchReserves = async () => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const marketContract = new ethers.Contract(marketAddress, LvrMarketABI, provider);

            // Get token addresses
            const yesTokenAddr = await marketContract.yesToken();
            const noTokenAddr = await marketContract.noToken();

            // Get reserves
            const yesToken = new ethers.Contract(yesTokenAddr, ERC20ABI, provider);
            const noToken = new ethers.Contract(noTokenAddr, ERC20ABI, provider);

            const yesReserve = await yesToken.balanceOf(marketAddress);
            const noReserve = await noToken.balanceOf(marketAddress);

            // Get liquidity
            const marketDetails = await marketContract.getMarketDetails();
            const liquidity = marketDetails[3];

            // Calculate prices
            const totalSupply = yesReserve + noReserve;
            const yesPrice = totalSupply > 0n ? Number(yesReserve) / Number(totalSupply) : 0.5;
            const noPrice = totalSupply > 0n ? Number(noReserve) / Number(totalSupply) : 0.5;

            setReserves({
                yesReserve: Number(yesReserve) / 1e18,
                noReserve: Number(noReserve) / 1e18,
                liquidity: Number(liquidity) / 1e18,
                yesPrice,
                noPrice,
            });

            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch reserves:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-50 rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
            </div>
        );
    }

    if (!reserves) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                💧 Liquidity Pool
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* YES Reserve */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-green-600">✅ YES</span>
                        <span className="text-xs text-gray-500">
                            {(reserves.yesPrice * 100).toFixed(1)}%
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {reserves.yesReserve.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">tokens in pool</p>
                </div>

                {/* NO Reserve */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-red-600">❌ NO</span>
                        <span className="text-xs text-gray-500">
                            {(reserves.noPrice * 100).toFixed(1)}%
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {reserves.noReserve.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">tokens in pool</p>
                </div>
            </div>

            {/* Total Liquidity */}
            <div className="bg-indigo-500 rounded-lg p-4 text-white">
                <p className="text-xs font-medium mb-1 opacity-90">Total Liquidity</p>
                <p className="text-3xl font-bold">
                    ${reserves.liquidity.toFixed(2)}
                </p>
            </div>

            {/* Price Bar */}
            <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span>Price Distribution</span>
                    <span>YES vs NO</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
                    <div
                        className="bg-green-500"
                        style={{ width: `${reserves.yesPrice * 100}%` }}
                    ></div>
                    <div
                        className="bg-red-500"
                        style={{ width: `${reserves.noPrice * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
