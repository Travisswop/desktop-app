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
import { useUser } from '@/lib/UserContext';

// Enhanced message attachment interface
export interface MessageAttachment {
  type: 'image' | 'video' | 'file' | 'audio';
  url: string;
  filename?: string;
  size?: number;
  mimeType?: string;
  thumbnail?: string;
  duration?: number; // For audio/video
}

// Enhanced reaction interface
export interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: string;
}

// Message mention interface
export interface MessageMention {
  userId: string;
  displayName: string;
  startIndex: number;
  length: number;
}

// Message link preview interface
export interface MessageLink {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  domain: string;
}

// Message recipient interface for read receipts
export interface MessageRecipient {
  userId: string;
  deliveredAt?: string;
  readAt?: string;
}

// Message forward info interface
export interface MessageForward {
  messageId: string;
  originalSender: string;
  forwardedAt: string;
}

// Types for messages and conversations

/*
 * ==================== CONVERSATION ID FORMAT DOCUMENTATION ====================
 *
 * CRITICAL SERVER-SIDE ISSUE DETECTED:
 * The server-side conversation ID generation is NOT consistent with client-side rules!
 *
 * From messages.json database analysis:
 * ❌ Server creates: "did:privy:cm6j9e209010hgbux3l8120ve_did:privy:cm8cnwdd100l3127tz4e92k2a"
 * ✅ Should be:     "did:privy:cm8cnwdd100l3127tz4e92k2a_did:privy:cm6j9e209010hgbux3l8120ve"
 *
 * The server is not alphabetically sorting Privy IDs correctly!
 *
 * TEMPORARY CLIENT-SIDE FIX:
 * We've added aggressive normalization and validation to handle server inconsistencies.
 * Messages with incorrect conversation IDs are automatically corrected client-side.
 *
 * PERMANENT SOLUTION NEEDED:
 * The server-side conversation ID generation logic must be updated to follow the same
 * rules as these client-side functions to prevent future inconsistencies.
 *
 * =============================================================================
 */

/**
 * Creates a deterministic conversation ID following the ETH_ADDRESS_PRIVY_ID format
 * @param userId1 First user's ID
 * @param userId2 Second user's ID
 * @returns Conversation ID in format: ETH_ADDRESS_PRIVY_ID or alphabetically sorted for same types
 */
export function createDeterministicConversationId(
  userId1: string,
  userId2: string
): string {
  if (!userId1 || !userId2 || userId1 === userId2) {
    throw new Error(
      `Invalid user IDs for conversation: ${userId1}, ${userId2}`
    );
  }

  // CRITICAL: ETH_ADDRESS_PRIVY_ID format - always put ETH address first
  if (
    (userId1.startsWith('0x') && userId2.startsWith('did:privy:')) ||
    (userId1.startsWith('did:privy:') && userId2.startsWith('0x'))
  ) {
    const ethId = userId1.startsWith('0x') ? userId1 : userId2;
    const privyId = userId1.startsWith('did:privy:')
      ? userId1
      : userId2;
    return `${ethId}_${privyId}`;
  }

  // For same types (both ETH or both Privy), sort alphabetically for consistency
  return [userId1, userId2].sort().join('_');
}

/**
 * Normalizes an existing conversation ID to follow the ETH_ADDRESS_PRIVY_ID format
 * @param conversationId The conversation ID to normalize
 * @returns Normalized conversation ID
 */
export function normalizeConversationId(
  conversationId: string
): string {
  if (!conversationId) return conversationId;

  const parts = conversationId.split('_');
  if (parts.length === 2) {
    // Apply the same logic as createDeterministicConversationId
    try {
      return createDeterministicConversationId(parts[0], parts[1]);
    } catch (error) {
      console.warn(
        'Failed to normalize conversation ID:',
        conversationId,
        error
      );
      return conversationId;
    }
  }

  return conversationId;
}

/**
 * Validates that a conversation ID follows the correct format
 * @param conversationId The conversation ID to validate
 * @param currentUserId The current user's ID
 * @returns Validation result with compliance status and details
 */
export function validateConversationIdFormat(
  conversationId: string,
  currentUserId?: string
) {
  const validation = {
    isValid: true,
    isCompliant: true,
    format: 'unknown' as
      | 'ETH_PRIVY'
      | 'PRIVY_PRIVY'
      | 'ETH_ETH'
      | 'unknown',
    containsCurrentUser: false,
    peerUserId: '',
    warnings: [] as string[],
  };

  if (!conversationId) {
    validation.isValid = false;
    validation.warnings.push('Conversation ID is empty');
    return validation;
  }

  const parts = conversationId.split('_');
  if (parts.length !== 2) {
    validation.isValid = false;
    validation.warnings.push(
      'Conversation ID does not have exactly 2 parts separated by underscore'
    );
    return validation;
  }

  const [first, second] = parts;

  // Determine format
  if (
    (first.startsWith('0x') && second.startsWith('did:privy:')) ||
    (first.startsWith('did:privy:') && second.startsWith('0x'))
  ) {
    validation.format = 'ETH_PRIVY';

    // Check if it's in the correct ETH_PRIVY format
    if (!first.startsWith('0x') || !second.startsWith('did:privy:')) {
      validation.isCompliant = false;
      validation.warnings.push(
        'Mixed ETH/Privy format should have ETH address first, Privy ID second'
      );
    }
  } else if (first.startsWith('0x') && second.startsWith('0x')) {
    validation.format = 'ETH_ETH';

    // Check alphabetical sorting
    if (first > second) {
      validation.isCompliant = false;
      validation.warnings.push(
        'ETH addresses should be sorted alphabetically'
      );
    }
  } else if (
    first.startsWith('did:privy:') &&
    second.startsWith('did:privy:')
  ) {
    validation.format = 'PRIVY_PRIVY';

    // Check alphabetical sorting
    if (first > second) {
      validation.isCompliant = false;
      validation.warnings.push(
        'Privy IDs should be sorted alphabetically'
      );
    }
  } else {
    validation.format = 'unknown';
    validation.warnings.push(
      'Conversation ID contains unrecognized identifier formats'
    );
  }

  // Check if current user is part of the conversation
  if (currentUserId) {
    if (first === currentUserId || second === currentUserId) {
      validation.containsCurrentUser = true;
      validation.peerUserId =
        first === currentUserId ? second : first;
    } else {
      validation.warnings.push(
        'Current user ID not found in conversation ID'
      );
    }
  }

  return validation;
}

export interface ChatMessage {
  _id: string;
  senderId: string;
  conversationId?: string;
  channelId?: string;
  content?: string;
  messageType:
    | 'text'
    | 'image'
    | 'video'
    | 'file'
    | 'audio'
    | 'location'
    | 'contact'
    | 'poll'
    | 'system'
    | 'bot_command'
    | 'transaction'
    | 'crypto_action';

  // Enhanced message features (optional for backward compatibility)
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  recipients?: MessageRecipient[];
  attachments?: MessageAttachment[];

  // Thread support
  parentMessageId?: string;
  threadId?: string;
  replyCount?: number;

  // Forward/Quote support
  forwardedFrom?: MessageForward;

