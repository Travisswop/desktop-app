// lib/socket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  onConnect?: () => void;
  onDisconnect?: (reason: Socket.DisconnectReason) => void;
  onConnectError?: (error: Error) => void;
}

type ConnectSocketOptions = {
  forceReconnect?: boolean;
};

const socketDebugEnabled = process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true';

const logSocketDebug = (...args: unknown[]) => {
  if (socketDebugEnabled) {
    console.debug(...args);
  }
};

export function shouldReuseSocketConnection({
  hasSocketInstance,
  hasMatchingToken,
  isSocketConnected,
  forceReconnect = false,
}: {
  hasSocketInstance: boolean;
  hasMatchingToken: boolean;
  isSocketConnected: boolean;
  forceReconnect?: boolean;
}): boolean {
  return (
    hasSocketInstance &&
    hasMatchingToken &&
    isSocketConnected &&
    !forceReconnect
  );
}

export const useSocket = ({
  onConnect,
  onDisconnect,
  onConnectError,
}: UseSocketOptions = {}) => {
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const connectSocket = useCallback((
    token: string,
    { forceReconnect = false }: ConnectSocketOptions = {},
  ) => {
    if (
      shouldReuseSocketConnection({
        hasSocketInstance: Boolean(socketRef.current),
        hasMatchingToken: tokenRef.current === token,
        isSocketConnected: Boolean(socketRef.current?.connected),
        forceReconnect,
      })
    ) {
      return socketRef.current;
    }

    const existingSocket = socketRef.current;
    if (existingSocket) {
      existingSocket.removeAllListeners();
      existingSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
    tokenRef.current = token;

    logSocketDebug('[Socket] Attempting connection...');
    logSocketDebug('[Socket] URL:', process.env.NEXT_PUBLIC_API_URL);
    logSocketDebug('[Socket] Token present:', Boolean(token));

    if (!process.env.NEXT_PUBLIC_API_URL) {
      logSocketDebug('[Socket] NEXT_PUBLIC_API_URL is not set. Using fallback.');
    }

    const socketURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    logSocketDebug('[Socket] Connecting to:', socketURL);

    const socketInstance = io(socketURL, {
      auth: { token },
      extraHeaders: {
        "ngrok-skip-browser-warning": "true",
      },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      logSocketDebug('[Socket] Connected successfully!', socketInstance.id);
      setSocket(socketInstance);
      onConnect?.();
    });

    socketInstance.on("disconnect", (reason) => {
      logSocketDebug('[Socket] Disconnected:', reason);
      setSocket(null);
      onDisconnect?.(reason);
    });

    socketInstance.on("connect_error", (error: Error) => {
      logSocketDebug('[Socket] Connection retry:', error.message);
      onConnectError?.(error);
    });

    return socketInstance;
  }, [onConnect, onDisconnect, onConnectError]);

  const disconnectSocket = useCallback(() => {
    const existingSocket = socketRef.current;
    if (existingSocket) {
      existingSocket.removeAllListeners();
      existingSocket.disconnect();
      socketRef.current = null;
      tokenRef.current = null;
      setSocket(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        tokenRef.current = null;
      }
    };
  }, []);

  return {
    socket,
    connectSocket,
    disconnectSocket,
  };
};
