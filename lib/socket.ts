// lib/socket.js
import { useEffect, useRef, useState, useCallback } from "react";
import io from "socket.io-client";

export const useSocket = ({ onConnect, onDisconnect, onConnectError }) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  const connectSocket = useCallback((token) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log('🔌 [Socket] Attempting connection...');
    console.log('🔌 [Socket] URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('🔌 [Socket] Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

    socketRef.current = io(`${process.env.NEXT_PUBLIC_API_URL}`, {
      auth: { token },
      extraHeaders: {
        "ngrok-skip-browser-warning": "true",
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socketInstance = socketRef.current;

    socketInstance.on("connect", () => {
      console.log('✅ [Socket] Connected successfully!', socketInstance.id);
      setSocket(socketInstance);
      onConnect?.();
    });

    socketInstance.on("disconnect", (reason) => {
      console.log('❌ [Socket] Disconnected:', reason);
      setSocket(null);
      onDisconnect?.(reason);
    });

    socketInstance.on("connect_error", (error) => {
      console.error('❌ [Socket] Connection error:', error.message);
      console.error('❌ [Socket] Error details:', error);
      onConnectError?.(error);
    });

    return socketInstance;
  }, [onConnect, onDisconnect, onConnectError]);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    socket,
    connectSocket,
    disconnectSocket,
  };
};