  // Content analysis
  mentions?: MessageMention[];
  hashtags?: string[];
  links?: MessageLink[];

  // Message management
  priority?: 'normal' | 'high' | 'urgent';
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string;

  // Edit history
  editHistory?: Array<{
    content: string;
    editedAt: string;
    reason?: string;
  }>;
  isEdited?: boolean;
  lastEditedAt?: string;

  // Deletion
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedFor?: string[]; // User IDs who deleted for themselves

  // Enhanced reactions
  reactions?: MessageReaction[];

  // Read receipts
  readReceipts?: Array<{
    userId: string;
    readAt: string;
    platform: 'web' | 'mobile' | 'desktop';
  }>;

  // Encryption
  isEncrypted?: boolean;
  encryptionVersion?: string;

  // Temporary messages
  expiresAt?: string;
  ttl?: number;

  // Platform info
  platform?: 'web' | 'mobile' | 'desktop' | 'api';
  clientVersion?: string;

  createdAt: string;
  updatedAt?: string;

  // Legacy fields for backward compatibility
  senderName?: string;
  senderImage?: string;
  recipientId?: string;
  attachment?: string;
  seenBy?: Array<{
    _id: string;
    name: string;
    dp?: string;
  }>;
  edited?: boolean;
  swopensId?: string;
  solanaAddress?: string;
  user_id?: string;
  privyId?: string;
  ethAddress?: string;
  ensName?: string;
  displayName?: string;

  // Bot-specific message fields
  isFromBot?: boolean;
  botId?: string;
  botType?: 'crypto' | 'ai' | 'trading' | 'defi' | 'nft' | 'custom';
  botCommand?: string;
  botResponse?: {
    success: boolean;
    data?: any;
    error?: string;
    actionRequired?: boolean;
    transactionHash?: string;
    networkFee?: string;
  };

  // Crypto transaction fields
  transactionData?: {
    type: 'send' | 'swap' | 'bridge' | 'stake' | 'unstake';
    fromToken?: string;
    toToken?: string;
    amount?: string;
    network?: string;
    gasPrice?: string;
    status?: 'pending' | 'confirmed' | 'failed';
    hash?: string;
    blockNumber?: number;
  };

  // Interactive elements
  quickReplies?: Array<{
    text: string;
    action: string;
    data?: any;
  }>;

  // User verification and permissions
  verificationStatus?:
    | 'unverified'
    | 'email_verified'
    | 'wallet_verified'
    | 'kyc_verified';
  permissions?: string[];
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
  role: 'admin' | 'moderator' | 'member' | 'bot';
  status?: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: number;
  swopensId?: string;
  solanaAddress?: string;
  user_id?: string;
  privyId?: string;
  ethAddress?: string;
  ensName?: string;
  bio?: string;

  // Bot-specific fields
  isBot?: boolean;
  botType?: 'crypto' | 'ai' | 'trading' | 'defi' | 'nft' | 'custom';
  botCapabilities?: Array<
    | 'price_check'
    | 'swap_tokens'
    | 'send_crypto'
    | 'check_balance'
    | 'transaction_history'
    | 'portfolio_analysis'
    | 'defi_yields'
    | 'nft_floor_prices'
    | 'market_analysis'
    | 'trading_signals'
    | 'gas_tracker'
    | 'bridge_tokens'
  >;

  // Channel-specific user settings
  notificationsEnabled?: boolean;
  canInviteOthers?: boolean;
  canInteractWithBots?: boolean;
  joinedAt?: Date;
  lastActivity?: Date;

  // Permissions
  permissions?: Array<
    | 'read_messages'
    | 'send_messages'
    | 'send_media'
    | 'mention_everyone'
    | 'manage_messages'
    | 'kick_members'
    | 'ban_members'
    | 'create_invite'
    | 'manage_channel'
    | 'interact_with_bots'
    | 'execute_bot_commands'
  >;

  // Verification and reputation
  verificationStatus?:
    | 'unverified'
    | 'email_verified'
    | 'wallet_verified'
    | 'kyc_verified';
  reputation?: number;
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
  // New socket events from chat-test-ui.html
  resolveContact: (query: string) => Promise<{ success: boolean; userId?: string; displayName?: string }>;
  searchContacts: (query: string, limit?: number) => Promise<{ success: boolean; results?: any[] }>;
  getConversations: (page?: number, limit?: number) => Promise<{ success: boolean; conversations?: any[] }>;
  joinConversationRoom: (receiverId: string) => Promise<{ success: boolean; receiverOnline?: boolean; error?: string }>;
  sendDirectMessage: (receiverId: string, message: string, messageType?: string) => Promise<{ success: boolean; error?: string }>;
  getConversationHistory: (receiverId: string, page?: number, limit?: number) => Promise<{ success: boolean; messages?: any[]; error?: string }>;
  markMessagesRead: (senderId: string) => Promise<{ success: boolean; error?: string }>;
  startTyping: (receiverId: string) => void;
  stopTyping: (receiverId: string) => void;
  sendGroupMessage: (params: {
    groupId: string;
    content: string;
    attachmentData?: any;
    messageType?: 'text' | 'image' | 'video' | 'file';
  }) => Promise<void>;
  // Bot-specific operations
  sendBotCommand: (params: {
    botId: string;
    command: string;
    parameters?: Record<string, any>;
    conversationId?: string;
    groupId?: string;
  }) => Promise<void>;
  getAvailableBots: (groupId?: string) => Promise<GroupMember[]>;
  addBotToGroup: (groupId: string, botId: string) => Promise<void>;
  removeBotFromGroup: (
    groupId: string,
    botId: string
  ) => Promise<void>;
  getBotCapabilities: (botId: string) => Promise<string[]>;
  // Crypto transaction operations
  initiateCryptoTransaction: (params: {
    type: 'send' | 'swap' | 'bridge';
    fromToken: string;
    toToken?: string;
    amount: string;
    toAddress?: string;
    network: string;
    conversationId?: string;
    groupId?: string;
  }) => Promise<void>;

  // Enhanced message features
  addReaction: (
    messageId: string,
    emoji: string,
    conversationId: string
  ) => Promise<void>;
  removeReaction: (
    messageId: string,
    conversationId: string
  ) => Promise<void>;
  editMessage: (
    messageId: string,
    newContent: string,
    conversationId: string
  ) => Promise<void>;
  deleteMessage: (
    messageId: string,
    conversationId: string,
    deleteFor?: 'me' | 'everyone'
  ) => Promise<void>;
  forwardMessage: (
    originalMessageId: string,
    recipientId: string,
    conversationId: string
  ) => Promise<void>;
  replyToMessage: (
    parentMessageId: string,
    content: string,
    conversationId: string
  ) => Promise<void>;
  markMessageAsRead: (
    messageId: string,
    conversationId: string,
    platform?: string
  ) => Promise<void>;
  pinMessage: (
    messageId: string,
    conversationId: string
  ) => Promise<void>;
  unpinMessage: (
    messageId: string,
    conversationId: string
  ) => Promise<void>;
  searchMessages: (
    query: string,
    conversationId?: string
  ) => Promise<ChatMessage[]>;
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
  const { user: userData } = useUser();

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
  const activeConversationIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  const [userPresence, setUserPresence] = useState<
    Record<string, { status: string; lastSeen?: number }>
  >({});

