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

// Feature flag for V2 chat system
// Set to true to use new unified messaging architecture
const USE_CHAT_V2 = process.env.NEXT_PUBLIC_USE_CHAT_V2 === 'true';

// Socket event names (V1 or V2 based on feature flag)
const EVENTS = USE_CHAT_V2 ? {
  // Direct chat events
  SEND_MESSAGE: 'send_message_v2',
  GET_CONVERSATION_HISTORY: 'get_conversation_history_v2',
  GET_CONVERSATIONS: 'get_conversations_v2',
  MARK_MESSAGES_READ: 'mark_messages_read_v2',
  DELETE_MESSAGE: 'delete_message_v2',
  EDIT_MESSAGE: 'edit_message_v2',
  SEARCH_CONTACTS: 'search_contacts_v2',
  BLOCK_USER: 'block_user_v2',
  UNBLOCK_USER: 'unblock_user_v2',
  TYPING_START: 'typing_start_v2',
  TYPING_STOP: 'typing_stop_v2',
  JOIN_CONVERSATION: 'join_conversation_v2',
  LEAVE_CONVERSATION: 'leave_conversation_v2',
  GET_UNREAD_COUNT: 'get_unread_count_v2',
  SEARCH_MESSAGES: 'search_messages_v2',

  // Received events
  NEW_MESSAGE: 'new_message_v2',
  MESSAGES_READ: 'messages_read_v2',
  MESSAGE_DELETED: 'message_deleted_v2',
  MESSAGE_EDITED: 'message_edited_v2',
  CONVERSATION_UPDATED: 'conversation_updated_v2',
  USER_TYPING: 'user_typing_v2',
  UNREAD_COUNT_UPDATED: 'unread_count_updated_v2',
} : {
  // Direct chat events (old)
  SEND_MESSAGE: 'send_message',
  GET_CONVERSATION_HISTORY: 'get_conversation_history',
  GET_CONVERSATIONS: 'get_conversations',
  MARK_MESSAGES_READ: 'mark_messages_read',
  DELETE_MESSAGE: 'delete_message',
  EDIT_MESSAGE: 'edit_message',
  SEARCH_CONTACTS: 'search_contacts',
  BLOCK_USER: 'block_user',
  UNBLOCK_USER: 'unblock_user',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  GET_UNREAD_COUNT: 'get_unread_count',
  SEARCH_MESSAGES: 'search_messages',

  // Received events (old)
  NEW_MESSAGE: 'new_message',
  MESSAGES_READ: 'messages_read',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_EDITED: 'message_edited',
  CONVERSATION_UPDATED: 'conversation_updated',
  USER_TYPING: 'typing_started',
  UNREAD_COUNT_UPDATED: 'unread_count_updated',
};

// Message interfaces based on backend models
// Wallet operation types for agentic messaging
export interface WalletOperationData {
  type: 'token_transfer' | 'token_swap' | 'nft_transfer';
  status:
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled';
  transactionHash?: string;
  network: 'solana' | 'ethereum' | 'polygon' | 'base';

  // Token transfer specific data
  tokenTransfer?: {
    tokenMint: string;
    tokenSymbol: string;
    tokenName?: string;
    tokenIcon?: string;
    amount: string;
    decimals: number;
    recipientAddress: string;
    senderAddress: string;
    estimatedFee?: string;
    actualFee?: string;
  };

  // Token swap specific data
  tokenSwap?: {
    inputToken: {
      mint: string;
      symbol: string;
      name?: string;
      icon?: string;
      amount: string;
      decimals: number;
    };
    outputToken: {
      mint: string;
      symbol: string;
      name?: string;
      icon?: string;
      amount: string;
      decimals: number;
    };
    slippage: number;
    estimatedFee?: string;
    actualFee?: string;
    priceImpact?: number;
    route?: any; // Jupiter route data
  };

  // NFT transfer specific data
  nftTransfer?: {
    mintAddress: string;
    name: string;
    image?: string;
    collection?: string;
    recipientAddress: string;
    senderAddress: string;
    estimatedFee?: string;
    actualFee?: string;
  };

  // Common operation data
  estimatedTimeMs?: number;
  actualTimeMs?: number;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
  agentInitiated: boolean; // True if initiated by Solana Agent Kit
  requiresUserApproval: boolean;
  userApproved?: boolean;
  approvedAt?: Date;
}

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
  messageType: 'text' | 'image' | 'file' | 'wallet_operation';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;

  // Wallet operation data
  walletOperation?: WalletOperationData;

  // Legacy attachment support
  attachment?: string;
  attachments?: Array<{
    filename: string;
    url: string;
    size?: number;
    type?: string;
  }>;

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

