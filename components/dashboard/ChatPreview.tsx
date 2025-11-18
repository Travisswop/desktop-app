"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSocket } from "@/lib/socket";
import { useUser } from "@/lib/UserContext";
import Image from "next/image";
import isUrl from "@/lib/isUrl";
import { PrimaryButton } from "../ui/Button/PrimaryButton";

interface LastMessage {
  _id: string;
  message: string;
  messageType: string;
  sender: string;
  receiver: string;
  createdAt: string;
  isRead: boolean;
  isDeleted: boolean;
  fileName?: string | null;
  fileUrl?: string | null;
}

interface Participant {
  _id: string;
  name: string;
  email: string;
  profilePic: string;
}

interface Microsite {
  _id: string;
  name: string;
  username: string;
  profileUrl: string;
  profilePic: string;
  brandImg: string;
  ens: string;
  parentId: string;
}

interface Conversation {
  _id: string;
  participant: Participant;
  microsite: Microsite;
  lastMessage: LastMessage;
  unreadCount: number;
}

interface ConversationItemProps {
  conversation: Conversation;
  currentUser: string;
}

const ConversationItem = ({ conversation }: ConversationItemProps) => {
  const { participant, lastMessage, unreadCount } = conversation;

  const displayName = participant?.name || participant?.email || "Unknown User";

  // Generate last message preview
  let lastMessagePreview = "No messages yet";
  if (lastMessage) {
    if (lastMessage.isDeleted) {
      lastMessagePreview = "Message deleted";
    } else if (lastMessage.messageType === "text") {
      const messageText = lastMessage.message || "";
      lastMessagePreview =
        messageText.length > 50
          ? `${messageText.substring(0, 50)}...`
          : messageText;
    } else if (lastMessage.messageType === "file") {
      lastMessagePreview = lastMessage.fileName
        ? `📎 ${lastMessage.fileName}`
        : "📎 File";
    } else if (lastMessage.messageType === "image") {
      lastMessagePreview = "🖼️ Image";
    } else if (lastMessage.messageType === "video") {
      lastMessagePreview = "🎥 Video";
    } else if (lastMessage.messageType === "audio") {
      lastMessagePreview = "🎵 Audio";
    }
  }

  return (
    <div className="flex items-center gap-3 p-4 hover:bg-gray-50 rounded-lg transition-colors">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {participant?.profilePic ? (
          isUrl(participant?.profilePic) ? (
            <Image
              src={participant?.profilePic}
              alt={displayName}
              width={48}
              height={48}
              className="rounded-full object-cover"
            />
          ) : (
            <Image
              src={`/images/user_avator/${participant?.profilePic}.png`}
              alt={displayName}
              width={48}
              height={48}
              className="rounded-full object-cover"
            />
          )
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 truncate">
          {displayName}
        </h3>
        <p className="text-sm text-gray-500 truncate">{lastMessagePreview}</p>
      </div>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <div className="flex-shrink-0 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-semibold">
          {unreadCount > 9 ? "9+" : unreadCount}
        </div>
      )}
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
      <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
    </div>
    <Card>
      <CardContent className="p-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

export default function DashboardChatPreview() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    text: "Disconnected",
  });

  const { user, accessToken } = useUser();
  const currentUser = user?._id || "";

  const { socket, connectSocket, disconnectSocket } = useSocket({
    onConnect: () => {
      setConnectionStatus({ connected: true, text: "Connected" });
    },
    onDisconnect: () => {
      setConnectionStatus({ connected: false, text: "Disconnected" });
    },
    onConnectError: () => {
      setConnectionStatus({ connected: false, text: "Connection Failed" });
    },
  });

  // Load conversations
  const loadConversations = () => {
    if (!socket) return;

    socket.emit("get_conversations", { page: 1, limit: 3 }, (res: any) => {
      if (res?.success) {
        setConversations(res.conversations || []);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });
  };

  // Connect socket and load data
  useEffect(() => {
    if (user && user._id && accessToken) {
      connectSocket(accessToken);
    }

    return () => {
      if (socket) {
        disconnectSocket();
      }
    };
  }, [user, accessToken]);

  // Load conversations when socket is connected
  useEffect(() => {
    if (socket && connectionStatus.connected) {
      loadConversations();

      // Listen for real-time updates
      const handleConversationUpdate = () => {
        loadConversations();
      };

      const handleNewMessage = () => {
        loadConversations();
      };

      socket.on("conversation_updated", handleConversationUpdate);
      socket.on("new_message", handleNewMessage);

      return () => {
        socket.off("conversation_updated", handleConversationUpdate);
        socket.off("new_message", handleNewMessage);
      };
    }
  }, [socket, connectionStatus.connected]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Messages</h2>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">No conversations yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Start a conversation to see it here
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Messages</h2>
        <Link href="/dashboard/chat">
          <PrimaryButton className="text-sm">View</PrimaryButton>
        </Link>
      </div>

      <div>
        <div className="p-0 divide-y divide-gray-200">
          {conversations.map((conversation) => (
            <div
              key={conversation._id}
              //   href="/dashboard/chat"
              className="block hover:no-underline"
            >
              <ConversationItem
                conversation={conversation}
                currentUser={currentUser}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
