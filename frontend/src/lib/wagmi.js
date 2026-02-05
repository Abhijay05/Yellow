import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// RPC URL - using public Sepolia endpoint (replace with your own Alchemy key for better reliability)
const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/CskHk9SZcRRl6rVoeTMgQteeSedvv2fv'

export const config = createConfig({
    chains: [sepolia],
    connectors: [
        injected(),
    ],
    transports: {
        [sepolia.id]: http(SEPOLIA_RPC),
    },
})

// Deployed Contract Addresses on Sepolia
// Deployed Contract Addresses on Sepolia
export const ROUTER = import.meta.env.VITE_MARKET_FACTORY || '0x20BEc9a3f4bf08903c493dE0dAF04E1E82FbfB4e';
export const MOCK_USD = import.meta.env.VITE_MOCK_USD || '0x22028d7aBD23a99C59EF670a7fE638149f90fe39';
