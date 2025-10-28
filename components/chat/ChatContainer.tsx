// app/components/ChatContainer.js
"use client";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
// import Sidebar from "./Sidebar";
// import ChatArea from "./ChatArea";

export default function ChatContainer({ socket, currentUser, setUnreadCount }) {
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatType, setChatType] = useState(null); // 'direct' or 'group'

  useEffect(() => {
    if (!socket) return;

    // Load initial conversations and groups
    const loadInitialData = () => {
      socket.emit("get_conversations", { page: 1, limit: 20 }, (res) => {
        if (res?.success) {
          setConversations(res.conversations || []);
        }
      });

      socket.emit("get_user_groups", { page: 1, limit: 20 }, (res) => {
        if (res?.success) {
          setGroups(res.groups || []);
        }
      });

      // Fetch unread count
      socket.emit("get_unread_count", {}, (response) => {
        if (response?.success) {
          setUnreadCount(response.unreadCount || 0);
        }
      });
    };

    // Socket event listeners
    socket.on("conversation_updated", () => {
      loadInitialData();
    });

    socket.on("group_updated", () => {
      loadInitialData();
    });

    socket.on("new_message", () => {
      loadInitialData();
    });

    socket.on("new_group_message", () => {
      loadInitialData();
    });

    loadInitialData();

    return () => {
      socket.off("conversation_updated");
      socket.off("group_updated");
      socket.off("new_message");
      socket.off("new_group_message");
    };
  }, [socket, setUnreadCount]);

  const handleSelectChat = (chat, type) => {
    setSelectedChat(chat);
    setChatType(type);
  };

  return (
    <div className="flex h-[calc(100vh-140px)]">
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
      />
    </div>
  );
}
