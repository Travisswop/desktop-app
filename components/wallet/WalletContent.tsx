"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSolanaWalletContext } from "@/lib/context/SolanaWalletContext";
import { Connection } from "@solana/web3.js";
import { useToast } from "@/hooks/use-toast";

import { WalletItem } from "@/types/wallet";
import { ChainType, TokenData } from "@/types/token";
import { NFT } from "@/types/nft";
import { CHAIN_ID, SendFlowState } from "@/types/wallet-types";

import {
  SWOP_ADDRESS,
  TransactionService,
  USDC_ADDRESS,
} from "@/services/transaction-service";
import { useSendFlow } from "@/lib/hooks/useSendFlow";
import { useMultiChainTokenData } from "@/lib/hooks/useToken";
import { useNFT } from "@/lib/hooks/useNFT";
import { useUser } from "@/lib/UserContext";
import { addSwopPoint } from "@/actions/addPoint";
import { postFeed } from "@/actions/postFeed";

// UI Components
import TokenList from "./token/token-list";
import NFTSlider from "./nft/nft-list";
import TokenDetails from "./token/token-details-view";
import NFTDetailView from "./nft/nft-details-view";
import WalletModals from "./WalletModals";
import MessageList from "./message-list";
import { Toaster } from "../ui/toaster";
import ProfileHeader from "../dashboard/profile-header";
import RedeemTokenList from "./redeem/token-list";
import WalletBalanceChartForWalletPage from "./WalletBalanceChart";

// Utilities
import Cookies from "js-cookie";
import { createTransactionPayload } from "@/lib/utils/transactionUtils";

// Default chains supported by the wallet
const SUPPORTED_CHAINS: ChainType[] = ["ETHEREUM", "POLYGON", "BASE", "SOLANA", "SEPOLIA"];

export default function WalletContent() {
  return <WalletContentInner />;
}

