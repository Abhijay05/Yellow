/**
 * Trading Interface - Premium UI
 * Beautiful buy/sell interface with live price impact
 */

import { useState, useEffect, useCallback } from 'react';
import { useYellowSession } from '../hooks/useYellowSession';
import { useMUSDBalance } from '../hooks/useContracts';
import {
    TrendingUp,
    TrendingDown,
    Loader2,
    DollarSign,
    ArrowRight,
    Zap,
    AlertCircle,
    Calculator,
    RefreshCw
} from 'lucide-react';
import { ethers } from 'ethers';
import { LvrMarketABI, ERC20ABI } from '../lib/contracts';

export function TradingInterface({ market }) {
    const { isSessionActive, balance, marketBuy, marketSell, positions } = useYellowSession();
    const [selectedSide, setSelectedSide] = useState(true); // true = YES, false = NO
    const [amount, setAmount] = useState('100');
    const [isLoading, setIsLoading] = useState(false);
    const [reserves, setReserves] = useState({ yes: 0, no: 0, k: 0 });
    const [estimatedTokens, setEstimatedTokens] = useState(0);
    const [priceImpact, setPriceImpact] = useState(0);

    // Fetch reserves
    const fetchReserves = useCallback(async () => {
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

            setReserves({
                yes: Number(yesReserve) / 1e18,
                no: Number(noReserve) / 1e18,
                k: Number(yesReserve) * Number(noReserve) / 1e36
            });
        } catch (error) {
            console.error('Failed to fetch reserves:', error);
        }
    }, [market?.address]);

    useEffect(() => {
        fetchReserves();
        const interval = setInterval(fetchReserves, 5000);
        return () => clearInterval(interval);
    }, [fetchReserves]);

    // Calculate estimated tokens and price impact
    useEffect(() => {
        if (!amount || !reserves.yes || !reserves.no) {
            setEstimatedTokens(0);
            setPriceImpact(0);
            return;
        }

        try {
            const inputAmount = parseFloat(amount);
            const buyReserve = selectedSide ? reserves.yes : reserves.no;
            const sellReserve = selectedSide ? reserves.no : reserves.yes;

            // AMM calculation: tokens = reserve * amount / (sellReserve + amount)
            const tokens = (buyReserve * inputAmount) / (sellReserve + inputAmount);
            setEstimatedTokens(tokens);

            // Price impact
            const oldPrice = buyReserve / sellReserve;
            const newPrice = (buyReserve - tokens) / (sellReserve + inputAmount);
            const impact = Math.abs((newPrice - oldPrice) / oldPrice * 100);
            setPriceImpact(impact);
        } catch {
            setEstimatedTokens(0);
            setPriceImpact(0);
        }
    }, [amount, reserves, selectedSide]);

    const handleBuy = async () => {
        try {
            setIsLoading(true);
            const buyAmount = BigInt(Math.floor(parseFloat(amount) * 1e18));
            const result = await marketBuy(market.address, selectedSide, buyAmount);

            alert(`✅ Trade Executed!\n\n💰 Received: ${result.tokensReceived.toFixed(4)} ${selectedSide ? 'YES' : 'NO'} tokens\n📝 Tx Hash: ${result.txHash}\n🔄 State Version: ${result.stateVersion}`);
            setAmount('100');
            fetchReserves();
        } catch (error) {
            alert('❌ Trade failed: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Format balance
    const formatBalance = (value) => {
        if (!value) return '0.00';
        try {
            const num = typeof value === 'bigint' ? Number(value) / 1e18 : Number(value) / 1e18;
            if (!isFinite(num)) return '0.00';
            return num.toFixed(2);
        } catch {
            return '0.00';
        }
    };

    if (!market) {
        return (
            <div className="premium-card p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4">
                    <TrendingUp className="w-8 h-8 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Select a Market</h3>
                <p className="text-slate-400">Choose a market from the list to start trading</p>
            </div>
        );
    }

    if (!isSessionActive) {
        return (
            <div className="premium-card p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
                    <Zap className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Session Required</h3>
                <p className="text-slate-400">Open a Yellow session above to start trading with zero gas</p>
            </div>
        );
    }

    return (
        <div className="premium-card overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-violet-400" />
                        Trade
                    </h3>
                    <button
                        onClick={fetchReserves}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            </div>

            <div className="p-5 space-y-5">
                {/* Side Selection */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setSelectedSide(true)}
                        className={`outcome-btn outcome-yes ${selectedSide ? 'active' : ''}`}
                    >
                        <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                        <span className="block text-lg font-bold">YES</span>
                        <span className="text-sm opacity-75">{(reserves.no / (reserves.yes + reserves.no) * 100 || 50).toFixed(0)}¢</span>
                    </button>
                    <button
                        onClick={() => setSelectedSide(false)}
                        className={`outcome-btn outcome-no ${!selectedSide ? 'active' : ''}`}
                    >
                        <TrendingDown className="w-5 h-5 mx-auto mb-1" />
                        <span className="block text-lg font-bold">NO</span>
                        <span className="text-sm opacity-75">{(reserves.yes / (reserves.yes + reserves.no) * 100 || 50).toFixed(0)}¢</span>
                    </button>
                </div>

                {/* Amount Input */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-400">Amount</label>
                        <span className="text-xs text-slate-500">
                            Available: <span className="text-emerald-400">${formatBalance(balance?.available)}</span>
                        </span>
                    </div>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="premium-input pl-12 text-xl font-bold"
                            placeholder="100"
                        />
                    </div>
                    <div className="flex gap-2 mt-3">
                        {[50, 100, 250, 500].map((amt) => (
                            <button
                                key={amt}
                                onClick={() => setAmount(amt.toString())}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${amount === amt.toString()
                                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/50'
                                        : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                ${amt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Estimate */}
                <div className="p-4 rounded-xl bg-white/3 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">You'll receive</span>
                        <span className={`text-lg font-bold ${selectedSide ? 'text-emerald-400' : 'text-red-400'}`}>
                            ~{estimatedTokens.toFixed(2)} {selectedSide ? 'YES' : 'NO'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Avg. price</span>
                        <span className="text-sm text-white">
                            {estimatedTokens > 0 ? (parseFloat(amount) / estimatedTokens * 100).toFixed(1) : '0'}¢
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Price impact</span>
                        <span className={`text-sm font-medium ${priceImpact > 5 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {priceImpact.toFixed(2)}%
                        </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        <span className="text-sm text-slate-400 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            Gas fee
                        </span>
                        <span className="text-sm font-bold text-emerald-400">$0.00</span>
                    </div>
                </div>

                {/* High Impact Warning */}
                {priceImpact > 10 && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <p className="text-sm text-amber-300">
                            High price impact! Consider a smaller trade.
                        </p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleBuy}
                    disabled={isLoading || !amount || parseFloat(amount) <= 0}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${selectedSide
                            ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
                            : 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40'
                        }`}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            Buy {selectedSide ? 'YES' : 'NO'}
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>

                {/* Zero Gas Badge */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    Instant settlement via Yellow Network
                </div>
            </div>
        </div>
    );
}
