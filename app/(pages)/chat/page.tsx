'use client';
import {
  BookUser,
  Loader,
  Search,
  Wallet,
  ArrowLeft,
  MessageSquare,
  Users,
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
import { useSocketChat } from '@/lib/context/SocketChatContext';
import ChatBox from '@/components/wallet/chat/chat-box';
import GroupChatBox from '@/components/wallet/chat/group-chat-box';
import GroupChatList from '@/components/wallet/chat/group-chat-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { resolveEnsToUserId } from '@/lib/api/ensResolver';
import { resolveAddressToEnsCached } from '@/lib/api/reverseEnsResolver';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

const getAvatarSrc = (profilePic?: string) => {
  if (!profilePic) return '/default-avatar.png';
  return profilePic.startsWith('http')
    ? profilePic
    : `/assets/avatar/${profilePic}.png`;
};

const ChatPageContent = () => {
  const {
    socket,
    isConnected,
    loading: socketLoading,
    error: socketError,
    conversations,
    createConversation,
    refreshConversations,
    searchUsers,
  } = useSocketChat();
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
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [changeConversationLoading, setChangeConversationLoading] =
    useState(false);
  const [micrositeData, setMicrositeData] = useState<any | null>(
    null
  );
  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<
    string | null
  >(null);
  const [selectedGroupId, setSelectedGroupId] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState<string>('direct');

  // Debug Socket state
  useEffect(() => {
    console.log('🔍 [ChatPage] Socket State:', {
      hasSocket: !!socket,
      isConnected,
      isLoading: socketLoading,
      hasError: !!socketError,
      errorMessage: socketError?.message,
      conversationCount: conversations?.length || 0,
      hasPrivyUser: !!PrivyUser,
      privyWallets:
        PrivyUser?.linkedAccounts?.filter((a) => a.type === 'wallet')
          ?.length || 0,
    });
  }, [
    socket,
    isConnected,
    socketLoading,
    socketError,
    conversations,
    PrivyUser,
  ]);

  // Manual retry function
  const handleRetryConnection = async () => {
    console.log('🔄 [ChatPage] Manual socket retry requested');
    try {
      await refreshConversations();
      toast({
        title: 'Success',
        description: 'Chat connection refreshed successfully!',
      });
    } catch (error) {
      console.error('❌ [ChatPage] Manual retry failed:', error);
      toast({
        title: 'Error',
        description:
          'Failed to refresh chat connection. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Filter and deduplicate conversations based on search
  const filteredConversations = useMemo(() => {
    // First, deduplicate conversations by peer address
    const uniqueConversations = conversations.reduce((acc, conv) => {
      const existingIndex = acc.findIndex(
        (existing) => existing.peerAddress === conv.peerAddress
      );
      if (existingIndex === -1) {
        acc.push(conv);
      } else {
        // Keep the conversation with more recent activity
        if (
          new Date(conv.lastMessageTime || 0) >
          new Date(acc[existingIndex].lastMessageTime || 0)
        ) {
          acc[existingIndex] = conv;
        }
      }
      return acc;
    }, [] as typeof conversations);

    // Then filter by search query
    if (!searchQuery.trim()) return uniqueConversations;

    return uniqueConversations.filter(
      (conv) =>
        conv.peerAddress
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        conv.displayName
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

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
      wallets: linkWallet,
    });
  }, [PrivyUser]);

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    async (recipientAddress: string) => {
      if (!recipientAddress || !PrivyUser?.id) {
        console.log(
          '⚠️ [ChatPage] Cannot select conversation - missing params'
        );
        return;
      }

      console.log(
        '🎯 [ChatPage] Selecting conversation with:',
        recipientAddress
      );

      try {
        setChangeConversationLoading(true);
        setSelectedConversationId(null);

        // Check if this is an ENS name that needs resolution
        let resolvedRecipient = recipientAddress;
        const isEns =
          recipientAddress.includes('.') &&
          (recipientAddress.endsWith('.eth') ||
            recipientAddress.endsWith('.swop.id'));

        // Resolve ENS name to actual user ID if needed
        if (isEns) {
          console.log(
            '🔍 [ChatPage] Resolving ENS name:',
            recipientAddress
          );
          const userId = await resolveEnsToUserId(recipientAddress);

          if (!userId) {
            console.error(
              '❌ [ChatPage] Failed to resolve ENS name:',
              recipientAddress
            );
            toast({
              title: 'Error',
              description: `Could not find user with ENS name: ${recipientAddress}`,
              variant: 'destructive',
            });
            setChangeConversationLoading(false);
            return;
          }

          console.log(
            `✅ [ChatPage] Resolved ENS ${recipientAddress} to user ID: ${userId}`
          );
          resolvedRecipient = userId;
        }

        // Create or find conversation with the resolved recipient ID
        const conversationId = await createConversation(
          resolvedRecipient
        );

        setSelectedConversationId(conversationId);
        setSelectedRecipientId(resolvedRecipient);

        // Find user data from search results to use display name and profile info
        let userData = null;

        // Look for user in recent search results
        if (searchResults.length > 0) {
          userData = searchResults.find(
            (user) =>
              user.userId === resolvedRecipient ||
              user.ethAddress === resolvedRecipient ||
              user.ensName === recipientAddress
          );
        }

        // If not found in search results but we have a single search result, use that
        if (
          !userData &&
          searchResult &&
          (searchResult.ethAddress === resolvedRecipient ||
            searchResult.ensName === recipientAddress)
        ) {
          userData = searchResult;
        }

        // Display the best available name and info
        const displayName =
          userData?.displayName ||
          userData?.name ||
          (isEns
            ? recipientAddress
            : `${resolvedRecipient.substring(
                0,
                6
              )}...${resolvedRecipient.substring(
                resolvedRecipient.length - 4
              )}`);

        setMicrositeData({
          name: displayName,
          ethAddress: resolvedRecipient, // Store the resolved ID
          bio: userData?.bio || '',
          ens: userData?.ensName || (isEns ? recipientAddress : ''),
          profilePic: userData?.profilePic || '',
          profileUrl: userData?.profileUrl || '',
        });
      } catch (error) {
        console.error(
          '❌ [ChatPage] Error selecting conversation:',
          error
        );
        toast({
          title: 'Error',
          description: 'Failed to start conversation',
          variant: 'destructive',
        });
      } finally {
        setChangeConversationLoading(false);
      }
    },
    [
      PrivyUser?.id,
      createConversation,
      toast,
      searchResults,
      searchResult,
    ]
  );

  // Handle user search using the socket server
  const handleUserSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setSearchResults([]);
        setSearchResult(null);
        return;
      }

      setIsSearchLoading(true);
      try {
        console.log('🔍 Searching for users with query:', query);
        const results = await searchUsers(query);
        console.log('🔍 Search results:', results);

        if (results && results.length > 0) {
          setSearchResults(results);
          setSearchResult(null); // Clear single search result
        } else {
          // If no server results, create a fallback result
          setSearchResults([]);
          if (query.startsWith('0x') && query.length >= 6) {
            setSearchResult({
              name:
                query.length > 10
                  ? `${query.substring(0, 6)}...${query.substring(
                      query.length - 4
                    )}`
                  : query,
              ethAddress: query,
              displayName:
                query.length > 10
                  ? `${query.substring(0, 6)}...${query.substring(
                      query.length - 4
                    )}`
                  : query,
              bio: 'Click to start conversation',
              ensName: '',
              profilePic: '',
            });
          } else if (
            query.includes('.eth') ||
            query.includes('.swop.id')
          ) {
            setSearchResult({
              name: query,
              ethAddress: query,
              displayName: query,
              bio: 'ENS name - Click to start conversation',
              ensName: query,
              profilePic: '',
            });
          } else {
            setSearchResult({
              name: query,
              ethAddress: query,
              displayName: query,
              bio: 'Search by username - Click to start conversation',
              ensName: '',
              profilePic: '',
            });
          }
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
        setSearchResult(null);
        toast({
          title: 'Search Error',
          description: 'Unable to search users. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSearchLoading(false);
      }
    },
    [searchUsers, toast]
  );

  // Handle search input change with debounce
  const handleSearchInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear previous results immediately
    setSearchResults([]);
    setSearchResult(null);
  };

  // Debounced search effect
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        handleUserSearch(searchQuery);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setSearchResult(null);
    }
  }, [searchQuery, handleUserSearch]);

  // Handle recipient or group from URL params
  useEffect(() => {
    const recipient = searchParams?.get('recipient');
    const groupId = searchParams?.get('groupId');

    if (recipient) {
      handleSelectConversation(recipient);
      setActiveTab('direct');
      setSelectedGroupId(null);
    } else if (groupId) {
      setSelectedGroupId(groupId);
      setActiveTab('groups');
      // Reset direct chat state
      setSelectedConversationId(null);
      setSelectedRecipientId(null);
      setMicrositeData(null);
    }
  }, [searchParams, handleSelectConversation]);

  const handleWalletClick = async (userIdentifier: string) => {
    console.log(
      '🔍 Starting conversation with user identifier:',
      userIdentifier
    );
    await handleSelectConversation(userIdentifier);
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
          {socketLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                <p className="text-gray-600">
                  Connecting to chat server...
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Check browser console for detailed logs
                </p>
              </div>
            </div>
          ) : socketError ? (
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="text-center max-w-md">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-red-800 mb-2">
                    Chat Connection Error
                  </h3>
                  <p className="text-red-600 text-sm mb-4">
                    {socketError.message}
                  </p>
                  <button
                    onClick={handleRetryConnection}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  <p>Check browser console for detailed error logs</p>
                  <p>
                    Make sure your wallet is connected and try again
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-hidden h-full">
              {/* Show back button if a chat is selected */}
              {(micrositeData || selectedGroupId) && (
                <div className="flex items-center gap-3 justify-between border rounded-xl border-gray-300 bg-white px-4 py-2 sticky top-0 left-0 mb-2 shadow-sm">
                  <div className="flex items-center flex-1 gap-3">
                    <button
                      onClick={handleBackToWallet}
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                      title="Back to Wallet"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    {micrositeData && (
                      <>
                        <Avatar>
                          <AvatarImage
                            src={getAvatarSrc(
                              micrositeData.profilePic
                            )}
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
                      </>
                    )}
                  </div>
                  {micrositeData && (
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
                  )}
                </div>
              )}

              <div className="h-[calc(100vh-200px)]">
                {changeConversationLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                      <p className="text-gray-600">
                        Loading conversation...
                      </p>
                    </div>
                  </div>
                ) : !micrositeData && !selectedGroupId ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <p className="mb-2">
                        Select a conversation to start chatting
                      </p>
                      {!isConnected && (
                        <button
                          onClick={handleRetryConnection}
                          className="text-blue-600 hover:text-blue-700 text-sm underline"
                        >
                          Connect to Chat Server
                        </button>
                      )}
                    </div>
                  </div>
                ) : isConnected &&
                  selectedConversationId &&
                  selectedRecipientId ? (
                  <ChatBox
                    conversationId={selectedConversationId}
                    recipientId={selectedRecipientId}
                  />
                ) : isConnected && selectedGroupId ? (
                  <GroupChatBox groupId={selectedGroupId} />
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="w-[38%] bg-white rounded-xl px-4 py-4 flex gap-3 flex-col">
          <Tabs
            defaultValue={activeTab}
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger
                value="direct"
                className="flex items-center gap-1"
              >
                <MessageSquare size={16} />
                <span>Direct Messages</span>
              </TabsTrigger>
              <TabsTrigger
                value="groups"
                className="flex items-center gap-1"
              >
                <Users size={16} />
                <span>Groups</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="mt-0">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
                  size={18}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  placeholder="Search users by username..."
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-lg focus:outline-none pl-10 py-2 text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                />
              </div>

              <div className="h-[calc(100vh-300px)] overflow-y-auto mt-4">
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

                {/* Show server search results */}
                {searchResults.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-gray-400 px-3 py-1 border-b">
                      Search Results
                    </div>
                    {searchResults.map((user) => (
                      <MessageList
                        key={`search-${
                          user.userId ||
                          user.ethAddress ||
                          user.ensName
                        }`}
                        bio={
                          user.bio || 'Click to start conversation'
                        }
                        name={
                          user.displayName ||
                          user.ensName ||
                          user.name ||
                          'Unknown'
                        }
                        profilePic={user.profilePic || ''}
                        ethAddress={
                          user.userId ||
                          user.ethAddress ||
                          user.ensName
                        }
                        handleWalletClick={handleWalletClick}
                      />
                    ))}
                  </div>
                )}

                {/* Show fallback search result as new conversation option (if exists and not already in conversations) */}
                {searchResult &&
                  searchResults.length === 0 &&
                  !filteredConversations.some(
                    (conv) =>
                      conv.peerAddress.toLowerCase() ===
                      searchResult.ethAddress.toLowerCase()
                  ) && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-400 px-3 py-1 border-b">
                        New Conversation
                      </div>
                      <MessageList
                        key={`search-${searchResult.ethAddress}`}
                        bio={searchResult.bio}
                        name={
                          searchResult.displayName ||
                          searchResult.name
                        }
                        profilePic={searchResult.profilePic}
                        ethAddress={searchResult.ethAddress}
                        handleWalletClick={handleWalletClick}
                      />
                    </div>
                  )}

                {/* Show existing conversations */}
                {filteredConversations.length > 0 && (
                  <div className="mb-2">
                    {searchQuery.trim() && (
                      <div className="text-xs text-gray-400 px-3 py-1 border-b">
                        Existing Conversations
                      </div>
                    )}
                    {filteredConversations.map((conv) => (
                      <MessageList
                        key={conv.conversationId || conv.peerAddress}
                        bio={
                          conv.lastMessage || 'No messages yet'
                        }
                        name={
                          conv.displayName ||
                          `${conv.peerAddress.substring(
                            0,
                            6
                          )}...${conv.peerAddress.substring(
                            conv.peerAddress.length - 4
                          )}`
                        }
                        profilePic=""
                        ethAddress={conv.peerAddress}
                        handleWalletClick={handleWalletClick}
                      />
                    ))}
                  </div>
                )}

                {/* Show message when no results found */}
                {!searchResult &&
                  searchResults.length === 0 &&
                  filteredConversations.length === 0 &&
                  searchQuery.trim() &&
                  !isSearchLoading && (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <p>No users found</p>
                        <p className="text-sm text-gray-400">
                          Try searching by username, ENS name, or
                          Ethereum address
                        </p>
                      </div>
                    </div>
                  )}

                {/* Show message when no conversations exist and no search */}
                {!searchQuery.trim() &&
                  filteredConversations.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      <div className="text-center">
                        <p>No conversations yet</p>
                        <p className="text-sm text-gray-400">
                          Search for an address to start chatting
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </TabsContent>

            <TabsContent value="groups" className="mt-0">
              <GroupChatList tokens={walletData} />
            </TabsContent>
          </Tabs>
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
}: {
  bio: string;
  name: string;
  profilePic: string;
  ethAddress: string;
  handleWalletClick: (ethAddress: string) => Promise<void>;
}) => {
  const [resolvedName, setResolvedName] = useState(name);
  const [isResolving, setIsResolving] = useState(false);

  // Resolve address to ENS name on mount if needed
  useEffect(() => {
    const resolveEnsName = async () => {
      // Only resolve if the current name looks like an address/ID
      if (
        (name.startsWith('did:privy:') || 
         name.startsWith('0x') || 
         name.includes('...')) &&
        !name.includes('.eth') &&
        !name.includes('.swop.id')
      ) {
        setIsResolving(true);
        try {
          const ensName = await resolveAddressToEnsCached(ethAddress);
          setResolvedName(ensName);
        } catch (error) {
          console.error('Failed to resolve ENS name:', error);
        } finally {
          setIsResolving(false);
        }
      }
    };

    resolveEnsName();
  }, [name, ethAddress]);

  return (
    <div
      onClick={() => handleWalletClick(ethAddress)}
      className="text-black flex items-center justify-between p-3 rounded-lg cursor-pointer border hover:bg-gray-50 transition-colors mb-2"
    >
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage
            src={getAvatarSrc(profilePic)}
            alt={`${resolvedName}'s avatar`}
          />
          <AvatarFallback>{resolvedName?.slice(0, 2) || 'AN'}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">
            {isResolving ? (
              <span className="text-gray-400">Resolving...</span>
            ) : (
              resolvedName
            )}
          </p>
          {bio && (
            <p className="text-sm text-gray-500 line-clamp-1">
              {bio === 'No messages yet' || bio === 'Start a conversation' 
                ? 'No messages yet' 
                : bio}
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
