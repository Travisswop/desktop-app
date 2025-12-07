import { useState } from "react";
import { SendFlowState, Network } from "@/types/wallet-types";
import { TokenData } from "@/types/token";
import { NFT } from "@/types/nft";
import { ReceiverData } from "@/types/wallet";

const initialState: SendFlowState = {
  step: null,
  token: null,
  amount: "",
  isUSD: false,
  recipient: null,
  nft: null,
  networkFee: "0",
  network: "ETHEREUM",
  hash: "",
};

export function useSendFlow() {
  const [sendFlow, setSendFlow] = useState<SendFlowState>(initialState);
  const [sendLoading, setSendLoading] = useState(false);

  const handleAmountConfirm = (amount: string, isUSD: boolean) => {
    setSendFlow((prev) => ({
      ...prev,
      step: "recipient",
      amount,
      isUSD,
    }));
  };

  const handleRecipientSelect = (recipient: ReceiverData) => {
    setSendFlow((prev) => ({
      ...prev,
      step: "confirm",
      recipient,
    }));
  };

  const handleSendClick = (token: TokenData) => {
    console.log("handleSendClick", token);

    setSendFlow({
      ...initialState,
      step: "amount",
      token,
      network: token.chain,
    });
  };

  const handleNFTNext = (nft: NFT) => {
    const networkFeeMap: Record<Network, string> = {
      ETHEREUM: "0.0001",
      SOLANA: "0.000000001",
      POLYGON: "0.0001",
      BASE: "0.0001",
    };

    const network = (nft.network || "ETHEREUM") as Network;

    setSendFlow((prev) => ({
      ...prev,
      step: "recipient",
      amount: "1",
      nft,
      networkFee: networkFeeMap[network],
      network: network,
    }));
  };

  const resetSendFlow = () => {
    setSendFlow(initialState);
  };

  return {
    sendFlow,
    setSendFlow,
    sendLoading,
    setSendLoading,
    handleAmountConfirm,
    handleRecipientSelect,
    handleSendClick,
    handleNFTNext,
    resetSendFlow,
  };
}
