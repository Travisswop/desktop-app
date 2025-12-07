"use client";
import Image from "next/image";
import CustomModal from "../modal/CustomModal";
import isUrl from "@/lib/isUrl";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import SelectTokenModal from "./SelectTokenModal";
import {
  useWalletAddresses,
  useWalletData,
} from "../wallet/hooks/useWalletData";
import {
  usePrivy,
  useWallets,
  useSolanaWallets,
  useAuthorizationSignature,
} from "@privy-io/react-auth";
import { SUPPORTED_CHAINS } from "../wallet/constants";
import { useMultiChainTokenData } from "@/lib/hooks/useToken";
import { Connection } from "@solana/web3.js";
import { useToast } from "@/hooks/use-toast";
import {
  TransactionService,
  USDC_ADDRESS,
  SWOP_ADDRESS,
} from "@/services/transaction-service";
import { CHAIN_ID, SendFlowState } from "@/types/wallet-types";
import { useUser } from "@/lib/UserContext";
import { addSwopPoint } from "@/actions/addPoint";
import { postFeed } from "@/actions/postFeed";
import Cookies from "js-cookie";
import { createTransactionPayload } from "@/lib/utils/transactionUtils";
import { useNewSocketChat } from "@/lib/context/NewSocketChatContext";
import {
  getWalletNotificationService,
  formatUSDValue,
} from "@/lib/utils/walletNotifications";
import {
  API_ENDPOINTS,
  ERROR_MESSAGES,
  POINT_TYPES,
  ACTION_KEYS,
} from "../wallet/constants";
import TipConfirmation from "./TipConfirmationModal";
import { getEnsDataUsingEns } from "@/actions/getEnsData";
import { useTransactionPayload } from "../wallet/hooks/useTransactionPayload";
import { toFixedTruncate } from "@/lib/fixedTruncateNumber";
import { PrimaryButton } from "../ui/Button/PrimaryButton";

interface TipContentModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCloseModal?: React.Dispatch<React.SetStateAction<boolean>>;
  feedItem: any;
}