const WalletContentInner = () => {
  // Core state
  const [walletData, setWalletData] = useState<WalletItem[] | null>(null);

  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);

  const [accessToken, setAccessToken] = useState("");

  // Wallet addresses
  const [solWalletAddress, setSolWalletAddress] = useState("");
  const [evmWalletAddress, setEvmWalletAddress] = useState("");

  // QR code modals state
  const [walletQRModalOpen, setWalletQRModalOpen] = useState(false);
  const [walletQRShareModalOpen, setWalletQRShareModalOpen] = useState(false);
  const [walletShareAddress, setWalletShareAddress] = useState("");
  const [qrcodeShareUrl, setQrcodeShareUrl] = useState("");
  const [QRCodeShareModalOpen, setQRCodeShareModalOpen] = useState(false);

  // Transaction payload
  const [payload, setPayload] = useState({
    smartsiteId: "",
    userId: "",
    smartsiteUserName: "",
    smartsiteEnsName: "",
    smartsiteProfilePic: "",
    postType: "transaction",
    content: {
      transaction_type: "token", // or 'swap', 'nft'
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
  const { createWallet, solanaWallets } = useSolanaWalletContext();
  const { toast } = useToast();
  const { user } = useUser();

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
  } = useSendFlow();



  // Update user profile data for transaction payload
  useEffect(() => {
    if (user) {
      const primaryMicrositeData = user?.microsites?.find(
        (microsite: any) => microsite.primary
      );

      setPayload((prev) => ({
        ...prev,
        smartsiteId: user?.primaryMicrosite,
        userId: user?._id,
        smartsiteUserName: primaryMicrositeData?.name,
        smartsiteEnsName:
          primaryMicrositeData?.ens || primaryMicrositeData?.ensData?.ens,
        smartsiteProfilePic: primaryMicrositeData?.profilePic,
      }));
    }
  }, [user]);

  // Get access token from cookies
  useEffect(() => {
    const token = Cookies.get("access-token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  // Update wallet addresses when wallet data changes
  useEffect(() => {
    if (!walletData) return;

    const solWallet = walletData.find((w) => !w.isEVM);
    const evmWallet = walletData.find((w) => w.isEVM);

    setSolWalletAddress(solWallet?.address || "");
    setEvmWalletAddress(evmWallet?.address || "");
  }, [walletData]);

  // Load wallet data from Privy
  useEffect(() => {
    if (authenticated && ready && PrivyUser) {
      const linkWallet = PrivyUser?.linkedAccounts
        .filter(
          (item: any) =>
            item.chainType === "ethereum" || item.chainType === "solana"
        )
        .map((item: any) => ({
          address: item.address,
          isActive:
            item.walletClientType === "privy" ||
            item.connectorType === "embedded",
          isEVM: item.chainType === "ethereum",
          walletClientType: item.walletClientType,
        }));

      setWalletData(linkWallet as WalletItem[]);
    }
  }, [PrivyUser, authenticated, ready]);

  // Create Solana wallet if it doesn't exist
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

  // Data fetching hooks
  const {
    tokens,
    loading: tokenLoading,
    error: tokenError,
  } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddress,
    SUPPORTED_CHAINS
  );


  const { tokens : sepoliaTokens, loading, error, refetch } = useMultiChainTokenData(
    undefined, // Solana wallet (optional)
    evmWalletAddress,
    ['SEPOLIA'] // Add Sepolia here
  );


  console.log("sepoliaTokens", sepoliaTokens, 'tokens', tokens);


  const {
    nfts,
    loading: nftLoading,
    error: nftError,
    refetch: refetchNFTs,
  } = useNFT(solWalletAddress, evmWalletAddress, SUPPORTED_CHAINS);

  // Calculate total balance
  const totalBalance = useMemo(() => {
    return tokens.reduce((total, token) => {
      const value =
        parseFloat(token.balance) * parseFloat(token.marketData.price);
      return isNaN(value) ? total : total + value;
    }, 0);
  }, [tokens]);

  // Get native token price for fee calculations
  const nativeTokenPrice = useMemo(
    () => tokens.find((token) => token.isNative)?.marketData.price || "0",
    [tokens]
  );

  // Transaction handlers
  const handleSendConfirm = useCallback(async () => {
    if (
      (!sendFlow.token && !sendFlow.nft) ||
      !sendFlow.recipient ||
      !sendFlow.amount
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing transaction information",
      });
      return;
    }

    setSendLoading(true);

    const amount = calculateTransactionAmount(sendFlow);

    try {
      const result = await executeTransaction();

      if (!result.success) {
        throw new Error(result.error || "Transaction failed");
      }

      const hash = result.hash;

      // Update points if using Swop.ID
      if (sendFlow.recipient.isEns) {
        addSwopPoint({
          userId: user?._id,
          pointType: "Using Swop.ID for Transactions",
          actionKey: "launch-swop",
        });
      }

      // Create and post transaction feed
      const transactionPayload = createTransactionPayload({
        basePayload: payload,
        sendFlow,
        hash: hash || "",
        amount: Number(amount),
        walletAddress: evmWalletAddress || solWalletAddress,
      });

      await postFeed(transactionPayload, accessToken);

      // Update UI state
      setSendFlow((prev) => ({
        ...prev,
        hash: hash || "",
        step: "success",
      }));
    } catch (error) {
      console.error("Error sending token/NFT:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send transaction",
      });
      resetSendFlow();
    } finally {
      setSendLoading(false);
    }
  }, [
    sendFlow,
    setSendLoading,
    user,
    payload,
    accessToken,
    evmWalletAddress,
    solWalletAddress,
    toast,
    resetSendFlow,
  ]);

  // Calculating transaction amount (accounting for USD conversion)
  const calculateTransactionAmount = useCallback((flowData: SendFlowState) => {
    if (flowData.isUSD && flowData.token?.marketData.price) {
      return Number(flowData.amount) / Number(flowData.token.marketData.price);
    }
    return flowData.amount;
  }, []);

  // Execute the actual transaction based on type and network
  const executeTransaction = useCallback(async () => {
    try {
      let hash = "";
      let transaction = null;

      console.log("Transaction execution debug:", {
        network: sendFlow.network,
        tokenChain: sendFlow.token?.chain,
        CHAIN_ID_mapping: CHAIN_ID
      });

      const connection = new Connection(
        process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL!,
        "confirmed"
      );

      const solanaWallet = solanaWallets?.find(
        (w: any) => w.walletClientType === "privy"
      );

      const linkedEthereumWallet = PrivyUser?.linkedAccounts.find(
        (item: any) => item.chainType === "ethereum" && item.address
      );

      const evmWallet = ethWallets.find(
        (w) =>
          w.address?.toLowerCase() ===
          (linkedEthereumWallet as any)?.address?.toLowerCase()
      );

      if (sendFlow.nft) {
        // Handle NFT transfer
        if (sendFlow.network === "SOLANA") {
          hash = await TransactionService.handleSolanaNFTTransfer(
            solanaWallet,
            sendFlow,
            connection
          );
        } else {
          // Make sure we're on the right chain before sending
          console.log("Switching chain to:", sendFlow.network, CHAIN_ID[sendFlow.network]);
          await evmWallet?.switchChain(CHAIN_ID[sendFlow.network]);
          hash = await TransactionService.handleNFTTransfer(
            evmWallet,
            sendFlow
          );
        }
        refetchNFTs();
      } else {
        // Handle token transfer
        if (sendFlow.token?.chain === "SOLANA") {
          // Special handling for USDC and SWOP tokens on Solana
          if (
            sendFlow.token?.address === USDC_ADDRESS ||
            sendFlow.token?.address === SWOP_ADDRESS
          ) {
            const serializedTransaction =
              await TransactionService.handleSolanaSend(
                solanaWallet,
                sendFlow,
                connection
              );

            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/sponsor-transaction`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  transaction: serializedTransaction,
                }),
              }
            );

            if (!response.ok) {
              throw new Error(`Server error: ${response.status}`);
            }

            const { transactionHash } = await response.json();
            hash = transactionHash.signature;
            await connection.confirmTransaction(hash);
          } else {
            hash = await TransactionService.handleSolanaSend(
              solanaWallet,
              sendFlow,
              connection
            );
            await connection.confirmTransaction(hash);
          }
        } else {
          // EVM token transfer
          // Make sure we're on the right chain before sending
          console.log("Switching chain for token transfer to:", sendFlow.network, CHAIN_ID[sendFlow.network]);
          await evmWallet?.switchChain(CHAIN_ID[sendFlow.network]);
          
          const result = await TransactionService.handleEVMSend(
            evmWallet,
            sendFlow,
            sendFlow.network
          );
          hash = result.hash;
          transaction = result.transaction;
        }
      }

      return { success: true, hash, transaction };
    } catch (error) {
      console.error("Transaction execution error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }, [sendFlow, ethWallets, solanaWallets, PrivyUser, refetchNFTs]);

  // UI Event handlers
  const handleTokenSelect = useCallback(
    (token: TokenData) => setSelectedToken(token),
    []
  );

  const handleSelectNFT = useCallback((nft: NFT) => {
    setSelectedNFT(nft);
    setIsNFTModalOpen(true);
  }, []);

  const handleCloseNFTModal = useCallback(() => {
    setIsNFTModalOpen(false);
    setSelectedNFT(null);
  }, []);

  const handleBack = useCallback(() => setSelectedToken(null), []);

  const handleQRClick = useCallback(() => setWalletQRModalOpen(true), []);

  const handleAssetSelect = useCallback(
    () =>
      setSendFlow((prev) => ({
        ...prev,
        step: "select-method",
      })),
    [setSendFlow]
  );


  return (
    <div className="">
      <ProfileHeader />

      {/* Balance & Token Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
        <WalletBalanceChartForWalletPage
          tokens={tokens}
          walletData={walletData || []}
          totalBalance={totalBalance}
          onSelectAsset={handleAssetSelect}
          onQRClick={handleQRClick}
        />

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
      </div>

      {/* NFT & Messages Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-6">
        <div>
          <NFTSlider
            onSelectNft={handleSelectNFT}
            address={evmWalletAddress || solWalletAddress}
            nfts={nfts}
            loading={nftLoading}
            error={nftError}
          />

          {selectedNFT && (
            <NFTDetailView
              isOpen={isNFTModalOpen}
              onClose={handleCloseNFTModal}
              nft={selectedNFT}
              onNext={() => handleNFTNext(selectedNFT)}
            />
          )}
        </div>
        <MessageList />
      </div>

      {/* All Modals */}
      <WalletModals
        sendFlow={sendFlow}
        resetSendFlow={resetSendFlow}
        tokens={tokens}
        nfts={nfts}
        handleSendClick={handleSendClick}
        handleNFTNext={handleNFTNext}
        handleAmountConfirm={handleAmountConfirm}
        handleRecipientSelect={handleRecipientSelect}
        handleSendConfirm={handleSendConfirm}
        network={sendFlow.network}
        currentWalletAddress={evmWalletAddress || solWalletAddress}
        sendLoading={sendLoading}
        nativeTokenPrice={nativeTokenPrice}
        walletQRModalOpen={walletQRModalOpen}
        setWalletQRModalOpen={setWalletQRModalOpen}
        walletData={walletData || []}
        setWalletShareAddress={setWalletShareAddress}
        setWalletQRShareModalOpen={setWalletQRShareModalOpen}
        walletQRShareModalOpen={walletQRShareModalOpen}
        walletShareAddress={walletShareAddress}
        setQrcodeShareUrl={setQrcodeShareUrl}
        setQRCodeShareModalOpen={setQRCodeShareModalOpen}
        QRCodeShareModalOpen={QRCodeShareModalOpen}
        qrcodeShareUrl={qrcodeShareUrl}
        setSendFlow={setSendFlow}
      />

      {/* <TransactionList
        solWalletAddress={solWalletAddress}
        evmWalletAddress={evmWalletAddress}
        chains={SUPPORTED_CHAINS}
        tokens={tokens}
        newTransactions={newTransactions}
      /> */}
      <RedeemTokenList />
      <Toaster />
    </div>
  );
};
