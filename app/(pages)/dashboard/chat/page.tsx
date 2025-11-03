// app/page.js
"use client";
import ChatContainer from "@/components/chat/ChatContainer";
import { useSocket } from "@/lib/socket";
import { useUser } from "@/lib/UserContext";
import { useEffect, useState } from "react";

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    text: "Disconnected",
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState("");
  const [isInitializationLoading, setIsInitializationLoading] = useState(true);

  const { user, accessToken } = useUser();

  console.log("user", user);
  console.log("currentUser", currentUser);
  console.log("connectionStatus", connectionStatus);

  const { socket, connectSocket, disconnectSocket } = useSocket({
    onConnect: () => {
      setConnectionStatus({ connected: true, text: "Connected" });
    },
    onDisconnect: () => {
      setConnectionStatus({ connected: false, text: "Disconnected" });
      setUnreadCount(0);
    },
    onConnectError: (error) => {
      setConnectionStatus({ connected: false, text: "Connection Failed" });
    },
  });

  useEffect(() => {
    if (user && user?._id && accessToken) {
      connectSocket(accessToken);
      setCurrentUser(user?._id);
      setIsInitializationLoading(false);
    }
  }, [accessToken, user, user?._id]);

  if (isInitializationLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Header Skeleton */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
            <div>
              <div className="mb-2 h-4 w-32 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
            </div>
          </div>

          <hr className="mb-4 border-gray-100" />

          {/* Chat Messages Skeleton */}
          <div className="space-y-4">
            <div className="flex justify-start">
              <div className="h-6 w-40 animate-pulse rounded-lg bg-gray-200" />
            </div>
            <div className="flex justify-end">
              <div className="h-6 w-32 animate-pulse rounded-lg bg-blue-200" />
            </div>
            <div className="flex justify-start">
              <div className="h-6 w-52 animate-pulse rounded-lg bg-gray-200" />
            </div>
            <div className="flex justify-end">
              <div className="h-6 w-24 animate-pulse rounded-lg bg-blue-200" />
            </div>
          </div>

          {/* Input Skeleton */}
          <div className="mt-6 flex items-center gap-2">
            <div className="h-10 flex-1 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <ChatContainer
        socket={socket}
        currentUser={currentUser}
        setUnreadCount={setUnreadCount}
      />
    </div>
  );
}
