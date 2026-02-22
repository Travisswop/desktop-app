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
  Info,
  CheckCircle,
  XCircle,
  ChevronDown,
  Search,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
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
import { TransactionService } from "@/services/transaction-service";

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
  balance: number;
  chain: string;
  isNative?: boolean;
  address?: string; // SPL mint — used as tokenMint in handleRedeem
  mint?: string;
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
                    src={(token.logo ?? token.logoURI)!}
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
                {token.balance.toLocaleString(undefined, {
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
    const max = selectedToken.balance;
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

    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
    );

    const totalAmount = parseFloat(config.totalAmount.toString());

    // Step 0: create redemption pool
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
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to generate redeem link");
    }

    _updateStep(0, "completed");
    _updateStep(1, "processing");

    const { data } = await response.json();

    // Step 1: sign & send setup transaction
    try {
      const setupTx = Transaction.from(
        Buffer.from(data.serializedTransaction, "base64"),
      );
      const serializedSetupTx = new Uint8Array(
        setupTx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        }),
      );
      const { signedTransaction: signedSetupTx } = await signTransaction({
        transaction: serializedSetupTx,
        wallet: solanaWallet,
      });
      const setupSignature = await connection.sendRawTransaction(signedSetupTx);
      await connection.confirmTransaction(setupSignature);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error: any) {
      await deleteRedeemLink(user?.id || "", data.poolId);
      console.error("Setup transaction error:", error);

      let errorMessage = "Failed to set up temporary account";
      if (error?.logs) {
        const logs = Array.isArray(error.logs) ? error.logs : [];
        if (logs.some((log: string) => log.includes("insufficient lamports"))) {
          errorMessage =
            "Insufficient SOL balance to cover rent fees. Please add more SOL to your wallet.";
        }
      } else if (error?.message?.includes("insufficient lamports")) {
        errorMessage =
          "Insufficient SOL balance to cover rent fees. Please add more SOL to your wallet.";
      }

      throw new Error(errorMessage);
    }

    _updateStep(1, "completed");
    _updateStep(2, "processing");

    // Step 2: transfer tokens
    try {
      const txSignature = await TransactionService.handleRedeemTransaction(
        solanaWallet,
        connection,
        {
          totalAmount: totalAmount * Math.pow(10, token.decimals ?? 0),
          tokenAddress: token.address,
          tokenDecimals: token.decimals ?? 0,
          tempAddress: data.tempAddress,
        },
        signTransaction,
      );

      await connection.confirmTransaction(txSignature);

      _updateStep(2, "completed");
      _setRedeemLink(`https://redeem.swopme.app/${data.poolId}`);
    } catch (error: any) {
      console.error("Token transfer error:", error);
      await deleteRedeemLink(user?.id || "", data.poolId);

      let errorMessage = "Failed to transfer tokens";

      if (error.name === "SendTransactionError") {
        const { message, logs } =
          TransactionService.parseSendTransactionError(error);
        console.error("Transaction error logs:", logs);

        if (
          logs.some((log) =>
            log.includes(
              "Please upgrade to SPL Token 2022 for immutable owner support",
            ),
          )
        ) {
          errorMessage =
            "This token requires SPL Token 2022 support. Please try again with sufficient SOL balance for rent.";
        } else if (
          logs.some((log) => log.includes("insufficient funds for rent"))
        ) {
          errorMessage =
            "Insufficient SOL balance to cover rent for token account. Please add more SOL to your wallet.";
        } else {
          errorMessage = message || "Failed to transfer tokens";
        }
      } else {
        errorMessage = error.message || "Failed to transfer tokens";
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
    parseFloat(depositInput) > selectedToken.balance;

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

  return (
    <CustomModal
      isOpen={isOpen}
      onCloseModal={isProcessing ? undefined : onClose}
    >
      <div className="p-5">
        {!isProcessing ? (
          <>
            {/* ── Header ── */}
            <div className="flex items-center gap-2 mb-4 font-semibold">
              {showTokenPicker ? (
                <button
                  onClick={() => setShowTokenPicker(false)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors mr-1"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                </button>
              ) : logo ? (
                <Image
                  src={logo}
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
              {showTokenPicker ? "Select Token" : "Create Redemption Link"}
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
              <>
                <div className="space-y-3">
                  {/* ════ WALLET MODE ════ */}
                  {isWalletMode ? (
                    <>
                      <div className="bg-gray-100 p-4 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Token</span>
                          <button
                            onClick={() => setShowTokenPicker(true)}
                            className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 active:scale-95 transition-all"
                          >
                            <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center shrink-0 border border-gray-300">
                              {logo ? (
                                <Image
                                  src={logo}
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

                        {selectedToken ? (
                          <div>
                            <div className="text-xs text-gray-500">
                              Available Balance
                            </div>
                            <div className="text-xl font-semibold mt-0.5">
                              {selectedToken.balance.toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })}{" "}
                              {selectedToken.symbol}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 italic">
                            {tokenLoading
                              ? "Loading tokens…"
                              : "No Solana tokens found in wallet"}
                          </div>
                        )}
                      </div>

                      {/* Amount input */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Amount to Redeem
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="0.0"
                            value={depositInput}
                            onChange={handleDepositChange}
                            disabled={!selectedToken}
                            className={cn(
                              "pr-28",
                              depositExceedsBalance &&
                                "border-red-400 focus-visible:ring-red-400",
                            )}
                            min="0"
                            max={selectedToken?.balance}
                            step="any"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <button
                              onClick={handleMaxDeposit}
                              disabled={!selectedToken}
                              className="text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded text-gray-600 transition-colors"
                            >
                              MAX
                            </button>
                            <span className="text-sm text-gray-500">
                              {symbol ?? "—"}
                            </span>
                          </div>
                        </div>
                        {depositExceedsBalance && (
                          <p className="text-xs text-red-500">
                            Amount exceeds your {symbol} balance of{" "}
                            {selectedToken?.balance.toFixed(4)} {symbol}.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    /* ════ TOKEN MODE ════ */
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">
                        Amount to Redeem
                      </div>
                      <div className="text-xl font-semibold mt-1">
                        {totalToken.toFixed(4)} {symbol}
                      </div>
                    </div>
                  )}

                  {/* ── Number of wallets ── */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Total wallets to claim{" "}
                      {totalToken > 0
                        ? `${totalToken.toFixed(4)} ${symbol}`
                        : symbol}
                    </Label>
                    <Input
                      type="number"
                      placeholder="Enter number of wallets"
                      value={maxWallets}
                      onChange={handleWalletsChange}
                      min="1"
                      step="1"
                      disabled={isWalletMode && totalToken <= 0}
                    />
                  </div>

                  {/* ── Per wallet info ── */}
                  <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-medium">
                        Claim Limit Per Wallet
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Each wallet can claim{" "}
                        {tokensPerWallet > 0 ? tokensPerWallet.toFixed(4) : "—"}{" "}
                        {symbol}
                      </div>
                    </div>
                  </div>

                  {/* ── SOL balance warning ── */}
                  {requiredSol > 0 && (
                    <div
                      className={cn(
                        "p-4 rounded-lg flex items-start gap-2",
                        hasInsufficientSol ? "bg-red-50" : "bg-green-50",
                      )}
                    >
                      <Info
                        className={cn(
                          "w-4 h-4 mt-0.5 shrink-0",
                          hasInsufficientSol
                            ? "text-red-500"
                            : "text-green-500",
                        )}
                      />
                      <div className="flex-1">
                        <div
                          className={cn(
                            "text-sm font-medium",
                            hasInsufficientSol
                              ? "text-red-700"
                              : "text-green-700",
                          )}
                        >
                          SOL Required for Transaction
                        </div>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <div className="flex justify-between">
                            <span>Required:</span>
                            <span className="font-medium">
                              {requiredSol.toFixed(6)} SOL
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Your Balance:</span>
                            <span
                              className={cn(
                                "font-medium",
                                hasInsufficientSol
                                  ? "text-red-600"
                                  : "text-green-600",
                              )}
                            >
                              {solBalance.toFixed(6)} SOL
                            </span>
                          </div>
                        </div>
                        {hasInsufficientSol && (
                          <div className="text-xs text-red-600 mt-2 font-medium">
                            Please add at least{" "}
                            {(requiredSol - solBalance).toFixed(6)} SOL to your
                            wallet to continue.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="text-red-500 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg">
                      <Info className="w-4 h-4 shrink-0" />
                      {errorMessage}
                    </div>
                  )}
                </div>

                {/* ── CTA ── */}
                <div className="mt-4">
                  <PrimaryButton
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="w-full py-2"
                  >
                    Create Link
                  </PrimaryButton>
                </div>
              </>
            )}
          </>
        ) : (
          /* ── Processing view ── */
          <div className="space-y-6 py-4">
            {!redeemLink && (
              <div className="relative space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="relative flex flex-col items-center">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center",
                          step.status === "completed"
                            ? "border-green-500 bg-green-500"
                            : step.status === "processing"
                              ? "border-blue-500 bg-blue-500"
                              : step.status === "error"
                                ? "border-red-500 bg-red-500"
                                : "border-gray-200 bg-white",
                        )}
                      >
                        {step.status === "completed" ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : step.status === "error" ? (
                          <XCircle className="w-4 h-4 text-white" />
                        ) : step.status === "processing" ? (
                          <div className="w-4 h-4">
                            <svg
                              className="animate-spin text-white"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-200" />
                        )}
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={cn(
                            "w-0.5 h-12 -mb-2",
                            step.status === "completed"
                              ? "bg-green-500"
                              : step.status === "processing"
                                ? "bg-blue-500"
                                : "bg-gray-200",
                          )}
                        />
                      )}
                    </div>
                    <div className="flex-1 pt-1.5 pb-8">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          step.status === "completed"
                            ? "text-green-600"
                            : step.status === "processing"
                              ? "text-blue-600"
                              : step.status === "error"
                                ? "text-red-600"
                                : "text-gray-500",
                        )}
                      >
                        {step.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {redeemLink && (
              <div className="mt-4 space-y-6">
                <div className="flex justify-center">
                  <CheckCircle className="w-20 h-20 text-green-500" />
                </div>
                <div className="bg-green-50 p-6 rounded-lg space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-green-800">
                      Redemption Link Created Successfully!
                    </h3>
                    <p className="text-sm text-green-600 mt-1">
                      Your tokens are now securely stored and ready to be
                      claimed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-green-800">
                      Share this link with recipients:
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={redeemLink}
                        className="bg-white border-green-200 focus-visible:ring-green-500"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(redeemLink);
                          toast({
                            title: "Link copied!",
                            description:
                              "The redemption link has been copied to your clipboard",
                          });
                        }}
                        className="whitespace-nowrap border-green-200 hover:bg-green-100"
                      >
                        Copy Link
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleClose}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  Done
                </Button>
              </div>
            )}

            {errorMessage && !redeemLink && (
              <div className="mt-6 bg-red-50 p-4 rounded-lg space-y-4">
                <div className="flex items-center gap-2 text-red-800">
                  <XCircle className="w-5 h-5" />
                  <h3 className="font-semibold">
                    Error Creating Redemption Link
                  </h3>
                </div>
                <p className="text-sm text-red-600">{errorMessage}</p>
                {errorMessage.includes("insufficient funds for rent") && (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <p className="text-xs text-yellow-800 font-medium">
                      Troubleshooting Suggestion:
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Add more SOL to your wallet to cover the rent for token
                      accounts.
                    </p>
                  </div>
                )}
                {errorMessage.includes("SPL Token 2022") && (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <p className="text-xs text-yellow-800 font-medium">
                      Troubleshooting Suggestion:
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      This token requires additional SOL to create a compatible
                      token account. Please ensure you have sufficient SOL
                      balance.
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleClose}
                  variant="destructive"
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </CustomModal>
  );
}
