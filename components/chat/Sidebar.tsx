// app/components/Sidebar.js
'use client';
import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import GroupModal from './GroupModal';
import isUrl from '@/lib/isUrl';
import Image from 'next/image';
import {
  Activity,
  ArrowRight,
  ArrowRightLeft,
  Bot,
  ChevronLeft,
  Globe2,
  type LucideIcon,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Trash2,
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
  onDeleteChat?: (
    chat: any,
    type: 'private' | 'group'
  ) => void | Promise<void>;
  currentUser: string;
  socket: any;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  onOpenAstroCommand?: (commandSeed: string) => void | Promise<void>;
  onOpenAgentThread?: (agentId: string) => void | Promise<void>;
  onOpenAgentCommand?: (
    agentId: string,
    commandSeed: string
  ) => void | Promise<void>;
  className?: string;
}

type ThreadSelectionType = 'private' | 'group';

type ThreadContextMenuState = {
  x: number;
  y: number;
  item: any;
  type: ThreadSelectionType;
  protectedReason?: string;
};

type AgentQuickPinConfig = {
  agentId: string;
  displayName: string;
  fallbackThreadName: string;
  badge: string;
  initials: string;
  accentClass: string;
  accentBgClass: string;
  commands: Array<{
    label: string;
    seed: string;
    icon: LucideIcon;
  }>;
};

const DEFAULT_AGENT_PINS: AgentQuickPinConfig[] = [
  {
    agentId: 'astro',
    displayName: 'Swop Agent',
    fallbackThreadName: 'Astro Trading Desk',
    badge: 'agent',
    initials: '$_',
    accentClass: 'text-[#3fe08f] border-[#3fe08f]/45',
    accentBgClass: 'bg-[#3fe08f]/15',
    commands: [
      { label: '/send', seed: '/send ', icon: ArrowRight },
      { label: '/swap', seed: '/swap ', icon: ArrowRightLeft },
      {
        label: '/positions',
        seed: '@astro show Hyperliquid positions',
        icon: Activity,
      },
    ],
  },
  {
    agentId: 'goldman-sacks',
    displayName: 'Goldman Sacks',
    fallbackThreadName: 'Goldman Sacks',
    badge: 'strategy',
    initials: 'GS',
    accentClass: 'text-[#f4c95d] border-[#f4c95d]/45',
    accentBgClass: 'bg-[#f4c95d]/15',
    commands: [
      {
        label: '/strategy',
        seed: '@goldman draft a strategy ',
        icon: Bot,
      },
      {
        label: '/vault',
        seed: '@goldman set up my strategy vault',
        icon: LockKeyhole,
      },
      {
        label: '/risk',
        seed: '@goldman summarize tool permissions and risk limits',
        icon: Activity,
      },
    ],
  },
];

