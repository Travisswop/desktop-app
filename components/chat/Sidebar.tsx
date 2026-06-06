// app/components/Sidebar.js
'use client';
import { useEffect, useRef, useState } from 'react';
import GroupModal from './GroupModal';
import isUrl from '@/lib/isUrl';
import Image from 'next/image';
import {
  Bot,
  Globe2,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';

interface SidebarProps {
  conversations: any[];
  groups: any[];
  selectedChat: any;
  chatType: 'private' | 'group' | null;
  onSelectChat: (
    chat: any,
    type: 'private' | 'group'
  ) => void;
  currentUser: string;
  socket: any;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

type ThreadSelectionType = 'private' | 'group';

export default function Sidebar({
  conversations,
  groups,
  selectedChat,
  chatType,
  onSelectChat,
  currentUser,
  socket,
  isCollapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allItems = [
    ...conversations.map((item) => ({
      ...normalizeDirectChat(item),
      lastActivity: item.lastMessage?.createdAt
        ? new Date(item.lastMessage.createdAt)
        : new Date(0),
      type: 'direct',
    })),
    ...groups.map((item) => ({
      ...item,
      lastActivity: item.lastMessage?.createdAt
        ? new Date(item.lastMessage.createdAt)
        : new Date(0),
      type: 'group',
    })),
  ].sort((a, b) => {
    return b.lastActivity.getTime() - a.lastActivity.getTime();
  });

  const unreadTotal = allItems.reduce(
    (sum, item) => sum + Number(item.unreadCount || 0),
    0
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim() || !socket) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      socket.emit('search_contacts', { query, limit: 8 }, (res: any) => {
        if (res?.success) {
          setSearchResults(res.results || []);
          setShowSearchResults(true);
        }
      });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleSearchResultClick = (user: any) => {
    onSelectChat(normalizeDirectChat(user), 'private');
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const handleToggleCollapsed = () => {
    if (!isCollapsed) {
      setSearchQuery('');
      setShowSearchResults(false);
      setSearchResults([]);
    }
    onToggleCollapsed?.();
  };

  const isSelected = (item: any, type: ThreadSelectionType) => {
    if (!selectedChat) return false;
    return chatType === type && selectedChat._id === item._id;
  };

  return (
    <aside
      className={`flex ${
        isCollapsed ? 'w-[76px]' : 'w-[320px]'
      } flex-shrink-0 flex-col border-r border-white/[0.07] bg-[#0e1014] transition-[width] duration-200 ease-out`}
    >
      {isCollapsed ? (
        <>
          <div className="flex flex-shrink-0 flex-col items-center gap-2 px-2 pb-3 pt-[18px]">
            <button
              type="button"
              title="Expand messages"
              aria-label="Expand messages"
              aria-pressed={isCollapsed}
              onClick={handleToggleCollapsed}
              className="dm-btn grid h-[42px] w-[42px] place-items-center rounded-[12px] border border-[#3fe08f]/20 bg-[#15171d] text-[#3fe08f]"
            >
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              title="Create chat"
              onClick={() => setShowGroupModal(true)}
              className="dm-btn grid h-[42px] w-[42px] place-items-center rounded-[12px] border border-white/[0.07] bg-[#15171d] text-[#eceef2]"
            >
              <Plus className="h-[17px] w-[17px]" />
            </button>
            {unreadTotal > 0 && (
              <span className="dm-mono rounded-full border border-white/[0.07] bg-[#1b1e25] px-2 py-1 text-[9.5px] font-bold text-[#eceef2]">
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
          </div>

          <div className="dm-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            <div className="space-y-2">
              {allItems.map((item) => {
                const type =
                  item.type === 'direct'
                    ? 'private'
                    : (item.type as ThreadSelectionType);
                return (
                  <CollapsedConversationItem
                    key={item._id}
                    item={item}
                    isSelected={isSelected(item, type)}
                    onClick={() => onSelectChat(item, type)}
                    currentUser={currentUser}
                  />
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex-shrink-0 px-[18px] pb-3 pt-[18px]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.03em] text-[#eceef2]">
                  Messages
                </h2>
                <div className="dm-mono mt-0.5 text-[10.5px] font-semibold text-[#5a5e69]">
                  {allItems.length} threads · {unreadTotal} unread
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  title="Shrink messages"
                  aria-label="Shrink messages"
                  aria-pressed={isCollapsed}
                  onClick={handleToggleCollapsed}
                  className="dm-btn grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-white/[0.07] bg-[#15171d] text-[#9396a0]"
                >
                  <PanelLeftClose className="h-[17px] w-[17px]" />
                </button>
                <button
                  type="button"
                  title="Create chat"
                  onClick={() => setShowGroupModal(true)}
                  className="dm-btn grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-white/[0.07] bg-[#15171d] text-[#eceef2]"
                >
                  <Plus className="h-[17px] w-[17px]" />
                </button>
              </div>
            </div>

            <div className="relative mt-3.5">
              <div className="flex items-center gap-2.5 rounded-[10px] border border-white/[0.07] bg-[#15171d] px-3 py-[9px]">
                <Search className="h-3.5 w-3.5 flex-shrink-0 text-[#5a5e69]" />
                <input
                  id="chat-thread-search"
                  name="chatThreadSearch"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder="Search threads, swop.id, txs..."
                  className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#eceef2] outline-none placeholder:text-[#5a5e69]"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    title="Clear search"
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                      setSearchResults([]);
                    }}
                    className="dm-btn grid h-6 w-6 place-items-center rounded-md text-[#5a5e69]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="dm-mono rounded-[5px] border border-white/[0.07] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#5a5e69]">
                    /K
                  </span>
                )}
              </div>

              {showSearchResults && (
                <div className="dm-scroll absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-64 overflow-y-auto rounded-[12px] border border-white/[0.07] bg-[#15171d] p-1.5 shadow-[0_22px_60px_rgba(0,0,0,0.45)]">
                  {searchResults.map((user, index) => (
                    <button
                      key={user._id || index}
                      type="button"
                      onClick={() => handleSearchResultClick(user)}
                      className="dm-row flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-left"
                    >
                      <AvatarImage
                        avatar={user.avatar || user?.microsite?.profilePic}
                        name={user.displayName || user.name || 'Unknown User'}
                        sizeClass="h-9 w-9"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-[#eceef2]">
                          {user.displayName || user.name || 'Unknown User'}
                        </div>
                        <div className="dm-mono truncate text-[10.5px] text-[#5a5e69]">
                          {user.ens || user.microsite?.ens || 'swop contact'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="dm-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            {allItems.length === 0 ? (
              <div className="dm-mono rounded-[12px] border border-white/[0.07] bg-[#15171d] p-4 text-center text-[11px] text-[#5a5e69]">
                no threads yet
              </div>
            ) : (
              allItems
                .filter((item: any) => filterThread(item, searchQuery))
                .map((item) => {
                  const type =
                    item.type === 'direct'
                      ? 'private'
                      : (item.type as ThreadSelectionType);
                  return (
                    <ConversationItem
                      key={item._id}
                      item={item}
                      isSelected={isSelected(item, type)}
                      onClick={() => onSelectChat(item, type)}
                      currentUser={currentUser}
                    />
                  );
                })
            )}

            <div className="dm-mono px-2 pb-1 pt-3 text-center text-[9.5px] font-semibold tracking-[0.04em] text-[#5a5e69]">
              end-to-end encrypted · swop://msg/v1
            </div>
          </div>
        </>
      )}

      {showGroupModal && (
        <GroupModal
          isOpen={showGroupModal}
          onClose={() => setShowGroupModal(false)}
          socket={socket}
          onGroupCreated={(group) => onSelectChat(group, 'group')}
          onDirectSelected={(user) => onSelectChat(user, 'private')}
        />
      )}
    </aside>
  );
}

function normalizeDirectChat(user: any) {
  const userId =
    user?.participant?._id ||
    user?.userId ||
    user?.microsite?.parentId ||
    user?._id ||
    '';
  const name =
    user?.displayName ||
    user?.name ||
    user?.microsite?.name ||
    user?.participant?.name ||
    user?.username ||
    user?.ens ||
    'Unknown User';
  const avatar =
    user?.avatar ||
    user?.profilePic ||
    user?.microsite?.profilePic ||
    user?.microsite?.profileUrl ||
    user?.microsite?.brandImg ||
    user?.participant?.profilePic;

  return {
    ...user,
    _id: userId,
    name,
    displayName: user?.displayName || name,
    avatar,
    participant: user?.participant || {
      _id: userId,
      name,
      profilePic: avatar,
    },
    microsite: {
      ...(user?.microsite || {}),
      parentId: userId,
      name,
      ens: user?.ens || user?.microsite?.ens || user?.username || '',
      username: user?.username || user?.microsite?.username || '',
      profilePic: avatar,
    },
  };
}

function filterThread(item: any, searchQuery: string) {
  if (!searchQuery.trim()) return true;
  const query = searchQuery.toLowerCase();

  if (item.type === 'direct') {
    const name = item.microsite?.name || item.name || '';
    const ens = item.microsite?.ens || '';
    return (
      name.toLowerCase().includes(query) ||
      ens.toLowerCase().includes(query)
    );
  }

  const name = item.name || '';
  const description = item.description || '';
  return (
    name.toLowerCase().includes(query) ||
    description.toLowerCase().includes(query)
  );
}

function buildLastMessagePreview(lastMessage: any, fallback: string) {
  if (!lastMessage) return fallback;

  const rawMessage = String(lastMessage.message || '').trim();
  const action = lastMessage.agentData?.action;

  if (action === 'perps.place_order') return 'Perps order ready';
  if (action === 'perps.close_position') return 'Perps close ready';
  if (action === 'wallet.swap') return 'Swap quote ready';
  if (action === 'wallet.send') return 'Send ready';
  if (action === 'polymarket.place_order') return 'Prediction order ready';
  if (/^Hyperliquid markets:/i.test(rawMessage)) return 'Perps order ready';
  if (/^I checked current web sources for/i.test(rawMessage)) {
    return 'Research notes ready';
  }

  return rawMessage || fallback;
}

function buildThreadLastMessagePreview(item: any, fallback: string) {
  const preview = buildLastMessagePreview(item.lastMessage, fallback);
  const agentName = item.lastMessage?.agentSender?.displayName;
  return agentName ? `${agentName}: ${preview}` : preview;
}

function ConversationItem({
  item,
  isSelected,
  onClick,
  currentUser,
}: {
  item: any;
  isSelected: boolean;
  onClick: () => void;
  currentUser: string;
}) {
  const isGroup = item.type === 'group';
  const info = getDisplayInfo(item, currentUser);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`dm-row relative mt-1 flex w-full items-start gap-[11px] rounded-[12px] px-3 py-[11px] text-left ${
        isSelected
          ? 'bg-[#1b1e25] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]'
          : 'bg-transparent'
      }`}
    >
      {isSelected && (
        <span className="absolute left-0 top-1/2 h-[22px] w-[3px] -translate-y-1/2 rounded-[3px] bg-[#3fe08f]" />
      )}

      <div className="relative flex-shrink-0">
        {isGroup ? (
          <GroupAvatar item={item} active={isSelected} />
        ) : (
          <AvatarImage avatar={info.avatar} name={info.name} sizeClass="h-10 w-10" />
        )}

        {isGroup && info.hasBot && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-[#0e1014] bg-[#3fe08f] text-[#0b0b0c]">
            <Bot className="h-2.5 w-2.5" />
          </span>
        )}
        {!isGroup && (
          <span
            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0e1014] ${
              info.isOnline ? 'bg-[#3ddc97]' : 'bg-[#5a5e69]'
            }`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-[-0.01em] text-[#eceef2]">
            {info.name}
          </span>
          <span className="dm-mono text-[10px] font-semibold text-[#5a5e69]">
            {formatThreadTime(item.lastActivity)}
          </span>
        </div>

        <div className="dm-mono mt-0.5 flex items-center gap-1.5 text-[10.5px] text-[#5a5e69]">
          {isGroup ? (
            item.settings?.isPublic ? (
              <Globe2 className="h-3 w-3" />
            ) : (
              <LockKeyhole className="h-3 w-3" />
            )
          ) : null}
          <span className="truncate">{info.handle}</span>
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={`min-w-0 flex-1 truncate text-xs tracking-[-0.01em] ${
              info.unreadCount > 0
                ? 'font-semibold text-[#eceef2]'
                : 'font-normal text-[#9396a0]'
            }`}
          >
            {isGroup
              ? `${info.memberCount} members · ${info.lastMessage}`
              : info.lastMessage}
          </span>

          {info.unreadCount > 0 && (
            <span
              className="dm-mono flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-white/[0.07] bg-[#1b1e25] px-1.5 text-[10px] font-bold text-[#eceef2]"
            >
              {info.unreadCount > 99 ? '99+' : info.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function CollapsedConversationItem({
  item,
  isSelected,
  onClick,
  currentUser,
}: {
  item: any;
  isSelected: boolean;
  onClick: () => void;
  currentUser: string;
}) {
  const isGroup = item.type === 'group';
  const info = getDisplayInfo(item, currentUser);
  const unreadLabel = info.unreadCount > 99 ? '99+' : info.unreadCount;

  return (
    <button
      type="button"
      title={info.name}
      aria-label={`Open ${info.name}`}
      onClick={onClick}
      className={`dm-row relative grid h-[52px] w-full place-items-center rounded-[12px] ${
        isSelected
          ? 'bg-[#1b1e25] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]'
          : 'bg-transparent'
      }`}
    >
      {isSelected && (
        <span className="absolute left-0 top-1/2 h-[24px] w-[3px] -translate-y-1/2 rounded-[3px] bg-[#3fe08f]" />
      )}

      <span className="relative">
        {isGroup ? (
          <GroupAvatar item={item} active={isSelected} />
        ) : (
          <AvatarImage avatar={info.avatar} name={info.name} sizeClass="h-10 w-10" />
        )}

        {isGroup && info.hasBot && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-[#0e1014] bg-[#3fe08f] text-[#0b0b0c]">
            <Bot className="h-2.5 w-2.5" />
          </span>
        )}
        {!isGroup && (
          <span
            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0e1014] ${
              info.isOnline ? 'bg-[#3ddc97]' : 'bg-[#5a5e69]'
            }`}
          />
        )}
        {info.unreadCount > 0 && (
          <span className="dm-mono absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-[#0e1014] bg-[#eceef2] px-1 text-[9px] font-bold text-[#0e1014]">
            {unreadLabel}
          </span>
        )}
      </span>
    </button>
  );
}

function getDisplayInfo(item: any, currentUser: string) {
  if (item.type === 'group') {
    return {
      name: item.name || 'Group chat',
      avatar: item.settings?.groupInfo?.groupPicture,
      handle: item.settings?.isPublic ? 'public group' : 'private group',
      lastMessage: buildThreadLastMessagePreview(item, 'No messages yet'),
      unreadCount: item.unreadCount || 0,
      hasBot:
        item.botUsers?.some(
          (agent: any) => agent.agentId && agent.isActive !== false
        ) || false,
      memberCount: item.participants?.length || 0,
    };
  }

  const other = item.participants?.find(
    (participant: any) => String(participant._id || participant) !== String(currentUser)
  );

  return {
    name: item.microsite?.name || other?.name || 'Unknown User',
    avatar: item.microsite?.profilePic || other?.profilePic,
    handle: item.microsite?.ens || other?.ens || 'swop contact',
    lastMessage: buildThreadLastMessagePreview(
      item,
      'Tap to start a conversation...'
    ),
    unreadCount: item.unreadCount || 0,
    isOnline: other?.isOnline || false,
  };
}

function AvatarImage({
  avatar,
  name,
  sizeClass,
}: {
  avatar?: string | null;
  name: string;
  sizeClass: string;
}) {
  if (avatar) {
    return (
      <Image
        src={isUrl(avatar) ? avatar : `/images/user_avator/${avatar}@3x.png`}
        alt={name}
        width={80}
        height={80}
        className={`${sizeClass} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-[#2f4256] text-[13px] font-bold text-[#eceef2]`}
    >
      {getInitials(name)}
    </div>
  );
}

function GroupAvatar({ item, active }: { item: any; active: boolean }) {
  const members = item.participants?.slice(0, 3) || [];
  if (item.settings?.groupInfo?.groupPicture) {
    return (
      <AvatarImage
        avatar={item.settings.groupInfo.groupPicture}
        name={item.name || 'Group'}
        sizeClass="h-10 w-10"
      />
    );
  }

  return (
    <div className="relative h-10 w-10">
      {members.length ? (
        members.map((participant: any, index: number) => {
          const name = participant.userId?.name || participant.name || 'User';
          const colors = ['#2f4256', '#5c4435', '#2f5446'];
          return (
            <div
              key={participant.userId?._id || participant._id || index}
              className="absolute grid h-[23px] w-[23px] place-items-center rounded-full border-2 text-[9px] font-bold text-[#eceef2]"
              style={{
                left: index * 9,
                top: index * 6,
                borderColor: active ? '#1b1e25' : '#0e1014',
                background: colors[index % colors.length],
              }}
            >
              {getInitials(name).slice(0, 1)}
            </div>
          );
        })
      ) : (
        <div className="grid h-10 w-10 place-items-center rounded-[10px] border border-white/[0.07] bg-[#15171d] text-[#9396a0]">
          <Users className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function getInitials(name?: string) {
  const parts = (name || 'SW')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatThreadTime(value?: Date | string) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return '';
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}
