'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import toast from 'react-hot-toast';
import { useUser } from '@/lib/UserContext';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { useNFT } from '@/lib/hooks/useNFT';

interface InitialDirectRecipient {
  userId?: string | null;
  micrositeId?: string | null;
  ens?: string | null;
}

interface ChatContainerProps {
  socket: any;
  currentUser: string;
  setUnreadCount: (count: number) => void;
  initialGroupId?: string | null;
  initialAstro?: boolean;
  initialAgentId?: string | null;
  initialDirectRecipient?: InitialDirectRecipient | null;
}

const EVENTS = {
      GET_CONVERSATIONS: 'get_conversations',
      GET_UNREAD_COUNT: 'get_unread_count',
      NEW_MESSAGE: 'new_message',
      CONVERSATION_UPDATED: 'conversation_updated',
      UNREAD_COUNT_UPDATED: 'unread_count_updated',
      MESSAGES_READ: 'messages_read',
      MESSAGE_DELETED: 'message_deleted',
      MESSAGE_EDITED: 'message_edited',
      USER_TYPING: 'user_typing',
    };

const SECURE_ASTRO_GROUP_NAME = 'Astro Trading Desk';
const THREAD_RAIL_COLLAPSED_KEY = 'swop.chat.threadRailCollapsed';

const AGENT_THREAD_CONFIGS = {
  astro: {
    groupName: SECURE_ASTRO_GROUP_NAME,
    description: 'Secure group for Astro market proposals and approvals.',
    mentionPrefix: '@astro',
    agent: {
      agentId: 'astro',
      provider: 'elizaos',
      displayName: 'Astro',
      mentionAliases: ['@astro', 'astro'],
      responseMode: 'mention_only',
      enabledTools: [
        'perps.read',
        'perps.write',
        'prediction.read',
        'prediction.write',
        'marketplace.read',
        'marketplace.write',
        'sports.read',
        'wallet.read',
        'wallet.write',
      ],
      isActive: true,
    },
  },
  'goldman-sacks': {
    groupName: 'Goldman Sacks',
    description:
      'Private strategy agent for wallet authorization, automated strategy drafts, and risk-limited execution setup.',
    mentionPrefix: '@goldman',
    agent: {
      agentId: 'goldman-sacks',
      provider: 'elizaos',
      displayName: 'Goldman Sacks',
      mentionAliases: [
        '@goldman',
        'goldman',
        '@sacks',
        'sacks',
        '@goldman-sacks',
        'goldman-sacks',
      ],
      responseMode: 'mention_only',
      enabledTools: [
        'strategy.read',
        'strategy.write',
        'perps.read',
        'perps.write',
        'prediction.read',
        'prediction.write',
        'wallet.read',
        'wallet.write',
        'aave.read',
        'aave.write',
        'limit_orders.read',
        'limit_orders.write',
      ],
      isActive: true,
    },
  },
} as const;

type AgentThreadId = keyof typeof AGENT_THREAD_CONFIGS;

function isKnownAgentThreadId(agentId?: string | null): agentId is AgentThreadId {
  return Boolean(agentId && agentId in AGENT_THREAD_CONFIGS);
}

function cleanLookupValue(value?: string | null) {
  return value?.trim() || '';
}

function normalizeLookupValue(value?: string | null) {
  return cleanLookupValue(value).toLowerCase();
}

function directRecipientKey(recipient?: InitialDirectRecipient | null) {
  return [
    normalizeLookupValue(recipient?.userId),
    normalizeLookupValue(recipient?.micrositeId),
    normalizeLookupValue(recipient?.ens),
  ].join('|');
}

function getDirectUserId(chat: any) {
  return (
    chat?.participant?._id ||
    chat?.participant?.userId?._id ||
    chat?.participant?.userId ||
    chat?.userId?._id ||
    chat?.userId ||
    chat?.microsite?.parentId ||
    chat?._id ||
    ''
  );
}

