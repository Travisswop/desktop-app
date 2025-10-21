// "use client";
// import Image from "next/image";
// import CustomModal from "../modal/CustomModal";
// import isUrl from "@/lib/isUrl";
// import { Button } from "@/components/ui/button";
// import { useState, useEffect } from "react";
// import SelectTokenModal from "./SelectTokenModal";
// import {
//   useWalletAddresses,
//   useWalletData,
// } from "../wallet/hooks/useWalletData";
// import { usePrivy } from "@privy-io/react-auth";
// import { SUPPORTED_CHAINS } from "../wallet/constants";
// import { useMultiChainTokenData } from "@/lib/hooks/useToken";

// interface TipContentModalProps {
//   isOpen: boolean;
//   onClose?: () => void;
//   onCloseModal?: React.Dispatch<React.SetStateAction<boolean>>;
//   feedItem: any;
// }

// const TipContentModal: React.FC<TipContentModalProps> = ({
//   isOpen,
//   onClose,
//   onCloseModal,
//   feedItem,
// }) => {
//   const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
//   const [tipAmount, setTipAmount] = useState<string>("");
//   const { authenticated, ready, user: PrivyUser } = usePrivy();

//   const walletData = useWalletData(authenticated, ready, PrivyUser);
//   const { solWalletAddress, evmWalletAddress } = useWalletAddresses(walletData);

//   // fetch token data
//   const {
//     tokens,
//     loading: tokenLoading,
//     error: tokenError,
//   } = useMultiChainTokenData(
//     solWalletAddress,
//     evmWalletAddress,
//     SUPPORTED_CHAINS
//   );

//   const [selectedToken, setSelectedToken] = useState<any>(null);

//   // 🪄 set first token as default when tokens load
//   useEffect(() => {
//     if (tokens && tokens.length > 0 && !selectedToken) {
//       setSelectedToken(tokens[0]);
//     }
//   }, [tokens, selectedToken]);

//   // Reset tip amount when token changes
//   useEffect(() => {
//     setTipAmount("");
//   }, [selectedToken]);

//   const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     // Allow only numbers and decimal point
//     if (value === "" || /^\d*\.?\d*$/.test(value)) {
//       setTipAmount(value);
//     }
//   };

//   const handleMaxClick = () => {
//     if (selectedToken) {
//       setTipAmount(selectedToken.balance);
//     }
//   };

//   const getTipAmountInUSD = () => {
//     if (!tipAmount || !selectedToken?.marketData?.price) return 0;
//     const amount = parseFloat(tipAmount) || 0;
//     const price = parseFloat(selectedToken.marketData.price) || 0;
//     return (amount * price).toFixed(2);
//   };

//   const isValidAmount = () => {
//     if (!tipAmount || !selectedToken) return false;
//     const amount = parseFloat(tipAmount);
//     const balance = parseFloat(selectedToken.balance);
//     return amount > 0 && amount <= balance;
//   };

//   const handleTip = () => {
//     if (!isValidAmount()) return;
//     // Implement your tip logic here
//     console.log("Tipping:", tipAmount, selectedToken.symbol);
//   };

//   if (tokenLoading) {
//     return (
//       <CustomModal
//         isOpen={isOpen}
//         onClose={onClose}
//         onCloseModal={onCloseModal}
//       >
//         <div className="flex justify-center items-center py-10">
//           <p className="text-gray-500">Loading tokens...</p>
//         </div>
//       </CustomModal>
//     );
//   }

//   if (tokenError) {
//     return (
//       <CustomModal
//         isOpen={isOpen}
//         onClose={onClose}
//         onCloseModal={onCloseModal}
//       >
//         <div className="flex justify-center items-center py-10">
//           <p className="text-red-500">Failed to load tokens</p>
//         </div>
//       </CustomModal>
//     );
//   }

//   return (
//     <div>
//       <CustomModal
//         isOpen={isOpen}
//         onClose={onClose}
//         onCloseModal={onCloseModal}
//       >
//         <div className="px-6 pb-8 pt-4">
//           {/* User profile */}
//           <div className="flex flex-col items-center space-y-4">
//             <Image
//               src={
//                 isUrl(feedItem.smartsiteId.profilePic)
//                   ? feedItem.smartsiteId.profilePic
//                   : `/images/user_avator/${feedItem.smartsiteId.profilePic}@3x.png`
//               }
//               alt="Profile_Img"
//               width={64}
//               height={64}
//               className="w-16 h-16 rounded-full object-cover"
//             />

//             {/* Amount Input */}
//             <div className="w-full max-w-xs">
//               <div className="relative">
//                 {/* <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-semibold text-gray-400">
//                   $
//                 </span> */}
//                 <input
//                   type="text"
//                   value={tipAmount}
//                   onChange={handleAmountChange}
//                   placeholder="0"
//                   className="w-full text-4xl font-semibold text-center bg-transparent border-none outline-none focus:ring-0"
//                 />
//               </div>
//               <p className="text-center text-sm text-gray-500 mt-1">
//                 ${getTipAmountInUSD()} USD
//               </p>
//             </div>
//           </div>

//           {/* Token card */}
//           {selectedToken && (
//             <div className="mt-6 border-y py-3">
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center space-x-3">
//                   <div className="bg-gray-100 p-2 rounded-full">
//                     <Image
//                       src={
//                         selectedToken.logoURI ||
//                         selectedToken.marketData?.iconUrl ||
//                         "/icons/default.png"
//                       }
//                       alt={selectedToken.name}
//                       width={28}
//                       height={28}
//                       className="rounded-full"
//                     />
//                   </div>
//                   <div>
//                     <p className="font-semibold">{selectedToken.name}</p>
//                     <p className="text-sm text-gray-500">
//                       Balance: {Number(selectedToken.balance).toFixed(4)}{" "}
//                       {selectedToken.symbol}
//                     </p>
//                   </div>
//                 </div>

