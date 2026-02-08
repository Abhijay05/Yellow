import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// RPC URL - using Alchemy Sepolia from environment variable
const ALCHEMY_RPC = import.meta.env.VITE_ALCHEMY_RPC || 'https://rpc.sepolia.org'

export const config = createConfig({
    chains: [sepolia],
    connectors: [
        injected(),
    ],
    transports: {
        [sepolia.id]: http(ALCHEMY_RPC),
    },
})

// Deployed Contract Addresses on Sepolia
export const ROUTER = '0x9cac07fd1a2196caf7c79932cf473bf0fb72ba9b';
export const MOCK_USD = '0x2296fa2947a3f59d1fbf5d43e97498c0120e1347';