  // Function to register/update user data in the database
  const registerUserInDatabase = useCallback(async () => {
    if (!socket || !user || !userData) {
      return;
    }
    console.log('🚀 ~ registerUserInDatabase ~ userData:', userData);
    try {
      // Extract Solana address from Privy linked accounts
      const solanaAccount = user.linkedAccounts?.find(
        (account: any) => account.chainType === 'solana'
      ) as any;

      const ethAccount = user.linkedAccounts?.find(
        (account: any) => account.chainType === 'ethereum'
      ) as any;

      const primaryMicrosite = userData?.microsites?.find(
        (microsite: any) => microsite.primary
      ) as any;

      // Prepare user data for the server
      const userDataForServer = {
        // Primary identifiers (at least one required)
        userId: userData?._id,
        email: userData?.email,
        name: primaryMicrosite?.name || userData?.name,
        ensName: userData?.ensName,
        displayName: userData?.ensName || primaryMicrosite?.name,
        bio: primaryMicrosite?.bio || userData?.bio,
        profilePic:
          primaryMicrosite?.profilePic || userData?.profilePic,
        privyId: user.id,
        ethAddress: ethAccount?.address,

        // Additional identifiers
        solanaAddress: solanaAccount?.address,

        // Profile information

        // Preferences
        preferences: {
          language: 'en',
          currency: 'USD',
          notifications: true,
          privacy: {
            showOnlineStatus: true,
            allowBotInteractions: true,
          },
          allowBotInteractions: true,
        },

        // Wallet connections
        walletConnections: [],

        // Social features
        reputation: 0,
        verificationStatus: '',

        // Bot-related fields (default values)
        isBot: false,
        botType: null,
        botCapabilities: [],
        botMetadata: {},
      };

      // Emit user registration/update to the server
      console.log(
        '📤 Sending user registration data:',
        userDataForServer
      );
      socket.emit('register_user', userDataForServer);
    } catch (error) {
      console.error('❌ Error registering user in database:', error);
    }
  }, [socket, user, userData]);

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

