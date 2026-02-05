/**
 * Child Market Modal Component
 * Create child markets that use parent positions as collateral
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateMarket } from '../hooks/useContracts';
import { useYellowSession } from '../hooks/useYellowSession';
import { ethers } from 'ethers';

export function ChildMarketModal({ isOpen, onClose, parentPosition }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Crypto',
        duration: '7', // days
    });

    const { extendChain } = useYellowSession();
    const { writeContract: createMarket, isPending: isCreating } = useCreateMarket();
    const [isExtending, setIsExtending] = useState(false);

    if (!parentPosition || !isOpen) return null;

    const availableCollateral = Number(parentPosition.investmentAmount) * 0.6 / 1e18; // 60% rule

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreate = async () => {
        try {
            setIsExtending(true);

            // Step 1: Create the child market on-chain
            const durationSeconds = parseInt(formData.duration) * 24 * 60 * 60;
            const liquidityWei = ethers.parseEther(availableCollateral.toString());

            const tx = await createMarket({
                args: [
                    formData.title,
                    formData.description,
                    `Child of ${parentPosition.market}`, // resolutionSource
                    formData.category,
                    false, // isDynamic
                    durationSeconds,
                    liquidityWei
                ]
            });

            // Step 2: Extend conviction chain in Yellow session
            // TODO: Get actual child market ID from tx receipt
            const childMarketId = `child-${Date.now()}`;

            await extendChain(
                parentPosition.market,
                childMarketId,
                BigInt(Math.floor(Number(parentPosition.investmentAmount) * 0.6)),
                parentPosition.side
            );

            alert('Child market created and chain extended! 🔗');
            onClose();
            setFormData({
                title: '',
                description: '',
                category: 'Crypto',
                duration: '7',
            });
        } catch (error) {
            console.error('Child market creation failed:', error);
            alert('Failed to create child market: ' + error.message);
        } finally {
            setIsExtending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">🔗 Create Child Market</h2>
                        <p className="text-purple-100 text-sm">Extend your conviction chain</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Parent Position Info */}
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="text-sm font-medium text-purple-900 mb-2">🎯 Parent Position</div>
                        <div className="space-y-1 text-sm text-purple-700">
                            <div className="flex justify-between">
                                <span>Market:</span>
                                <span className="font-medium">{parentPosition.market}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Side:</span>
                                <span className="font-medium">{parentPosition.side ? 'YES' : 'NO'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Investment:</span>
                                <span className="font-medium">${Number(parentPosition.investmentAmount) / 1e18}</span>
                            </div>
                            <div className="flex justify-between border-t border-purple-200 pt-1 mt-1">
                                <span className="font-semibold">Available Collateral (60%):</span>
                                <span className="font-bold text-purple-900">${availableCollateral.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Explanation */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">💡</span>
                            <div className="text-sm text-blue-800">
                                <p className="font-semibold mb-1">How Conviction Chains Work</p>
                                <p>Use 60% of your parent position as collateral for a new bet. If the parent wins, your chain activates! If the parent loses, the chain is void. This lets you compound your conviction across related predictions.</p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Child Market Question
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="If parent wins, then..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Describe the conditional prediction..."
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="Crypto">Crypto</option>
                                    <option value="Politics">Politics</option>
                                    <option value="Sports">Sports</option>
                                    <option value="Tech">Tech</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Duration (days)
                                </label>
                                <input
                                    type="number"
                                    name="duration"
                                    value={formData.duration}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="30"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleCreate}
                            disabled={!formData.title || !formData.description || isCreating || isExtending}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {isCreating || isExtending ? 'Creating Child Market...' : `Create Child Market (${availableCollateral.toFixed(2)} mUSD)`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
