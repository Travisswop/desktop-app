import { Transaction } from '@/types/transaction';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';

interface TransactionItemProps {
  transaction: Transaction;
  onSelect: (transaction: Transaction) => void;
}

const truncateAddress = (address: string) => {
  return `${address.slice(0, 8)}.....${address.slice(-8)}`;
};

// Component to handle token icon with fallback
const TokenIcon = ({
  symbol,
  size = 40,
}: {
  symbol: string;
  size?: number;
}) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  // Determine the image source with fallback logic
  const getImageSrc = () => {
    if (!imageError && symbol) {
      return `https://app.apiswop.co/public/crypto-icons/${symbol}.png`;
    }
    return '/assets/crypto-icons/DOLLAR.png';
  };

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true);
    } else if (!fallbackError) {
      setFallbackError(true);
    }
  };

  const imageSrc = getImageSrc();

  const containerClass =
    size === 40
      ? 'w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center'
      : 'w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center';

  return (
    <div className={containerClass}>
      <Image
        src={imageSrc}
        alt={symbol}
        width={size}
        height={size}
        className="object-cover"
        onError={handleImageError}
      />
    </div>
  );
};

const TransactionItem = ({
  transaction,
  onSelect,
}: TransactionItemProps) => {
  const isOutgoing = transaction.flow === 'out';

  const calculateValue = (value: string, price: number) => {
    const numericValue = parseFloat(value);
    return (numericValue * price).toFixed(2);
  };

  const getBorderColorByNetwork = (network: string) => {
    switch (network?.toLowerCase()) {
      case 'ethereum':
        return 'border-blue-400';
      case 'polygon':
        return 'border-purple-400';
      case 'solana':
        return 'border-green-400';
      case 'base':
        return 'border-cyan-400';
      default:
        return 'border-gray-400';
    }
  };

  const [borderClass, setBorderClass] = useState(
    transaction?.isNew
      ? `border-2 ${getBorderColorByNetwork(
          transaction.network
        )} animate-pulse`
      : 'border border-gradient-to-r from-gray-200 to-gray-300'
  );

  useEffect(() => {
    if (transaction?.isNew) {
      const timer = setTimeout(() => {
        setBorderClass(
          'border border-gradient-to-r from-gray-200 to-gray-300'
        );
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [transaction?.isNew]);

  return (
    <div
      className={`p-2 flex items-center justify-between cursor-pointer`}
      onClick={() => onSelect(transaction)}
    >
      <div className="flex items-center gap-3">
        {transaction.isSwapped ? (
          <>
            <div className="relative flex items-center">
              {/* From Token Icon */}
              <div className="-mr-2">
                <TokenIcon
                  symbol={transaction.swapped?.from.symbol || ''}
                  size={32}
                />
              </div>
              {/* To Token Icon */}
              <TokenIcon
                symbol={transaction.swapped?.to.symbol || ''}
                size={32}
              />
            </div>
            <div>
              <p className="font-semibold">Swapped</p>
              <p className="text-sm text-muted-foreground">
                {transaction.swapped?.from.symbol}{' '}
                <span>&#x2192;</span> {transaction.swapped?.to.symbol}
              </p>
            </div>
          </>
        ) : (
          <>
            <TokenIcon
              symbol={transaction.tokenSymbol || ''}
              size={40}
            />
            <div>
              <p className="font-semibold">
                {isOutgoing ? 'Sent' : 'Received'}
              </p>
              <p className="text-sm text-muted-foreground max-w-[200px] md:max-w-[300px]">
                {isOutgoing ? (
                  <span>To {truncateAddress(transaction.to)}</span>
                ) : (
                  <span>
                    From {truncateAddress(transaction.from)}
                  </span>
                )}
              </p>
            </div>
          </>
        )}
      </div>
      <div className="text-right">
        <p
          className={`font-medium ${
            isOutgoing ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {isOutgoing ? '-' : '+'}
          {parseFloat(transaction.value).toFixed(2)}{' '}
          {transaction.tokenSymbol}
        </p>
        <p className="text-sm text-muted-foreground">
          {transaction.isSwapped ? (
            <>
              $
              {calculateValue(
                transaction.swapped!.from.value,
                transaction.swapped!.from.price
              )}
              {' → '}$
              {calculateValue(
                transaction.swapped!.to.value,
                transaction.swapped!.to.price
              )}
            </>
          ) : (
            `$${calculateValue(
              transaction.value,
              transaction.currentPrice
            )}`
          )}
        </p>
      </div>
    </div>
  );
};

export default TransactionItem;
