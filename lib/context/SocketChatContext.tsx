'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { usePrivy } from '@privy-io/react-auth';

// Types for messages and conversations
export interface ChatMessage {
  _id: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  recipientId: string;
  conversationId: string;
  channelId?: string; // For group messages
  content: string;
  createdAt: string;
  messageType?: 'text' | 'image' | 'video' | 'file';
  attachment?: string;
  reactions?: Array<{
    userId: string;
    reaction: string;
  }>;
  seenBy?: Array<{
    _id: string;
    name: string;
    dp?: string;
  }>;
  edited?: boolean;
}

export interface ChatConversation {
  conversationId: string;
  peerAddress: string;
  displayName: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isGroup?: boolean;
  avatarUrl?: string;
  memberCount?: number;
}

export interface GroupMember {
  id: string;
  displayName: string;
  avatarUrl?: string;
  role: 'admin' | 'moderator' | 'member';
  status?: 'online' | 'offline';
  lastSeen?: number;
}

export interface Group {
  groupId: string;
  name: string;
  description: string;
  isPrivate: boolean;
  role: string;
  avatarUrl: string;
  createdAt: string;
  members?: GroupMember[];
}

interface SocketChatContextType {
  socket: Socket | null;
  isConnected: boolean;
  loading: boolean;
  error: Error | null;
  conversations: ChatConversation[];
  groups: Group[];
  messages: Record<string, ChatMessage[]>;
  activeConversationId: string | null;
  createConversation: (recipientId: string) => Promise<string>;
  joinConversation: (conversationId: string) => Promise<void>;
  sendMessage: (params: {
    senderId: string;
    recipientId: string;
    content: string;
    attachmentData?: any;
    messageType?: 'text' | 'image' | 'video' | 'file';
  }) => Promise<void>;
  leaveConversation: (conversationId: string) => Promise<void>;
  markAsRead: (
    conversationId: string,
    userId: string
  ) => Promise<void>;
  setUserOnline: (userId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  userPresence: Record<string, { status: string; lastSeen?: number }>;
  // Group chat operations
  createGroup: (params: {
    name: string;
    description?: string;
    members?: string[];
    isPrivate?: boolean;
    avatarUrl?: string;
  }) => Promise<string>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  addGroupMembers: (
    groupId: string,
    memberIds: string[]
  ) => Promise<void>;
  removeGroupMember: (
    groupId: string,
    memberId: string
  ) => Promise<void>;
  searchUsers: (
    query: string,
    currentGroupId?: string
  ) => Promise<any[]>;
  getGroupMembers: (groupId: string) => Promise<GroupMember[]>;
  sendGroupMessage: (params: {
    groupId: string;
    content: string;
    attachmentData?: any;
    messageType?: 'text' | 'image' | 'video' | 'file';
  }) => Promise<void>;
}

const SocketChatContext = createContext<
  SocketChatContextType | undefined
>(undefined);

export function SocketChatProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = usePrivy();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [conversations, setConversations] = useState<
    ChatConversation[]
  >([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [userPresence, setUserPresence] = useState<
    Record<string, { status: string; lastSeen?: number }>
  >({});

  // Create and initialize socket connection
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    console.log(
      '🔍 Attempting connection to root namespace first to test server connectivity'
    );

    const socketInstance = io(
      `${process.env.NEXT_PUBLIC_SOCKET}/anthillChat`,
      {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
        upgrade: true,
        withCredentials: false,
      }
    );

    setSocket(socketInstance);

    // Socket event handlers
    socketInstance.on('connect', () => {
      console.log('🟢 Socket connected successfully');
      console.log('🟢 Socket ID:', socketInstance.id);
      console.log(
        '🟢 Transport:',
        socketInstance.io.engine.transport.name
      );
      console.log('🟢 User:', user?.id);
      setIsConnected(true);
      setLoading(false);
      setError(null);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('🔴 Socket connection error:', err);
      console.error('🔴 Error details:', {
        message: err.message,
        description: (err as any).description || 'N/A',
        context: (err as any).context || 'N/A',
        type: (err as any).type || 'N/A',
      });
      setError(new Error(`Connection error: ${err.message}`));
      setLoading(false);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🟡 Socket disconnected. Reason:', reason);
      console.log(
        '🟡 Will attempt reconnection:',
        socketInstance.io.reconnection
      );
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(
        '🔄 Socket reconnected after',
        attemptNumber,
        'attempts'
      );
      setIsConnected(true);
      setError(null);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Socket reconnection attempt:', attemptNumber);
    });

    socketInstance.on('reconnect_error', (err) => {
      console.error('🔴 Socket reconnection error:', err);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('🔴 Socket reconnection failed - giving up');
      setError(new Error('Failed to reconnect to chat server'));
    });

    // Listen for message history (handles both private DMs and group messages)
    socketInstance.on(
      'private_message_history',
      (messageHistory: ChatMessage[]) => {
        setMessages((prev) => {
          // Get current active conversation ID from state to avoid dependency warning
          const currentActiveConversationId = activeConversationId;
          if (currentActiveConversationId) {
            return {
              ...prev,
              [currentActiveConversationId]: messageHistory,
            };
          }
          return prev;
        });
      }
    );

    // Listen for group channel message history
    socketInstance.on(
      'message_history',
      (messageHistory: ChatMessage[]) => {
        console.log(
          '[GROUP] Received message history:',
          messageHistory
        );
        setMessages((prev) => {
          // Get current active conversation ID from state to avoid dependency warning
          const currentActiveConversationId = activeConversationId;
          if (currentActiveConversationId) {
            return {
              ...prev,
              [currentActiveConversationId]: messageHistory,
            };
          }
          return prev;
        });
      }
    );

    // Listen for new direct messages
    socketInstance.on('recived_dm', (message: ChatMessage) => {
      console.log('🔔 RECEIVED MESSAGE EVENT:', message);
      console.log('🔔 Current user:', user?.id);
      console.log('🔔 Active conversation:', activeConversationId);
      console.log('🔔 Socket connected:', isConnected);
      console.log('🔔 Socket ID:', socket?.id);
      console.log('🔔 TIMESTAMP:', new Date().toISOString());

      // IMPORTANT: Ensure we're using the correct conversation ID format
      let conversationId = message.conversationId;

      // If the conversation ID contains ETH addresses, ensure consistent format
      if (conversationId.includes('0x')) {
        const parts = conversationId.split('_');
        if (parts.length === 2) {
          // Sort to ensure consistent ordering
          const sortedParts = [...parts].sort();
          const sortedConversationId = sortedParts.join('_');

          if (sortedConversationId !== conversationId) {
            console.log(
              `Normalizing conversation ID from ${conversationId} to ${sortedConversationId}`
            );
            conversationId = sortedConversationId;
          }
        }
      }

      // Add the message to the messages state
      console.log('🔍 Before updating messages state:', {
        allConversations: Object.keys(messages),
        hasThisConversation: !!messages[conversationId],
        messageCount: messages[conversationId]?.length || 0,
      });

      setMessages((prev) => {
        console.log(
          '🔍 Inside setMessages callback - previous state:',
          {
            allConversations: Object.keys(prev),
            hasThisConversation: !!prev[conversationId],
            messageCount: prev[conversationId]?.length || 0,
          }
        );

        const conversationMessages = prev[conversationId] || [];

        // Check if the message already exists to avoid duplicates
        const messageExists = conversationMessages.some(
          (msg) => msg._id === message._id
        );

        if (!messageExists) {
          console.log(
            `🟢 Adding message to conversation ${conversationId}`
          );

          // Create a debug log to help diagnose issues
          console.log('🟢 Message details:', {
            id: message._id,
            from: message.senderId,
            to: message.recipientId,
            content: message.content,
            conversation: conversationId,
          });

          // IMPORTANT: Remove any temporary messages with the same content and sender
          // This prevents duplicate messages when optimistic updates are replaced by server messages
          const filteredMessages = conversationMessages.filter((msg) => {
            // Keep all non-temporary messages
            if (!msg._id.startsWith('temp_')) {
              return true;
            }
            
            // For temporary messages, remove if they have the same sender and content
            // as the incoming server message (this means it's a duplicate)
            const isSameSender = msg.senderId === message.senderId;
            const isSameContent = msg.content.trim() === message.content.trim();
            
            if (isSameSender && isSameContent) {
              console.log(`🗑️ Removing temporary message ${msg._id} as it's being replaced by server message ${message._id}`);
              return false; // Remove this temporary message
            }
            
            return true; // Keep this temporary message
          });

          // Create the new state with filtered messages plus the new server message
          const newState = {
            ...prev,
            [conversationId]: [...filteredMessages, message],
          };

          // Log the new state
          console.log('🔍 New messages state will be:', {
            allConversations: Object.keys(newState),
            hasThisConversation: !!newState[conversationId],
            messageCount: newState[conversationId]?.length || 0,
            messages: newState[conversationId],
          });

          return newState;
        }

        console.log(
          '⚠️ Message already exists, not adding:',
          message._id
        );
        return prev;
      });

      // Force a re-render of the component using this conversation
      if (conversationId === activeConversationId) {
        console.log('🔄 Forcing re-render for active conversation');

        // This is a more reliable way to force a re-render
        setTimeout(() => {
          console.log('🔄 Executing delayed re-render now');
          setActiveConversationId((oldId) => {
            console.log(
              `🔄 Re-render: changing from ${oldId} to ${conversationId} and back`
            );
            // Change to a different value and then back to force React to notice the change
            const tempId = `${conversationId}_temp_${Date.now()}`;
            setTimeout(
              () => setActiveConversationId(conversationId),
              5
            );
            return tempId;
          });
        }, 10);
      }

      // Update the conversation list with the new message
      setConversations((prev) => {
        console.log('🔍 Updating conversations list with new message for conversation:', conversationId);
        
        const index = prev.findIndex((conv) => conv.conversationId === conversationId);
        
        if (index !== -1) {
          console.log(`🔍 Found existing conversation at index ${index}`);
          const updatedConversations = [...prev];
          updatedConversations[index] = {
            ...updatedConversations[index],
            lastMessage: message.content,
            lastMessageTime: message.createdAt,
            // Don't increment unread count if this is the active conversation
            unreadCount: conversationId === activeConversationId 
              ? 0 
              : (updatedConversations[index].unreadCount || 0) + 1,
          };
          console.log(`🔍 Updated conversation:`, updatedConversations[index]);
          return updatedConversations;
        }

        // Create new conversation entry if it doesn't exist
        if (conversationId && user) {
          console.log('🔍 Creating new conversation entry for:', conversationId);
          
          // Determine peer address from conversation ID and message
          let peerAddress = '';
          let displayName = 'Unknown';
          
          // Try to extract peer from conversation ID
          const parts = conversationId.split('_');
          if (parts.length === 2) {
            // Find which part is not the current user
            if (parts[0] === user.id || parts[0] === user.wallet?.address) {
              peerAddress = parts[1];
            } else if (parts[1] === user.id || parts[1] === user.wallet?.address) {
              peerAddress = parts[0];
            } else {
              // Fallback: determine from message sender/recipient
              peerAddress = message.senderId !== user.id ? message.senderId : message.recipientId;
            }
          } else {
            // Fallback: determine from message sender/recipient
            peerAddress = message.senderId !== user.id ? message.senderId : message.recipientId;
          }
          
          // Create display name
          if (peerAddress) {
            if (peerAddress.startsWith('did:privy:')) {
              displayName = `${peerAddress.substring(0, 10)}...${peerAddress.substring(peerAddress.length - 5)}`;
            } else if (peerAddress.startsWith('0x')) {
              displayName = `${peerAddress.substring(0, 6)}...${peerAddress.substring(peerAddress.length - 4)}`;
            } else {
              displayName = peerAddress;
            }
          }

          const newConversation = {
            conversationId,
            peerAddress,
            displayName,
            lastMessage: message.content,
            lastMessageTime: message.createdAt,
            unreadCount: conversationId === activeConversationId ? 0 : 1,
          };

          console.log('🔍 Adding new conversation:', newConversation);
          return [...prev, newConversation];
        }

        console.log('🔍 No changes to conversations list');
        return prev;
      });

      // If this is for the active conversation, update it visually
      if (conversationId === activeConversationId) {
        // Force scroll to bottom by triggering a minor state update
        console.log(
          '🔄 Triggering scroll to bottom for active conversation'
        );
      } else {
        // If we're not currently viewing this conversation, show a notification
        console.log(
          `New message in conversation ${conversationId} while viewing ${activeConversationId}`
        );
      }
    });

    // Listen for broadcast messages (fallback delivery method)
    socketInstance.on(
      'recived_dm_broadcast',
      ({
        message,
        senderId,
        recipientId,
        conversationId: msgConversationId,
      }) => {
        console.log('🔔 RECEIVED BROADCAST MESSAGE:', message);

        // Check if this message is relevant to the current user
        if (
          user?.id === senderId ||
          user?.id === recipientId ||
          user?.wallet?.address === senderId ||
          user?.wallet?.address === recipientId
        ) {
          console.log(
            '🔔 Broadcast message is relevant to current user, processing...'
          );

          // Process it like a normal message
          const normalizedConversationId = msgConversationId.includes(
            '_'
          )
            ? msgConversationId.split('_').sort().join('_')
            : msgConversationId;

          // Add to messages state if not already there
          setMessages((prev) => {
            const conversationMessages =
              prev[normalizedConversationId] || [];
            const messageExists = conversationMessages.some(
              (msg) => msg._id === message._id
            );

            if (!messageExists) {
              console.log(
                `🟢 Adding broadcast message to conversation ${normalizedConversationId}`
              );

              // Remove any temporary messages with the same content and sender
              const filteredMessages = conversationMessages.filter((msg) => {
                // Keep all non-temporary messages
                if (!msg._id.startsWith('temp_')) {
                  return true;
                }
                
                // For temporary messages, remove if they have the same sender and content
                const isSameSender = msg.senderId === message.senderId;
                const isSameContent = msg.content.trim() === message.content.trim();
                
                if (isSameSender && isSameContent) {
                  console.log(`🗑️ Removing temporary broadcast message ${msg._id} as it's being replaced by server message ${message._id}`);
                  return false; // Remove this temporary message
                }
                
                return true; // Keep this temporary message
              });

              return {
                ...prev,
                [normalizedConversationId]: [
                  ...filteredMessages,
                  message,
                ],
              };
            }

            return prev;
          });
        }
      }
    );

    // Listen for reaction updates
    socketInstance.on(
      'reaction_updated',
      ({ messageId, reactions }) => {
        setMessages((prev) => {
          const updatedMessages = { ...prev };

          // Find the conversation that contains this message
          Object.keys(updatedMessages).forEach((convId) => {
            const messageIndex = updatedMessages[convId].findIndex(
              (msg) => msg._id === messageId
            );

            if (messageIndex !== -1) {
              const updatedMessagesArray = [
                ...updatedMessages[convId],
              ];
              updatedMessagesArray[messageIndex] = {
                ...updatedMessagesArray[messageIndex],
                reactions,
              };
              updatedMessages[convId] = updatedMessagesArray;
            }
          });

          return updatedMessages;
        });
      }
    );

    // Listen for typing indicators
    socketInstance.on(
      'typing',
      (typingData: { userId: string; name: string }) => {
        // Handle typing indicator (could update UI state)
        console.log('User is typing:', typingData);
      }
    );

    socketInstance.on('stop_typing', ({ userId }) => {
      // Handle stop typing
      console.log('User stopped typing:', userId);
    });

    // Listen for user presence updates
    socketInstance.on(
      'user_presence_updated',
      ({ userId, status, lastSeen }) => {
        setUserPresence((prev) => ({
          ...prev,
          [userId]: { status, lastSeen },
        }));
      }
    );

    socketInstance.on('all_users_presence', (presenceStatuses) => {
      const presenceMap: Record<
        string,
        { status: string; lastSeen?: number }
      > = {};
      presenceStatuses.forEach(
        (status: {
          userId: string;
          status: string;
          lastSeen?: number;
        }) => {
          presenceMap[status.userId] = {
            status: status.status,
            lastSeen: status.lastSeen,
          };
        }
      );
      setUserPresence(presenceMap);
    });

    // Listen for unread counts and conversation updates
    socketInstance.on('unread_counts', (data) => {
      console.log('📊 Received unread_counts:', data);
      
      if (data.channels && data.directMessages) {
        // Handle bulk unread counts update
        console.log('📊 Processing bulk unread counts:', data.directMessages);
        
        const updatedConversations: ChatConversation[] = data.directMessages.map((dm: any) => {
          // Get the peer address (the other person in the conversation)
          const conversationParts = dm.conversationId.split('_');
          let displayName = 'Unknown';
          let peerAddress = '';
          
          // Find which part is not the current user
          if (conversationParts.length === 2) {
            if (conversationParts[0] === user?.id || conversationParts[0] === user?.wallet?.address) {
              peerAddress = conversationParts[1];
            } else if (conversationParts[1] === user?.id || conversationParts[1] === user?.wallet?.address) {
              peerAddress = conversationParts[0];
            } else {
              peerAddress = conversationParts[0]; // Fallback
            }
          }
          
          // Create display name
          if (peerAddress) {
            if (peerAddress.startsWith('did:privy:')) {
              displayName = `${peerAddress.substring(0, 10)}...${peerAddress.substring(peerAddress.length - 5)}`;
            } else if (peerAddress.startsWith('0x')) {
              displayName = `${peerAddress.substring(0, 6)}...${peerAddress.substring(peerAddress.length - 4)}`;
            } else {
              displayName = peerAddress;
            }
          }
          
          return {
            conversationId: dm.conversationId,
            peerAddress,
            displayName,
            lastMessage: dm.lastMessage || '',
            lastMessageTime: dm.lastMessageTime || new Date().toISOString(),
            unreadCount: dm.count || 0,
          };
        });

        console.log('📊 Setting conversations from bulk update:', updatedConversations);
        setConversations(updatedConversations);
      } else if (data.conversationId) {
        // Handle single conversation update
        console.log('📊 Processing single conversation update:', data);
        
        setConversations((prev) => {
          const index = prev.findIndex(
            (conv) => conv.conversationId === data.conversationId
          );
          
          if (index !== -1) {
            // Update existing conversation
            const updatedConversations = [...prev];
            updatedConversations[index] = {
              ...updatedConversations[index],
              unreadCount: data.count || 0,
              lastMessage: data.lastMessage || updatedConversations[index].lastMessage,
              lastMessageTime: data.lastMessageTime || updatedConversations[index].lastMessageTime,
            };
            console.log('📊 Updated existing conversation:', updatedConversations[index]);
            return updatedConversations;
          } else if (data.senderId && data.senderId !== user?.id) {
            // Create new conversation entry
            let displayName = 'Unknown';
            let peerAddress = data.senderId;
            
            // Format display name
            if (peerAddress.startsWith('did:privy:')) {
              displayName = `${peerAddress.substring(0, 10)}...${peerAddress.substring(peerAddress.length - 5)}`;
            } else if (peerAddress.startsWith('0x')) {
              displayName = `${peerAddress.substring(0, 6)}...${peerAddress.substring(peerAddress.length - 4)}`;
            } else {
              displayName = peerAddress;
            }

            const newConversation = {
              conversationId: data.conversationId,
              peerAddress,
              displayName,
              lastMessage: data.lastMessage || '',
              lastMessageTime: data.lastMessageTime || new Date().toISOString(),
              unreadCount: data.count || 0,
            };
            
            console.log('📊 Creating new conversation:', newConversation);
            return [...prev, newConversation];
          }
          return prev;
        });
      }
    });

    // Listen for conversation list (alternative event)
    socketInstance.on('conversation_list', (conversationList: any[]) => {
      console.log('📋 Received conversation_list:', conversationList);
      
      if (conversationList && Array.isArray(conversationList)) {
        const formattedConversations: ChatConversation[] = conversationList.map((conv: any) => {
          // Format the conversation data
          let displayName = 'Unknown';
          const peerAddress = conv.peerAddress || conv.recipientId || '';
          
          if (peerAddress) {
            if (peerAddress.startsWith('did:privy:')) {
              displayName = `${peerAddress.substring(0, 10)}...${peerAddress.substring(peerAddress.length - 5)}`;
            } else if (peerAddress.startsWith('0x')) {
              displayName = `${peerAddress.substring(0, 6)}...${peerAddress.substring(peerAddress.length - 4)}`;
            } else {
              displayName = peerAddress;
            }
          }
          
          return {
            conversationId: conv.conversationId || `${conv.senderId}_${conv.recipientId}`,
            peerAddress,
            displayName: conv.displayName || displayName,
            lastMessage: conv.lastMessage || '',
            lastMessageTime: conv.lastMessageTime || new Date().toISOString(),
            unreadCount: conv.unreadCount || 0,
          };
        });
        
        console.log('📋 Setting conversations from conversation_list:', formattedConversations);
        setConversations(formattedConversations);
      }
    });

    // Listen for edited messages
    socketInstance.on(
      'message_edited',
      ({ messageId, newContent, edited }) => {
        setMessages((prev) => {
          const updatedMessages = { ...prev };

          Object.keys(updatedMessages).forEach((convId) => {
            const messageIndex = updatedMessages[convId].findIndex(
              (msg) => msg._id === messageId
            );

            if (messageIndex !== -1) {
              const updatedMessagesArray = [
                ...updatedMessages[convId],
              ];
              updatedMessagesArray[messageIndex] = {
                ...updatedMessagesArray[messageIndex],
                content: newContent,
                edited,
              };
              updatedMessages[convId] = updatedMessagesArray;
            }
          });

          return updatedMessages;
        });
      }
    );

    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user, activeConversationId]);

