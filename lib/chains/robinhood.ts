// Robinhood Chain (Arbitrum Orbit L2, ETH gas) — not in viem/chains yet, so
// define it locally. Public RPC is rate-limited; prefer the Alchemy URL
// (ALCHEMY_RPC_URLS.ROBINHOOD in types/config.ts) wherever a transport is built.
import { defineChain } from 'viem';

export const ROBINHOOD_CHAIN_ID = 4663;

export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mainnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://robinhoodchain.blockscout.com',
    },
  },
  contracts: {
    multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' },
  },
});
