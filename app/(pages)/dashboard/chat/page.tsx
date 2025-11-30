// app/page.js
'use client';
import ChatContainer from '@/components/chat/ChatContainer';
import { useSocket } from '@/lib/socket';
import { useUser } from '@/lib/UserContext';
import { useEffect, useState } from 'react';

export default function ChatPage() {
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    text: 'Disconnected',
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState('');
  const [isInitializationLoading, setIsInitializationLoading] =
    useState(true);
  const [connectionTimeout, setConnectionTimeout] = useState(false);

  const { user, accessToken, loading: userLoading } = useUser();

  console.log('user', user);
  console.log('currentUser', currentUser);
  console.log('connectionStatus', connectionStatus);
  console.log('userLoading', userLoading);

  const { socket, connectSocket, disconnectSocket } = useSocket({
    onConnect: () => {
      setConnectionStatus({ connected: true, text: 'Connected' });
    },
    onDisconnect: () => {
      setConnectionStatus({ connected: false, text: 'Disconnected' });
      setUnreadCount(0);
    },
    onConnectError: () => {
      setConnectionStatus({
        connected: false,
        text: 'Connection Failed',
      });
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
      console.error(
        'User authentication failed - user or accessToken is null'
      );
      return;
    }

    // User is authenticated, connect socket ONLY if not already connected
    if (user && user?._id && accessToken && !socket) {
      console.log('Connecting socket for user:', user._id);
      connectSocket(accessToken);
      setCurrentUser(user?._id);
      setIsInitializationLoading(false);

      // Set timeout to detect connection failure
      const timeoutId = setTimeout(() => {
        if (!socket) {
          setConnectionTimeout(true);
        }
      }, 15000); // 15 seconds timeout

      return () => clearTimeout(timeoutId);
    } else if (user && user?._id && socket) {
      // Already connected, just update state
      setCurrentUser(user?._id);
      setIsInitializationLoading(false);
      setConnectionTimeout(false); // Reset timeout on successful connection
    }

    // Cleanup on unmount
    return () => {
      if (socket) {
        console.log('🔌 [Chat Page] Cleaning up socket connection');
        disconnectSocket();
      }
    };
  }, [
    accessToken,
    user,
    user?._id,
    userLoading,
    socket,
    disconnectSocket,
  ]);

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

  // Show friendly loading state while socket is connecting
  if (!user || !accessToken || !socket) {
    // Show error state only after timeout
    if (connectionTimeout) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-50">
          <div className="w-full max-w-md rounded-2xl border border-orange-200 bg-white p-8 shadow-sm">
            <div className="text-center">
              <div className="mb-4 text-5xl">🔌</div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Connection Issue
              </h2>
              <p className="mb-6 text-sm text-gray-600">
                We're having trouble connecting to the chat server. This could be due to:
              </p>
              <ul className="mb-6 text-xs text-gray-500 text-left space-y-2 max-w-xs mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Network connectivity issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Server maintenance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Firewall or security settings</span>
                </li>
              </ul>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show loading state during normal connection
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            {/* Animated connecting icon */}
            <div className="mb-6 relative inline-block">
              <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
              <div className="absolute inset-0 h-16 w-16 mx-auto rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-ping opacity-20" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              {!user || !accessToken ? 'Initializing Chat...' : 'Connecting to Chat...'}
            </h2>

            <p className="mb-6 text-sm text-gray-500">
              {!user
                ? 'Loading your profile...'
                : !accessToken
                ? 'Authenticating...'
                : 'Establishing secure connection...'}
            </p>

            {/* Animated dots */}
            <div className="flex justify-center gap-2 mb-6">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-[shimmer_2s_ease-in-out_infinite]"
                   style={{
                     width: '60%',
                     animation: 'shimmer 2s ease-in-out infinite'
                   }}
              />
            </div>

            <p className="mt-4 text-xs text-gray-400">
              This usually takes just a few seconds
            </p>
          </div>
        </div>

        {/* Add shimmer animation */}
        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
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
