"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  usePrivy,
  useWallets,
  useSolanaWallets,
  useAuthorizationSignature,
} from "@privy-io/react-auth";
import { useSolanaWalletContext } from "@/lib/context/SolanaWalletContext";
import { Connection } from "@solana/web3.js";
import { useToast } from "@/hooks/use-toast";

import { ChainType, TokenData } from "@/types/token";
import { NFT } from "@/types/nft";
import { CHAIN_ID, SendFlowState } from "@/types/wallet-types";

import {
  TransactionService,
  USDC_ADDRESS,
  SWOP_ADDRESS,
} from "@/services/transaction-service";
import { useSendFlow } from "@/lib/hooks/useSendFlow";
import { useMultiChainTokenData } from "@/lib/hooks/useToken";
import { useNFT } from "@/lib/hooks/useNFT";
import { useUser } from "@/lib/UserContext";
import { addSwopPoint } from "@/actions/addPoint";
import { postFeed } from "@/actions/postFeed";

// Custom hooks
import { useWalletData, useWalletAddresses } from "./hooks/useWalletData";
import { useTransactionPayload } from "./hooks/useTransactionPayload";

// Constants
import {
  SUPPORTED_CHAINS,
  SUPPORTED_CHAINS_TRANSACTIONS,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  POINT_TYPES,
  ACTION_KEYS,
} from "./constants";

// UI Components
import TokenList from "./token/token-list";
import NFTSlider from "./nft/nft-list";
import TokenDetails from "./token/token-details-view";
import NFTDetailView from "./nft/nft-details-view";
import WalletModals from "./WalletModals";
import { Toaster } from "../ui/toaster";
import RedeemTokenList from "./redeem/token-list";
import BalanceChart from "../dashboard/BalanceChart";
import PortfolioChart, { PortfolioAsset } from "../dashboard/PortfolioChart";
// Utilities
import Cookies from "js-cookie";
import { createTransactionPayload } from "@/lib/utils/transactionUtils";
import { Loader2 } from "lucide-react";
import { useNewSocketChat } from "@/lib/context/NewSocketChatContext";
import {
  getWalletNotificationService,
  formatUSDValue,
} from "@/lib/utils/walletNotifications";
import TransactionList from "./transaction/transaction-list";

// Token colors mapping for consistent visual representation
const TOKEN_COLORS: Record<string, string> = {
  SOL: "#10b981",
  SWOP: "#d1fae5",
  ETH: "#047857",
  BTC: "#f59e0b",
  USDC: "#2563eb",
  USDT: "#22c55e",
  BNB: "#eab308",
  XRP: "#06b6d4",
  MATIC: "#8b5cf6",
  POL: "#8b5cf6",
  default: "#6b7280",
};

const getTokenColor = (symbol: string): string => {
  return TOKEN_COLORS[symbol] || TOKEN_COLORS.default;
};

export default function WalletContent() {
  return <WalletContentInner />;
}

