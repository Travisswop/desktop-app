'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Wallet } from 'lucide-react';
import Image from 'next/image';
import { useDebounce } from 'use-debounce';
import { useQuery } from '@tanstack/react-query';
import { ReceiverData } from '@/types/wallet';
import { truncateAddress } from '@/lib/utils';

const validateEthereumAddress = (address: string) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const validateSolanaAddress = (address: string) => {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

async function fetchUserByENS(
  ensName: string,
  network: string
): Promise<ReceiverData | null> {
  if (!ensName) return null;

  if (ensName.endsWith('.swop.id')) {
    const url = `https://app.apiswop.co/api/v4/wallet/getEnsAddress/${ensName}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch ENS address');
    }
    const data = await response.json();

    return {
      address:
        network === 'SOLANA' ? data.addresses['501'] : data.owner,
      ensName: data.name,
      isEns: true,
      avatar: data.domainOwner.avatar.startsWith('https://')
        ? data.domainOwner.avatar
        : `/assets/avatar.png`,
    };
  } else if (ensName.startsWith('0x')) {
    // Handle Ethereum address
    if (!validateEthereumAddress(ensName)) {
      throw new Error('Invalid Ethereum address');
    }

    return {
      address: ensName,
      isEns: false,
    };
  } else {
    // Handle Solana address
    if (!validateSolanaAddress(ensName)) {
      throw new Error('Invalid Solana address');
    }
    return {
      address: ensName,
      isEns: false,
    };
  }
}

interface SendToModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectReceiver: (receiver: ReceiverData) => void;
  network: string;
  currentWalletAddress: string;
}

export default function SendToModal({
  open = false,
  onOpenChange,
  onSelectReceiver,
  network,
  currentWalletAddress,
}: SendToModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 500);
  const [addressError, setAddressError] = useState(false);

  const isValidAddress =
    searchQuery &&
    ((['ETHEREUM', 'POLYGON', 'BASE'].includes(network) &&
      validateEthereumAddress(searchQuery)) ||
      (network === 'SOLANA' && validateSolanaAddress(searchQuery)));

  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user', debouncedQuery],
    queryFn: () => fetchUserByENS(debouncedQuery, network),
    enabled:
      Boolean(debouncedQuery) &&
      !isValidAddress &&
      debouncedQuery.includes('.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(false);

    // Validate address is not empty or current wallet
    if (!searchQuery.trim()) {
      return;
    }

    if (
      searchQuery.toLowerCase() === currentWalletAddress.toLowerCase()
    ) {
      setAddressError(true);
      return;
    }

    if (isValidAddress) {
      onSelectReceiver({
        address: searchQuery,
        isEns: false,
        ensName: undefined,
        avatar: undefined,
      });
    } else if (userData) {
      // Also validate ENS resolved address
      if (
        userData.address.toLowerCase() ===
        currentWalletAddress.toLowerCase()
      ) {
        setAddressError(true);
        return;
      }

      // Validate resolved address format matches network
      const isValidResolved = [
        'ETHEREUM',
        'POLYGON',
        'BASE',
      ].includes(network)
        ? validateEthereumAddress(userData.address)
        : validateSolanaAddress(userData.address);

      if (!isValidResolved) {
        setAddressError(true);
        return;
      }

      onSelectReceiver({
        address: userData.address,
        isEns: true,
        ensName: userData.ensName,
        avatar: userData.avatar,
      });
    }
  };

  const handleSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchQuery(e.target.value);
    setAddressError(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Send To
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Enter wallet address or ENS name"
              value={searchQuery}
              onChange={handleSearchChange}
              className="pr-10 rounded-2xl border-gray-200"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 h-8 w-8"
              disabled={
                (!isValidAddress && !userData) ||
                addressError ||
                isLoading ||
                !searchQuery.trim()
              }
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>

        <div className="mt-4 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {(error || addressError || !isValidAddress) &&
            searchQuery &&
            !userData && (
              <div className="text-center text-sm text-red-500">
                {addressError
                  ? 'Cannot send to your own address'
                  : 'Invalid address or ENS name. Please try again.'}
              </div>
            )}

          {/* Show wallet address preview */}
          {isValidAddress && !addressError && (
            <div className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">
                      Wallet Address
                    </span>
                    <p className="text-sm text-gray-500">
                      {truncateAddress(searchQuery)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show ENS preview */}
          {userData && userData.isEns && (
            <div
              className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => onSelectReceiver(userData)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src={userData.avatar || '/assets/avatar.png'}
                    alt={userData.ensName || ''}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <span className="font-medium">
                      {userData.ensName}
                    </span>
                    <p className="text-sm text-gray-500">
                      {truncateAddress(userData.address)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!searchQuery && (
            <div className="text-center text-sm text-gray-500">
              Enter a valid wallet address or ENS name to send to.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
