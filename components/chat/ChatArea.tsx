// app/components/ChatArea.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import GroupMenu from "./GroupMenu";
import Image from "next/image";
import isUrl from "@/lib/isUrl";
import { GoDotFill } from "react-icons/go";
import { IoSend } from "react-icons/io5";
import AstroChatBox from "@/components/wallet/chat/astro-chat-box";

// ==================== FEATURE FLAGS ====================

// Feature flag for V2 chat system
const USE_CHAT_V2 = process.env.NEXT_PUBLIC_USE_CHAT_V2 === 'true';

// Socket event names (V1 or V2 based on feature flag)
const EVENTS = USE_CHAT_V2
  ? {
      SEND_MESSAGE: 'send_message_v2',
      NEW_MESSAGE: 'new_message_v2',
      GET_CONVERSATION_HISTORY: 'get_conversation_history_v2',
      MARK_MESSAGES_READ: 'mark_messages_read_v2',
      JOIN_CONVERSATION: 'join_conversation_v2',
    }
  : {
      SEND_MESSAGE: 'send_message',
      NEW_MESSAGE: 'new_message',
      GET_CONVERSATION_HISTORY: 'get_conversation_history',
      MARK_MESSAGES_READ: 'mark_messages_read',
      JOIN_CONVERSATION: 'join_conversation',
    };

console.log('[ChatArea] Using Chat V2:', USE_CHAT_V2);
console.log('[ChatArea] Event names:', EVENTS);

// ==================== TYPE DEFINITIONS ====================

interface User {
  _id: string;
  name: string;
  profilePic?: string;
}

interface Microsite {
  _id: string;
  name: string;
  ens: string;
  profilePic?: string;
}

interface Participant {
  userId: User;
  role?: string;
  joinedAt?: string;
}

interface GroupSettings {
  groupInfo?: {
    groupPicture?: string;
    description?: string;
  };
}

interface Message {
  _id: string;
  message: string;
  sender: User;
  receiver?: User | null;
  groupId?: string | null;
  messageType: "text" | "image" | "file";
  createdAt: string;
  status?: "sending" | "sent" | "failed";
  readBy?: string[];
}

interface SelectedChat {
  _id: string;
  name?: string;
  microsite?: Microsite;
  participant?: User;
  participants?: Participant[];
  settings?: GroupSettings;
  isGroup?: boolean;
}

interface ChatAreaProps {
  selectedChat: SelectedChat | null;
  chatType: "private" | "group" | "astro";
  currentUser: string;
  socket: any; // You can use Socket from socket.io-client if you have it
  onChatUpdate?: () => void; // ADD THIS
}

interface SocketResponse {
  success: boolean;
  messages?: Message[];
  message?: Message;
  error?: string;
}

interface TypingData {
  userId: string;
  user: User;
  groupId?: string;
  isTyping: boolean;
}

// ==================== MAIN COMPONENT ====================

