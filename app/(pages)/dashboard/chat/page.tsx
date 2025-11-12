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

  const { user, accessToken, loading: userLoading } = useUser();

  console.log("user", user);
  console.log("currentUser", currentUser);
  console.log("connectionStatus", connectionStatus);
  console.log("userLoading", userLoading);

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
    // Wait for UserContext to finish loading
    if (userLoading) {
      return;
    }

    // If user loaded but is null, stop showing skeleton
    if (!user || !accessToken) {
      setIsInitializationLoading(false);
      console.error('User authentication failed - user or accessToken is null');
      return;
    }

    // User is authenticated, connect socket ONLY if not already connected
    if (user && user?._id && accessToken && !socket) {
      console.log('Connecting socket for user:', user._id);
      connectSocket(accessToken);
      setCurrentUser(user?._id);
      setIsInitializationLoading(false);
    } else if (user && user?._id && socket) {
      // Already connected, just update state
      setCurrentUser(user?._id);
      setIsInitializationLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (socket) {
        console.log('🔌 [Chat Page] Cleaning up socket connection');
        disconnectSocket();
      }
    };
  }, [accessToken, user, user?._id, userLoading, socket, disconnectSocket]);

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

  // Show error if authentication failed
  if (!user || !accessToken || !socket) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <div className="mb-4 text-red-500 text-4xl">⚠️</div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Authentication Required
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              {!user ? 'User not authenticated. Please log in to access chat.' :
               !accessToken ? 'Access token missing. Please log in again.' :
               'Socket connection failed. Please refresh the page.'}
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Go to Login
            </button>
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
