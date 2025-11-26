'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';

interface ChatContainerProps {
  socket: any;
  currentUser: string;
  setUnreadCount: (count: number) => void;
}

// Feature flag for V2 chat system
// Set to true to use new unified messaging architecture
const USE_CHAT_V2 = process.env.NEXT_PUBLIC_USE_CHAT_V2 === 'true';

// Socket event names (V1 or V2 based on feature flag)
const EVENTS = USE_CHAT_V2
  ? {
      GET_CONVERSATIONS: 'get_conversations_v2',
      GET_UNREAD_COUNT: 'get_unread_count_v2',
      NEW_MESSAGE: 'new_message_v2',
      CONVERSATION_UPDATED: 'conversation_updated_v2',
      UNREAD_COUNT_UPDATED: 'unread_count_updated_v2',
      MESSAGES_READ: 'messages_read_v2',
      MESSAGE_DELETED: 'message_deleted_v2',
      MESSAGE_EDITED: 'message_edited_v2',
      USER_TYPING: 'user_typing_v2',
    }
  : {
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

export default function ChatContainer({
  socket,
  currentUser,
  setUnreadCount,
}: ChatContainerProps) {
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatType, setChatType] = useState<
    'private' | 'group' | 'astro' | null
  >(null);

  console.log('conversations', conversations);
  console.log('groups', groups);
  console.log('Using Chat V2:', USE_CHAT_V2);

  // Memoized function to load all data
  const loadInitialData = useCallback(() => {
    if (!socket) return;

    console.log('init conv', EVENTS.GET_CONVERSATIONS);
    // Load conversations (using V2 if enabled)
    socket.emit(
      EVENTS.GET_CONVERSATIONS,
      { page: 1, limit: 20 },
      (res: any) => {
        if (res?.success) {
          console.log('conv', res.conversations);
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
          console.log('group res', res);

          setGroups(res.groups || []);
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
    console.log('hit refreshSelectedChat in container');

    if (!socket || !selectedChat) return;

    console.log('chatType1', chatType);

    if (chatType === 'group') {
      // Groups still use old event (no V2 yet)
      socket.emit(
        'get_user_groups',
        { page: 1, limit: 20 },
        (res: any) => {
          if (res?.success) {
            console.log('res for group', res);

            const updatedGroup = res.groups?.find(
              (conv: any) => conv._id === selectedChat._id
            );
            console.log('updatedGroup', updatedGroup);

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
      if (data?.conversationType && data.conversationType !== 'direct') {
        return;
      }
      console.log('Conversation updated');
      loadInitialData();
      refreshSelectedChat();
    };

    const handleGroupUpdate = (data: any) => {
      console.log('Group updated:', data);
      loadInitialData();

      // If the updated group is currently selected, refresh it
      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleNewMessage = (data?: any) => {
      // Only process direct messages
      if (data?.conversationType && data.conversationType !== 'direct') {
        return;
      }
      console.log('New message received (V2:', USE_CHAT_V2, ')');
      loadInitialData();
    };

    const handleNewGroupMessage = () => {
      console.log('New group message received');
      loadInitialData();
    };

    const handleUnreadCountUpdated = (data?: any) => {
      // Only process for direct conversations
      // Backend already excludes agent conversations from unread count
      if (data?.conversationType && data.conversationType !== 'direct') {
        return;
      }
      console.log('Unread count updated (V2)');
      loadInitialData();
    };

    const handleGroupInfoUpdated = (data: any) => {
      console.log('Group info updated:', data);
      loadInitialData();

      // Update selected chat if it's the same group
      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleGroupParticipantsUpdated = (data: any) => {
      console.log('Group participants updated:', data);
      loadInitialData();

      // Update selected chat if it's the same group
      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleGroupMemberAdded = (data: any) => {
      console.log('Group member added:', data);
      loadInitialData();

      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleGroupMemberRemoved = (data: any) => {
      console.log('Group member removed:', data);
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
      console.log('Group deleted:', data);
      loadInitialData();

      // Clear selection if currently viewing the deleted group
      if (data?.groupId === selectedChat?._id) {
        setSelectedChat(null);
        setChatType(null);
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
    };
  }, [
    socket,
    loadInitialData,
    refreshSelectedChat,
    selectedChat,
    currentUser,
  ]);

  const handleSelectChat = (
    chat: any,
    type: 'private' | 'group' | 'astro'
  ) => {
    setSelectedChat(chat);
    setChatType(type);
  };

  return (
    <div className="flex h-[calc(100vh-144px)] gap-4">
      <Sidebar
        conversations={conversations}
        groups={groups}
        selectedChat={selectedChat}
        chatType={chatType}
        onSelectChat={handleSelectChat}
        currentUser={currentUser}
        socket={socket}
      />

      <ChatArea
        selectedChat={selectedChat}
        chatType={chatType}
        currentUser={currentUser}
        socket={socket}
        onChatUpdate={refreshSelectedChat} // Pass refresh function
      />
    </div>
  );
}
