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
import { useDebouncedCallback } from 'use-debounce';
import { Skeleton } from '@/components/ui/skeleton';
import { AnyConversation } from '@/lib/xmtp';
import { safeGetPeerAddress, safeFindExistingDm, safeResolveInboxId } from '@/lib/xmtp-safe';
import { XmtpErrorDisplay } from '@/components/xmtp/XmtpErrorDisplay';
import { useToast } from '@/hooks/use-toast';


interface MessageProps {
  bio: string;
  ens: string;
  ethAddress: string;
  name: string;
  profileUrl: string;
  profilePic: string;
}

interface PeerData {
  bio: string;
  ens: string;
  ensData: {
    addresses: {
      [key: number]: string;
    };
    createdAt: string;
    name: string;
    owner: string;
    texts: {
      avatar: string;
    };
    updatedAt: string;
  };
  ethAddress: string;
  name: string;
  profilePic: string;
  profileUrl: string;
  _id: string;
}

const getAvatarSrc = (profilePic?: string) => {
  if (!profilePic) return '/default-avatar.png';
  return profilePic.startsWith('http')
    ? profilePic
    : `/assets/avatar/${profilePic}.png`;
};

const getPeerData = async (peerAddresses: string[]) => {
  if (!peerAddresses.length) return { data: [] };

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v2/desktop/wallet/getPeerData`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ peerAddresses }),
      }
    );

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching peer data:', error);
    return { data: [] };
  }
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

  const [walletData, setWalletData] = useState<WalletItem[] | null>(
    null
  );
  const [isWalletManagerOpen, setIsWalletManagerOpen] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<PeerData | null>(
    null
  );
  const [peerData, setPeerData] = useState<PeerData[]>([]);
  const [isLoadingPeerData, setIsLoadingPeerData] = useState(false);
  const [changeConversationLoading, setChangeConversationLoading] =
    useState(false);
  const [micrositeData, setMicrositeData] =
    useState<MessageProps | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<AnyConversation | null>(null);

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

  const peerAddresses = useMemo(() => {
    if (!conversations) return [];
    // We'll need to extract peer addresses asynchronously, so this will be handled differently
    // For now, return empty array and handle peer address extraction in useEffect
    return [];
  }, [conversations]);

  // Add useEffect to extract peer addresses properly
  useEffect(() => {
    const extractPeerAddresses = async () => {
      if (!conversations || !conversations.length) return;

      console.log('📝 [ChatPage] Extracting peer addresses from', conversations.length, 'conversations');

      const addresses: string[] = [];
      for (const convo of conversations) {
        try {
          const peerAddress = await safeGetPeerAddress(convo);
          if (peerAddress) {
            addresses.push(peerAddress);
          }
        } catch (error) {
          console.error('Error extracting peer address:', error);
        }
      }

      console.log('📝 [ChatPage] Extracted peer addresses:', addresses);
    };

    // Only extract addresses if we have conversations and they've changed
    if (conversations && conversations.length > 0) {
      extractPeerAddresses();
    }
  }, [conversations]);

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

        // Use simplified approach: try to find existing conversation or create new one
        console.log('🔍 [ChatPage] Looking for existing conversation...');
        console.log('🔍 [ChatPage] Available conversations:', {
          count: conversations?.length || 0,
          conversations: conversations?.map(c => ({
            id: (c as any).id,
            type: (c as any).conversationType || 'unknown',
            hasMembers: !!(c as any).members,
            memberCount: (c as any).members?.length || 0
          }))
        });

        // First, check if we have any existing conversations with this address
        let existingConversation = null;
        if (conversations && conversations.length > 0) {
          for (const conv of conversations) {
            const convAny = conv as any;
            console.log('🔍 [ChatPage] Checking conversation:', {
              id: convAny.id,
              members: convAny.members?.map((m: any) => ({
                inboxId: m.inboxId,
                accountAddresses: m.accountAddresses
              }))
            });

            // Check if this conversation involves the target address
            if (convAny.members && Array.isArray(convAny.members)) {
              const hasPeerAddress = convAny.members.some((member: any) =>
                member.accountAddresses?.some((addr: string) =>
                  addr.toLowerCase() === recipientAddress.toLowerCase()
                )
              );

              if (hasPeerAddress) {
                console.log('✅ [ChatPage] Found existing conversation with peer:', convAny.id);
                existingConversation = conv;
                break;
              }
            }

            // Also check direct peer address properties
            if (convAny.peerAddress === recipientAddress.toLowerCase() ||
              convAny.peer === recipientAddress.toLowerCase()) {
              console.log('✅ [ChatPage] Found existing conversation via direct peer match:', convAny.id);
              existingConversation = conv;
              break;
            }
          }
        }

        if (existingConversation) {
          console.log('✅ [ChatPage] Found existing conversation:', (existingConversation as any).id);
          setSelectedConversation(existingConversation);
        } else {
          console.log('🆕 [ChatPage] Creating new conversation with:', recipientAddress);
          const newConvo = await newConversation(recipientAddress);
          if (newConvo) {
            console.log('✅ [ChatPage] New conversation created:', {
              id: (newConvo as any).id,
              type: (newConvo as any).conversationType || 'unknown',
              members: (newConvo as any).members?.map((m: any) => ({
                inboxId: m.inboxId,
                accountAddresses: m.accountAddresses
              }))
            });
            setSelectedConversation(newConvo);
          } else {
            console.error('❌ [ChatPage] Failed to create new conversation');
            toast({
              title: 'Error',
              description: 'Failed to start conversation',
              variant: 'destructive',
            });
          }
        }

        // Set microsite data
        if (searchResult?.ethAddress === recipientAddress) {
          setMicrositeData(searchResult);
        } else {
          const micrositeInfo = peerData.find(
            (peer) => peer.ethAddress === recipientAddress
          );
          setMicrositeData(micrositeInfo || null);
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
    [xmtpClient, conversations, newConversation, toast, searchResult, peerData],
  );

  const fetchPeerData = useCallback(async () => {
    if (!peerAddresses.length) return;

    try {
      setIsLoadingPeerData(true);
      const response = await getPeerData(peerAddresses);
      if (response.data) {
        setPeerData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch peer data:', error);
    } finally {
      setIsLoadingPeerData(false);
    }
  }, [peerAddresses]);

  const debouncedFetchEnsData = useDebouncedCallback(
    async (searchTerm: string) => {
      if (!searchTerm) {
        setSearchResult(null);
        setIsSearchLoading(false);
        return;
      }

      setIsSearchLoading(true);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v4/wallet/getEnsAddress/${searchTerm}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch ENS data');
        }

        const data = await response.json();

        const info: PeerData = {
          profilePic: data.domainOwner.avatar,
          profileUrl: data.domainOwner.profileUrl,
          bio: data.domainOwner.bio,
          ens: data.name,
          ethAddress: data.owner,
          name: data.domainOwner.name,
          ensData: data,
          _id: data.domainOwner._id,
        };

        setSearchResult(info);
      } catch (err) {
        setSearchResult(null);
        console.error('ENS search error:', err);
      } finally {
        setIsSearchLoading(false);
      }
    },
    800
  );

  const filteredPeerData = useMemo(() => {
    if (!searchQuery.trim()) return peerData;

    return peerData.filter(
      (peer) =>
        peer.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        peer.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        peer.ethAddress
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
  }, [peerData, searchQuery]);

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
        const storedTokenData =
          sessionStorage.getItem('chatTokenData');
        if (storedTokenData) {
          const parsedTokenData = JSON.parse(storedTokenData);
          setTokenData(parsedTokenData);
        }
      } catch (error) {
        console.error(
          'Error retrieving token data from sessionStorage:',
          error
        );
      }
    }

    if (recipient) {
      handleSelectConversation(recipient);
    }
  }, [searchParams, handleSelectConversation]);

  // Fetch peer data when address list changes
  useEffect(() => {
    if (peerAddresses.length) {
      fetchPeerData();
    }
  }, [peerAddresses, fetchPeerData]);

  const handleWalletClick = async (ethAddress: string) => {
    await handleSelectConversation(ethAddress);
  };

  const handleSearchInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length > 2) {
      debouncedFetchEnsData(value);
    } else {
      setSearchResult(null);
    }
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
            {searchResult && (
              <div className="mb-4">
                <MessageList
                  {...searchResult}
                  handleWalletClick={handleWalletClick}
                  recipientAddress={micrositeData?.ethAddress ?? null}
                />
              </div>
            )}
            {isLoadingPeerData ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
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
            ) : (
              filteredPeerData.map((chat: MessageProps) => (
                <MessageList
                  key={chat.ethAddress}
                  {...chat}
                  handleWalletClick={handleWalletClick}
                  recipientAddress={micrositeData?.ethAddress ?? null}
                />
              ))
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
