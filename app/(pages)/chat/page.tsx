'use client';
import { BookUser, Loader, Search, Wallet } from 'lucide-react';
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
import { useSearchParams } from 'next/navigation';
import WalletManager from '@/components/wallet/wallet-manager';
import { useXmtpContext } from '@/lib/context/XmtpContext';
import ChatBox from '@/components/wallet/chat/chat-box';
import { useDebouncedCallback } from 'use-debounce';

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
  const xmtpClient = useXmtpContext();
  const { user: PrivyUser } = usePrivy();
  const searchParams = useSearchParams();

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
  const [changeConversationLoading, setChangeConversationLoading] =
    useState(false);
  const [micrositeData, setMicrositeData] =
    useState<MessageProps | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<
    string | null
  >(null);

  const fetchConversations = useCallback(async () => {
    if (!xmtpClient) return;

    try {
      const conversations = await xmtpClient.conversations.list();
      setPeerAddressList(conversations.map((c) => c.peerAddress));
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  }, [xmtpClient]);

  const startConversation = useCallback(
    async (recipientAddress: string) => {
      if (!recipientAddress || !xmtpClient) return;

      try {
        const conversation =
          await xmtpClient.conversations.newConversation(
            recipientAddress
          );
        const messages = await conversation.messages();

        setConversation(conversation);
        setMessageHistory(messages);
        setMicrositeData(
          peerData.find(
            (peer) => peer.ethAddress === recipientAddress
          ) || null
        );
      } catch (error) {
        console.error('Failed to start conversation:', error);
      }
    },
    [xmtpClient, peerData]
  );

  const fetchPeerData = useCallback(async () => {
    if (!peerAddressList.length) return;

    try {
      const response = await getPeerData(peerAddressList);
      if (response.data) {
        setPeerData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch peer data:', error);
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
    const recipient = searchParams.get('recipient');
    setRecipientAddress(recipient);
  }, [searchParams]);

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

  // Stream messages for active conversation
  useEffect(() => {
    if (!conversation) return;

    let isMounted = true;

    const streamMessages = async () => {
      try {
        for await (const message of await conversation.streamMessages()) {
          if (!isMounted) break;
          setMessageHistory((prev) => [...prev, message]);
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

  // Start conversation with recipient from URL
  useEffect(() => {
    if (recipientAddress) {
      startConversation(recipientAddress);
    }
  }, [recipientAddress, startConversation]);

  const handleWalletClick = async (ethAddress: string) => {
    setChangeConversationLoading(true);
    try {
      await startConversation(ethAddress);
    } finally {
      setChangeConversationLoading(false);
    }
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

  return (
    <div className="h-full">
      <div className="flex gap-7 items-start h-full">
        <div
          style={{ height: 'calc(100vh - 150px)' }}
          className="w-[62%] bg-white rounded-xl relative"
        >
          {changeConversationLoading && (
            <div className="w-full h-full flex items-center justify-center">
              <Loader className="animate-spin" />
            </div>
          )}

          {micrositeData && (
            <div className="w-full overflow-x-hidden h-full">
              <div className="flex items-center gap-3 justify-between border rounded-xl border-gray-300 bg-white px-4 py-2 sticky top-0 left-0 mb-2">
                <div className="flex items-center flex-1 gap-3">
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

                <button
                  onClick={() => setIsWalletManagerOpen(true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-200"
                >
                  <Wallet />
                </button>

                <Link
                  href={micrositeData.profileUrl}
                  target="_blank"
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-200"
                >
                  <BookUser />
                </Link>
              </div>
              <div className="h-full overflow-y-auto">
                {xmtpClient && (
                  <ChatBox
                    client={xmtpClient}
                    conversation={conversation}
                    messageHistory={messageHistory}
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
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-lg focus:outline-none pl-10 py-2 text-gray-700 bg-gray-100"
            />
          </div>

          <div className="h-[calc(100vh-250px)] overflow-y-auto">
            {isSearchLoading && (
              <p className="text-center text-sm text-gray-500">
                Searching...
              </p>
            )}
            {searchResult && (
              <div className="mb-4">
                <MessageList
                  {...searchResult}
                  handleWalletClick={handleWalletClick}
                />
              </div>
            )}
            {filteredPeerData.map((chat: MessageProps) => (
              <MessageList
                key={chat.ethAddress}
                {...chat}
                handleWalletClick={handleWalletClick}
              />
            ))}
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
}: {
  bio: string;
  name: string;
  profilePic: string;
  ethAddress: string;
  handleWalletClick: (ethAddress: string) => Promise<void>;
}) => {
  return (
    <div
      onClick={() => handleWalletClick(ethAddress)}
      className="text-black flex items-center justify-between p-2 rounded-lg cursor-pointer border hover:bg-gray-50 mb-2"
    >
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarImage
            src={getAvatarSrc(profilePic)}
            alt={`${name}'s avatar`}
          />
          <AvatarFallback>{name?.slice(0, 2) || 'AN'}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{name}</p>
          {bio && <p className="text-sm text-gray-500">{bio}</p>}
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
