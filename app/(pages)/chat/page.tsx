'use client';
import { BookUser, Loader, Search, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState, useMemo } from 'react';
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

interface MessageProps {
  bio?: string;
  ens?: string;
  ethAddress: string;
  name: string;
  profileUrl: string;
  profilePic?: string;
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

const ChatPage = () => {
  const xmtpClient = useXmtpContext();
  const { user: PrivyUser } = usePrivy();
  const searchParams = useSearchParams();

  const [walletData, setWalletData] = useState<WalletItem[] | null>(
    null
  );
  const [isWalletManagerOpen, setIsWalletManagerOpen] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filter peer data based on search
  const filteredPeerData = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return peerData.filter(
      (peer) =>
        peer.name?.toLowerCase().includes(query) ||
        peer.bio?.toLowerCase().includes(query) ||
        peer.ens?.toLowerCase().includes(query)
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

  const handleWalletClick = async (chat: MessageProps) => {
    setChangeConversationLoading(true);
    try {
      await startConversation(chat.ethAddress);
    } finally {
      setChangeConversationLoading(false);
    }
  };

  const getAvatarSrc = (profilePic?: string) => {
    if (!profilePic) return '/default-avatar.png';
    return profilePic.startsWith('http')
      ? profilePic
      : `/assets/avatar/${profilePic}.png`;
  };

  return (
    <div className="h-full">
      <div className="flex gap-7 items-start h-full">
        <div
          style={{ height: 'calc(100vh - 130px)' }}
          className="w-[62%] bg-white rounded-xl relative"
        >
          {changeConversationLoading && (
            <div className="w-full h-full flex items-center justify-center">
              <Loader className="animate-spin" />
            </div>
          )}

          {micrositeData && (
            <div className="w-full overflow-x-hidden h-full">
              <div className="flex items-center gap-3 justify-between border rounded-2xl border-gray-300 bg-white px-4 py-2 sticky top-0 left-0 mb-2">
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-lg focus:outline-none pl-10 py-2 text-gray-700 bg-gray-100"
            />
          </div>

          {filteredPeerData.map((chat: MessageProps) => (
            <div
              key={chat.ethAddress}
              onClick={() => handleWalletClick(chat)}
              className="text-black flex items-center justify-between p-2 rounded-lg cursor-pointer border hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <Avatar>
                  <AvatarImage
                    src={getAvatarSrc(chat.profilePic)}
                    alt={`${chat.name}'s avatar`}
                  />
                  <AvatarFallback>
                    {chat.name?.slice(0, 2) || 'AN'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{chat.name}</p>
                  {chat.bio && (
                    <p className="text-sm text-gray-500">
                      {chat.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
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

export default ChatPage;
