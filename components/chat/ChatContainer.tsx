'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';

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

const SECURE_ASTRO_AGENT = {
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
};

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

function hasActiveAstroAgent(group: any) {
  return (
    group?.botUsers?.some(
      (agent: any) => agent.agentId === 'astro' && agent.isActive !== false
    ) || false
  );
}

function findSecureAstroGroup(groups: any[]) {
  return (
    groups.find((item: any) => hasActiveAstroAgent(item)) ||
    groups.find((item: any) => item.name === SECURE_ASTRO_GROUP_NAME) ||
    null
  );
}

export default function ChatContainer({
  socket,
  currentUser,
  setUnreadCount,
  initialGroupId,
  initialAstro,
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
  const directRecipientAppliedRef = useRef('');
  const initialAstroOpenAttemptedRef = useRef(false);
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
  const toggleThreadListCollapsed = useCallback(() => {
    setIsThreadListCollapsed((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THREAD_RAIL_COLLAPSED_KEY, String(next));
      }
      return next;
    });
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

    const handleGroupParticipantsUpdated = (data: any) => {
      loadInitialData();

      // Update selected chat if it's the same group
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
    socket.on(
      'group_participants_updated',
      handleGroupParticipantsUpdated
    );
    socket.on('group_member_added', handleGroupMemberAdded);
    socket.on('group_member_removed', handleGroupMemberRemoved);
    socket.on('group_deleted', handleGroupDeleted);
    socket.on('group_agent_added', handleGroupAgentChanged);
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
      socket.off(
        'group_participants_updated',
        handleGroupParticipantsUpdated
      );
      socket.off('group_member_added', handleGroupMemberAdded);
      socket.off('group_member_removed', handleGroupMemberRemoved);
      socket.off('group_deleted', handleGroupDeleted);
      socket.off('group_agent_added', handleGroupAgentChanged);
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
      selectedChat ||
      initialGroupId ||
      initialAstro ||
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
    secureAstroGroup,
    selectedChat,
  ]);

  const handleSelectChat = (
    chat: any,
    type: 'private' | 'group'
  ) => {
    setSelectedChat(chat);
    setChatType(type);
  };

  const openSecureAstroGroup = useCallback(
    async (initialMessage?: string) => {
      if (!socket) {
        throw new Error('Socket is not connected.');
      }

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

      let group = findSecureAstroGroup(groups);

      if (!group) {
        const response = await emitAck<{ group: any }>('create_group', {
          name: SECURE_ASTRO_GROUP_NAME,
          description:
            'Secure group for Astro market proposals and approvals.',
          members: [],
          tokenGated: false,
          isPublic: false,
        });
        group = response.group;
      }

      const existingAstro = group.botUsers?.find(
        (agent: any) =>
          agent.agentId === 'astro' && agent.isActive !== false
      );
      const missingEnabledTools = SECURE_ASTRO_AGENT.enabledTools.filter(
        (tool) => !existingAstro?.enabledTools?.includes(tool)
      );

      let astroAgent = existingAstro || SECURE_ASTRO_AGENT;
      if (!existingAstro || missingEnabledTools.length > 0) {
        const response = await emitAck<{ data?: { agent?: any } }>(
          'add_group_agent',
          {
            groupId: group._id,
            agentId: SECURE_ASTRO_AGENT.agentId,
            provider: SECURE_ASTRO_AGENT.provider,
            enabledTools: SECURE_ASTRO_AGENT.enabledTools,
            responseMode: SECURE_ASTRO_AGENT.responseMode,
          }
        );
        astroAgent = response.data?.agent || SECURE_ASTRO_AGENT;
      }

      const groupWithAstro = {
        ...group,
        botUsers: existingAstro
          ? group.botUsers.map((agent: any) =>
              agent.agentId === 'astro'
                ? {
                    ...agent,
                    ...astroAgent,
                    enabledTools:
                      astroAgent.enabledTools ||
                      SECURE_ASTRO_AGENT.enabledTools,
                  }
                : agent
            )
          : [...(group.botUsers || []), astroAgent],
      };

      setGroups((prev: any[]) => [
        groupWithAstro,
        ...prev.filter((item: any) => item._id !== groupWithAstro._id),
      ]);
      setSelectedChat(groupWithAstro);
      setChatType('group');
      loadInitialData();

      await emitAck('join_group', { groupId: groupWithAstro._id });

      const trimmedMessage = initialMessage?.trim();
      if (trimmedMessage) {
        const message = trimmedMessage
          .toLowerCase()
          .startsWith('@astro')
          ? trimmedMessage
          : `@astro ${trimmedMessage}`;

        await emitAck('send_group_message', {
          groupId: groupWithAstro._id,
          message,
          messageType: 'text',
        });
      }
    },
    [groups, loadInitialData, socket]
  );

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
    <div className="swop-dm-shell h-dvh min-h-0 w-full overflow-hidden bg-black p-0 sm:p-3">
      <div className="dm-window flex h-full min-h-0 w-full flex-col rounded-none sm:rounded-[16px]">
        <div className="relative flex h-[42px] flex-shrink-0 items-center gap-2 border-b border-white/[0.07] bg-[#0b0c0f] px-3">
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
          />

          <ChatArea
            selectedChat={selectedChat}
            chatType={chatType || 'private'}
            currentUser={currentUser}
            socket={socket}
            isThreadListCollapsed={isThreadListCollapsed}
            onChatUpdate={refreshSelectedChat}
            onLeaveGroup={() => {
              setSelectedChat(null);
              setChatType(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}
