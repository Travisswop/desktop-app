import React from 'react';
import { Network, SendFlowState } from '@/types/wallet-types';
import { TokenData } from '@/types/token';
import { NFT } from '@/types/nft';
import { WalletItem } from '@/types/wallet';

// Import all modals
import MethodSelector from './token/methodSelector';
import AssetSelector from './token/asset-selector';
import SendTokenModal from './token/send-modal';
import SendToModal from './token/send-to-modal';
import SendConfirmation from './token/send-confirmation';
import TransactionSuccess from './token/success-modal';
import WalletQRModal from './wallet-qr-modal';
import WalletQRShare from './wallet-qr-share-modal';
import QRCodeShareModal from '../smartsite/socialShare/QRCodeShareModal';
import BankAssetSelector from './token/BankAssetSelector';
import SendBankToken from './token/SendBankToken';
import SendBankConfirmation from './token/SendBankConfirmation';

export interface SendFlowType {
  step: string;
  token?: TokenData | null;
  nft?: NFT | null;
  amount?: number | string;
  recipient?: any;
  isUSD?: boolean;
  hash?: string;
  network?: Network;
  networkFee?: string;
}

interface WalletModalsProps {
  sendFlow: SendFlowState;
  resetSendFlow: () => void;
  tokens: TokenData[];
  nfts: NFT[];
  handleSendClick: (token: TokenData) => void;
  handleNFTNext: (nft: NFT) => void;
  handleAmountConfirm: (amount: string, isUSD: boolean) => void;
  handleRecipientSelect: (recipient: any) => void;
  handleSendConfirm: () => Promise<void>;
  network: Network;
  currentWalletAddress: string;
  sendLoading: boolean;
  nativeTokenPrice: number;
  walletQRModalOpen: boolean;
  setWalletQRModalOpen: (open: boolean) => void;
  walletData: WalletItem[];
  setWalletShareAddress: (address: string) => void;
  setWalletQRShareModalOpen: (open: boolean) => void;
  walletQRShareModalOpen: boolean;
  walletShareAddress: string;
  setQrcodeShareUrl: (url: string) => void;
  setQRCodeShareModalOpen: (open: boolean) => void;
  QRCodeShareModalOpen: boolean;
  qrcodeShareUrl: string;
  setSendFlow: React.Dispatch<React.SetStateAction<SendFlowState>>;
}

