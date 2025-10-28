// lib/socket.js
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

export const useSocket = ({ onConnect, onDisconnect, onConnectError }) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  const connectSocket = (token) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io(`${process.env.NEXT_PUBLIC_API_URL}`, {
      auth: { token },
      extraHeaders: {
        "ngrok-skip-browser-warning": "true",
      },
    });

    const socketInstance = socketRef.current;

    socketInstance.on("connect", () => {
      setSocket(socketInstance);
      onConnect?.();
    });

    socketInstance.on("disconnect", (reason) => {
      setSocket(null);
      onDisconnect?.(reason);
    });

    socketInstance.on("connect_error", (error) => {
      onConnectError?.(error);
    });

    return socketInstance;
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
  };

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
