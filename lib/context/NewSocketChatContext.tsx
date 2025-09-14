'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { usePrivy } from '@privy-io/react-auth';
// Removed unused import
import { chatApiService } from '@/lib/api/chatService';

// Message interfaces based on backend models
export interface ChatMessage {
  _id: string;
  sender: {
    _id: string;
    name: string;
    profilePic?: string;
    email: string;
  };
  receiver: {
    _id: string;
    name: string;
    profilePic?: string;
    email: string;
  };
  message: string;
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  editedAt?: Date;
  replyTo?: {
    _id: string;
    message: string;
    sender: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    profilePic?: string;
    email: string;
  }>;
  conversationType: 'direct';
  title?: string;
  description?: string;
  lastMessage?: ChatMessage;
  lastActivity: Date;
  isActive: boolean;
  isBlocked: boolean;
  blockedBy?: string;
  createdBy: string;
  settings: {
    muteNotifications: boolean;
    mutedBy: Array<{
      user: string;
      mutedAt: Date;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
  // Extended fields from service
  participant?: {
    _id: string;
    name: string;
    profilePic?: string;
    email: string;
  };
  microsite?: {
    _id: string;
    name: string;
    profilePic?: string;
    brandImg?: string;
    username: string;
    ens?: string;
    parentId: string;
  };
  unreadCount: number;
}

export interface SearchContact {
  userId: string;
  displayName: string;
  ens?: string;
  username?: string;
  avatar?: string;
  microsite?: {
    _id: string;
    name: string;
    profilePic?: string;
    brandImg?: string;
    username: string;
    ens?: string;
    parentId: string;
  };
}

interface SocketChatContextType {
  // Connection state
  socket: Socket | null;
  isConnected: boolean;
  loading: boolean;
  error: Error | null;
  
  // Chat data
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  unreadCount: number;
  userPresence: Record<string, { status: string; lastSeen?: Date }>;
  
  // Chat methods
  sendMessage: (receiverId: string, message: string, messageType?: string, attachments?: any) => Promise<boolean>;
  getConversation: (receiverId: string, page?: number, limit?: number) => Promise<{ success: boolean; data?: any; error?: string }>;
  getConversations: (page?: number, limit?: number) => Promise<{ success: boolean; data?: any; error?: string }>;
  markMessagesAsRead: (senderId: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  editMessage: (messageId: string, newMessage: string) => Promise<boolean>;
  searchContacts: (query: string, limit?: number) => Promise<{ success: boolean; results?: SearchContact[]; error?: string }>;
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  
  // Typing indicators
  startTyping: (receiverId: string) => void;
  stopTyping: (receiverId: string) => void;
  
  // Utility methods
  refreshConversations: () => Promise<void>;
  joinConversation: (receiverId: string) => Promise<{ success: boolean; error?: string }>;
  connect: () => void;
  disconnect: () => void;
}

const SocketChatContext = createContext<SocketChatContextType | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

interface SocketChatProviderProps {
  children: ReactNode;
}

export const SocketChatProvider = ({ children }: SocketChatProviderProps) => {
  const { user: privyUser } = usePrivy();
  
  // Connection state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Chat data
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [userPresence, setUserPresence] = useState<Record<string, { status: string; lastSeen?: Date }>>({});
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;
  const reconnectAttempts = useRef(0);

  // Connect to socket
  const connect = useCallback(() => {
    if (!privyUser?.id || socketRef.current) return;

    console.log('🔌 [NewSocketChat] Connecting to socket:', SOCKET_URL);
    setLoading(true);
    setError(null);

    try {
      // Get JWT token from localStorage or wherever you store it
      const jwtToken = localStorage.getItem('authToken') || localStorage.getItem('jwt_token') || localStorage.getItem('accessToken');
      
      if (!jwtToken) {
        console.error('❌ [NewSocketChat] No JWT token available for socket authentication');
        setError(new Error('No authentication token available. Please log in again.'));
        setLoading(false);
        return;
      }

      console.log('🔑 [NewSocketChat] Using JWT token for authentication');

      const newSocket = io(SOCKET_URL, {
        auth: {
          token: jwtToken, // Use JWT token like in the HTML test file
        },
        extraHeaders: {
          'ngrok-skip-browser-warning': 'true'
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('✅ [NewSocketChat] Connected to server');
        setIsConnected(true);
        setLoading(false);
        setError(null);
        reconnectAttempts.current = 0;
        
        // Join user to their personal room
        newSocket.emit('join_user_room', privyUser.id);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ [NewSocketChat] Disconnected:', reason);
        setIsConnected(false);
        
        // Auto-reconnect logic
        if (reason === 'io server disconnect') {
          // Server disconnected, manual reconnect needed
          scheduleReconnect();
        }
      });

      newSocket.on('connect_error', (err) => {
        console.error('🚨 [NewSocketChat] Connection error:', err);
        setError(new Error(`Connection failed: ${err.message}`));
        setLoading(false);
        scheduleReconnect();
      });

      // Chat event handlers matching backend implementation
      newSocket.on('new_message', (data: { message: ChatMessage }) => {
        console.log('📨 [NewSocketChat] New message received:', data);
        
        if (!data?.message) return;
        const message = data.message;
        
        // Add message to the appropriate conversation
        const conversationKey = getConversationKey(message.sender._id, message.receiver._id);
        setMessages(prev => ({
          ...prev,
          [conversationKey]: [...(prev[conversationKey] || []), message]
        }));
        
        // Update conversations list
        refreshConversations();
      });

      newSocket.on('messages_read', (data: { senderId: string; receiverId: string; readAt: Date }) => {
        console.log('👁️ [NewSocketChat] Messages marked as read:', data);
        // Update read status in messages
        updateMessageReadStatus(data.senderId, data.receiverId, data.readAt);
      });

      newSocket.on('message_deleted', (data: { messageId: string; deletedAt: Date }) => {
        console.log('🗑️ [NewSocketChat] Message deleted:', data);
        // Update message deletion status
        updateMessageDeletion(data.messageId, data.deletedAt);
      });

      newSocket.on('message_edited', (data: { message: ChatMessage }) => {
        console.log('✏️ [NewSocketChat] Message edited:', data);
        // Update the edited message
        if (data?.message) {
          updateEditedMessage(data.message);
        }
      });

      newSocket.on('conversation_updated', () => {
        console.log('🔄 [NewSocketChat] Conversation updated');
        // Refresh conversations when they're updated
        refreshConversations();
      });

      newSocket.on('typing_started', (data: { userId: string }) => {
        console.log('⌨️ [NewSocketChat] User started typing:', data);
        // Handle typing indicators if needed
      });

      newSocket.on('typing_stopped', (data: { userId: string }) => {
        console.log('⌨️ [NewSocketChat] User stopped typing:', data);
        // Handle typing indicators if needed
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

    } catch (err) {
      console.error('🚨 [NewSocketChat] Failed to create socket:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [privyUser?.id]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 [NewSocketChat] Disconnecting socket');
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('🚨 [NewSocketChat] Max reconnection attempts reached');
      setError(new Error('Maximum reconnection attempts reached. Please refresh the page.'));
      return;
    }

    const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    console.log(`🔄 [NewSocketChat] Scheduling reconnect in ${timeout}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current++;
      disconnect();
      connect();
    }, timeout);
  }, [connect, disconnect]);

  // Helper functions
  const getConversationKey = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('_');
  };

  const updateMessageReadStatus = (senderId: string, receiverId: string, readAt: Date) => {
    const conversationKey = getConversationKey(senderId, receiverId);
    setMessages(prev => ({
      ...prev,
      [conversationKey]: prev[conversationKey]?.map(msg => 
        msg.sender._id === senderId && msg.receiver._id === receiverId 
          ? { ...msg, isRead: true, readAt }
          : msg
      ) || []
    }));
  };

  const updateMessageDeletion = (messageId: string, deletedAt: Date) => {
    setMessages(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key] = updated[key].map(msg => 
          msg._id === messageId 
            ? { ...msg, isDeleted: true, deletedAt }
            : msg
        );
      });
      return updated;
    });
  };

  const updateEditedMessage = (editedMessage: ChatMessage) => {
    const conversationKey = getConversationKey(editedMessage.sender._id, editedMessage.receiver._id);
    setMessages(prev => ({
      ...prev,
      [conversationKey]: prev[conversationKey]?.map(msg => 
        msg._id === editedMessage._id ? editedMessage : msg
      ) || []
    }));
  };

  // Chat methods
  const sendMessage = useCallback(async (
    receiverId: string,
    message: string,
    messageType = 'text',
    attachments?: any
  ): Promise<boolean> => {
    if (!socket || !isConnected) {
      console.error('❌ [NewSocketChat] Socket not connected');
      return false;
    }

    return new Promise((resolve) => {
      const messageData = {
        receiverId,
        message,
        messageType,
        ...(attachments && { 
          fileUrl: attachments.fileUrl,
          fileName: attachments.fileName,
          fileSize: attachments.fileSize 
        })
      };

      // Emit through socket with callback (matching HTML test pattern)
      socket.emit('send_message', messageData, (response: { success: boolean; error?: string }) => {
        if (response?.success) {
          console.log('✅ [NewSocketChat] Message sent successfully');
          resolve(true);
        } else {
          console.error('❌ [NewSocketChat] Failed to send message:', response?.error);
          resolve(false);
        }
      });
    });
  }, [socket, isConnected]);

  const getConversation = useCallback(async (
    receiverId: string,
    page = 1,
    limit = 50
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    if (!socket || !isConnected) {
      return { success: false, error: 'Socket not connected' };
    }

    return new Promise((resolve) => {
      // Use socket method like in HTML test
      socket.emit('get_conversation_history', {
        receiverId,
        page,
        limit
      }, (response: { success: boolean; messages?: any[]; error?: string }) => {
        if (response?.success && response.messages) {
          // Store messages in local state
          const conversationKey = getConversationKey(privyUser?.id || '', receiverId);
          setMessages(prev => ({
            ...prev,
            [conversationKey]: response.messages || []
          }));
          
          resolve({ success: true, data: { messages: response.messages } });
        } else {
          resolve({ success: false, error: response?.error || 'Failed to load conversation' });
        }
      });
    });
  }, [socket, isConnected, privyUser?.id]);

  const getConversations = useCallback(async (
    page = 1,
    limit = 20
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    if (!socket || !isConnected) {
      return { success: false, error: 'Socket not connected' };
    }

    return new Promise((resolve) => {
      // Use socket method like in HTML test
      socket.emit('get_conversations', { page, limit }, (response: { success: boolean; conversations?: any[]; error?: string }) => {
        if (response?.success && response.conversations) {
          setConversations(response.conversations);
          resolve({ success: true, data: { conversations: response.conversations } });
        } else {
          resolve({ success: false, error: response?.error || 'Failed to load conversations' });
        }
      });
    });
  }, [socket, isConnected]);

  const refreshConversations = useCallback(async () => {
    const result = await getConversations();
    if (result.success) {
      console.log('🔄 [NewSocketChat] Conversations refreshed');
    }
  }, [getConversations]);

  const markMessagesAsRead = useCallback(async (senderId: string): Promise<boolean> => {
    if (!socket || !isConnected) {
      return false;
    }

    return new Promise((resolve) => {
      // Use socket method like in HTML test
      socket.emit('mark_messages_read', { senderId }, (response: { success: boolean; error?: string }) => {
        if (response?.success) {
          console.log('✅ [NewSocketChat] Messages marked as read');
          resolve(true);
        } else {
          console.error('❌ [NewSocketChat] Failed to mark messages as read:', response?.error);
          resolve(false);
        }
      });
    });
  }, [socket, isConnected]);

  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const response = await chatApiService.deleteMessage(messageId);
      
      if (response.status === 'success' && socket) {
        // Emit deletion through socket
        socket.emit('delete_message', { messageId });
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ [NewSocketChat] Failed to delete message:', error);
      return false;
    }
  }, [socket]);

  const editMessage = useCallback(async (messageId: string, newMessage: string): Promise<boolean> => {
    try {
      const response = await chatApiService.editMessage(messageId, newMessage);
      
      if (response.status === 'success' && socket) {
        // Emit edit through socket
        socket.emit('edit_message', { messageId, message: newMessage });
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ [NewSocketChat] Failed to edit message:', error);
      return false;
    }
  }, [socket]);

  const searchContacts = useCallback(async (
    query: string,
    limit = 10
  ): Promise<{ success: boolean; results?: SearchContact[]; error?: string }> => {
    if (!socket || !isConnected) {
      return { success: false, error: 'Socket not connected' };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Search timeout' });
      }, 10000);

      // Use socket method with callback like in HTML test
      socket.emit('search_contacts', { query, limit }, (response: { success: boolean; results?: SearchContact[]; error?: string }) => {
        clearTimeout(timeout);
        if (response?.success) {
          resolve({ success: true, results: response.results });
        } else {
          resolve({ success: false, error: response?.error || 'Search failed' });
        }
      });
    });
  }, [socket, isConnected]);

  const blockUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const response = await chatApiService.blockUser(userId);
      
      if (response.status === 'success' && socket) {
        socket.emit('block_user', { userId });
        await refreshConversations();
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ [NewSocketChat] Failed to block user:', error);
      return false;
    }
  }, [socket, refreshConversations]);

  const unblockUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const response = await chatApiService.unblockUser(userId);
      
      if (response.status === 'success' && socket) {
        socket.emit('unblock_user', { userId });
        await refreshConversations();
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ [NewSocketChat] Failed to unblock user:', error);
      return false;
    }
  }, [socket, refreshConversations]);

  // Typing indicators
  const startTyping = useCallback((receiverId: string) => {
    if (socket && isConnected) {
      socket.emit('typing_start', { receiverId });
    }
  }, [socket, isConnected]);

  const stopTyping = useCallback((receiverId: string) => {
    if (socket && isConnected) {
      socket.emit('typing_stop', { receiverId });
    }
  }, [socket, isConnected]);

  // Effects
  useEffect(() => {
    if (privyUser?.id && !socket) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [privyUser?.id, connect, disconnect, socket]);

  // Load initial data
  useEffect(() => {
    if (isConnected) {
      refreshConversations();
      
      // Get unread count
      chatApiService.getUnreadCount().then((response) => {
        if (response.status === 'success') {
          setUnreadCount(response.data.unreadCount);
        }
      }).catch(console.error);
    }
  }, [isConnected, refreshConversations]);

  const contextValue: SocketChatContextType = {
    // Connection state
    socket,
    isConnected,
    loading,
    error,
    
    // Chat data
    conversations,
    messages,
    unreadCount,
    userPresence,
    
    // Chat methods
    sendMessage,
    getConversation,
    getConversations,
    markMessagesAsRead,
    deleteMessage,
    editMessage,
    searchContacts,
    blockUser,
    unblockUser,
    
    // Typing indicators
    startTyping,
    stopTyping,
    
    // Utility methods
    refreshConversations,
    joinConversation: useCallback(async (receiverId: string): Promise<{ success: boolean; error?: string }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socket.emit('join_conversation', { receiverId }, (response: { success: boolean; receiverOnline?: boolean; error?: string }) => {
          if (response?.success) {
            console.log('✅ [NewSocketChat] Joined conversation successfully');
            resolve({ success: true });
          } else {
            console.error('❌ [NewSocketChat] Failed to join conversation:', response?.error);
            resolve({ success: false, error: response?.error });
          }
        });
      });
    }, [socket, isConnected]),
    connect,
    disconnect,
  };

  return (
    <SocketChatContext.Provider value={contextValue}>
      {children}
    </SocketChatContext.Provider>
  );
};

export const useNewSocketChat = (): SocketChatContextType => {
  const context = useContext(SocketChatContext);
  if (!context) {
    throw new Error('useNewSocketChat must be used within a SocketChatProvider');
  }
  return context;
};

export default SocketChatProvider;