//                 <div className="flex items-center gap-2">
//                   <button
//                     onClick={handleMaxClick}
//                     className="px-3 py-1.5 border border-blue-500 text-blue-500 rounded-full text-sm font-medium hover:bg-blue-50"
//                   >
//                     Max
//                   </button>
//                   <button
//                     onClick={() => setIsSelectModalOpen(true)}
//                     className="px-4 py-1.5 border border-gray-300 rounded-full text-sm font-medium hover:bg-gray-50"
//                   >
//                     Select
//                   </button>
//                 </div>
//               </div>

//               {/* Error message */}
//               {tipAmount && !isValidAmount() && (
//                 <p className="text-red-500 text-sm mt-2">
//                   {parseFloat(tipAmount) > parseFloat(selectedToken.balance)
//                     ? "Insufficient balance"
//                     : "Please enter a valid amount"}
//                 </p>
//               )}
//             </div>
//           )}

//           {/* Tip Button */}
//           <div className="mt-6">
//             <Button
//               className={`w-full py-6 text-lg font-medium rounded-2xl ${
//                 isValidAmount()
//                   ? "bg-blue-600 hover:bg-blue-700 text-white"
//                   : "bg-gray-200 text-gray-500"
//               }`}
//               disabled={!isValidAmount()}
//               onClick={handleTip}
//             >
//               Tip{" "}
//               {tipAmount && isValidAmount()
//                 ? `${tipAmount} ${selectedToken.symbol}`
//                 : ""}
//             </Button>
//           </div>
//         </div>
//       </CustomModal>

//       {/* Nested token selector modal */}
//       <SelectTokenModal
//         isOpen={isSelectModalOpen}
//         onClose={() => setIsSelectModalOpen(false)}
//         onSelect={(token) => setSelectedToken(token)}
//         tokens={tokens}
//         selectedToken={selectedToken}
//       />
//     </div>
//   );
// };

// export default TipContentModal;

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
      setTipAmount(selectedToken.balance);
    }
  };

  const getTipAmountInUSD = () => {
    if (!tipAmount || !selectedToken?.marketData?.price) return 0;
    const amount = parseFloat(tipAmount) || 0;
    const price = parseFloat(selectedToken.marketData.price) || 0;
    return (amount * price).toFixed(2);
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

        if (selectedToken?.chain === "SOLANA" && !solanaWallet) {
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
            address: recipientWalletAddress, // ✅ updated
            ensName: feedItem.smartsiteId?.name || "",
            isEns: true,
          },
          network: selectedToken.chain,
          hash: "",
          isUSD: false,
          nft: null,
        };

        if (selectedToken.chain === "SOLANA") {
          const result = await TransactionService.handleSolanaSend(
            solanaWallet,
            tipFlow,
            connection,
            PrivyUser,
            generateAuthorizationSignature
          );

          hash = result;
          if (hash) await connection.confirmTransaction(hash);
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
    ]
  );

  //handle confirm tip
  const handleConfirmTip = async () => {
    if (!isValidAmount() || !selectedToken) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid tip amount or recipient address",
      });
      return;
    }

    setIsSending(true);

    try {
      // 🔹 1. Get recipient wallet address using ENS
      const ensData = await getEnsDataUsingEns(feedItem.smartsiteId?.ens);
      const recipientWalletAddress = ensData?.addresses?.[501]; // ← correct source

      if (!recipientWalletAddress) {
        throw new Error("Recipient wallet address not found via ENS.");
      }

      // 🔹 2. Execute transaction
      const result = await executeTipTransaction(recipientWalletAddress);

      if (!result.success) {
        throw new Error(result.error || "Tip transaction failed");
      }

      // 🔹 3. Post to feed
      const payload = {
        userId: user?._id,
        userName: user?.name,
        userProfilePic: user?.profilePic,
        smartsiteId: user?.primaryMicrosite,
      };

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

        await postFeed(tipPayload, accessToken);
      }

      // 🔹 4. Emit socket notification
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

      // 🔹 5. Cleanup
      setIsConfirmModalOpen(false);
      setTipAmount("");
      if (onCloseModal) onCloseModal(false);
      if (onClose) onClose();

      toast({
        title: "Success! 💝",
        description: `Tip of ${tipAmount} ${selectedToken.symbol} sent successfully!`,
      });
    } catch (error) {
      console.error("Error sending tip:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send tip",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (tokenLoading) {
    return (
      <CustomModal
        isOpen={isOpen}
        onClose={onClose}
        onCloseModal={onCloseModal}
      >
        <div className="flex justify-center items-center py-10">
          <p className="text-gray-500">Loading tokens...</p>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-100 p-2 rounded-full">
                    <Image
                      src={
                        selectedToken.logoURI ||
                        selectedToken.marketData?.iconUrl ||
                        "/icons/default.png"
                      }
                      alt={selectedToken.name}
                      width={28}
                      height={28}
                      className="rounded-full"
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedToken.name}</p>
                    <p className="text-sm text-gray-500">
                      Balance: {Number(selectedToken.balance).toFixed(4)}{" "}
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
            <Button
              className={`w-[90%] py-6 text-lg font-medium rounded-2xl ${
                isValidAmount()
                  ? "bg-black hover:bg-gray-700 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
              disabled={!isValidAmount()}
              onClick={handleTipClick}
            >
              Tip{" "}
              {tipAmount && isValidAmount()
                ? `${tipAmount} ${selectedToken.symbol}`
                : ""}
            </Button>
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