const TipContentModal: React.FC<TipContentModalProps> = ({
  isOpen,
  onClose,
  onCloseModal,
  feedItem,
}) => {
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  const { authenticated, ready, user: PrivyUser, sendTransaction } = usePrivy();
  const { generateAuthorizationSignature } = useAuthorizationSignature();
  const { wallets: ethWallets } = useWallets();
  const { wallets: directSolanaWallets } = useSolanaWallets();
  const { toast } = useToast();
  const { user } = useUser();
  console.log("user1234", user);

  const { socket: chatSocket, isConnected: socketConnected } =
    useNewSocketChat();

  const { payload } = useTransactionPayload(user);

  const walletData = useWalletData(authenticated, ready, PrivyUser);
  const { solWalletAddress, evmWalletAddress } = useWalletAddresses(walletData);

  console.log("feedItem", feedItem);

  // fetch token data
  const {
    tokens,
    loading: tokenLoading,
    error: tokenError,
  } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddress,
    SUPPORTED_CHAINS
  );

  const [selectedToken, setSelectedToken] = useState<any>(null);
  console.log("selectedToken", selectedToken);

  // Get access token
  useEffect(() => {
    const token = Cookies.get("access-token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  // 🪄 set first token as default when tokens load
  useEffect(() => {
    if (tokens && tokens.length > 0 && !selectedToken) {
      setSelectedToken(tokens[0]);
    }
  }, [tokens, selectedToken]);

  // Reset tip amount when token changes
  useEffect(() => {
    setTipAmount("");
  }, [selectedToken]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setTipAmount(value);
    }
  };

  const handleMaxClick = () => {
    if (selectedToken) {
      setTipAmount(Number(selectedToken.balance).toFixed(6));
    }
  };

  const getTipAmountInUSD = () => {
    if (!tipAmount || !selectedToken?.marketData?.price) return 0;
    const amount = parseFloat(tipAmount) || 0;
    const price = parseFloat(selectedToken.marketData.price) || 0;
    return (amount * price).toFixed(6);
  };

  const isValidAmount = () => {
    if (!tipAmount || !selectedToken) return false;
    const amount = parseFloat(tipAmount);
    const balance = parseFloat(selectedToken.balance);
    return amount > 0 && amount <= balance;
  };

  const handleTipClick = () => {
    if (!isValidAmount()) return;
    setIsConfirmModalOpen(true);
  };

  // Helper function to convert relative URLs to absolute URLs
  const convertToAbsoluteUrl = useCallback(
    (imageUrl: string | undefined): string | undefined => {
      if (!imageUrl) return undefined;
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return imageUrl;
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      return `${apiUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
    },
    []
  );

  // Execute tip transaction (similar to handleSendConfirm)
  // const executeTipTransaction = useCallback(
  //   async (recipientWalletAddress: string) => {
  //     try {
  //       const connection = new Connection(
  //         process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL!,
  //         "confirmed"
  //       );
  //       const availableSolanaWallets = directSolanaWallets || [];
  //       const solanaWallet =
  //         availableSolanaWallets.find(
  //           (w: any) =>
  //             w.walletClientType === "privy" || w.connectorType === "embedded"
  //         ) || availableSolanaWallets[0];

  //       if (selectedToken?.chain === "SOLANA" && !solanaWallet) {
  //         throw new Error("No Solana wallet found. Please connect a wallet.");
  //       }

  //       const allAccounts = PrivyUser?.linkedAccounts || [];
  //       const ethereumAccount = allAccounts.find(
  //         (account: any) =>
  //           account.chainType === "ethereum" &&
  //           account.type === "wallet" &&
  //           account.address
  //       );

  //       let evmWallet;
  //       if ((ethereumAccount as any)?.address) {
  //         evmWallet = ethWallets.find(
  //           (w) =>
  //             w.address?.toLowerCase() ===
  //             (ethereumAccount as any).address.toLowerCase()
  //         );
  //       }

  //       let hash = "";

  //       const tipFlow: SendFlowState = {
  //         step: "confirm",
  //         token: selectedToken,
  //         amount: tipAmount,
  //         recipient: {
  //           address: recipientWalletAddress, // ✅ updated
  //           ensName: feedItem.smartsiteId?.name || "",
  //           isEns: true,
  //         },
  //         network: selectedToken.chain,
  //         hash: "",
  //         isUSD: false,
  //         nft: null,
  //       };

  //       if (selectedToken.chain === "SOLANA") {
  //         const result = await TransactionService.handleSolanaSend(
  //           solanaWallet,
  //           tipFlow,
  //           connection,
  //           PrivyUser,
  //           generateAuthorizationSignature
  //         );

  //         hash = result;
  //         if (hash) await connection.confirmTransaction(hash);
  //       } else {
  //         await evmWallet?.switchChain(CHAIN_ID[selectedToken.chain]);
  //         const result = await TransactionService.handleEVMSend(
  //           evmWallet,
  //           tipFlow,
  //           selectedToken.chain
  //         );
  //         hash = result.hash;
  //       }

  //       return { success: true, hash };
  //     } catch (error) {
  //       console.error("Tip transaction error:", error);
  //       return {
  //         success: false,
  //         error:
  //           error instanceof Error
  //             ? error.message
  //             : ERROR_MESSAGES.UNKNOWN_ERROR,
  //       };
  //     }
  //   },
  //   [
  //     selectedToken,
  //     tipAmount,
  //     feedItem,
  //     directSolanaWallets,
  //     ethWallets,
  //     PrivyUser,
  //     generateAuthorizationSignature,
  //   ]
  // );

  const executeTipTransaction = useCallback(
    async (recipientWalletAddress: string) => {
      try {
        const connection = new Connection(
          process.env.NEXT_PUBLIC_QUICKNODE_SOLANA_URL!,
          "confirmed"
        );

        const availableSolanaWallets = directSolanaWallets || [];
        const solanaWallet =
          availableSolanaWallets.find(
            (w: any) =>
              w.walletClientType === "privy" || w.connectorType === "embedded"
          ) || availableSolanaWallets[0];

        if (
          (selectedToken?.chain === "SOLANA" ||
            selectedToken?.chain === "solana") &&
          !solanaWallet
        ) {
          throw new Error("No Solana wallet found. Please connect a wallet.");
        }

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

        const tipFlow: SendFlowState = {
          step: "confirm",
          token: selectedToken,
          amount: tipAmount,
          recipient: {
            address: recipientWalletAddress,
            ensName: feedItem.smartsiteId?.name || "",
            isEns: true,
          },
          network: selectedToken.chain,
          hash: "",
          isUSD: false,
          nft: null,
        };

        if (
          selectedToken.chain === "SOLANA" ||
          selectedToken.chain === "solana"
        ) {
          try {
            // ✅ First, try sponsored transaction
            const result = await TransactionService.handleSolanaSend(
              solanaWallet,
              tipFlow,
              connection,
              PrivyUser,
              generateAuthorizationSignature
            );

            hash = result;
            if (hash) await connection.confirmTransaction(hash);
          } catch (sponsoredError: any) {
            console.log(
              "Sponsored transaction failed, falling back to regular transaction"
            );

            // ✅ Check if it's a sponsored transaction error
            if (
              sponsoredError?.message?.includes("sponsored") ||
              sponsoredError?.message?.includes("Sponsored") ||
              sponsoredError?.message?.includes("400")
            ) {
              // ✅ Fallback: Execute regular transaction (user pays gas)
              try {
                toast({
                  title: "Processing Transaction",
                  description: "Gas fees will be deducted from your wallet.",
                });

                const fallbackResult =
                  await TransactionService.handleSolanaSendWithoutSponsorship(
                    solanaWallet,
                    tipFlow,
                    connection
                  );

                hash = fallbackResult;
                if (hash) await connection.confirmTransaction(hash);
              } catch (fallbackError: any) {
                // If fallback also fails, throw the error
                throw fallbackError;
              }
            } else {
              // If it's not a sponsorship error, throw it
              throw sponsoredError;
            }
          }
        } else {
          await evmWallet?.switchChain(CHAIN_ID[selectedToken.chain]);
          const result = await TransactionService.handleEVMSend(
            evmWallet,
            tipFlow,
            selectedToken.chain
          );
          hash = result.hash;
        }

        return { success: true, hash };
      } catch (error) {
        console.error("Tip transaction error:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : ERROR_MESSAGES.UNKNOWN_ERROR,
        };
      }
    },
    [
      selectedToken,
      tipAmount,
      feedItem,
      directSolanaWallets,
      ethWallets,
      PrivyUser,
      generateAuthorizationSignature,
      toast,
    ]
  );

  //handle confirm tip
  const handleConfirmTip = async () => {
    if (!isValidAmount() || !selectedToken) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please enter a valid tip amount.",
      });
      return;
    }

    setIsSending(true);

    try {
      // Get recipient wallet address
      const ensData = await getEnsDataUsingEns(feedItem.smartsiteId?.ens);
      const recipientWalletAddress =
        ensData?.addresses?.[
          selectedToken.chain?.toUpperCase() === "SOLANA" ? 501 : 60
        ];

      if (!recipientWalletAddress) {
        toast({
          variant: "destructive",
          title: "Recipient Not Found",
          description: "Unable to find wallet address for this user.",
        });
        return;
      }

      // Execute transaction
      const result = await executeTipTransaction(recipientWalletAddress);

      if (!result.success) {
        // ✅ Custom error messages based on error type
        let errorTitle = "Transaction Failed";
        let errorDescription = result.error || "Failed to send tip";

        if (result.error?.includes("insufficient lamports")) {
          errorTitle = "Insufficient SOL";
          errorDescription =
            "You need at least 0.003 SOL in your wallet for transaction fees. Please add SOL and try again.";
        } else if (result.error?.includes("insufficient funds")) {
          errorTitle = "Insufficient Balance";
          errorDescription = `You don't have enough ${selectedToken.symbol} to complete this transaction.`;
        } else if (result.error?.includes("wallet")) {
          errorTitle = "Wallet Error";
          errorDescription =
            "Please check your wallet connection and try again.";
        } else if (result.error?.includes("network")) {
          errorTitle = "Network Error";
          errorDescription =
            "Unable to connect to the blockchain. Please check your internet connection.";
        } else if (
          result.error?.includes("rejected") ||
          result.error?.includes("denied")
        ) {
          errorTitle = "Transaction Cancelled";
          errorDescription = "You cancelled the transaction.";
        } else if (result.error?.includes("timeout")) {
          errorTitle = "Transaction Timeout";
          errorDescription = "The transaction took too long. Please try again.";
        }

        toast({
          variant: "destructive",
          title: errorTitle,
          description: errorDescription,
        });
        return;
      }

      if (result.hash && accessToken) {
        const tipPayload = createTransactionPayload({
          basePayload: payload,
          sendFlow: {
            token: selectedToken,
            amount: tipAmount,
            recipient: {
              address: recipientWalletAddress,
              ensName: feedItem.smartsiteId.name || "",
              isEns: true,
            },
            network: selectedToken.chain,
            hash: result.hash,
            isUSD: false,
            step: "success",
            nft: null,
          },
          hash: result.hash,
          amount: Number(tipAmount),
          walletAddress: evmWalletAddress || solWalletAddress || "",
        });

        const response = await postFeed(tipPayload, accessToken);
        console.log("respnse", response);
      }

      // Emit socket notification (existing code)
      if (chatSocket && chatSocket.connected && result.hash) {
        try {
          const notificationService = getWalletNotificationService(chatSocket);
          const usdValue = selectedToken.marketData?.price
            ? formatUSDValue(tipAmount, selectedToken.marketData.price)
            : undefined;

          const tokenData = {
            tokenSymbol: selectedToken.symbol,
            tokenName: selectedToken.name,
            amount: tipAmount,
            recipientAddress: recipientWalletAddress,
            recipientEnsName:
              feedItem.smartsiteId.name || recipientWalletAddress,
            txSignature: result.hash,
            network: selectedToken.chain?.toUpperCase() || "SOLANA",
            tokenLogo: convertToAbsoluteUrl(selectedToken.logoURI),
            usdValue,
          };

          notificationService.emitTokenSent(tokenData);
          console.log("✅ Tip notification sent via Socket.IO");
        } catch (notifError) {
          console.error("Failed to send tip notification:", notifError);
        }
      }

      // Cleanup and success message
      setIsConfirmModalOpen(false);
      setTipAmount("");
      if (onCloseModal) onCloseModal(false);
      if (onClose) onClose();

      toast({
        title: "Success! 💝",
        description: `Tip of ${tipAmount} ${selectedToken.symbol} sent successfully!`,
      });
    } catch (error: any) {
      console.error("Error sending tip:", error);

      // ✅ Final catch-all with custom messages
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error.message) {
        if (error.message.includes("User rejected")) {
          errorMessage = "You cancelled the transaction.";
        } else if (error.message.includes("network")) {
          errorMessage = "Network error. Please check your connection.";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsSending(false);
    }
  };
  // const handleConfirmTip = async () => {
  //   if (!isValidAmount() || !selectedToken) {
  //     toast({
  //       variant: "destructive",
  //       title: "Error",
  //       description: "Invalid tip amount or recipient address",
  //     });
  //     return;
  //   }

  //   setIsSending(true);

  //   try {
  //     // 🔹 1. Get recipient wallet address using ENS
  //     const ensData = await getEnsDataUsingEns(feedItem.smartsiteId?.ens);
  //     console.log("ens dta", ensData);

  //     const recipientWalletAddress =
  //       ensData?.addresses?.[
  //         selectedToken.chain?.toUpperCase() === "SOLANA" ? 501 : 60
  //       ];
  //     // ← correct source

  //     if (!recipientWalletAddress) {
  //       throw new Error("Recipient wallet address not found via ENS.");
  //     }

  //     // 🔹 2. Execute transaction
  //     const result = await executeTipTransaction(recipientWalletAddress);

  //     if (!result.success) {
  //       throw new Error(result.error || "Tip transaction failed");
  //     }

  //     // 🔹 3. Post to feed
  //     const payload = {
  //       userId: user?._id,
  //       userName: user?.name,
  //       userProfilePic: user?.profilePic,
  //       smartsiteId: user?.primaryMicrosite,
  //     };

  //     if (result.hash && accessToken) {
  //       const tipPayload = createTransactionPayload({
  //         basePayload: payload,
  //         sendFlow: {
  //           token: selectedToken,
  //           amount: tipAmount,
  //           recipient: {
  //             address: recipientWalletAddress,
  //             ensName: feedItem.smartsiteId.name || "",
  //             isEns: true,
  //           },
  //           network: selectedToken.chain,
  //           hash: result.hash,
  //           isUSD: false,
  //           step: "success",
  //           nft: null,
  //         },
  //         hash: result.hash,
  //         amount: Number(tipAmount),
  //         walletAddress: evmWalletAddress || solWalletAddress || "",
  //       });

  //       const postFeedResponse = await postFeed(tipPayload, accessToken);
  //       console.log("postFeedResponse", postFeedResponse);
  //     }

  //     // 🔹 4. Emit socket notification
  //     if (chatSocket && chatSocket.connected && result.hash) {
  //       try {
  //         const notificationService = getWalletNotificationService(chatSocket);
  //         const usdValue = selectedToken.marketData?.price
  //           ? formatUSDValue(tipAmount, selectedToken.marketData.price)
  //           : undefined;

  //         const tokenData = {
  //           tokenSymbol: selectedToken.symbol,
  //           tokenName: selectedToken.name,
  //           amount: tipAmount,
  //           recipientAddress: recipientWalletAddress,
  //           recipientEnsName:
  //             feedItem.smartsiteId.name || recipientWalletAddress,
  //           txSignature: result.hash,
  //           network: selectedToken.chain?.toUpperCase() || "SOLANA",
  //           tokenLogo: convertToAbsoluteUrl(selectedToken.logoURI),
  //           usdValue,
  //         };

  //         notificationService.emitTokenSent(tokenData);
  //         console.log("✅ Tip notification sent via Socket.IO");
  //       } catch (notifError) {
  //         console.error("Failed to send tip notification:", notifError);
  //       }
  //     }

  //     // 🔹 5. Cleanup
  //     setIsConfirmModalOpen(false);
  //     setTipAmount("");
  //     if (onCloseModal) onCloseModal(false);
  //     if (onClose) onClose();

  //     toast({
  //       title: "Success! 💝",
  //       description: `Tip of ${tipAmount} ${selectedToken.symbol} sent successfully!`,
  //     });
  //   } catch (error) {
  //     console.error("Error sending tip:", error);
  //     toast({
  //       variant: "destructive",
  //       title: "Error",
  //       description:
  //         error instanceof Error ? error.message : "Failed to send tip",
  //     });
  //   } finally {
  //     setIsSending(false);
  //   }
  // };

  if (tokenLoading) {
    return (
      <CustomModal
        isOpen={isOpen}
        onClose={onClose}
        onCloseModal={onCloseModal}
      >
        <div className="flex flex-col items-center justify-center py-28 space-y-4">
          <div className="animate-spin w-8 h-8 rounded-full border-2 border-gray-300 border-t-primary"></div>
          <p className="text-gray-600 text-sm font-medium tracking-wide">
            Loading tokens...
          </p>
        </div>
      </CustomModal>
    );
  }

  if (tokenError) {
    return (
      <CustomModal
        isOpen={isOpen}
        onClose={onClose}
        onCloseModal={onCloseModal}
      >
        <div className="flex justify-center items-center py-10">
          <p className="text-red-500">Failed to load tokens</p>
        </div>
      </CustomModal>
    );
  }

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onClose={onClose}
        onCloseModal={onCloseModal}
      >
        <div className="px-6 pb-8 pt-4">
          {/* User profile */}
          <div className="flex flex-col items-center space-y-4">
            <Image
              src={
                isUrl(feedItem.smartsiteId.profilePic)
                  ? feedItem.smartsiteId.profilePic
                  : `/images/user_avator/${feedItem.smartsiteId.profilePic}@3x.png`
              }
              alt="Profile_Img"
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover"
            />

            {/* Amount Input */}
            <div className="w-full max-w-xs">
              <div className="relative">
                <input
                  type="text"
                  value={tipAmount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="w-full text-4xl font-semibold text-center bg-transparent border-none outline-none focus:ring-0"
                />
              </div>
              <p className="text-center text-sm text-gray-500 mt-1">
                ${getTipAmountInUSD()} USD
              </p>
            </div>
          </div>

          {/* Token card */}
          {selectedToken && (
            <div className="mt-6 border-y py-3">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-100 p-2 rounded-full">
                    {isUrl(selectedToken?.marketData?.iconUrl) ? (
                      <Image
                        src={
                          selectedToken?.marketData?.iconUrl ||
                          selectedToken.logoURI ||
                          "/icons/default.png"
                        }
                        alt={selectedToken.name}
                        width={120}
                        height={120}
                        className="rounded-full w-9 h-9"
                      />
                    ) : (
                      <Image
                        src={selectedToken.logoURI || "/icons/default.png"}
                        alt={selectedToken.name}
                        width={120}
                        height={120}
                        className="rounded-full w-9 h-9"
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedToken.name}</p>
                    <p className="text-sm text-gray-500">
                      Balance:{" "}
                      {Number(
                        toFixedTruncate(
                          selectedToken.balance,
                          selectedToken.decimals || 6
                        )
                      )}{" "}
                      {selectedToken.symbol}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMaxClick}
                    className="px-3 py-1.5 border border-blue-500 text-blue-500 rounded-full text-sm font-medium hover:bg-blue-50"
                  >
                    Max
                  </button>
                  <button
                    onClick={() => setIsSelectModalOpen(true)}
                    className="px-4 py-1.5 border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50"
                  >
                    Select
                  </button>
                </div>
              </div>

              {/* Error message */}
              {tipAmount && !isValidAmount() && (
                <p className="text-red-500 text-sm mt-2">
                  {parseFloat(tipAmount) > parseFloat(selectedToken.balance)
                    ? "Insufficient balance"
                    : "Please enter a valid amount"}
                </p>
              )}
            </div>
          )}

          {/* Tip Button */}
          <div className="mt-6 flex justify-center">
            <PrimaryButton
              className={`w-full sm:w-[90%] py-2 rounded-2xl`}
              disabled={!isValidAmount()}
              onClick={handleTipClick}
            >
              Tip
            </PrimaryButton>
          </div>
        </div>
      </CustomModal>

      {/* Nested token selector modal */}
      <SelectTokenModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        onSelect={(token) => setSelectedToken(token)}
        tokens={tokens}
        selectedToken={selectedToken}
      />

      {/* Tip Confirmation Modal */}
      {selectedToken && (
        <TipConfirmation
          open={isConfirmModalOpen}
          onOpenChange={setIsConfirmModalOpen}
          amount={tipAmount}
          token={selectedToken}
          recipient={feedItem.smartsiteId?.ens || ""}
          recipientName={feedItem.smartsiteId?.name || "Unknown"}
          recipientImage={
            isUrl(feedItem.smartsiteId?.profilePic)
              ? feedItem.smartsiteId.profilePic
              : `/images/user_avator/${feedItem.smartsiteId?.profilePic}@3x.png`
          }
          onConfirm={handleConfirmTip}
          loading={isSending}
        />
      )}
    </>
  );
};

export default TipContentModal;
