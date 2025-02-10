import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Info, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    config: RedeemConfig,
    updateStep: (
      index: number,
      status: ProcessingStep['status'],
      message?: string
    ) => void,
    setRedeemLink: (link: string) => void
  ) => void;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenBalance: string;
  tokenLogo: string;
  tokenAmount: number;
}

export interface RedeemConfig {
  totalAmount: number;
  maxWallets: number;
  tokensPerWallet: number;
}

type ProcessingStep = {
  status: 'pending' | 'processing' | 'completed' | 'error';
  message: string;
};

const formatNumber = (value: string) => {
  return value.replace(/[^0-9.]/g, '');
};

export default function RedeemModal({
  isOpen,
  onClose,
  onConfirm,
  tokenSymbol,
  tokenDecimals,
  tokenBalance,
  tokenLogo,
  tokenAmount,
}: RedeemModalProps) {
  const [maxWallets, setMaxWallets] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [redeemLink, setRedeemLink] = useState('');
  const [tokensPerWallet, setTokensPerWallet] = useState(0);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      status: 'pending',
      message: 'Setting up your redemption link',
    },
    {
      status: 'pending',
      message: 'Preparing secure wallet for token storage',
    },
    {
      status: 'pending',
      message: 'Transferring tokens to secure storage',
    },
  ]);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = formatNumber(e.target.value);
    const numValue = parseInt(value, 10);

    // Ensure numValue is a valid integer and greater than 0
    if (numValue > 0) {
      const perWallet = tokenAmount / numValue;
      setTokensPerWallet(perWallet);
    } else {
      setTokensPerWallet(0); // Reset tokensPerWallet if numValue is invalid
    }
    setMaxWallets(numValue.toString());
  };

  const updateStep = (
    index: number,
    status: ProcessingStep['status'],
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
    setErrorMessage('');

    try {
      // Update first step to processing
      updateStep(0, 'processing');

      onConfirm(
        {
          totalAmount: tokenAmount,
          maxWallets: parseInt(maxWallets),
          tokensPerWallet: tokensPerWallet,
        },
        updateStep,
        setRedeemLink
      );
    } catch (error: any) {
      console.log('error', error);
      setErrorMessage(
        error.message || 'Failed to complete redeem process'
      );
      setSteps((current) =>
        current.map((step) =>
          step.status === 'processing'
            ? { ...step, status: 'error' }
            : step
        )
      );
    }
  };

  const handleClose = () => {
    // Clear all states
    setMaxWallets('');
    setErrorMessage('');
    setIsProcessing(false);
    setRedeemLink('');
    setIsSuccess(false);
    setSteps([
      {
        status: 'pending',
        message: 'Setting up your redemption link',
      },
      {
        status: 'pending',
        message: 'Preparing secure wallet for token storage',
      },
      {
        status: 'pending',
        message: 'Transferring tokens to secure storage',
      },
    ]);

    // Call the parent's onClose
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={isProcessing ? undefined : onClose}
    >
      <DialogContent className="sm:max-w-[425px]">
        {!isProcessing ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Image
                  src={tokenLogo}
                  alt={tokenSymbol}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                Create Redemption Link
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Current Balance Display */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">
                  Amount to Redeem
                </div>
                <div className="text-xl font-semibold mt-1">
                  {tokenAmount.toFixed(4)} {tokenSymbol}
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
                  Number of Wallets
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
                    Tokens Per Wallet
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Each wallet will receive {tokensPerWallet}{' '}
                    {tokenSymbol}
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="text-red-500 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg">
                  <Info className="w-4 h-4" />
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!maxWallets || tokensPerWallet <= 0}
              >
                Create Link
              </Button>
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
                          'w-8 h-8 rounded-full border-2 flex items-center justify-center',
                          step.status === 'completed'
                            ? 'border-green-500 bg-green-500'
                            : step.status === 'processing'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-200 bg-white'
                        )}
                      >
                        {step.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : step.status === 'processing' ? (
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
                            'w-0.5 h-12 -mb-2',
                            step.status === 'completed'
                              ? 'bg-green-500'
                              : step.status === 'processing'
                              ? 'bg-blue-500'
                              : 'bg-gray-200'
                          )}
                        />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 pt-1.5 pb-8">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          step.status === 'completed'
                            ? 'text-green-600'
                            : step.status === 'processing'
                            ? 'text-blue-600'
                            : 'text-gray-500'
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
                      Your tokens are now securely stored and ready to
                      be claimed
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
                            title: 'Link copied!',
                            description:
                              'The redemption link has been copied to your clipboard',
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
      </DialogContent>
    </Dialog>
  );
}
