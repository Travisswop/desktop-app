"use client";

import { useEffect, useState, useMemo } from "react";
import { usePrivy, useSolanaWallets, useWallets } from "@privy-io/react-auth";
import { Connection } from "@solana/web3.js";
import { useToast } from "@/hooks/use-toast";

import { WalletItem } from "@/types/wallet";
import { TokenData } from "@/types/token";
import { NFT } from "@/types/nft";
import { Network, CHAIN_ID } from "@/types/wallet-types";
import { Transaction } from "@/types/transaction";

import { TransactionService } from "@/services/transaction-service";
import { useSendFlow } from "@/lib/hooks/useSendFlow";
import { useMultiChainTokenData } from "@/lib/hooks/useToken";
import { useNFT } from "@/lib/hooks/useNFT";

// Import UI components
import BalanceChart from "./balance-chart";
import TokenList from "./token/token-list";
import NFTSlider from "./nft/nft-list";
import TransactionList from "./transaction/transaction-list";
import TokenDetails from "./token/token-details-view";
import NFTDetailView from "./nft/nft-details-view";
import NetworkDock from "./network-dock";
import SendTokenModal from "./token/send-modal";
import SendToModal from "./token/send-to-modal";
import SendConfirmation from "./token/send-confirmation";
import TransactionSuccess from "./token/success-modal";
import { Toaster } from "../ui/toaster";
import ProfileHeader from "../dashboard/profile-header";
// import MessageBox from './message-interface';
<<<<<<< HEAD
import AssetSelector from './token/asset-selector';
import WalletQRModal from './wallet-qr-modal';
import WalletQRShare from './wallet-qr-share-modal';
import QRCodeShareModal from '../smartsite/socialShare/QRCodeShareModal';
import MessageList from './message-list';
import { useUser } from '@/lib/UserContext';
=======
import AssetSelector from "./token/asset-selector";
import WalletQRModal from "./wallet-qr-modal";
import WalletQRShare from "./wallet-qr-share-modal";
import QRCodeShareModal from "../smartsite/socialShare/QRCodeShareModal";
import MessageList from "./message-list";
import { postFeed } from "@/actions/postFeed";
import { useUser } from "@/lib/UserContext";
>>>>>>> 647582aaf34d1747628e4e64aeeb636caf096f6e

export default function WalletContent() {
  return <WalletContentInner />;
}

// {
//   "smartsiteId": "64b2f81a9a2b0c12a3456789",
//   "userId": "64b2f81a9a2b0c12a3456790",
//   "smartsiteUserName": "John Doe",
//   "smartsiteEnsName": "johndoe.eth",
//   "smartsiteProfilePic": "https://example.com/profile.jpg",
//   "postType": "transaction",
//   "content": {
//     "transaction_type": "nft", ["nft", "swap" ,"token"]
//     "sender_ens": "johndoe.eth",
//     "sender_wallet_address": "0x1234567890abcdef1234567890abcdef12345678",
//     "receiver_ens": "janedoe.eth",
//     "receiver_wallet_address": "0xabcdef1234567890abcdef1234567890abcdef12",
//     "amount": 1.5,
//     "currency": "ETH",
//     "transaction_hash": "0x9d5a6f4b7c8d9e10f11a12b13c14d15e16f17e18f19e20d21e22f23a24b25c26"
//   }
// }

const WalletContentInner = () => {
  // State
  const [walletData, setWalletData] = useState<WalletItem[] | null>(null);
  const [network, setNetwork] = useState<Network>("ETHEREUM");
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);
  const [newTransactions, setNewTransactions] = useState<Transaction[]>([]);
  const [walletQRModalOpen, setWalletQRModalOpen] = useState(false);
<<<<<<< HEAD
  const [walletQRShareModalOpen, setWalletQRShareModalOpen] =
    useState(false);
  const [walletShareAddress, setWalletShareAddress] = useState('');
  const [qrcodeShareUrl, setQrcodeShareUrl] = useState('');
  const [QRCodeShareModalOpen, setQRCodeShareModalOpen] =
    useState(false);
