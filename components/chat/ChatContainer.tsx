"use client";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";

interface ChatContainerProps {
  socket: any;
  currentUser: string;
  setUnreadCount: (count: number) => void;
}

export default function ChatContainer({
  socket,
  currentUser,
  setUnreadCount,
}: ChatContainerProps) {
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatType, setChatType] = useState<"private" | "group" | null>(null);

  console.log("conversations", conversations);
  console.log("groups", groups);

  // Memoized function to load all data
  const loadInitialData = useCallback(() => {
    if (!socket) return;

    // Load conversations
    socket.emit("get_conversations", { page: 1, limit: 20 }, (res: any) => {
      if (res?.success) {
        setConversations(res.conversations || []);
      }
    });

    // Load groups
    socket.emit("get_user_groups", { page: 1, limit: 20 }, (res: any) => {
      if (res?.success) {
        console.log("group res", res);

        setGroups(res.groups || []);
      }
    });

    // Fetch unread count
    socket.emit("get_unread_count", {}, (response: any) => {
      if (response?.success) {
        setUnreadCount(response.unreadCount || 0);
      }
    });
  }, [socket, setUnreadCount]);

  // Function to refresh selected chat data
  const refreshSelectedChat = useCallback(() => {
    console.log("hit refreshSelectedChat in container");

    if (!socket || !selectedChat) return;

    console.log("chatType1", chatType);

    if (chatType === "group") {
      socket.emit("get_user_groups", { page: 1, limit: 20 }, (res: any) => {
        if (res?.success) {
          console.log("res for group", res);

          const updatedGroup = res.groups?.find(
            (conv: any) => conv._id === selectedChat._id
          );
          console.log("updatedGroup", updatedGroup);

          if (updatedGroup) {
            setSelectedChat(updatedGroup);
          }
        }
      });
    } else {
      // For direct chats, refresh conversation
      socket.emit("get_conversations", { page: 1, limit: 20 }, (res: any) => {
        if (res?.success) {
          const updatedConversation = res.conversations?.find(
            (conv: any) => conv._id === selectedChat._id
          );
          if (updatedConversation) {
            setSelectedChat(updatedConversation);
          }
        }
      });
    }
  }, [socket, selectedChat, chatType]);

  useEffect(() => {
    if (!socket) return;

    // Load initial data
    loadInitialData();

    // Socket event listeners for real-time updates
    const handleConversationUpdate = () => {
      console.log("Conversation updated");
      loadInitialData();
      refreshSelectedChat();
    };

    const handleGroupUpdate = (data: any) => {
      console.log("Group updated:", data);
      loadInitialData();

      // If the updated group is currently selected, refresh it
      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleNewMessage = () => {
      console.log("New message received");
      loadInitialData();
    };

    const handleNewGroupMessage = () => {
      console.log("New group message received");
      loadInitialData();
    };

    const handleGroupInfoUpdated = (data: any) => {
      console.log("Group info updated:", data);
      loadInitialData();

      // Update selected chat if it's the same group
      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleGroupParticipantsUpdated = (data: any) => {
      console.log("Group participants updated:", data);
      loadInitialData();

      // Update selected chat if it's the same group
      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleGroupMemberAdded = (data: any) => {
      console.log("Group member added:", data);
      loadInitialData();

      if (data?.groupId === selectedChat?._id) {
        refreshSelectedChat();
      }
    };

    const handleGroupMemberRemoved = (data: any) => {
      console.log("Group member removed:", data);
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
      console.log("Group deleted:", data);
      loadInitialData();

      // Clear selection if currently viewing the deleted group
      if (data?.groupId === selectedChat?._id) {
        setSelectedChat(null);
        setChatType(null);
      }
    };

    // Register all event listeners
    socket.on("conversation_updated", handleConversationUpdate);
    socket.on("group_updated", handleGroupUpdate);
    socket.on("new_message", handleNewMessage);
    socket.on("new_group_message", handleNewGroupMessage);
    socket.on("group_info_updated", handleGroupInfoUpdated);
    socket.on("group_participants_updated", handleGroupParticipantsUpdated);
    socket.on("group_member_added", handleGroupMemberAdded);
    socket.on("group_member_removed", handleGroupMemberRemoved);
    socket.on("group_deleted", handleGroupDeleted);

    // Cleanup
    return () => {
      socket.off("conversation_updated", handleConversationUpdate);
      socket.off("group_updated", handleGroupUpdate);
      socket.off("new_message", handleNewMessage);
      socket.off("new_group_message", handleNewGroupMessage);
      socket.off("group_info_updated", handleGroupInfoUpdated);
      socket.off("group_participants_updated", handleGroupParticipantsUpdated);
      socket.off("group_member_added", handleGroupMemberAdded);
      socket.off("group_member_removed", handleGroupMemberRemoved);
      socket.off("group_deleted", handleGroupDeleted);
    };
  }, [socket, loadInitialData, refreshSelectedChat, selectedChat, currentUser]);

  const handleSelectChat = (chat: any, type: "private" | "group") => {
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
