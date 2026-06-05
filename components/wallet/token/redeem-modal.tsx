// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { useEffect, useState } from "react";
// import { Info, CheckCircle, XCircle } from "lucide-react";
// import Image from "next/image";
// import { toast } from "@/hooks/use-toast";
// import { cn } from "@/lib/utils";
// import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
// import CustomModal from "@/components/modal/CustomModal";

// // Rent-exempt minimum for a token account (in SOL)
// // This is approximately 0.00203928 SOL (2,039,280 lamports)
// const TOKEN_ACCOUNT_RENT_EXEMPT = 0.00203928;
// // Additional buffer for transaction fees
// const TRANSACTION_FEE_BUFFER = 0.001;

// interface RedeemModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onConfirm: (
//     config: RedeemConfig,
//     updateStep: (
//       index: number,
//       status: ProcessingStep["status"],
//       message?: string
//     ) => void,
//     setRedeemLink: (link: string) => void
//   ) => void;
//   tokenSymbol: string;
//   tokenDecimals: number;
//   tokenBalance: string;
//   tokenLogo: string;
//   tokenAmount: number;
//   isUSD: boolean;
//   tokenPrice: string;
//   solBalance?: number; // User's SOL balance for rent calculation
// }

// export interface RedeemConfig {
//   totalAmount: number;
//   maxWallets: number;
//   tokensPerWallet: number;
// }

// type ProcessingStep = {
//   status: "pending" | "processing" | "completed" | "error";
//   message: string;
// };

// const formatNumber = (value: string) => {
//   return value.replace(/[^0-9.]/g, "");
// };

// export default function RedeemModal({
//   isOpen,
//   onClose,
//   onConfirm,
//   tokenSymbol,
//   tokenLogo,
//   tokenAmount,
//   isUSD,
//   tokenPrice,
//   solBalance = 0,
// }: RedeemModalProps) {
//   const [totalToken, setTotalToken] = useState(0);
//   const [maxWallets, setMaxWallets] = useState("");
//   const [errorMessage, setErrorMessage] = useState("");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [redeemLink, setRedeemLink] = useState("");
//   const [tokensPerWallet, setTokensPerWallet] = useState(0);
//   const [requiredSol, setRequiredSol] = useState(0);
//   const [steps, setSteps] = useState<ProcessingStep[]>([
//     {
//       status: "pending",
//       message: "Setting up your redemption link",
//     },
//     {
//       status: "pending",
//       message: "Preparing secure wallet for token storage",
//     },
//     {
//       status: "pending",
//       message: "Transferring tokens to secure storage",
//     },
//   ]);

//   useEffect(() => {
//     if (isUSD) {
//       const token = tokenAmount / parseFloat(tokenPrice);
//       setTotalToken(token);
//     } else {
//       setTotalToken(tokenAmount);
//     }
//   }, [isUSD, tokenAmount, tokenPrice]);

//   const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = formatNumber(e.target.value);
//     const numValue = parseInt(value, 10);

//     // Ensure numValue is a valid integer and greater than 0
//     if (numValue > 0) {
//       const perWallet = totalToken / numValue;
//       setTokensPerWallet(perWallet);
//       // Calculate required SOL: rent for temp token account + transaction fees
//       // We need 1 token account for the temp wallet + buffer for fees
//       const required = TOKEN_ACCOUNT_RENT_EXEMPT + TRANSACTION_FEE_BUFFER;
//       setRequiredSol(required);
//     } else {
//       setTokensPerWallet(0);
//       setRequiredSol(0);
//     }
//     setMaxWallets(numValue.toString());
//   };

//   // Check if user has sufficient SOL balance
//   const hasInsufficientSol = requiredSol > 0 && solBalance < requiredSol;

//   const updateStep = (
//     index: number,
//     status: ProcessingStep["status"],
//     message?: string
//   ) => {
//     setSteps((current) =>
//       current.map((step, i) =>
//         i === index
//           ? { ...step, status, message: message || step.message }
//           : step
//       )
//     );
//   };

//   const handleConfirm = async () => {
//     setIsProcessing(true);
//     setErrorMessage("");

//     try {
//       // Update first step to processing
//       updateStep(0, "processing");

//       const res = await onConfirm(
//         {
//           totalAmount: totalToken,
//           maxWallets: parseInt(maxWallets),
//           tokensPerWallet: tokensPerWallet,
//         },
//         updateStep,
//         setRedeemLink
//       );
//     } catch (error: any) {
//       console.error(error);

//       let errorStepIndex = steps.findIndex(
//         (step) => step.status === "processing"
//       );
//       if (errorStepIndex === -1) errorStepIndex = 0;

//       const errorMsg = error.message || "Failed to complete redeem process";
//       setErrorMessage(errorMsg);

//       // Update the specific step that failed
//       updateStep(errorStepIndex, "error", errorMsg);

