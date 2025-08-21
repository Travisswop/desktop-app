"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
}

interface SocketChatContextType {
  socket: Socket | null;
  isConnected: boolean;
  loading: boolean;
  error: Error | null;
  conversations: ChatConversation[];
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
  markAsRead: (conversationId: string, userId: string) => Promise<void>;
  setUserOnline: (userId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  userPresence: Record<string, { status: string; lastSeen?: number }>;
}

const SocketChatContext = createContext<SocketChatContextType | undefined>(undefined);

export function SocketChatProvider({ children }: { children: ReactNode }) {
  const { user } = usePrivy();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [userPresence, setUserPresence] = useState<Record<string, { status: string; lastSeen?: number }>>({});
  
  // Create and initialize socket connection
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Connect to socket server
    const socketInstance = io(`${process.env.NEXT_PUBLIC_SOCKET}/anthillChat`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(socketInstance);

    // Socket event handlers
    socketInstance.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
      setLoading(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(new Error(`Connection error: ${err.message}`));
      setLoading(false);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    // Listen for message history
    socketInstance.on('private_message_history', (messageHistory: ChatMessage[]) => {
      setMessages(prev => {
        // Get current active conversation ID from state to avoid dependency warning
        const currentActiveConversationId = activeConversationId;
        if (currentActiveConversationId) {
          return {
            ...prev,
            [currentActiveConversationId]: messageHistory
          };
        }
        return prev;
      });
    });

    // Listen for new direct messages
    socketInstance.on('recived_dm', (message: ChatMessage) => {
      console.log('🔔 RECEIVED MESSAGE EVENT:', message);
      console.log('🔔 Current user:', user?.id);
      console.log('🔔 Active conversation:', activeConversationId);
      console.log('🔔 Socket connected:', isConnected);
      console.log('🔔 Socket ID:', socket?.id);
      
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
            console.log(`Normalizing conversation ID from ${conversationId} to ${sortedConversationId}`);
            conversationId = sortedConversationId;
          }
        }
      }
      
      // Add the message to the messages state
      console.log('🔍 Before updating messages state:', { 
        allConversations: Object.keys(messages),
        hasThisConversation: !!messages[conversationId],
        messageCount: messages[conversationId]?.length || 0
      });
      
      setMessages(prev => {
        console.log('🔍 Inside setMessages callback - previous state:', { 
          allConversations: Object.keys(prev),
          hasThisConversation: !!prev[conversationId],
          messageCount: prev[conversationId]?.length || 0
        });
        
        const conversationMessages = prev[conversationId] || [];
        
        // Check if the message already exists to avoid duplicates
        const messageExists = conversationMessages.some(msg => msg._id === message._id);
        
        if (!messageExists) {
          console.log(`🟢 Adding message to conversation ${conversationId}`);
          
          // Create a debug log to help diagnose issues
          console.log('🟢 Message details:', {
            id: message._id,
            from: message.senderId,
            to: message.recipientId,
            content: message.content,
            conversation: conversationId
          });
          
          // Create the new state
          const newState = {
            ...prev,
            [conversationId]: [...conversationMessages, message]
          };
          
          // Log the new state
          console.log('🔍 New messages state will be:', { 
            allConversations: Object.keys(newState),
            hasThisConversation: !!newState[conversationId],
            messageCount: newState[conversationId]?.length || 0,
            messages: newState[conversationId]
          });
          
          return newState;
        }
        
        console.log('⚠️ Message already exists, not adding:', message._id);
        return prev;
      });
      
      // Force a re-render of the component using this conversation
      if (conversationId === activeConversationId) {
        console.log('🔄 Forcing re-render for active conversation');
        setActiveConversationId(prev => {
          // This is a trick to force a re-render without changing the value
          setTimeout(() => setActiveConversationId(conversationId), 0);
          return prev;
        });
      }
      
      // Update the conversation list with the new message
      setConversations(prev => {
        const index = prev.findIndex(conv => conv.conversationId === conversationId);
        if (index !== -1) {
          const updatedConversations = [...prev];
          updatedConversations[index] = {
            ...updatedConversations[index],
            lastMessage: message.content,
            lastMessageTime: message.createdAt
          };
          return updatedConversations;
        }
        
        // If this is a new conversation, add it to the conversations list
        if (conversationId) {
          // Extract sender/recipient info to create conversation object
          let displayName = '';
          let peerAddress = '';
          
          // Find the ID that's not the current user
          if (user && user.id) {
            const parts = conversationId.split('_');
            
            // Determine which part is the peer (not the current user)
            let peerId;
            if (parts[0] === user.id) {
              peerId = parts[1];
            } else if (parts[1] === user.id) {
              peerId = parts[0];
            } else if (user.wallet?.address) {
              // Check if one of the parts matches the user's ETH address
              if (parts[0] === user.wallet.address) {
                peerId = parts[1];
              } else if (parts[1] === user.wallet.address) {
                peerId = parts[0];
              } else {
                // If neither part matches, use the sender ID if it's not the current user
                peerId = message.senderId !== user.id ? message.senderId : message.recipientId;
              }
            } else {
              // Fallback: use the sender ID if it's not the current user
              peerId = message.senderId !== user.id ? message.senderId : message.recipientId;
            }
            
            peerAddress = peerId;
            
            // Format the display name based on the ID type
            if (peerId.startsWith('did:privy:')) {
              displayName = `${peerId.substring(0, 10)}...${peerId.substring(peerId.length - 5)}`;
            } else if (peerId.startsWith('0x')) {
              displayName = `${peerId.substring(0, 6)}...${peerId.substring(peerId.length - 4)}`;
            } else {
              displayName = peerId;
            }
          }
          
          console.log(`Adding new conversation: ${conversationId} with peer: ${peerAddress}`);
          
          return [
            ...prev,
            {
              conversationId: conversationId,
              peerAddress,
              displayName,
              lastMessage: message.content,
              lastMessageTime: message.createdAt,
              unreadCount: 1
            }
          ];
        }
        
        return prev;
      });
      
      // If this is for the active conversation, update it visually
      if (conversationId === activeConversationId) {
        // Force scroll to bottom by triggering a minor state update
        setActiveConversationId(prev => prev);
      } else {
        // If we're not currently viewing this conversation, show a notification
        console.log(`New message in conversation ${conversationId} while viewing ${activeConversationId}`);
      }
    });

