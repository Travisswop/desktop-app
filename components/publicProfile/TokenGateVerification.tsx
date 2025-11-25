'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { useNFT } from '@/lib/hooks/useNFT';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface GatedInfo {
  isOn: boolean;
  tokenType: 'NFT' | 'Token';
  selectedToken: string;
  forwardLink: string;
  minRequired: number;
  coverImage: string;
  network: 'SOLANA' | 'ethereum' | 'polygon' | 'base';
}

interface TokenGateVerificationProps {
  gatedInfo: GatedInfo;
  micrositeName: string;
}

export default function TokenGateVerification({
  gatedInfo,
  micrositeName,
}: TokenGateVerificationProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { authenticated } = usePrivy();

  // Wallet hooks
  const { wallets: solanaWallets } = useSolanaWallets();
  const { wallets: ethWallets } = useWallets();

  // State
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGranted, setIsGranted] = useState(false);

  // Get wallet addresses
  const solWalletAddress = useMemo(() => {
    return solanaWallets?.find(
      (w) =>
        w.walletClientType === 'privy' ||
        w.connectorType === 'embedded'
    )?.address;
  }, [solanaWallets]);

  const evmWalletAddress = useMemo(() => {
    return ethWallets?.find(
      (w) =>
        w.walletClientType === 'privy' ||
        w.connectorType === 'embedded'
    )?.address;
  }, [ethWallets]);

  // Fetch tokens and NFTs based on network
  const shouldFetchSolana = gatedInfo.network === 'SOLANA';
  const shouldFetchEVM = ['ethereum', 'polygon', 'base'].includes(
    gatedInfo.network
  );

  const { tokens, loading: tokensLoading } = useMultiChainTokenData(
    shouldFetchSolana ? solWalletAddress : undefined,
    shouldFetchEVM ? evmWalletAddress : undefined,
    [gatedInfo.network === 'SOLANA' ? 'SOLANA' : 'ETHEREUM']
  );

  const { nfts, loading: nftsLoading } = useNFT(
    shouldFetchSolana ? solWalletAddress : undefined,
    shouldFetchEVM ? evmWalletAddress : undefined,
    [gatedInfo.network === 'SOLANA' ? 'SOLANA' : 'ETHEREUM']
  );

  // Verify if user has required token/NFT
  const verifyAccess = useMemo(() => {
    if (!authenticated) return false;
    if (tokensLoading || nftsLoading) return false;

    if (gatedInfo.tokenType === 'NFT') {
      // Check if user has the NFT
      const hasNFT = nfts.some((nft) => {
        if (gatedInfo.network === 'SOLANA') {
          return nft.contract === gatedInfo.selectedToken;
        } else {
          return (
            nft.contract?.toLowerCase() ===
            gatedInfo.selectedToken.toLowerCase()
          );
        }
      });
      return hasNFT;
    } else {
      // Check if user has enough tokens
      const token = tokens.find((t) => {
        if (gatedInfo.network === 'SOLANA') {
          return (
            t.address === gatedInfo.selectedToken ||
            t.symbol === gatedInfo.selectedToken
          );
        } else {
          return (
            t.address?.toLowerCase() ===
            gatedInfo.selectedToken.toLowerCase()
          );
        }
      });

      if (!token) return false;

      const balance = parseFloat(token.balance || '0');
      return balance >= gatedInfo.minRequired;
    }
  }, [
    authenticated,
    tokens,
    nfts,
    gatedInfo,
    tokensLoading,
    nftsLoading,
  ]);

  // Handle enter button click
  const handleEnter = async () => {
    // If not authenticated, redirect to login page
    if (!authenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access this content.',
      });
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 1000);
      return;
    }

    // If authenticated, verify access
    setIsVerifying(true);

    try {
      // Wait for data to load
      if (tokensLoading || nftsLoading) {
        toast({
          title: 'Loading...',
          description:
            'Fetching your wallet data. Please wait a moment.',
        });
        return;
      }

      // Check if user has access
      if (!verifyAccess) {
        toast({
          title: 'Access Denied',
          description: `You need ${
            gatedInfo.tokenType === 'NFT'
              ? 'the required NFT'
              : `at least ${gatedInfo.minRequired} ${gatedInfo.selectedToken} tokens`
          } to access this content.`,
          variant: 'destructive',
        });
        setIsVerifying(false);
        return;
      }

      // Sign message to prove ownership
      try {
        const messageToSign = `I am verifying access to ${micrositeName}'s SmartSite at ${new Date().toISOString()}`;

        // Get the appropriate wallet for signing
        let signature: string | undefined;

        if (gatedInfo.network === 'SOLANA') {
          const solanaWallet = solanaWallets?.find(
            (w) =>
              w.walletClientType === 'privy' ||
              w.connectorType === 'embedded'
          );

          if (solanaWallet) {
            // For Solana, we'll use the signMessage method
            const encodedMessage = new TextEncoder().encode(
              messageToSign
            );
            const signedMessage =
              solanaWallet.signMessage(encodedMessage);
            signature = Buffer.from(await signedMessage).toString(
              'base64'
            );
          }
        } else {
          // For EVM chains
          const evmWallet = ethWallets?.find(
            (w) =>
              w.walletClientType === 'privy' ||
              w.connectorType === 'embedded'
          );

          if (evmWallet && 'signMessage' in evmWallet) {
            signature = await (evmWallet as any).signMessage(
              messageToSign
            );
          }
        }

        if (!signature) {
          throw new Error('Failed to sign message');
        }

        // Access granted
        setIsGranted(true);
        toast({
          title: 'Access Granted!',
          description: 'Redirecting you now...',
        });

        // Redirect to forward link
        if (gatedInfo.forwardLink) {
          // Use a longer delay to ensure smooth transition
          setTimeout(() => {
            try {
              // Normalize the URL
              let forwardUrl = gatedInfo.forwardLink.trim();

              // Check if it's an external link
              const isExternalUrl =
                forwardUrl.startsWith('http://') ||
                forwardUrl.startsWith('https://') ||
                forwardUrl.startsWith('www.') ||
                /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(forwardUrl); // Matches domain patterns like example.com

              if (isExternalUrl) {
                // Add https:// if not present
                if (
                  !forwardUrl.startsWith('http://') &&
                  !forwardUrl.startsWith('https://')
                ) {
                  forwardUrl = `https://${forwardUrl}`;
                }
                // For external links, use window.location.replace to avoid back button issues
                window.location.replace(forwardUrl);
              } else {
                // For internal links, ensure proper formatting
                const internalPath = forwardUrl.startsWith('/')
                  ? forwardUrl
                  : `/${forwardUrl}`;
                window.location.href = internalPath;
              }
            } catch (redirectError) {
              console.error('Redirect error:', redirectError);
              toast({
                title: 'Redirect Failed',
                description:
                  'Could not redirect to the destination. Please navigate manually.',
                variant: 'destructive',
              });
              // Reset state so user can try again
              setIsGranted(false);
              setIsVerifying(false);
            }
          }, 2000);
        } else {
          // If no forward link, just dismiss the gate after a moment
          setTimeout(() => {
            setIsVerifying(false);
          }, 1500);
        }
      } catch (signError) {
        console.error('Message signing error:', signError);
        toast({
          title: 'Verification Failed',
          description:
            'Failed to sign verification message. Please try again.',
          variant: 'destructive',
        });
        setIsVerifying(false);
      }
    } catch (error) {
      console.error('Access verification error:', error);
      toast({
        title: 'Verification Error',
        description:
          'An error occurred while verifying your access. Please try again.',
        variant: 'destructive',
      });
      setIsVerifying(false);
    }
  };

  // Auto-verify on authentication if user was already trying to enter
  useEffect(() => {
    if (
      authenticated &&
      !verifyAccess &&
      !tokensLoading &&
      !nftsLoading
    ) {
      // User just authenticated but doesn't have access
      toast({
        title: 'Access Denied',
        description: `You need ${
          gatedInfo.tokenType === 'NFT'
            ? 'the required NFT'
            : `at least ${gatedInfo.minRequired} ${gatedInfo.selectedToken} tokens`
        } to access this content.`,
        variant: 'destructive',
      });
    }
  }, [
    authenticated,
    verifyAccess,
    tokensLoading,
    nftsLoading,
    gatedInfo,
    toast,
  ]);

  // If access is granted, don't show the gate
  if (isGranted) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <Image
          src={gatedInfo.coverImage}
          alt="Token Gated Content"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay for better text visibility */}
        {/* <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" /> */}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-md mx-4 text-center">
        <div className="">
          {/* Lock Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br  rounded-full flex items-center justify-center shadow-lg">
              {isGranted ? (
                <CheckCircle className="w-10 h-10 text-white" />
              ) : (
                <Lock className="w-10 h-10 text-white" />
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-8 text-lg">
            This SmartSite requires ownership of{' '}
            {gatedInfo.tokenType === 'NFT' ? (
              <span className="font-semibold ">a specific NFT</span>
            ) : (
              <span className="font-semibold ">
                at least {gatedInfo.minRequired}{' '}
                {gatedInfo.selectedToken} tokens
              </span>
            )}{' '}
            to access.
          </p>

          {/* Network Badge */}
          <div className="mb-6 flex justify-center">
            <span className="px-4 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
              {gatedInfo.network.toUpperCase()} Network
            </span>
          </div>

          {/* Enter Button */}
          <Button
            onClick={handleEnter}
            disabled={isVerifying || tokensLoading || nftsLoading}
            className=""
          >
            {isVerifying || tokensLoading || nftsLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {tokensLoading || nftsLoading
                  ? 'Loading Wallet...'
                  : 'Verifying...'}
              </>
            ) : isGranted ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Access Granted
              </>
            ) : authenticated ? (
              'Verify Access'
            ) : (
              'Connect Wallet to Enter'
            )}
          </Button>

          {/* Helper Text */}
          {authenticated && !tokensLoading && !nftsLoading && (
            <p className="mt-4 text-sm text-gray-500">
              {verifyAccess
                ? 'You have the required tokens. Click to verify and enter.'
                : "You don't have the required tokens in your connected wallet."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