export interface GroupChat {
  _id: string;
  name: string;
  description?: string;
  participants: Array<{
    userId: {
      _id: string;
      name: string;
      username?: string;
      profilePic?: string;
      email: string;
    };
    role: 'admin' | 'member';
    joinedAt: Date;
  }>;
  botUsers?: Array<{
    botId: string;
    name: string;
    permissions: {
      canExecuteCommands: boolean;
      canReadMessages: boolean;
    };
    addedAt: Date;
  }>;
  settings: {
    isPublic: boolean;
    allowMemberInvite: boolean;
    allowFileShare: boolean;
  };
  lastMessage?: {
    _id: string;
    message: string;
    sender: {
      _id: string;
      name: string;
      isBot?: boolean;
    };
    createdAt: Date;
  };
  activeMembers?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMessage {
  _id: string;
  groupId: string;
  sender: {
    _id: string;
    name: string;
    username?: string;
    profilePic?: string;
    isBot?: boolean;
  };
  message: string;
  messageType: 'text' | 'image' | 'file' | 'wallet_operation';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;

  // Wallet operation data
  walletOperation?: WalletOperationData;

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
  groups: GroupChat[];
  messages: Record<string, ChatMessage[]>;
  groupMessages: Record<string, GroupMessage[]>;
  unreadCount: number;
  userPresence: Record<string, { status: string; lastSeen?: Date }>;

  // Chat type state
  currentChatType: 'direct' | 'group';
  currentGroupId: string | null;
  currentGroupInfo: GroupChat | null;
  isInGroupWithBots: boolean;

  // Direct chat methods
  sendMessage: (
    receiverId: string,
    message: string,
    messageType?: string,
    attachments?: any
  ) => Promise<boolean>;
  getConversation: (
    receiverId: string,
    page?: number,
    limit?: number
  ) => Promise<{ success: boolean; data?: any; error?: string }>;
  getConversations: (
    page?: number,
    limit?: number
  ) => Promise<{ success: boolean; data?: any; error?: string }>;
  markMessagesAsRead: (senderId: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  editMessage: (
    messageId: string,
    newMessage: string
  ) => Promise<boolean>;
  searchContacts: (
    query: string,
    limit?: number
  ) => Promise<{
    success: boolean;
    results?: SearchContact[];
    error?: string;
  }>;
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;

  // Group chat methods
  createGroup: (groupData: {
    name: string;
    description?: string;
    isPublic: boolean;
    members?: string[];
  }) => Promise<{
    success: boolean;
    group?: GroupChat;
    error?: string;
  }>;
  getUserGroups: (
    page?: number,
    limit?: number
  ) => Promise<{
    success: boolean;
    groups?: GroupChat[];
    error?: string;
  }>;
  joinGroup: (
    groupId: string
  ) => Promise<{ success: boolean; error?: string }>;
  leaveGroup: (
    groupId: string
  ) => Promise<{ success: boolean; error?: string }>;
  sendGroupMessage: (
    groupId: string,
    message: string,
    messageType?: string,
    attachments?: any
  ) => Promise<boolean>;
  getGroupHistory: (
    groupId: string,
    page?: number,
    limit?: number
  ) => Promise<{ success: boolean; data?: any; error?: string }>;
  addGroupMember: (
    groupId: string,
    userIdToAdd: string,
    role?: string
  ) => Promise<{ success: boolean; error?: string }>;
  removeGroupMember: (
    groupId: string,
    userIdToRemove: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateGroup: (
    groupId: string,
    updateData: { name?: string; description?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteGroup: (
    groupId: string
  ) => Promise<{ success: boolean; error?: string }>;
  searchGroups: (
    query: string,
    limit?: number
  ) => Promise<{
    success: boolean;
    groups?: GroupChat[];
    error?: string;
  }>;

  // Bot commands
  sendBotCommand: (
    command: string,
    parameters: string,
    groupId: string,
    botId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  addGroupBot: (
    groupId: string,
    botId: string,
    permissions: any
  ) => Promise<{ success: boolean; error?: string }>;

  // Typing indicators
  startTyping: (receiverId: string) => void;
  stopTyping: (receiverId: string) => void;

  // Wallet operation methods
  sendTokenTransfer: (
    receiverId: string,
    tokenMint: string,
    amount: string,
    recipientAddress: string,
    network?: string
  ) => Promise<{
    success: boolean;
    operationId?: string;
    error?: string;
  }>;

  sendTokenSwap: (
    receiverId: string,
    inputTokenMint: string,
    outputTokenMint: string,
    inputAmount: string,
    slippage?: number,
    network?: string
  ) => Promise<{
    success: boolean;
    operationId?: string;
    error?: string;
  }>;

  sendNftTransfer: (
    receiverId: string,
    nftMint: string,
    recipientAddress: string,
    network?: string
  ) => Promise<{
    success: boolean;
    operationId?: string;
    error?: string;
  }>;

  approveWalletOperation: (
    operationId: string
  ) => Promise<{ success: boolean; error?: string }>;
  cancelWalletOperation: (
    operationId: string
  ) => Promise<{ success: boolean; error?: string }>;

  // Agent operation methods
  executeAgentCommand: (
    receiverId: string,
    command: string,
    parameters: any
  ) => Promise<{
    success: boolean;
    operationId?: string;
    error?: string;
  }>;

  // Utility methods
  refreshConversations: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  joinConversation: (
    receiverId: string
  ) => Promise<{ success: boolean; error?: string }>;
  selectGroup: (group: GroupChat | null) => void;
  connect: () => void;
  disconnect: () => void;
}

const SocketChatContext = createContext<SocketChatContextType | null>(
  null
);

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

interface SocketChatProviderProps {
  children: ReactNode;
}

export const SocketChatProvider = ({
  children,
}: SocketChatProviderProps) => {
  const { user: privyUser } = usePrivy();

  // Connection state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Chat data
  const [conversations, setConversations] = useState<Conversation[]>(
    []
  );
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [messages, setMessages] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [groupMessages, setGroupMessages] = useState<
    Record<string, GroupMessage[]>
  >({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [userPresence] = useState<
    Record<string, { status: string; lastSeen?: Date }>
  >({});

  // Chat type state
  const [currentChatType, setCurrentChatType] = useState<
    'direct' | 'group'
  >('direct');
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(
    null
  );
  const [currentGroupInfo, setCurrentGroupInfo] =
    useState<GroupChat | null>(null);
  const [isInGroupWithBots, setIsInGroupWithBots] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;
  const reconnectAttempts = useRef(0);

  // Connect to socket
  const connect = useCallback(() => {
    if (!privyUser?.id || socketRef.current) return;

    console.log(
      '🔌 [NewSocketChat] Connecting to socket:',
      SOCKET_URL
    );
    setLoading(true);
    setError(null);

    try {
      // Get JWT token from cookies (access-token)
      const getTokenFromCookies = () => {
        if (typeof document === 'undefined') return null;

        const cookies = document.cookie.split(';');
        console.log(
          '🍪 [NewSocketChat] Available cookies:',
          cookies.length
        );

        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'access-token') {
            const decodedValue = decodeURIComponent(value);
            console.log(
              '✅ [NewSocketChat] Found access-token (first 20 chars):',
              decodedValue.substring(0, 20) + '...'
            );

            // Validate token format
            const parts = decodedValue.split('.');
            if (parts.length !== 3) {
              console.error(
                '❌ [NewSocketChat] Invalid JWT format - expected 3 parts, got',
                parts.length
              );
              return null;
            }

            return decodedValue;
          }
        }

        console.log(
          '❌ [NewSocketChat] access-token cookie not found'
        );
        console.log(
          '🍪 [NewSocketChat] Available cookie names:',
          cookies.map((c) => c.trim().split('=')[0]).join(', ')
        );
        return null;
      };

      // Wait for token with retry logic
      const waitForToken = async (
        maxRetries = 10,
        delay = 500
      ): Promise<string | null> => {
        for (let i = 0; i < maxRetries; i++) {
          const token = getTokenFromCookies();
          if (token) {
            return token;
          }

          console.log(
            `⏳ [NewSocketChat] Waiting for access-token cookie... (attempt ${
              i + 1
            }/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        return null;
      };

      // Try to get token with retries
      waitForToken().then((jwtToken) => {
        if (!jwtToken) {
          console.error(
            '❌ [NewSocketChat] No JWT token available in cookies after retries'
          );
          console.error(
            '💡 [NewSocketChat] Please ensure you are logged in and the access-token cookie is set'
          );
          setError(
            new Error(
              'No authentication token available. Please log in again.'
            )
          );
          setLoading(false);
          return;
        }

        initializeSocket(jwtToken);
      });

      return;
    } catch (err) {
      console.error(
        '🚨 [NewSocketChat] Failed to create socket:',
        err
      );
      setError(err as Error);
      setLoading(false);
    }
  }, [privyUser?.id]);

  // Initialize socket with token
  const initializeSocket = useCallback(
    (jwtToken: string) => {
      try {
        console.log(
          '🔑 [NewSocketChat] Initializing socket with JWT token'
        );
        console.log(
          '🔑 [NewSocketChat] Token length:',
          jwtToken.length
        );

        const newSocket = io(SOCKET_URL, {
          auth: {
            token: jwtToken, // Use JWT token like in the HTML test file
          },
          extraHeaders: {
            'ngrok-skip-browser-warning': 'true',
          },
          transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
          timeout: 20000,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          forceNew: true,
          withCredentials: true, // Important for CORS with credentials
          upgrade: true, // Allow transport upgrade
          rememberUpgrade: true,
        });

        // Connection event handlers
        newSocket.on('connect', () => {
          console.log('✅ [NewSocketChat] Connected to server');
          console.log(
            '✅ [NewSocketChat] Transport:',
            newSocket.io.engine.transport.name
          );
          console.log('✅ [NewSocketChat] Socket ID:', newSocket.id);
          setIsConnected(true);
          setLoading(false);
          setError(null);
          reconnectAttempts.current = 0;

          // Join user to their personal room
          if (privyUser?.id) {
            newSocket.emit('join_user_room', privyUser.id);
          }
        });

        // Log transport upgrades
        newSocket.io.engine.on('upgrade', (transport: any) => {
          console.log(
            '🔄 [NewSocketChat] Transport upgraded to:',
            transport.name
          );
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
          console.error('🚨 [NewSocketChat] Error details:', {
            message: err.message,
            type: (err as any).type,
            description: (err as any).description,
            context: (err as any).context,
          });

          // Check for specific error types
          if (err.message.includes('websocket error')) {
            console.error(
              '🚨 [NewSocketChat] WebSocket connection failed - trying polling transport'
            );
          }
          if (err.message.includes('xhr poll error')) {
            console.error(
              '🚨 [NewSocketChat] Polling connection failed - check CORS and server availability'
            );
          }

          setError(new Error(`Connection failed: ${err.message}`));
          setLoading(false);
          scheduleReconnect();
        });

        // Chat event handlers matching backend implementation
        console.log('📡 [NewSocketChat] Using Chat V2:', USE_CHAT_V2);
        console.log('📡 [NewSocketChat] Listening for events:', {
          NEW_MESSAGE: EVENTS.NEW_MESSAGE,
          MESSAGES_READ: EVENTS.MESSAGES_READ,
          CONVERSATION_UPDATED: EVENTS.CONVERSATION_UPDATED,
        });

        newSocket.on(
          EVENTS.NEW_MESSAGE,
          (data: { message: ChatMessage }) => {
            console.log(
              '📨 [NewSocketChat] New message received (V2:',
              USE_CHAT_V2,
              '):',
              data
            );

            if (!data?.message) return;
            const message = data.message;

            // Add message to the appropriate conversation
            const conversationKey = getConversationKey(
              message.sender._id,
              message.receiver._id
            );
            setMessages((prev) => ({
              ...prev,
              [conversationKey]: [
                ...(prev[conversationKey] || []),
                message,
              ],
            }));

            // Update conversations list
            refreshConversations();
          }
        );

        newSocket.on(
          EVENTS.MESSAGES_READ,
          (data: {
            senderId: string;
            receiverId: string;
            readAt: Date;
          }) => {
            console.log(
              '👁️ [NewSocketChat] Messages marked as read (V2:',
              USE_CHAT_V2,
              '):',
              data
            );
            // Update read status in messages
            updateMessageReadStatus(
              data.senderId,
              data.receiverId,
              data.readAt
            );
          }
        );

        newSocket.on(
          EVENTS.MESSAGE_DELETED,
          (data: { messageId: string; deletedAt: Date }) => {
            console.log('🗑️ [NewSocketChat] Message deleted (V2:', USE_CHAT_V2, '):', data);
            // Update message deletion status
            updateMessageDeletion(data.messageId, data.deletedAt);
          }
        );

        newSocket.on(
          EVENTS.MESSAGE_EDITED,
          (data: { message: ChatMessage }) => {
            console.log('✏️ [NewSocketChat] Message edited (V2:', USE_CHAT_V2, '):', data);
            // Update the edited message
            if (data?.message) {
              updateEditedMessage(data.message);
            }
          }
        );

        newSocket.on(EVENTS.CONVERSATION_UPDATED, () => {
          console.log('🔄 [NewSocketChat] Conversation updated (V2:', USE_CHAT_V2, ')');
          // Refresh conversations when they're updated
          refreshConversations();
        });

        newSocket.on(EVENTS.USER_TYPING, (data: { userId: string; isTyping?: boolean }) => {
          console.log(
            '⌨️ [NewSocketChat] User typing status (V2:',
            USE_CHAT_V2,
            '):',
            data
          );
          // Handle typing indicators if needed
        });

        // Group chat event handlers
        newSocket.on(
          'new_group_message',
          (data: { message: GroupMessage }) => {
            console.log(
              '📨 [NewSocketChat] New group message received:',
              data
            );

            if (!data?.message) return;
            const message = data.message;

            // Add message to the appropriate group
            setGroupMessages((prev) => ({
              ...prev,
              [message.groupId]: [
                ...(prev[message.groupId] || []),
                message,
              ],
            }));

            // Update groups list
            refreshGroups();
          }
        );

        newSocket.on(
          'group_updated',
          (data: { groupId: string; group?: GroupChat }) => {
            console.log('🔄 [NewSocketChat] Group updated:', data);
            if (data.group) {
              setGroups((prev) =>
                prev.map((g) =>
                  g._id === data.groupId ? data.group! : g
                )
              );
              if (currentGroupId === data.groupId) {
                setCurrentGroupInfo(data.group);
              }
            }
            refreshGroups();
          }
        );

        newSocket.on(
          'group_member_added',
          (data: { groupId: string; member: any }) => {
            console.log(
              '👥 [NewSocketChat] Group member added:',
              data
            );
            refreshGroups();
          }
        );

        newSocket.on(
          'group_member_removed',
          (data: { groupId: string; member: any }) => {
            console.log(
              '👥 [NewSocketChat] Group member removed:',
              data
            );
            refreshGroups();
          }
        );

        newSocket.on(
          'group_deleted',
          (data: { groupId: string; deletedBy: string }) => {
            console.log('🗑️ [NewSocketChat] Group deleted:', data);
            setGroups((prev) =>
              prev.filter((g) => g._id !== data.groupId)
            );
            if (currentGroupId === data.groupId) {
              setCurrentGroupId(null);
              setCurrentGroupInfo(null);
              setCurrentChatType('direct');
            }
          }
        );

        newSocket.on(
          'group_bot_added',
          (data: { groupId: string; botId: string }) => {
            console.log(
              '🤖 [NewSocketChat] Bot added to group:',
              data
            );
            refreshGroups();
            if (currentGroupId === data.groupId) {
              setIsInGroupWithBots(true);
            }
          }
        );

        newSocket.on(
          'bot_command_response',
          (data: {
            response: any;
            botId: string;
            success: boolean;
          }) => {
            console.log(
              '🤖 [NewSocketChat] Bot command response:',
              data
            );
            // Handle bot responses - could add to group messages if needed
          }
        );

        // Wallet operation event handlers
        newSocket.on(
          'wallet_operation_started',
          (data: {
            operationId: string;
            operation: WalletOperationData;
          }) => {
            console.log(
              '💰 [NewSocketChat] Wallet operation started:',
              data
            );
            // Update UI to show operation has started
            updateWalletOperationStatus(
              data.operationId,
              'processing',
              data.operation
            );
          }
        );

        newSocket.on(
          'wallet_operation_completed',
          (data: {
            operationId: string;
            transactionHash: string;
            operation: WalletOperationData;
          }) => {
            console.log(
              '✅ [NewSocketChat] Wallet operation completed:',
              data
            );
            // Update UI to show operation completion
            updateWalletOperationStatus(
              data.operationId,
              'completed',
              {
                ...data.operation,
                transactionHash: data.transactionHash,
                completedAt: new Date(),
              }
            );
          }
        );

        newSocket.on(
          'wallet_operation_failed',
          (data: {
            operationId: string;
            error: string;
            operation: WalletOperationData;
          }) => {
            console.log(
              '❌ [NewSocketChat] Wallet operation failed:',
              data
            );
            // Update UI to show operation failure
            updateWalletOperationStatus(data.operationId, 'failed', {
              ...data.operation,
              errorMessage: data.error,
            });
          }
        );

        newSocket.on(
          'wallet_operation_approval_required',
          (data: {
            operationId: string;
            operation: WalletOperationData;
          }) => {
            console.log(
              '🔐 [NewSocketChat] Wallet operation requires approval:',
              data
            );
            // Show approval dialog
            updateWalletOperationStatus(data.operationId, 'pending', {
              ...data.operation,
              requiresUserApproval: true,
            });
          }
        );

        newSocket.on(
          'agent_command_executed',
          (data: {
            operationId: string;
            result: any;
            success: boolean;
          }) => {
            console.log(
              '🤖 [NewSocketChat] Agent command executed:',
              data
            );
            // Handle agent command results
          }
        );

        socketRef.current = newSocket;
        setSocket(newSocket);
      } catch (err) {
        console.error(
          '🚨 [NewSocketChat] Failed to initialize socket:',
          err
        );
        setError(err as Error);
        setLoading(false);
      }
    },
    [privyUser?.id]
  );

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
      console.log(
        '🚨 [NewSocketChat] Max reconnection attempts reached'
      );
      setError(
        new Error(
          'Maximum reconnection attempts reached. Please refresh the page.'
        )
      );
      return;
    }

    const timeout = Math.min(
      1000 * Math.pow(2, reconnectAttempts.current),
      30000
    );
    console.log(
      `🔄 [NewSocketChat] Scheduling reconnect in ${timeout}ms`
    );

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

  const updateMessageReadStatus = (
    senderId: string,
    receiverId: string,
    readAt: Date
  ) => {
    const conversationKey = getConversationKey(senderId, receiverId);
    setMessages((prev) => ({
      ...prev,
      [conversationKey]:
        prev[conversationKey]?.map((msg) =>
          msg.sender._id === senderId &&
          msg.receiver._id === receiverId
            ? { ...msg, isRead: true, readAt }
            : msg
        ) || [],
    }));
  };

  const updateMessageDeletion = (
    messageId: string,
    deletedAt: Date
  ) => {
    setMessages((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        updated[key] = updated[key].map((msg) =>
          msg._id === messageId
            ? { ...msg, isDeleted: true, deletedAt }
            : msg
        );
      });
      return updated;
    });
  };

  const updateEditedMessage = (editedMessage: ChatMessage) => {
    const conversationKey = getConversationKey(
      editedMessage.sender._id,
      editedMessage.receiver._id
    );
    setMessages((prev) => ({
      ...prev,
      [conversationKey]:
        prev[conversationKey]?.map((msg) =>
          msg._id === editedMessage._id ? editedMessage : msg
        ) || [],
    }));
  };

  const updateWalletOperationStatus = (
    operationId: string,
    status: WalletOperationData['status'],
    operationData: Partial<WalletOperationData>
  ) => {
    setMessages((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((conversationKey) => {
        updated[conversationKey] = updated[conversationKey].map(
          (msg) => {
            if (
              msg.walletOperation &&
              (msg._id === operationId ||
                msg.walletOperation === operationData)
            ) {
              return {
                ...msg,
                walletOperation: {
                  ...msg.walletOperation,
                  status,
                  ...operationData,
                },
              };
            }
            return msg;
          }
        );
      });
      return updated;
    });

    // Also update group messages
    setGroupMessages((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((groupId) => {
        updated[groupId] = updated[groupId].map((msg) => {
          if (
            msg.walletOperation &&
            (msg._id === operationId ||
              msg.walletOperation === operationData)
          ) {
            return {
              ...msg,
              walletOperation: {
                ...msg.walletOperation,
                status,
                ...operationData,
              },
            };
          }
          return msg;
        });
      });
      return updated;
    });
  };

  // Chat methods
  const sendMessage = useCallback(
    async (
      receiverId: string,
      message: string,
      messageType = 'text',
      attachments?: any
    ): Promise<boolean> => {
      if (!socketRef.current || !isConnected) {
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
            fileSize: attachments.fileSize,
          }),
        };

        // Emit through socket with callback (matching HTML test pattern)
        console.log('📤 [NewSocketChat] Sending message via:', EVENTS.SEND_MESSAGE);
        socketRef.current!.emit(
          EVENTS.SEND_MESSAGE,
          messageData,
          (response: { success: boolean; error?: string }) => {
            if (response?.success) {
              console.log(
                '✅ [NewSocketChat] Message sent successfully (V2:',
                USE_CHAT_V2,
                ')'
              );
              resolve(true);
            } else {
              console.error(
                '❌ [NewSocketChat] Failed to send message:',
                response?.error
              );
              resolve(false);
            }
          }
        );
      });
    },
    [isConnected]
  ); // Remove socket from dependencies

  const getConversation = useCallback(
    async (
      receiverId: string,
      page = 1,
      limit = 50
    ): Promise<{ success: boolean; data?: any; error?: string }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        // Use socket method like in HTML test
        socket.emit(
          EVENTS.GET_CONVERSATION_HISTORY,
          {
            receiverId,
            page,
            limit,
          },
          (response: {
            success: boolean;
            messages?: any[];
            error?: string;
          }) => {
            if (response?.success && response.messages) {
              // Store messages in local state
              const conversationKey = getConversationKey(
                privyUser?.id || '',
                receiverId
              );
              setMessages((prev) => ({
                ...prev,
                [conversationKey]: response.messages || [],
              }));

              resolve({
                success: true,
                data: { messages: response.messages },
              });
            } else {
              resolve({
                success: false,
                error:
                  response?.error || 'Failed to load conversation',
              });
            }
          }
        );
      });
    },
    [socket, isConnected, privyUser?.id]
  );

  const getConversations = useCallback(
    async (
      page = 1,
      limit = 20
    ): Promise<{ success: boolean; data?: any; error?: string }> => {
      if (!socketRef.current || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        // Use socket method like in HTML test
        socketRef.current!.emit(
          EVENTS.GET_CONVERSATIONS,
          { page, limit },
          (response: {
            success: boolean;
            conversations?: any[];
            error?: string;
          }) => {
            if (response?.success && response.conversations) {
              console.log(
                '📋 [NewSocketChat] Received conversations:',
                response.conversations.length
              );
              console.log(
                '📋 [NewSocketChat] First conversation sample:',
                response.conversations[0]
              );

              setConversations(response.conversations);
              resolve({
                success: true,
                data: { conversations: response.conversations },
              });
            } else {
              console.error(
                '❌ [NewSocketChat] Failed to load conversations:',
                response?.error
              );
              resolve({
                success: false,
                error:
                  response?.error || 'Failed to load conversations',
              });
            }
          }
        );
      });
    },
    [isConnected]
  ); // Remove socket from dependencies

  const refreshConversations = useCallback(async () => {
    const result = await getConversations();
    if (result.success) {
      console.log('🔄 [NewSocketChat] Conversations refreshed');
    }
  }, [getConversations]);

  // Group chat methods
  const createGroup = useCallback(
    async (groupData: {
      name: string;
      description?: string;
      isPublic: boolean;
      members?: string[];
    }): Promise<{
      success: boolean;
      group?: GroupChat;
      error?: string;
    }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socket.emit(
          'create_group',
          groupData,
          (response: {
            success: boolean;
            group?: GroupChat;
            error?: string;
          }) => {
            if (response?.success && response.group) {
              setGroups((prev) => [...prev, response.group!]);
              resolve({ success: true, group: response.group });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Failed to create group',
              });
            }
          }
        );
      });
    },
    [socket, isConnected]
  );

  const getUserGroups = useCallback(
    async (
      page = 1,
      limit = 20
    ): Promise<{
      success: boolean;
      groups?: GroupChat[];
      error?: string;
    }> => {
      if (!socketRef.current || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socketRef.current!.emit(
          'get_user_groups',
          { page, limit },
          (response: {
            success: boolean;
            groups?: GroupChat[];
            error?: string;
          }) => {
            if (response?.success && response.groups) {
              setGroups(response.groups);
              resolve({ success: true, groups: response.groups });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Failed to load groups',
              });
            }
          }
        );
      });
    },
    [isConnected]
  ); // Remove socket from dependencies

  const refreshGroups = useCallback(async () => {
    const result = await getUserGroups();
    if (result.success) {
      console.log('🔄 [NewSocketChat] Groups refreshed');
    }
  }, [getUserGroups]);

  const joinGroup = useCallback(
    async (
      groupId: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socket.emit(
          'join_group',
          { groupId },
          (response: { success: boolean; error?: string }) => {
            if (response?.success) {
              resolve({ success: true });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Failed to join group',
              });
            }
          }
        );
      });
    },
    [socket, isConnected]
  );

  const leaveGroup = useCallback(
    async (
      groupId: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socket.emit(
          'leave_group',
          { groupId },
          (response: { success: boolean; error?: string }) => {
            if (response?.success) {
              setGroups((prev) =>
                prev.filter((g) => g._id !== groupId)
              );
              if (currentGroupId === groupId) {
                setCurrentGroupId(null);
                setCurrentGroupInfo(null);
                setCurrentChatType('direct');
              }
              resolve({ success: true });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Failed to leave group',
              });
            }
          }
        );
      });
    },
    [socket, isConnected, currentGroupId]
  );

  const sendGroupMessage = useCallback(
    async (
      groupId: string,
      message: string,
      messageType = 'text',
      attachments?: any
    ): Promise<boolean> => {
      if (!socketRef.current || !isConnected) {
        return false;
      }

      return new Promise((resolve) => {
        const messageData = {
          groupId,
          message,
          messageType,
          ...(attachments && {
            fileUrl: attachments.fileUrl,
            fileName: attachments.fileName,
            fileSize: attachments.fileSize,
          }),
        };

        socketRef.current!.emit(
          'send_group_message',
          messageData,
          (response: { success: boolean; error?: string }) => {
            if (response?.success) {
              console.log(
                '✅ [NewSocketChat] Group message sent successfully'
              );
              resolve(true);
            } else {
              console.error(
                '❌ [NewSocketChat] Failed to send group message:',
                response?.error
              );
              resolve(false);
            }
          }
        );
      });
    },
    [isConnected]
  ); // Remove socket from dependencies

  const getGroupHistory = useCallback(
    async (
      groupId: string,
      page = 1,
      limit = 50
    ): Promise<{ success: boolean; data?: any; error?: string }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socket.emit(
          'get_group_messages',
          {
            groupId,
            page,
            limit,
          },
          (response: {
            success: boolean;
            messages?: GroupMessage[];
            error?: string;
          }) => {
            if (response?.success && response.messages) {
              setGroupMessages((prev) => ({
                ...prev,
                [groupId]: response.messages || [],
              }));
              resolve({
                success: true,
                data: { messages: response.messages },
              });
            } else {
              resolve({
                success: false,
                error:
                  response?.error || 'Failed to load group history',
              });
            }
          }
        );
      });
    },
    [socket, isConnected]
  );

  const addGroupMember = useCallback(
    async (
      groupId: string,
      userIdToAdd: string,
      role = 'member'
    ): Promise<{ success: boolean; error?: string }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socket.emit(
          'add_group_member',
          { groupId, userIdToAdd, role },
          (response: { success: boolean; error?: string }) => {
            if (response?.success) {
              refreshGroups();
              resolve({ success: true });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Failed to add member',
              });
            }
          }
        );
      });
    },
    [socket, isConnected, refreshGroups]
  );

  const removeGroupMember = useCallback(
    async (
      groupId: string,
      userIdToRemove: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socket.emit(
          'remove_group_member',
          { groupId, userIdToRemove },
          (response: { success: boolean; error?: string }) => {
            if (response?.success) {
              refreshGroups();
              resolve({ success: true });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Failed to remove member',
              });
            }
          }
        );
      });
    },
    [socket, isConnected, refreshGroups]
  );

  const updateGroup = useCallback(
    async (
      groupId: string,
      updateData: { name?: string; description?: string }
    ): Promise<{ success: boolean; error?: string }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socket.emit(
          'update_group',
          { groupId, ...updateData },
          (response: { success: boolean; error?: string }) => {
            if (response?.success) {
              refreshGroups();
              resolve({ success: true });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Failed to update group',
              });
            }
          }
        );
      });
    },
    [socket, isConnected, refreshGroups]
  );

  const deleteGroup = useCallback(
    async (
      groupId: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socket.emit(
          'delete_group',
          { groupId },
          (response: { success: boolean; error?: string }) => {
            if (response?.success) {
              setGroups((prev) =>
                prev.filter((g) => g._id !== groupId)
              );
              if (currentGroupId === groupId) {
                setCurrentGroupId(null);
                setCurrentGroupInfo(null);
                setCurrentChatType('direct');
              }
              resolve({ success: true });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Failed to delete group',
              });
            }
          }
        );
      });
    },
    [socket, isConnected, currentGroupId]
  );

  const searchGroups = useCallback(
    async (
      query: string,
      limit = 10
    ): Promise<{
      success: boolean;
      groups?: GroupChat[];
      error?: string;
    }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socket.emit(
          'search_groups',
          { query, limit },
          (response: {
            success: boolean;
            groups?: GroupChat[];
            error?: string;
          }) => {
            if (response?.success) {
              resolve({ success: true, groups: response.groups });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Search failed',
              });
            }
          }
        );
      });
    },
    [socket, isConnected]
  );

  const sendBotCommand = useCallback(
    async (
      command: string,
      parameters: string,
      groupId: string,
      botId = 'sendai_bot'
    ): Promise<{ success: boolean; error?: string }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socket.emit(
          'send_bot_command',
          {
            command,
            parameters,
            groupId,
            botId,
          },
          (response: { success: boolean; error?: string }) => {
            if (response?.success) {
              resolve({ success: true });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Bot command failed',
              });
            }
          }
        );
      });
    },
    [socket, isConnected]
  );

  const addGroupBot = useCallback(
    async (
      groupId: string,
      botId: string,
      permissions: any
    ): Promise<{ success: boolean; error?: string }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        socket.emit(
          'add_group_bot',
          { groupId, botId, permissions },
          (response: { success: boolean; error?: string }) => {
            if (response?.success) {
              refreshGroups();
              if (currentGroupId === groupId) {
                setIsInGroupWithBots(true);
              }
              resolve({ success: true });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Failed to add bot',
              });
            }
          }
        );
      });
    },
    [socket, isConnected, refreshGroups, currentGroupId]
  );

  const selectGroup = useCallback((group: GroupChat | null) => {
    if (!group) {
      // Clear group selection (e.g., when selecting Astro or direct chat)
      setCurrentChatType('direct');
      setCurrentGroupId(null);
      setCurrentGroupInfo(null);
      setIsInGroupWithBots(false);
      return;
    }

    setCurrentChatType('group');
    setCurrentGroupId(group._id);
    setCurrentGroupInfo(group);
    setIsInGroupWithBots(
      group.botUsers ? group.botUsers.length > 0 : false
    );
  }, []);

  const markMessagesAsRead = useCallback(
    async (senderId: string): Promise<boolean> => {
      if (!socket || !isConnected) {
        return false;
      }

      return new Promise((resolve) => {
        // Use socket method like in HTML test
        socket.emit(
          EVENTS.MARK_MESSAGES_READ,
          { senderId },
          (response: { success: boolean; error?: string }) => {
            if (response?.success) {
              console.log(
                '✅ [NewSocketChat] Messages marked as read'
              );
              resolve(true);
            } else {
              console.error(
                '❌ [NewSocketChat] Failed to mark messages as read:',
                response?.error
              );
              resolve(false);
            }
          }
        );
      });
    },
    [socket, isConnected]
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      try {
        const response = await chatApiService.deleteMessage(
          messageId
        );

        if (response.status === 'success' && socket) {
          // Emit deletion through socket
          socket.emit(EVENTS.DELETE_MESSAGE, { messageId });
          return true;
        }
        return false;
      } catch (error) {
        console.error(
          '❌ [NewSocketChat] Failed to delete message:',
          error
        );
        return false;
      }
    },
    [socket]
  );

  const editMessage = useCallback(
    async (
      messageId: string,
      newMessage: string
    ): Promise<boolean> => {
      try {
        const response = await chatApiService.editMessage(
          messageId,
          newMessage
        );

        if (response.status === 'success' && socket) {
          // Emit edit through socket
          socket.emit(EVENTS.EDIT_MESSAGE, {
            messageId,
            message: newMessage,
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error(
          '❌ [NewSocketChat] Failed to edit message:',
          error
        );
        return false;
      }
    },
    [socket]
  );

  const searchContacts = useCallback(
    async (
      query: string,
      limit = 10
    ): Promise<{
      success: boolean;
      results?: SearchContact[];
      error?: string;
    }> => {
      if (!socket || !isConnected) {
        return { success: false, error: 'Socket not connected' };
      }

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Search timeout' });
        }, 10000);

        // Use socket method with callback like in HTML test
        socket.emit(
          EVENTS.SEARCH_CONTACTS,
          { query, limit },
          (response: {
            success: boolean;
            results?: SearchContact[];
            error?: string;
          }) => {
            clearTimeout(timeout);
            if (response?.success) {
              resolve({ success: true, results: response.results });
            } else {
              resolve({
                success: false,
                error: response?.error || 'Search failed',
              });
            }
          }
        );
      });
    },
    [socket, isConnected]
  );

  const blockUser = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        const response = await chatApiService.blockUser(userId);

        if (response.status === 'success' && socket) {
          socket.emit(EVENTS.BLOCK_USER, { userId });
          await refreshConversations();
          return true;
        }
        return false;
      } catch (error) {
        console.error(
          '❌ [NewSocketChat] Failed to block user:',
          error
        );
        return false;
      }
    },
    [socket, refreshConversations]
  );

  const unblockUser = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        const response = await chatApiService.unblockUser(userId);

        if (response.status === 'success' && socket) {
          socket.emit(EVENTS.UNBLOCK_USER, { userId });
          await refreshConversations();
          return true;
        }
        return false;
      } catch (error) {
        console.error(
          '❌ [NewSocketChat] Failed to unblock user:',
          error
        );
        return false;
      }
    },
    [socket, refreshConversations]
  );

  // Typing indicators
  const startTyping = useCallback(
    (receiverId: string) => {
      if (socket && isConnected) {
        socket.emit(EVENTS.TYPING_START, { receiverId });
      }
    },
    [socket, isConnected]
  );

  const stopTyping = useCallback(
    (receiverId: string) => {
      if (socket && isConnected) {
        socket.emit(EVENTS.TYPING_STOP, { receiverId });
      }
    },
    [socket, isConnected]
  );

  // Effects
  useEffect(() => {
    if (privyUser?.id && !socketRef.current) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [privyUser?.id]); // Remove connect, disconnect, and socket from dependencies

  // Load initial data
  useEffect(() => {
    if (isConnected) {
      refreshConversations();
      refreshGroups();

      // Get unread count
      chatApiService
        .getUnreadCount()
        .then((response) => {
          if (response.status === 'success') {
            setUnreadCount(response.data.unreadCount);
          }
        })
        .catch(console.error);
    }
  }, [isConnected]); // Remove function dependencies since they're now stable

  const contextValue: SocketChatContextType = {
    // Connection state
    socket,
    isConnected,
    loading,
    error,

    // Chat data
    conversations,
    groups,
    messages,
    groupMessages,
    unreadCount,
    userPresence,

    // Chat type state
    currentChatType,
    currentGroupId,
    currentGroupInfo,
    isInGroupWithBots,

    // Direct chat methods
    sendMessage,
    getConversation,
    getConversations,
    markMessagesAsRead,
    deleteMessage,
    editMessage,
    searchContacts,
    blockUser,
    unblockUser,

    // Group chat methods
    createGroup,
    getUserGroups,
    joinGroup,
    leaveGroup,
    sendGroupMessage,
    getGroupHistory,
    addGroupMember,
    removeGroupMember,
    updateGroup,
    deleteGroup,
    searchGroups,

    // Bot commands
    sendBotCommand,
    addGroupBot,

    // Typing indicators
    startTyping,
    stopTyping,

    // Wallet operation methods (stubs - to be implemented)
    sendTokenTransfer: useCallback(async () => {
      console.warn('sendTokenTransfer not yet implemented');
      return { success: false, error: 'Not implemented' };
    }, []),
    sendTokenSwap: useCallback(async () => {
      console.warn('sendTokenSwap not yet implemented');
      return { success: false, error: 'Not implemented' };
    }, []),
    sendNftTransfer: useCallback(async () => {
      console.warn('sendNftTransfer not yet implemented');
      return { success: false, error: 'Not implemented' };
    }, []),
    approveWalletOperation: useCallback(async () => {
      console.warn('approveWalletOperation not yet implemented');
      return { success: false, error: 'Not implemented' };
    }, []),
    cancelWalletOperation: useCallback(async () => {
      console.warn('cancelWalletOperation not yet implemented');
      return { success: false, error: 'Not implemented' };
    }, []),
    executeAgentCommand: useCallback(async () => {
      console.warn('executeAgentCommand not yet implemented');
      return { success: false, error: 'Not implemented' };
    }, []),

    // Utility methods
    refreshConversations,
    refreshGroups,
    selectGroup,
    joinConversation: useCallback(
      async (
        receiverId: string
      ): Promise<{ success: boolean; error?: string }> => {
        if (!socket || !isConnected) {
          return { success: false, error: 'Socket not connected' };
        }

        return new Promise((resolve) => {
          socket.emit(
            'join_conversation',
            { receiverId },
            (response: {
              success: boolean;
              receiverOnline?: boolean;
              error?: string;
            }) => {
              if (response?.success) {
                console.log(
                  '✅ [NewSocketChat] Joined conversation successfully'
                );
                resolve({ success: true });
              } else {
                console.error(
                  '❌ [NewSocketChat] Failed to join conversation:',
                  response?.error
                );
                resolve({ success: false, error: response?.error });
              }
            }
          );
        });
      },
      [socket, isConnected]
    ),
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
    throw new Error(
      'useNewSocketChat must be used within a SocketChatProvider'
    );
  }
  return context;
};

export default SocketChatProvider;