      // Register/update user in database when socket connects
      if (user) {
        registerUserInDatabase();
      }
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
          // Use the ref to get the current active conversation ID
          const currentActiveId = activeConversationIdRef.current;
          if (currentActiveId) {
            return {
              ...prev,
              [currentActiveId]: messageHistory,
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
          // Use the ref to get the current active conversation ID
          const currentActiveId = activeConversationIdRef.current;
          if (currentActiveId) {
            return {
              ...prev,
              [currentActiveId]: messageHistory,
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

      // Enhanced conversation ID normalization - FIXED VERSION
      // Use the centralized normalization function

      let conversationId = normalizeConversationId(
        message.conversationId || ''
      );

      if (!conversationId) {
        console.warn(
          'Received message without valid conversation ID:',
          message
        );
        return;
      }

      // CRITICAL: If server sent an incorrect conversation ID, fix it client-side
      // This handles server-side inconsistencies until they're fixed
      if (user?.id) {
        const validation = validateConversationIdFormat(
          conversationId,
          user.id
        );

        if (!validation.isValid) {
          console.error(
            '❌ Received message with invalid conversation ID:',
            validation.warnings
          );
          return;
        }

        if (!validation.containsCurrentUser) {
          console.error(
            '❌ CRITICAL: Message conversation ID does not contain current user!',
            {
              conversationId,
              currentUserId: user.id,
              senderId: message.senderId,
              recipientId: message.recipientId,
            }
          );

          // ATTEMPT TO FIX: Create correct conversation ID from message data
          const otherUserId =
            message.senderId !== user.id
              ? message.senderId
              : message.recipientId;
          if (otherUserId) {
            const correctedId = createDeterministicConversationId(
              user.id,
              otherUserId
            );
            console.warn(
              `🔧 FIXING: Correcting conversation ID from ${conversationId} to ${correctedId}`
            );
            conversationId = correctedId;
          } else {
            console.error(
              '❌ Cannot fix conversation ID: no other user ID found'
            );
            return;
          }
        }

        if (!validation.isCompliant) {
          console.warn(
            '⚠️ Message conversation ID format issues - server may need updates:',
            validation.warnings
          );
        }
      }

      console.log(
        `[RECEIVE_DM] Processing message for conversation: ${conversationId}`
      );

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

          // Enhanced deduplication logic for temporary messages
          const filteredMessages = conversationMessages.filter(
            (msg) => {
              // Keep all non-temporary messages
              if (!msg._id.startsWith('temp_')) {
                return true;
              }

              // For temporary messages, remove if they match the incoming server message
              const isSameSender = msg.senderId === message.senderId;
              const isSameContent =
                (msg.content?.trim() ?? '') ===
                (message.content?.trim() ?? '');

              // Also check for content and timestamp proximity (within 10 seconds)
              const timeDiff = Math.abs(
                new Date(msg.createdAt).getTime() -
                  new Date(message.createdAt).getTime()
              );
              const isTemporallyClose = timeDiff < 10000; // 10 seconds

              if (
                isSameSender &&
                isSameContent &&
                isTemporallyClose
              ) {
                console.log(
                  `🗑️ Removing temporary message ${msg._id} as it's being replaced by server message ${message._id}`
                );
                return false; // Remove this temporary message
              }

              return true; // Keep this temporary message
            }
          );

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

      // No need to force re-render - React will handle this automatically with state updates

      // Update the conversation list with the new message
      setConversations((prev) => {
        console.log(
          '🔍 Updating conversations list with new message for conversation:',
          conversationId
        );

        const index = prev.findIndex(
          (conv) => conv.conversationId === conversationId
        );

        if (index !== -1) {
          console.log(
            `🔍 Found existing conversation at index ${index}`
          );
          const updatedConversations = [...prev];
          updatedConversations[index] = {
            ...updatedConversations[index],
            lastMessage: message.content,
            lastMessageTime: message.createdAt,
            // Don't increment unread count if this is the active conversation
            unreadCount:
              conversationId === activeConversationIdRef.current
                ? 0
                : (updatedConversations[index].unreadCount || 0) + 1,
          };
          console.log(
            `🔍 Updated conversation:`,
            updatedConversations[index]
          );
          return updatedConversations;
        }

        // Create new conversation entry if it doesn't exist
        if (conversationId && user) {
          console.log(
            '🔍 Creating new conversation entry for:',
            conversationId
          );

          // Determine peer address from conversation ID and message
          let peerAddress = '';
          let displayName = 'Unknown';

          // Try to extract peer from conversation ID with strict validation
          const parts = conversationId.split('_');
          if (parts.length === 2) {
            // CRITICAL FIX: Use only user.id for matching, not wallet address
            // This prevents cross-user conversation mixups
            console.log(
              `🔍 Resolving peer from conversation ID: ${conversationId}, current user: ${user.id}`
            );

            if (parts[0] === user.id) {
              peerAddress = parts[1];
              console.log(
                `✅ Peer resolved from conversation ID: ${peerAddress} (user is first part)`
              );
            } else if (parts[1] === user.id) {
              peerAddress = parts[0];
              console.log(
                `✅ Peer resolved from conversation ID: ${peerAddress} (user is second part)`
              );
            } else {
              // CRITICAL: This conversation ID doesn't contain the current user
              console.error(
                '❌ CRITICAL: Conversation ID does not contain current user ID!',
                {
                  conversationId,
                  currentUserId: user.id,
                  parts,
                }
              );
              // Fallback: determine from message sender/recipient
              peerAddress =
                message.senderId !== user.id
                  ? message.senderId || ''
                  : message.recipientId || '';
              console.warn(
                `⚠️ Using fallback peer resolution: ${peerAddress}`
              );
            }
          } else {
            console.warn(
              '⚠️ Invalid conversation ID format:',
              conversationId
            );
            // Fallback: determine from message sender/recipient
            peerAddress =
              message.senderId !== user.id
                ? message.senderId || ''
                : message.recipientId || '';
            console.warn(
              `⚠️ Using fallback peer resolution: ${peerAddress}`
            );
          }

          // Priority order for display name: message ensName -> message displayName -> formatted address
          displayName =
            (message as any).ensName ||
            (message as any).senderEnsName ||
            (message as any).displayName ||
            (message as any).senderDisplayName;

          if (!displayName || displayName === 'Unknown') {
            // If no server-provided name, check if sender user data is included
            if ((message as any).senderUser) {
              displayName =
                (message as any).senderUser.ensName ||
                (message as any).senderUser.displayName ||
                (message as any).senderUser.name;
            }
          }

          // Fallback to formatted address if no ENS/display name available
          if (!displayName || displayName === 'Unknown') {
            if (peerAddress) {
              if (peerAddress.startsWith('did:privy:')) {
                displayName = `${peerAddress.substring(
                  0,
                  10
                )}...${peerAddress.substring(
                  peerAddress.length - 5
                )}`;
              } else if (peerAddress.startsWith('0x')) {
                displayName = `${peerAddress.substring(
                  0,
                  6
                )}...${peerAddress.substring(
                  peerAddress.length - 4
                )}`;
              } else {
                displayName = peerAddress;
              }
            }
          }

          console.log(
            `[NewConversation] ${conversationId}: peerAddress=${peerAddress}, displayName=${displayName}, messageEnsName=${
              (message as any).ensName ||
              (message as any).senderEnsName
            }`
          );

          const newConversation = {
            conversationId,
            peerAddress,
            displayName,
            lastMessage: message.content,
            lastMessageTime: message.createdAt,
            unreadCount:
              conversationId === activeConversationIdRef.current
                ? 0
                : 1,
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

          // Process it like a normal message using same FIXED normalization
          // Use the centralized normalization function and validate
          let normalizedConversationId =
            normalizeConversationId(msgConversationId);

          // CRITICAL: Fix server inconsistencies for broadcast messages too
          if (user?.id && normalizedConversationId) {
            const validation = validateConversationIdFormat(
              normalizedConversationId,
              user.id
            );

            if (!validation.containsCurrentUser) {
              console.error(
                '❌ CRITICAL: Broadcast message conversation ID does not contain current user!',
                {
                  conversationId: normalizedConversationId,
                  currentUserId: user.id,
                  senderId,
                  recipientId,
                }
              );

              // ATTEMPT TO FIX: Create correct conversation ID from message data
              const otherUserId =
                senderId !== user.id ? senderId : recipientId;
              if (otherUserId) {
                const correctedId = createDeterministicConversationId(
                  user.id,
                  otherUserId
                );
                console.warn(
                  `🔧 FIXING BROADCAST: Correcting conversation ID from ${normalizedConversationId} to ${correctedId}`
                );
                normalizedConversationId = correctedId;
              }
            }

            if (!validation.isCompliant) {
              console.warn(
                '⚠️ Broadcast message conversation ID format issues - server may need updates:',
                validation.warnings
              );
            }
          }

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

              // Enhanced deduplication logic for temporary messages (broadcast)
              const filteredMessages = conversationMessages.filter(
                (msg) => {
                  // Keep all non-temporary messages
                  if (!msg._id.startsWith('temp_')) {
                    return true;
                  }

                  // For temporary messages, remove if they match the incoming server message
                  const isSameSender =
                    msg.senderId === message.senderId;
                  const isSameContent =
                    (msg.content?.trim() ?? '') ===
                    (message.content?.trim() ?? '');

                  // Also check for content and timestamp proximity (within 10 seconds)
                  const timeDiff = Math.abs(
                    new Date(msg.createdAt).getTime() -
                      new Date(message.createdAt).getTime()
                  );
                  const isTemporallyClose = timeDiff < 10000; // 10 seconds

                  if (
                    isSameSender &&
                    isSameContent &&
                    isTemporallyClose
                  ) {
                    console.log(
                      `🗑️ Removing temporary broadcast message ${msg._id} as it's being replaced by server message ${message._id}`
                    );
                    return false; // Remove this temporary message
                  }

                  return true; // Keep this temporary message
                }
              );

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
        console.log(
          '📊 Processing bulk unread counts:',
          data.directMessages
        );

        const updatedConversations: ChatConversation[] =
          data.directMessages.map((dm: any) => {
            // CRITICAL: Normalize and validate conversation ID from server
            const conversationId = normalizeConversationId(
              dm.conversationId
            );

            // Validate and fix if needed
            if (user?.id) {
              const validation = validateConversationIdFormat(
                conversationId,
                user.id
              );
              if (!validation.containsCurrentUser) {
                console.error(
                  '❌ CRITICAL: Conversation list ID does not contain current user!',
                  {
                    originalId: dm.conversationId,
                    normalizedId: conversationId,
                    currentUserId: user.id,
                  }
                );
                // For conversation lists, we can't easily reconstruct the other user ID
                // So we'll keep the original but log the issue
                console.warn(
                  '⚠️ Keeping potentially incorrect conversation ID for conversation list'
                );
              }
              if (!validation.isCompliant) {
                console.warn(
                  '⚠️ Conversation list ID format issues - server may need updates:',
                  validation.warnings
                );
              }
            }

            // Get the peer address (the other person in the conversation)
            const conversationParts = conversationId.split('_');
            let displayName = 'Unknown';
            let peerAddress = '';

            // CRITICAL FIX: Use only user.id for matching, not wallet address
            if (conversationParts.length === 2) {
              console.log(
                `🔍 [BulkConversations] Resolving peer for: ${dm.conversationId}, user: ${user?.id}`
              );

              if (conversationParts[0] === user?.id) {
                peerAddress = conversationParts[1];
                console.log(
                  `✅ [BulkConversations] Peer: ${peerAddress} (user is first)`
                );
              } else if (conversationParts[1] === user?.id) {
                peerAddress = conversationParts[0];
                console.log(
                  `✅ [BulkConversations] Peer: ${peerAddress} (user is second)`
                );
              } else {
                console.error(
                  '❌ [BulkConversations] CRITICAL: Conversation does not contain current user!',
                  {
                    conversationId: dm.conversationId,
                    currentUserId: user?.id,
                    parts: conversationParts,
                  }
                );
                peerAddress = conversationParts[0]; // Fallback
              }
            }

            // Priority order for display name: ensName -> displayName -> formatted address
            displayName =
              dm.peerEnsName ||
              dm.peerDisplayName ||
              dm.ensName ||
              dm.displayName;

            if (!displayName || displayName === 'Unknown') {
              // If no server-provided name, check if peer user data is included
              if (dm.peerUser) {
                displayName =
                  dm.peerUser.ensName ||
                  dm.peerUser.displayName ||
                  dm.peerUser.name;
              }
            }

            // Fallback to formatted address if no ENS/display name available
            if (!displayName || displayName === 'Unknown') {
              if (peerAddress) {
                if (peerAddress.startsWith('did:privy:')) {
                  displayName = `${peerAddress.substring(
                    0,
                    10
                  )}...${peerAddress.substring(
                    peerAddress.length - 5
                  )}`;
                } else if (peerAddress.startsWith('0x')) {
                  displayName = `${peerAddress.substring(
                    0,
                    6
                  )}...${peerAddress.substring(
                    peerAddress.length - 4
                  )}`;
                } else {
                  displayName = peerAddress;
                }
              }
            }

            console.log(
              `[Conversation] ${conversationId}: peerAddress=${peerAddress}, displayName=${displayName}, ensName=${
                dm.peerEnsName || dm.ensName
              }`
            );

            return {
              conversationId: conversationId, // Use normalized conversation ID
              peerAddress,
              displayName,
              lastMessage: dm.lastMessage || '',
              lastMessageTime:
                dm.lastMessageTime || new Date().toISOString(),
              unreadCount: dm.count || 0,
            };
          });

        console.log(
          '📊 Setting conversations from bulk update:',
          updatedConversations
        );
        setConversations(updatedConversations);
      } else if (data.conversationId) {
        // Handle single conversation update
        console.log(
          '📊 Processing single conversation update:',
          data
        );

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
              lastMessage:
                data.lastMessage ||
                updatedConversations[index].lastMessage,
              lastMessageTime:
                data.lastMessageTime ||
                updatedConversations[index].lastMessageTime,
            };
            console.log(
              '📊 Updated existing conversation:',
              updatedConversations[index]
            );
            return updatedConversations;
          } else if (data.senderId && data.senderId !== user?.id) {
            // Create new conversation entry
            let displayName = 'Unknown';
            const peerAddress = data.senderId;

            // Priority order for display name: data ensName -> data displayName -> formatted address
            displayName =
              (data as any).ensName ||
              (data as any).senderEnsName ||
              (data as any).displayName ||
              (data as any).senderDisplayName;

            if (!displayName || displayName === 'Unknown') {
              // If no server-provided name, check if sender user data is included
              if ((data as any).senderUser) {
                displayName =
                  (data as any).senderUser.ensName ||
                  (data as any).senderUser.displayName ||
                  (data as any).senderUser.name;
              }
            }

            // Fallback to formatted address if no ENS/display name available
            if (!displayName || displayName === 'Unknown') {
              if (peerAddress.startsWith('did:privy:')) {
                displayName = `${peerAddress.substring(
                  0,
                  10
                )}...${peerAddress.substring(
                  peerAddress.length - 5
                )}`;
              } else if (peerAddress.startsWith('0x')) {
                displayName = `${peerAddress.substring(
                  0,
                  6
                )}...${peerAddress.substring(
                  peerAddress.length - 4
                )}`;
              } else {
                displayName = peerAddress;
              }
            }

            console.log(
              `[SingleConversation] ${
                data.conversationId
              }: peerAddress=${peerAddress}, displayName=${displayName}, dataEnsName=${
                (data as any).ensName || (data as any).senderEnsName
              }`
            );

            const newConversation = {
              conversationId: data.conversationId,
              peerAddress,
              displayName,
              lastMessage: data.lastMessage || '',
              lastMessageTime:
                data.lastMessageTime || new Date().toISOString(),
              unreadCount: data.count || 0,
            };

            console.log(
              '📊 Creating new conversation:',
              newConversation
            );
            return [...prev, newConversation];
          }
          return prev;
        });
      }
    });

    // Listen for conversation list (alternative event)
    socketInstance.on(
      'conversation_list',
      (conversationList: any[]) => {
        console.log(
          '📋 Received conversation_list:',
          conversationList
        );

        if (conversationList && Array.isArray(conversationList)) {
          const formattedConversations: ChatConversation[] =
            conversationList.map((conv: any) => {
              // Format the conversation data
              let fallbackDisplayName = 'Unknown';
              const peerAddress =
                conv.peerAddress || conv.recipientId || '';

              // Create fallback display name from address
              if (peerAddress) {
                if (peerAddress.startsWith('did:privy:')) {
                  fallbackDisplayName = `${peerAddress.substring(
                    0,
                    10
                  )}...${peerAddress.substring(
                    peerAddress.length - 5
                  )}`;
                } else if (peerAddress.startsWith('0x')) {
                  fallbackDisplayName = `${peerAddress.substring(
                    0,
                    6
                  )}...${peerAddress.substring(
                    peerAddress.length - 4
                  )}`;
                } else {
                  fallbackDisplayName = peerAddress;
                }
              }

              // Priority: ensName -> displayName -> peerUser.ensName -> fallback
              const displayName =
                conv.ensName ||
                conv.peerEnsName ||
                conv.displayName ||
                conv.peerDisplayName ||
                (conv.peerUser &&
                  (conv.peerUser.ensName ||
                    conv.peerUser.displayName ||
                    conv.peerUser.name)) ||
                fallbackDisplayName;

              console.log(
                `[ConversationList] ${
                  conv.conversationId
                }: peerAddress=${peerAddress}, displayName=${displayName}, ensName=${
                  conv.ensName || conv.peerEnsName
                }`
              );

              return {
                conversationId:
                  conv.conversationId ||
                  `${conv.senderId}_${conv.recipientId}`,
                peerAddress,
                displayName,
                lastMessage: conv.lastMessage || '',
                lastMessageTime:
                  conv.lastMessageTime || new Date().toISOString(),
                unreadCount: conv.unreadCount || 0,
              };
            });

          console.log(
            '📋 Setting conversations from conversation_list:',
            formattedConversations
          );
          setConversations(formattedConversations);
        }
      }
    );

    // Listen for user registration response
    socketInstance.on(
      'user_registered',
      (response: {
        success: boolean;
        userId?: string;
        message?: string;
        error?: string;
      }) => {
        if (response.success) {
          console.log(
            '✅ User registered/updated successfully:',
            response.userId
          );
        } else {
          console.error(
            '❌ User registration failed:',
            response.error || response.message
          );
        }
      }
    );

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
  }, [user?.id]);

  // Register/update user data when userData changes
  useEffect(() => {
    if (isConnected && socket && user) {
      registerUserInDatabase();
    }
  }, [isConnected, socket, user?.id, registerUserInDatabase]);

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
      console.log(
        '🔄 Requesting conversation history and unread counts...'
      );
      socket.emit('fetch_unread_counts', { userId: user.id });

      // Also try alternative methods to get conversation data
      socket.emit('get_conversation_list', { userId: user.id });

      // Set a fallback timer to retry if no conversations are received
      const conversationRetryTimer = setTimeout(() => {
        if (conversations.length === 0) {
          console.log(
            '⚠️ No conversations received after 3 seconds, retrying...'
          );
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
  }, [user?.id, isConnected, socket]);

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

      // React will automatically re-render when messages state changes
    });

    // New socket listeners from chat-test-ui.html
    socket.on('new_message', (data) => {
      if (!data || !data.message) return;

      // IMPORTANT: Filter out agent messages from regular chat
      // Only process direct user-to-user messages here
      if (data.conversationType && data.conversationType !== 'direct') {
        console.log('Ignoring non-direct message:', data.conversationType);
        return;
      }

      const msg = data.message;
      const senderId = msg.sender && (msg.sender._id || msg.sender);
      const isSentByMe = user?.id && senderId && String(senderId) === String(user.id);

      if (isSentByMe) {
        // Avoid duplicating optimistic message bubble
        console.log('Message delivered - sent by current user');
        return;
      }

      // Handle the message similar to receive_message but for direct messages
      const conversationId = msg.conversationId || createDeterministicConversationId(msg.sender, msg.receiver);
      
      setMessages((prev) => {
        const existingMessages = prev[conversationId] || [];
        
        // Avoid duplicates
        const messageExists = existingMessages.some(
          (existing) => existing._id === msg._id || 
          (existing.content === msg.content && Math.abs(new Date(existing.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 1000)
        );
        
        if (messageExists) return prev;
        
        return {
          ...prev,
          [conversationId]: [...existingMessages, msg]
        };
      });
    });

    socket.on('conversation_updated', (payload) => {
      // Only process direct conversation updates
      if (payload.conversationType && payload.conversationType !== 'direct') {
        return;
      }
      console.log('Conversation updated:', payload);
      // Refresh conversation list if needed
    });

    socket.on('typing_started', (data) => {
      // Only process typing indicators for direct chats
      if (data.conversationType && data.conversationType !== 'direct') {
        return;
      }
      if (data.userId !== user?.id) {
        console.log(`User ${data.userId} started typing`);
        // Update UI to show typing indicator
      }
    });

    socket.on('typing_stopped', (data) => {
      // Only process typing indicators for direct chats
      if (data.conversationType && data.conversationType !== 'direct') {
        return;
      }
      if (data.userId !== user?.id) {
        console.log(`User ${data.userId} stopped typing`);
        // Update UI to hide typing indicator
      }
    });

    socket.on('messages_read', (data) => {
      console.log('Messages marked as read:', data);
      // Update read status of sent messages
    });

    return () => {
      socket.off('user_groups');
      socket.off('receive_message');
      socket.off('new_message');
      socket.off('conversation_updated');
      socket.off('typing_started');
      socket.off('typing_stopped');
      socket.off('messages_read');
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

      // Create a deterministic conversation ID using available identifiers
      const userId = user.id;
      const targetId = recipientId;

      // Use centralized function to ensure consistent conversation ID format
      let conversationId = createDeterministicConversationId(
        userId,
        targetId
      );
      console.log('Created conversation ID:', conversationId);

      // Validate the created conversation ID for compliance
      const validation = validateConversationIdFormat(
        conversationId,
        userId
      );
      if (!validation.isCompliant) {
        console.warn(
          '⚠️ Created conversation ID has compliance issues:',
          validation.warnings
        );
      }
      if (!validation.containsCurrentUser) {
        console.error(
          '❌ CRITICAL: Created conversation ID does not contain current user!'
        );
      }

      // Log the IDs being used for debugging
      console.log(
        `Creating conversation between ${userId} and ${targetId}`
      );

      // Additional validation: ensure the conversation ID contains both user IDs
      if (
        !conversationId.includes(userId) ||
        !conversationId.includes(targetId)
      ) {
        console.error(
          '❌ CRITICAL: Conversation ID does not contain both user IDs!',
          {
            conversationId,
            userId,
            targetId,
          }
        );
        // Fallback: create a simple concatenated ID
        conversationId = [userId, targetId].sort().join('_');
      }

      // Final validation: ensure neither user ID is empty or undefined
      if (!userId || !targetId || userId === targetId) {
        console.error(
          '❌ CRITICAL: Invalid user IDs for conversation creation!',
          {
            userId,
            targetId,
          }
        );
        return `error_conversation_${Date.now()}`;
      }

      console.log(
        '✅ Final validated conversation ID:',
        conversationId
      );
      return conversationId;
    },
    [socket, user?.id]
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

        // CRITICAL FIX: If the conversation ID contains mixed types, ensure consistent ordering
        if (
          conversationId.includes('0x') &&
          conversationId.includes('did:privy:')
        ) {
          console.log(
            'Conversation ID contains mixed ETH address and Privy ID, ensuring consistency'
          );

          const parts = conversationId.split('_');
          if (parts.length === 2) {
            // Use centralized function for consistency
            finalConversationId =
              normalizeConversationId(conversationId);

            if (finalConversationId !== conversationId) {
              console.log(
                `Corrected conversation ID: ${finalConversationId} (was: ${conversationId})`
              );
              // Update the active conversation ID
              setActiveConversationId(finalConversationId);
            }
          }
        }
        // For same-type pairs (both ETH or both Privy), sort alphabetically
        else if (
          conversationId.includes('0x') ||
          conversationId.includes('did:privy:')
        ) {
          console.log(
            'Conversation ID contains same-type identifiers, ensuring alphabetical sort'
          );

          const parts = conversationId.split('_');
          if (parts.length === 2) {
            // Sort them alphabetically for consistency
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
    [socket, user?.id, activeConversationId]
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
              // Find the part that's not the sender (check both user ID and ETH address)
              const userEthAddress = user?.wallet?.address;
              const userId = user?.id;

              if (
                parts[0] === senderId ||
                parts[0] === userId ||
                parts[0] === userEthAddress
              ) {
                actualRecipientId = parts[1];
              } else if (
                parts[1] === senderId ||
                parts[1] === userId ||
                parts[1] === userEthAddress
              ) {
                actualRecipientId = parts[0];
              } else {
                // If neither part matches current user, use the original recipientId parameter
                actualRecipientId = recipientId;
              }

              console.log(
                `Fixed recipient ID: now using ${actualRecipientId} (from conversation ID ${activeConversationId})`
              );
            }
          }

          // Final check - if still the same, this is an error
          if (actualRecipientId === actualSenderId) {
            console.error(
              'Unable to determine correct recipient ID - aborting message send'
            );
            return;
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

          // Use centralized function to create consistent conversation ID
          conversationIdForMessage =
            createDeterministicConversationId(
              senderIdForConversation,
              recipientIdForConversation
            );
          console.log(
            'Created consistent conversation ID for message:',
            conversationIdForMessage
          );
        }

        // Ensure conversation ID is normalized using centralized function
        if (conversationIdForMessage) {
          const normalizedId = normalizeConversationId(
            conversationIdForMessage
          );
          if (normalizedId !== conversationIdForMessage) {
            console.log(
              `Normalizing conversation ID from ${conversationIdForMessage} to ${normalizedId}`
            );
            conversationIdForMessage = normalizedId;
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
    [socket, activeConversationId, user?.id, user?.wallet?.address]
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
    [socket, user?.id]
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
    }, [socket, user?.id, user?.wallet?.address]);

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
    [socket, user?.id]
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
    [socket, user?.id]
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
    [socket, user?.id]
  );

  const removeGroupMember = useCallback(async (): Promise<void> => {
    if (!socket || !user?.id) {
      console.warn('Socket not connected or user not authenticated');
      return;
    }

    // This is a placeholder for future implementation
    console.warn('removeGroupMember not fully implemented');
  }, [socket, user?.id, user?.wallet?.address]);

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
    [socket, user?.id]
  );

  // Bot-specific operations
  const sendBotCommand = useCallback(
    async ({
      botId,
      command,
      parameters = {},
      conversationId,
      groupId,
    }: {
      botId: string;
      command: string;
      parameters?: Record<string, any>;
      conversationId?: string;
      groupId?: string;
    }): Promise<void> => {
      if (!socket) {
        console.warn('Socket not connected, cannot send bot command');
        throw new Error('Not connected to chat server');
      }

      if (!user?.id) {
        console.warn('User not authenticated');
        throw new Error('User not authenticated');
      }

      try {
        console.log(
          `Sending bot command: ${command} to bot: ${botId}`
        );

        socket.emit('send_bot_command', {
          botId,
          command,
          parameters,
          userId: user.id,
          conversationId,
          groupId,
        });
      } catch (error) {
        console.error('Failed to send bot command:', error);
        throw error;
      }
    },
    [socket, user?.id]
  );

  const getAvailableBots = useCallback(
    async (groupId?: string): Promise<GroupMember[]> => {
      if (!socket) {
        console.warn(
          'Socket not connected, cannot get available bots'
        );
        throw new Error('Not connected to chat server');
      }

      return new Promise((resolve, reject) => {
        socket.emit('get_available_bots', { groupId });

        const handleAvailableBots = (bots: GroupMember[]) => {
          socket.off('available_bots', handleAvailableBots);
          resolve(bots.filter((bot) => bot.isBot));
        };

        socket.on('available_bots', handleAvailableBots);

        setTimeout(() => {
          socket.off('available_bots', handleAvailableBots);
          reject(new Error('Get available bots timed out'));
        }, 10000);
      });
    },
    [socket]
  );

  const addBotToGroup = useCallback(
    async (groupId: string, botId: string): Promise<void> => {
      if (!socket || !user?.id) {
        throw new Error(
          'Socket not connected or user not authenticated'
        );
      }

      return new Promise((resolve, reject) => {
        socket.emit('add_bot_to_group', {
          groupId,
          botId,
          userId: user.id,
        });

        const handleBotAdded = (response: {
          success: boolean;
          groupId: string;
        }) => {
          if (response.success && response.groupId === groupId) {
            socket.off('bot_added_to_group', handleBotAdded);
            resolve();
          }
        };

        socket.on('bot_added_to_group', handleBotAdded);

        setTimeout(() => {
          socket.off('bot_added_to_group', handleBotAdded);
          reject(new Error('Add bot to group timed out'));
        }, 10000);
      });
    },
    [socket, user?.id]
  );

  const removeBotFromGroup = useCallback(
    async (groupId: string, botId: string): Promise<void> => {
      if (!socket || !user?.id) {
        throw new Error(
          'Socket not connected or user not authenticated'
        );
      }

      socket.emit('remove_bot_from_group', {
        groupId,
        botId,
        userId: user.id,
      });
    },
    [socket, user?.id]
  );

  const getBotCapabilities = useCallback(
    async (botId: string): Promise<string[]> => {
      if (!socket) {
        throw new Error('Socket not connected');
      }

      return new Promise((resolve, reject) => {
        socket.emit('get_bot_capabilities', { botId });

        const handleBotCapabilities = (data: {
          botId: string;
          capabilities: string[];
        }) => {
          if (data.botId === botId) {
            socket.off('bot_capabilities', handleBotCapabilities);
            resolve(data.capabilities);
          }
        };

        socket.on('bot_capabilities', handleBotCapabilities);

        setTimeout(() => {
          socket.off('bot_capabilities', handleBotCapabilities);
          reject(new Error('Get bot capabilities timed out'));
        }, 5000);
      });
    },
    [socket]
  );

  const initiateCryptoTransaction = useCallback(
    async ({
      type,
      fromToken,
      toToken,
      amount,
      toAddress,
      network,
      conversationId,
      groupId,
    }: {
      type: 'send' | 'swap' | 'bridge';
      fromToken: string;
      toToken?: string;
      amount: string;
      toAddress?: string;
      network: string;
      conversationId?: string;
      groupId?: string;
    }): Promise<void> => {
      if (!socket || !user?.id) {
        throw new Error(
          'Socket not connected or user not authenticated'
        );
      }

      try {
        console.log(`Initiating ${type} transaction:`, {
          fromToken,
          toToken,
          amount,
          network,
        });

        socket.emit('initiate_crypto_transaction', {
          type,
          fromToken,
          toToken,
          amount,
          toAddress,
          network,
          userId: user.id,
          conversationId,
          groupId,
        });
      } catch (error) {
        console.error(
          'Failed to initiate crypto transaction:',
          error
        );
        throw error;
      }
    },
    [socket, user?.id]
  );

  // Enhanced message features
  const addReaction = useCallback(
    async (
      messageId: string,
      emoji: string,
      conversationId: string
    ) => {
      if (!socket || !user?.id) return;

      try {
        socket.emit('add_reaction', {
          messageId,
          userId: user.id,
          emoji,
          conversationId,
        });
      } catch (error) {
        console.error('Failed to add reaction:', error);
      }
    },
    [socket, user?.id]
  );

  const removeReaction = useCallback(
    async (messageId: string, conversationId: string) => {
      if (!socket || !user?.id) return;

      try {
        socket.emit('remove_reaction', {
          messageId,
          userId: user.id,
          conversationId,
        });
      } catch (error) {
        console.error('Failed to remove reaction:', error);
      }
    },
    [socket, user?.id]
  );

  const editMessage = useCallback(
    async (
      messageId: string,
      newContent: string,
      conversationId: string
    ) => {
      if (!socket || !user?.id) return;

      try {
        socket.emit('edit_dm', {
          messageId,
          newContent,
          userId: user.id,
          conversationId,
        });
      } catch (error) {
        console.error('Failed to edit message:', error);
      }
    },
    [socket, user?.id]
  );

  const deleteMessage = useCallback(
    async (
      messageId: string,
      conversationId: string,
      deleteFor: 'me' | 'everyone' = 'me'
    ) => {
      if (!socket || !user?.id) return;

      try {
        socket.emit('delete_dm', {
          messageId,
          userId: user.id,
          conversationId,
          deleteFor,
        });
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    },
    [socket, user?.id]
  );

  const forwardMessage = useCallback(
    async (
      originalMessageId: string,
      recipientId: string,
      conversationId: string
    ) => {
      if (!socket || !user?.id) return;

      try {
        socket.emit('forward_dm', {
          originalMessageId,
          senderId: user.id,
          recipientId,
          conversationId,
        });
      } catch (error) {
        console.error('Failed to forward message:', error);
      }
    },
    [socket, user?.id]
  );

  const replyToMessage = useCallback(
    async (
      parentMessageId: string,
      content: string,
      conversationId: string
    ) => {
      if (!socket || !user?.id) return;

      // For now, we'll send a regular message with parentMessageId reference
      // The server should handle threading logic
      try {
        socket.emit('send_dm', {
          senderId: user.id,
          recipientId:
            conversationId.split('_').find((id) => id !== user.id) ||
            '',
          content,
          messageType: 'text',
          conversationId,
          parentMessageId,
        });
      } catch (error) {
        console.error('Failed to reply to message:', error);
      }
    },
    [socket, user?.id]
  );

  const markMessageAsRead = useCallback(
    async (
      messageId: string,
      conversationId: string,
      platform: string = 'desktop'
    ) => {
      if (!socket || !user?.id) return;

      try {
        socket.emit('mark_as_read', {
          messageId,
          userId: user.id,
          conversationId,
          platform,
        });
      } catch (error) {
        console.error('Failed to mark message as read:', error);
      }
    },
    [socket, user?.id]
  );

  const pinMessage = useCallback(
    async (messageId: string, conversationId: string) => {
      if (!socket || !user?.id) return;

      try {
        socket.emit('pin_message', {
          messageId,
          userId: user.id,
          conversationId,
        });
      } catch (error) {
        console.error('Failed to pin message:', error);
      }
    },
    [socket, user?.id]
  );

  const unpinMessage = useCallback(
    async (messageId: string, conversationId: string) => {
      if (!socket || !user?.id) return;

      try {
        socket.emit('unpin_message', {
          messageId,
          userId: user.id,
          conversationId,
        });
      } catch (error) {
        console.error('Failed to unpin message:', error);
      }
    },
    [socket, user?.id]
  );

  const searchMessages = useCallback(
    async (
      query: string,
      conversationId?: string
    ): Promise<ChatMessage[]> => {
      if (!socket) return [];

      return new Promise((resolve) => {
        try {
          socket.emit('search_messages', {
            query,
            conversationId,
          });

          // Listen for search results
          socket.once('search_results', (results: ChatMessage[]) => {
            resolve(results);
          });
        } catch (error) {
          console.error('Failed to search messages:', error);
          resolve([]);
        }
      });
    },
    [socket]
  );

  // New socket events from chat-test-ui.html
  const resolveContact = useCallback(
    async (query: string): Promise<{ success: boolean; userId?: string; displayName?: string }> => {
      if (!socket) return { success: false };

      return new Promise((resolve) => {
        try {
          socket.emit('resolve_contact', { query }, (response: { success: boolean; userId?: string; displayName?: string }) => {
            resolve(response);
          });
        } catch (error) {
          console.error('Failed to resolve contact:', error);
          resolve({ success: false });
        }
      });
    },
    [socket]
  );

  const searchContacts = useCallback(
    async (query: string, limit: number = 8): Promise<{ success: boolean; results?: any[] }> => {
      if (!socket) return { success: false };

      return new Promise((resolve) => {
        try {
          socket.emit('search_contacts', { query, limit }, (response: { success: boolean; results?: any[] }) => {
            resolve(response);
          });
        } catch (error) {
          console.error('Failed to search contacts:', error);
          resolve({ success: false });
        }
      });
    },
    [socket]
  );

  const getConversations = useCallback(
    async (page: number = 1, limit: number = 20): Promise<{ success: boolean; conversations?: any[] }> => {
      if (!socket) return { success: false };

      return new Promise((resolve) => {
        try {
          socket.emit('get_conversations', { page, limit }, (response: { success: boolean; conversations?: any[] }) => {
            resolve(response);
          });
        } catch (error) {
          console.error('Failed to get conversations:', error);
          resolve({ success: false });
        }
      });
    },
    [socket]
  );

  const joinConversationRoom = useCallback(
    async (receiverId: string): Promise<{ success: boolean; receiverOnline?: boolean; error?: string }> => {
      if (!socket) return { success: false };

      return new Promise((resolve) => {
        try {
          socket.emit('join_conversation', { receiverId }, (response: { success: boolean; receiverOnline?: boolean; error?: string }) => {
            resolve(response);
          });
        } catch (error) {
          console.error('Failed to join conversation room:', error);
          resolve({ success: false });
        }
      });
    },
    [socket]
  );

  const sendDirectMessage = useCallback(
    async (receiverId: string, message: string, messageType: string = 'text'): Promise<{ success: boolean; error?: string }> => {
      if (!socket) return { success: false };

      return new Promise((resolve) => {
        try {
          socket.emit('send_message', {
            receiverId,
            message,
            messageType
          }, (response: { success: boolean; error?: string }) => {
            resolve(response);
          });
        } catch (error) {
          console.error('Failed to send direct message:', error);
          resolve({ success: false });
        }
      });
    },
    [socket]
  );

  const getConversationHistory = useCallback(
    async (receiverId: string, page: number = 1, limit: number = 20): Promise<{ success: boolean; messages?: any[]; error?: string }> => {
      if (!socket) return { success: false };

      return new Promise((resolve) => {
        try {
          socket.emit('get_conversation_history', {
            receiverId,
            page,
            limit
          }, (response: { success: boolean; messages?: any[]; error?: string }) => {
            resolve(response);
          });
        } catch (error) {
          console.error('Failed to get conversation history:', error);
          resolve({ success: false });
        }
      });
    },
    [socket]
  );

  const markMessagesRead = useCallback(
    async (senderId: string): Promise<{ success: boolean; error?: string }> => {
      if (!socket) return { success: false };

      return new Promise((resolve) => {
        try {
          socket.emit('mark_messages_read', { senderId }, (response: { success: boolean; error?: string }) => {
            resolve(response);
          });
        } catch (error) {
          console.error('Failed to mark messages as read:', error);
          resolve({ success: false });
        }
      });
    },
    [socket]
  );

  const startTyping = useCallback(
    (receiverId: string): void => {
      if (!socket) return;
      try {
        socket.emit('typing_start', { receiverId });
      } catch (error) {
        console.error('Failed to start typing:', error);
      }
    },
    [socket]
  );

  const stopTyping = useCallback(
    (receiverId: string): void => {
      if (!socket) return;
      try {
        socket.emit('typing_stop', { receiverId });
      } catch (error) {
        console.error('Failed to stop typing:', error);
      }
    },
    [socket]
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
    // Bot-specific operations
    sendBotCommand,
    getAvailableBots,
    addBotToGroup,
    removeBotFromGroup,
    getBotCapabilities,
    // Crypto transaction operations
    initiateCryptoTransaction,

    // Enhanced message features
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
    forwardMessage,
    replyToMessage,
    markMessageAsRead,
    pinMessage,
    unpinMessage,
    searchMessages,
    // New socket events from chat-test-ui.html
    resolveContact,
    searchContacts,
    getConversations,
    joinConversationRoom,
    sendDirectMessage,
    getConversationHistory,
    markMessagesRead,
    startTyping,
    stopTyping,
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
