/**
 * Market Resolution Component
 * Allows market creator to resolve markets after deadline
 */

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LvrMarketABI } from '../lib/contracts';

export function MarketResolution({ market, onResolved }) {
    const { address } = useAccount();
    const [selectedOutcome, setSelectedOutcome] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const { writeContractAsync, data: hash } = useWriteContract();
    const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

    // Check if user is the creator
    const isCreator = address && market.creator &&
        address.toLowerCase() === market.creator.toLowerCase();

    // Check if deadline has passed
    const now = Math.floor(Date.now() / 1000);
    const canResolve = isCreator && now > market.deadline;

    const handleResolve = async (outcome) => {
        setSelectedOutcome(outcome);
        setShowConfirm(true);
    };

    const confirmResolve = async () => {
        try {
            setShowConfirm(false);

            // Call resolveMarket on the contract
            const tx = await writeContractAsync({
                address: market.address,
                abi: LvrMarketABI,
                functionName: 'resolveMarket',
                args: [selectedOutcome === 'YES'], // true for YES, false for NO
            });

            console.log('Market resolved:', tx);

            // Notify parent component
            if (onResolved) {
                onResolved(selectedOutcome);
            }

            alert(`Market resolved as ${selectedOutcome}! Transaction: ${tx}`);
        } catch (error) {
            console.error('Failed to resolve market:', error);
            alert('Failed to resolve market: ' + error.message);
        }
    };

    if (!canResolve) {
        if (!isCreator) {
            return null; // Don't show button if not creator
        }

        const timeLeft = market.deadline - now;
        const hoursLeft = Math.floor(timeLeft / 3600);

        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                    ⏳ Market can be resolved in {hoursLeft} hours
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
            <h3 className="text-xl font-bold mb-4">🎯 Ready to Resolve</h3>
            <p className="text-sm text-white/80 mb-6">
                As the market creator, you can now resolve this question
            </p>

            <div className="grid grid-cols-3 gap-4">
                <button
                    onClick={() => handleResolve('YES')}
                    disabled={isConfirming}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50"
                >
                    ✅ YES
                </button>
                <button
                    onClick={() => handleResolve('NO')}
                    disabled={isConfirming}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50"
                >
                    ❌ NO
                </button>
                <button
                    onClick={() => handleResolve('INVALID')}
                    disabled={isConfirming}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50"
                >
                    ⚠️ INVALID
                </button>
            </div>

            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md mx-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            Confirm Resolution
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to resolve this market as <strong>{selectedOutcome}</strong>?
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={confirmResolve}
                                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-lg"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isConfirming && (
                <div className="mt-4 bg-white/20 rounded-lg p-3 text-center">
                    <p className="text-sm">⏳ Confirming transaction...</p>
                </div>
            )}
        </div>
    );
}
