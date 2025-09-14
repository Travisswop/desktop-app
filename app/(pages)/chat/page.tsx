'use client';
import {
  BookUser,
  Loader,
  Search,
  Wallet,
  ArrowLeft,
  MessageSquare,
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
    refreshConversations,
    searchContacts,
    getConversations,
  } = useNewSocketChat(); // get socket data

  const { user: PrivyUser } = usePrivy();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  console.log('conversations', conversations);

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

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    return conversations.filter((conv) => {
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
    });
  }, [conversations, searchQuery]);

  console.log('filteredConversations', filteredConversations);

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
              {micrositeData && (
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
                ) : isConnected &&
                  selectedConversationId &&
                  selectedRecipientId ? (
                  <NewChatBox
                    conversationId={selectedConversationId}
                    receiverId={selectedRecipientId}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="w-[38%] bg-white rounded-xl px-4 py-4 flex gap-3 flex-col">
          <div className="w-full">
            <div className="flex items-center gap-1 mb-4 px-3 py-2 bg-gray-100 rounded-lg">
              <MessageSquare size={16} />
              <span className="font-medium">Direct Messages</span>
            </div>
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
                        conversationData={user}
                      />
                    ))}
                  </div>
                )}

                {/* Show fallback search result as new conversation option (if exists and not already in conversations) */}
                {searchResult &&
                  searchResults.length === 0 &&
                  !filteredConversations.some((conv) => {
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
                        conversationData={searchResult}
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
                    {filteredConversations.map((conv) => {
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
                          key={conv._id}
                          bio={lastMessage}
                          name={displayName}
                          profilePic={profilePic}
                          ethAddress={userIdentifier}
                          handleWalletClick={handleWalletClick}
                          conversationData={conv}
                        />
                      );
                    })}
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
      className="text-black flex items-center justify-between p-3 rounded-lg cursor-pointer border hover:bg-gray-50 transition-colors mb-2"
    >
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage
            src={getAvatarSrc(profilePic)}
            alt={`${resolvedName}'s avatar`}
          />
          <AvatarFallback>
            {resolvedName?.slice(0, 2) || 'AN'}
          </AvatarFallback>
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
              {bio === 'No messages yet' ||
              bio === 'Start a conversation'
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
