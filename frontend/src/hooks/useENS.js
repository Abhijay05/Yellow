import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { normalize } from 'viem/ens';

/**
 * Custom hook to resolve ENS names on Sepolia testnet
 * @param {string} address - Ethereum address to resolve
 * @returns {object} { ensName, isLoading }
 */
export function useENSName(address) {
    const [ensName, setEnsName] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const publicClient = usePublicClient();

    useEffect(() => {
        if (!address || !publicClient) {
            setEnsName(null);
            return;
        }

        let isMounted = true;
        setIsLoading(true);

        const resolveENS = async () => {
            try {
                // Get ENS name for the address on Sepolia
                const name = await publicClient.getEnsName({
                    address: address,
                });

                if (isMounted) {
                    setEnsName(name);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Error resolving ENS name:', error);
                if (isMounted) {
                    setEnsName(null);
                    setIsLoading(false);
                }
            }
        };

        resolveENS();

        return () => {
            isMounted = false;
        };
    }, [address, publicClient]);

    return { ensName, isLoading };
}

/**
 * Custom hook to resolve address from ENS name on Sepolia testnet
 * @param {string} name - ENS name to resolve
 * @returns {object} { address, isLoading }
 */
export function useENSAddress(name) {
    const [address, setAddress] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const publicClient = usePublicClient();

    useEffect(() => {
        if (!name || !publicClient) {
            setAddress(null);
            return;
        }

        let isMounted = true;
        setIsLoading(true);

        const resolveAddress = async () => {
            try {
                // Normalize the ENS name
                const normalizedName = normalize(name);

                // Get address for the ENS name on Sepolia
                const resolvedAddress = await publicClient.getEnsAddress({
                    name: normalizedName,
                });

                if (isMounted) {
                    setAddress(resolvedAddress);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Error resolving ENS address:', error);
                if (isMounted) {
                    setAddress(null);
                    setIsLoading(false);
                }
            }
        };

        resolveAddress();

        return () => {
            isMounted = false;
        };
    }, [name, publicClient]);

    return { address, isLoading };
}

/**
 * Utility function to format address display with ENS name fallback
 * @param {string} address - Ethereum address
 * @param {string} ensName - ENS name (optional)
 * @returns {string} Formatted display string
 */
export function formatAddressOrENS(address, ensName) {
    if (ensName) {
        return ensName;
    }

    if (!address) {
        return '';
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
