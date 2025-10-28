// app/page.js
"use client";
import ChatContainer from "@/components/chat/ChatContainer";
import Header from "@/components/chat/Header";
import SetupPanel from "@/components/chat/SetupPanel";
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
    return <div>loading...</div>;
  }

  return (
    <div className="">
      {/* <Header connectionStatus={connectionStatus} unreadCount={unreadCount} /> */}

      {/* <SetupPanel
        onConnect={connectSocket}
        onDisconnect={disconnectSocket}
        connected={connectionStatus.connected}
        setCurrentUser={setCurrentUser}
      /> */}

      <ChatContainer
        socket={socket}
        currentUser={currentUser}
        setUnreadCount={setUnreadCount}
      />
    </div>
  );
}
