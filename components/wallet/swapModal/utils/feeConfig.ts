import { PublicKey } from '@solana/web3.js';

// The wallet address that will receive platform fees
export const PLATFORM_FEE_WALLET = new PublicKey(
  'HPmEbq6VMzE8dqRuFjLrNNxmqzjvP72jCofoFap5vBR2'
);

// Platform fee in basis points (25 = 0.25%)
export const PLATFORM_FEE_BPS = 25;