function getDirectLookupValues(chat: any) {
  const values = [
    chat?.participant?._id,
    chat?.participant?.userId?._id,
    chat?.participant?.userId,
    chat?.userId?._id,
    chat?.userId,
    chat?.microsite?.parentId,
    chat?.microsite?._id,
    chat?._id,
    chat?.ens,
    chat?.username,
    chat?.microsite?.ens,
    chat?.microsite?.username,
  ];

  return values
    .map((value) => normalizeLookupValue(String(value || '')))
    .filter(Boolean);
}

function directChatMatchesRecipient(
  chat: any,
  recipient?: InitialDirectRecipient | null
) {
  if (!recipient) return false;
  const values = getDirectLookupValues(chat);
  const targets = [
    recipient.userId,
    recipient.micrositeId,
    recipient.ens,
  ]
    .map((value) => normalizeLookupValue(value))
    .filter(Boolean);

  return targets.some((target) => values.includes(target));
}

function normalizeDirectChat(chat: any, recipient?: InitialDirectRecipient | null) {
  const userId =
    getDirectUserId(chat) ||
    cleanLookupValue(recipient?.userId) ||
    '';
  const handle =
    cleanLookupValue(chat?.ens) ||
    cleanLookupValue(chat?.microsite?.ens) ||
    cleanLookupValue(chat?.username) ||
    cleanLookupValue(chat?.microsite?.username) ||
    cleanLookupValue(recipient?.ens);
  const name =
    chat?.displayName ||
    chat?.name ||
    chat?.microsite?.name ||
    chat?.participant?.name ||
    handle ||
    'Swop contact';
  const avatar =
    chat?.avatar ||
    chat?.profilePic ||
    chat?.microsite?.profilePic ||
    chat?.microsite?.profileUrl ||
    chat?.microsite?.brandImg ||
    chat?.participant?.profilePic;

  return {
    ...chat,
    _id: userId || chat?._id || handle,
    name,
    displayName: chat?.displayName || name,
    avatar,
    participant: chat?.participant || {
      _id: userId,
      name,
      profilePic: avatar,
    },
    microsite: {
      ...(chat?.microsite || {}),
      _id: chat?.microsite?._id || cleanLookupValue(recipient?.micrositeId),
      parentId: chat?.microsite?.parentId || userId,
      name,
      ens: handle,
      username:
        chat?.username ||
        chat?.microsite?.username ||
        handle,
      profilePic: avatar,
    },
  };
}

function createDirectChatFromRecipient(recipient: InitialDirectRecipient) {
  return normalizeDirectChat(
    {
      _id: cleanLookupValue(recipient.userId),
      ens: cleanLookupValue(recipient.ens),
      microsite: {
        _id: cleanLookupValue(recipient.micrositeId),
        parentId: cleanLookupValue(recipient.userId),
        ens: cleanLookupValue(recipient.ens),
        username: cleanLookupValue(recipient.ens),
        name: cleanLookupValue(recipient.ens) || 'Swop contact',
      },
    },
    recipient
  );
}

function hasActiveAgent(group: any, agentId: AgentThreadId) {
  return (
    group?.botUsers?.some(
      (agent: any) => agent.agentId === agentId && agent.isActive !== false
    ) || false
  );
}

function findAgentThreadGroup(groups: any[], agentId: AgentThreadId) {
  const config = AGENT_THREAD_CONFIGS[agentId];
  return (
    groups.find((item: any) => hasActiveAgent(item, agentId)) ||
    groups.find((item: any) => item.name === config.groupName) ||
    null
  );
}

function findSecureAstroGroup(groups: any[]) {
  return findAgentThreadGroup(groups, 'astro');
}

