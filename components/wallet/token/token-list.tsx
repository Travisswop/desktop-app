'use client';
import { ethers } from 'ethers';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { WalletItem } from '@/types/wallet';
import {
  TokenData,
  useTokenBalance,
} from '@/lib/hooks/useTokenBalance';
import { AlertCircle, Loader2 } from 'lucide-react';
import TokenCard from './token-card';

interface TokenListProps {
  onSelectToken: (token: TokenData) => void;
  walletData: WalletItem[];
}

export default function TokenList({
  onSelectToken,
  walletData,
}: TokenListProps) {
  const evmWallet = walletData.find((wallet) => wallet.isEVM);

  const alchemyApiUrl = process.env.NEXT_PUBLIC_ALCHEMY_API_URL;
  const evmProvider =
    evmWallet && alchemyApiUrl
      ? new ethers.providers.JsonRpcProvider(alchemyApiUrl)
      : undefined;

  const {
    tokens: evmTokens,
    loading: loadingEVM,
    error: evmError,
  } = useTokenBalance(
    '0x16ebc062A049631074257a1d0c62E1Ed5BCFB1b3',
    true,
    evmProvider
  );

  // const {
  //   tokens: solanaTokens,
  //   loading: loadingSolana,
  //   error: solanaError,
  // } = useTokenBalance(solanaWallet?.address, false);

  // const allTokens = [...(evmTokens || []), ...(solanaTokens || [])];
  // const isLoading = loadingEVM || loadingSolana;
  // const error = evmError || solanaError;

  const allTokens = [...evmTokens];
  console.log('🚀 ~ TokenList ~ allTokens:', allTokens);
  const isLoading = loadingEVM;
  const error = evmError;

  if (error) {
    console.log('🚀 ~ TokenList ~ error:', error);
    const errorMessage = evmError
      ? "EVM tokens couldn't be loaded."
      : "Solana tokens couldn't be loaded.";
    console.error(errorMessage);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between mb-6">
          <CardTitle>
            Tokens{' '}
            {isLoading && (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            )}
          </CardTitle>

          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-600">
              Some tokens couldn&apos;t be loaded. Please try again
              later.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allTokens.map((token) => (
            <TokenCard
              key={`${token.chain}-${token.address}`}
              token={token}
              onClick={() => onSelectToken(token)}
            />
          ))}

          {!isLoading && allTokens.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No tokens found in your wallet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
