// app/components/ChatArea.js
"use client";
import { useState, useEffect, useRef } from "react";
import GroupMenu from "./GroupMenu";
import Image from "next/image";
import isUrl from "@/lib/isUrl";
import { GoDotFill } from "react-icons/go";
import { Button } from "../ui/button";
import { IoSend } from "react-icons/io5";
// import GroupMenu from "./GroupMenu";

export default function ChatArea({
  selectedChat,
  chatType,
  currentUser,
  socket,
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const messagesEndRef = useRef(null);

  console.log("selectedChat", selectedChat);
  console.log("messages", messages);

  const isGroup = chatType === "group";

  useEffect(() => {
    console.log("hit");

    if (!selectedChat || !socket) return;

    // Load message history
    if (isGroup) {
      socket.emit(
        "get_group_messages",
        {
          groupId: selectedChat._id,
          page: 1,
          limit: 20,
        },
        (response) => {
          if (response?.success) {
            setMessages(response.messages || []);
          }
        }
      );

      // Join group
      socket.emit("join_group", { groupId: selectedChat._id });
    } else {
      socket.emit(
        "get_conversation_history",
        {
          receiverId: selectedChat._id,
          page: 1,
          limit: 20,
        },
        (response) => {
          if (response?.success) {
            setMessages(response.messages || []);
          }
        }
      );

      // Join conversation
      socket.emit("join_conversation", { receiverId: selectedChat._id });
    }

    const handleNewMessage = (data) => {
      if (!data?.message) return;

      const msg = data.message;
      const isForCurrentChat = isGroup
        ? msg.groupId === selectedChat._id
        : msg.sender?._id === selectedChat._id ||
          msg.sender?._id === currentUser ||
          msg.receiver?._id === selectedChat._id ||
          msg.receiver?._id === currentUser;

      if (isForCurrentChat) {
        setMessages((prev) => {
          // Check if message already exists (prevent duplicates)
          const exists = prev.some((m) => m._id === msg._id);
          if (exists) return prev;

          // For optimistic messages, replace temp ID with real message
          const tempMessageIndex = prev.findIndex(
            (m) => m._id && m._id.toString().startsWith("temp-")
          );

          if (tempMessageIndex > -1) {
            // Replace the last temp message with the real one
            const newMessages = [...prev];
            newMessages[tempMessageIndex] = msg;
            return newMessages;
          }

          return [...prev, msg];
        });
      }
    };

    const handleTyping = (data) => {
      if (isGroup) {
        if (data.groupId === selectedChat._id && data.userId !== currentUser) {
          if (data.isTyping) {
            setTypingUsers((prev) => new Map(prev.set(data.userId, data.user)));
          } else {
            setTypingUsers((prev) => {
              const newMap = new Map(prev);
              newMap.delete(data.userId);
              return newMap;
            });
          }
        }
      } else {
        if (data.userId === selectedChat._id) {
          setIsTyping(data.isTyping);
        }
      }
    };

    socket.on(isGroup ? "new_group_message" : "new_message", handleNewMessage);
    socket.on("user_typing_group", handleTyping);
    socket.on("typing_started", handleTyping);
    socket.on("typing_stopped", handleTyping);

    return () => {
      socket.off(
        isGroup ? "new_group_message" : "new_message",
        handleNewMessage
      );
      socket.off("user_typing_group", handleTyping);
      socket.off("typing_started", handleTyping);
      socket.off("typing_stopped", handleTyping);
    };
  }, [selectedChat, chatType, socket, currentUser, isGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    const messageData = isGroup
      ? {
          groupId: selectedChat._id,
          message: newMessage,
          messageType: "text",
        }
      : {
          receiverId: selectedChat._id,
          message: newMessage,
          messageType: "text",
        };

    // Create optimistic message for immediate UI update
    const optimisticMessage = {
      _id: `temp-${Date.now()}`, // Temporary ID
      message: newMessage,
      sender: { _id: currentUser, name: "You" },
      receiver: isGroup ? null : { _id: selectedChat._id },
      groupId: isGroup ? selectedChat._id : null,
      messageType: "text",
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    // Add message to UI immediately
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage(""); // Clear input immediately

    // Send to server
    socket.emit(
      isGroup ? "send_group_message" : "send_message",
      messageData,
      (response) => {
        if (response?.success && response.message) {
          // Replace optimistic message with real one from server
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === optimisticMessage._id ? response.message : msg
            )
          );
        } else {
          // If failed, mark as failed
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === optimisticMessage._id
                ? { ...msg, status: "failed" }
                : msg
            )
          );
        }
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-whatsapp-bg-primary">
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-2xl font-semibold mb-2">Welcome to SWOP Chat</h2>
          <p className="text-whatsapp-text-secondary">
            Select a conversation to start chatting
          </p>
        </div>
      </div>
    );
  }

  const typingText =
    isGroup && typingUsers.size > 0
      ? Array.from(typingUsers.values())
          .map((user) => user.name)
          .join(", ") + " is typing..."
      : isTyping
      ? "typing..."
      : null;

  function formatGroupParticipants(participants) {
    if (
      !participants ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      return "No members";
    }

    // Extract member names from the participants array
    const memberNames = participants
      .map((participant) => {
        // Handle the nested userId object structure
        const user = participant.userId;

        // Get the name from userId object
        if (user && user.name) {
          return user.name;
        }

        // Fallback if name is not available
        return "Unknown User";
      })
      .filter((name) => name !== "Unknown User"); // Remove any unknown users

    if (memberNames.length === 0) {
      return "No member names available";
    }

    // Join names with comma separation
    return memberNames.join(", ");
  }

  return (
    <div className="flex-1 flex flex-col bg-whatsapp-bg-primary">
      {/* Chat Header */}
      <div className="bg-whatsapp-bg-secondary px-6 py-4 border-b border-whatsapp-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedChat?.microsite?.profilePic ||
          selectedChat?.participant?.profilePic ? (
            <div className="border rounded-full relative">
              <Image
                src={
                  isUrl(
                    selectedChat?.microsite?.profilePic ||
                      selectedChat?.participant?.profilePic
                  )
                    ? selectedChat?.microsite?.profilePic ||
                      selectedChat?.participant?.profilePic
                    : `/images/user_avator/${
                        selectedChat?.microsite?.profilePic ||
                        selectedChat?.participant?.profilePic
                      }@3x.png`
                }
                alt="user"
                width={120}
                height={120}
                quality={100}
                className="w-10 h-10 rounded-full"
              />
              <GoDotFill
                size={20}
                className={`absolute -bottom-1 -right-1 ${
                  true ? "text-green-500" : "text-gray-400"
                }`}
              />
            </div>
          ) : isGroup && selectedChat?.settings?.groupInfo?.groupPicture ? (
            <Image
              src={
                isUrl(selectedChat?.settings?.groupInfo?.groupPicture)
                  ? selectedChat?.settings?.groupInfo?.groupPicture
                  : `/images/user_avator/${selectedChat?.settings?.groupInfo?.groupPicture}@3x.png`
              }
              alt="user"
              width={120}
              height={120}
              quality={100}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                isGroup ? "bg-orange-500" : "bg-whatsapp-green"
              }`}
            >
              {isGroup
                ? "👥"
                : selectedChat.microsite.name?.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h3 className="font-semibold">
              {isGroup ? selectedChat.name : selectedChat.microsite.name}
            </h3>
            <p className="text-sm text-gray-700">
              {isGroup ? (
                <p>{formatGroupParticipants(selectedChat.participants)}</p>
              ) : (
                selectedChat.microsite.ens
              )}
            </p>
          </div>
        </div>

        {isGroup && (
          <GroupMenu
            group={selectedChat}
            socket={socket}
            currentUser={currentUser}
          />
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((message, index) => (
          <Message
            key={message._id || index}
            message={message}
            isOwn={message.sender?._id === currentUser}
            isGroup={isGroup}
          />
        ))}

        {/* Typing Indicator */}
        {true && (
          <div className="flex items-center gap-2 text-whatsapp-text-secondary text-sm">
            <div className="typing-dots flex gap-1">
              <span className="w-2 h-2 bg-whatsapp-text-secondary rounded-full animate-typing-dots" />
              <span className="w-2 h-2 bg-whatsapp-text-secondary rounded-full animate-typing-dots" />
              <span className="w-2 h-2 bg-whatsapp-text-secondary rounded-full animate-typing-dots" />
            </div>
            {typingText}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-whatsapp-bg-secondary p-4">
        <div className="flex gap-4">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-whatsapp-input-bg text-whatsapp-text-primary px-4 py-3 rounded-lg border-none focus:outline-none resize-none"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IoSend color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Message({ message, isOwn, isGroup }) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isOwn
              ? "bg-gray-300 text-black rounded-br-none"
              : " bg-white rounded-bl-none shadow-small"
          } ${message.status === "failed" ? "opacity-50" : ""}`}
        >
          {isGroup && !isOwn && (
            <div className="text-xs font-medium mb-1 opacity-75">
              {message.sender?.name || "Unknown"}
            </div>
          )}
          <div className="text-sm">{message.message}</div>
        </div>
        <p className={`text-xs mt-1 text-gray-500`}>
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {message.status === "sending" && " ⏳"}
          {message.status === "failed" && " ❌"}
        </p>
      </div>
    </div>
  );
}
