import { ethers } from 'ethers';
import { ChainType } from '@/types/token';
import { CHAINS } from '@/types/config';

export async function calculateEVMGasFee(
  chain: ChainType
): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(
      CHAINS[chain as keyof typeof CHAINS].rpcUrl
    );

    // Estimate gas limit for the transaction
    const gasPriceInfo = await provider.getFeeData();
    if (!gasPriceInfo.maxFeePerGas) {
      throw new Error('Could not get max fee per gas');
    }
    return ethers.formatEther(gasPriceInfo.maxFeePerGas);
  } catch (error) {
    console.error('Error calculating gas fee:', error);
    // Return a default estimate if calculation fails
    return chain === 'ETHEREUM' ? '0.0005' : '0.0001';
  }
}