export default function ChatContainer({
  socket,
  currentUser,
  setUnreadCount,
  initialGroupId,
  initialAstro,
  initialAgentId,
  initialDirectRecipient,
}: ChatContainerProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [hasLoadedGroups, setHasLoadedGroups] = useState(false);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatType, setChatType] = useState<
    'private' | 'group' | null
  >(null);
  const [isThreadListCollapsed, setIsThreadListCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(THREAD_RAIL_COLLAPSED_KEY) === 'true';
  });
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });
  const [astroComposerSeed, setAstroComposerSeed] = useState<{
    command: string;
    nonce: number;
  } | null>(null);
  const directRecipientAppliedRef = useRef('');
  const initialAstroOpenAttemptedRef = useRef(false);
  const initialAgentOpenAttemptedRef = useRef('');
  const initialDirectRecipientKey = useMemo(
    () => directRecipientKey(initialDirectRecipient),
    [initialDirectRecipient]
  );
  const hasInitialDirectRecipient = Boolean(
    initialDirectRecipientKey.replace(/\|/g, '')
  );
  const secureAstroGroup = useMemo(
    () => findSecureAstroGroup(groups),
    [groups]
  );
  const requestedInitialAgentId = isKnownAgentThreadId(initialAgentId)
    ? initialAgentId
    : null;
  const toggleThreadListCollapsed = useCallback(() => {
    setIsThreadListCollapsed((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THREAD_RAIL_COLLAPSED_KEY, String(next));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  // Memoized function to load all data
  const loadInitialData = useCallback(() => {
    if (!socket) return;
    // Load conversations (using V2 if enabled)
    socket.emit(
      EVENTS.GET_CONVERSATIONS,
      { page: 1, limit: 20 },
      (res: any) => {
        if (res?.success) {
          setConversations(res.conversations || []);
        }
      }
    );

    // Load groups (groups don't have V2 yet, still using old event)
    socket.emit(
      'get_user_groups',
      { page: 1, limit: 20 },
      (res: any) => {
        if (res?.success) {
          setGroups(res.groups || []);
          setHasLoadedGroups(true);
        }
      }
    );

    // Fetch unread count (using V2 if enabled)
    socket.emit(EVENTS.GET_UNREAD_COUNT, {}, (response: any) => {
      if (response?.success) {
        setUnreadCount(response.unreadCount || 0);
      }
    });
  }, [socket, setUnreadCount]);

  // Function to refresh selected chat data
  const refreshSelectedChat = useCallback(() => {
    if (!socket || !selectedChat) return;

    if (chatType === 'group') {
      // Groups still use old event (no V2 yet)
      socket.emit(
        'get_user_groups',
        { page: 1, limit: 20 },
        (res: any) => {
          if (res?.success) {
            const updatedGroup = res.groups?.find(
              (conv: any) => conv._id === selectedChat._id
            );

            if (updatedGroup) {
              setSelectedChat(updatedGroup);
            }
          }
        }
      );
    } else {
      // For direct chats, refresh conversation (using V2 if enabled)
      socket.emit(
        EVENTS.GET_CONVERSATIONS,
        { page: 1, limit: 20 },
        (res: any) => {
          if (res?.success) {
            const updatedConversation = res.conversations?.find(
              (conv: any) => conv._id === selectedChat._id
            );
            if (updatedConversation) {
              setSelectedChat(updatedConversation);
            }
          }
        }
      );
    }
  }, [socket, selectedChat, chatType]);

  useEffect(() => {
    if (!socket) return;

    // Load initial data
    loadInitialData();

    // Socket event listeners for real-time updates
    const handleConversationUpdate = (data?: any) => {
      // Only process direct conversation updates
      if (
        data?.conversationType &&
        data.conversationType !== 'direct'
      ) {
        return;
      }
      loadInitialData();
      refreshSelectedChat();
    };

    const handleGroupUpdate = (data: any) => {
      loadInitialData();

      // If the updated group is currently selected, refresh it
      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleNewMessage = (data?: any) => {
      // Only process direct messages
      if (
        data?.conversationType &&
        data.conversationType !== 'direct'
      ) {
        return;
      }

      loadInitialData();
    };

    const handleNewGroupMessage = () => {
      loadInitialData();
    };

    const handleUnreadCountUpdated = (data?: any) => {
      // Only process for direct conversations
      // Backend already excludes agent conversations from unread count
      if (
        data?.conversationType &&
        data.conversationType !== 'direct'
      ) {
        return;
      }
      loadInitialData();
    };

    const handleGroupInfoUpdated = (data: any) => {
      loadInitialData();

      // Update selected chat if it's the same group
      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleGroupSettingsUpdated = (data: any) => {
      console.log('Group settings updated:', data);
      loadInitialData();

      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleGroupParticipantsUpdated = (data: any) => {
      loadInitialData();

      // Update selected chat if it's the same group
      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleGroupMemberRoleUpdated = (data: any) => {
      console.log('Group member role updated:', data);
      loadInitialData();

      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleGroupMemberAdded = (data: any) => {
      loadInitialData();

      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleGroupMemberRemoved = (data: any) => {
      loadInitialData();

      if (data?.groupId === selectedChat?._id) {
        // Check if current user was removed
        if (data?.removedUserId === currentUser) {
          // Clear selection if current user was removed
          setSelectedChat(null);
          setChatType(null);
        } else {
          refreshSelectedChat();
        }
      }
    };

    const handleGroupDeleted = (data: any) => {
      loadInitialData();

      // Clear selection if currently viewing the deleted group
      if (data?.groupId === selectedChat?._id) {
        setSelectedChat(null);
        setChatType(null);
      }
    };

    const handleGroupAgentChanged = (data: any) => {
      loadInitialData();

      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    // Register all event listeners (V2 events for direct chats, old events for groups)
    socket.on(EVENTS.CONVERSATION_UPDATED, handleConversationUpdate);
    socket.on(EVENTS.NEW_MESSAGE, handleNewMessage);
    socket.on(EVENTS.UNREAD_COUNT_UPDATED, handleUnreadCountUpdated);

    // Group events (still using old events, no V2 yet)
    socket.on('group_updated', handleGroupUpdate);
    socket.on('new_group_message', handleNewGroupMessage);
    socket.on('group_info_updated', handleGroupInfoUpdated);
    socket.on('group_settings_updated', handleGroupSettingsUpdated);
    socket.on(
      'group_participants_updated',
      handleGroupParticipantsUpdated
    );
    socket.on('group_member_role_updated', handleGroupMemberRoleUpdated);
    socket.on('group_member_added', handleGroupMemberAdded);
    socket.on('group_member_removed', handleGroupMemberRemoved);
    socket.on('group_deleted', handleGroupDeleted);
    socket.on('group_agent_added', handleGroupAgentChanged);
    socket.on('group_agent_updated', handleGroupAgentChanged);
    socket.on('group_agent_removed', handleGroupAgentChanged);
    socket.on('agent_action_result', handleGroupAgentChanged);

    // Cleanup
    return () => {
      socket.off(
        EVENTS.CONVERSATION_UPDATED,
        handleConversationUpdate
      );
      socket.off(EVENTS.NEW_MESSAGE, handleNewMessage);
      socket.off(
        EVENTS.UNREAD_COUNT_UPDATED,
        handleUnreadCountUpdated
      );

      // Group events cleanup
      socket.off('group_updated', handleGroupUpdate);
      socket.off('new_group_message', handleNewGroupMessage);
      socket.off('group_info_updated', handleGroupInfoUpdated);
      socket.off('group_settings_updated', handleGroupSettingsUpdated);
      socket.off(
        'group_participants_updated',
        handleGroupParticipantsUpdated
      );
      socket.off(
        'group_member_role_updated',
        handleGroupMemberRoleUpdated
      );
      socket.off('group_member_added', handleGroupMemberAdded);
      socket.off('group_member_removed', handleGroupMemberRemoved);
      socket.off('group_deleted', handleGroupDeleted);
      socket.off('group_agent_added', handleGroupAgentChanged);
      socket.off('group_agent_updated', handleGroupAgentChanged);
      socket.off('group_agent_removed', handleGroupAgentChanged);
      socket.off('agent_action_result', handleGroupAgentChanged);
    };
  }, [
    socket,
    loadInitialData,
    refreshSelectedChat,
    selectedChat,
    currentUser,
  ]);

  useEffect(() => {
    if (!initialGroupId || selectedChat?._id === initialGroupId) return;
    const matchingGroup = groups.find(
      (group: any) => group._id === initialGroupId
    );
    if (!matchingGroup) return;
    setSelectedChat(matchingGroup);
    setChatType('group');
  }, [groups, initialGroupId, selectedChat?._id]);

  useEffect(() => {
    if (
      !hasInitialDirectRecipient ||
      initialGroupId ||
      !socket ||
      directRecipientAppliedRef.current === initialDirectRecipientKey
    ) {
      return;
    }

    const matchingConversation = conversations.find((conversation: any) =>
      directChatMatchesRecipient(conversation, initialDirectRecipient)
    );

    if (matchingConversation) {
      setSelectedChat(
        normalizeDirectChat(matchingConversation, initialDirectRecipient)
      );
      setChatType('private');
      directRecipientAppliedRef.current = initialDirectRecipientKey;
      return;
    }

    const targetUserId = cleanLookupValue(initialDirectRecipient?.userId);
    if (targetUserId) {
      setSelectedChat(createDirectChatFromRecipient(initialDirectRecipient!));
      setChatType('private');
      directRecipientAppliedRef.current = initialDirectRecipientKey;
      return;
    }

    const handle = cleanLookupValue(initialDirectRecipient?.ens);
    if (!handle) return;

    let isCancelled = false;
    socket.emit(
      'search_contacts',
      { query: handle, limit: 10 },
      (response: any) => {
        if (isCancelled || !response?.success) return;

        const results = response.results || response.users || [];
        const match =
          results.find((result: any) =>
            directChatMatchesRecipient(result, initialDirectRecipient)
          ) || results[0];

        if (!match) return;

        setSelectedChat(normalizeDirectChat(match, initialDirectRecipient));
        setChatType('private');
        directRecipientAppliedRef.current = initialDirectRecipientKey;
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [
    conversations,
    hasInitialDirectRecipient,
    initialDirectRecipient,
    initialDirectRecipientKey,
    initialGroupId,
    socket,
  ]);

  useEffect(() => {
    if (
      isMobileViewport ||
      selectedChat ||
      initialGroupId ||
      initialAstro ||
      requestedInitialAgentId ||
      hasInitialDirectRecipient
    ) {
      return;
    }

    if (!secureAstroGroup) return;

    setSelectedChat(secureAstroGroup);
    setChatType('group');
  }, [
    hasInitialDirectRecipient,
    initialAstro,
    initialGroupId,
    isMobileViewport,
    requestedInitialAgentId,
    secureAstroGroup,
    selectedChat,
  ]);

  const handleSelectChat = (
    chat: any,
    type: 'private' | 'group'
  ) => {
    if (type === 'group' && chat?.settings?.tokenGate?.enabled) {
      if (!solanaWalletAddress) {
        toast.error('Connect a Solana wallet to join this chat.');
        return;
      }

      if (tokensLoading || nftsLoading) {
        toast('Checking your wallet assets...');
        return;
      }

      if (!userHasGateAsset(chat)) {
        toast.error(getTokenGateMessage(chat));
        return;
      }
    }

    setSelectedChat(chat);
    setChatType(type);
  };

  const openAgentThread = useCallback(
    async (agentId: AgentThreadId, initialMessage?: string) => {
      if (!socket) {
        throw new Error('Socket is not connected.');
      }
      const config = AGENT_THREAD_CONFIGS[agentId];

      const emitAck = <T,>(event: string, payload: any) =>
        new Promise<T>((resolve, reject) => {
          socket.emit(event, payload, (response: any) => {
            if (response?.success) {
              resolve(response);
              return;
            }

            reject(
              new Error(
                response?.error?.message ||
                  response?.error ||
                  `Socket event ${event} failed`
              )
            );
          });
        });

      let group = findAgentThreadGroup(groups, agentId);

      if (!group) {
        const response = await emitAck<{ group: any }>('create_group', {
          name: config.groupName,
          description: config.description,
          members: [],
          tokenGated: false,
          isPublic: false,
        });
        group = response.group;
      }

      const existingAgent = group.botUsers?.find(
        (agent: any) =>
          agent.agentId === config.agent.agentId && agent.isActive !== false
      );
      const missingEnabledTools = config.agent.enabledTools.filter(
        (tool) => !existingAgent?.enabledTools?.includes(tool)
      );

      let activeAgent = existingAgent || config.agent;
      if (!existingAgent || missingEnabledTools.length > 0) {
        const response = await emitAck<{ data?: { agent?: any } }>(
          'add_group_agent',
          {
            groupId: group._id,
            agentId: config.agent.agentId,
            provider: config.agent.provider,
            enabledTools: config.agent.enabledTools,
            responseMode: config.agent.responseMode,
          }
        );
        activeAgent = response.data?.agent || config.agent;
      }

      const groupWithAgent = {
        ...group,
        botUsers: existingAgent
          ? group.botUsers.map((agent: any) =>
              agent.agentId === config.agent.agentId
                ? {
                    ...agent,
                    ...activeAgent,
                    enabledTools:
                      activeAgent.enabledTools ||
                      config.agent.enabledTools,
                  }
                : agent
            )
          : [...(group.botUsers || []), activeAgent],
      };

      setGroups((prev: any[]) => [
        groupWithAgent,
        ...prev.filter((item: any) => item._id !== groupWithAgent._id),
      ]);
      setSelectedChat(groupWithAgent);
      setChatType('group');
      loadInitialData();

      await emitAck('join_group', { groupId: groupWithAgent._id });

      const trimmedMessage = initialMessage?.trim();
      if (trimmedMessage) {
        const message = trimmedMessage
          .toLowerCase()
          .startsWith(config.mentionPrefix)
          ? trimmedMessage
          : `${config.mentionPrefix} ${trimmedMessage}`;

        await emitAck('send_group_message', {
          groupId: groupWithAgent._id,
          message,
          messageType: 'text',
        });
      }
    },
    [groups, loadInitialData, socket]
  );

  const openSecureAstroGroup = useCallback(
    (initialMessage?: string) => openAgentThread('astro', initialMessage),
    [openAgentThread]
  );

  const openAgentComposerCommand = useCallback(
    async (agentId: string, commandSeed: string) => {
      if (!isKnownAgentThreadId(agentId)) return;

      try {
        const group = findAgentThreadGroup(groups, agentId);

        if (group) {
          setSelectedChat(group);
          setChatType('group');
          socket?.emit('join_group', { groupId: group._id });
        } else {
          await openAgentThread(agentId);
        }

        setAstroComposerSeed({
          command: commandSeed,
          nonce: Date.now(),
        });
      } catch (error) {
        console.error('Failed to open agent command composer', error);
      }
    },
    [groups, openAgentThread, socket]
  );

  const openAstroComposerCommand = useCallback(
    async (commandSeed: string) => {
      await openAgentComposerCommand('astro', commandSeed);
    },
    [openAgentComposerCommand]
  );

  const openAgentThreadById = useCallback(
    async (agentId: string) => {
      if (!isKnownAgentThreadId(agentId)) return;
      await openAgentThread(agentId);
    },
    [openAgentThread]
  );

  const clearAstroComposerSeed = useCallback(() => {
    setAstroComposerSeed(null);
  }, []);

  const returnToThreadList = useCallback(() => {
    setSelectedChat(null);
    setChatType(null);
  }, []);

  useEffect(() => {
    if (!requestedInitialAgentId || requestedInitialAgentId === 'astro') {
      initialAgentOpenAttemptedRef.current = '';
      return;
    }

    const matchingGroup = findAgentThreadGroup(groups, requestedInitialAgentId);
    const selectedIsRequestedAgent =
      Boolean(matchingGroup) && selectedChat?._id === matchingGroup?._id;

    if (
      initialAgentOpenAttemptedRef.current === requestedInitialAgentId ||
      selectedIsRequestedAgent ||
      initialGroupId ||
      hasInitialDirectRecipient ||
      !hasLoadedGroups
    ) {
      return;
    }

    initialAgentOpenAttemptedRef.current = requestedInitialAgentId;
    void openAgentThread(requestedInitialAgentId).catch((error) => {
      initialAgentOpenAttemptedRef.current = '';
      console.error('Failed to open agent thread', error);
    });
  }, [
    groups,
    hasInitialDirectRecipient,
    hasLoadedGroups,
    initialGroupId,
    openAgentThread,
    requestedInitialAgentId,
    selectedChat?._id,
  ]);

  useEffect(() => {
    if (!initialAstro) {
      initialAstroOpenAttemptedRef.current = false;
      return;
    }

    const selectedIsSecureAstro =
      Boolean(secureAstroGroup) &&
      selectedChat?._id === secureAstroGroup?._id;

    if (
      initialAstroOpenAttemptedRef.current ||
      selectedIsSecureAstro ||
      initialGroupId ||
      hasInitialDirectRecipient ||
      !hasLoadedGroups
    ) {
      return;
    }

    initialAstroOpenAttemptedRef.current = true;
    void openSecureAstroGroup().catch((error) => {
      initialAstroOpenAttemptedRef.current = false;
      console.error('Failed to open Astro Trading Desk', error);
    });
  }, [
    hasInitialDirectRecipient,
    hasLoadedGroups,
    initialAstro,
    initialGroupId,
    openSecureAstroGroup,
    secureAstroGroup,
    selectedChat?._id,
  ]);

  return (
    <div className="swop-dm-shell h-dvh min-h-0 w-full overflow-hidden bg-black p-0 max-md:bg-[#ecebe6] sm:p-3">
      <div className="dm-window flex h-full min-h-0 w-full flex-col rounded-none max-md:border-0 max-md:bg-[#f4f4f2] max-md:shadow-none sm:rounded-[16px]">
        <div className="relative flex h-[42px] flex-shrink-0 items-center gap-2 border-b border-white/[0.07] bg-[#0b0c0f] px-3 max-md:hidden">
          <button
            type="button"
            onClick={() => router.push('/wallet')}
            className="dm-btn inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-white/[0.07] bg-[#15171d] px-3 text-[12.5px] font-semibold text-[#9396a0]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center gap-2">
            <span className="dm-mono text-xs font-semibold text-[#9396a0]">
              Swop
            </span>
            <span className="text-[#5a5e69]">.</span>
            <span className="text-[12.5px] font-medium text-[#9396a0]">
              Messages
            </span>
          </div>

          <div className="ml-auto inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc97] shadow-[0_0_0_3px_rgba(61,220,151,0.13)]" />
            <span className="dm-mono text-[10.5px] font-semibold text-[#5a5e69]">
              Swop Mainnet
            </span>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <Sidebar
            conversations={conversations}
            groups={groups}
            selectedChat={selectedChat}
            chatType={chatType}
            onSelectChat={handleSelectChat}
            currentUser={currentUser}
            socket={socket}
            isCollapsed={isThreadListCollapsed}
            onToggleCollapsed={toggleThreadListCollapsed}
            onOpenAstroCommand={openAstroComposerCommand}
            onOpenAgentThread={openAgentThreadById}
            onOpenAgentCommand={openAgentComposerCommand}
            className={selectedChat ? 'max-md:hidden' : 'max-md:flex max-md:w-full'}
          />

          <div className={`${selectedChat ? 'flex' : 'hidden md:flex'} min-w-0 flex-1`}>
            <ChatArea
              selectedChat={selectedChat}
              chatType={chatType || 'private'}
              currentUser={currentUser}
              socket={socket}
              isThreadListCollapsed={isThreadListCollapsed}
              initialComposerSeed={astroComposerSeed}
              onComposerSeedConsumed={clearAstroComposerSeed}
              onChatUpdate={refreshSelectedChat}
              onBackToList={returnToThreadList}
              onLeaveGroup={returnToThreadList}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
