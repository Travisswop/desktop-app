import { ethers } from 'ethers';
import { CHAINS } from '@/types/config';

// Standard gas units for a native token transfer
const GAS_LIMIT_TRANSFER = BigInt(21_000);

// Public RPC fallbacks used when env var is not configured
const PUBLIC_RPCS: Record<string, string> = {
  ETHEREUM: 'https://rpc.ankr.com/eth',
  POLYGON: 'https://rpc.ankr.com/polygon',
  BASE: 'https://mainnet.base.org',
  SEPOLIA: 'https://rpc.sepolia.org',
};

export async function calculateEVMGasFee(chain: string): Promise<string> {
  try {
    const chainConfig = CHAINS[chain as keyof typeof CHAINS];
    const rpcUrl = chainConfig?.rpcUrl || PUBLIC_RPCS[chain];

    if (!rpcUrl) {
      return chain === 'ETHEREUM' ? '0.0005' : '0.0001';
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
    return chain === 'ETHEREUM' ? '0.0005' : '0.0001';
  }
}
