import { ethers } from 'ethers';
import { CHAINS } from '@/types/config';

// Standard gas units for a native token transfer
const GAS_LIMIT_TRANSFER = BigInt(21_000);

// Public RPC fallbacks used when env var is not configured
const PUBLIC_RPCS: Record<string, string> = {
  ETHEREUM: 'https://rpc.ankr.com/eth',
  POLYGON: 'https://rpc.ankr.com/polygon',
  BASE: 'https://mainnet.base.org',
  ARBITRUM: 'https://arb1.arbitrum.io/rpc',
  SEPOLIA: 'https://rpc.sepolia.org',
};

export async function calculateEVMGasFee(chain: string): Promise<string> {
  // Token/network chain values arrive in mixed casing ("BASE", "base", …);
  // CHAINS and PUBLIC_RPCS are keyed uppercase.
  const chainKey = String(chain || '').toUpperCase();
  try {
    const chainConfig = CHAINS[chainKey as keyof typeof CHAINS];
    const rpcUrl = chainConfig?.rpcUrl || PUBLIC_RPCS[chainKey];

    if (!rpcUrl) {
      return chainKey === 'ETHEREUM' ? '0.0005' : '0.0001';
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const feeData = await provider.getFeeData();

    // Use maxFeePerGas (EIP-1559) when available, otherwise fall back to gasPrice
    const pricePerGas = feeData.maxFeePerGas ?? feeData.gasPrice;
    if (!pricePerGas) {
      throw new Error('Could not get gas price');
    }

    // Total fee = price per gas unit × gas units for a simple transfer
    return ethers.formatEther(pricePerGas * GAS_LIMIT_TRANSFER);
  } catch (error) {
    console.error('Error calculating gas fee:', error);
    return chainKey === 'ETHEREUM' ? '0.0005' : '0.0001';
  }
}
