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
import { useNewSocketChat } from '@/lib/context/NewSocketChatContext';
import NewChatBox from '@/components/wallet/chat/new-chat-box';
import GroupChatBox from '@/components/wallet/chat/group-chat-box';
import AstroChatBox from '@/components/wallet/chat/astro-chat-box';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { resolveEnsToUserId } from '@/lib/api/ensResolver';
import { resolveAddressToEnsCached } from '@/lib/api/reverseEnsResolver';
import { getEnsDataUsingEns } from '@/actions/getEnsData';

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
    groups,
    refreshConversations,
    refreshGroups,
    searchContacts,
    getConversations,
    getUserGroups,
    selectGroup,
    currentChatType,
    currentGroupId,
    currentGroupInfo,
    isInGroupWithBots,
  } = useNewSocketChat(); // get socket data

  const { user: PrivyUser } = usePrivy();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  console.log('conversations', conversations);
  console.log('groups', groups);

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

  // Periodic conversation refresh when connected (every 30s), with immediate load
  useEffect(() => {
    if (!isConnected) return;
    let intervalId: NodeJS.Timeout | null = null;

    // immediate refresh mirroring reference HTML behavior
    refreshConversations();

    intervalId = setInterval(() => {
      refreshConversations();
    }, 30000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isConnected, refreshConversations]);

  // Manual retry function with enhanced conversation loading
  const handleRetryConnection = async () => {
    console.log('🔄 [ChatPage] Manual socket retry requested');
    try {
      // Try the new getConversations method first
      const conversationsResult = await getConversations(1, 20);
      if (conversationsResult.success) {
        console.log(
          '🔄 [ChatPage] Conversations loaded via new method'
        );
      } else {
        // Fallback to original method
        await refreshConversations();
      }

      // Also load groups
      const groupsResult = await getUserGroups(1, 20);
      if (groupsResult.success) {
        console.log('🔄 [ChatPage] Groups loaded via new method');
      } else {
        // Fallback to original method
        await refreshGroups();
      }

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

  // Combine and filter conversations and groups based on search
  const combinedChats = useMemo(() => {
    // Combine conversations and groups into a unified list
    const allItems: Array<{
      type: 'direct' | 'group' | 'astro';
      data: any;
      lastActivity: Date;
    }> = [];

    // Add Astro AI bot at the top (pinned)
    allItems.push({
      type: 'astro',
      data: {
        _id: 'astro-bot',
        name: 'Astro',
        bio: 'Your AI-powered Solana assistant',
        profilePic: '',
        isPinned: true,
      },
      lastActivity: new Date(), // Always at top
    });

    // Add conversations
    conversations.forEach(c => {
      allItems.push({
        type: 'direct',
        data: c,
        lastActivity: c.lastMessage?.createdAt ? new Date(c.lastMessage.createdAt) : new Date(0)
      });
    });

    // Add groups
    groups.forEach(g => {
      allItems.push({
        type: 'group',
        data: g,
        lastActivity: g.lastMessage?.createdAt ? new Date(g.lastMessage.createdAt) : new Date(0)
      });
    });

    // Sort by last activity (most recent first), but keep Astro at top
    const astro = allItems.shift(); // Remove Astro temporarily
    allItems.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    if (astro) allItems.unshift(astro); // Add Astro back at top

    return allItems;
  }, [conversations, groups]);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return combinedChats;

    return combinedChats.filter((item) => {
      if (item.type === 'astro') {
        // Astro bot is searchable by name "astro" or "ai"
        const query = searchQuery.toLowerCase();
        return (
          'astro'.includes(query) ||
          'ai'.includes(query) ||
          'assistant'.includes(query) ||
          'bot'.includes(query)
        );
      } else if (item.type === 'direct') {
        const conv = item.data;
        const participant = conv.participant || conv.participants?.[0];
        const name = participant?.name || conv.title || '';
        const email = participant?.email || '';
        const micrositeName = conv.microsite?.name || '';
        const micrositeUsername = conv.microsite?.username || '';
        const micrositeEns = conv.microsite?.ens || '';

        const query = searchQuery.toLowerCase();
        return (
          name.toLowerCase().includes(query) ||
          email.toLowerCase().includes(query) ||
          micrositeName.toLowerCase().includes(query) ||
          micrositeUsername.toLowerCase().includes(query) ||
          micrositeEns.toLowerCase().includes(query)
        );
      } else {
        const group = item.data;
        const query = searchQuery.toLowerCase();
        return (
          group.name.toLowerCase().includes(query) ||
          (group.description && group.description.toLowerCase().includes(query))
        );
      }
    });
  }, [combinedChats, searchQuery]);

  console.log('filteredChats', filteredChats);

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
    async (recipientAddress: string, conversationData?: any) => {
      console.log('recipientAddress', recipientAddress);
      console.log('conversationData', conversationData);

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

        // For the new backend, we don't need to create conversations upfront
        // The backend will handle conversation creation automatically when sending messages
        console.log(
          '🎯 [ChatPage] Selecting conversation with:',
          resolvedRecipient
        );
        const conversationId = `${PrivyUser.id}_${resolvedRecipient}`;

        // Log if there was a mismatch between provided and created conversation IDs
        if (
          conversationData &&
          conversationData.conversationId &&
          conversationData.conversationId !== conversationId
        ) {
          console.warn(
            '⚠️ [ChatPage] Conversation ID mismatch detected:',
            'provided:',
            conversationData.conversationId,
            'created:',
            conversationId,
            'Using created ID for security'
          );
        }

        setSelectedConversationId(conversationId);
        setSelectedRecipientId(resolvedRecipient);

        // Use conversation data if available (from existing conversations with ENS names)
        let userData = null;
        let displayName = 'Unknown';
        let ensName = '';

        // Priority 1: Use provided conversation data (from socket server with ENS)
        if (conversationData) {
          console.log(
            '🎯 [ChatPage] Using conversation data:',
            conversationData
          );
          displayName =
            conversationData.displayName || conversationData.name;
          ensName =
            conversationData.ensName ||
            conversationData.peerEnsName ||
            '';
          userData = {
            displayName: conversationData.displayName,
            name: conversationData.name,
            ensName: ensName,
            bio: conversationData.bio || '',
            profilePic: conversationData.profilePic || '',
            profileUrl: conversationData.profileUrl || '',
          };
        } else {
          // Priority 2: Look for user in recent search results
          if (searchResults.length > 0) {
            userData = searchResults.find(
              (user) =>
                user.userId === resolvedRecipient ||
                user.ethAddress === resolvedRecipient ||
                user.ensName === recipientAddress
            );
          }

          // Priority 3: If not found in search results but we have a single search result, use that
          if (
            !userData &&
            searchResult &&
            (searchResult.ethAddress === resolvedRecipient ||
              searchResult.ensName === recipientAddress)
          ) {
            userData = searchResult;
          }

          // Set display name and ENS name
          if (userData) {
            displayName =
              userData.displayName ||
              userData.name ||
              userData.ensName ||
              'Unknown';
            ensName =
              userData.ensName || (isEns ? recipientAddress : '');
          } else {
            displayName = isEns
              ? recipientAddress
              : `${resolvedRecipient.substring(
                  0,
                  6
                )}...${resolvedRecipient.substring(
                  resolvedRecipient.length - 4
                )}`;
            ensName = isEns ? recipientAddress : '';
          }
        }

        console.log(
          `🎯 [ChatPage] Setting micrositeData: displayName=${displayName}, ensName=${ensName}`
        );

        setMicrositeData({
          name: displayName,
          ethAddress: resolvedRecipient, // Store the resolved ID
          bio: userData?.bio || '',
          ens: ensName,
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
    [PrivyUser?.id, toast, searchResults, searchResult]
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

  // Debounced search effect with enhanced socket search
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(async () => {
        setIsSearchLoading(true);

        try {
          // Try the new socket-based search first
          const contactsResult = await searchContacts(searchQuery, 8);
          if (
            contactsResult.success &&
            contactsResult.results &&
            contactsResult.results.length > 0
          ) {
            console.log(
              'Socket search results:',
              contactsResult.results
            );
            setSearchResults(contactsResult.results);
            setSearchResult(null);
          } else {
            // Fallback to ENS search if socket search fails or returns no results
            console.log('Falling back to ENS search');
            const data = await getEnsDataUsingEns(searchQuery);
            if (!data?.message) {
              setSearchResult({
                name: data?.name || data?.domainOwner?.name || 'N/A',
                ethAddress: data?.owner || data?.addresses[60],
                displayName:
                  data?.name || data?.domainOwner?.name || 'N/A',
                bio:
                  data?.domainOwner?.bio ||
                  'N/A' ||
                  'ENS name - Click to start conversation',
                ensName: data?.name || searchQuery,
                profilePic: data?.domainOwner?.avatar,
              });
            }
            setSearchResults([]);
            console.log('ENS search result:', data);
          }
        } catch (error) {
          console.error('Search failed:', error);
          // Fallback to ENS search on error
          const data = await getEnsDataUsingEns(searchQuery);
          if (!data?.message) {
            setSearchResult({
              name: data?.name || data?.domainOwner?.name || 'N/A',
              ethAddress: data?.owner || data?.addresses[60],
              displayName:
                data?.name || data?.domainOwner?.name || 'N/A',
              bio:
                data?.domainOwner?.bio ||
                'N/A' ||
                'ENS name - Click to start conversation',
              ensName: data?.name || searchQuery,
              profilePic: data?.domainOwner?.avatar,
            });
          }
          setSearchResults([]);
        } finally {
          setIsSearchLoading(false);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setSearchResult(null);
    }
  }, [searchQuery, searchContacts]);

  // Handle recipient from URL params
  useEffect(() => {
    const recipient = searchParams?.get('recipient');

    if (recipient) {
      handleSelectConversation(recipient);
    }
  }, [searchParams, handleSelectConversation]);

  const handleWalletClick = async (
    userIdentifier: string,
    conversationData?: any
  ) => {
    console.log(
      '🔍 Starting conversation with user identifier:',
      userIdentifier,
      'conversationData:',
      conversationData
    );
    await handleSelectConversation(userIdentifier, conversationData);
  };

  const handleAstroClick = () => {
    console.log('🤖 Selecting Astro AI bot');
    setSelectedConversationId('astro-bot');
    setSelectedRecipientId(null);
    setMicrositeData({
      name: 'Astro',
      ethAddress: 'astro-bot',
      bio: 'AI-powered Solana assistant',
      ens: '',
      profilePic: '',
      profileUrl: '',
    });
    selectGroup(null as any);
  };

  const handleGroupClick = async (group: any) => {
    console.log('🔍 Selecting group:', group);

    try {
      setChangeConversationLoading(true);

      // Set group as selected using context method
      selectGroup(group);

      // Update microsite data for group chat header
      setMicrositeData({
        name: group.name,
        ethAddress: group._id,
        bio: group.description || `Group with ${group.participants?.length || 0} members`,
        ens: '',
        profilePic: '',
        profileUrl: '',
      });

      setSelectedConversationId(group._id);
      setSelectedRecipientId(null); // Clear direct recipient for group chat

    } catch (error) {
      console.error('❌ [ChatPage] Error selecting group:', error);
      toast({
        title: 'Error',
        description: 'Failed to select group',
        variant: 'destructive',
      });
    } finally {
      setChangeConversationLoading(false);
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
          className="w-[62%] bg-white rounded-xl relative shadow-sm border border-gray-100"
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
              {/* WhatsApp-style chat header */}
              {micrositeData && (
                <div className="flex items-center gap-3 justify-between border-b border-gray-200 bg-white px-4 py-3 sticky top-0 left-0 z-10 shadow-sm">
                  <div className="flex items-center flex-1 gap-3">
                    <button
                      onClick={handleBackToWallet}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-transparent hover:bg-gray-100 transition-colors"
                      title="Back to Wallet"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    {micrositeData && (
                      <>
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={getAvatarSrc(
                                micrositeData.profilePic
                              )}
                              alt={`${micrositeData.name}'s avatar`}
                            />
                            <AvatarFallback className="bg-blue-500 text-white font-medium">
                              {micrositeData.name?.slice(0, 2) || 'AN'}
                            </AvatarFallback>
                          </Avatar>
                          {currentChatType === 'group' && isInGroupWithBots && (
                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                              🤖
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h1 className="font-semibold text-gray-900 leading-tight">
                            {micrositeData.name}
                          </h1>
                          <p className="text-green-600 text-xs font-medium">
                            {currentChatType === 'group'
                              ? `${currentGroupInfo?.participants?.length || 0} members`
                              : micrositeData.ens || 'online'
                            }
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  {micrositeData && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setIsWalletManagerOpen(true)}
                        className="w-9 h-9 rounded-full flex items-center justify-center bg-transparent hover:bg-gray-100 transition-colors"
                        title="Wallet Manager"
                      >
                        <Wallet className="w-5 h-5 text-gray-600" />
                      </button>
                      {currentChatType !== 'group' && (
                        <Link
                          href={
                            micrositeData.profileUrl ||
                            `/${micrositeData.ens}`
                          }
                          target="_blank"
                          className="w-9 h-9 rounded-full flex items-center justify-center bg-transparent hover:bg-gray-100 transition-colors"
                          title="View Profile"
                        >
                          <BookUser className="w-5 h-5 text-gray-600" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="h-[calc(100vh-200px)] bg-gray-50/30">
                {changeConversationLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                      <p className="text-gray-600">
                        Loading conversation...
                      </p>
                    </div>
                  </div>
                ) : !micrositeData ? (
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
                ) : isConnected && selectedConversationId ? (
                  selectedConversationId === 'astro-bot' ? (
                    <AstroChatBox />
                  ) : currentChatType === 'group' && currentGroupId ? (
                    <GroupChatBox groupId={currentGroupId} />
                  ) : selectedRecipientId ? (
                    <NewChatBox
                      conversationId={selectedConversationId}
                      receiverId={selectedRecipientId}
                    />
                  ) : null
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="w-[38%] bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex flex-col h-full">
            {/* WhatsApp-style sidebar header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Chats</h2>
              <button
                onClick={() => {
                  toast({
                    title: 'Create Group',
                    description: 'Group creation feature coming soon!',
                  });
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-green-500 hover:bg-green-600 transition-colors text-white"
                title="New Group"
              >
                ➕
              </button>
            </div>

            {/* Search bar */}
            <div className="px-4 py-3">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={16}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  placeholder="Search or start new chat"
                  className="w-full border-0 bg-gray-100 rounded-full focus:outline-none pl-10 pr-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto">
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
                    <div className="text-xs text-gray-500 px-4 py-2 bg-gray-50 font-medium">
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
                        conversationData={user}
                      />
                    ))}
                  </div>
                )}

                {/* Show fallback search result as new conversation option (if exists and not already in conversations) */}
                {searchResult &&
                  searchResults.length === 0 &&
                  !filteredChats.some((item) => {
                    if (item.type !== 'direct') return false;
                    const conv = item.data;
                    const participant =
                      conv.participant || conv.participants?.[0];
                    const id =
                      (participant?._id as unknown as string) ||
                      (conv.microsite
                        ?.parentId as unknown as string) ||
                      '';
                    return (
                      typeof id === 'string' &&
                      typeof searchResult.ethAddress === 'string' &&
                      id.toLowerCase() ===
                        searchResult.ethAddress.toLowerCase()
                    );
                  }) && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-500 px-4 py-2 bg-gray-50 font-medium">
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
                        conversationData={searchResult}
                      />
                    </div>
                  )}

                {/* Show existing conversations and groups */}
                {filteredChats.length > 0 && (
                  <div className="mb-2">
                    {searchQuery.trim() && (
                      <div className="text-xs text-gray-500 px-4 py-2 bg-gray-50 font-medium">
                        Recent Chats
                      </div>
                    )}
                    {filteredChats.map((item) => {
                      if (item.type === 'astro') {
                        return (
                          <AstroList
                            key="astro-bot"
                            handleAstroClick={handleAstroClick}
                            isSelected={selectedConversationId === 'astro-bot'}
                          />
                        );
                      } else if (item.type === 'direct') {
                        const conv = item.data;
                        const participant =
                          conv.participant || conv.participants?.[0];
                        const displayName =
                          participant?.name ||
                          conv.microsite?.name ||
                          conv.title ||
                          'Unknown';
                        const lastMessage =
                          conv.lastMessage?.message ||
                          'No messages yet';
                        const profilePic =
                          participant?.profilePic ||
                          conv.microsite?.profilePic ||
                          '';
                        const userIdentifier =
                          participant?._id ||
                          conv.microsite?.parentId ||
                          conv._id;

                        return (
                          <MessageList
                            key={`direct-${conv._id}`}
                            bio={lastMessage}
                            name={displayName}
                            profilePic={profilePic}
                            ethAddress={userIdentifier}
                            handleWalletClick={handleWalletClick}
                            conversationData={conv}
                          />
                        );
                      } else {
                        const group = item.data;
                        const memberCount = group.participants?.length || 0;
                        const hasBot = group.botUsers && group.botUsers.length > 0;
                        const lastMessage = group.lastMessage
                          ? `${group.lastMessage.sender?.name || 'Someone'}: ${group.lastMessage.message}`
                          : 'No messages yet';

                        return (
                          <GroupList
                            key={`group-${group._id}`}
                            group={group}
                            memberCount={memberCount}
                            hasBot={hasBot}
                            lastMessage={lastMessage}
                            handleGroupClick={handleGroupClick}
                            isSelected={currentGroupId === group._id}
                          />
                        );
                      }
                    })}
                  </div>
                )}

                {/* Show message when no results found */}
                {!searchResult &&
                  searchResults.length === 0 &&
                  filteredChats.length === 0 &&
                  searchQuery.trim() &&
                  !isSearchLoading && (
                    <div className="flex items-center justify-center h-32 text-gray-500 px-4">
                      <div className="text-center">
                        <p className="text-sm">No chats found</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Try searching by username, group name, or ENS
                        </p>
                      </div>
                    </div>
                  )}

                {/* Show message when no conversations exist and no search */}
                {!searchQuery.trim() &&
                  filteredChats.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-gray-500 px-4">
                      <div className="text-center">
                        <p className="text-sm">No chats yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Search for a user to start chatting
                        </p>
                      </div>
                    </div>
                  )}
            </div>
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
  conversationData,
}: {
  bio: string;
  name: string;
  profilePic: string;
  ethAddress: string;
  handleWalletClick: (
    ethAddress: string,
    conversationData?: any
  ) => Promise<void>;
  conversationData?: any;
}) => {
  const [resolvedName, setResolvedName] = useState(name);
  const [isResolving, setIsResolving] = useState(false);

  // Resolve address to ENS name on mount if needed
  useEffect(() => {
    const resolveEnsName = async () => {
      // Always try to resolve if the name looks like an address/ID or contains ellipsis
      if (
        (name.startsWith('did:privy:') ||
          name.startsWith('0x') ||
          name.includes('...') ||
          name.match(/^[a-zA-Z0-9]{8,12}\.\.\./) ||
          name === 'Unknown') &&
        !name.includes('.eth') &&
        !name.includes('.swop.id')
      ) {
        setIsResolving(true);
        try {
          console.log(
            `[MessageList] Resolving ENS for: ${ethAddress} (display: ${name})`
          );
          const ensName = await resolveAddressToEnsCached(ethAddress);
          console.log(`[MessageList] Resolved to: ${ensName}`);
          if (ensName !== ethAddress && ensName !== name) {
            setResolvedName(ensName);
          }
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
      onClick={() => handleWalletClick(ethAddress, conversationData)}
      className="text-black flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100/50 last:border-b-0"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={getAvatarSrc(profilePic)}
              alt={`${resolvedName}'s avatar`}
            />
            <AvatarFallback className="bg-gray-300 text-gray-700 font-medium">
              {resolvedName?.slice(0, 2) || 'AN'}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900 truncate">
              {isResolving ? (
                <span className="text-gray-400">Resolving...</span>
              ) : (
                resolvedName
              )}
            </p>
            <span className="text-xs text-gray-500 ml-2">12:34</span>
          </div>
          {bio && (
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {bio === 'No messages yet' ||
              bio === 'Start a conversation'
                ? 'Tap to start chatting'
                : bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const GroupList = ({
  group,
  memberCount,
  hasBot,
  lastMessage,
  handleGroupClick,
  isSelected = false,
}: {
  group: any;
  memberCount: number;
  hasBot: boolean;
  lastMessage: string;
  handleGroupClick: (group: any) => Promise<void>;
  isSelected?: boolean;
}) => {
  // Generate group avatar color
  const groupColors = ['#ff9800', '#9c27b0', '#e91e63', '#f44336', '#ff5722', '#795548', '#607d8b'];
  const colorIndex = group.name.charCodeAt(0) % groupColors.length;
  const groupBgColor = groupColors[colorIndex];

  return (
    <div
      onClick={() => handleGroupClick(group)}
      className={`text-black flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-gray-100/50 last:border-b-0 ${
        isSelected ? 'bg-green-50 border-l-4 border-l-green-500' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="relative">
          <div
            style={{ backgroundColor: groupBgColor }}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
          >
            👥
          </div>
          {hasBot && (
            <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
              🤖
            </div>
          )}
          {group.settings?.isPublic && (
            <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white bg-orange-400 flex items-center justify-center">
              <span className="text-xs">🌍</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <p className="font-medium text-gray-900 truncate">{group.name}</p>
              {hasBot && (
                <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                  Bot
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 ml-2">12:34</span>
          </div>
          <p className="text-sm text-gray-500 truncate mt-0.5">
            {memberCount} members • {lastMessage === 'No messages yet' ? 'Tap to start chatting' : lastMessage}
          </p>
        </div>
      </div>
    </div>
  );
};

const AstroList = ({
  handleAstroClick,
  isSelected = false,
}: {
  handleAstroClick: () => void;
  isSelected?: boolean;
}) => {
  return (
    <div
      onClick={handleAstroClick}
      className={`text-black flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-gray-100/50 last:border-b-0 ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-blue-50'
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-blue-500">
            <AvatarImage src="/astro-avatar.png" alt="Astro AI Assistant" />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
              🤖
            </AvatarFallback>
          </Avatar>
          {/* AI Badge */}
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            ✨
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">Astro</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              AI Assistant
            </span>
          </div>
          <p className="text-sm text-blue-600 truncate mt-0.5">
            Ask me about Solana transactions
          </p>
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
