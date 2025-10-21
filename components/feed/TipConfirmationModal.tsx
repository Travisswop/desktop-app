"use client";

import { Button } from "@/components/ui/button";
import { HelpCircle, User, ArrowDown, AlertCircle, Heart } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { TokenData } from "@/types/token";
import { useEffect, useState } from "react";
import CustomModal from "@/components/modal/CustomModal";

interface TipConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  token: TokenData;
  recipient: string;
  recipientName: string;
  recipientImage: string;
  onConfirm: () => void;
  loading: boolean;
}

export default function TipConfirmation({
  open,
  onOpenChange,
  amount,
  token,
  recipient,
  recipientName,
  recipientImage,
  onConfirm,
  loading,
}: TipConfirmationProps) {
  const [gasFeeUSD, setGasFeeUSD] = useState(0);
  const [networkFee, setNetworkFee] = useState("0.000005");

  console.log("recipient", recipient);

  useEffect(() => {
    // Calculate network fee based on chain
    const calculateNetworkFee = async () => {
      if (token.chain === "SOLANA") {
        const fee = "0.000005";
        setNetworkFee(fee);
        const feeUSD = Number(fee) * (token.nativeTokenPrice || 0);
        setGasFeeUSD(Number(feeUSD.toFixed(5)));
      } else {
        // For EVM chains, you can use your existing calculateEVMGasFee function
        // const gasFee = await calculateEVMGasFee(network);
        // For now, using approximate values
        const estimatedGas = "0.0001";
        setNetworkFee(estimatedGas);
        const feeUSD = Number(estimatedGas) * (token.nativeTokenPrice || 0);
        setGasFeeUSD(Number(feeUSD.toFixed(5)));
      }
    };

    calculateNetworkFee();
  }, [token]);

  const getTipAmountInUSD = () => {
    if (!token.marketData?.price) return "0.00";
    return (parseFloat(amount) * parseFloat(token.marketData.price)).toFixed(2);
  };

  return (
    <CustomModal isOpen={open} onCloseModal={onOpenChange} title="Confirm Tip">
      <div className="p-4">
        <div>
          <p className="text-xl font-semibold text-center">Confirm Tip</p>
          <p className="text-center text-sm text-gray-500 mt-1">
            Show your appreciation with a tip
          </p>
        </div>

        <div className="space-y-6 mt-6">
          {/* Transaction Overview */}
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-6 rounded-2xl space-y-4">
            {/* Amount Display */}
            <div className="flex flex-col items-center">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
                  <div className="text-3xl font-bold text-gray-700">
                    {parseFloat(amount).toFixed(4)} {token.symbol}
                  </div>
                </div>
                {token.marketData?.price && (
                  <p className="text-gray-600 font-medium">
                    ≈ ${getTipAmountInUSD()} USD
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="text-gray-400 w-5 h-5" />
            </div>

            {/* Recipient */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <Image
                  src={recipientImage}
                  alt={recipientName}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
                <div>
                  <div className="font-medium">{recipientName}</div>
                  <div className="text-xs text-gray-500 break-all">
                    {recipient}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            <div className="text-sm font-semibold text-gray-700">
              Transaction Details
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100">
              <div className="space-y-3">
                {/* Token Info */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Token</span>
                  <div className="flex items-center gap-2">
                    <Image
                      src={
                        token.logoURI ||
                        token.marketData?.iconUrl ||
                        "/icons/default.png"
                      }
                      alt={token.name}
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                    <span className="font-medium">{token.symbol}</span>
                  </div>
                </div>

                {/* Network */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Network</span>
                  <span className="font-medium">{token.chain}</span>
                </div>

                {/* Network Fee */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Network Fee</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            {token.chain === "SOLANA" &&
                            (token.symbol === "SWOP" || token.symbol === "USDC")
                              ? "Network fees are subsidized by SWOP for SWOP and USDC transactions on Solana."
                              : "Network fees are required to process your transaction on the blockchain."}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {token.chain === "SOLANA" &&
                      (token.symbol === "SWOP" || token.symbol === "USDC")
                        ? "0.000000"
                        : networkFee}{" "}
                      {token.chain === "SOLANA"
                        ? "SOL"
                        : token.chain === "ETHEREUM"
                        ? "ETH"
                        : token.chain === "POLYGON"
                        ? "MATIC"
                        : "BASE"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {token.chain === "SOLANA" &&
                      (token.symbol === "SWOP" || token.symbol === "USDC")
                        ? "$ 0.00"
                        : `$ ${gasFeeUSD}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning/Info Box */}
            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                Tips are non-refundable. Please ensure the recipient is correct
                before confirming.
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={onConfirm}
            className="w-full bg-black rounded-xl py-6 text-lg font-medium"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Sending Tip...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Heart className="w-5 h-5 fill-current" />
                Confirm Tip
              </span>
            )}
          </Button>
        </div>
      </div>
    </CustomModal>
  );
}
