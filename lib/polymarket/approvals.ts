import { createPublicClient, http, erc20Abi } from 'viem';
import { polygon } from 'viem/chains';
import {
  USDC_E_CONTRACT_ADDRESS,
  CTF_CONTRACT_ADDRESS,
  CTF_EXCHANGE_ADDRESS,
  NEG_RISK_CTF_EXCHANGE_ADDRESS,
  NEG_RISK_ADAPTER_ADDRESS,
  POLYGON_RPC_URL,
} from '@/constants/polymarket';

const erc1155Abi = [
  {
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC_URL),
});

const USDC_E_SPENDERS = [
  { address: CTF_CONTRACT_ADDRESS, name: 'CTF Contract' },
  { address: NEG_RISK_ADAPTER_ADDRESS, name: 'Neg Risk Adapter' },
  { address: CTF_EXCHANGE_ADDRESS, name: 'CTF Exchange' },
  { address: NEG_RISK_CTF_EXCHANGE_ADDRESS, name: 'Neg Risk CTF Exchange' },
] as const;

const OUTCOME_TOKEN_SPENDERS = [
  { address: CTF_EXCHANGE_ADDRESS, name: 'CTF Exchange' },
  { address: NEG_RISK_CTF_EXCHANGE_ADDRESS, name: 'Neg Risk Exchange' },
  { address: NEG_RISK_ADAPTER_ADDRESS, name: 'Neg Risk Adapter' },
] as const;

const checkUSDCApprovalForSpender = async (
  safeAddress: string,
  spender: string,
): Promise<boolean> => {
  try {
    const allowance = await publicClient.readContract({
      address: USDC_E_CONTRACT_ADDRESS as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [safeAddress as `0x${string}`, spender as `0x${string}`],
    });
    return allowance >= BigInt('1000000000000');
  } catch (error) {
    console.warn(`Failed to check USDC approval for ${spender}:`, error);
    return false;
  }
};

const checkERC1155ApprovalForSpender = async (
  safeAddress: string,
  spender: string,
): Promise<boolean> => {
  try {
    const isApproved = await publicClient.readContract({
      address: CTF_CONTRACT_ADDRESS as `0x${string}`,
      abi: erc1155Abi,
      functionName: 'isApprovedForAll',
      args: [safeAddress as `0x${string}`, spender as `0x${string}`],
    });
    return isApproved;
  } catch (error) {
    console.warn(`Failed to check ERC1155 approval for ${spender}:`, error);
    return false;
  }
};

export const checkAllApprovals = async (
  safeAddress: string,
): Promise<{
  allApproved: boolean;
  usdcApprovals: Record<string, boolean>;
  outcomeTokenApprovals: Record<string, boolean>;
}> => {
  const usdcApprovals: Record<string, boolean> = {};
  const outcomeTokenApprovals: Record<string, boolean> = {};

  await Promise.all(
    USDC_E_SPENDERS.map(async ({ address, name }) => {
      usdcApprovals[name] = await checkUSDCApprovalForSpender(
        safeAddress,
        address,
      );
    }),
  );

  await Promise.all(
    OUTCOME_TOKEN_SPENDERS.map(async ({ address, name }) => {
      outcomeTokenApprovals[name] = await checkERC1155ApprovalForSpender(
        safeAddress,
        address,
      );
    }),
  );

  const allApproved =
    Object.values(usdcApprovals).every((approved) => approved) &&
    Object.values(outcomeTokenApprovals).every((approved) => approved);

  return { allApproved, usdcApprovals, outcomeTokenApprovals };
};
