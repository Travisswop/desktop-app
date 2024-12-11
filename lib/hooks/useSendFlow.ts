import { useState } from 'react';
import { SendFlowState, Network } from '@/types/wallet-types';
import { TokenData } from '@/types/token';
import { NFT } from '@/types/nft';
import { ReceiverData } from '@/types/wallet';

const initialState: SendFlowState = {
  step: null,
  token: null,
  amount: '',
  recipient: null,
  nft: null,
  networkFee: '0',
  network: 'ETHEREUM',
  hash: '',
};

export function useSendFlow(network: Network) {
  const [sendFlow, setSendFlow] =
    useState<SendFlowState>(initialState);
  const [sendLoading, setSendLoading] = useState(false);

  const handleAmountConfirm = (amount: string) => {
    setSendFlow((prev) => ({
      ...prev,
      step: 'recipient',
      amount,
    }));
  };

  const handleRecipientSelect = (recipient: ReceiverData) => {
    setSendFlow((prev) => ({
      ...prev,
      step: 'confirm',
      recipient,
    }));
  };

  const handleSendClick = (token: TokenData) => {
    setSendFlow({
      ...initialState,
      step: 'amount',
      token,
      network,
    });
  };

  const handleNFTNext = (nft: NFT) => {
    const networkFeeMap = {
      ETHEREUM: '0.0001',
      SOLANA: '0.000000001',
      POLYGON: '0.0001',
      BASE: '0.0001',
    };

    setSendFlow((prev) => ({
      ...prev,
      step: 'recipient',
      amount: '1',
      nft,
      networkFee: networkFeeMap[network],
      network,
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
