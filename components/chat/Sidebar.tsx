// app/components/Sidebar.js
"use client";
import { useState, useEffect } from "react";
import GroupModal from "./GroupModal";
import isUrl from "@/lib/isUrl";
import Image from "next/image";
import { LiaTimesCircle } from "react-icons/lia";
import { FcSearch } from "react-icons/fc";
// import GroupModal from "./GroupModal";

export default function Sidebar({
  conversations,
  groups,
  selectedChat,
  chatType,
  onSelectChat,
  currentUser,
  socket,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  console.log("searchResults", searchResults);
  console.log("conversations", conversations);

  const allItems = [...conversations, ...groups]
    .map((item) => ({
      ...item,
      lastActivity: item.lastMessage?.createdAt
        ? new Date(item.lastMessage.createdAt)
        : new Date(0),
      type: item.participants ? "group" : "direct",
    }))
    .sort((a, b) => b.lastActivity - a.lastActivity);

  console.log("allItems", allItems);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim() || !socket) {
      setShowSearchResults(false);
      return;
    }

    // Debounced search
    const timeoutId = setTimeout(() => {
      socket.emit("search_contacts", { query, limit: 8 }, (res) => {
        if (res?.success) {
          setSearchResults(res.results || []);
          setShowSearchResults(true);
        }
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleSearchResultClick = (user) => {
    onSelectChat(user, "direct");
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const isSelected = (item, type) => {
    if (!selectedChat) return false;
    return chatType === type && selectedChat._id === item._id;
  };

  return (
    <div className="w-80 bg-white flex flex-col rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-2 justify-between">
        <h2 className="text-xl font-semibold">Chats</h2>
        <button
          onClick={() => setShowGroupModal(true)}
          className="py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 bg-black text-white text-sm"
        >
          <span>+</span>
          New Group
        </button>
      </div>

      {/* Search */}
      <div className="p-4 relative">
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <FcSearch size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search or start a new chat"
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearchResults(false);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <LiaTimesCircle size={20} />
            </button>
          )}
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div className="absolute bg-white top-full left-4 right-4 mt-2 bg-whatsapp-bg-secondary border border-whatsapp-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
            {searchResults.map((user, index) => (
              <div
                key={index}
                onClick={() => handleSearchResultClick(user)}
                className="p-3 hover:bg-whatsapp-hover cursor-pointer flex items-center gap-3 border-b border-whatsapp-border last:border-b-0"
              >
                <div className="w-10 h-10 rounded-full bg-whatsapp-green flex items-center justify-center text-black font-semibold">
                  <Image
                    src={
                      isUrl(user.avatar || user?.microsite?.profilePic)
                        ? user.avatar || user?.microsite?.profilePic
                        : `/images/user_avator/${
                            user.avatar || user?.microsite?.profilePic
                          }@3x.png`
                    }
                    alt="user"
                    width={120}
                    height={120}
                    className="w-10 h-10 rounded-full"
                  />
                </div>
                <div>
                  <div className="font-medium">
                    {user.displayName || user.name || "Unknown User"}
                  </div>
                  <div className="text-sm text-whatsapp-text-secondary">
                    {user.ens || user.microsite.ens || ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {allItems.length === 0 ? (
          <div className="text-center text-whatsapp-text-secondary py-8">
            No conversations yet
          </div>
        ) : (
          allItems.map((item) => (
            <ConversationItem
              key={item._id}
              item={item}
              isSelected={isSelected(item, item.type)}
              onClick={() => onSelectChat(item, item.type)}
              currentUser={currentUser}
            />
          ))
        )}
      </div>

      {/* Group Creation Modal */}
      {showGroupModal && (
        // <GroupModal
        //   onClose={() => setShowGroupModal(false)}
        //   socket={socket}
        //   currentUser={currentUser}
        //   onGroupCreated={(group) => onSelectChat(group, "group")}
        // />
        <GroupModal
          isOpen={showGroupModal}
          onClose={() => setShowGroupModal(false)}
          socket={socket}
          currentUser={currentUser}
          onGroupCreated={(group) => onSelectChat(group, "group")}
        />
      )}
    </div>
  );
}

function ConversationItem({ item, isSelected, onClick, currentUser }) {
  const isGroup = item.type === "group";

  const getDisplayInfo = () => {
    if (isGroup) {
      return {
        name: item.name,
        avatar: item.settings?.groupInfo?.groupPicture,
        lastMessage: item.lastMessage?.message || "No messages yet",
        unreadCount: item.unreadCount || 0,
        hasBot: item.botUsers?.length > 0,
        memberCount: item.participants?.length || 0,
      };
    } else {
      // Direct conversation
      const other = item.participants?.find(
        (p) => String(p._id || p) !== String(currentUser)
      );
      return {
        name: item.microsite?.name || other?.name || "Unknown User",
        avatar: item.microsite?.profilePic || other?.profilePic,
        lastMessage:
          item.lastMessage?.message || "Tap to start a conversation...",
        unreadCount: item.unreadCount || 0,
        isOnline: other?.isOnline || false,
      };
    }
  };

  const info = getDisplayInfo();
  const lastTime = item.lastMessage?.createdAt
    ? formatTimeAgo(new Date(item.lastMessage.createdAt))
    : "";

  return (
    <div
      onClick={onClick}
      className={`p-4 border-b border-whatsapp-border cursor-pointer transition-colors ${
        isSelected
          ? "bg-whatsapp-teal-dark"
          : "bg-whatsapp-bg-secondary hover:bg-whatsapp-hover"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          {info.avatar ? (
            <Image
              src={
                isUrl(info.avatar)
                  ? info.avatar
                  : `/images/user_avator/${info.avatar}@3x.png`
              }
              alt={info.name}
              width={120}
              height={120}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                isGroup ? "bg-orange-500" : "bg-whatsapp-green"
              }`}
            >
              {isGroup ? "👥" : info.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Online indicator / Bot indicator */}
          {isGroup ? (
            info.hasBot && (
              <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                🤖
              </div>
            )
          ) : (
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-whatsapp-bg-secondary ${
                info.isOnline ? "bg-green-500" : "bg-gray-500"
              }`}
            />
          )}

          {/* Unread count */}
          {info.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {info.unreadCount > 99 ? "99+" : info.unreadCount}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-1">
              <h3 className="font-medium truncate">{info.name}</h3>
              {isGroup && <div>{item.settings.isPublic ? "🌏" : "🔒"}</div>}
            </div>
            <span className="text-xs text-whatsapp-text-secondary whitespace-nowrap">
              {lastTime}
            </span>
          </div>
          <p className="text-sm text-whatsapp-text-secondary truncate">
            {isGroup
              ? `${info.memberCount} members • ${info.lastMessage}`
              : info.lastMessage}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return "Just now";
  }
}