    // Listen for broadcast messages (fallback delivery method)
    socketInstance.on('recived_dm_broadcast', ({ message, senderId, recipientId, conversationId: msgConversationId }) => {
      console.log('🔔 RECEIVED BROADCAST MESSAGE:', message);
      
      // Check if this message is relevant to the current user
      if (user?.id === senderId || user?.id === recipientId || 
          user?.wallet?.address === senderId || user?.wallet?.address === recipientId) {
        console.log('🔔 Broadcast message is relevant to current user, processing...');
        
        // Process it like a normal message
        const normalizedConversationId = msgConversationId.includes('_') 
          ? msgConversationId.split('_').sort().join('_') 
          : msgConversationId;
        
        // Add to messages state if not already there
        setMessages(prev => {
          const conversationMessages = prev[normalizedConversationId] || [];
          const messageExists = conversationMessages.some(msg => msg._id === message._id);
          
          if (!messageExists) {
            console.log(`🟢 Adding broadcast message to conversation ${normalizedConversationId}`);
            return {
              ...prev,
              [normalizedConversationId]: [...conversationMessages, message]
            };
          }
          
          return prev;
        });
      }
    });
    
    // Listen for reaction updates
    socketInstance.on('reaction_updated', ({ messageId, reactions }) => {
      setMessages(prev => {
        const updatedMessages = { ...prev };
        
        // Find the conversation that contains this message
        Object.keys(updatedMessages).forEach(convId => {
          const messageIndex = updatedMessages[convId].findIndex(msg => msg._id === messageId);
          
          if (messageIndex !== -1) {
            const updatedMessagesArray = [...updatedMessages[convId]];
            updatedMessagesArray[messageIndex] = {
              ...updatedMessagesArray[messageIndex],
              reactions
            };
            updatedMessages[convId] = updatedMessagesArray;
          }
        });
        
        return updatedMessages;
      });
    });

    // Listen for typing indicators
    socketInstance.on('typing', (typingData: { userId: string; name: string }) => {
      // Handle typing indicator (could update UI state)
      console.log('User is typing:', typingData);
    });

    socketInstance.on('stop_typing', ({ userId }) => {
      // Handle stop typing
      console.log('User stopped typing:', userId);
    });

    // Listen for user presence updates
    socketInstance.on('user_presence_updated', ({ userId, status, lastSeen }) => {
      setUserPresence(prev => ({
        ...prev,
        [userId]: { status, lastSeen }
      }));
    });

