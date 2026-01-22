import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Info, CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import CustomModal from "@/components/modal/CustomModal";

// Rent-exempt minimum for a token account (in SOL)
// This is approximately 0.00203928 SOL (2,039,280 lamports)
const TOKEN_ACCOUNT_RENT_EXEMPT = 0.00203928;
// Additional buffer for transaction fees
const TRANSACTION_FEE_BUFFER = 0.001;

interface RedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    config: RedeemConfig,
    updateStep: (
      index: number,
      status: ProcessingStep["status"],
      message?: string
    ) => void,
    setRedeemLink: (link: string) => void
  ) => void;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenBalance: string;
  tokenLogo: string;
  tokenAmount: number;
  isUSD: boolean;
  tokenPrice: string;
  solBalance?: number; // User's SOL balance for rent calculation
}

export interface RedeemConfig {
  totalAmount: number;
  maxWallets: number;
  tokensPerWallet: number;
}

type ProcessingStep = {
  status: "pending" | "processing" | "completed" | "error";
  message: string;
};

const formatNumber = (value: string) => {
  return value.replace(/[^0-9.]/g, "");
};

export default function RedeemModal({
  isOpen,
  onClose,
  onConfirm,
  tokenSymbol,
  tokenLogo,
  tokenAmount,
  isUSD,
  tokenPrice,
  solBalance = 0,
}: RedeemModalProps) {
  const [totalToken, setTotalToken] = useState(0);
  const [maxWallets, setMaxWallets] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [redeemLink, setRedeemLink] = useState("");
  const [tokensPerWallet, setTokensPerWallet] = useState(0);
  const [requiredSol, setRequiredSol] = useState(0);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      status: "pending",
      message: "Setting up your redemption link",
    },
    {
      status: "pending",
      message: "Preparing secure wallet for token storage",
    },
    {
      status: "pending",
      message: "Transferring tokens to secure storage",
    },
  ]);

  useEffect(() => {
    if (isUSD) {
      const token = tokenAmount / parseFloat(tokenPrice);
      setTotalToken(token);
    } else {
      setTotalToken(tokenAmount);
    }
  }, [isUSD, tokenAmount, tokenPrice]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = formatNumber(e.target.value);
    const numValue = parseInt(value, 10);

    // Ensure numValue is a valid integer and greater than 0
    if (numValue > 0) {
      const perWallet = totalToken / numValue;
      setTokensPerWallet(perWallet);
      // Calculate required SOL: rent for temp token account + transaction fees
      // We need 1 token account for the temp wallet + buffer for fees
      const required = TOKEN_ACCOUNT_RENT_EXEMPT + TRANSACTION_FEE_BUFFER;
      setRequiredSol(required);
    } else {
      setTokensPerWallet(0);
      setRequiredSol(0);
    }
    setMaxWallets(numValue.toString());
  };

  // Check if user has sufficient SOL balance
  const hasInsufficientSol = requiredSol > 0 && solBalance < requiredSol;

  const updateStep = (
    index: number,
    status: ProcessingStep["status"],
    message?: string
  ) => {
    setSteps((current) =>
      current.map((step, i) =>
        i === index
          ? { ...step, status, message: message || step.message }
          : step
      )
    );
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    setErrorMessage("");

    try {
      // Update first step to processing
      updateStep(0, "processing");

      const res = await onConfirm(
        {
          totalAmount: totalToken,
          maxWallets: parseInt(maxWallets),
          tokensPerWallet: tokensPerWallet,
        },
        updateStep,
        setRedeemLink
      );
    } catch (error: any) {
      console.error(error);

      let errorStepIndex = steps.findIndex(
        (step) => step.status === "processing"
      );
      if (errorStepIndex === -1) errorStepIndex = 0;

      const errorMsg = error.message || "Failed to complete redeem process";
      setErrorMessage(errorMsg);

      // Update the specific step that failed
      updateStep(errorStepIndex, "error", errorMsg);

      setSteps((current) =>
        current.map((step, index) => {
          if (index > errorStepIndex && step.status === "processing") {
            return { ...step, status: "pending" };
          }
          return step;
        })
      );
    }
  };

  const handleClose = () => {
    // Clear all states
    setMaxWallets("");
    setErrorMessage("");
    setIsProcessing(false);
    setRedeemLink("");
    setSteps([
      {
        status: "pending",
        message: "Setting up your redemption link",
      },
      {
        status: "pending",
        message: "Preparing secure wallet for token storage",
      },
      {
        status: "pending",
        message: "Transferring tokens to secure storage",
      },
    ]);

    // Call the parent's onClose
    onClose();
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onCloseModal={isProcessing ? undefined : onClose}
    >
      <div className="p-5">
        {!isProcessing ? (
          <>
            <div className="flex items-center gap-2 mb-4 font-semibold">
              <Image
                src={tokenLogo}
                alt={tokenSymbol}
                width={120}
                height={120}
                className="rounded-full border w-8 h-8"
              />
              Create Redemption Link
            </div>

            <div className="space-y-3">
              {/* Current Balance Display */}
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Amount to Redeem</div>
                <div className="text-xl font-semibold mt-1">
                  {totalToken.toFixed(4)} {tokenSymbol}
                </div>
              </div>

              {/* Amount Input */}
              {/* <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Amount to Redeem
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={totalAmount}
                    onChange={handleAmountChange}
                    className="pr-28"
                    min="0"
                    max={userBalance}
                    step="any"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={handleMaxClick}
                      className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600"
                    >
                      MAX
                    </button>
                    <span className="text-sm text-gray-500">
                      {tokenSymbol}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Max: {userBalance.toFixed(4)} {tokenSymbol}
                </div>
              </div> */}

              {/* Number of Wallets Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Total wallets to claim {totalToken.toFixed(4)} {tokenSymbol}
                </Label>
                <Input
                  type="number"
                  placeholder="Enter number of wallets"
                  value={maxWallets}
                  onChange={handleAmountChange}
                  min="1"
                  step="1"
                />
              </div>

              {/* Per Wallet Calculation */}
              <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">
                    Claim limit Per Wallet
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Each wallet can claim {tokensPerWallet.toFixed(4)}{" "}
                    {tokenSymbol}
                  </div>
                </div>
              </div>

              {/* SOL Balance Warning */}
              {requiredSol > 0 && (
                <div
                  className={cn(
                    "p-4 rounded-lg flex items-start gap-2",
                    hasInsufficientSol ? "bg-red-50" : "bg-green-50"
                  )}
                >
                  <Info
                    className={cn(
                      "w-4 h-4 mt-0.5",
                      hasInsufficientSol ? "text-red-500" : "text-green-500"
                    )}
                  />
                  <div className="flex-1">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        hasInsufficientSol ? "text-red-700" : "text-green-700"
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
                            hasInsufficientSol ? "text-red-600" : "text-green-600"
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
                  <Info className="w-4 h-4" />
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <PrimaryButton
                onClick={handleConfirm}
                disabled={!maxWallets || tokensPerWallet <= 0}
                className="w-full py-2"
              >
                Create Link
              </PrimaryButton>
            </div>
          </>
        ) : (
          <div className="space-y-6 py-4">
            {!redeemLink && (
              <div className="relative space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    {/* Step indicator and line */}
                    <div className="relative flex flex-col items-center">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center",
                          step.status === "completed"
                            ? "border-green-500 bg-green-500"
                            : step.status === "processing"
                            ? "border-blue-500 bg-blue-500"
                            : "border-gray-200 bg-white"
                        )}
                      >
                        {step.status === "completed" ? (
                          <CheckCircle className="w-4 h-4 text-white" />
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
                      {/* Connecting line */}
                      {index < steps.length - 1 && (
                        <div
                          className={cn(
                            "w-0.5 h-12 -mb-2",
                            step.status === "completed"
                              ? "bg-green-500"
                              : step.status === "processing"
                              ? "bg-blue-500"
                              : "bg-gray-200"
                          )}
                        />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 pt-1.5 pb-8">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          step.status === "completed"
                            ? "text-green-600"
                            : step.status === "processing"
                            ? "text-blue-600"
                            : "text-gray-500"
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
                  <div className="w-20 h-20 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle className="w-20 h-20 text-green-500 animate-success" />
                    </div>
                  </div>
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

                {/* Troubleshooting suggestions based on error type */}
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
