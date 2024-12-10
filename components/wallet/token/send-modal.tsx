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
  // When price is 0, force token input mode
  const hasPrice = parseFloat(token?.marketData?.price || '0') > 0;
  const [isUSD, setIsUSD] = useState(hasPrice);
  const [amount, setAmount] = useState('1.00');

  const maxUSDAmount = useMemo(() => {
    if (!token || !hasPrice) return '0.00';
    return (
      parseFloat(token.balance) * parseFloat(token.marketData.price)
    ).toFixed(2);
  }, [token, hasPrice]);

  const convertUSDToToken = useCallback(
    (usdAmount: number) => {
      if (!token?.marketData.price || !hasPrice) return '0';
      const price = parseFloat(token.marketData.price);
      return (usdAmount / price).toFixed(4);
    },
    [token, hasPrice]
  );

  const convertTokenToUSD = useCallback(
    (tokenAmount: number) => {
      if (!token?.marketData.price || !hasPrice) return '0';
      return (
        tokenAmount * parseFloat(token.marketData.price)
      ).toFixed(2);
    },
    [token, hasPrice]
  );

  const handleInput = useCallback(
    (value: string) => {
      if (!token) return;

      // Remove non-numeric/decimal characters and multiple decimals
      const sanitizedValue = value
        .replace(/[^0-9.]/g, '')
        .replace(/(\..*)\./g, '$1');

      // Handle empty or just decimal input
      if (sanitizedValue === '' || sanitizedValue === '.') {
        setAmount('0');
        return;
      }

      // Remove leading zeros unless it's a decimal (e.g. 0.123)
      const normalizedValue = sanitizedValue.replace(/^0+(?=\d)/, '');

      const numericValue = parseFloat(normalizedValue);
      if (isNaN(numericValue)) return;

      if (isUSD && hasPrice) {
        const maxUSD = parseFloat(maxUSDAmount);
        if (numericValue > maxUSD) {
          setAmount(maxUSDAmount);
        } else {
          setAmount(normalizedValue);
        }
      } else {
        const maxToken = parseFloat(token.balance);
        if (numericValue > maxToken) {
          setAmount(token.balance);
        } else {
          setAmount(normalizedValue);
        }
      }
    },
    [isUSD, token, maxUSDAmount, hasPrice]
  );

  const toggleCurrency = useCallback(() => {
    if (!token || !hasPrice) return;

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return;

    setIsUSD((prev) => {
      if (prev) {
        // Converting from USD to Token
        setAmount(convertUSDToToken(numericAmount));
      } else {
        // Converting from Token to USD
        setAmount(convertTokenToUSD(numericAmount));
      }
      return !prev;
    });
  }, [amount, token, convertUSDToToken, convertTokenToUSD, hasPrice]);

  const getOppositeAmount = useCallback(() => {
    if (!token || !hasPrice) return '0';

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return '0';

    if (isUSD) {
      return convertUSDToToken(numericAmount);
    } else {
      return convertTokenToUSD(numericAmount);
    }
  }, [
    amount,
    isUSD,
    token,
    convertUSDToToken,
    convertTokenToUSD,
    hasPrice,
  ]);

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
              {isUSD && hasPrice ? 'USD' : token.symbol}
            </span>
          </div>
        </div>

        <div className="text-center mb-1 flex justify-center items-center gap-4">
          <div>
            <Button
              onClick={() => {
                const maxAmount =
                  isUSD && hasPrice ? maxUSDAmount : token.balance;
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
            {isUSD && hasPrice && (
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
          {hasPrice && (
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
          )}
        </div>

        {hasPrice && (
          <div className="text-center mb-6">
            <span className="text-sm text-gray-500">
              {isUSD
                ? `${getOppositeAmount()} ${token.symbol}`
                : `$${getOppositeAmount()}`}
            </span>
          </div>
        )}

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
            {hasPrice ? (
              <>
                <div className="font-medium">${maxUSDAmount}</div>
                <div className="text-sm text-gray-500">
                  {parseFloat(token.balance).toFixed(4)}{' '}
                  {token.symbol}
                </div>
              </>
            ) : (
              <div className="font-medium">
                {parseFloat(token.balance).toFixed(4)} {token.symbol}
              </div>
            )}
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
