'use client';

import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Loader2,
  Wallet,
  Copy,
  Check,
} from 'lucide-react';

import { toast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import {
  formatAddress,
  generateWalletFromPrivateKey,
} from '@/components/util/wallet';
import { motion } from 'framer-motion';

interface Token {
  mint: string;
  amount: number;
  decimals: number;
  symbol: string;
  name: string;
  price: string;
  logoURI: string;
  tags: string[];
}

export function WalletPanel() {
  const [walletAddress, setWalletAddress] = useState<string | null>(
    null
  );
  const [formattedAddress, setFormattedAddress] = useState<
    string | null
  >(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch tokens for the wallet
  const fetchTokens = async (address: string) => {
    setIsLoadingTokens(true);
    try {
      const response = await fetch(`/api/tokens?address=${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }
      const data = await response.json();
      setTokens(data.tokens);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tokens',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // Initialize wallet and fetch tokens
  useEffect(() => {
    try {
      const privateKey =
        process.env.NEXT_PUBLIC_WALLET_PRIVATE_KEY || '';
      if (privateKey) {
        const address = generateWalletFromPrivateKey(privateKey);
        setWalletAddress(address);
        setFormattedAddress(formatAddress(address));
        // Fetch tokens after getting the wallet address
        fetchTokens(address);
      }
    } catch (error) {
      console.error('Error initializing wallet:', error);
      toast({
        title: 'Wallet Error',
        description: 'Failed to initialize wallet',
        variant: 'destructive',
      });
    }
  }, []);

  // Handle copied button click
  const handleCopied = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Address copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    if (walletAddress) {
      fetchTokens(walletAddress);
    }
  };

  // Calculate total portfolio value
  const totalValue = tokens.reduce((total, token) => {
    return total + Number(token.price) * Number(token.amount);
  }, 0);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <>
      <div className="w-[400px] h-screen  border-l border-[#2a2a2a] flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-b border-[#2a2a2a] backdrop-blur-md bg-gradient-to-r from-[#1a1a1a]/80 via-[#1a1a1a]/70 to-[#1a1a1a]/80 sticky top-0 z-10"
        >
          <div className="flex gap-4">
            {/* Portfolio Value Card - Left Side */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-4 border border-blue-500/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Portfolio
                  </p>
                  <motion.div
                    key={totalValue}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="flex items-baseline gap-2"
                  >
                    <span className="text-xl font-bold text-white">
                      ${totalValue.toFixed(2)}
                    </span>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Wallet Info - Right Side */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col justify-between bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl p-4 w-[200px] border border-blue-500/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <div>
                    <h2 className="font-medium text-white ">
                      Wallet
                    </h2>
                  </div>
                  <div
                    className="flex items-center justify-between gap-2 transition-colors group cursor-pointer"
                    onClick={handleCopied}
                  >
                    <span className="text-xs text-gray-400 truncate">
                      {formattedAddress}
                    </span>
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500 group-hover:text-gray-300 flex-shrink-0 transition-colors" />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden ">
          <div className="h-full overflow-y-auto custom-scrollbar px-4">
            {/* Token List Header with Refresh Button */}
            <div className="flex items-center justify-between sticky top-0 pt-4 pb-2  z-10">
              <h3 className="text-lg font-medium text-white">
                Token(s)
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white bg-[#2a2a2a]/80 hover:bg-[#333333]/80 backdrop-blur-sm h-8"
                onClick={handleRefresh}
                disabled={isLoadingTokens}
              >
                <div className="flex items-center gap-2">
                  {isLoadingTokens ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    >
                      <Loader2 className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="text-sm">Refresh</span>
                </div>
              </Button>
            </div>

            {/* Token List */}
            <div className="space-y-4 py-2">
              {isLoadingTokens ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : tokens.length > 0 ? (
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                >
                  {tokens.map((token, index) => (
                    <motion.div
                      key={token.mint}
                      variants={item}
                      className={`
                       group relative overflow-hidden
                       ${
                         token.tags.includes('native')
                           ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20'
                           : 'bg-[#2a2a2a]/80 backdrop-blur-sm'
                       }
                       hover:bg-[#333333]/80 transition-all duration-300 rounded-xl p-4
                       hover:shadow-lg hover:shadow-blue-500/5
                     `}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:translate-x-full duration-1000 transform transition-transform"></div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            {token.logoURI ? (
                              <img
                                src={token.logoURI}
                                alt={token.symbol}
                                width={40}
                                height={40}
                                className="rounded-full ring-2 ring-[#3a3a3a] group-hover:ring-blue-500/20 transition-all"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#3a3a3a] flex items-center justify-center ring-2 ring-[#4a4a4a]">
                                <span className="text-sm font-medium text-gray-400">
                                  {token.symbol.slice(0, 2)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium text-lg">
                                {token.symbol}
                              </span>
                              {token.tags?.includes('native') && (
                                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full font-medium">
                                  Native
                                </span>
                              )}
                              {token.tags?.includes('lp-token') && (
                                <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full font-medium">
                                  LP
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400 font-medium">
                              {token.amount.toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits:
                                    token.tags.includes('native')
                                      ? 4
                                      : 6,
                                }
                              )}{' '}
                              {token.symbol}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium text-lg group-hover:text-blue-400 transition-colors">
                            {Number(token.price).toFixed(4)}
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-1">
                            <div className="text-sm font-medium text-gray-400">
                              $
                              {(
                                Number(token.price) *
                                Number(token.amount)
                              ).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-gray-400 py-8"
                >
                  No tokens found
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
