'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface TransactionSuccessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
}

export default function TransactionSuccess({
  open,
  onOpenChange,
  amount,
}: TransactionSuccessProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Success</DialogTitle>
      <DialogContent className="max-w-xs p-6 rounded-3xl">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors"
        >
          <span className="sr-only">Close</span>
        </button>

        <div className="flex flex-col items-center justify-center space-y-4 pt-6">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center mb-2">
            <Check className="h-10 w-10 text-white" />
          </div>

          {/* Success Message */}
          <div className="text-center space-y-2">
            <h2 className="text-lg font-medium">Successfully Sent</h2>
            <p className="text-2xl font-semibold">${amount}</p>
          </div>

          {/* Done Button */}
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-black text-white hover:bg-gray-800 rounded-md py-6 mt-10"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
