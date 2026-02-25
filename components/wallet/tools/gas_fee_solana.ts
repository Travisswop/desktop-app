import { Connection } from '@solana/web3.js';
import { CHAINS } from '@/types/config';

const BASE_FEE_LAMPORTS = 5000; // per signature
const LAMPORTS_PER_SOL = 1_000_000_000;
const COMPUTE_UNITS_SIMPLE_TRANSFER = 300;
const FALLBACK_RPC = 'https://api.mainnet-beta.solana.com';

export async function calculateSolanaGasFee(): Promise<string> {
  try {
    const rpcUrl = CHAINS.SOLANA.rpcUrl || FALLBACK_RPC;
    const connection = new Connection(rpcUrl, 'confirmed');

    // Returns micro-lamports per compute unit for recent slots
    const recentFees = await connection.getRecentPrioritizationFees();

    const avgPriorityFeePerCU =
      recentFees.length > 0
        ? Math.round(
            recentFees.reduce((sum, f) => sum + f.prioritizationFee, 0) /
              recentFees.length
          )
        : 0;

    // Convert micro-lamports/CU → lamports
    const priorityFeeLamports = Math.ceil(
      (avgPriorityFeePerCU * COMPUTE_UNITS_SIMPLE_TRANSFER) / 1_000_000
    );

    const totalLamports = BASE_FEE_LAMPORTS + priorityFeeLamports;
    return (totalLamports / LAMPORTS_PER_SOL).toFixed(9);
  } catch (error) {
    console.error('Error calculating Solana gas fee:', error);
    return '0.000005'; // 5000 lamports fallback
  }
}