export default function ChatArea({
  selectedChat,
  chatType,
  currentUser,
  socket,
  onChatUpdate,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, User>>(new Map());

  //State to hold current group data
  const [currentGroupData, setCurrentGroupData] = useState<SelectedChat | null>(
    selectedChat
  );

  console.log("currentGroupData", currentGroupData);
  console.log("selectedChat in chat area", selectedChat);
  console.log("messages", messages);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  console.log("hasMoreMessages", hasMoreMessages);
  console.log("isLoadingMore", isLoadingMore);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const isInitialLoadRef = useRef<boolean>(true);

  const isGroup = chatType === "group";
  const MESSAGES_PER_PAGE = 20;

  // Load messages function
  const loadMessages = useCallback(
    (page: number, isInitial: boolean = false) => {
      if (!selectedChat || !socket) return;

      if (!isInitial) {
        setIsLoadingMore(true);
      }

      const eventName = isGroup
        ? "get_group_messages"
        : EVENTS.GET_CONVERSATION_HISTORY;
      const payload = isGroup
        ? { groupId: selectedChat._id, page, limit: MESSAGES_PER_PAGE }
        : { receiverId: selectedChat._id, page, limit: MESSAGES_PER_PAGE };

      socket.emit(eventName, payload, (response: SocketResponse) => {
        if (response?.success) {
          console.log("hit load message", response);

          const newMessages = response.messages || [];

          // Check if there are more messages to load
          setHasMoreMessages(newMessages.length === MESSAGES_PER_PAGE);

          if (isInitial) {
            setMessages(newMessages);
          } else {
            // Prepend older messages (reverse order since they come newest first)
            setMessages((prev) => [...newMessages, ...prev]);
          }
        }
        setIsLoadingMore(false);
      });
    },
    [selectedChat, socket, isGroup]
  );

  // ADD THIS: Function to refresh group info
  // const refreshGroupInfo = useCallback(() => {
  //   // loadMessages(1, true);
  //   if (!socket || !selectedChat || chatType !== "group") return;
  //   // console.log("selectedChat._id", selectedChat._id);

  //   try {
  //     socket.emit(
  //       "get_group_messages",
  //       { groupId: selectedChat._id, page: 1, limit: 20 },
  //       (groupResponse: any) => {
  //         console.log("respnse hola", groupResponse);
  //         if (groupResponse && groupResponse.success) {
  //           setCurrentGroupData(groupResponse.messages);
  //           // Call parent refresh
  //           onChatUpdate?.();
  //         }
  //       }
  //     );
  //   } catch (error) {
  //     console.log("error in get_group_info", error);
  //   }
  //   console.log("hit last");
  // }, [socket, selectedChat, chatType, onChatUpdate]);

  // UPDATE: Listen for group update events
  useEffect(() => {
    if (!socket || chatType !== "group") return;

    const handleGroupInfoUpdated = (data: any) => {
      if (data.groupId === selectedChat?._id) {
        console.log("Group info updated event received:", data);
        // Update local group data
        if (data.group) {
          setCurrentGroupData(data.group);
        } else if (data.changes) {
          // Merge changes into current data
          setCurrentGroupData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              name: data.changes.name ?? prev.name,
              description: data.changes.description ?? prev.description,
              settings: {
                ...prev.settings,
                groupInfo: {
                  ...prev.settings?.groupInfo,
                  groupPicture:
                    data.changes.groupPicture ??
                    prev.settings?.groupInfo?.groupPicture,
                },
              },
            };
          });
        }
      }
    };

    const handleGroupParticipantsUpdated = (data: any) => {
      if (data.groupId === selectedChat?._id) {
        console.log("Group participants updated:", data);
        // Refresh group info to get latest participant list
        loadMessages(1, true);
      }
    };

    const handleGroupDeleted = (data: any) => {
      if (data.groupId === selectedChat?._id) {
        console.log("Group was deleted");
        alert("This group has been deleted");
        // Navigate back or clear selection
        window.location.reload(); // Simple approach
      }
    };

    socket.on("group_info_updated", handleGroupInfoUpdated);
    socket.on("group_participants_updated", handleGroupParticipantsUpdated);
    socket.on("group_member_added", handleGroupParticipantsUpdated);
    socket.on("group_member_removed", handleGroupParticipantsUpdated);
    socket.on("group_deleted", handleGroupDeleted);

    return () => {
      socket.off("group_info_updated", handleGroupInfoUpdated);
      socket.off("group_participants_updated", handleGroupParticipantsUpdated);
      socket.off("group_member_added", handleGroupParticipantsUpdated);
      socket.off("group_member_removed", handleGroupParticipantsUpdated);
      socket.off("group_deleted", handleGroupDeleted);
    };
  }, [socket, selectedChat, chatType, loadMessages]);
  // UPDATE: Sync currentGroupData when selectedChat changes
  useEffect(() => {
    setCurrentGroupData(selectedChat);
  }, [selectedChat]);

  // console.log("selectedChat._id", selectedChat._id);

  // Initial load and setup
  useEffect(() => {
    if (!selectedChat || !socket || chatType === "astro") return;

    // Reset states for new chat
    setMessages([]);
    setCurrentPage(1);
    setHasMoreMessages(true);
    isInitialLoadRef.current = true;

    // Load initial messages
    loadMessages(1, true);

    // Join room
    if (isGroup) {
      socket.emit("join_group", { groupId: selectedChat._id });
    } else {
      socket.emit(EVENTS.JOIN_CONVERSATION, {
        receiverId: selectedChat?._id || selectedChat?.microsite?.parentId,
      });
    }

    const handleNewMessage = (data: { message?: Message }) => {
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
          const exists = prev.some((m) => m._id === msg._id);
          if (exists) return prev;

          const tempMessageIndex = prev.findIndex(
            (m) => m._id && m._id.toString().startsWith("temp-")
          );

          if (tempMessageIndex > -1) {
            const newMessages = [...prev];
            newMessages[tempMessageIndex] = msg;
            return newMessages;
          }

          return [...prev, msg];
        });
      }
    };

    const handleTyping = (data: TypingData) => {
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

    socket.on(isGroup ? "new_group_message" : EVENTS.NEW_MESSAGE, handleNewMessage);
    socket.on("user_typing_group", handleTyping);
    socket.on("typing_started", handleTyping);
    socket.on("typing_stopped", handleTyping);

    return () => {
      socket.off(
        isGroup ? "new_group_message" : EVENTS.NEW_MESSAGE,
        handleNewMessage
      );
      socket.off("user_typing_group", handleTyping);
      socket.off("typing_started", handleTyping);
      socket.off("typing_stopped", handleTyping);
    };
  }, [selectedChat, chatType, socket, currentUser, isGroup, loadMessages]);

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      isInitialLoadRef.current = false;
    } else if (messages.length > 0 && !isLoadingMore) {
      // Only auto-scroll for new messages if user is near bottom
      const container = messagesContainerRef.current;
      if (container) {
        const isNearBottom =
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
          100;

        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }, [messages, isLoadingMore]);

  // Maintain scroll position after loading older messages
  useEffect(() => {
    if (isLoadingMore && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - previousScrollHeightRef.current;

      if (scrollDiff > 0) {
        container.scrollTop += scrollDiff;
      }
    }
  }, [messages, isLoadingMore]);

  // Handle scroll to load more messages
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingMore || !hasMoreMessages) return;

    // Store current scroll height before loading more
    previousScrollHeightRef.current = container.scrollHeight;

    // Load more when scrolled to top (within 100px)
    if (container.scrollTop < 100) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadMessages(nextPage, false);
    }
  }, [currentPage, isLoadingMore, hasMoreMessages, loadMessages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket || !selectedChat) return;

    console.log({
      receiverId: selectedChat._id,
      message: newMessage,
    });

    console.log("is group gg", isGroup);

    const messageData = isGroup
      ? {
          groupId: selectedChat._id,
          message: newMessage,
          messageType: "text" as const,
        }
      : {
          receiverId: selectedChat?.microsite?.parentId,
          message: newMessage,
          messageType: "text" as const,
        };

    console.log("messageData", messageData);

    const optimisticMessage: Message = {
      _id: `temp-${Date.now()}`,
      message: newMessage,
      sender: { _id: currentUser, name: "You" },
      receiver: isGroup
        ? null
        : {
            _id: selectedChat?.microsite?._id || "",
            name: selectedChat?.microsite?.name || "",
          },
      groupId: isGroup ? selectedChat._id : null,
      messageType: "text",
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    console.log("optimisticMessage", optimisticMessage);

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");

    socket.emit(
      isGroup ? "send_group_message" : EVENTS.SEND_MESSAGE,
      messageData,
      (response: SocketResponse) => {
        console.log("send msg res", response);

        if (response?.success && response.message) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === optimisticMessage._id ? response.message! : msg
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === optimisticMessage._id
                ? { ...msg, status: "failed" as const }
                : msg
            )
          );
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle Astro AI bot chat
  if (chatType === "astro") {
    return <AstroChatBox />;
  }

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

  // USE currentGroupData instead of selectedChat for display
  const displayChat = isGroup ? currentGroupData : selectedChat;

  const typingText =
    isGroup && typingUsers.size > 0
      ? Array.from(typingUsers.values())
          .map((user) => user.name)
          .join(", ") + " is typing..."
      : isTyping
      ? "typing..."
      : null;

  function formatGroupParticipants(participants?: Participant[]): string {
    if (
      !participants ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      return "No members";
    }

    const memberNames = participants
      .map((participant) => {
        const user = participant.userId;
        if (user && user.name) return user.name;
        return "Unknown User";
      })
      .filter((name) => name !== "Unknown User");

    if (memberNames.length === 0) {
      return "No member names available";
    }

    return memberNames.join(", ");
  }

  return (
    <div className="flex-1 flex flex-col bg-white rounded-xl">
      {/* Chat Header */}
      <div className="px-6 py-4 shadow flex items-center justify-between rounded-xl">
        <div className="flex items-center gap-2">
          {displayChat?.microsite?.profilePic ||
          displayChat?.participant?.profilePic ? (
            <div className="border rounded-full relative">
              <Image
                src={
                  isUrl(
                    displayChat?.microsite?.profilePic ||
                      displayChat?.participant?.profilePic ||
                      ""
                  )
                    ? displayChat?.microsite?.profilePic ||
                      displayChat?.participant?.profilePic ||
                      ""
                    : `/images/user_avator/${
                        displayChat?.microsite?.profilePic ||
                        displayChat?.participant?.profilePic
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
          ) : isGroup && displayChat?.settings?.groupInfo?.groupPicture ? (
            <Image
              src={
                isUrl(displayChat?.settings?.groupInfo?.groupPicture)
                  ? displayChat?.settings?.groupInfo?.groupPicture
                  : `/images/user_avator/${displayChat?.settings?.groupInfo?.groupPicture}@3x.png`
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
                : displayChat?.microsite?.name?.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h3 className="font-semibold">
              {isGroup ? displayChat?.name : displayChat?.microsite?.name}
            </h3>
            <p className="text-sm text-gray-700">
              {isGroup ? (
                <span>
                  {formatGroupParticipants(displayChat?.participants)}
                </span>
              ) : (
                displayChat?.microsite?.ens
              )}
            </p>
          </div>
        </div>

        {/* {isGroup && (
          <GroupMenu
            group={displayChat}
            socket={socket}
            currentUser={currentUser}
          />
        )} */}

        {isGroup && (
          <GroupMenu
            group={displayChat}
            socket={socket}
            currentUser={currentUser}
            onGroupUpdate={() => {
              console.log("Group updated, refreshing data...");
              loadMessages(1, true);
            }}
          />
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {/* Loading indicator for older messages */}
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div>
          </div>
        )}

        {/* No more messages indicator */}
        {!hasMoreMessages && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <p className="text-xs text-gray-500">No more messages</p>
          </div>
        )}

        {messages.map((message, index) => (
          <Message
            key={message._id || index}
            message={message}
            isOwn={message.sender?._id === currentUser}
            isGroup={isGroup}
          />
        ))}

        {/* Typing Indicator */}
        {typingText && (
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
            className="flex-1 px-4 py-3 rounded-lg border-none focus:outline-none resize-none bg-slate-100"
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

// ==================== MESSAGE COMPONENT ====================

interface MessageProps {
  message: Message;
  isOwn: boolean;
  isGroup: boolean;
}

function Message({ message, isOwn, isGroup }: MessageProps) {
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
