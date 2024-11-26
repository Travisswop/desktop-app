'use client';

import { useCallback, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { DialogTitle } from '@radix-ui/react-dialog';
import { TokenData } from '@/types/token';
import { ArrowUpDown } from 'lucide-react';

interface SendTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: TokenData;
  onNext: (amount: string) => void;
}

export default function SendTokenModal({
  open,
  onOpenChange,
  token,
  onNext,
}: SendTokenModalProps) {
  const [isUSD, setIsUSD] = useState(true);
  const [amount, setAmount] = useState('100.00');

  const maxUSDAmount = useMemo(() => {
    if (!token) return '0.00';
    return (
      parseFloat(token.balance) * parseFloat(token.marketData.price)
    ).toFixed(2);
  }, [token]);

  const handleInput = useCallback(
    (value: string) => {
      if (!token) return;

      const sanitizedValue = value
        .replace(/[^0-9.]/g, '')
        .replace(/(\..*)\./g, '$1');

      if (sanitizedValue === '' || sanitizedValue === '.') {
        setAmount('0');
        return;
      }

      const numericValue = parseFloat(sanitizedValue);
      if (isNaN(numericValue)) return;

      // Check if the input exceeds the balance
      if (isUSD) {
        if (numericValue > parseFloat(maxUSDAmount)) {
          setAmount(maxUSDAmount);
        } else {
          setAmount(sanitizedValue);
        }
      } else {
        if (numericValue > parseFloat(token.balance)) {
          setAmount(token.balance);
        } else {
          setAmount(sanitizedValue);
        }
      }
    },
    [isUSD, token, maxUSDAmount]
  );

  const toggleCurrency = useCallback(() => {
    if (!token) return;

    setIsUSD((prev) => !prev);

    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount)) {
      if (isUSD) {
        // Convert USD to Token
        setAmount(
          (
            numericAmount / parseFloat(token.marketData.price)
          ).toFixed(4)
        );
      } else {
        // convert Token to USD
        setAmount(
          (
            numericAmount * parseFloat(token.marketData.price)
          ).toFixed(2)
        );
      }
    }
  }, [amount, isUSD, token]);

  const getOppositeAmount = useCallback(() => {
    if (!token) return '0';

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return '0';

    if (isUSD) {
      // Display token amount
      return (
        numericAmount / parseFloat(token.marketData.price)
      ).toFixed(4);
    } else {
      // Display USD amount
      return (
        numericAmount * parseFloat(token.marketData.price)
      ).toFixed(2);
    }
  }, [amount, isUSD, token]);

  if (!token) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle>
        <span className="sr-only">Token send</span>
      </DialogTitle>
      <DialogContent className="max-w-xl p-6 rounded-3xl bg-gray-50">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100 transition-colors"
        >
          <span className="sr-only">Close</span>
        </button>

        <div className="flex justify-center mt-10">
          <div>
            <span className="text-3xl font-medium">
              {isUSD ? 'USD' : token.symbol}
            </span>
          </div>
        </div>

        <div className="text-center mb-1 flex justify-center items-center gap-4">
          <div>
            <Button
              onClick={() => {
                const maxAmount = isUSD
                  ? maxUSDAmount
                  : token.balance;
                handleInput(maxAmount);
              }}
              className="rounded-full bg-slate-300 p-6"
              variant="outline"
              size="icon"
            >
              <span className="font-semibold text-xs text-muted-foreground">
                MAX
              </span>
            </Button>
          </div>
          {/* Amount Input */}
          <div className="relative inline-flex items-center">
            {isUSD && (
              <span className="text-4xl font-medium mr-1">$</span>
            )}
            <input
              type="text"
              value={amount}
              onChange={(e) => handleInput(e.target.value)}
              className="text-4xl font-medium bg-transparent w-40 text-center focus:outline-none"
              placeholder="0.00"
            />
          </div>
          {/* Toggle */}
          <div>
            <Button
              size="icon"
              variant="outline"
              className="rounded-full bg-slate-200 p-6"
              onClick={toggleCurrency}
            >
              <ArrowUpDown className="text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="text-center mb-6">
          <span className="text-sm text-gray-500">
            {isUSD
              ? `${getOppositeAmount()} ${token.symbol}`
              : `$${getOppositeAmount()}`}
          </span>
        </div>

        {/* Token Selection */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full">
              <Image
                src={token.logoURI}
                alt={token.name}
                width={52}
                height={52}
                className="rounded-full"
              />
            </div>
            <div>
              <div className="font-medium">{token.name}</div>
              <div className="text-sm text-gray-500">
                Your balance
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">${maxUSDAmount}</div>
            <div className="text-sm text-gray-500">
              {parseFloat(token.balance).toFixed(4)} {token.symbol}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl py-6"
            onClick={() => onOpenChange(false)}
          >
            Back
          </Button>
          <Button
            className="flex-1 rounded-xl py-6 bg-black text-white hover:bg-gray-800"
            onClick={() => onNext(amount)}
          >
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
