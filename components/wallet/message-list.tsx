'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { usePeerData, PeerData } from '@/lib/hooks/usePeerData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader } from '../ui/card';
import { MessageCircle, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useXmtpContext } from '@/lib/context/XmtpContext';
import { useDebouncedCallback } from 'use-debounce';

interface MessageProps {
  bio?: string;
  ens?: string;
  ethAddress: string;
  name: string;
  profileUrl?: string;
  profilePic?: string;
  tokens?: any;
}

const MessageList = ({ tokens }: { tokens: any }) => {
  const { client: xmtpClient, isLoading: xmtpIsLoading } =
    useXmtpContext();
  const [peerAddressList, setPeerAddressList] = useState<string[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<PeerData | null>(
    null
  );

  const { peerData, isLoading, error } = usePeerData(peerAddressList);

  const fetchConversations = useCallback(async () => {
    if (!xmtpClient) return;

    try {
      const conversations = await xmtpClient.conversations.list();

      const peerList = conversations.map(
        (conversation) => conversation.peerAddress
      );
      setPeerAddressList([...peerList].sort().reverse());
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [xmtpClient]);

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
          `https://app.apiswop.co/api/v4/wallet/getEnsAddress/${searchTerm}`
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

  const handleSearchInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length > 2) {
      // First search in peerData
      const matchingPeer = filteredPeerData.find(
        (peer) =>
          peer.name?.toLowerCase().includes(value.toLowerCase()) ||
          peer.ens?.toLowerCase().includes(value.toLowerCase()) ||
          peer.ethAddress?.toLowerCase().includes(value.toLowerCase())
      );

      if (matchingPeer) {
        setSearchResult(matchingPeer);
      } else {
        // If no match found in peerData, fetch from ENS
        debouncedFetchEnsData(value);
      }
    } else {
      setSearchResult(null);
    }
  };

  if (xmtpIsLoading)
    return (
      <Card className="w-full border-none rounded-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <h3 className="font-bold text-xl text-gray-700">
              Messages
            </h3>
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
              onChange={handleSearchInputChange}
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
          {isSearchLoading && (
            <p className="text-center text-sm text-gray-500">
              Searching...
            </p>
          )}
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <p className="text-center">Loading messages...</p>
          </div>
        </CardContent>
      </Card>
    );

  return (
    <Card className="w-full border-none rounded-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-bold text-xl text-gray-700">
            Messages
          </h3>
        </div>
        {/* <p className="text-sm text-muted-foreground">
          Chat with your connections
        </p> */}
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-6">
          <Input
            type="text"
            value={searchQuery}
            onChange={handleSearchInputChange}
            placeholder="Search messages..."
            className="border rounded-e-none p-2 px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            variant="black"
            size="icon"
            className="rounded-s-none px-6 font-bold"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
        {isSearchLoading && (
          <p className="text-center text-sm text-gray-500">
            Searching...
          </p>
        )}
        <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {isLoading && (
            <p className="text-center">Loading messages...</p>
          )}
          {error && (
            <p className="text-center text-red-500">
              Error loading messages: {error.message}
            </p>
          )}
          {!isLoading &&
            !error &&
            !searchResult &&
            filteredPeerData.length === 0 && (
              <p className="text-center text-gray-500">
                No messages found
              </p>
            )}
          {searchResult ? (
            <MessageCard {...searchResult} tokens={tokens} />
          ) : (
            filteredPeerData.map((person: PeerData) => (
              <MessageCard
                key={person.ethAddress}
                {...person}
                tokens={tokens}
              />
            ))
          )}
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
  tokens,
}: MessageProps) => {
  const router = useRouter();

  const handleWalletClick = useCallback(() => {
    // Store token data in sessionStorage instead of passing it in URL
    if (tokens && tokens.length > 0) {
      sessionStorage.setItem('chatTokenData', JSON.stringify(tokens));
    }
    // Just pass the recipient in the URL
    router.push(`/chat?recipient=${ethAddress}`);
  }, [router, ethAddress, tokens]);

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
              <p className="text-xs text-muted-foreground line-clamp-2">
                {bio}
              </p>
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
