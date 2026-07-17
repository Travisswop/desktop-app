// lib/socket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  onConnect?: () => void;
  onDisconnect?: (reason: Socket.DisconnectReason) => void;
  onConnectError?: (error: Error) => void;
}

const socketDebugEnabled = process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true';

const logSocketDebug = (...args: unknown[]) => {
  if (socketDebugEnabled) {
    console.debug(...args);
  }
};

export const useSocket = ({
  onConnect,
  onDisconnect,
  onConnectError,
}: UseSocketOptions = {}) => {
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const connectSocket = useCallback((token: string) => {
    if (
      socketRef.current &&
      tokenRef.current === token &&
      socketRef.current.connected
    ) {
      return socketRef.current;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
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
      // websocket first: prod runs multiple API instances behind the ALB, and
      // Engine.IO polling only survives that with sticky-session cookies. A
      // websocket is pinned to one instance for its lifetime, so it needs no
      // stickiness. Keep polling as a fallback for proxies that block ws.
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
      // Send cookies so the ALB sticky cookie (AWSALB) makes the polling
      // fallback land on one instance — without it every poll round-robins
      // and the server 400s with "Session ID unknown".
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
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
    if (socketRef.current) {
      socketRef.current.disconnect();
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