const WalletModals: React.FC<WalletModalsProps> = ({
  sendFlow,
  resetSendFlow,
  tokens,
  nfts,
  handleSendClick,
  handleNFTNext,
  handleAmountConfirm,
  handleRecipientSelect,
  handleSendConfirm,
  network,
  currentWalletAddress,
  sendLoading,
  nativeTokenPrice,
  walletQRModalOpen,
  setWalletQRModalOpen,
  walletData,
  setWalletShareAddress,
  setWalletQRShareModalOpen,
  walletQRShareModalOpen,
  walletShareAddress,
  setQrcodeShareUrl,
  setQRCodeShareModalOpen,
  QRCodeShareModalOpen,
  qrcodeShareUrl,
  setSendFlow,
}) => {
  return (
    <>
      {/* Method Selection - First step */}
      <MethodSelector
        open={sendFlow.step === 'select-method'}
        onOpenChange={(open) => !open && resetSendFlow()}
        setSendFlow={setSendFlow}
      />

      {/* Asset Selection for wallet */}
      <AssetSelector
        open={sendFlow.step === 'assets'}
        onOpenChange={(open) => !open && resetSendFlow()}
        assets={tokens}
        nfts={nfts}
        onNext={handleSendClick}
        onNFTNext={handleNFTNext}
      />

      {/* Amount input for wallet */}
      <SendTokenModal
        open={sendFlow.step === 'amount'}
        onOpenChange={(open) => !open && resetSendFlow()}
        token={sendFlow.token!}
        onNext={handleAmountConfirm}
      />

      {/* Bank flows */}
      {sendFlow.step === 'bank-assets' && (
        <BankAssetSelector
          open={sendFlow.step === 'bank-assets'}
          setSendFlow={setSendFlow}
          onOpenChange={(open) => !open && resetSendFlow()}
          assets={tokens}
          nfts={nfts}
          onNext={handleSendClick}
          onNFTNext={handleNFTNext}
        />
      )}

      {sendFlow.step === 'bank-amount' && (
        <SendBankToken
          open={sendFlow.step === 'bank-amount'}
          onOpenChange={(open) => !open && resetSendFlow()}
          token={sendFlow.token!}
          onNext={handleAmountConfirm}
          setSendFlow={setSendFlow}
          networkFee={sendFlow.networkFee || ''}
        />
      )}

      {/* Bank recipient selection is commented out in original code */}
      {/* {sendFlow.step === "bank-recipient" && (
        <BankSendToModal
          open={sendFlow.step === "bank-recipient"}
          onOpenChange={(open) => !open && resetSendFlow()}
          onSelectReceiver={handleRecipientSelect}
          network={network}
          currentWalletAddress={currentWalletAddress}
          selectedToken={sendFlow.token!}
          amount={sendFlow.amount!}
          isUSD={sendFlow.isUSD}
        />
      )} */}

      {/* Bank confirmation */}
      {sendFlow.token && sendFlow.step === 'bank-confirm' && (
        <SendBankConfirmation
          open={sendFlow.step === 'bank-confirm'}
          onOpenChange={(open) => !open && resetSendFlow()}
          amount={sendFlow.amount}
          isUSD={sendFlow.isUSD}
          token={sendFlow.token!}
          recipient={sendFlow.recipient?.address || ''}
          onConfirm={handleSendConfirm}
          loading={sendLoading}
          nft={sendFlow.nft}
          recipientName={sendFlow.recipient?.ensName || ''}
          networkFee={sendFlow.networkFee || ''}
          network={sendFlow.network}
          nativeTokenPrice={nativeTokenPrice}
        />
      )}

      {/* Standard wallet flow - recipient selection */}
      <SendToModal
        open={sendFlow.step === 'recipient'}
        onOpenChange={(open) => !open && resetSendFlow()}
        onSelectReceiver={handleRecipientSelect}
        network={network}
        currentWalletAddress={currentWalletAddress}
        selectedToken={sendFlow.token!}
        amount={sendFlow.amount!}
        isUSD={sendFlow.isUSD}
      />

      {/* Standard confirmation screen */}
      {sendFlow.token && (
        <SendConfirmation
          open={sendFlow.step === 'confirm'}
          onOpenChange={(open) => !open && resetSendFlow()}
          amount={sendFlow.amount}
          isUSD={sendFlow.isUSD}
          token={sendFlow.token!}
          recipient={sendFlow.recipient?.address || ''}
          onConfirm={handleSendConfirm}
          loading={sendLoading}
          nft={sendFlow.nft}
          recipientName={sendFlow.recipient?.ensName || ''}
          networkFee={sendFlow.networkFee || ''}
          network={sendFlow.network}
          nativeTokenPrice={nativeTokenPrice}
        />
      )}

      {/* Transaction success modal */}
      <TransactionSuccess
        open={sendFlow.step === 'success'}
        onOpenChange={(open) => !open && resetSendFlow()}
        amount={sendFlow.amount}
        nft={sendFlow.nft}
        token={sendFlow.token}
        isUSD={sendFlow.isUSD}
        hash={sendFlow.hash}
      />

      {/* QR code related modals */}
      <WalletQRModal
        open={walletQRModalOpen}
        onOpenChange={setWalletQRModalOpen}
        walletData={walletData}
        setWalletShareAddress={setWalletShareAddress}
        setWalletQRShareModalOpen={setWalletQRShareModalOpen}
      />

      <WalletQRShare
        open={walletQRShareModalOpen}
        onOpenChange={setWalletQRShareModalOpen}
        walletAddress={walletShareAddress}
        setQRCodeShareUrl={setQrcodeShareUrl}
        setQRCodeShareModalOpen={setQRCodeShareModalOpen}
      />

      <QRCodeShareModal
        isOpen={QRCodeShareModalOpen}
        onOpenChange={setQRCodeShareModalOpen}
        qrCodeUrl={qrcodeShareUrl}
      />
    </>
  );
};

export default WalletModals;
