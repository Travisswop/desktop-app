'use client';
import useXmtp from '@/lib/hooks/useXmtp';
import { BookUser, Loader, Search, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import ChatBox from '@/components/wallet/chat/chat-box';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import Link from 'next/link';
import { WalletItem } from '@/types/wallet';
import { usePrivy } from '@privy-io/react-auth';
import WalletManager from '@/components/wallet/wallet-manager';
import { Button } from '@/components/ui/button';

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

async function getPeerData(peerAddresses: string[]) {
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

    const data = await response.json();
    console.log('🚀 ~ getPeerData ~ data:', data);
    return data;
  } catch (error) {
    console.error('Error:', error);
    return error;
  }
}

const ChatPage = () => {
  const xmtpClient = useXmtp();

  const [walletData, setWalletData] = useState<WalletItem[] | null>(
    null
  );

  const { user: PrivyUser } = usePrivy();
  const [isWalletManagerOpen, setIsWalletManagerOpen] =
    useState(false);
  const [ensname, setEnsname] = useState('');
  const [conversation, setConversation] = useState<any>(null);
  const [peerData, setPeerData] = useState<PeerData[]>([]);
  const [messageHistory, setMessageHistory] = useState<any[]>([]);
  const [peerAddressList, setPeerAddressList] = useState<string[]>(
    []
  );
  const [messageType, setMessageType] = useState('allInbox');
  const [changeConversationLoading, setChangeConversationLoading] =
    useState(false);
  const [micrositeData, setMicrositeData] =
    useState<MessageProps | null>(null);

  // Get recipient from URL on client side only
  const [recipientAddress, setRecipientAddress] = useState<
    string | null
  >(null);
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setRecipientAddress(searchParams.get('recipient'));
  }, []);

  const fetchConversations = useCallback(async () => {
    if (xmtpClient) {
      try {
        const conversations = await xmtpClient.conversations.list();
        const peerList = conversations.map((conversation) => {
          return conversation.peerAddress;
        });
        setPeerAddressList(peerList);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    }
  }, [xmtpClient]);

  const startConversation = useCallback(
    async (recipientAddress: string) => {
      if (recipientAddress && xmtpClient) {
        try {
          const conversation =
            await xmtpClient.conversations.newConversation(
              recipientAddress
            );
          setConversation(conversation);
          const messages = await conversation.messages();
          setMessageHistory(messages);
          const microsite = peerData.find(
            (peer) => peer.ethAddress === recipientAddress
          );
          setMicrositeData(microsite || null);
        } catch (error) {
          console.error('Failed to start conversation:', error);
        }
      }
    },
    [xmtpClient, peerData]
  );

  const fetchData = useCallback(async () => {
    if (peerAddressList.length === 0) return;

    try {
      const response = await getPeerData(peerAddressList);
      if (response.data) {
        setPeerData(response.data);
      }
    } catch (error) {
      console.error(
        'There was a problem with the fetch operation:',
        error
      );
    }
  }, [peerAddressList]);

  useEffect(() => {
    if (xmtpClient) {
      fetchConversations();
    }
  }, [fetchConversations, xmtpClient]);

  useEffect(() => {
    if (peerAddressList.length > 0) {
      fetchData();
    }
  }, [peerAddressList, fetchData]);

  useEffect(() => {
    let isMounted = true;

    const streamMessages = async () => {
      if (!conversation) return;

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

  useEffect(() => {
    if (recipientAddress) {
      startConversation(recipientAddress);
    }
  }, [recipientAddress, startConversation]);

  useEffect(() => {
    const linkWallet = PrivyUser?.linkedAccounts
      .map((item) => {
        if (item.type === 'wallet') {
          if (item.chainType === 'ethereum') {
            return {
              address: item.address,
              isActive: true,
              isEVM: true,
            };
          } else if (item.chainType === 'solana') {
            return {
              address: item.address,
              isActive: false,
              isEVM: false,
            };
          }
        }
        return null;
      })
      .filter(Boolean);

    setWalletData(linkWallet as WalletItem[]);
  }, [PrivyUser]);

  const handleWalletClick = async (chat: MessageProps) => {
    setChangeConversationLoading(true);
    await startConversation(chat.ethAddress);
    setChangeConversationLoading(false);
  };

  console.log('converstaion', conversation);
  return (
    <div className="h-full">
      <div className="flex gap-7 items-start h-full ">
        <div
          style={{ height: 'calc(100vh - 130px)' }}
          className="w-[62%] bg-white rounded-xl relative"
        >
          {changeConversationLoading && (
            <div className="w-full h-full flex items-center justify-center">
              <Loader color="primary" />
            </div>
          )}
          {micrositeData && (
            <div className="w-full overflow-x-hidden h-full">
              <div className="flex items-center gap-3 justify-between border rounded-2xl border-gray-300 bg-white px-4 py-2 sticky top-0 left-0 mb-2">
                <div className="flex items-center flex-1 gap-3">
                  <Avatar>
                    <AvatarImage
                      src={
                        micrositeData.profilePic?.startsWith('http')
                          ? micrositeData.profilePic
                          : micrositeData.profilePic
                          ? `/assets/avatar/${micrositeData.profilePic}.png`
                          : '/default-avatar.png'
                      }
                      alt={`${micrositeData.name}'s avatar`}
                    />
                    <AvatarFallback>CN</AvatarFallback>
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
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-200">
                  <button
                    onClick={() => setIsWalletManagerOpen(true)}
                  >
                    <Wallet />
                  </button>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-200">
                  <Link
                    href={micrositeData.profileUrl}
                    target="_blank"
                  >
                    <BookUser />
                  </Link>
                </div>
              </div>
              <div className="h-full">
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
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMessageType('allInbox')}
                className={`${
                  messageType === 'allInbox'
                    ? 'font-bold text-gray-800'
                    : 'font-medium text-gray-600'
                } `}
              >
                All Inbox
              </button>
            </div>
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                size={18}
              />
              <input
                type="text"
                value={ensname}
                onChange={(e) => setEnsname(e.target.value)}
                placeholder={`Search Here....`}
                className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-lg focus:outline-none pl-10 py-2 text-gray-700 bg-gray-100"
              />
            </div>
            {peerData &&
              peerData.map((chat: MessageProps, index: number) => (
                <div
                  key={index}
                  onClick={() => handleWalletClick(chat)}
                  className={`text-black flex items-center justify-between p-2 rounded-lg cursor-pointer border`}
                >
                  <div className="flex items-center gap-2 justify-between">
                    <Avatar>
                      <AvatarImage
                        src={
                          chat.profilePic?.startsWith('http')
                            ? chat.profilePic
                            : chat.profilePic
                            ? `/assets/avatar/${chat.profilePic}.png`
                            : '/default-avatar.png'
                        }
                        alt={`${name}'s avatar`}
                      />
                      <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-sembold">{chat.name}</p>
                      <p
                        className={`text-sm text-gray-500font-medium`}
                      >
                        {chat.bio}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </>
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