const WalletContentInner = () => {
  // UI state
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isNFTModalOpen, setIsNFTModalOpen] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  // QR code modals state
  const [walletQRModalOpen, setWalletQRModalOpen] = useState(false);
  const [walletQRShareModalOpen, setWalletQRShareModalOpen] = useState(false);
  const [walletShareAddress, setWalletShareAddress] = useState("");
  const [qrcodeShareUrl, setQrcodeShareUrl] = useState("");
  const [QRCodeShareModalOpen, setQRCodeShareModalOpen] = useState(false);

  // Hooks
  const { authenticated, ready, user: PrivyUser } = usePrivy();
  const { generateAuthorizationSignature } = useAuthorizationSignature();

  const { wallets: ethWallets } = useWallets();

  const { wallets: directSolanaWallets, createWallet: createSolanaWallet } =
    useSolanaWallets();

  const { createWallet, solanaWallets } = useSolanaWalletContext();
  const { toast } = useToast();
  const { user } = useUser();

  // Socket connection for wallet notifications
  const { socket: chatSocket, isConnected: socketConnected } =
    useNewSocketChat();
  const socket = chatSocket;
  // Custom hooks
  const walletData = useWalletData(authenticated, ready, PrivyUser);
  const { solWalletAddress, evmWalletAddress } = useWalletAddresses(walletData);
  const { payload } = useTransactionPayload(user);
  // const { wallets: ethWalletsData } = useWallets();

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

  console.log("send flow", sendFlow);

  // Get access token from cookies
  useEffect(() => {
    const token = Cookies.get("access-token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  // Create Solana wallet if it doesn't exist
  useEffect(() => {
    if (!authenticated || !ready || !PrivyUser) return;

    const hasExistingSolanaWallet = PrivyUser.linkedAccounts.some(
      (account: any) =>
        account.type === "wallet" &&
        account.walletClientType === "privy" &&
        account.chainType === "solana"
    );

    if (!hasExistingSolanaWallet) {
      createSolanaWallet();
    }
  }, [authenticated, ready, PrivyUser, createSolanaWallet]);

  // Data fetching hooks
  const {
    tokens,
    loading: tokenLoading,
    error: tokenError,
    refetch: refetchTokens,
  } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddress,
    SUPPORTED_CHAINS
  );

  const {
    nfts,
    loading: nftLoading,
    error: nftError,
    refetch: refetchNFTs,
  } = useNFT(solWalletAddress, evmWalletAddress, SUPPORTED_CHAINS);

  // Memoized calculations
  const totalBalance = useMemo(() => {
    return tokens.reduce((total, token) => {
      const value =
        parseFloat(token.balance) *
        (token.marketData?.price ? parseFloat(token.marketData.price) : 0);
      return isNaN(value) ? total : total + value;
    }, 0);
  }, [tokens]);

  // Transform tokens into portfolio assets
  const portfolioData = useMemo(() => {
    if (!tokens || tokens.length === 0) {
      return {
        assets: [],
        totalBalance: "0.00",
      };
    }

    // Calculate token values and filter out zero balances
    const assetsWithValue = tokens
      .map((token) => {
        const balance = parseFloat(token.balance || "0");
        const price = parseFloat(token.marketData?.price || "0");
        const value = balance * price;

        return {
          name: token.symbol,
          value: value,
          color: getTokenColor(token.symbol),
          amount: `${balance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })} ${token.symbol}`,
        };
      })
      .filter((asset) => asset.value > 0) // Only include tokens with positive value
      .sort((a, b) => b.value - a.value); // Sort by value descending

    // Calculate total balance
    const total = assetsWithValue.reduce((sum, asset) => sum + asset.value, 0);

    // Take top 5 tokens and group rest as "Others"
    const topAssets = assetsWithValue.slice(0, 5);
    const otherAssets = assetsWithValue.slice(5);

    const assets: PortfolioAsset[] = [...topAssets];

    if (otherAssets.length > 0) {
      const othersValue = otherAssets.reduce(
        (sum, asset) => sum + asset.value,
        0
      );
      assets.push({
        name: "Others",
        value: othersValue,
        color: "#94a3b8",
        amount: `${otherAssets.length} tokens`,
      });
    }

    return {
      assets,
      totalBalance: total.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  }, [tokens]);

  const nativeTokenPrice = useMemo(
    () => tokens.find((token) => token.isNative)?.marketData?.price || "0",
    [tokens]
  );

  const currentWalletAddress = useMemo(
    () => evmWalletAddress || solWalletAddress,
    [evmWalletAddress, solWalletAddress]
  );

  // Optimized calculation function
  const calculateTransactionAmount = useCallback(
    (flowData: SendFlowState): string => {
      if (flowData.isUSD && flowData.token?.marketData.price) {
        return (
          Number(flowData.amount) / Number(flowData.token.marketData.price)
        ).toString();
      }
      return flowData.amount;
    },
    []
  );

  // Helper function to convert relative URLs to absolute URLs
  const convertToAbsoluteUrl = useCallback(
    (imageUrl: string | undefined): string | undefined => {
      if (!imageUrl) return undefined;

      // If already absolute URL, return as is
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return imageUrl;
      }

      // Convert relative path to absolute URL using API base URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      return `${apiUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
    },
    []
  );

  // Optimized transaction execution
  const executeTransaction = useCallback(async () => {
    try {
      const connection = new Connection(
        process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL!,
        "confirmed"
      );

      // Use direct Solana wallets from Privy (more reliable)
      const availableSolanaWallets = directSolanaWallets || solanaWallets || [];

      const solanaWallet =
        availableSolanaWallets.find(
          (w: any) =>
            w.walletClientType === "privy" || w.connectorType === "embedded"
        ) || availableSolanaWallets[0];

      // Check if we have a Solana wallet when needed
      if (
        (sendFlow.token?.chain?.toUpperCase() === "SOLANA" ||
          sendFlow.network.toUpperCase() === "SOLANA") &&
        !solanaWallet
      ) {
        // Check if wallet exists in linked accounts but not in wallets array
        const hasSolanaAccount = PrivyUser?.linkedAccounts?.some(
          (account: any) =>
            account.chainType === "solana" && account.type === "wallet"
        );

        if (hasSolanaAccount) {
          throw new Error(
            "Solana wallet found in account but not accessible. Please refresh the page and try again."
          );
        } else {
          throw new Error(
            "No Solana wallet found. Please connect a Solana wallet."
          );
        }
      }

      // Find Ethereum wallet with explicit type casting
      const allAccounts = PrivyUser?.linkedAccounts || [];
      const ethereumAccount = allAccounts.find(
        (account: any) =>
          account.chainType === "ethereum" &&
          account.type === "wallet" &&
          account.address
      );

      let evmWallet;

      if ((ethereumAccount as any)?.address) {
        evmWallet = ethWallets.find(
          (w) =>
            w.address?.toLowerCase() ===
            (ethereumAccount as any).address.toLowerCase()
        );
      }

      let hash = "";

      if (sendFlow.nft) {
        // Handle NFT transfer
        if (sendFlow.network.toUpperCase() === "SOLANA") {
          hash = await TransactionService.handleSolanaNFTTransfer(
            solanaWallet,
            sendFlow,
            connection
          );
        } else {
          await evmWallet?.switchChain(CHAIN_ID[sendFlow.network]);
          hash = await TransactionService.handleNFTTransfer(
            evmWallet,
            sendFlow
          );
        }
        refetchNFTs();
      } else if (sendFlow.token) {
        // Handle token transfer
        if (sendFlow.token.chain.toUpperCase() === "SOLANA") {
          const result = await TransactionService.handleSolanaSend(
            solanaWallet,
            sendFlow,
            connection,
            PrivyUser,
            generateAuthorizationSignature
          );

          hash = result;

          // For sponsored transactions (USDC/SWOP), Privy handles confirmation
          // For regular transactions, we need to confirm manually
          const isSponsored =
            sendFlow.token?.address === USDC_ADDRESS ||
            sendFlow.token?.address === SWOP_ADDRESS;

          if (hash && !isSponsored) {
            await connection.confirmTransaction(hash);
          }
          // If sponsored, the transaction is already confirmed by Privy
        } else {
          // EVM token transfer
          await evmWallet?.switchChain(CHAIN_ID[sendFlow.network]);
          const result = await TransactionService.handleEVMSend(
            evmWallet,
            sendFlow,
            sendFlow.network
          );
          hash = result.hash;
        }
      }

      return { success: true, hash };
    } catch (error) {
      console.error("Transaction execution error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
      };
    }
  }, [
    directSolanaWallets,
    solanaWallets,
    sendFlow,
    PrivyUser,
    ethWallets,
    refetchNFTs,
    generateAuthorizationSignature,
  ]);

  // Main transaction handler
  const handleSendConfirm = useCallback(async () => {
    if (
      (!sendFlow.token && !sendFlow.nft) ||
      !sendFlow.recipient ||
      !sendFlow.amount
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description: ERROR_MESSAGES.MISSING_TRANSACTION_INFO,
      });
      return;
    }

    setSendLoading(true);

    try {
      const result = await executeTransaction();

      if (!result.success) {
        throw new Error(result.error || ERROR_MESSAGES.TRANSACTION_FAILED);
      }

      // Update points if using Swop.ID
      if (sendFlow.recipient.isEns && user?._id) {
        await addSwopPoint({
          userId: user._id,
          pointType: POINT_TYPES.USING_SWOP_ID,
          actionKey: ACTION_KEYS.LAUNCH_SWOP,
        });
      }

      // Create and post transaction feed
      if (result.hash && accessToken) {
        const amount = Number(calculateTransactionAmount(sendFlow));
        const transactionPayload = createTransactionPayload({
          basePayload: payload,
          sendFlow,
          hash: result.hash,
          amount,
          walletAddress: currentWalletAddress,
        });

        await postFeed(transactionPayload, accessToken);
      }

      if (socket && socket.connected && result.hash) {
        try {
          const notificationService = getWalletNotificationService(socket);

          if (sendFlow.nft) {
            // NFT transfer notification
            const networkName = sendFlow.network?.toUpperCase() || "SOLANA";

            const nftData = {
              nftName: sendFlow.nft.name || "NFT",
              nftImage: convertToAbsoluteUrl(sendFlow.nft.image),
              recipientAddress: sendFlow.recipient.address,
              recipientEnsName:
                sendFlow.recipient.ensName || sendFlow.recipient.address,
              txSignature: result.hash,
              network: networkName,
              tokenId: sendFlow.nft.tokenId,
              collectionName: sendFlow.nft.collection?.collectionName,
            };

            notificationService.emitNFTSent(nftData);
          } else if (sendFlow.token) {
            // Token transfer notification
            const amount = calculateTransactionAmount(sendFlow);
            const networkName = sendFlow.token.chain?.toUpperCase() || "SOLANA";
            const usdValue = sendFlow.token.marketData?.price
              ? formatUSDValue(amount, sendFlow.token.marketData.price)
              : undefined;

            const tokenData = {
              tokenSymbol: sendFlow.token.symbol,
              tokenName: sendFlow.token.name,
              amount: amount,
              recipientAddress: sendFlow.recipient.address,
              recipientEnsName:
                sendFlow.recipient.ensName || sendFlow.recipient.address,
              txSignature: result.hash,
              network: networkName,
              tokenLogo: convertToAbsoluteUrl(sendFlow.token.logoURI),
              usdValue: usdValue,
            };

            notificationService.emitTokenSent(tokenData);
          }
        } catch (notifError) {
          console.error("Failed to send transfer notification:", notifError);
        }
      }

      // Update UI state
      setSendFlow((prev) => ({
        ...prev,
        hash: result.hash || "",
        step: "success",
      }));
    } catch (error) {
      console.error("Error sending token/NFT:", error);

      // Send failure notification via Socket.IO
      if (socket && socket.connected) {
        try {
          const notificationService = getWalletNotificationService(socket);
          const errorMessage =
            error instanceof Error
              ? error.message
              : ERROR_MESSAGES.SEND_TRANSACTION_FAILED;

          if (sendFlow.nft) {
            // For NFT failures, we can emit a generic failure event
            // Since walletNotifications.ts doesn't have a specific NFT failure handler,
            // we'll log it for now
          } else if (sendFlow.token) {
            // For token transfers, we can log the failure
          }
        } catch (notifError) {
          console.error("Failed to send failure notification:", notifError);
        }
      }

      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : ERROR_MESSAGES.SEND_TRANSACTION_FAILED,
      });
      resetSendFlow();
    } finally {
      setSendLoading(false);
    }
  }, [
    sendFlow,
    setSendLoading,
    executeTransaction,
    user,
    payload,
    accessToken,
    currentWalletAddress,
    calculateTransactionAmount,
    convertToAbsoluteUrl,
    toast,
    resetSendFlow,
    setSendFlow,
    socket,
  ]);

  // Memoized event handlers
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
    <div className="p-0">
      {/* <TokenTicker /> */}

      {/* Balance & Token Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-4">
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl">
            <BalanceChart
              userId={user?._id}
              currency="$"
              totalBalance={totalBalance}
              onSelectAsset={handleAssetSelect}
              onQRClick={handleQRClick}
              walletData={walletData || []}
              tokens={tokens}
              accessToken={accessToken}
              onTokenRefresh={refetchTokens}
              isButtonVisible={true}
            />
          </div>

          <div className="flex flex-row gap-4">
            <div className="rounded-xl bg-white flex-1  ">
              <div className="flex items-center justify-between pl-6 pt-6 mb-2">
                <div className="flex items-center">
                  <span className="font-bold text-xl text-gray-700">
                    Tokens
                  </span>
                  {tokenLoading && (
                    <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
                  )}
                </div>
                {/* <ViewToggle viewMode={viewMode} onViewChange={setViewMode} /> */}
              </div>
              <div className="max-h-[35.5rem] overflow-y-auto rounded-xl">
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
            </div>
            <div className="rounded-xl bg-white flex-1">
              <TransactionList
                solWalletAddress={solWalletAddress}
                evmWalletAddress={evmWalletAddress}
                chains={SUPPORTED_CHAINS_TRANSACTIONS as ChainType[]}
                tokens={tokens}
                newTransactions={[]}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl">
            {tokenLoading ? (
              <PortfolioChartSkeleton />
            ) : portfolioData.assets.length > 0 ? (
              <PortfolioChart
                assets={portfolioData.assets}
                balance={`$${portfolioData.totalBalance}`}
                title="Portfolio"
                showViewButton={false}
              />
            ) : (
              <PortfolioEmptyState />
            )}
          </div>
          {/* NFT & Messages Section */}
          <div className="">
            <div>
              <NFTSlider
                onSelectNft={handleSelectNFT}
                address={currentWalletAddress}
                nfts={nfts}
                loading={nftLoading}
                error={nftError}
                refetch={refetchNFTs}
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
          </div>
          <RedeemTokenList />
        </div>
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
        currentWalletAddress={currentWalletAddress}
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

      <Toaster />
    </div>
  );
};

function PortfolioChartSkeleton() {
  return (
    <div className="w-full p-5">
      <div className="flex flex-row items-center justify-between pb-2">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="pt-6">
        <div className="flex items-center justify-center gap-8">
          <div className="h-[200px] w-[200px] bg-gray-200 rounded-full animate-pulse" />
          <div className="flex flex-col gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioEmptyState() {
  return (
    <div className="w-full p-5">
      <div className="flex flex-row items-center justify-between pb-2">
        <h2 className="text-lg font-semibold">Portfolio</h2>
      </div>
      <div className="pt-6 pb-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-gray-600 font-medium mb-1">No tokens found</p>
        <p className="text-sm text-gray-500">
          Connect your wallet to view your portfolio.
        </p>
      </div>
    </div>
  );
}
