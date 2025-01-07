import { PublicKey } from '@solana/web3.js';

/**
 * Fetch the price of a given token quoted in USD
 * @param tokenAddress The token mint address
 * @returns The price of the token in USDC
 */

export async function fetchPrice(
  tokenAddress: PublicKey
): Promise<string> {
  try {
    const response = await fetch(
      `https://api.jup.ag/price/v2?ids=${tokenAddress}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch price');
    }
    const data = await response.json();

    const price = data.data[tokenAddress.toBase58()].price;
    if (!price) {
      return '0';
    }
    return price;
  } catch (error: any) {
    console.error('Error fetching price:', error);
    return '0';
  }
}