=======
  const [walletQRShareModalOpen, setWalletQRShareModalOpen] = useState(false);
  const [walletShareAddress, setWalletShareAddress] = useState("");
  const [qrcodeShareUrl, setQrcodeShareUrl] = useState("");
  const [QRCodeShareModalOpen, setQRCodeShareModalOpen] = useState(false);
  const [token, setToken] = useState("");
>>>>>>> 647582aaf34d1747628e4e64aeeb636caf096f6e

  const [payload, setPayload] = useState({
    smartsiteId: "",
    userId: "",
    smartsiteUserName: "",
    smartsiteEnsName: "",
    smartsiteProfilePic: "",
    postType: "transaction",
    content: {
      transaction_type: "nft", // or 'swap', 'token'
      sender_ens: "",
      sender_wallet_address: "",
      receiver_ens: "",
      receiver_wallet_address: "",
      amount: 0,
      currency: "ETH",
      transaction_hash: "",
    },
  });

  // Hooks
  const { authenticated, ready, user: PrivyUser } = usePrivy();
  const { wallets: ethWallets } = useWallets();

  const { createWallet, wallets: solanaWallets } = useSolanaWallets();
  const { toast } = useToast();
  const { user } = useUser();

  console.log("userss", user);

  const {
    sendFlow,
    setSendFlow,
    sendLoading,
    setSendLoading,
    handleAmountConfirm,
    handleRecipientSelect,
    handleSendClick,
    handleNFTNext,
    resetSendFlow,
  } = useSendFlow(network);

  useEffect(() => {
    if (user) {
      const primaryMicrositeData = user?.microsites?.find(
        (microsite: any) => microsite.primary
      );
<<<<<<< HEAD
=======
      console.log("primaryMicrositeData", primaryMicrositeData);

>>>>>>> 647582aaf34d1747628e4e64aeeb636caf096f6e
      setPayload((prevPayload) => ({
        ...prevPayload, // Preserve other fields in the payload
        smartsiteId: user?.primaryMicrosite,
        userId: user?._id,
        smartsiteUserName: primaryMicrositeData?.name,
        smartsiteEnsName:
          primaryMicrositeData?.ens || primaryMicrositeData?.ensData?.ens,
        smartsiteProfilePic: primaryMicrositeData?.profilePic,
      }));
    }
  }, [user]);

  // Memoized values
  const currentWalletAddress = useMemo(() => {
    if (!walletData) return undefined;
    return network === "SOLANA"
      ? walletData.find((w) => !w.isEVM)?.address
      : walletData.find((w) => w.isEVM)?.address;
  }, [network, walletData]);

  // Data fetching hooks
  const {
    tokens,
    loading: tokenLoading,
    error: tokenError,
  } = useMultiChainTokenData(currentWalletAddress, [network]);

  const {
    nfts,
    loading: nftLoading,
    error: nftError,
    refetch: refetchNFTs,
  } = useNFT(currentWalletAddress, [network]);

  const totalBalance = useMemo(() => {
    return tokens.reduce((total, token) => {
      const value =
        parseFloat(token.balance) * parseFloat(token.marketData.price);
      return total + value;
    }, 0);
  }, [tokens]);

  // Effects
  useEffect(() => {
    if (authenticated && ready && PrivyUser) {
      const linkWallet = PrivyUser?.linkedAccounts
        .map((item: any) => {
          if (item.chainType === "ethereum") {
            return {
              address: item.address,
              isActive:
                item.walletClientType === "privy" ||
                item.connectorType === "embedded",
              isEVM: true,
              walletClientType: item.walletClientType,
            };
          } else if (item.chainType === "solana") {
            return {
              address: item.address,
              isActive:
                item.walletClientType === "privy" ||
                item.connectorType === "embedded",
              isEVM: false,
              walletClientType: item.walletClientType,
            };
          }
          return null;
        })
        .filter(Boolean);

      setWalletData(linkWallet as WalletItem[]);
    }
  }, [PrivyUser, authenticated, ready]);

  useEffect(() => {
    if (authenticated && ready && PrivyUser) {
      const hasExistingSolanaWallet = PrivyUser.linkedAccounts.some(
        (account: any) =>
          account.type === "wallet" &&
          account.walletClientType === "privy" &&
          account.chainType === "solana"
      );

      if (!hasExistingSolanaWallet) {
        createWallet();
      }
    }
  }, [authenticated, ready, PrivyUser, createWallet]);

  // Transaction handling
  const handleSendConfirm = async () => {
    if (
      (!sendFlow.token && !sendFlow.nft) ||
      !sendFlow.recipient ||
      !sendFlow.amount
    )
      return;

    // setSendLoading(true);
    const amount =
      sendFlow.isUSD && sendFlow.token?.marketData.price
        ? Number(sendFlow.amount) * Number(sendFlow.token.marketData.price)
        : sendFlow.amount;

    console.log("sendFlow", sendFlow);

    setPayload((prevPayload) => ({
      ...prevPayload,
      content: {
        transaction_type: sendFlow.nft ? "nft" : "token",
        sender_ens: payload.smartsiteEnsName,
        sender_wallet_address: currentWalletAddress || "",
        receiver_ens: sendFlow.recipient?.ensName || "",
        receiver_wallet_address: sendFlow.recipient?.address || "",
        amount: Number(amount),
        currency: sendFlow.token?.symbol || "",
        transaction_hash: "0xhdlsfjsljfladjflsajfljdslafjldjfsjf",
      },
    }));

    console.log("payload", payload);

    // await postFeed(payload, token);

    // setSendFlow((prev) => ({
    //   ...prev,
    //   hash: '0xhdlsfjsljfladjflsajfljdslafjldjfsjf',
    //   step: 'success',
    // }));
    //return;

    // try {
    //   let hash = "";
    //   let newTransaction;

    //   const connection = new Connection(
    //     process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL!,
    //     "confirmed"
    //   );

    //   const solanaWallet = solanaWallets.find(
    //     (w: any) => w.walletClientType === "privy"
    //   );

    //   const linkedEthereumWallet = PrivyUser?.linkedAccounts.find(
    //     (item: any) => item.chainType === "ethereum" && item.address
    //   );

    //   const evmWallet = ethWallets.find(
    //     (w) =>
    //       w.address?.toLowerCase() ===
    //       (linkedEthereumWallet as any)?.address?.toLowerCase()
    //   );

    //   if (sendFlow.nft) {
    //     if (network === "SOLANA") {
    //       hash = await TransactionService.handleSolanaNFTTransfer(
    //         solanaWallet,
    //         sendFlow,
    //         connection
    //       );
    //     } else {
    //       await evmWallet?.switchChain(CHAIN_ID[network]);
    //       hash = await TransactionService.handleNFTTransfer(
    //         evmWallet,
    //         sendFlow
    //       );
    //     }
    //     refetchNFTs();
    //   } else {
    //     // Handle token transfer
    //     if (sendFlow.token?.chain === "SOLANA") {
    //       hash = await TransactionService.handleSolanaSend(
    //         solanaWallet,
    //         sendFlow,
    //         connection
    //       );
    //     } else {
    //       const result = await TransactionService.handleEVMSend(
    //         evmWallet,
    //         sendFlow,
    //         network
    //       );
    //       hash = result.hash;
    //       newTransaction = result.transaction;
    //     }
    //   }

    //   setSendFlow((prev) => ({
    //     ...prev,
    //     hash,
    //     step: "success",
    //   }));

    //   if (newTransaction) {
    //     setNewTransactions([newTransaction]);
    //   }
    // } catch (error) {
    //   console.error("Error sending token/NFT:", error);
    //   toast({
    //     variant: "destructive",
    //     title: "Error",
    //     description:
    //       error instanceof Error ? error.message : "Failed to send transaction",
    //   });
    //   resetSendFlow();
    // } finally {
    //   setSendLoading(false);
    // }
  };

  // UI Event handlers
  const handleTokenSelect = (token: TokenData) => setSelectedToken(token);
  const handleSelectNFT = (nft: NFT) => {
    setSelectedNFT(nft);
    setIsNFTModalOpen(true);
  };
  const handleCloseNFTModal = () => {
    setIsNFTModalOpen(false);
    setSelectedNFT(null);
  };
  const handleBack = () => setSelectedToken(null);

  const nativeTokenPrice = tokens.find((token) => token.isNative)?.marketData
    .price;

  return (
    <div className="">
      <ProfileHeader />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
        <BalanceChart
          walletData={walletData || []}
          totalBalance={totalBalance}
          onSelectAsset={() =>
            setSendFlow((prev) => ({ ...prev, step: "assets" }))
          }
          onQRClick={() => setWalletQRModalOpen(true)}
        />
        {/* <MessageBox /> */}
        <MessageList />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
        {selectedToken ? (
          <TokenDetails
            token={selectedToken}
            onBack={handleBack}
            onSend={handleSendClick}
          />
        ) : (
          <TokenList
            tokens={tokens}
            loading={tokenLoading}
            error={tokenError!}
            onSelectToken={handleTokenSelect}
          />
        )}

        <div>
          <NFTSlider
            onSelectNft={handleSelectNFT}
            address={currentWalletAddress}
            network={network}
            nfts={nfts}
            loading={nftLoading}
            error={nftError}
          />
          {currentWalletAddress && (
            <TransactionList
              address={currentWalletAddress}
              network={network}
              newTransactions={newTransactions}
            />
          )}

          {selectedNFT && (
            <NFTDetailView
              isOpen={isNFTModalOpen}
              onClose={handleCloseNFTModal}
              nft={selectedNFT}
              onNext={() => handleNFTNext(selectedNFT)}
            />
          )}
        </div>
        <AssetSelector
          open={sendFlow.step === "assets"}
          onOpenChange={(open) => !open && resetSendFlow()}
          assets={tokens}
          nfts={nfts}
          onNext={handleSendClick}
          onNFTNext={handleNFTNext}
        />

        <SendTokenModal
          open={sendFlow.step === "amount"}
          onOpenChange={(open) => !open && resetSendFlow()}
          token={sendFlow.token!}
          onNext={handleAmountConfirm}
        />
        <SendToModal
          open={sendFlow.step === "recipient"}
          onOpenChange={(open) => !open && resetSendFlow()}
          onSelectReceiver={handleRecipientSelect}
          network={network}
          currentWalletAddress={currentWalletAddress || ""}
        />
        <SendConfirmation
          open={sendFlow.step === "confirm"}
          onOpenChange={(open) => !open && resetSendFlow()}
          amount={sendFlow.amount}
          isUSD={sendFlow.isUSD}
          token={sendFlow.token!}
          recipient={sendFlow.recipient?.address || ""}
          onConfirm={handleSendConfirm}
          loading={sendLoading}
          nft={sendFlow.nft}
          recipientName={sendFlow.recipient?.ensName || ""}
          networkFee={sendFlow.networkFee || ""}
          network={sendFlow.network}
          nativeTokenPrice={nativeTokenPrice}
        />
        <TransactionSuccess
          open={sendFlow.step === "success"}
          onOpenChange={(open) => !open && resetSendFlow()}
          amount={sendFlow.amount}
          nft={sendFlow.nft}
          token={sendFlow.token}
          network={sendFlow.network}
          hash={sendFlow.hash}
        />
        <WalletQRModal
          open={walletQRModalOpen}
          onOpenChange={setWalletQRModalOpen}
          walletData={walletData || []}
          setWalletShareAddress={setWalletShareAddress}
          setWalletQRShareModalOpen={setWalletQRShareModalOpen}
        />
        <WalletQRShare
          open={walletQRShareModalOpen}
          onOpenChange={setWalletQRShareModalOpen}
          walletAddress={walletShareAddress || ""}
          setQRCodeShareUrl={setQrcodeShareUrl}
          setQRCodeShareModalOpen={setQRCodeShareModalOpen}
        />
        <QRCodeShareModal
          isOpen={QRCodeShareModalOpen}
          onOpenChange={setQRCodeShareModalOpen}
          qrCodeUrl={qrcodeShareUrl}
        />
      </div>
      <NetworkDock network={network} setNetwork={setNetwork} />
      <Toaster />
    </div>
  );
};