    socketInstance.on('all_users_presence', (presenceStatuses) => {
      const presenceMap: Record<string, { status: string; lastSeen?: number }> = {};
      presenceStatuses.forEach((status: { userId: string; status: string; lastSeen?: number }) => {
        presenceMap[status.userId] = { status: status.status, lastSeen: status.lastSeen };
      });
      setUserPresence(presenceMap);
    });

    // Listen for unread counts
    socketInstance.on('unread_counts', (data) => {
      if (data.channels && data.directMessages) {
        // Handle bulk unread counts update
        const updatedConversations: ChatConversation[] = [
          ...data.directMessages.map((dm: any) => ({
            conversationId: dm.conversationId,
            peerAddress: dm.conversationId.split('_').find((id: string) => id !== user.id) || '',
            displayName: '',  // Will need to be set with user data
            lastMessage: dm.lastMessage,
            lastMessageTime: dm.lastMessageTime,
            unreadCount: dm.count
          }))
        ];
        
        setConversations(updatedConversations);
      } else if (data.conversationId) {
        // Handle single conversation update
        setConversations(prev => {
          const index = prev.findIndex(conv => conv.conversationId === data.conversationId);
          if (index !== -1) {
            const updatedConversations = [...prev];
            updatedConversations[index] = {
              ...updatedConversations[index],
              unreadCount: data.count,
              lastMessage: data.lastMessage,
              lastMessageTime: data.lastMessageTime
            };
            return updatedConversations;
          }
          // If conversation doesn't exist yet, add it
          if (data.senderId && data.senderId !== user?.id) {
            // Create a safe display name from sender ID
            let displayName = 'Unknown';
            try {
              if (typeof data.senderId === 'string' && data.senderId.length > 10) {
                displayName = data.senderId.substring(0, 6) + '...' + data.senderId.substring(data.senderId.length - 4);
              } else {
                displayName = String(data.senderId);
              }
            } catch (err) {
              console.error('Error formatting displayName:', err);
            }
            
            return [...prev, {
              conversationId: data.conversationId,
              peerAddress: data.senderId,
              displayName,
              lastMessage: data.lastMessage || '',
              lastMessageTime: data.lastMessageTime || new Date().toISOString(),
              unreadCount: data.count || 0
            }];
          }
          return prev;
        });
      }
    });

