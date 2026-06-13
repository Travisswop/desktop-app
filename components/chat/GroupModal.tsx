'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import CustomModal from '../modal/CustomModal';
import isUrl from '@/lib/isUrl';
import {
  Loader2,
  MessageCircle,
  Search,
  Users,
  X,
} from 'lucide-react';

interface User {
  _id?: string;
  userId?: string;
  name?: string;
  displayName?: string;
  username?: string;
  ens?: string;
  avatar?: string;
  profilePic?: string;
  microsite?: {
    _id?: string;
    parentId?: string;
    ens?: string;
    name?: string;
    username?: string;
    profilePic?: string;
    profileUrl?: string;
    brandImg?: string;
  };
}

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket: any;
  onGroupCreated?: (group: any) => void;
  onDirectSelected?: (user: any) => void;
}

type ChatMode = 'direct' | 'group';

const SOCKET_ACK_TIMEOUT_MS = 12000;

export default function GroupModal({
  isOpen,
  onClose,
  socket,
  onGroupCreated,
  onDirectSelected,
}: GroupModalProps) {
  const [mode, setMode] = useState<ChatMode>('direct');
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const canCreateGroup = useMemo(
    () =>
      mode === 'group' &&
      Boolean(groupName.trim()) &&
      selectedMembers.length > 0 &&
      !isCreating,
    [groupName, isCreating, mode, selectedMembers.length]
  );

  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = setTimeout(() => searchInputRef.current?.focus(), 80);
    return () => clearTimeout(timeoutId);
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;

    const query = searchQuery.trim();
    if (!query || query.length < 2 || !socket) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isActive = true;
    setIsSearching(true);
    setFormError(null);

    const timeoutId = setTimeout(async () => {
      try {
        const response = await emitSocketAck<any>(
          socket,
          mode === 'direct' ? 'search_contacts' : 'search_users',
          mode === 'direct'
            ? { query, limit: 8 }
            : { query, limit: 10, forGroupCreation: true }
        );

        if (!isActive) return;

        if (response?.success) {
          setSearchResults(
            mode === 'direct'
              ? response.results || []
              : response.users || []
          );
          setFormError(null);
        } else {
          setSearchResults([]);
          setFormError(
            response?.error || 'Could not search users right now.'
          );
        }
      } catch (error) {
        if (!isActive) return;
        setSearchResults([]);
        setFormError(getErrorMessage(error, 'Search timed out.'));
      } finally {
        if (isActive) setIsSearching(false);
      }
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [isOpen, mode, searchQuery, socket]);

  const handleModeChange = (nextMode: ChatMode) => {
    setMode(nextMode);
    setSearchQuery('');
    setSearchResults([]);
    setFormError(null);
  };

  const handleSelectDirect = (user: User) => {
    const directChat = normalizeDirectChat(user);
    if (!directChat?._id) {
      setFormError('This contact is missing a user id.');
      return;
    }

    onDirectSelected?.(directChat);
    handleClose();
  };

  const handleSelectMember = (user: User) => {
    const userId = getUserId(user);
    if (!userId) return;

    setSelectedMembers((members) => {
      if (members.some((member) => getUserId(member) === userId)) {
        return members;
      }
      return [...members, user];
    });
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers((members) =>
      members.filter((member) => getUserId(member) !== userId)
    );
  };

  const handleCreateGroup = async () => {
    if (!canCreateGroup || !socket) return;

    setIsCreating(true);
    setFormError(null);

    try {
      const response = await emitSocketAck<any>(socket, 'create_group', {
        name: groupName.trim(),
        members: selectedMembers.map((member) => getUserId(member)),
        tokenGated: false,
        isPublic: false,
      });

      if (response?.success && response.group) {
        onGroupCreated?.(response.group);
        handleClose();
        return;
      }

      throw new Error(response?.error || 'Failed to create group.');
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to create group.'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setMode('direct');
    setGroupName('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMembers([]);
    setIsSearching(false);
    setIsCreating(false);
    setFormError(null);
    onClose();
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onCloseModal={handleClose}
      ariaLabel="Create Chat"
      width="max-w-[520px]"
      removeCloseButton
      panelClassName="rounded-[18px] border border-white/[0.08] bg-[#111318] shadow-[0_30px_90px_rgba(0,0,0,0.65)]"
      contentClassName="dm-scroll max-h-[86vh] overflow-y-auto"
    >
      <div className="border-b border-white/[0.07] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="dm-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#5a5e69]">
              Messages
            </div>
            <h2 className="mt-1 text-[20px] font-semibold leading-tight tracking-[-0.03em] text-[#eceef2]">
              Create Chat
            </h2>
          </div>
          <button
            type="button"
            title="Close"
            onClick={handleClose}
            className="dm-btn grid h-9 w-9 place-items-center rounded-[10px] border border-white/[0.07] bg-[#171a21] text-[#8d93a1] hover:text-[#eceef2]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 rounded-[12px] border border-white/[0.07] bg-black/25 p-1">
          <ModeButton
            active={mode === 'direct'}
            icon={<MessageCircle className="h-4 w-4" />}
            label="Direct"
            onClick={() => handleModeChange('direct')}
          />
          <ModeButton
            active={mode === 'group'}
            icon={<Users className="h-4 w-4" />}
            label="Group"
            onClick={() => handleModeChange('group')}
          />
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        {mode === 'group' && (
          <Field label="Group Name" htmlFor="group-chat-name">
            <input
              id="group-chat-name"
              name="groupChatName"
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              className="h-11 w-full rounded-[12px] border border-white/[0.07] bg-black/30 px-3.5 text-[14px] font-semibold text-[#eceef2] outline-none placeholder:text-[#5a5e69] focus:border-[#3fe08f]/60 focus:ring-2 focus:ring-[#3fe08f]/15"
              placeholder="Trading desk, friends, team..."
            />
          </Field>
        )}

        <Field
          label={mode === 'direct' ? 'Recipient' : 'Members'}
          htmlFor="chat-user-search"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a5e69]" />
            <input
              id="chat-user-search"
              name="chatUserSearch"
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 w-full rounded-[12px] border border-white/[0.07] bg-black/30 pl-10 pr-10 text-[14px] font-semibold text-[#eceef2] outline-none placeholder:text-[#5a5e69] focus:border-[#3fe08f]/60 focus:ring-2 focus:ring-[#3fe08f]/15"
              placeholder="Search name, handle, or swop id..."
            />
            {isSearching && (
              <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#3fe08f]" />
            )}
          </div>
        </Field>

        {selectedMembers.length > 0 && mode === 'group' && (
          <div className="flex flex-wrap gap-2">
            {selectedMembers.map((member) => {
              const userId = getUserId(member);
              return (
                <span
                  key={userId}
                  className="inline-flex h-8 items-center gap-2 rounded-full border border-[#3fe08f]/25 bg-[#10241b] px-3 text-[12px] font-bold text-[#3fe08f]"
                >
                  {getUserName(member)}
                  <button
                    type="button"
                    title={`Remove ${getUserName(member)}`}
                    onClick={() => userId && handleRemoveMember(userId)}
                    className="grid h-4 w-4 place-items-center rounded-full text-[#3fe08f] hover:bg-white/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="min-h-[148px] overflow-hidden rounded-[14px] border border-white/[0.07] bg-black/20">
          {searchQuery.trim().length < 2 ? (
            <EmptyState
              title={
                mode === 'direct'
                  ? 'Search for a contact'
                  : 'Search for members'
              }
              detail={
                mode === 'direct'
                  ? 'Direct messages open as soon as you select someone.'
                  : 'Add at least one member to create a group.'
              }
            />
          ) : searchResults.length > 0 ? (
            <div className="dm-scroll max-h-[238px] overflow-y-auto p-1.5">
              {searchResults.map((user) => {
                const userId = getUserId(user);
                const selected =
                  mode === 'group' &&
                  selectedMembers.some(
                    (member) => getUserId(member) === userId
                  );

                return (
                  <button
                    key={userId || getUserName(user)}
                    type="button"
                    onClick={() =>
                      mode === 'direct'
                        ? handleSelectDirect(user)
                        : handleSelectMember(user)
                    }
                    className="dm-row flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left"
                  >
                    <UserAvatar user={user} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold text-[#eceef2]">
                        {getUserName(user)}
                      </div>
                      <div className="dm-mono mt-0.5 truncate text-[10.5px] font-semibold text-[#5a5e69]">
                        {getUserHandle(user)}
                      </div>
                    </div>
                    {selected && (
                      <span className="dm-mono rounded-full bg-[#153425] px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#3fe08f]">
                        added
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No matches" detail="Try another name or handle." />
          )}
        </div>

        {formError && (
          <div className="rounded-[12px] border border-[#ff6b6b]/20 bg-[#2b1518] px-3 py-2.5 text-[12px] font-semibold text-[#ffb3b3]">
            {formError}
          </div>
        )}
      </div>

      {mode === 'group' && (
        <div className="border-t border-white/[0.07] px-5 py-4">
          <button
            type="button"
            onClick={handleCreateGroup}
            disabled={!canCreateGroup}
            className="dm-btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#3fe08f] px-4 text-[14px] font-bold text-[#031008] hover:bg-[#64f2aa] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Group
          </button>
        </div>
      )}
    </CustomModal>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`dm-btn inline-flex h-9 items-center justify-center gap-2 rounded-[9px] text-[12px] font-bold ${
        active
          ? 'bg-[#183425] text-[#3fe08f]'
          : 'text-[#8d93a1] hover:bg-white/[0.04] hover:text-[#eceef2]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="dm-mono mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#7b808c]">
        {label}
      </span>
      {children}
    </label>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-[148px] flex-col items-center justify-center px-6 text-center">
      <div className="text-[13px] font-bold text-[#eceef2]">{title}</div>
      <div className="mt-1 max-w-[280px] text-[12px] leading-relaxed text-[#7b808c]">
        {detail}
      </div>
    </div>
  );
}

function UserAvatar({ user }: { user: User }) {
  const avatar = getUserAvatar(user);
  const name = getUserName(user);

  if (avatar) {
    return (
      <Image
        src={isUrl(avatar) ? avatar : `/images/user_avator/${avatar}@3x.png`}
        alt={name}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#2f4256] text-[13px] font-bold text-[#eceef2]">
      {getInitials(name)}
    </div>
  );
}

function emitSocketAck<T>(
  socket: any,
  eventName: string,
  payload: Record<string, unknown>
) {
  return new Promise<T>((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket is not connected.'));
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error(`${eventName} timed out.`));
    }, SOCKET_ACK_TIMEOUT_MS);

    socket.emit(eventName, payload, (response: T) => {
      clearTimeout(timeoutId);
      resolve(response);
    });
  });
}

function normalizeDirectChat(user: User) {
  const userId = getUserId(user);
  const name = getUserName(user);
  const avatar = getUserAvatar(user);
  const microsite = {
    ...(user.microsite || {}),
    parentId: userId,
    name,
    ens: user.ens || user.microsite?.ens || user.username || '',
    username: user.username || user.microsite?.username || '',
    profilePic: avatar,
  };

  return {
    ...user,
    _id: userId,
    name,
    displayName: user.displayName || name,
    avatar,
    participant: {
      _id: userId,
      name,
      profilePic: avatar,
    },
    microsite,
  };
}

function getUserId(user: User) {
  return (
    user._id ||
    user.userId ||
    user.microsite?.parentId ||
    user.microsite?._id ||
    ''
  );
}

function getUserName(user: User) {
  return (
    user.displayName ||
    user.name ||
    user.microsite?.name ||
    user.username ||
    user.ens ||
    'Unknown User'
  );
}

function getUserHandle(user: User) {
  return (
    user.ens ||
    user.microsite?.ens ||
    user.username ||
    user.microsite?.username ||
    'swop contact'
  );
}

function getUserAvatar(user: User) {
  return (
    user.avatar ||
    user.profilePic ||
    user.microsite?.profilePic ||
    user.microsite?.profileUrl ||
    user.microsite?.brandImg ||
    ''
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}
