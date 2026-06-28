// app/page.js
'use client';
import {
  canRenderAuthenticatedChatShell,
  shouldAttemptChatReconnect,
  shouldShowChatConnectionFallback,
} from '@/lib/chat/chatShellState';
import { useSocket } from '@/lib/socket';
import { useUser } from '@/lib/UserContext';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

const ChatRuntime = dynamic(
  () => import('@/components/chat/ChatRuntime'),
  {
    ssr: false,
    loading: () => <ChatBootSkeleton />,
  }
);

export default function ChatPage() {
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    text: 'Disconnected',
  });
  const [, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState('');
  const [isInitializationLoading, setIsInitializationLoading] =
    useState(true);
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const [isRetryingChat, setIsRetryingChat] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGroupId = searchParams?.get('groupId');
  const initialAstro =
    searchParams?.get('astro') === '1' ||
    searchParams?.get('agent') === 'astro';
  const initialAgentParam = searchParams?.get('agent');
  const initialAgentId =
    initialAgentParam && initialAgentParam !== 'astro'
      ? initialAgentParam
      : initialAstro
      ? 'astro'
      : null;
  const initialDirectRecipient = useMemo(() => {
    const recipient = {
      userId:
        searchParams?.get('recipientId') ||
        searchParams?.get('recipient') ||
        searchParams?.get('userId') ||
        searchParams?.get('to'),
      micrositeId:
        searchParams?.get('micrositeId') ||
        searchParams?.get('recipientMicrositeId'),
      ens:
        searchParams?.get('recipientEns') ||
        searchParams?.get('ens') ||
        searchParams?.get('handle'),
    };

    return recipient.userId || recipient.micrositeId || recipient.ens
      ? recipient
      : null;
  }, [searchParams]);

  const { user, accessToken, loading: userLoading, refreshUser } = useUser();
  const userId = user?._id;

  const handleSocketConnect = useCallback(() => {
    setConnectionStatus({ connected: true, text: 'Connected' });
    setConnectionTimeout(false);
  }, []);

  const handleSocketDisconnect = useCallback((reason: string) => {
    setConnectionStatus({ connected: false, text: 'Disconnected' });
    setUnreadCount(0);
    void reason;
  }, []);

  const handleSocketConnectError = useCallback(() => {
    setConnectionStatus({
      connected: false,
      text: 'Connecting',
    });
    setConnectionTimeout(true);
  }, []);

  const { socket, connectSocket } = useSocket({
    onConnect: handleSocketConnect,
    onDisconnect: handleSocketDisconnect,
    onConnectError: handleSocketConnectError,
  });
  const hasAuthenticatedChatShell = canRenderAuthenticatedChatShell({
    hasUser: Boolean(user),
    hasAccessToken: Boolean(accessToken),
    isInitializationLoading,
    isSocketConnected: connectionStatus.connected,
    connectionTimeout,
  });
  const showChatConnectionFallback = shouldShowChatConnectionFallback({
    hasUser: Boolean(user),
    hasAccessToken: Boolean(accessToken),
    isInitializationLoading,
    isSocketConnected: connectionStatus.connected,
    connectionTimeout,
  });

  const retryChatConnection = useCallback(async () => {
    setConnectionTimeout(false);

    if (!userId || !accessToken) {
      setIsRetryingChat(true);
      try {
        await refreshUser();
      } finally {
        setIsRetryingChat(false);
      }
      return;
    }

    if (
      shouldAttemptChatReconnect({
        hasUser: Boolean(userId),
        hasAccessToken: Boolean(accessToken),
        hasSocketInstance: Boolean(socket),
        isSocketConnected: connectionStatus.connected,
      })
    ) {
      connectSocket(accessToken);
    }
  }, [
    accessToken,
    connectSocket,
    connectionStatus.connected,
    refreshUser,
    socket,
    userId,
  ]);

  const fullscreenShell =
    'fixed inset-0 z-[80] overflow-hidden bg-black text-[#eceef2]';

  useEffect(() => {
    // Wait for UserContext to finish loading
    if (userLoading) {
      return;
    }

    // If user loaded but is null, stop showing skeleton
    if (!userId || !accessToken) {
      setCurrentUser('');
      setIsInitializationLoading(false);
      if (process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
        console.debug('Chat auth unavailable while initializing');
      }
      return;
    }

    setCurrentUser(userId);

    // User is authenticated, connect socket ONLY if not already connected
    if (userId && accessToken && !socket) {
      connectSocket(accessToken);
      setIsInitializationLoading(false);

      // Set timeout to detect connection failure
      const timeoutId = setTimeout(() => {
        if (!socket) {
          setConnectionTimeout(true);
        }
      }, 15000); // 15 seconds timeout

      return () => clearTimeout(timeoutId);
    } else if (userId && socket) {
      // Already connected, just update state
      setIsInitializationLoading(false);
    }

    return undefined;
  }, [
    accessToken,
    connectSocket,
    userId,
    userLoading,
    socket,
  ]);

  useEffect(() => {
    if (userLoading || (userId && accessToken) || isRetryingChat) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void retryChatConnection();
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [
    accessToken,
    isRetryingChat,
    retryChatConnection,
    userId,
    userLoading,
  ]);

  if (isInitializationLoading) {
    return (
      <div className={`${fullscreenShell} flex items-center justify-center`}>
        <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-[#0e1014] p-6 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]">
          {/* Header Skeleton */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[#1b1e25]" />
            <div>
              <div className="mb-2 h-4 w-32 animate-pulse rounded bg-[#1b1e25]" />
              <div className="h-3 w-20 animate-pulse rounded bg-[#15171d]" />
            </div>
          </div>

          <hr className="mb-4 border-white/[0.07]" />

          {/* Chat Messages Skeleton */}
          <div className="space-y-4">
            <div className="flex justify-start">
              <div className="h-6 w-40 animate-pulse rounded-lg bg-[#1b1e25]" />
            </div>
            <div className="flex justify-end">
              <div className="h-6 w-32 animate-pulse rounded-lg bg-[#3fe08f]/25" />
            </div>
            <div className="flex justify-start">
              <div className="h-6 w-52 animate-pulse rounded-lg bg-[#1b1e25]" />
            </div>
            <div className="flex justify-end">
              <div className="h-6 w-24 animate-pulse rounded-lg bg-[#3fe08f]/25" />
            </div>
          </div>

          {/* Input Skeleton */}
          <div className="mt-6 flex items-center gap-2">
            <div className="h-10 flex-1 animate-pulse rounded-xl bg-[#15171d]" />
            <div className="h-10 w-10 animate-pulse rounded-xl bg-[#1b1e25]" />
          </div>
        </div>
      </div>
    );
  }

  // Show friendly loading state while socket is connecting
  if (!hasAuthenticatedChatShell) {
    // Show error state only after timeout
    if (connectionTimeout) {
      return (
        <div className={`${fullscreenShell} flex items-center justify-center`}>
          <div className="w-full max-w-md rounded-2xl border border-[#3fe08f]/20 bg-[#0e1014] p-8 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]">
            <div className="text-center">
              <div className="dm-mono mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[14px] border border-[#3fe08f]/30 bg-black text-xl font-bold text-[#3fe08f]">
                ...
              </div>
              <h2 className="mb-2 text-xl font-semibold text-[#eceef2]">
                Connecting to chat
              </h2>
              <p className="mb-6 text-sm text-[#9396a0]">
                We are reconnecting in the background. You can retry now or
                open Wallet while chat comes back online.
              </p>
              <div className="flex flex-col justify-center gap-2 sm:flex-row">
                <button
                  onClick={() => void retryChatConnection()}
                  disabled={isRetryingChat}
                  className="rounded-lg bg-[#3fe08f] px-6 py-2.5 text-sm font-semibold text-[#031008] transition-colors hover:bg-[#64f2aa] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRetryingChat ? 'Retrying...' : 'Retry now'}
                </button>
                <button
                  onClick={() => router.push('/wallet')}
                  className="rounded-lg border border-white/[0.08] bg-[#15171d] px-6 py-2.5 text-sm font-semibold text-[#eceef2] transition-colors hover:bg-[#1b1e25]"
                >
                  Open Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show loading state during normal connection
    return (
      <div className={`${fullscreenShell} flex items-center justify-center`}>
        <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-[#0e1014] p-8 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]">
          <div className="text-center">
            {/* Animated connecting icon */}
            <div className="mb-6 relative inline-block">
              <div className="mx-auto h-16 w-16 animate-pulse rounded-[16px] border border-[#3fe08f]/30 bg-black shadow-[inset_0_0_18px_rgba(63,224,143,0.12)]" />
              <div className="absolute inset-0 mx-auto h-16 w-16 animate-ping rounded-[16px] bg-[#3fe08f]/20 opacity-20" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-[#eceef2]">
              {!user || !accessToken
                ? 'Initializing Chat...'
                : 'Connecting to Chat...'}
            </h2>

            <p className="mb-6 text-sm text-[#9396a0]">
              {!user
                ? 'Loading your profile...'
                : !accessToken
                ? 'Authenticating...'
                : 'Establishing secure connection...'}
            </p>

            {/* Animated dots */}
            <div className="flex justify-center gap-2 mb-6">
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-[#3fe08f]"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-[#3fe08f]"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-[#3fe08f]"
                style={{ animationDelay: '300ms' }}
              />
            </div>

            {/* Progress bar */}
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-[#3fe08f] to-[#64f2aa]"
                style={{
                  width: '60%',
                  animation: 'shimmer 2s ease-in-out infinite',
                }}
              />
            </div>

            <p className="mt-4 text-xs text-[#5a5e69]">
              This usually takes just a few seconds
            </p>
            <button
              onClick={() => router.push('/wallet')}
              className="mt-5 rounded-lg border border-white/[0.08] bg-[#15171d] px-5 py-2 text-xs font-semibold text-[#9396a0] transition-colors hover:bg-[#1b1e25] hover:text-[#eceef2]"
            >
              Open Wallet
            </button>
          </div>
        </div>

        {/* Add shimmer animation */}
        <style jsx>{`
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(300%);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={fullscreenShell}>
      {showChatConnectionFallback ? (
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-[90] flex justify-center">
          <div className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-[#3fe08f]/20 bg-[#0e1014]/95 p-4 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#eceef2]">
                  Chat is still reconnecting
                </p>
                <p className="text-xs text-[#9396a0]">
                  Messages and Astro stay visible while socket or wallet reads
                  recover in the background.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void retryChatConnection()}
                  disabled={isRetryingChat}
                  className="rounded-lg bg-[#3fe08f] px-4 py-2 text-xs font-semibold text-[#031008] transition-colors hover:bg-[#64f2aa] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRetryingChat ? 'Retrying...' : 'Retry chat'}
                </button>
                <button
                  onClick={() => router.push('/wallet')}
                  className="rounded-lg border border-white/[0.08] bg-[#15171d] px-4 py-2 text-xs font-semibold text-[#eceef2] transition-colors hover:bg-[#1b1e25]"
                >
                  Open Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <ChatRuntime
        socket={socket}
        currentUser={currentUser}
        setUnreadCount={setUnreadCount}
        initialGroupId={initialGroupId}
        initialAstro={initialAstro}
        initialAgentId={initialAgentId}
        initialDirectRecipient={initialDirectRecipient}
      />
    </div>
  );
}

function ChatBootSkeleton() {
  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-black p-0 text-[#eceef2] sm:p-3">
      <div className="flex h-full min-h-0 w-full overflow-hidden rounded-none border border-white/[0.07] bg-[#08090b] sm:rounded-[16px]">
        <div className="hidden w-[320px] flex-shrink-0 border-r border-white/[0.07] bg-[#101217] p-6 md:block">
          <div className="mb-4 h-8 w-36 animate-pulse rounded bg-[#1b1e25]" />
          <div className="mb-8 h-11 w-full animate-pulse rounded-[12px] bg-[#15171d]" />
          <div className="space-y-4">
            <div className="h-16 animate-pulse rounded-[14px] bg-[#15171d]" />
            <div className="h-16 animate-pulse rounded-[14px] bg-[#15171d]" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="dm-mono mx-auto mb-5 grid h-14 w-14 animate-pulse place-items-center rounded-[14px] border border-[#3fe08f]/30 bg-black text-lg font-bold text-[#3fe08f]">
              $_
            </div>
            <div className="mx-auto mb-3 h-5 w-44 animate-pulse rounded bg-[#1b1e25]" />
            <div className="mx-auto h-3 w-64 animate-pulse rounded bg-[#15171d]" />
          </div>
        </div>
      </div>
    </div>
  );
}