export default function Sidebar({
  conversations,
  groups,
  selectedChat,
  chatType,
  onSelectChat,
  onDeleteChat,
  currentUser,
  socket,
  isCollapsed = false,
  onToggleCollapsed,
  onOpenAstroCommand,
  onOpenAgentThread,
  onOpenAgentCommand,
  className = '',
}: SidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [contextMenu, setContextMenu] =
    useState<ThreadContextMenuState | null>(null);
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
  const agentPins = DEFAULT_AGENT_PINS.map((config) => ({
    config,
    thread: allItems.find((item) => isAgentThread(item, config.agentId)),
  }));

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
    setContextMenu(null);
  };

  const handleToggleCollapsed = () => {
    if (!isCollapsed) {
      setSearchQuery('');
      setShowSearchResults(false);
      setSearchResults([]);
      setContextMenu(null);
    }
    onToggleCollapsed?.();
  };

  const isSelected = (item: any, type: ThreadSelectionType) => {
    if (!selectedChat) return false;
    return chatType === type && selectedChat._id === item._id;
  };

  const handleThreadContextMenu = (
    event: ReactMouseEvent,
    item: any,
    type: ThreadSelectionType
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const isProtected = isProtectedAgentThread(item);
    const x =
      typeof window === 'undefined'
        ? event.clientX
        : Math.min(event.clientX, window.innerWidth - 208);
    const y =
      typeof window === 'undefined'
        ? event.clientY
        : Math.min(event.clientY, window.innerHeight - 72);

    setContextMenu({
      x: Math.max(8, x),
      y: Math.max(8, y),
      item,
      type,
      protectedReason: isProtected
        ? `${getDisplayInfo(item, currentUser).name} cannot be deleted`
        : undefined,
    });
  };

  const handleContextDelete = () => {
    if (!contextMenu || contextMenu.protectedReason || !onDeleteChat) return;

    const info = getDisplayInfo(contextMenu.item, currentUser);
    const confirmed =
      typeof window === 'undefined' ||
      window.confirm(`Delete ${info.name}?`);

    if (!confirmed) return;

    const { item, type } = contextMenu;
    setContextMenu(null);
    void onDeleteChat(item, type);
  };

  useEffect(() => {
    if (!contextMenu) return undefined;

    const close = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  return (
    <aside
      className={`flex ${
        isCollapsed ? 'w-[76px]' : 'w-[320px]'
      } flex-shrink-0 flex-col border-r border-white/[0.07] bg-[#0e1014] transition-[width] duration-200 ease-out max-md:border-r-0 max-md:bg-[#f4f4f2] ${className}`}
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
                    onContextMenu={(event) =>
                      handleThreadContextMenu(event, item, type)
                    }
                    currentUser={currentUser}
                  />
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex-shrink-0 border-b border-transparent px-[18px] pb-3 pt-[18px] max-md:border-[#e6e5df] max-md:pt-[52px]">
            <button
              type="button"
              onClick={() => router.push('/wallet')}
              className="dm-btn mb-3 hidden items-center gap-1.5 border-0 bg-transparent p-0 text-[15px] font-semibold tracking-[-0.01em] text-[#0a0a0c] max-md:inline-flex"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.03em] text-[#eceef2] max-md:text-[30px] max-md:font-bold max-md:text-[#0a0a0c]">
                  Messages
                </h2>
                <div className="dm-mono mt-0.5 text-[10.5px] font-semibold text-[#5a5e69] max-md:text-[#77746f]">
                  {allItems.length} threads · {unreadTotal} unread
                  <span className="hidden max-md:inline"> · sol mainnet</span>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  title="Shrink messages"
                  aria-label="Shrink messages"
                  aria-pressed={isCollapsed}
                  onClick={handleToggleCollapsed}
                  className="dm-btn grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-white/[0.07] bg-[#15171d] text-[#9396a0] max-md:hidden"
                >
                  <PanelLeftClose className="h-[17px] w-[17px]" />
                </button>
                <button
                  type="button"
                  title="Create chat"
                  onClick={() => setShowGroupModal(true)}
                  className="dm-btn grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-white/[0.07] bg-[#15171d] text-[#eceef2] max-md:h-10 max-md:w-10 max-md:border-[#e6e5df] max-md:bg-white max-md:text-[#0a0a0c] max-md:shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]"
                >
                  <Plus className="h-[17px] w-[17px]" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {agentPins.map(({ config, thread }) => {
                const type =
                  thread?.type === 'direct'
                    ? 'private'
                    : (thread?.type as ThreadSelectionType) || 'group';
                return (
                  <AgentQuickPin
                    key={config.agentId}
                    config={config}
                    item={
                      thread || {
                        _id: `agent-pin:${config.agentId}`,
                        name: config.fallbackThreadName,
                        type: 'group',
                      }
                    }
                    isSelected={Boolean(thread) && isSelected(thread, type)}
                    onClick={() => {
                      if (onOpenAgentThread) {
                        void onOpenAgentThread(config.agentId);
                        return;
                      }
                      if (thread) {
                        onSelectChat(thread, type);
                      }
                    }}
                    onCommand={(agentId, seed) => {
                      if (onOpenAgentCommand) {
                        void onOpenAgentCommand(agentId, seed);
                        return;
                      }
                      if (agentId === 'astro' && onOpenAstroCommand) {
                        void onOpenAstroCommand(seed);
                        return;
                      }
                      void onOpenAgentThread?.(agentId);
                    }}
                  />
                );
              })}
            </div>

            <div className="relative mt-3.5">
              <div className="flex items-center gap-2.5 rounded-[10px] border border-white/[0.07] bg-[#15171d] px-3 py-[9px] max-md:border-[#e6e5df] max-md:bg-white">
                <Search className="h-3.5 w-3.5 flex-shrink-0 text-[#5a5e69] max-md:text-[#77746f]" />
                <input
                  id="chat-thread-search"
                  name="chatThreadSearch"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder="Search threads, swop.id, txs..."
                  className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#eceef2] outline-none placeholder:text-[#5a5e69] max-md:text-[#0a0a0c] max-md:placeholder:text-[#77746f]"
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
                    className="dm-btn grid h-6 w-6 place-items-center rounded-md text-[#5a5e69] max-md:text-[#77746f]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="dm-mono rounded-[5px] border border-white/[0.07] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#5a5e69] max-md:border-[#e6e5df] max-md:text-[#9a9690]">
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

          <div className="dm-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3 max-md:px-3 max-md:pt-3">
            {allItems.length === 0 ? (
              <div className="dm-mono rounded-[12px] border border-white/[0.07] bg-[#15171d] p-4 text-center text-[11px] text-[#5a5e69] max-md:border-[#e6e5df] max-md:bg-white max-md:text-[#77746f]">
                no threads yet
              </div>
            ) : (
              <div className="max-md:overflow-hidden max-md:rounded-[16px] max-md:border max-md:border-[#e6e5df] max-md:bg-white">
                {allItems
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
                        onContextMenu={(event) =>
                          handleThreadContextMenu(event, item, type)
                        }
                        currentUser={currentUser}
                      />
                    );
                  })}
              </div>
            )}

            <div className="dm-mono px-2 pb-1 pt-3 text-center text-[9.5px] font-semibold tracking-[0.04em] text-[#5a5e69] max-md:text-[#9a9690]">
              end-to-end encrypted · swop://msg/v1
            </div>
          </div>
        </>
      )}

      {contextMenu && (
        <div
          className="fixed z-[80] min-w-[196px] overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#111318] py-1 shadow-[0_18px_50px_rgba(0,0,0,0.6)] max-md:border-[#e6e5df] max-md:bg-white"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenu.protectedReason ? (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-[#5a5e69] max-md:text-[#77746f]">
              <LockKeyhole className="h-4 w-4" />
              <span>{contextMenu.protectedReason}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleContextDelete}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#ff8589] hover:bg-[#e5484d]/10 max-md:text-[#c1272d]"
            >
              <Trash2 className="h-4 w-4" />
              Delete chat
            </button>
          )}
        </div>
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

function isAgentThread(item: any, agentId: string) {
  const name = String(item?.name || item?.displayName || '').toLowerCase();
  const fallbackName =
    DEFAULT_AGENT_PINS.find((pin) => pin.agentId === agentId)
      ?.fallbackThreadName.toLowerCase() || '';
  return (
    item?.type === 'group' &&
    Boolean(fallbackName) &&
    name === fallbackName
  );
}

function isProtectedAgentThread(item: any) {
  if (item?.type !== 'group') return false;
  const name = String(item?.name || item?.displayName || '')
    .trim()
    .toLowerCase();
  return DEFAULT_AGENT_PINS.some(
    (pin) => pin.fallbackThreadName.toLowerCase() === name
  );
}

function AgentQuickPin({
  config,
  item,
  isSelected,
  onClick,
  onCommand,
}: {
  config: AgentQuickPinConfig;
  item: any;
  isSelected: boolean;
  onClick: () => void;
  onCommand?: (agentId: string, commandSeed: string) => void | Promise<void>;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[16px] border bg-[#0a0a0c] text-white shadow-[0_16px_42px_-28px_rgba(0,0,0,0.8)] ${
        isSelected ? 'border-[#3fe08f]/55' : 'border-[#0a0a0c]'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="dm-row flex w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        <span
          className={`dm-mono grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] border text-[12px] font-bold ${config.accentClass} ${config.accentBgClass}`}
        >
          {config.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold tracking-[-0.01em]">
              {config.displayName}
            </span>
            <span className="dm-mono rounded-[5px] border border-[#3fe08f]/45 bg-[#3fe08f]/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#3fe08f]">
              {config.badge}
            </span>
          </span>
          <span className="dm-mono mt-1 flex items-center gap-1.5 text-[10.5px] font-semibold text-white/55">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc97]" />
            online · {item?.name || config.fallbackThreadName}
          </span>
        </span>
      </button>
      <div className="grid grid-cols-3 border-t border-white/[0.07] bg-white/[0.06]">
        {config.commands.map(({ label, seed, icon: CommandIcon }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              if (onCommand) {
                void onCommand(config.agentId, seed);
                return;
              }
              onClick();
            }}
            className="dm-btn dm-mono flex h-10 items-center justify-center gap-1.5 border-r border-white/[0.07] bg-[#0a0a0c] text-[10.5px] font-semibold text-white last:border-r-0"
          >
            <CommandIcon className="h-3 w-3 text-[#3fe08f]" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConversationItem({
  item,
  isSelected,
  onClick,
  onContextMenu,
  currentUser,
}: {
  item: any;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu?: (event: ReactMouseEvent) => void;
  currentUser: string;
}) {
  const isGroup = item.type === 'group';
  const info = getDisplayInfo(item, currentUser);

  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`dm-row relative mt-1 flex w-full items-start gap-[11px] rounded-[12px] px-3 py-[11px] text-left max-md:mt-0 max-md:rounded-none max-md:border-b max-md:border-[#e6e5df] max-md:bg-white max-md:px-[14px] max-md:py-3 ${
        isSelected
          ? 'bg-[#1b1e25] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] max-md:bg-[#fafafa]'
          : 'bg-transparent'
      }`}
    >
      {isSelected && (
        <span className="absolute left-0 top-1/2 h-[22px] w-[3px] -translate-y-1/2 rounded-[3px] bg-[#3fe08f] max-md:hidden" />
      )}

      <div className="relative flex-shrink-0">
        {isGroup ? (
          <GroupAvatar item={item} active={isSelected} />
        ) : (
          <AvatarImage avatar={info.avatar} name={info.name} sizeClass="h-10 w-10" />
        )}

        {isGroup && info.hasBot && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-[#0e1014] bg-[#3fe08f] text-[#0b0b0c] max-md:border-white">
            <Bot className="h-2.5 w-2.5" />
          </span>
        )}
        {!isGroup && (
          <span
            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0e1014] max-md:border-white ${
              info.isOnline ? 'bg-[#3ddc97]' : 'bg-[#5a5e69]'
            }`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-[-0.01em] text-[#eceef2] max-md:text-[#0a0a0c]">
            {info.name}
          </span>
          <span className="dm-mono text-[10px] font-semibold text-[#5a5e69] max-md:text-[#77746f]">
            {formatThreadTime(item.lastActivity)}
          </span>
        </div>

        <div className="dm-mono mt-0.5 flex items-center gap-1.5 text-[10.5px] text-[#5a5e69] max-md:text-[#9a9690]">
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
                ? 'font-semibold text-[#eceef2] max-md:text-[#0a0a0c]'
                : 'font-normal text-[#9396a0] max-md:text-[#77746f]'
            }`}
          >
            {isGroup
              ? `${info.memberCount} members · ${info.lastMessage}`
              : info.lastMessage}
          </span>

          {info.unreadCount > 0 && (
            <span
              className="dm-mono flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-white/[0.07] bg-[#1b1e25] px-1.5 text-[10px] font-bold text-[#eceef2] max-md:border-[#0a0a0c] max-md:bg-[#0a0a0c] max-md:text-white"
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
  onContextMenu,
  currentUser,
}: {
  item: any;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu?: (event: ReactMouseEvent) => void;
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
      onContextMenu={onContextMenu}
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
      className={`${sizeClass} flex items-center justify-center rounded-full bg-[#2f4256] text-[13px] font-bold text-[#eceef2] max-md:bg-[#dfe6ef] max-md:text-[#0a0a0c]`}
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