//       setSteps((current) =>
//         current.map((step, index) => {
//           if (index > errorStepIndex && step.status === "processing") {
//             return { ...step, status: "pending" };
//           }
//           return step;
//         })
//       );
//     }
//   };

//   const handleClose = () => {
//     // Clear all states
//     setMaxWallets("");
//     setErrorMessage("");
//     setIsProcessing(false);
//     setRedeemLink("");
//     setSteps([
//       {
//         status: "pending",
//         message: "Setting up your redemption link",
//       },
//       {
//         status: "pending",
//         message: "Preparing secure wallet for token storage",
//       },
//       {
//         status: "pending",
//         message: "Transferring tokens to secure storage",
//       },
//     ]);

//     // Call the parent's onClose
//     onClose();
//   };

//   return (
//     <CustomModal
//       isOpen={isOpen}
//       onCloseModal={isProcessing ? undefined : onClose}
//     >
//       <div className="p-5">
//         {!isProcessing ? (
//           <>
//             <div className="flex items-center gap-2 mb-4 font-semibold">
//               <Image
//                 src={tokenLogo}
//                 alt={tokenSymbol}
//                 width={120}
//                 height={120}
//                 className="rounded-full border w-8 h-8"
//               />
//               Create Redemption Link
//             </div>

//             <div className="space-y-3">
//               {/* Current Balance Display */}
//               <div className="bg-gray-100 p-4 rounded-lg">
//                 <div className="text-sm text-gray-600">Amount to Redeem</div>
//                 <div className="text-xl font-semibold mt-1">
//                   {totalToken.toFixed(4)} {tokenSymbol}
//                 </div>
//               </div>

//               {/* Amount Input */}
//               {/* <div className="space-y-2">
//                 <Label className="text-sm font-medium">
//                   Amount to Redeem
//                 </Label>
//                 <div className="relative">
//                   <Input
//                     type="number"
//                     placeholder="0.0"
//                     value={totalAmount}
//                     onChange={handleAmountChange}
//                     className="pr-28"
//                     min="0"
//                     max={userBalance}
//                     step="any"
//                   />
//                   <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
//                     <button
//                       onClick={handleMaxClick}
//                       className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600"
//                     >
//                       MAX
//                     </button>
//                     <span className="text-sm text-gray-500">
//                       {tokenSymbol}
//                     </span>
//                   </div>
//                 </div>
//                 <div className="text-xs text-gray-500">
//                   Max: {userBalance.toFixed(4)} {tokenSymbol}
//                 </div>
//               </div> */}

//               {/* Number of Wallets Input */}
//               <div className="space-y-2">
//                 <Label className="text-sm font-medium">
//                   Total wallets to claim {totalToken.toFixed(4)} {tokenSymbol}
//                 </Label>
//                 <Input
//                   type="number"
//                   placeholder="Enter number of wallets"
//                   value={maxWallets}
//                   onChange={handleAmountChange}
//                   min="1"
//                   step="1"
//                 />
//               </div>

//               {/* Per Wallet Calculation */}
//               <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-2">
//                 <Info className="w-4 h-4 text-blue-500 mt-0.5" />
//                 <div>
//                   <div className="text-sm font-medium">
//                     Claim limit Per Wallet
//                   </div>
//                   <div className="text-sm text-gray-600 mt-1">
//                     Each wallet can claim {tokensPerWallet.toFixed(4)}{" "}
//                     {tokenSymbol}
//                   </div>
//                 </div>
//               </div>

