'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { usePeerData, PeerData } from '@/lib/hooks/usePeerData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { MessageCircle, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useXmtpContext } from '@/lib/context/XmtpContext';

interface MessageProps {
  bio?: string;
  ens?: string;
  ethAddress: string;
  name: string;
  profileUrl?: string;
  profilePic?: string;
}

const MessageList = () => {
  const xmtpClient = useXmtpContext();
  const [peerAddressList, setPeerAddressList] = useState<string[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const { peerData, isLoading, error } = usePeerData(peerAddressList);

  const fetchConversations = useCallback(async () => {
    if (!xmtpClient) return;

    try {
      const conversations = await xmtpClient.conversations.list();
      const peerList = conversations.map(
        (conversation) => conversation.peerAddress
      );
      setPeerAddressList(peerList);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [xmtpClient]);

  useEffect(() => {
    if (xmtpClient) {
      fetchConversations();
    }
  }, [fetchConversations, xmtpClient]);

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

  return (
    <Card className="w-full border-none rounded-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <CardTitle>Messages</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Chat with your connections
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-6">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          {isLoading && (
            <p className="text-center">Loading messages...</p>
          )}
          {error && (
            <p className="text-center text-red-500">
              Error loading messages: {error.message}
            </p>
          )}
          {!isLoading && !error && filteredPeerData.length === 0 && (
            <p className="text-center text-gray-500">
              No messages found
            </p>
          )}
          {filteredPeerData.map((person: PeerData) => (
            <MessageCard key={person.ethAddress} {...person} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const MessageCard = ({
  bio,
  name,
  profilePic,
  ethAddress,
}: MessageProps) => {
  const router = useRouter();

  const handleWalletClick = useCallback(() => {
    router.push(`/chat?recipient=${ethAddress}`);
  }, [router, ethAddress]);

  const avatarSrc = useMemo(() => {
    if (!profilePic) return '/default-avatar.png';
    return profilePic.startsWith('http')
      ? profilePic
      : `/assets/avatar/${profilePic}.png`;
  }, [profilePic]);

  return (
    <Card className="p-4 rounded-xl shadow-md mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative h-10 w-10">
            <Avatar>
              <AvatarImage src={avatarSrc} alt={`${name}'s avatar`} />
              <AvatarFallback>
                {name?.slice(0, 2) || 'AN'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            {bio && (
              <p className="text-xs text-muted-foreground">{bio}</p>
            )}
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleWalletClick}
          className="bg-gray-100 hover:bg-gray-200 font-semibold"
        >
          View
        </Button>
      </div>
    </Card>
  );
};

export default MessageList;
