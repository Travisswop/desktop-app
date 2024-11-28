'use client';

import { useCallback, useEffect, useState } from 'react';
import useXmtp from '@/lib/hooks/useXmtp';
import { usePeerData, PeerData } from '@/lib/hooks/usePeerData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { MessageCircle, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MessageProps {
  bio?: string;
  ens?: string;
  ethAddress: string;
  name: string;
  profileUrl?: string;
  profilePic?: string;
}

const MessageList = () => {
  const xmtpClient = useXmtp();
  const [peerAddressList, setPeerAddressList] = useState<string[]>(
    []
  );
  const { peerData, isLoading, error } = usePeerData(peerAddressList);
  console.log('🚀 ~  ~ peerData:', peerData);

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

  useEffect(() => {
    if (xmtpClient) {
      fetchConversations();
    }
  }, [fetchConversations, xmtpClient]);

  return (
    <Card className="w-full border-none rounded-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <CardTitle>Messages</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Chat with your connection.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-6">
          <Input
            type="text"
            placeholder="Search messages..."
            className="border rounded-e-none p-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            variant="black"
            size="icon"
            className="rounded-s-none px-6 font-bold"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {isLoading && <p>Loading messages...</p>}
          {error && <p>Error loading messages: {error.message}</p>}
          {peerData.length > 0 ? (
            peerData.map((person: PeerData, index: number) => (
              <MessageCard key={index} {...person} />
            ))
          ) : (
            <p className="text-center text-gray-500">
              No messages found.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

function MessageCard({
  bio,
  name,
  profilePic,
  ethAddress,
}: MessageProps) {
  const router = useRouter();

  const handleWalletClick = ({
    ethAddress,
  }: {
    ethAddress: string;
  }) => {
    router.push(`/chat?recipient=${ethAddress}`);
  };

  return (
    <Card className="p-4 rounded-xl shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative h-10 w-10">
            <Avatar>
              <AvatarImage
                src={
                  profilePic?.startsWith('http')
                    ? profilePic
                    : profilePic
                    ? `/assets/avatar/${profilePic}.png`
                    : '/default-avatar.png'
                }
                alt={`${name}'s avatar`}
              />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            <p className="text-xs text-muted-foreground">{bio}</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleWalletClick({ ethAddress })}
          className="bg-gray-100 hover:bg-gray-200 font-semibold"
        >
          View
        </Button>
      </div>
    </Card>
  );
}

export default MessageList;