//               {/* SOL Balance Warning */}
//               {requiredSol > 0 && (
//                 <div
//                   className={cn(
//                     "p-4 rounded-lg flex items-start gap-2",
//                     hasInsufficientSol ? "bg-red-50" : "bg-green-50"
//                   )}
//                 >
//                   <Info
//                     className={cn(
//                       "w-4 h-4 mt-0.5",
//                       hasInsufficientSol ? "text-red-500" : "text-green-500"
//                     )}
//                   />
//                   <div className="flex-1">
//                     <div
//                       className={cn(
//                         "text-sm font-medium",
//                         hasInsufficientSol ? "text-red-700" : "text-green-700"
//                       )}
//                     >
//                       SOL Required for Transaction
//                     </div>
//                     <div className="text-sm text-gray-600 mt-1 space-y-1">
//                       <div className="flex justify-between">
//                         <span>Required:</span>
//                         <span className="font-medium">
//                           {requiredSol.toFixed(6)} SOL
//                         </span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span>Your Balance:</span>
//                         <span
//                           className={cn(
//                             "font-medium",
//                             hasInsufficientSol ? "text-red-600" : "text-green-600"
//                           )}
//                         >
//                           {solBalance.toFixed(6)} SOL
//                         </span>
//                       </div>
//                     </div>
//                     {hasInsufficientSol && (
//                       <div className="text-xs text-red-600 mt-2 font-medium">
//                         Please add at least{" "}
//                         {(requiredSol - solBalance).toFixed(6)} SOL to your
//                         wallet to continue.
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {errorMessage && (
//                 <div className="text-red-500 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg">
//                   <Info className="w-4 h-4" />
//                   {errorMessage}
//                 </div>
//               )}
//             </div>

//             <div className="flex justify-end gap-3 mt-4">
//               <PrimaryButton
//                 onClick={handleConfirm}
//                 disabled={!maxWallets || tokensPerWallet <= 0}
//                 className="w-full py-2"
//               >
//                 Create Link
//               </PrimaryButton>
//             </div>
//           </>
//         ) : (
//           <div className="space-y-6 py-4">
//             {!redeemLink && (
//               <div className="relative space-y-3">
//                 {steps.map((step, index) => (
//                   <div key={index} className="flex items-start gap-4">
//                     {/* Step indicator and line */}
//                     <div className="relative flex flex-col items-center">
//                       <div
//                         className={cn(
//                           "w-8 h-8 rounded-full border-2 flex items-center justify-center",
//                           step.status === "completed"
//                             ? "border-green-500 bg-green-500"
//                             : step.status === "processing"
//                             ? "border-blue-500 bg-blue-500"
//                             : "border-gray-200 bg-white"
//                         )}
//                       >
//                         {step.status === "completed" ? (
//                           <CheckCircle className="w-4 h-4 text-white" />
//                         ) : step.status === "processing" ? (
//                           <div className="w-4 h-4">
//                             <svg
//                               className="animate-spin text-white"
//                               viewBox="0 0 24 24"
//                             >
//                               <circle
//                                 className="opacity-25"
//                                 cx="12"
//                                 cy="12"
//                                 r="10"
//                                 stroke="currentColor"
//                                 strokeWidth="4"
//                                 fill="none"
//                               />
//                               <path
//                                 className="opacity-75"
//                                 fill="currentColor"
//                                 d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
//                               />
//                             </svg>
//                           </div>
//                         ) : (
//                           <div className="w-2 h-2 rounded-full bg-gray-200" />
//                         )}
//                       </div>
//                       {/* Connecting line */}
//                       {index < steps.length - 1 && (
//                         <div
//                           className={cn(
//                             "w-0.5 h-12 -mb-2",
//                             step.status === "completed"
//                               ? "bg-green-500"
//                               : step.status === "processing"
//                               ? "bg-blue-500"
//                               : "bg-gray-200"
//                           )}
//                         />
//                       )}
//                     </div>

//                     {/* Step content */}
//                     <div className="flex-1 pt-1.5 pb-8">
//                       <span
//                         className={cn(
//                           "text-sm font-medium",
//                           step.status === "completed"
//                             ? "text-green-600"
//                             : step.status === "processing"
//                             ? "text-blue-600"
//                             : "text-gray-500"
//                         )}
//                       >
//                         {step.message}
//                       </span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}

//             {redeemLink && (
//               <div className="mt-4 space-y-6">
//                 <div className="flex justify-center">
//                   <div className="w-20 h-20 relative">
//                     <div className="absolute inset-0 flex items-center justify-center">
//                       <CheckCircle className="w-20 h-20 text-green-500 animate-success" />
//                     </div>
//                   </div>
//                 </div>

//                 <div className="bg-green-50 p-6 rounded-lg space-y-4">
//                   <div className="text-center">
//                     <h3 className="text-lg font-semibold text-green-800">
//                       Redemption Link Created Successfully!
//                     </h3>
//                     <p className="text-sm text-green-600 mt-1">
//                       Your tokens are now securely stored and ready to be
//                       claimed
//                     </p>
//                   </div>

//                   <div className="space-y-2">
//                     <label className="text-sm font-medium text-green-800">
//                       Share this link with recipients:
//                     </label>
//                     <div className="flex items-center gap-2">
//                       <Input
//                         readOnly
//                         value={redeemLink}
//                         className="bg-white border-green-200 focus-visible:ring-green-500"
//                       />
//                       <Button
//                         size="sm"
//                         variant="outline"
//                         onClick={() => {
//                           navigator.clipboard.writeText(redeemLink);
//                           toast({
//                             title: "Link copied!",
//                             description:
//                               "The redemption link has been copied to your clipboard",
//                           });
//                         }}
//                         className="whitespace-nowrap border-green-200 hover:bg-green-100"
//                       >
//                         Copy Link
//                       </Button>
//                     </div>
//                   </div>
//                 </div>

//                 <Button
//                   onClick={handleClose}
//                   className="w-full bg-green-500 hover:bg-green-600 text-white"
//                 >
//                   Done
//                 </Button>
//               </div>
//             )}

//             {errorMessage && !redeemLink && (
//               <div className="mt-6 bg-red-50 p-4 rounded-lg space-y-4">
//                 <div className="flex items-center gap-2 text-red-800">
//                   <XCircle className="w-5 h-5" />
//                   <h3 className="font-semibold">
//                     Error Creating Redemption Link
//                   </h3>
//                 </div>
//                 <p className="text-sm text-red-600">{errorMessage}</p>

//                 {/* Troubleshooting suggestions based on error type */}
//                 {errorMessage.includes("insufficient funds for rent") && (
//                   <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
//                     <p className="text-xs text-yellow-800 font-medium">
//                       Troubleshooting Suggestion:
//                     </p>
//                     <p className="text-xs text-yellow-700 mt-1">
//                       Add more SOL to your wallet to cover the rent for token
//                       accounts.
//                     </p>
//                   </div>
//                 )}
//                 {errorMessage.includes("SPL Token 2022") && (
//                   <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
//                     <p className="text-xs text-yellow-800 font-medium">
//                       Troubleshooting Suggestion:
//                     </p>
//                     <p className="text-xs text-yellow-700 mt-1">
//                       This token requires additional SOL to create a compatible
//                       token account. Please ensure you have sufficient SOL
//                       balance.
//                     </p>
//                   </div>
//                 )}

//                 <Button
//                   onClick={handleClose}
//                   variant="destructive"
//                   className="w-full"
//                 >
//                   Close
//                 </Button>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </CustomModal>
//   );
// }

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  Search,
  ArrowLeft,
  Loader2,
  Copy,
  Link2,
  Users,
} from "lucide-react";
import Image from "next/image";
import { sanitizeNextImageSrc } from "@/lib/sanitizeNextImageSrc";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import CustomModal from "@/components/modal/CustomModal";
import { useMultiChainTokenData } from "@/lib/hooks/useToken";
import { SUPPORTED_CHAINS } from "../constants";
import { useWalletAddresses, useWalletData } from "../hooks/useWalletData";
import { usePrivy } from "@privy-io/react-auth";
import {
  useSignTransaction,
  useWallets as useSolanaWallets,
} from "@privy-io/react-auth/solana";
import { Connection, Transaction } from "@solana/web3.js";
import { copyTextToClipboard } from "@/lib/clipboard";

// Rent-exempt minimum for a token account (in SOL)
const TOKEN_ACCOUNT_RENT_EXEMPT = 0.00203928;
// Additional buffer for transaction fees
const TRANSACTION_FEE_BUFFER = 0.001;

// ─── Shared Types ──────────────────────────────────────────────────────────────

export interface RedeemConfig {
  totalAmount: number;
  maxWallets: number;
  tokensPerWallet: number;
  selectedToken?: WalletToken;
}

export type ProcessingStep = {
  status: "pending" | "processing" | "completed" | "error";
  message: string;
};

export type UpdateStepFn = (
  index: number,
  status: ProcessingStep["status"],
  message?: string,
) => void;

export interface WalletToken {
  symbol: string;
  name: string;
  logo?: string;
  logoURI?: string;
  balance: string | number;
  chain: string;
  isNative?: boolean;
  address?: string | null; // SPL mint — used as tokenMint in handleRedeem
  mint?: string | null;
  decimals?: number;
}

// ─── Mode A: Token props provided ─────────────────────────────────────────────

interface TokenModeProps {
  mode?: "token";
  tokenSymbol: string;
  tokenDecimals: number;
  tokenBalance: string;
  tokenLogo: string;
  tokenAmount: number;
  isUSD: boolean;
  tokenPrice: string;
  solBalance?: number;
  onConfirm: (
    config: RedeemConfig,
    updateStep: UpdateStepFn,
    setRedeemLink: (link: string) => void,
  ) => void;
  // wallet-mode props blocked
  defaultTokenSymbol?: never;
}

// ─── Mode B: Wallet mode ──────────────────────────────────────────────────────

interface WalletModeProps {
  mode: "wallet";
  defaultTokenSymbol?: string; // defaults to "SWOP"
  // all token-mode props blocked
  tokenSymbol?: never;
  tokenDecimals?: never;
  tokenBalance?: never;
  tokenLogo?: never;
  tokenAmount?: never;
  isUSD?: never;
  tokenPrice?: never;
  solBalance?: never;
  onConfirm?: never;
}

// ─── Combined Props ────────────────────────────────────────────────────────────

type RedeemModalProps = (TokenModeProps | WalletModeProps) & {
  isOpen: boolean;
  onClose: () => void;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const formatNumber = (value: string) => value.replace(/[^0-9.]/g, "");

const INITIAL_STEPS: ProcessingStep[] = [
  { status: "pending", message: "Setting up your redemption link" },
  { status: "pending", message: "Preparing secure wallet for token storage" },
  { status: "pending", message: "Transferring tokens to secure storage" },
];

// ─── Token Selector ────────────────────────────────────────────────────────────

function TokenSelector({
  tokens,
  selected,
  onSelect,
  loading,
}: {
  tokens: WalletToken[];
  selected: WalletToken | null;
  onSelect: (t: WalletToken) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tokens.filter(
      (t) =>
        t.chain?.toLowerCase() === "solana" &&
        (t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q)),
    );
  }, [tokens, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search tokens..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-8">
            Loading tokens…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-8">
            No Solana tokens found
          </div>
        ) : (
          filtered.map((token) => (
            <button
              key={token.address ?? token.mint ?? token.symbol}
              onClick={() => onSelect(token)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-gray-50",
                selected?.symbol === token.symbol &&
                  "bg-blue-50 ring-1 ring-blue-200",
              )}
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center border border-gray-200">
                {token.logo || token.logoURI ? (
                  <Image
                    src={sanitizeNextImageSrc((token.logo ?? token.logoURI)!)}
                    alt={token.symbol}
                    width={36}
                    height={36}
                    className="object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-gray-500">
                    {token.symbol.slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {token.symbol}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {token.name}
                </div>
              </div>
              <div className="text-sm font-medium text-right shrink-0 text-gray-700">
                {Number(token.balance).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function RedeemModal(props: RedeemModalProps) {
  const { isOpen, onClose } = props;
  const isWalletMode = props.mode === "wallet";
  const defaultSymbol = isWalletMode
    ? ((props as WalletModeProps).defaultTokenSymbol ?? "SWOP")
    : "";

  // ── Auth / wallet hooks ───────────────────────────────────────────────────
  const { authenticated, ready, user, user: PrivyUser } = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { signTransaction } = useSignTransaction();

  const walletData = useWalletData(authenticated, ready, PrivyUser);
  const { solWalletAddress, evmWalletAddress } = useWalletAddresses(walletData);
  const { tokens = [], loading: tokenLoading } = useMultiChainTokenData(
    solWalletAddress,
    evmWalletAddress,
    SUPPORTED_CHAINS,
  );

  // ── SOL balance derived from tokens ───────────────────────────────────────
  const solBalanceFromTokens = useMemo(() => {
    const solToken = tokens.find(
      (token) => token.isNative && token.chain?.toUpperCase() === "SOLANA",
    );
    return solToken ? parseFloat(String(solToken.balance)) || 0 : 0;
  }, [tokens]);

  const solBalance = isWalletMode
    ? solBalanceFromTokens
    : ((props as TokenModeProps).solBalance ?? 0);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [selectedToken, setSelectedToken] = useState<WalletToken | null>(null);
  const [depositInput, setDepositInput] = useState("");
  const [totalToken, setTotalToken] = useState(0);
  const [maxWallets, setMaxWallets] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [redeemLink, setRedeemLink] = useState("");
  const [tokensPerWallet, setTokensPerWallet] = useState(0);
  const [requiredSol, setRequiredSol] = useState(0);
  const [steps, setSteps] = useState<ProcessingStep[]>(INITIAL_STEPS);

  // ── Auto-select default token in wallet mode ───────────────────────────────
  useEffect(() => {
    if (!isWalletMode || !tokens.length || selectedToken) return;
    const preferred =
      tokens.find(
        (t) =>
          t.chain?.toLowerCase() === "solana" &&
          t.symbol.toUpperCase() === defaultSymbol.toUpperCase(),
      ) ??
      tokens.find((t) => t.chain?.toLowerCase() === "solana") ??
      null;
    setSelectedToken(preferred);
  }, [tokens, isWalletMode, defaultSymbol, selectedToken]);

  // ── Sync totalToken for token mode ────────────────────────────────────────
  useEffect(() => {
    if (isWalletMode) return;
    const { isUSD, tokenAmount, tokenPrice } = props as TokenModeProps;
    setTotalToken(isUSD ? tokenAmount / parseFloat(tokenPrice) : tokenAmount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isWalletMode,
    (props as TokenModeProps).isUSD,
    (props as TokenModeProps).tokenAmount,
    (props as TokenModeProps).tokenPrice,
  ]);

  // ── Recalc per-wallet ─────────────────────────────────────────────────────
  const recalcPerWallet = (total: number, wallets: number) => {
    if (wallets > 0 && total > 0) {
      setTokensPerWallet(total / wallets);
      setRequiredSol(TOKEN_ACCOUNT_RENT_EXEMPT + TRANSACTION_FEE_BUFFER);
    } else {
      setTokensPerWallet(0);
      setRequiredSol(0);
    }
  };

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleTokenSelect = (token: WalletToken) => {
    setSelectedToken(token);
    setShowTokenPicker(false);
    setDepositInput("");
    setTotalToken(0);
    recalcPerWallet(0, parseInt(maxWallets, 10) || 0);
  };

  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = formatNumber(e.target.value);
    setDepositInput(raw);
    const parsed = parseFloat(raw) || 0;
    setTotalToken(parsed);
    recalcPerWallet(parsed, parseInt(maxWallets, 10) || 0);
  };

  const handleMaxDeposit = () => {
    if (!selectedToken) return;
    const max = Number(selectedToken.balance) || 0;
    setDepositInput(String(max));
    setTotalToken(max);
    recalcPerWallet(max, parseInt(maxWallets, 10) || 0);
  };

  const handleWalletsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = formatNumber(e.target.value);
    const num = parseInt(raw, 10);
    setMaxWallets(num > 0 ? String(num) : "");
    recalcPerWallet(totalToken, num);
  };

  // ── Step helper ───────────────────────────────────────────────────────────
  const updateStep: UpdateStepFn = (index, status, message) => {
    setSteps((curr) =>
      curr.map((step, i) =>
        i === index
          ? { ...step, status, message: message ?? step.message }
          : step,
      ),
    );
  };

  const deleteRedeemLink = async (userId: string, poolId: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/deleteRedeemLink`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          privyUserId: userId,
          poolId: poolId,
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to delete redeem link");
    }
  };

  // ── handleRedeem (wallet mode) — inlined from parent ─────────────────────
  const handleRedeem = async (
    config: RedeemConfig,
    _updateStep: UpdateStepFn,
    _setRedeemLink: (link: string) => void,
  ) => {
    const solanaWallet = solanaWallets[0];

    if (!solanaWallet?.address) {
      throw new Error("Please connect your wallet to create a redeem link.");
    }

    const token = config.selectedToken!;
    const totalAmount = parseFloat(config.totalAmount.toString());

    // Detect whether this is a Privy embedded wallet.
    // If so, send walletId → backend signs server-side (0 popups).
    const isPrivyEmbedded = solanaWallet.walletClientType === "privy";
    const walletId = isPrivyEmbedded ? solanaWallet.id : undefined;

    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    );

    // Step 0: create redemption pool (backend also signs+sends when walletId provided)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/createRedeemptionPool`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privyUserId: user?.id,
          tokenName: token.name,
          tokenMint: token.address,
          tokenSymbol: token.symbol,
          tokenLogo: token.logoURI ?? token.logo,
          totalAmount,
          tokenDecimals: token.decimals,
          tokensPerWallet: config.tokensPerWallet,
          maxWallets: config.maxWallets,
          creator: solanaWallet.address,
          isNative: token.isNative,
          walletId, // undefined for external wallets
        }),
      },
    );

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      const msg = errBody?.message || "Failed to generate redeem link";
      throw new Error(msg);
    }

    const { data } = await response.json();

    // ── Privy embedded: backend handled the on-chain tx, nothing to sign ──
    if (!data.serializedTransaction) {
      _updateStep(0, "completed");
      _updateStep(1, "completed");
      _updateStep(2, "completed");
      _setRedeemLink(`https://redeem.swopme.app/${data.poolId}`);
      return;
    }

    // ── External wallet: sign the combined tx (1 popup) ───────────────────
    _updateStep(0, "completed");
    _updateStep(1, "processing");

    try {
      const combinedTx = Transaction.from(
        Buffer.from(data.serializedTransaction, "base64"),
      );
      // Refresh blockhash client-side so Privy's internal RPC node recognises it
      const { blockhash: freshBlockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("finalized");
      combinedTx.recentBlockhash = freshBlockhash;

      const serializedTx = new Uint8Array(
        combinedTx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        }),
      );

      const { signedTransaction: signedTx } = await signTransaction({
        transaction: serializedTx,
        wallet: solanaWallet,
      });
      const signature = await connection.sendRawTransaction(signedTx);
      await connection.confirmTransaction({
        signature,
        blockhash: freshBlockhash,
        lastValidBlockHeight,
      });

      _updateStep(1, "completed");
      _updateStep(2, "completed");
      _setRedeemLink(`https://redeem.swopme.app/${data.poolId}`);
    } catch (error: any) {
      await deleteRedeemLink(user?.id || "", data.poolId);
      console.error("Combined transaction error:", error);

      let errorMessage = "Failed to set up token holding account";
      if (error?.logs) {
        const logs = Array.isArray(error.logs) ? error.logs : [];
        if (logs.some((log: string) => log.includes("insufficient funds"))) {
          errorMessage =
            "Insufficient token balance. The amount you entered exceeds your wallet balance.";
        } else if (logs.some((log: string) => log.includes("insufficient lamports"))) {
          errorMessage =
            "Insufficient SOL balance to cover rent fees. Please add more SOL to your wallet.";
        } else if (
          logs.some((log: string) => log.includes("insufficient funds for rent"))
        ) {
          errorMessage =
            "Insufficient SOL balance to cover rent for token account. Please add more SOL.";
        }
      } else if (error?.message?.includes("Insufficient token balance") ||
                 error?.message?.includes("insufficient funds")) {
        errorMessage = error.message;
      } else if (error?.message?.includes("insufficient lamports")) {
        errorMessage =
          "Insufficient SOL balance to cover rent fees. Please add more SOL to your wallet.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  };

  // ── Main confirm dispatcher ───────────────────────────────────────────────
  const handleConfirm = async () => {
    setIsProcessing(true);
    setErrorMessage("");
    updateStep(0, "processing");

    const config: RedeemConfig = {
      totalAmount: totalToken,
      maxWallets: parseInt(maxWallets),
      tokensPerWallet,
      selectedToken: selectedToken ?? undefined,
    };

    const handler = isWalletMode
      ? handleRedeem
      : (props as TokenModeProps).onConfirm;

    try {
      await handler(config, updateStep, setRedeemLink);
    } catch (error: any) {
      console.error(error);
      const errorStepIndex = Math.max(
        steps.findIndex((s) => s.status === "processing"),
        0,
      );
      const errorMsg = error.message || "Failed to complete redeem process";
      setErrorMessage(errorMsg);
      updateStep(errorStepIndex, "error", errorMsg);
      setSteps((curr) =>
        curr.map((step, i) =>
          i > errorStepIndex && step.status === "processing"
            ? { ...step, status: "pending" }
            : step,
        ),
      );
    }
  };

  // ── Reset / close ─────────────────────────────────────────────────────────
  const handleClose = () => {
    setMaxWallets("");
    setDepositInput("");
    setTotalToken(0);
    setErrorMessage("");
    setIsProcessing(false);
    setRedeemLink("");
    setTokensPerWallet(0);
    setRequiredSol(0);
    setSteps(INITIAL_STEPS);
    setShowTokenPicker(false);
    onClose();
  };

  // Returns user to the form to fix inputs and try again
  const handleRetry = () => {
    setErrorMessage("");
    setIsProcessing(false);
    setSteps(INITIAL_STEPS);
  };

  // ── Derived display values ─────────────────────────────────────────────────
  const symbol = isWalletMode
    ? (selectedToken?.symbol ?? defaultSymbol)
    : (props as TokenModeProps).tokenSymbol;

  const logo = isWalletMode
    ? (selectedToken?.logo ?? selectedToken?.logoURI ?? null)
    : (props as TokenModeProps).tokenLogo;

  const hasInsufficientSol = requiredSol > 0 && solBalance < requiredSol;

  const depositExceedsBalance =
    isWalletMode &&
    !!selectedToken &&
    parseFloat(depositInput) > Number(selectedToken.balance);

  const canConfirm =
    !!maxWallets &&
    tokensPerWallet > 0 &&
    !hasInsufficientSol &&
    !depositExceedsBalance &&
    totalToken > 0 &&
    (!isWalletMode || !!selectedToken);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  // ── Success view ──────────────────────────────────────────────────────────
  if (isProcessing && redeemLink) {
    return (
      <CustomModal isOpen={isOpen} onCloseModal={undefined}>
        <div className="p-6 flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-green-500" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Your link is ready!
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Share it with anyone — they can claim{" "}
              <span className="font-medium text-gray-700">
                {tokensPerWallet > 0 ? tokensPerWallet.toFixed(4) : "—"} {symbol}
              </span>{" "}
              each.
            </p>
          </div>

          {/* Link copy row */}
          <div className="w-full flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="flex-1 text-sm text-gray-600 truncate">
              {redeemLink}
            </span>
            <button
              onClick={async () => {
                const didCopy = await copyTextToClipboard(redeemLink);
                toast({
                  title: didCopy ? "Link copied!" : "Could not copy link",
                });
              }}
              className="shrink-0 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>

          {/* Share shortcuts */}
          <div className="w-full grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Claim your tokens here: " + redeemLink)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.138.564 4.14 1.549 5.869L0 24l6.304-1.518A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.034-1.387l-.36-.214-3.742.981.999-3.654-.235-.375A9.818 9.818 0 1112 21.818z" />
              </svg>
              WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Claim your tokens: " + redeemLink)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-black">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.629 5.905-5.629zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </a>
          </div>

          <Button
            onClick={handleClose}
            className="w-full rounded-xl py-5 bg-black text-white hover:bg-gray-800 font-medium"
          >
            Done
          </Button>
        </div>
      </CustomModal>
    );
  }

  // ── Error view ────────────────────────────────────────────────────────────
  if (isProcessing && errorMessage) {
    const isLowSol =
      errorMessage.toLowerCase().includes("insufficient sol") ||
      errorMessage.toLowerCase().includes("insufficient lamports") ||
      errorMessage.toLowerCase().includes("rent");

    return (
      <CustomModal isOpen={isOpen} onCloseModal={handleClose}>
        <div className="p-6 flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="w-9 h-9 text-red-500" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Something went wrong
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isLowSol
                ? "You need a little more SOL in your wallet to cover the transaction fee. Add some SOL and try again."
                : "We couldn't create your link. Please try again."}
            </p>
          </div>

          <div className="w-full flex flex-col gap-2">
            <Button
              onClick={handleRetry}
              className="w-full rounded-xl py-5 bg-black text-white hover:bg-gray-800 font-medium"
            >
              Try Again
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full rounded-xl py-5"
            >
              Cancel
            </Button>
          </div>
        </div>
      </CustomModal>
    );
  }

  // ── Loading view ──────────────────────────────────────────────────────────
  if (isProcessing) {
    return (
      <CustomModal isOpen={isOpen} onCloseModal={undefined}>
        <div className="p-6 flex flex-col items-center text-center gap-5 py-10">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-indigo-50" />
            <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-indigo-500 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Creating your link…
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              This only takes a moment
            </p>
          </div>
        </div>
      </CustomModal>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────
  return (
    <CustomModal isOpen={isOpen} onCloseModal={onClose}>
      <div className="p-5">
        {/* ── Header ── */}
        <div className="flex items-center gap-2 mb-5 font-semibold text-base">
          {showTokenPicker ? (
            <button
              onClick={() => setShowTokenPicker(false)}
              className="p-1 rounded hover:bg-gray-100 transition-colors mr-1"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
          ) : logo ? (
            <Image
              src={sanitizeNextImageSrc(logo)}
              alt={symbol ?? ""}
              width={32}
              height={32}
              className="rounded-full border w-8 h-8"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
              {symbol?.slice(0, 2) ?? "??"}
            </div>
          )}
          {showTokenPicker ? "Select Token" : "Create Claim Link"}
        </div>

        {/* ── Token picker panel ── */}
        {showTokenPicker ? (
          <TokenSelector
            tokens={tokens}
            selected={selectedToken}
            onSelect={handleTokenSelect}
            loading={tokenLoading}
          />
        ) : (
          <div className="space-y-4">
            {/* ════ WALLET MODE: token selector + amount ════ */}
            {isWalletMode ? (
              <>
                {/* Token row */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-sm text-gray-500">Token</span>
                  <button
                    onClick={() => setShowTokenPicker(true)}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center shrink-0 border border-gray-300">
                      {logo ? (
                        <Image
                          src={sanitizeNextImageSrc(logo)}
                          alt={symbol ?? ""}
                          width={20}
                          height={20}
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-[9px] font-bold text-gray-500">
                          {symbol?.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold">
                      {symbol ?? "Select token"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>

                {/* Balance */}
                {selectedToken && (
                  <p className="text-xs text-gray-400 -mt-1 px-1">
                    Available:{" "}
                    <span className="font-medium text-gray-600">
                      {Number(selectedToken.balance).toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}{" "}
                      {selectedToken.symbol}
                    </span>
                  </p>
                )}

                {/* Amount input */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    Total tokens to share
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={depositInput}
                      onChange={handleDepositChange}
                      disabled={!selectedToken}
                      className={cn(
                        "pr-24 rounded-xl",
                        depositExceedsBalance &&
                          "border-red-400 focus-visible:ring-red-400",
                      )}
                      min="0"
                      max={Number(selectedToken?.balance ?? 0)}
                      step="any"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        onClick={handleMaxDeposit}
                        disabled={!selectedToken}
                        className="text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded-md text-gray-600 font-medium transition-colors"
                      >
                        MAX
                      </button>
                      <span className="text-xs text-gray-400">{symbol ?? "—"}</span>
                    </div>
                  </div>
                  {depositExceedsBalance && (
                    <p className="text-xs text-red-500">
                      Amount exceeds your balance of{" "}
                      {Number(selectedToken?.balance ?? 0).toFixed(4)} {symbol}.
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* ════ TOKEN MODE: show fixed amount ════ */
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-sm text-gray-500">You&apos;re sharing</span>
                <span className="text-base font-semibold text-gray-900">
                  {totalToken.toFixed(4)} {symbol}
                </span>
              </div>
            )}

            {/* ── How many people ── */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                How many people can claim?
              </Label>
              <Input
                type="number"
                placeholder="e.g. 10"
                value={maxWallets}
                onChange={handleWalletsChange}
                min="1"
                step="1"
                disabled={isWalletMode && totalToken <= 0}
                className="rounded-xl"
              />
            </div>

            {/* ── Per-person summary pill ── */}
            {tokensPerWallet > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 rounded-xl">
                <span className="text-sm text-indigo-700">Each person gets</span>
                <span className="text-sm font-semibold text-indigo-800">
                  {tokensPerWallet.toFixed(4)} {symbol}
                </span>
              </div>
            )}

            {/* ── Low SOL warning (only show when actually insufficient) ── */}
            {hasInsufficientSol && (
              <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-amber-600 text-base leading-none mt-0.5">⚠️</span>
                <p className="text-sm text-amber-700">
                  You need a bit more SOL to process this transaction. Add at
                  least{" "}
                  <span className="font-medium">
                    {(requiredSol - solBalance).toFixed(4)} SOL
                  </span>{" "}
                  to your wallet.
                </p>
              </div>
            )}

            {/* ── CTA ── */}
            <PrimaryButton
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full py-2 mt-1"
            >
              Create Link
            </PrimaryButton>
          </div>
        )}
      </div>
    </CustomModal>
  );
}
