'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SendConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  tokenAddress: string;
  recipient: string;
  onConfirm: () => void;
  loading: boolean;
}

export default function SendConfirmation({
  open,
  onOpenChange,
  amount,
  tokenAddress,
  recipient,
  onConfirm,
  loading,
}: SendConfirmationProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Send
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Amount */}
          <div>
            <div className="text-3xl font-medium">${amount}</div>
            <div className="text-sm text-gray-500 mt-1">
              {tokenAddress}
            </div>
          </div>

          {/* Recipient */}
          <div>
            <div className="text-sm font-medium mb-2">To</div>
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                📨
              </div>
              {recipient}
            </div>
          </div>

          {/* Details */}
          <div>
            <div className="text-sm font-medium mb-2">Details</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Network Fee
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Network fees are required to process your
                          transaction
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-sm text-gray-600">
                  What are the network fees
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={onConfirm}
            className="w-full bg-black text-white hover:bg-gray-800 rounded-xl py-6"
            disabled={loading}
          >
            {loading ? 'Confirming...' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
