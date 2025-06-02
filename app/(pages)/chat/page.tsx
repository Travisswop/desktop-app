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
import { useSolanaWallets } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';

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
  const { client: xmtpClient } = useXmtpContext();
  const { user: PrivyUser } = usePrivy();
  const searchParams = useSearchParams();
  const router = useRouter();

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
  const [conversation, setConversation] = useState<any>(null);
  const [peerData, setPeerData] = useState<PeerData[]>([]);
  const [messageHistory, setMessageHistory] = useState<any[]>([]);
  const [peerAddressList, setPeerAddressList] = useState<string[]>(
    []
  );
  const [isLoadingPeerData, setIsLoadingPeerData] = useState(false);
  const [changeConversationLoading, setChangeConversationLoading] =
    useState(false);
  const [micrositeData, setMicrositeData] =
    useState<MessageProps | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<
    string | null
  >(null);
  const [tokenData, setTokenData] = useState<any>(null);

  const fetchConversations = useCallback(async () => {
    if (!xmtpClient) return;

    try {
      const conversations = await xmtpClient.conversations.list();
      const peerList = conversations.map(
        (conversation: any) => conversation.peerAddress
      );
      setPeerAddressList(peerList);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  }, [xmtpClient]);

  const startConversation = useCallback(
    async (recipientAddress: string) => {
      if (!recipientAddress || !xmtpClient) return;

      try {
        setChangeConversationLoading(true);

        // Clear existing conversation and messages
        setConversation(null);
        setMessageHistory([]);

        const conversation =
          await xmtpClient.conversations.newConversation(
            recipientAddress
          );

        const messages = await conversation.messages();

        setConversation(conversation);
        setMessageHistory(messages);

        // Update micrositeData based on search result or peer data
        if (searchResult?.ethAddress === recipientAddress) {
          setMicrositeData(searchResult);
        } else {
          const micrositeData = peerData.find(
            (peer) => peer.ethAddress === recipientAddress
          );
          setMicrositeData(micrositeData || null);
        }
      } catch (error) {
        console.error('Failed to start conversation:', error);
      } finally {
        setChangeConversationLoading(false);
      }
    },
    [xmtpClient, peerData, searchResult]
  );

  const fetchPeerData = useCallback(async () => {
    if (!peerAddressList.length) return;

    try {
      setIsLoadingPeerData(true);
      const response = await getPeerData(peerAddressList);
      if (response.data) {
        setPeerData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch peer data:', error);
    } finally {
      setIsLoadingPeerData(false);
    }
  }, [peerAddressList]);

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
  }, [PrivyUser]);

  // Handle recipient from URL params
  useEffect(() => {
    const recipient = searchParams?.get('recipient');

    // Get token data from sessionStorage instead of URL
    if (typeof window !== 'undefined') {
      try {
        const storedTokenData =
          sessionStorage.getItem('chatTokenData');
        if (storedTokenData) {
          const parsedTokenData = JSON.parse(storedTokenData);
          console.log(
            'Retrieved token data from sessionStorage:',
            parsedTokenData
          );
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
      setRecipientAddress(recipient);
      startConversation(recipient);
    }
  }, [searchParams, startConversation]);

  // Fetch initial conversations
  useEffect(() => {
    if (xmtpClient) {
      fetchConversations();
    }
  }, [fetchConversations, xmtpClient]);

  // Fetch peer data when address list changes
  useEffect(() => {
    if (peerAddressList.length) {
      fetchPeerData();
    }
  }, [peerAddressList, fetchPeerData]);

  useEffect(() => {
    if (!conversation) return;

    let isMounted = true;

    const streamMessages = async () => {
      try {
        for await (const message of await conversation.streamMessages()) {
          if (!isMounted) break;
          setMessageHistory((prevMessages) => [
            ...prevMessages,
            message,
          ]);
        }
      } catch (error) {
        console.error('Error streaming messages:', error);
      }
    };

    streamMessages();

    return () => {
      isMounted = false;
    };
  }, [conversation]);

  const handleWalletClick = async (ethAddress: string) => {
    await startConversation(ethAddress);
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
              <Loader className="animate-spin" />
            </div>
          ) : !micrositeData ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              Select a conversation to start chatting
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
                      `${micrositeData.ens}`
                    }
                    target="_blank"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <BookUser className="w-5 h-5" />
                  </Link>
                </div>
              </div>
              <div className="h-full overflow-y-auto">
                {xmtpClient && (
                  <ChatBox
                    client={xmtpClient}
                    conversation={conversation}
                    messageHistory={messageHistory}
                    tokenData={tokenData}
                    recipientWalletData={walletData || []}
                    recipientAddress={recipientAddress || ''}
                  />
                )}
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
                  recipientAddress={recipientAddress}
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
                  recipientAddress={recipientAddress}
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
