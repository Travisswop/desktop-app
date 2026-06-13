'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import CustomModal from '../modal/CustomModal';
import { ChevronDown, X } from 'lucide-react';
import Image from 'next/image';
import isUrl from '@/lib/isUrl';
import { useUser } from '@/lib/UserContext';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { useNFT } from '@/lib/hooks/useNFT';

interface User {
  _id: string;
  name: string;
  ens?: string;
  avatar?: string;
  microsite?: {
    ens?: string;
    profilePic?: string;
  };
}

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket: any;
  currentUser: string;
  onGroupCreated?: (group: any) => void;
}

export default function GroupModal({
  isOpen,
  onClose,
  socket,
  currentUser,
  onGroupCreated,
}: GroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>(
    []
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [tokenGated, setTokenGated] = useState(false);
  const [tokenType, setTokenType] = useState<'NFT' | 'Token'>('NFT');
  const [selectedToken, setSelectedToken] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const solanaWalletAddress =
    user?.solanaAddress || user?.solanaWallet || '';

  const {
    tokens: walletTokens,
    loading: tokensLoading,
    error: tokensError,
  } = useMultiChainTokenData(
    solanaWalletAddress || undefined,
    undefined,
    ['SOLANA']
  );

  const {
    nfts: walletNfts,
    loading: nftsLoading,
    error: nftsError,
  } = useNFT(solanaWalletAddress || undefined, undefined, ['SOLANA']);

  const tokenOptions = useMemo(() => {
    if (tokenType === 'NFT') {
      return walletNfts.map((nft) => ({
        value: nft.contract,
        label: nft.name || nft.symbol || nft.contract,
        symbol: nft.symbol,
        image: nft.image,
      }));
    }

    return walletTokens
      .filter((token) => {
        const balance = Number(token.balance || 0);
        return Number.isFinite(balance) && balance > 0;
      })
      .map((token) => ({
        value: token.address || token.symbol,
        label: token.name || token.symbol || token.address || 'Token',
        symbol: token.symbol,
        image: token.logoURI || token.marketData?.image,
      }));
  }, [tokenType, walletNfts, walletTokens]);

  const selectedGateAsset = tokenOptions.find(
    (option) => option.value === selectedToken
  );

  useEffect(() => {
    setSelectedToken('');
  }, [tokenType, solanaWalletAddress]);

  useEffect(() => {
    if (
      selectedToken &&
      !tokenOptions.some((option) => option.value === selectedToken)
    ) {
      setSelectedToken('');
    }
  }, [selectedToken, tokenOptions]);

  // Search users with debounce
  useEffect(() => {
    if (searchQuery.trim() && socket) {
      const timeoutId = setTimeout(() => {
        socket.emit(
          'search_users',
          {
            query: searchQuery,
            limit: 10,
            forGroupCreation: true,
          },
          (response: any) => {
            if (response?.success) {
              setSearchResults(response.users || []);
              setShowDropdown(true);
            }
          }
        );
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchQuery, socket]);

  // Select member
  const handleSelectMember = (user: User) => {
    if (!selectedMembers.some((m) => m._id === user._id)) {
      setSelectedMembers([...selectedMembers, user]);
    }
    setSearchQuery('');
    setShowDropdown(false);
    searchInputRef.current?.focus();
  };

  // Remove member
  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(
      selectedMembers.filter((m) => m._id !== userId)
    );
    setSelectedAdminIds((adminIds) =>
      adminIds.filter((adminId) => adminId !== userId)
    );
  };

  const handleToggleAdmin = (userId: string) => {
    setSelectedAdminIds((adminIds) =>
      adminIds.includes(userId)
        ? adminIds.filter((adminId) => adminId !== userId)
        : [...adminIds, userId]
    );
  };

  // Create group
  const handleCreateGroup = () => {
    if (!groupName.trim() || !socket) return;

    const groupData = {
      name: groupName,
      members: selectedMembers.map((m) => m._id),
      admins: selectedAdminIds,
      tokenGated,
      tokenType: tokenGated ? tokenType : undefined,
      selectedToken:
        tokenGated && selectedToken ? selectedToken : undefined,
      selectedTokenName:
        tokenGated && selectedGateAsset
          ? selectedGateAsset.label
          : undefined,
      selectedTokenSymbol:
        tokenGated && selectedGateAsset
          ? selectedGateAsset.symbol
          : undefined,
      network: tokenGated ? 'SOLANA' : undefined,
    };

    socket.emit('create_group', groupData, (response: any) => {
      if (response?.success) {
        onGroupCreated?.(response.group);
        handleClose();
      } else {
        alert(`Failed to create group: ${response?.error}`);
      }
    });
  };

  // Reset form
  const handleClose = () => {
    setGroupName('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMembers([]);
    setSelectedAdminIds([]);
    setShowDropdown(false);
    setTokenGated(false);
    setTokenType('NFT');
    setSelectedToken('');
    onClose();
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onCloseModal={handleClose}
      title="Create Chat"
      width="max-w-lg"
    >
      <div className="p-6 space-y-5">
        {/* Chat Name */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Chat Name:
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full text-gray-900 px-4 py-3 rounded-xl focus:outline-none shadow-md"
            placeholder="Enter chat name"
          />
        </div>

        {/* Chat Members */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Chat Members:
          </label>
          <div className="relative">
            {/* Search input */}
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowDropdown(true)}
                className="w-full text-gray-900 px-4 py-3 rounded-xl focus:outline-none shadow-md"
                placeholder="Search by ENS name..."
              />

              {/* Search dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => handleSelectMember(user)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                          {user.avatar ||
                          user.microsite?.profilePic ? (
                            <Image
                              src={
                                isUrl(
                                  user.avatar ||
                                    user.microsite?.profilePic ||
                                    ''
                                )
                                  ? user.avatar ||
                                    user.microsite?.profilePic ||
                                    ''
                                  : `/images/user_avator/${
                                      user.avatar ||
                                      user.microsite?.profilePic
                                    }@3x.png`
                              }
                              alt={user.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-purple-600 font-semibold">
                              {user.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {user.name || 'Unknown User'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {user.ens || user.microsite?.ens || ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected member tags */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedMembers.map((member) => (
                  <div
                    key={member._id}
                    className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-3 py-1.5 rounded-full text-sm"
                  >
                    <span>
                      {member.ens ||
                        member.microsite?.ens ||
                        member.name}
                    </span>
                    {selectedAdminIds.includes(member._id) && (
                      <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      className="hover:text-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Admins */}
        {selectedMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-700">
              Add Admins:
            </label>
            <div className="flex gap-4 overflow-x-auto pb-1">
              {selectedMembers.map((member) => {
                const isAdmin = selectedAdminIds.includes(member._id);
                const avatar =
                  member.avatar || member.microsite?.profilePic;
                const displayName =
                  member.ens || member.microsite?.ens || member.name;

                return (
                  <button
                    key={member._id}
                    type="button"
                    onClick={() => handleToggleAdmin(member._id)}
                    className="flex w-16 shrink-0 flex-col items-center gap-2"
                  >
                    <span
                      className={`relative w-14 h-14 rounded-full overflow-hidden border-2 transition-colors ${
                        isAdmin
                          ? 'border-black'
                          : 'border-transparent'
                      }`}
                    >
                      {avatar ? (
                        <Image
                          src={
                            isUrl(avatar)
                              ? avatar
                              : `/images/user_avator/${avatar}@3x.png`
                          }
                          alt={member.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="flex w-full h-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                          {member.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {isAdmin && (
                        <span className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] text-white">
                          ✓
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-center text-xs text-gray-600">
                      {displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Token Gated */}
        <div>
          <label className="block text-sm font-medium mb-3 text-gray-700">
            Token Gated
          </label>
          <div className="inline-flex w-44 rounded-full bg-gray-100 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setTokenGated(true)}
              className={`flex-1 px-4 py-2 rounded-full text-sm transition-colors ${
                tokenGated
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              On
            </button>
            <button
              type="button"
              onClick={() => setTokenGated(false)}
              className={`flex-1 px-4 py-2 rounded-full text-sm transition-colors ${
                !tokenGated
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Off
            </button>
          </div>
        </div>

        {/* Token Type (only show if Token Gated is On) */}
        {tokenGated && (
          <>
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700">
                Token Type:
              </label>
              <div className="inline-flex w-44 rounded-full bg-gray-100 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setTokenType('NFT')}
                  className={`flex-1 px-4 py-2 rounded-full text-sm transition-colors ${
                    tokenType === 'NFT'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  NFT
                </button>
                <button
                  type="button"
                  onClick={() => setTokenType('Token')}
                  className={`flex-1 px-4 py-2 rounded-full text-sm transition-colors ${
                    tokenType === 'Token'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Token
                </button>
              </div>
            </div>

            {/* Select Token */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Select {tokenType}:
              </label>
              <div className="relative">
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="w-full bg-white text-gray-900 px-4 py-3 pr-10 rounded-xl focus:outline-none shadow-md appearance-none cursor-pointer"
                  disabled={
                    !solanaWalletAddress ||
                    tokensLoading ||
                    nftsLoading ||
                    tokenOptions.length === 0
                  }
                >
                  <option value="">
                    {!solanaWalletAddress
                      ? 'Connect a Solana wallet first'
                      : tokenType === 'NFT' && nftsLoading
                      ? 'Loading NFTs...'
                      : tokenType === 'Token' && tokensLoading
                      ? 'Loading tokens...'
                      : tokenOptions.length === 0
                      ? `No Solana ${tokenType === 'NFT' ? 'NFTs' : 'tokens'} found`
                      : `Select a ${tokenType.toLowerCase()}...`}
                  </option>
                  {tokenOptions.map((asset) => (
                    <option key={asset.value} value={asset.value}>
                      {asset.symbol
                        ? `${asset.label} (${asset.symbol})`
                        : asset.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-700"
                />
              </div>
              {(tokensError || nftsError) && (
                <p className="mt-2 text-xs text-red-500">
                  Failed to load wallet assets. Please try again.
                </p>
              )}
              {selectedGateAsset && (
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                  {selectedGateAsset.image ? (
                    <Image
                      src={selectedGateAsset.image}
                      alt={selectedGateAsset.label}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs text-white">
                      {selectedGateAsset.label.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {selectedGateAsset.label}
                    </div>
                    <div className="truncate text-xs text-gray-500">
                      {selectedGateAsset.value}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        <button
          onClick={handleCreateGroup}
          disabled={
            !groupName.trim() ||
            selectedMembers.length === 0 ||
            (tokenGated && !selectedToken)
          }
          className="mx-auto block w-full max-w-sm bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Create
        </button>
      </div>
    </CustomModal>
  );
}
