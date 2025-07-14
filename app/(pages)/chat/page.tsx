'use client';
import {
  BookUser,
  Loader,
  Search,
  Wallet,
  ArrowLeft,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useState,
  useMemo,
  Suspense,
} from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import Link from 'next/link';
import { WalletItem } from '@/types/wallet';
import { usePrivy } from '@privy-io/react-auth';
import { useSearchParams, useRouter } from 'next/navigation';
import WalletManager from '@/components/wallet/wallet-manager';
import { useXmtpContext } from '@/lib/context/XmtpContext';
import ChatBox from '@/components/wallet/chat/chat-box';
import { Skeleton } from '@/components/ui/skeleton';
import { AnyConversation } from '@/lib/context/XmtpContext';
import { useToast } from '@/hooks/use-toast';

interface MessageProps {
  bio: string;
  ens: string;
  ethAddress: string;
  name: string;
  profileUrl: string;
  profilePic: string;
}

const getAvatarSrc = (profilePic?: string) => {
  if (!profilePic) return '/default-avatar.png';
  return profilePic.startsWith('http')
    ? profilePic
    : `/assets/avatar/${profilePic}.png`;
};

const ChatPageContent = () => {
  const {
    client: xmtpClient,
    conversations,
    conversationRequests,
    newConversation,
    canMessage,
    refreshConversations,
    loading: xmtpLoading,
    error: xmtpError,
    isConnected,
    initClient,
  } = useXmtpContext();
  const { user: PrivyUser } = usePrivy();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [walletData, setWalletData] = useState<WalletItem[] | null>(null);
  const [isWalletManagerOpen, setIsWalletManagerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [changeConversationLoading, setChangeConversationLoading] = useState(false);
  const [micrositeData, setMicrositeData] = useState<any | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<AnyConversation | null>(null);

  // Debug XMTP state
  useEffect(() => {
    console.log('🔍 [ChatPage] XMTP State:', {
      hasClient: !!xmtpClient,
      isConnected,
      isLoading: xmtpLoading,
      hasError: !!xmtpError,
      errorMessage: xmtpError?.message,
      conversationCount: conversations?.length || 0,
      hasPrivyUser: !!PrivyUser,
      privyWallets: PrivyUser?.linkedAccounts?.filter(a => a.type === 'wallet')?.length || 0
    });
  }, [xmtpClient, isConnected, xmtpLoading, xmtpError, conversations, PrivyUser]);

  // Manual retry function
  const handleRetryXMTP = async () => {
    console.log('🔄 [ChatPage] Manual XMTP retry requested');
    try {
      await initClient();
      toast({
        title: 'Success',
        description: 'XMTP client initialized successfully!',
      });
    } catch (error) {
      console.error('❌ [ChatPage] Manual retry failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize XMTP. Please check console for details.',
        variant: 'destructive',
      });
    }
  };

  // Extract peer addresses from conversations (like MVP)
  const conversationPeers = useMemo(() => {
    if (!Array.isArray(conversations)) return [];

    return conversations.map((conv: any) => {
      // Try to extract peer address from conversation
      let peerAddress = '';

      if (conv.peerAddress) {
        peerAddress = conv.peerAddress;
      } else if (conv.peer) {
        peerAddress = conv.peer;
      } else if (conv.members && Array.isArray(conv.members)) {
        // Find the peer member (not us)
        const peerMember = conv.members.find((m: any) => m.inboxId !== xmtpClient?.inboxId);
        if (peerMember && peerMember.accountAddresses && peerMember.accountAddresses.length > 0) {
          peerAddress = peerMember.accountAddresses[0];
        }
      }

      return {
        conversation: conv,
        peerAddress: peerAddress,
        displayName: peerAddress ? `${peerAddress.substring(0, 6)}...${peerAddress.substring(peerAddress.length - 4)}` : 'Unknown',
        ethAddress: peerAddress
      };
    }).filter(peer => peer.peerAddress); // Only show conversations with valid peer addresses
  }, [conversations, xmtpClient?.inboxId]);

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    async (recipientAddress: string) => {
      if (!recipientAddress || !xmtpClient) {
        console.log('⚠️ [ChatPage] Cannot select conversation - missing params');
        return;
      }

      console.log('🎯 [ChatPage] Selecting conversation with:', recipientAddress);

      try {
        setChangeConversationLoading(true);
        setSelectedConversation(null);

        // Look for existing conversation
        const existingPeer = conversationPeers.find(peer =>
          peer.peerAddress.toLowerCase() === recipientAddress.toLowerCase()
        );

        if (existingPeer) {
          console.log('✅ [ChatPage] Found existing conversation:', existingPeer.conversation);
          setSelectedConversation(existingPeer.conversation);
          setMicrositeData({
            name: existingPeer.displayName,
            ethAddress: existingPeer.ethAddress,
            bio: '',
            ens: '',
            profilePic: '',
            profileUrl: ''
          });
        } else {
          console.log('🆕 [ChatPage] Creating new conversation with:', recipientAddress);
          const newConvo = await newConversation(recipientAddress);
          if (newConvo) {
            setSelectedConversation(newConvo);
            setMicrositeData({
              name: `${recipientAddress.substring(0, 6)}...${recipientAddress.substring(recipientAddress.length - 4)}`,
              ethAddress: recipientAddress,
              bio: '',
              ens: '',
              profilePic: '',
              profileUrl: ''
            });
          } else {
            console.error('❌ [ChatPage] Failed to create new conversation');
            toast({
              title: 'Error',
              description: 'Failed to start conversation',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('❌ [ChatPage] Error selecting conversation:', error);
        toast({
          title: 'Error',
          description: 'Failed to start conversation',
          variant: 'destructive',
        });
      } finally {
        setChangeConversationLoading(false);
      }
    },
    [xmtpClient, conversationPeers, newConversation, toast],
  );

  // Handle search (enhanced to always show results)
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Show search result for any input that could be an address
    if (value.trim().length > 3) {
      // Check if it looks like an Ethereum address
      if (value.startsWith('0x') && value.length >= 6) {
        setSearchResult({
          name: value.length > 10 ? `${value.substring(0, 6)}...${value.substring(value.length - 4)}` : value,
          ethAddress: value,
          bio: 'Click to start conversation',
          ens: '',
          profilePic: '',
          profileUrl: ''
        });
      } else if (value.includes('.eth')) {
        // Handle ENS-like names
        setSearchResult({
          name: value,
          ethAddress: value,
          bio: 'ENS name - Click to start conversation',
          ens: value,
          profilePic: '',
          profileUrl: ''
        });
      } else {
        // For any other search, show as potential address
        setSearchResult({
          name: value,
          ethAddress: value,
          bio: 'Click to start conversation',
          ens: '',
          profilePic: '',
          profileUrl: ''
        });
      }
    } else {
      setSearchResult(null);
    }
  };

  // Filter conversations based on search
  const filteredConversationPeers = useMemo(() => {
    if (!searchQuery.trim()) return conversationPeers;

    return conversationPeers.filter(peer =>
      peer.peerAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      peer.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversationPeers, searchQuery]);

  // Initialize wallet data from Privy user
  useEffect(() => {
    if (!PrivyUser?.linkedAccounts) return;

    const linkWallet = PrivyUser.linkedAccounts
      .map((item) => {
        if (item.type !== 'wallet') return null;

        return {
          address: item.address,
          isActive: item.chainType === 'ethereum',
          isEVM: item.chainType === 'ethereum',
        };
      })
      .filter(Boolean) as WalletItem[];

    setWalletData(linkWallet);

    console.log('🔍 [ChatPage] Privy wallet data:', {
      totalAccounts: PrivyUser.linkedAccounts.length,
      wallets: linkWallet
    });
  }, [PrivyUser]);

  // Handle recipient from URL params
  useEffect(() => {
    const recipient = searchParams?.get('recipient');

    if (typeof window !== 'undefined') {
      try {
        const storedTokenData = sessionStorage.getItem('chatTokenData');
        if (storedTokenData) {
          const parsedTokenData = JSON.parse(storedTokenData);
          setTokenData(parsedTokenData);
        }
      } catch (error) {
        console.error('Error retrieving token data from sessionStorage:', error);
      }
    }

    if (recipient) {
      handleSelectConversation(recipient);
    }
  }, [searchParams, handleSelectConversation]);

  const handleWalletClick = async (ethAddress: string) => {
    await handleSelectConversation(ethAddress);
  };

  const handleBackToWallet = () => {
    router.push('/wallet');
  };

  return (
    <div className="h-full">

      <div className="flex gap-7 items-start h-full">
        <div
          style={{ height: 'calc(100vh - 150px)' }}
          className="w-[62%] bg-white rounded-xl relative"
        >
          {changeConversationLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                <p className="text-gray-600">Loading conversation...</p>
              </div>
            </div>
          ) : xmtpLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                <p className="text-gray-600">Connecting to XMTP...</p>
                <p className="text-xs text-gray-400 mt-2">
                  Check browser console for detailed logs
                </p>
              </div>
            </div>
          ) : xmtpError ? (
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="text-center max-w-md">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-red-800 mb-2">XMTP Connection Error</h3>
                  <p className="text-red-600 text-sm mb-4">{xmtpError.message}</p>
                  <button
                    onClick={handleRetryXMTP}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  <p>Check browser console for detailed error logs</p>
                  <p>Make sure your wallet is connected and try again</p>
                </div>
              </div>
            </div>
          ) : !micrositeData ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="mb-2">Select a conversation to start chatting</p>
                {!isConnected && (
                  <button
                    onClick={handleRetryXMTP}
                    className="text-blue-600 hover:text-blue-700 text-sm underline"
                  >
                    Initialize XMTP
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-hidden h-full">
              <div className="flex items-center gap-3 justify-between border rounded-xl border-gray-300 bg-white px-4 py-2 sticky top-0 left-0 mb-2 shadow-sm">
                <div className="flex items-center flex-1 gap-3">
                  <button
                    onClick={handleBackToWallet}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                    title="Back to Wallet"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Avatar>
                    <AvatarImage
                      src={getAvatarSrc(micrositeData.profilePic)}
                      alt={`${micrositeData.name}'s avatar`}
                    />
                    <AvatarFallback>
                      {micrositeData.name?.slice(0, 2) || 'AN'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="font-bold">
                      {micrositeData.name}
                    </h1>
                    <p className="text-gray-500 text-xs font-medium">
                      {micrositeData.ens}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsWalletManagerOpen(true)}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <Wallet className="w-5 h-5" />
                  </button>

                  <Link
                    href={
                      micrositeData.profileUrl ||
                      `/${micrositeData.ens}`
                    }
                    target="_blank"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <BookUser className="w-5 h-5" />
                  </Link>
                </div>
              </div>
              <div className="h-full overflow-y-auto">
                {xmtpClient && selectedConversation ? (
                  <ChatBox
                    conversation={selectedConversation}
                    tokenData={tokenData}
                    recipientWalletData={walletData || []}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="w-[38%] bg-white rounded-xl px-6 py-4 flex gap-3 flex-col">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInputChange}
              placeholder="Search messages..."
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-lg focus:outline-none pl-10 py-2 text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
            />
          </div>

          <div className="h-[calc(100vh-250px)] overflow-y-auto">
            {isSearchLoading && (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2"
                  >
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Show search result as new conversation option (if exists and not already in conversations) */}
            {searchResult && !filteredConversationPeers.some(peer =>
              peer.peerAddress.toLowerCase() === searchResult.ethAddress.toLowerCase()
            ) && (
                <div className="mb-2">
                  <div className="text-xs text-gray-400 px-3 py-1 border-b">New Conversation</div>
                  <MessageList
                    key={`search-${searchResult.ethAddress}`}
                    bio={searchResult.bio}
                    name={searchResult.name}
                    profilePic={searchResult.profilePic}
                    ethAddress={searchResult.ethAddress}
                    handleWalletClick={handleWalletClick}
                    recipientAddress={micrositeData?.ethAddress ?? null}
                  />
                </div>
              )}

            {/* Show existing conversation peers */}
            {filteredConversationPeers.length > 0 && (
              <div className="mb-2">
                {searchQuery.trim() && <div className="text-xs text-gray-400 px-3 py-1 border-b">Existing Conversations</div>}
                {filteredConversationPeers.map((peer: any) => (
                  <MessageList
                    key={peer.ethAddress}
                    bio="Existing conversation"
                    name={peer.displayName}
                    profilePic=""
                    ethAddress={peer.ethAddress}
                    handleWalletClick={handleWalletClick}
                    recipientAddress={micrositeData?.ethAddress ?? null}
                  />
                ))}
              </div>
            )}

            {/* Show message when no results found */}
            {!searchResult && filteredConversationPeers.length === 0 && searchQuery.trim() && (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <p>No conversations found</p>
                  <p className="text-sm text-gray-400">Try entering a complete Ethereum address (0x...)</p>
                </div>
              </div>
            )}

            {/* Show message when no conversations exist and no search */}
            {!searchQuery.trim() && filteredConversationPeers.length === 0 && (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <p>No conversations yet</p>
                  <p className="text-sm text-gray-400">Search for an address to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {walletData && (
        <WalletManager
          walletData={walletData}
          isOpen={isWalletManagerOpen}
          onClose={() => setIsWalletManagerOpen(false)}
        />
      )}
    </div>
  );
};

const MessageList = ({
  bio,
  name,
  profilePic,
  ethAddress,
  handleWalletClick,
  recipientAddress,
}: {
  bio: string;
  name: string;
  profilePic: string;
  ethAddress: string;
  handleWalletClick: (ethAddress: string) => Promise<void>;
  recipientAddress: string | null;
}) => {
  return (
    <div
      onClick={() => handleWalletClick(ethAddress)}
      className="text-black flex items-center justify-between p-3 rounded-lg cursor-pointer border hover:bg-gray-50 transition-colors mb-2"
    >
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage
            src={getAvatarSrc(profilePic)}
            alt={`${name}'s avatar`}
          />
          <AvatarFallback>{name?.slice(0, 2) || 'AN'}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{name}</p>
          {bio && (
            <p className="text-sm text-gray-500 line-clamp-1">
              {bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  );
};

export default ChatPage;
