import {
  OperationType,
  SafeTransaction,
} from "@polymarket/builder-relayer-client";
import { encodeFunctionData } from "viem";
import {
  USDC_E_CONTRACT_ADDRESS,
  CTF_CONTRACT_ADDRESS,
  NEG_RISK_ADAPTER_ADDRESS,
} from "@/constants/polymarket";

const ctfAbi = [
  {
    inputs: [
      { name: "collateralToken", type: "address" },
      { name: "parentCollectionId", type: "bytes32" },
      { name: "conditionId", type: "bytes32" },
      { name: "indexSets", type: "uint256[]" },
    ],
    name: "redeemPositions",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const negRiskAdapterAbi = [
  {
    inputs: [
      { name: "conditionId", type: "bytes32" },
      { name: "amounts", type: "uint256[]" },
    ],
    name: "redeemPositions",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export interface RedeemParams {
  conditionId: string;
  outcomeIndex: number;
  negativeRisk?: boolean;
  size?: number;
}

export const createRedeemTx = (params: RedeemParams): SafeTransaction => {
  const { conditionId, outcomeIndex, negativeRisk = false, size = 0 } = params;

  if (negativeRisk) {
    const tokenAmount = BigInt(Math.floor(size * 1e6));

    const amounts: bigint[] = [BigInt(0), BigInt(0)];
    amounts[outcomeIndex] = tokenAmount;

    console.log("Creating NegRisk redeem tx:", {
      conditionId,
      outcomeIndex,
      size,
      tokenAmount: tokenAmount.toString(),
      amounts: amounts.map((a) => a.toString()),
    });

    const data = encodeFunctionData({
      abi: negRiskAdapterAbi,
      functionName: "redeemPositions",
      args: [conditionId as `0x${string}`, amounts],
    });

    return {
      to: NEG_RISK_ADAPTER_ADDRESS,
      operation: OperationType.Call,
      data,
      value: "0",
    };
  }

  const parentCollectionId = "0x" + "0".repeat(64);

  // Pass both indexSets [1, 2] — the CTF contract applies the payout vector
  // automatically so the losing outcome yields $0. This avoids needing to
  // know which side won and ensures all tokens in the condition are redeemed.
  const indexSets = [1n, 2n];

  console.log("Creating regular CTF redeem tx:", {
    conditionId,
    indexSets: indexSets.map((s) => s.toString()),
  });

  const data = encodeFunctionData({
    abi: ctfAbi,
    functionName: "redeemPositions",
    args: [
      USDC_E_CONTRACT_ADDRESS as `0x${string}`,
      parentCollectionId as `0x${string}`,
      conditionId as `0x${string}`,
      indexSets,
    ],
  });

  return {
    to: CTF_CONTRACT_ADDRESS,
    operation: OperationType.Call,
    data,
    value: "0",
  };
};
