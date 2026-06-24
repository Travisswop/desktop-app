"use client";

import { Button } from "@/components/ui/button";
import { HelpCircle, Wallet, ArrowDown, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NFT } from "@/types/nft";
import Image from "next/image";
import { Network } from "@/types/wallet-types";
import { TokenData } from "@/types/token";
import { useEffect, useState } from "react";
import { calculateEVMGasFee } from "../tools/gas_fee_evm";
import { useTokenSendStore } from "@/zustandStore/TokenSendInfo";
import CustomModal from "@/components/modal/CustomModal";
import { BentoCard } from "@/components/ui/bento";

interface SendConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  token: TokenData;
  recipient: string;
  recipientName: string;
  onConfirm: () => void;
  loading: boolean;
  nft: NFT | null;
  networkFee: string;
  network: Network;
  isUSD: boolean;
  nativeTokenPrice: number;
}

export default function SendBankConfirmation({
  open,
  onOpenChange,
  amount,
  token,
  recipient,
  recipientName,
  onConfirm,
  loading,
  nft,
  networkFee,
  network,
  isUSD,
  nativeTokenPrice,
}: SendConfirmationProps) {
  const [gasFeeUSD, setGasFeeUSD] = useState(0);
  const { tokenContent } = useTokenSendStore();
  if (token.chain === "SOLANA") {
    networkFee = "0.000005";
  }

  if (tokenContent.walletAddress) {
    recipient = tokenContent.walletAddress;
  }

  useEffect(() => {
    const fetchGasFee = async () => {
      if (token.chain === "SOLANA") {
        const networkFeeUSD = (Number(networkFee) * nativeTokenPrice).toFixed(
          5
        );
        setGasFeeUSD(Number(networkFeeUSD));
      } else {
        const gasFee = await calculateEVMGasFee(network);
        const gasFeeUSD = Number(gasFee) * nativeTokenPrice;
        setGasFeeUSD(Number(gasFeeUSD.toFixed(5)));
      }
    };
    fetchGasFee();
  }, [network, nativeTokenPrice, networkFee, token.chain]);

  return (
    <CustomModal isOpen={open} onCloseModal={onOpenChange} title="Create Poll">
      <div className="p-4">
        <div>
          <h3 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-gray-900 text-center">
            Confirm Transaction
          </h3>
          <p className="text-center text-[13px] text-gray-500 mt-1">
            Please review the transaction details carefully
          </p>
        </div>

        <div className="space-y-6 mt-6">
          {/* Transaction Overview */}
          <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
            {/* From/To Section */}
            <div className="space-y-4">
              {/* Amount Display */}
              <div className="flex flex-col items-center">
                {nft ? (
                  <div className="text-center space-y-3">
                    <div className="text-xl font-semibold">{nft.name}</div>
                    <Image
                      src={nft.image}
                      alt={nft.name}
                      width={150}
                      height={150}
                      className="rounded-xl shadow-md"
                    />
                    <div className="text-[13px] text-gray-600 bg-gray-100 px-3 py-1 rounded-full inline-block">
                      Token ID: {nft.tokenId}
                    </div>
                  </div>
                ) : (
                  token && (
                    <div className="text-center space-y-2">
                      <div className="text-[24px] font-semibold leading-tight text-gray-950 font-mono tabular-nums">
                        {isUSD
                          ? token.marketData?.price
                            ? (
                                parseFloat(amount) /
                                parseFloat(token.marketData.price)
                              ).toFixed(2)
                            : "0.00"
                          : parseFloat(amount).toFixed(2)}{" "}
                        {token.symbol}
                      </div>
                      {token.marketData?.price && (
                        <p className="text-gray-500 font-mono tabular-nums">
                          ≈ $
                          {isUSD
                            ? parseFloat(amount).toFixed(2)
                            : (
                                parseFloat(amount) *
                                parseFloat(token.marketData.price)
                              ).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>

              <div className="flex justify-center">
                <ArrowDown className="text-gray-400 w-5 h-5" />
              </div>

              {/* Recipient */}
              <BentoCard padding="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {recipientName || "Recipient"}
                    </div>
                    <div className="text-[13px] text-gray-500 break-all font-mono tabular-nums">
                      {recipient}
                    </div>
                  </div>
                </div>
              </BentoCard>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            <div className="text-[13px] font-semibold text-gray-700">
              Transaction Details
            </div>

            <BentoCard padding="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-gray-600">Network Fee</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Network fees are required to process your transaction
                          on the blockchain. These fees vary based on network
                          congestion.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-right">
                  <div className="font-medium font-mono tabular-nums">
                    {networkFee}{" "}
                    {token.chain === "SOLANA"
                      ? "SOL"
                      : token.chain === "ETHEREUM"
                      ? "ETH"
                      : token.chain === "POLYGON"
                      ? "MATIC"
                      : "BASE"}
                  </div>
                  <div className="text-[13px] text-gray-500 font-mono tabular-nums">$ {gasFeeUSD}</div>
                </div>
              </div>
            </BentoCard>

            {/* Warning/Info Box */}
            <div className="bg-yellow-50 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-[13px] text-yellow-700">
                Transactions cannot be reversed after confirmation. Please
                ensure the recipient address is correct.
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={onConfirm}
            className="w-full bg-gray-950 text-white hover:bg-gray-800 rounded-full py-6 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            disabled={loading}
          >
            {loading ? "Processing Transaction..." : "Confirm Transaction"}
          </Button>
        </div>
      </div>
    </CustomModal>
  );
}