    // Listen for edited messages
    socketInstance.on('message_edited', ({ messageId, newContent, edited }) => {
      setMessages(prev => {
        const updatedMessages = { ...prev };
        
        Object.keys(updatedMessages).forEach(convId => {
          const messageIndex = updatedMessages[convId].findIndex(msg => msg._id === messageId);
          
          if (messageIndex !== -1) {
            const updatedMessagesArray = [...updatedMessages[convId]];
            updatedMessagesArray[messageIndex] = {
              ...updatedMessagesArray[messageIndex],
              content: newContent,
              edited
            };
            updatedMessages[convId] = updatedMessagesArray;
          }
        });
        
        return updatedMessages;
      });
    });

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
        ethAddress: user.wallet?.address || null
      });
      
      // Fetch unread message counts
      socket.emit('fetch_unread_counts', { userId: user.id });
      
      // Debug: log connection status
      console.log(`Socket connected and user authenticated: ${user.id}`);
      if (user.wallet?.address) {
        console.log(`User ETH address: ${user.wallet.address}`);
      }
      
      // Force join the user's personal room to ensure message delivery
      // This is a backup in case the server-side join doesn't work
      socket.emit('join_user_room', { userId: user.id });
      
      // Log current messages state
      console.log(`Current messages state:`, {
        conversationCount: Object.keys(messages).length,
        conversations: Object.keys(messages)
      });
    }
    // We intentionally exclude 'messages' from dependencies to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, socket, user, socket?.id]);

  // Create a new conversation
  const createConversation = useCallback(async (recipientId: string): Promise<string> => {
    // More defensive checking with better error message
    if (!socket) {
      console.warn('Socket not connected, attempting to create conversation without socket');
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
      console.log(`Using user's ETH address (${userEthAddress}) instead of Privy ID for conversation`);
    }
    
    // Create a deterministic conversation ID using the best available IDs
    // Priority: ETH address > Privy ID
    const userId = userEthAddress || user.id;
    const targetId = recipientEthAddress || recipientId;
    
    // Sort and join to ensure the same conversation ID regardless of who initiates
    const conversationId = [userId, targetId].sort().join('_');
    console.log('Created conversation ID:', conversationId);
    
    return conversationId;
  }, [socket, user]);

  // Join a conversation
  const joinConversation = useCallback(async (conversationId: string): Promise<void> => {
    // Prevent infinite loops - if this conversation is already active, don't rejoin
    if (activeConversationId === conversationId) {
      console.log(`Already in conversation ${conversationId}, skipping join`);
      return;
    }
    
    // Always set the active conversation ID immediately for UI
    console.log('Setting active conversation ID to:', conversationId);
    setActiveConversationId(conversationId);
    
    // Handle missing socket with warning instead of error
    if (!socket) {
      console.warn('Socket not connected, cannot join conversation yet');
      return;
    }
    
    // Handle missing user with warning
    if (!user || !user.id) {
      console.warn('User not authenticated yet, cannot join conversation fully');
      return;
    }

    try {
      console.log('Joining conversation:', conversationId, 'as user:', user.id);
      
      // IMPORTANT: Check if this is an ETH address-based conversation ID
      // If so, make sure we're using the correct format consistently
      let finalConversationId = conversationId;
      
      // If the conversation ID contains ETH addresses, make sure we're using the consistent format
      if (conversationId.includes('0x')) {
        console.log('Conversation ID contains ETH addresses, ensuring consistency');
        
        // Extract the ETH addresses
        const parts = conversationId.split('_');
        if (parts.length === 2) {
          // Sort them to ensure consistent ordering
          const sortedParts = [...parts].sort();
          finalConversationId = sortedParts.join('_');
          
          if (finalConversationId !== conversationId) {
            console.log(`Corrected conversation ID: ${finalConversationId} (was: ${conversationId})`);
            // Update the active conversation ID
            setActiveConversationId(finalConversationId);
          }
        }
      }
      
      // Check if we already have messages for this conversation
      if (!messages[finalConversationId] || messages[finalConversationId].length === 0) {
        console.log('No existing messages found, requesting message history');
        
        // Force an update to messages to ensure the UI displays correctly
        setMessages(prev => ({
          ...prev,
          [finalConversationId]: prev[finalConversationId] || []
        }));
      } else {
        console.log(`Found ${messages[finalConversationId].length} existing messages for this conversation`);
      }
      
      // Join the conversation room
      socket.emit('join_dm', { conversationId: finalConversationId, userId: user.id });
      
      // Reset unread count when joining conversation
      socket.emit('message_read', { userId: user.id, conversationId: finalConversationId });
      
      // Force refresh messages for this conversation
      socket.emit('get_private_message_history', { conversationId: finalConversationId });
      
      // Debug: log that we've joined the conversation
      console.log(`Joined conversation room: ${finalConversationId}`);
    } catch (error) {
      console.error('Error joining conversation:', error);
    }
  }, [socket, user, messages, activeConversationId]);

    // Send a message
  const sendMessage = useCallback(async ({ 
    senderId, 
    recipientId, 
    content,
    attachmentData,
    messageType = 'text',
    conversationId: explicitConversationId
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
        console.warn("Recipient ID is same as sender ID - attempting to find correct recipient");
        
        // Try to extract the correct recipient from the conversation ID
        if (activeConversationId) {
          const parts = activeConversationId.split('_');
          if (parts.length === 2) {
            // Find the part that's not the sender
            actualRecipientId = parts[0] === senderId ? parts[1] : parts[0];
            console.log(`Fixed recipient ID: now using ${actualRecipientId}`);
          }
        }
      }
      
      // IMPORTANT: Use ETH addresses for conversation consistency
      // Check if we have ETH addresses available
      const userEthAddress = user?.wallet?.address;
      
      // If sender is a Privy ID and we have their ETH address, use the ETH address
      if (actualSenderId.startsWith('did:privy:') && userEthAddress) {
        console.log(`Using ETH address (${userEthAddress}) instead of Privy ID for sender`);
        // We'll keep the Privy ID for the actual message sending, but use ETH for conversation ID
      }
      
      // Determine the conversation ID to use
      let conversationIdForMessage = explicitConversationId || activeConversationId;
      
      // If we have an explicit conversation ID from the caller, use that
      if (explicitConversationId) {
        console.log(`Using explicit conversation ID: ${explicitConversationId}`);
      }
      // If we don't have an active conversation ID or want to ensure consistency
      else if (!activeConversationId || activeConversationId.includes('temp_')) {
        // Use the best available IDs for the conversation
        const senderIdForConversation = userEthAddress || actualSenderId;
        const recipientIdForConversation = actualRecipientId;
        
        // Create a deterministic conversation ID
        conversationIdForMessage = [senderIdForConversation, recipientIdForConversation].sort().join('_');
        console.log('Created consistent conversation ID for message:', conversationIdForMessage);
      }
      
      // Ensure conversation ID is normalized (sorted) if it contains ETH addresses
      if (conversationIdForMessage && conversationIdForMessage.includes('0x')) {
        const parts = conversationIdForMessage.split('_');
        if (parts.length === 2) {
          const sortedParts = [...parts].sort();
          const sortedConversationId = sortedParts.join('_');
          
          if (sortedConversationId !== conversationIdForMessage) {
            console.log(`Normalizing conversation ID from ${conversationIdForMessage} to ${sortedConversationId}`);
            conversationIdForMessage = sortedConversationId;
          }
        }
      }
      
      console.log(`Using IDs for messaging: sender=${actualSenderId}, recipient=${actualRecipientId}, conversation=${conversationIdForMessage}`);
      
      // Ensure we have proper IDs for messaging (either Privy IDs or ETH addresses)
      const isValidSender = actualSenderId.startsWith('did:privy:') || actualSenderId.startsWith('0x');
      const isValidRecipient = actualRecipientId.startsWith('did:privy:') || actualRecipientId.startsWith('0x');
      
      if (!isValidSender || !isValidRecipient) {
        console.warn('Invalid sender or recipient ID format - Socket server expects did:privy: or 0x format');
        console.warn('Sender ID:', actualSenderId);
        console.warn('Recipient ID:', actualRecipientId);
        
        // Try to use known Privy IDs as fallback for sender
        if (!isValidSender && user?.id?.startsWith('did:privy:')) {
          actualSenderId = user.id;
          console.log('Using user.id as fallback for sender:', actualSenderId);
        }
        
        // If we still don't have valid IDs, show an error
        if (!isValidSender || !isValidRecipient) {
          console.error('Cannot send message: Invalid user IDs format - must be did:privy: or 0x format');
          return;
        }
      }
      
      console.log('Sending message:', {
        from: actualSenderId,
        to: actualRecipientId,
        content: content.substring(0, 20) + (content.length > 20 ? '...' : ''),
        type: messageType,
        hasAttachment: !!attachmentData,
        conversationId: conversationIdForMessage
      });
      
      socket.emit('send_dm', {
        senderId: actualSenderId,
        recipientId: actualRecipientId,
        content,
        attachmentData,
        messageType,
        // Pass the consistent conversation ID to ensure messages go to the right conversation
        conversationId: conversationIdForMessage
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [socket, activeConversationId, user]);

  // Leave a conversation
  const leaveConversation = useCallback(async (conversationId: string): Promise<void> => {
    if (!socket) {
      console.warn('Socket not connected, cannot leave conversation');
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
  }, [socket]);

  // Mark messages as read
  const markAsRead = useCallback(async (conversationId: string, userId: string): Promise<void> => {
    if (!socket) {
      console.warn('Socket not connected, cannot mark messages as read');
      return;
    }

    try {
      socket.emit('message_read', { userId, conversationId });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [socket]);

  // Set user online
  const setUserOnline = useCallback(async (userId: string): Promise<void> => {
    if (!socket) {
      console.warn('Socket not connected, cannot update online status');
      return;
    }

    try {
      socket.emit('user_online', { 
        userId,
        ethAddress: user?.wallet?.address || null
      });
    } catch (error) {
      console.error('Error setting user online:', error);
    }
  }, [socket, user]);

  // Refresh conversation list
  const refreshConversations = useCallback(async (): Promise<void> => {
    if (!socket) {
      console.warn('Socket not connected, cannot refresh conversations');
      return;
    }
    
    if (!user?.id) {
      console.warn('User not authenticated, cannot refresh conversations');
      return;
    }

    try {
      socket.emit('fetch_unread_counts', { userId: user.id });
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    }
  }, [socket, user]);

  const value = {
    socket,
    isConnected,
    loading,
    error,
    conversations,
    messages,
    activeConversationId,
    createConversation,
    joinConversation,
    sendMessage,
    leaveConversation,
    markAsRead,
    setUserOnline,
    refreshConversations,
    userPresence
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
    throw new Error('useSocketChat must be used within a SocketChatProvider');
  }
  return context;
}
