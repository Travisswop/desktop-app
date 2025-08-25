'use client';

import { useCallback, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader } from '../ui/card';
import { MessageCircle, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSocketChat } from '@/lib/context/SocketChatContext';
import { resolveEnsToUserId } from '@/lib/api/ensResolver';

interface MessageProps {
  bio?: string;
  name: string;
  profilePic?: string;
  ethAddress: string;
  isSearchResult?: boolean;
  isEns?: boolean;
  resolvedId?: string;
}

const MessageList = ({ tokens }: { tokens: any }) => {
  const { conversations, loading: chatLoading, isConnected, error } = useSocketChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);

  // Format display address for peers
  const formatDisplayName = useCallback((address: string) => {
    if (!address || typeof address !== 'string') return 'Unknown';
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }, []);

  // Prepare conversation data for display
  const chatList = useMemo(() => {
    return conversations.map(conv => ({
      ethAddress: conv.peerAddress,
      name: conv.displayName || formatDisplayName(conv.peerAddress),
      bio: conv.lastMessage || 'No messages yet',
      profilePic: ''
    }));
  }, [conversations, formatDisplayName]);

  // Filter conversations based on search
  const filteredPeerData = useMemo(() => {
    if (!searchQuery.trim()) return chatList;

    return chatList.filter(
      (peer) =>
        peer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        peer.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        peer.ethAddress?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chatList, searchQuery]);

  // Handle search input changes
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length > 2) {
      // Check if the input looks like an Ethereum address
      if (value.startsWith('0x') && value.length >= 10) {
        setSearchResult({
          ethAddress: value,
          name: formatDisplayName(value),
          bio: 'Start conversation with address',
          profilePic: '',
          isEns: false
        });
      } 
      // Check if the input looks like an ENS username (especially .swop.id)
      else if (value.includes('.') && (value.endsWith('.eth') || value.endsWith('.swop.id'))) {
        setSearchResult({
          ethAddress: value, // We'll use the ENS name directly as the address for now, resolve before sending
          name: value,
          bio: 'Start conversation with ENS user',
          profilePic: '',
          isEns: true // Mark as ENS so we know to resolve it
        });
      }
      // Check if the input could be a username that needs .swop.id appended
      else if (value.length >= 3 && !value.includes('.') && !value.includes(' ')) {
        // Suggest the username with .swop.id
        const ensName = `${value}.swop.id`;
        setSearchResult({
          ethAddress: ensName,
          name: ensName,
          bio: 'Start conversation with Swop user',
          profilePic: '',
          isEns: true // Mark as ENS so we know to resolve it
        });
      } else {
        setSearchResult(null);
      }
    } else {
      setSearchResult(null);
    }
  };

  if (chatLoading) {
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
              variant="default"
              size="icon"
              className="rounded-s-none px-6 font-bold"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <p className="text-center">Loading messages...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-none rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <h3 className="font-bold text-xl text-gray-700">
              Messages
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        {error && (
          <div className="text-xs text-red-500 mt-2 p-2 bg-red-50 rounded">
            Connection Error: {error.message}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-6">
          <Input
            type="text"
            value={searchQuery}
            onChange={handleSearchInputChange}
            placeholder="Search messages or enter address..."
            className="border rounded-e-none p-2 px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            variant="default"
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
          {/* Search results section */}
          {searchResult && (
            <div>
              <div className="text-xs text-gray-500 px-3 py-1 border-b mb-2">Search Result</div>
              <MessageCard {...searchResult} tokens={tokens} isSearchResult={true} />
            </div>
          )}
          
          {/* Existing conversations section */}
          {filteredPeerData.length > 0 && (
            <div className={searchResult ? "mt-4" : ""}>
              {searchResult && <div className="text-xs text-gray-500 px-3 py-1 border-b mb-2">Existing Conversations</div>}
              {filteredPeerData.map((person) => (
                <MessageCard
                  key={person.ethAddress}
                  {...person}
                  tokens={tokens}
                  isSearchResult={false}
                />
              ))}
            </div>
          )}
          
          {/* No results message */}
          {filteredPeerData.length === 0 && !searchResult && (
            <p className="text-center text-gray-500">
              No messages found. Search to start a conversation.
            </p>
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
  isSearchResult = false,
  isEns = false,
  resolvedId,
}: MessageProps & { tokens: any }) => {
  const router = useRouter();
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(resolvedId || null);
  
  // Handle clicking on a chat item
  const handleWalletClick = useCallback(async () => {
    try {
      // If this is an ENS name, resolve it first
      if (isEns && !resolvedUserId) {
        setIsResolving(true);
        console.log(`Resolving ENS name: ${ethAddress}`);
        
        // Resolve the ENS name to get the actual user ID
        const userId = await resolveEnsToUserId(ethAddress);
        setResolvedUserId(userId);
        
        if (!userId) {
          console.error(`Failed to resolve ENS name: ${ethAddress}`);
          alert(`Could not find a user with the ENS name: ${ethAddress}`);
          setIsResolving(false);
          return;
        }
        
        console.log(`Resolved ENS ${ethAddress} to user ID: ${userId}`);
        
        // Store token data in sessionStorage instead of passing it in URL
        if (tokens && tokens.length > 0) {
          sessionStorage.setItem('chatTokenData', JSON.stringify(tokens));
        }
        
        // Use the resolved user ID as the recipient
        router.push(`/chat?recipient=${userId}`);
      } else {
        // For regular addresses or already resolved ENS names, proceed directly
        if (tokens && tokens.length > 0) {
          sessionStorage.setItem('chatTokenData', JSON.stringify(tokens));
        }
        
        // Use resolved ID if available, otherwise use the ethAddress directly
        const recipient = resolvedUserId || ethAddress;
        router.push(`/chat?recipient=${recipient}`);
      }
    } catch (error) {
      console.error('Error handling wallet click:', error);
      alert('Error starting chat. Please try again.');
    } finally {
      setIsResolving(false);
    }
  }, [router, ethAddress, tokens, isEns, resolvedUserId]);

  const avatarSrc = useMemo(() => {
    if (!profilePic) return '/default-avatar.png';
    return profilePic.startsWith('http')
      ? profilePic
      : `/assets/avatar/${profilePic}.png`;
  }, [profilePic]);

  // Determine if this is an ENS name
  const isENS = ethAddress?.includes('.') && (ethAddress?.endsWith('.eth') || ethAddress?.endsWith('.swop.id'));

  return (
    <Card className={`p-4 rounded-xl shadow-md mb-2 ${isSearchResult ? 'border-blue-100 bg-blue-50' : ''}`}>
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
            <h3 className="font-semibold">
              {isENS ? (
                <span className="text-blue-600">{name}</span>
              ) : (
                name
              )}
            </h3>
            {bio && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {bio}
              </p>
            )}
          </div>
        </div>
        <Button
          variant={isSearchResult ? "default" : "secondary"}
          size="sm"
          onClick={handleWalletClick}
          disabled={isResolving}
          className={isSearchResult 
            ? "bg-blue-500 hover:bg-blue-600 text-white font-semibold" 
            : "bg-gray-100 hover:bg-gray-200 font-semibold"
          }
        >
          {isResolving ? "Resolving..." : isSearchResult ? "Start Chat" : "View"}
        </Button>
      </div>
    </Card>
  );
};

export default MessageList;
