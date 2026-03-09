'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Image from 'next/image';
import Cookies from 'js-cookie';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import CustomModal from '@/components/modal/CustomModal';
import { TokenData } from '@/types/token';
import { chainIcons } from '@/utils/staticData/tokenChainIcon';

const COOKIE_NAME = 'selected_tokens';

interface ManageTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenData[];
}

export default function ManageTokenModal({
  isOpen,
  onClose,
  tokens,
}: ManageTokenModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTokens, setSelectedTokens] = useState<string[]>(() => {
    const cookie = Cookies.get(COOKIE_NAME);
    if (!cookie) return [];
    try {
      return JSON.parse(cookie);
    } catch {
      return [];
    }
  });

  const toggleTokenAddress = (address: string) => {
    if (!address) return;
    setSelectedTokens((prev) => {
      const updated = prev.includes(address)
        ? prev.filter((addr) => addr !== address)
        : [...prev, address];
      Cookies.set(COOKIE_NAME, JSON.stringify(updated), { expires: 30 });
      return updated;
    });
  };

  const filteredTokens = useMemo(() => {
    if (!searchTerm.trim()) return tokens;
    return tokens.filter((token) =>
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [tokens, searchTerm]);

  return (
    <CustomModal isOpen={isOpen} onCloseModal={onClose}>
      <section className="p-4 w-full">
        {/* Header */}
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">
          Manage token list
        </h1>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search by symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-4 py-6 w-full bg-white border border-gray-200 rounded-2xl text-base placeholder:text-gray-400"
          />
        </div>

        {/* Token List */}
        <div className="space-y-1 max-h-[55vh] overflow-y-auto pr-1">
          {filteredTokens.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">
              No tokens found
            </p>
          ) : (
            filteredTokens.map((token, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 px-2 border-b"
              >
                <div className="flex items-center gap-4">
                  {/* Token Icon */}
                  <div className="relative">
                    <Image
                      src={token.marketData?.image ?? ''}
                      alt={token.symbol}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full border"
                    />
                    {chainIcons[token.chain] && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-full flex items-center justify-center border-2 border-white overflow-hidden">
                        <Image
                          src={chainIcons[token.chain]}
                          alt={token.chain}
                          width={16}
                          height={16}
                        />
                      </div>
                    )}
                  </div>

                  {/* Token Info */}
                  <div>
                    <div className="font-semibold text-gray-900 text-base">
                      {token.symbol}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {token.balance}
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <Switch
                  checked={!selectedTokens.includes(token.address ?? '')}
                  onCheckedChange={() =>
                    toggleTokenAddress(token.address ?? '')
                  }
                  className="data-[state=checked]:bg-gray-900"
                />
              </div>
            ))
          )}
        </div>
      </section>
    </CustomModal>
  );
}
