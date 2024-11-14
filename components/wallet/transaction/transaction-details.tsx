'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { format } from 'date-fns';
import { Copy, Check, Wallet } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Transaction } from '@/lib/hooks/useTransaction';

interface TransactionDetailsProps {
  transaction: Transaction | null;
  userAddress: string;
  isOpen: boolean;
  onClose: () => void;
}

const truncateAddress = (address: string) => {
  return `${address.slice(0, 8)}.....${address.slice(-8)}`;
};

// Helper Components
const CopyButton = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className="h-6 w-6"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 text-gray-500" />
      )}
    </Button>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const statusColors = {
    success: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
  };

  const statusType = status?.toLowerCase() || 'pending';

  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-xl text-xs font-medium',
        statusColors[statusType as keyof typeof statusColors]
      )}
    >
      {status.toUpperCase() || 'Pending'}
    </span>
  );
};

// Transaction Details Dialog
const TransactionDetails = ({
  transaction,
  isOpen,
  onClose,
}: TransactionDetailsProps) => {
  if (!transaction) return null;

  const formattedDate = format(
    new Date(parseInt(transaction.timeStamp) * 1000),
    'MMM d, yyyy hh:mm aa'
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-20 h-20 bg-purple-400 rounded-full flex items-center justify-center">
            <Wallet className="h-10 w-10 text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold">
              ${transaction.value}
            </h2>
            <p className="text-gray-500">{transaction.value} ETH</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-md font-semibold">
              Recipient
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {truncateAddress(transaction.to)}
              </span>
              <CopyButton content={transaction.to} />
            </div>
          </div>

          <div className="border-t"></div>

          <div className="flex justify-between">
            <span className="text-gray-500 text-md font-semibold">
              Amount
            </span>
            <div className="">
              <p className="font-semibold">${transaction.value}</p>
              <p className="font-semibold">${transaction.value}</p>
            </div>
          </div>

          <div className="border-t"></div>

          <div className="flex justify-between ">
            <span className="text-gray-500 text-md font-semibold">
              Network Fee
            </span>
            <div className="">
              <p className="font-semibold">${transaction.value}</p>
              <p className="font-semibold">${transaction.value}</p>
            </div>
          </div>

          <div className="border-t"></div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-md font-semibold">
              Date
            </span>
            <span className="text-sm ">{formattedDate}</span>
          </div>

          <div className="border-t"></div>

          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-md font-semibold">
              Status
            </span>
            <div className="flex items-center gap-2">
              <StatusBadge status="success" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDetails;
