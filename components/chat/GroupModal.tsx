'use client';
import { useState, useEffect, useRef } from 'react';
import CustomModal from '../modal/CustomModal';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import Image from 'next/image';
import isUrl from '@/lib/isUrl';

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
  const [showDropdown, setShowDropdown] = useState(false);
  const [tokenGated, setTokenGated] = useState(false);
  const [tokenType, setTokenType] = useState<'NFT' | 'Token'>('NFT');
  const [selectedToken, setSelectedToken] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  };

  // Create group
  const handleCreateGroup = () => {
    if (!groupName.trim() || !socket) return;

    const groupData = {
      name: groupName,
      members: selectedMembers.map((m) => m._id),
      tokenGated,
      tokenType: tokenGated ? tokenType : undefined,
      selectedToken:
        tokenGated && selectedToken ? selectedToken : undefined,
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
    setShowDropdown(false);
    setTokenGated(false);
    setTokenType('NFT');
    setSelectedToken('');
    onClose();
  };

  // Format ENS names display
  const getEnsDisplay = () => {
    if (selectedMembers.length === 0) return '';
    return selectedMembers
      .map((m) => m.ens || m.microsite?.ens || m.name)
      .join(', ');
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

        {/* Add Agents Section */}
        {/* <div>
          <label className="block text-sm font-medium mb-3 text-gray-700">
            Add Agents:
          </label>
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center cursor-pointer hover:shadow-lg transition-shadow">
                <span className="text-2xl">🤖</span>
              </div>
              <span className="text-xs text-gray-600">SendAI</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center cursor-pointer hover:shadow-lg transition-shadow">
                <span className="text-2xl">🖼️</span>
              </div>
              <span className="text-xs text-gray-600">Images</span>
            </div>
          </div>
        </div> */}

        {/* Token Gated */}
        {/* <div>
          <label className="block text-sm font-medium mb-3 text-gray-700">
            Token Gated
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setTokenGated(true)}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                tokenGated
                  ? 'border-black bg-gray-100 text-gray-900 font-medium'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              On
            </button>
            <button
              onClick={() => setTokenGated(false)}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                !tokenGated
                  ? 'border-black bg-gray-100 text-gray-900 font-medium'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              Off
            </button>
          </div>
        </div> */}

        {/* Token Type (only show if Token Gated is On) */}
        {tokenGated && (
          <>
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700">
                Token Type:
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setTokenType('NFT')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    tokenType === 'NFT'
                      ? 'border-black bg-gray-100 text-gray-900 font-medium'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  NFT
                </button>
                <button
                  onClick={() => setTokenType('Token')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    tokenType === 'Token'
                      ? 'border-black bg-gray-100 text-gray-900 font-medium'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Token
                </button>
              </div>
            </div>

            {/* Select Token */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Select Token:
              </label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full bg-gray-50 text-gray-900 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 appearance-none cursor-pointer"
              >
                <option value="">Select a token...</option>
                <option value="rakibs-big-mac">Rakibs Big Mac</option>
                <option value="sample-nft-1">Sample NFT 1</option>
                <option value="sample-nft-2">Sample NFT 2</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Footer */}

      {/* Footer */}
      <div className="px-6 pb-6">
        <button
          onClick={handleCreateGroup}
          disabled={!groupName.trim() || selectedMembers.length === 0}
          className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          Create
        </button>
      </div>
    </CustomModal>
  );
}