  // Initialize user's presence when connected
  useEffect(() => {
    if (isConnected && socket && user?.id) {
      // Emit user online status with ETH address if available
      socket.emit('user_online', {
        userId: user.id,
        ethAddress: user.wallet?.address || null,
      });

      // Fetch unread message counts
      socket.emit('fetch_unread_counts', { userId: user.id });

      // Debug: log connection status
      console.log(
        `Socket connected and user authenticated: ${user.id}`
      );
      if (user.wallet?.address) {
        console.log(`User ETH address: ${user.wallet.address}`);
      }

      // Force join the user's personal room to ensure message delivery
      // This is a backup in case the server-side join doesn't work
      socket.emit('join_user_room', { userId: user.id });

      // Log current messages state
      console.log(`Current messages state:`, {
        conversationCount: Object.keys(messages).length,
        conversations: Object.keys(messages),
      });

      // **CRITICAL FIX**: Immediately request conversation history
      // The server should respond with unread_counts event that populates conversations
      console.log('🔄 Requesting conversation history and unread counts...');
      socket.emit('fetch_unread_counts', { userId: user.id });
      
      // Also try alternative methods to get conversation data
      socket.emit('get_conversation_list', { userId: user.id });
      
      // Set a fallback timer to retry if no conversations are received
      const conversationRetryTimer = setTimeout(() => {
        if (conversations.length === 0) {
          console.log('⚠️ No conversations received after 3 seconds, retrying...');
          socket.emit('fetch_unread_counts', { userId: user.id });
          socket.emit('get_conversation_list', { userId: user.id });
        }
      }, 3000);

      // Fetch user's groups - with explicit debug
      console.log(`🔍 Requesting groups for user: ${user.id}`);
      socket.emit('get_user_groups', { userId: user.id });

      // Set a timeout to retry fetching groups if none are received
      const groupRetryTimer = setTimeout(() => {
        if (groups.length === 0) {
          console.log(
            `⚠️ No groups received after 3 seconds, retrying...`
          );
          socket.emit('get_user_groups', { userId: user.id });
        }
      }, 3000);

      return () => {
        clearTimeout(conversationRetryTimer);
        clearTimeout(groupRetryTimer);
      };
    }
    // We intentionally exclude some dependencies to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isConnected, socket]);

  // Listen for user groups and group messages
  useEffect(() => {
    if (!socket) return;

    // Handle user groups
    socket.on('user_groups', (userGroups) => {
      console.log('📋 Received user groups:', userGroups);
      console.log(`📋 Groups count: ${userGroups?.length || 0}`);

      if (
        userGroups &&
        Array.isArray(userGroups) &&
        userGroups.length > 0
      ) {
        console.log(
          `📋 First group: ${userGroups[0].name} (${userGroups[0].groupId})`
        );
        setGroups(userGroups);
      } else {
        console.warn('⚠️ Received empty or invalid user_groups data');
        // If we got an empty array, keep any existing groups
        setGroups((prev) => (prev.length > 0 ? prev : []));
      }
    });

    // Handle new group messages
    socket.on('receive_message', (message: ChatMessage) => {
      console.log('📢 GROUP MESSAGE RECEIVED:', message);
      console.log(
        '📢 Current active conversation:',
        activeConversationId
      );
      console.log('📢 Current user:', user?.id);
      console.log(
        '📢 All current conversations:',
        Object.keys(messages)
      );

      // Extract the channel ID (using as conversationId for storage)
      const channelId = message.channelId || message.conversationId;

      if (!channelId) {
        console.warn(
          'Received message without channelId or conversationId:',
          message
        );
        return;
      }

      console.log(
        `📢 Will store message in channel/conversation: ${channelId}`
      );

      // Update the messages state
      setMessages((prev) => {
        console.log(
          `📢 Previous messages for ${channelId}:`,
          prev[channelId]?.length || 0
        );

        const conversationMessages = prev[channelId] || [];

        // Check if the message already exists to avoid duplicates
        const messageExists = conversationMessages.some(
          (msg) => msg._id === message._id
        );

        if (messageExists) {
          console.log(
            `🔄 Message already exists in channel ${channelId}:`,
            message._id
          );
          return prev;
        }

        // Filter out any temporary message with the same content (from optimistic updates)
        const filteredMessages = conversationMessages.filter(
          (msg) =>
            !(
              msg._id.startsWith('temp_') &&
              msg.content === message.content &&
              Math.abs(
                new Date(msg.createdAt).getTime() -
                  new Date(message.createdAt).getTime()
              ) < 10000
            )
        );

        console.log(`📩 Adding message to channel ${channelId}`);

        // Create the new state
        const newState = {
          ...prev,
          [channelId]: [...filteredMessages, message],
        };

        // Debug the new state
        console.log(
          `📢 After update, messages for ${channelId}:`,
          newState[channelId].length
        );
        console.log(
          `📢 Latest message content: "${
            newState[channelId][newState[channelId].length - 1]
              .content
          }"`
        );

        return newState;
      });

      // Force a re-render if this is the active conversation
      if (channelId === activeConversationId) {
        console.log(
          `🔄 Forcing re-render for active conversation ${channelId}`
        );

        // This is a trick to force React to re-render the component
        setTimeout(() => {
          setActiveConversationId(channelId);
        }, 10);
      }
    });

    return () => {
      socket.off('user_groups');
      socket.off('receive_message');
    };
  }, [socket, activeConversationId, user?.id]);

  // Create a new conversation
  const createConversation = useCallback(
    async (recipientId: string): Promise<string> => {
      // More defensive checking with better error message
      if (!socket) {
        console.warn(
          'Socket not connected, attempting to create conversation without socket'
        );
      }

      if (!user) {
        console.warn('User not authenticated yet');
        // Return a temporary conversation ID that will be replaced when user is available
        return `temp_${recipientId}_${Date.now()}`;
      }

      if (!user.id) {
        console.warn('User has no ID');
        // Return a temporary conversation ID that will be replaced when user ID is available
        return `temp_${recipientId}_${Date.now()}`;
      }

      // IMPORTANT: Always use ETH addresses for conversation IDs when available
      // This ensures consistency between different clients and the server
      const userEthAddress = user.wallet?.address;
      const recipientEthAddress = recipientId;

      // If recipient is a Privy ID, we need to get its ETH address from the server
      if (recipientId.startsWith('did:privy:')) {
        console.log('Recipient is a Privy ID, using as is for now');
        // We'll rely on the server to handle this correctly
      }
      // If user ID is a Privy ID but we have their ETH address, use that
      else if (user.id.startsWith('did:privy:') && userEthAddress) {
        console.log(
          `Using user's ETH address (${userEthAddress}) instead of Privy ID for conversation`
        );
      }

      // Create a deterministic conversation ID using the best available IDs
      // Priority: ETH address > Privy ID
      const userId = userEthAddress || user.id;
      const targetId = recipientEthAddress || recipientId;

      // Sort and join to ensure the same conversation ID regardless of who initiates
      const conversationId = [userId, targetId].sort().join('_');
      console.log('Created conversation ID:', conversationId);

      return conversationId;
    },
    [socket, user]
  );

  // Join a conversation
  const joinConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      // Prevent infinite loops - if this conversation is already active, don't rejoin
      if (activeConversationId === conversationId) {
        console.log(
          `Already in conversation ${conversationId}, skipping join`
        );
        return;
      }

      // Always set the active conversation ID immediately for UI
      console.log(
        'Setting active conversation ID to:',
        conversationId
      );
      setActiveConversationId(conversationId);

      // Handle missing socket with warning instead of error
      if (!socket) {
        console.warn(
          'Socket not connected, cannot join conversation yet'
        );
        return;
      }

      // Handle missing user with warning
      if (!user || !user.id) {
        console.warn(
          'User not authenticated yet, cannot join conversation fully'
        );
        return;
      }

      try {
        console.log(
          'Joining conversation:',
          conversationId,
          'as user:',
          user.id
        );

        // IMPORTANT: Check if this is an ETH address-based conversation ID
        // If so, make sure we're using the correct format consistently
        let finalConversationId = conversationId;

        // If the conversation ID contains ETH addresses, make sure we're using the consistent format
        if (conversationId.includes('0x')) {
          console.log(
            'Conversation ID contains ETH addresses, ensuring consistency'
          );

          // Extract the ETH addresses
          const parts = conversationId.split('_');
          if (parts.length === 2) {
            // Sort them to ensure consistent ordering
            const sortedParts = [...parts].sort();
            finalConversationId = sortedParts.join('_');

            if (finalConversationId !== conversationId) {
              console.log(
                `Corrected conversation ID: ${finalConversationId} (was: ${conversationId})`
              );
              // Update the active conversation ID
              setActiveConversationId(finalConversationId);
            }
          }
        }

        // Check if we already have messages for this conversation
        if (
          !messages[finalConversationId] ||
          messages[finalConversationId].length === 0
        ) {
          console.log(
            'No existing messages found, requesting message history'
          );

          // Force an update to messages to ensure the UI displays correctly
          setMessages((prev) => ({
            ...prev,
            [finalConversationId]: prev[finalConversationId] || [],
          }));
        } else {
          console.log(
            `Found ${messages[finalConversationId].length} existing messages for this conversation`
          );
        }

        // Join the conversation room
        socket.emit('join_dm', {
          conversationId: finalConversationId,
          userId: user.id,
        });

        // Reset unread count when joining conversation
        socket.emit('message_read', {
          userId: user.id,
          conversationId: finalConversationId,
        });

        // Force refresh messages for this conversation
        socket.emit('get_private_message_history', {
          conversationId: finalConversationId,
        });

        // Debug: log that we've joined the conversation
        console.log(
          `Joined conversation room: ${finalConversationId}`
        );
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    },
    [socket, user, messages, activeConversationId]
  );

  // Send a message
  const sendMessage = useCallback(
    async ({
      senderId,
      recipientId,
      content,
      attachmentData,
      messageType = 'text',
      conversationId: explicitConversationId,
    }: {
      senderId: string;
      recipientId: string;
      content: string;
      attachmentData?: any;
      messageType?: 'text' | 'image' | 'video' | 'file';
      conversationId?: string;
    }) => {
      if (!socket) {
        console.warn('Socket not connected, cannot send message');
        return;
      }

      try {
        // IMPORTANT: Fix the issue where users are messaging themselves
        // Make sure sender and recipient are different IDs
        let actualSenderId = senderId;
        let actualRecipientId = recipientId;

        // Critical fix: Make sure recipient ID is not the same as sender ID
        if (actualRecipientId === actualSenderId) {
          console.warn(
            'Recipient ID is same as sender ID - attempting to find correct recipient'
          );

          // Try to extract the correct recipient from the conversation ID
          if (activeConversationId) {
            const parts = activeConversationId.split('_');
            if (parts.length === 2) {
              // Find the part that's not the sender
              actualRecipientId =
                parts[0] === senderId ? parts[1] : parts[0];
              console.log(
                `Fixed recipient ID: now using ${actualRecipientId}`
              );
            }
          }
        }

        // IMPORTANT: Use ETH addresses for conversation consistency
        // Check if we have ETH addresses available
        const userEthAddress = user?.wallet?.address;

        // If sender is a Privy ID and we have their ETH address, use the ETH address
        if (
          actualSenderId.startsWith('did:privy:') &&
          userEthAddress
        ) {
          console.log(
            `Using ETH address (${userEthAddress}) instead of Privy ID for sender`
          );
          // We'll keep the Privy ID for the actual message sending, but use ETH for conversation ID
        }

        // Determine the conversation ID to use
        let conversationIdForMessage =
          explicitConversationId || activeConversationId;

        // If we have an explicit conversation ID from the caller, use that
        if (explicitConversationId) {
          console.log(
            `Using explicit conversation ID: ${explicitConversationId}`
          );
        }
        // If we don't have an active conversation ID or want to ensure consistency
        else if (
          !activeConversationId ||
          activeConversationId.includes('temp_')
        ) {
          // Use the best available IDs for the conversation
          const senderIdForConversation =
            userEthAddress || actualSenderId;
          const recipientIdForConversation = actualRecipientId;

          // Create a deterministic conversation ID
          conversationIdForMessage = [
            senderIdForConversation,
            recipientIdForConversation,
          ]
            .sort()
            .join('_');
          console.log(
            'Created consistent conversation ID for message:',
            conversationIdForMessage
          );
        }

        // Ensure conversation ID is normalized (sorted) if it contains ETH addresses
        if (
          conversationIdForMessage &&
          conversationIdForMessage.includes('0x')
        ) {
          const parts = conversationIdForMessage.split('_');
          if (parts.length === 2) {
            const sortedParts = [...parts].sort();
            const sortedConversationId = sortedParts.join('_');

            if (sortedConversationId !== conversationIdForMessage) {
              console.log(
                `Normalizing conversation ID from ${conversationIdForMessage} to ${sortedConversationId}`
              );
              conversationIdForMessage = sortedConversationId;
            }
          }
        }

        console.log(
          `Using IDs for messaging: sender=${actualSenderId}, recipient=${actualRecipientId}, conversation=${conversationIdForMessage}`
        );

        // Ensure we have proper IDs for messaging (either Privy IDs or ETH addresses)
        const isValidSender =
          actualSenderId.startsWith('did:privy:') ||
          actualSenderId.startsWith('0x');
        const isValidRecipient =
          actualRecipientId.startsWith('did:privy:') ||
          actualRecipientId.startsWith('0x');

        if (!isValidSender || !isValidRecipient) {
          console.warn(
            'Invalid sender or recipient ID format - Socket server expects did:privy: or 0x format'
          );
          console.warn('Sender ID:', actualSenderId);
          console.warn('Recipient ID:', actualRecipientId);

          // Try to use known Privy IDs as fallback for sender
          if (!isValidSender && user?.id?.startsWith('did:privy:')) {
            actualSenderId = user.id;
            console.log(
              'Using user.id as fallback for sender:',
              actualSenderId
            );
          }

          // If we still don't have valid IDs, show an error
          if (!isValidSender || !isValidRecipient) {
            console.error(
              'Cannot send message: Invalid user IDs format - must be did:privy: or 0x format'
            );
            return;
          }
        }

        // Create a temporary message for optimistic UI update
        const tempMessageId = `temp_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 9)}`;

        // Get current timestamp
        const now = new Date().toISOString();

        // Create a temporary message object to show immediately
        const tempMessage: ChatMessage = {
          _id: tempMessageId,
          senderId: actualSenderId,
          senderName: actualSenderId.startsWith('did:privy:')
            ? `User ${actualSenderId.substring(10, 16)}...`
            : actualSenderId.substring(0, 6) + '...',
          senderImage: '',
          recipientId: actualRecipientId || '',
          conversationId: conversationIdForMessage || '',
          content,
          createdAt: now,
          messageType,
          attachment: attachmentData ? 'pending...' : undefined,
        };

        // Optimistically add the message to UI if we have a valid conversation ID
        if (conversationIdForMessage) {
          setMessages((prev) => ({
            ...prev,
            [conversationIdForMessage]: [
              ...(prev[conversationIdForMessage] || []),
              tempMessage,
            ],
          }));

          // Update conversations list
          setConversations((prev) => {
            const existingConvIndex = prev.findIndex(
              (c) => c.conversationId === conversationIdForMessage
            );

            if (existingConvIndex >= 0) {
              // Update existing conversation
              const updatedConversations = [...prev];
              updatedConversations[existingConvIndex] = {
                ...updatedConversations[existingConvIndex],
                lastMessage: content,
                lastMessageTime: now,
              };
              return updatedConversations;
            } else {
              // If conversation doesn't exist yet
              return prev;
            }
          });
        }

        console.log('Sending message:', {
          from: actualSenderId,
          to: actualRecipientId,
          content:
            content.substring(0, 20) +
            (content.length > 20 ? '...' : ''),
          type: messageType,
          hasAttachment: !!attachmentData,
          conversationId: conversationIdForMessage,
        });

        socket.emit('send_dm', {
          senderId: actualSenderId,
          recipientId: actualRecipientId,
          content,
          attachmentData,
          messageType,
          // Pass the consistent conversation ID to ensure messages go to the right conversation
          conversationId: conversationIdForMessage,
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    },
    [socket, activeConversationId, user]
  );

  // Leave a conversation
  const leaveConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      if (!socket) {
        console.warn(
          'Socket not connected, cannot leave conversation'
        );
        setActiveConversationId(null);
        return;
      }

      try {
        socket.emit('leave_dm', { conversationId });
        setActiveConversationId(null);
      } catch (error) {
        console.error('Error leaving conversation:', error);
        // Still reset the active conversation ID
        setActiveConversationId(null);
      }
    },
    [socket]
  );

  // Mark messages as read
  const markAsRead = useCallback(
    async (conversationId: string, userId: string): Promise<void> => {
      if (!socket) {
        console.warn(
          'Socket not connected, cannot mark messages as read'
        );
        return;
      }

      try {
        socket.emit('message_read', { userId, conversationId });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    },
    [socket]
  );

  // Set user online
  const setUserOnline = useCallback(
    async (userId: string): Promise<void> => {
      if (!socket) {
        console.warn(
          'Socket not connected, cannot update online status'
        );
        return;
      }

      try {
        socket.emit('user_online', {
          userId,
          ethAddress: user?.wallet?.address || null,
        });
      } catch (error) {
        console.error('Error setting user online:', error);
      }
    },
    [socket, user]
  );

  // Refresh conversation list
  const refreshConversations =
    useCallback(async (): Promise<void> => {
      if (!socket) {
        console.warn(
          'Socket not connected, cannot refresh conversations'
        );
        return;
      }

      if (!user?.id) {
        console.warn(
          'User not authenticated, cannot refresh conversations'
        );
        return;
      }

      try {
        socket.emit('fetch_unread_counts', { userId: user.id });
      } catch (error) {
        console.error('Error refreshing conversations:', error);
      }
    }, [socket, user]);

  // Group chat methods
  const createGroup = useCallback(
    async ({
      name,
      description = '',
      members = [],
      isPrivate = false,
      avatarUrl = '',
    }: {
      name: string;
      description?: string;
      members?: string[];
      isPrivate?: boolean;
      avatarUrl?: string;
    }): Promise<string> => {
      if (!socket) {
        console.warn('Socket not connected, cannot create group');
        throw new Error('Not connected to chat server');
      }

      if (!user) {
        console.warn('User not authenticated');
        throw new Error('User not authenticated');
      }

      return new Promise((resolve, reject) => {
        const createdBy = user.wallet?.address || user.id;

        socket.emit('create_group', {
          name,
          description,
          createdBy,
          isPrivate,
          members,
          avatarUrl,
        });

        // Listen for group created event
        const handleGroupCreated = (response: {
          success: boolean;
          groupId: string;
          name: string;
        }) => {
          if (response.success) {
            console.log(
              `Group created: ${response.name} (${response.groupId})`
            );

            // Refresh user groups
            socket.emit('get_user_groups', { userId: user.id });

            // Clean up listener
            socket.off('group_created', handleGroupCreated);

            resolve(response.groupId);
          } else {
            reject(new Error('Failed to create group'));
          }
        };

        socket.on('group_created', handleGroupCreated);

        // Add timeout
        setTimeout(() => {
          socket.off('group_created', handleGroupCreated);
          reject(new Error('Group creation timed out'));
        }, 10000);
      });
    },
    [socket, user]
  );

  const joinGroup = useCallback(
    async (groupId: string): Promise<void> => {
      if (!socket) {
        console.warn('Socket not connected, cannot join group');
        throw new Error('Not connected to chat server');
      }

      if (!user?.id) {
        console.warn('User not authenticated');
        throw new Error('User not authenticated');
      }

      return new Promise((resolve, reject) => {
        try {
          socket.emit('join_channel', {
            channelId: groupId,
            userId: user.id,
          });

          // Listen for message history
          const handleMessageHistory = (messages: ChatMessage[]) => {
            // Store the messages
            setMessages((prev) => ({
              ...prev,
              [groupId]: messages,
            }));

            // Set as active conversation
            setActiveConversationId(groupId);

            // Clean up listener
            socket.off('message_history', handleMessageHistory);

            resolve();
          };

          socket.on('message_history', handleMessageHistory);

          // Add timeout
          setTimeout(() => {
            socket.off('message_history', handleMessageHistory);
            reject(new Error('Join group timed out'));
          }, 10000);
        } catch (error) {
          reject(error);
        }
      });
    },
    [socket, user]
  );

  const leaveGroup = useCallback(
    async (groupId: string): Promise<void> => {
      if (!socket || !user?.id) {
        console.warn(
          'Socket not connected or user not authenticated'
        );
        return;
      }

      socket.emit('leave_channel', {
        channelId: groupId,
        userId: user.id,
      });

      if (activeConversationId === groupId) {
        setActiveConversationId(null);
      }
    },
    [socket, user, activeConversationId]
  );

  const addGroupMembers = useCallback(
    async (groupId: string, memberIds: string[]): Promise<void> => {
      if (!socket) {
        console.warn('Socket not connected, cannot add members');
        throw new Error('Not connected to chat server');
      }

      if (!user?.id) {
        console.warn('User not authenticated');
        throw new Error('User not authenticated');
      }

      return new Promise((resolve, reject) => {
        socket.emit('add_group_member', {
          groupId,
          userId: user.id,
          memberIds,
        });

        // Listen for members added event
        const handleMembersAdded = (response: {
          success: boolean;
          groupId: string;
          members: any[];
        }) => {
          if (response.success && response.groupId === groupId) {
            console.log(
              `Added ${response.members.length} members to group ${groupId}`
            );

            // Clean up listener
            socket.off('members_added_success', handleMembersAdded);

            resolve();
          }
        };

        socket.on('members_added_success', handleMembersAdded);

        // Add timeout
        setTimeout(() => {
          socket.off('members_added_success', handleMembersAdded);
          reject(new Error('Add members timed out'));
        }, 10000);
      });
    },
    [socket, user]
  );

  const removeGroupMember = useCallback(async (): Promise<void> => {
    if (!socket || !user?.id) {
      console.warn('Socket not connected or user not authenticated');
      return;
    }

    // This is a placeholder for future implementation
    console.warn('removeGroupMember not fully implemented');
  }, [socket, user]);

  const searchUsers = useCallback(
    async (
      query: string,
      currentGroupId?: string
    ): Promise<any[]> => {
      if (!socket) {
        console.warn('Socket not connected, cannot search users');
        throw new Error('Not connected to chat server');
      }

      return new Promise((resolve, reject) => {
        socket.emit('search_users', {
          query,
          currentGroupId,
        });

        // Listen for search results
        const handleSearchResults = (results: any[]) => {
          console.log(
            `Found ${results.length} users matching "${query}"`
          );

          // Clean up listener
          socket.off('user_search_results', handleSearchResults);

          resolve(results);
        };

        socket.on('user_search_results', handleSearchResults);

        // Add timeout
        setTimeout(() => {
          socket.off('user_search_results', handleSearchResults);
          reject(new Error('User search timed out'));
        }, 10000);
      });
    },
    [socket]
  );

  const getGroupMembers = useCallback(
    async (groupId: string): Promise<GroupMember[]> => {
      if (!socket) {
        console.warn(
          'Socket not connected, cannot get group members'
        );
        throw new Error('Not connected to chat server');
      }

      return new Promise((resolve, reject) => {
        socket.emit('get_group_members', { groupId });

        // Set a timeout to avoid hanging if the server doesn't respond
        const timeout = setTimeout(() => {
          reject(new Error('Request timed out'));
        }, 5000);

        // Wait for the group_members event to come back
        const handleGroupMembers = (data: {
          groupId: string;
          members: GroupMember[];
        }) => {
          if (data.groupId === groupId) {
            // Clean up
            clearTimeout(timeout);
            socket.off('group_members', handleGroupMembers);

            // Return the members
            resolve(data.members);
          }
        };

        socket.on('group_members', handleGroupMembers);
      });
    },
    [socket]
  );

  const sendGroupMessage = useCallback(
    async ({
      groupId,
      content,
      attachmentData,
      messageType = 'text',
    }: {
      groupId: string;
      content: string;
      attachmentData?: any;
      messageType?: 'text' | 'image' | 'video' | 'file';
    }): Promise<void> => {
      if (!socket) {
        console.warn('Socket not connected, cannot send message');
        throw new Error('Not connected to chat server');
      }

      if (!user?.id) {
        console.warn('User not authenticated');
        throw new Error('User not authenticated');
      }

      // Create a temporary message for optimistic UI update
      const tempMessageId = `temp_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      // Get current timestamp
      const now = new Date().toISOString();

      // Create a temporary message object to show immediately
      const tempMessage: ChatMessage = {
        _id: tempMessageId,
        senderId: user.id,
        senderName: user.id.startsWith('did:privy:')
          ? `User ${user.id.substring(10, 16)}...`
          : user.id.substring(0, 6) + '...',
        senderImage: '',
        recipientId: '', // Not relevant for group messages
        conversationId: groupId, // Use groupId as conversationId for consistency
        content,
        createdAt: now,
        messageType,
        attachment: attachmentData ? 'pending...' : undefined,
      };

      // Optimistically add the message to UI
      setMessages((prev) => ({
        ...prev,
        [groupId]: [...(prev[groupId] || []), tempMessage],
      }));

      try {
        // Send the actual message
        socket.emit('send_message', {
          channelId: groupId,
          content,
          userId: user.id,
          messageType,
          attachmentData,
        });

        // We don't replace the temporary message here - we'll wait for the server to send
        // back the official message with the real ID in the message_received event
      } catch (error) {
        console.error('Failed to send group message:', error);

        // If there was an error, remove the temporary message
        setMessages((prev) => {
          if (!prev[groupId]) return prev;

          return {
            ...prev,
            [groupId]: prev[groupId].filter(
              (msg) => msg._id !== tempMessageId
            ),
          };
        });

        throw error;
      }
    },
    [socket, user]
  );

  const value = {
    socket,
    isConnected,
    loading,
    error,
    conversations,
    groups,
    messages,
    activeConversationId,
    createConversation,
    joinConversation,
    sendMessage,
    leaveConversation,
    markAsRead,
    setUserOnline,
    refreshConversations,
    userPresence,
    // Group chat methods
    createGroup,
    joinGroup,
    leaveGroup,
    addGroupMembers,
    removeGroupMember,
    searchUsers,
    getGroupMembers,
    sendGroupMessage,
  };

  return (
    <SocketChatContext.Provider value={value}>
      {children}
    </SocketChatContext.Provider>
  );
}

export function useSocketChat() {
  const context = useContext(SocketChatContext);
  if (context === undefined) {
    throw new Error(
      'useSocketChat must be used within a SocketChatProvider'
    );
  }
  return context;
}
