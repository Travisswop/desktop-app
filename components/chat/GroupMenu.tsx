// app/components/GroupMenu.tsx
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import isUrl from '@/lib/isUrl';
import toast from 'react-hot-toast';
import { useUser } from '@/lib/UserContext';
import {
  Bot,
  Loader2,
  LogOut,
  Menu,
  Pencil,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiFetch';

// ==================== TYPE DEFINITIONS ====================

interface User {
  _id: string;
  name: string;
  username?: string;
  ens?: string;
  email?: string;
  profilePic?: string;
  displayName?: string;
}

interface Participant {
  userId: User | string;
  participantUser?: User;
  role?: string;
  permissions?: string[];
  joinedAt?: string;
}

type RawParticipant = Participant & {
  userId: User;
};

interface GroupSettings {
  groupInfo?: {
    groupPicture?: string | null;
    description?: string;
  };
  isPublic?: boolean;
}

interface Group {
  _id: string;
  name: string;
  description?: string;
  participants?: Participant[];
  botUsers?: GroupAgent[];
  settings?: GroupSettings;
  createdBy?: string | User | { _id?: string };
}

interface GroupMenuProps {
  group: Group;
  socket: any;
  currentUser: string;
  onGroupUpdate?: (updatedGroup?: Group) => void;
  onLeaveGroup?: () => void;
}

interface SearchResponse {
  success: boolean;
  results?: User[];
  users?: User[];
  error?: string;
}

interface SocketResponse {
  success: boolean;
  message?: string;
  error?: string | { message?: string };
  data?: {
    agent?: GroupAgent;
    group?: Group;
  };
  group?: Group;
  participants?: Participant[];
  deletedForEveryone?: boolean;
  deletedForUser?: boolean;
}

interface GroupAgent {
  agentId: string;
  provider?: string;
  displayName?: string;
  avatarUrl?: string | null;
  mentionAliases?: string[];
  responseMode?: 'mention_only';
  enabledTools?: string[];
  isActive?: boolean;
}

type ModalType =
  | null
  | 'addMember'
  | 'removeMember'
  | 'editGroup'
  | 'deleteGroup'
  | 'leaveGroup';

// ==================== SHARED HELPERS / STYLES ====================

function getObjectIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '_id' in (value as any)) {
    const id = (value as { _id?: unknown })._id;
    return id ? String(id) : '';
  }
  return String(value);
}

function getParticipantId(participant: Participant): string {
  return getObjectIdString(participant.userId);
}

function getParticipantUser(
  participant: Participant | RawParticipant,
): User | null {
  if (participant.participantUser) return participant.participantUser;
  if (
    participant.userId &&
    typeof participant.userId === 'object' &&
    '_id' in participant.userId
  ) {
    return participant.userId as User;
  }
  return null;
}

const isGroupAdmin = (participant?: Participant) =>
  Boolean(
    participant?.role === 'admin' ||
      participant?.permissions?.includes('manage_members'),
  );

const isGroupCreator = (group: Group, userId?: string) =>
  Boolean(userId && getObjectIdString(group.createdBy) === userId);

const OVERLAY_CLASS =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4';
const PANEL_CLASS =
  'w-full max-w-md rounded-[18px] border border-white/[0.08] bg-[#111318] text-[#eceef2] shadow-[0_30px_90px_rgba(0,0,0,0.65)]';
const INPUT_CLASS =
  'h-11 w-full rounded-[12px] border border-white/[0.07] bg-black/30 px-3.5 text-[14px] font-semibold text-[#eceef2] outline-none placeholder:text-[#5a5e69] focus:border-[#3fe08f]/60 focus:ring-2 focus:ring-[#3fe08f]/15';
const CANCEL_BUTTON_CLASS =
  'dm-btn inline-flex h-10 items-center justify-center rounded-[11px] border border-white/[0.07] bg-black/20 px-4 text-[13px] font-semibold text-[#eceef2] hover:bg-white/[0.05]';
const PRIMARY_BUTTON_CLASS =
  'dm-btn inline-flex h-10 items-center justify-center gap-2 rounded-[11px] bg-[#3fe08f] px-4 text-[13px] font-bold text-[#031008] hover:bg-[#64f2aa] disabled:cursor-not-allowed disabled:opacity-50';
const DANGER_BUTTON_CLASS =
  'dm-btn inline-flex h-10 items-center justify-center gap-2 rounded-[11px] bg-[#e5484d] px-4 text-[13px] font-bold text-white hover:bg-[#f2555a] disabled:cursor-not-allowed disabled:opacity-50';
const WARNING_BUTTON_CLASS =
  'dm-btn inline-flex h-10 items-center justify-center gap-2 rounded-[11px] bg-[#f59e0b] px-4 text-[13px] font-bold text-[#1a1203] hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-50';
const ROW_CLASS =
  'flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.07] bg-black/20 p-3';
const PROTECTED_AGENT_GROUP_NAMES = new Set(
  ['Astro Trading Desk', 'Goldman Sacks'].map((name) => name.toLowerCase())
);
const ASTRO_ENABLED_TOOLS = [
  'perps.read',
  'perps.write',
  'prediction.read',
  'prediction.write',
  'marketplace.read',
  'marketplace.write',
  'sports.read',
  'wallet.read',
  'wallet.write',
];

function isProtectedAgentGroup(group: Group) {
  return PROTECTED_AGENT_GROUP_NAMES.has(
    String(group.name || '')
      .trim()
      .toLowerCase()
  );
}

function getSocketErrorMessage(error: SocketResponse['error']) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error.message || '';
}

function getResponseErrorMessage(
  response: SocketResponse | undefined,
  fallback: string,
) {
  return getSocketErrorMessage(response?.error) || response?.message || fallback;
}

function getApiErrorMessage(data: any, fallback: string) {
  return data?.message || data?.error?.message || data?.error || fallback;
}

function extractUpdatedGroup(data: any): Group | undefined {
  return data?.data?.group || data?.group;
}

function isAstroActive(group: Group) {
  return Boolean(
    group.botUsers?.some(
      (agent) => agent.agentId === 'astro' && agent.isActive !== false,
    ),
  );
}

function upsertGroupAgent(group: Group, agent: GroupAgent): Group {
  const existingAgents = group.botUsers || [];
  const hasAgent = existingAgents.some(
    (item) => item.agentId === agent.agentId,
  );

  return {
    ...group,
    botUsers: hasAgent
      ? existingAgents.map((item) =>
          item.agentId === agent.agentId ? { ...item, ...agent } : item,
        )
      : [...existingAgents, agent],
  };
}

function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="border-b border-white/[0.07] px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[#eceef2]">
          {title}
        </h3>
        <button
          type="button"
          title="Close"
          onClick={onClose}
          className="dm-btn grid h-9 w-9 place-items-center rounded-[10px] border border-white/[0.07] bg-[#171a21] text-[#8d93a1] hover:text-[#eceef2]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {subtitle && (
        <p className="dm-mono mt-1 truncate text-[11px] font-semibold text-[#5a5e69]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function MemberAvatar({ user }: { user: User }) {
  if (user.profilePic) {
    return (
      <Image
        src={
          isUrl(user.profilePic)
            ? user.profilePic
            : `/images/user_avator/${user.profilePic}@3x.png`
        }
        alt={user.name || 'User'}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#2f4256] text-[13px] font-bold text-[#eceef2]">
      {(user.name || 'U').charAt(0).toUpperCase()}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function GroupMenu({
  group,
  socket,
  currentUser,
  onGroupUpdate,
  onLeaveGroup,
}: GroupMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isAddingAstro, setIsAddingAstro] = useState(false);
  const isProtectedSystemGroup = isProtectedAgentGroup(group);
  const hasAstroAgent = isAstroActive(group);

  const closeMenu = () => setIsOpen(false);
  const closeModal = () => setActiveModal(null);

  const { canManageMembers, canEditInfo, canDelete } = useMemo(() => {
    const me = group.participants?.find(
      (participant) => getParticipantId(participant) === currentUser,
    );
    const isCreator = isGroupCreator(group, currentUser);
    const isAdmin = isGroupAdmin(me);
    const permissions = me?.permissions;

    return {
      canManageMembers:
        isCreator ||
        isAdmin ||
        (Array.isArray(permissions) &&
          permissions.includes('manage_members')),
      canEditInfo:
        isCreator ||
        isAdmin ||
        !Array.isArray(permissions) ||
        permissions.includes('edit_group_info'),
      canDelete: isCreator || isAdmin,
    };
  }, [group, currentUser]);

  const handleAddAstro = useCallback(() => {
    if (!socket || isAddingAstro || hasAstroAgent) return;

    setIsAddingAstro(true);
    socket.emit(
      'add_group_agent',
      {
        groupId: group._id,
        agentId: 'astro',
        provider: 'elizaos',
        enabledTools: ASTRO_ENABLED_TOOLS,
        responseMode: 'mention_only',
      },
      (response: SocketResponse) => {
        if (response?.success) {
          const agent = response.data?.agent || {
            agentId: 'astro',
            provider: 'elizaos',
            displayName: 'Astro',
            mentionAliases: ['@astro', 'astro'],
            responseMode: 'mention_only' as const,
            enabledTools: ASTRO_ENABLED_TOOLS,
            isActive: true,
          };

          toast.success('Astro added. Mention @astro to chat.', {
            position: 'top-right',
          });
          onGroupUpdate?.(response.group || upsertGroupAgent(group, agent));
        } else {
          toast.error(
            getSocketErrorMessage(response?.error) || 'Failed to add Astro',
            {
              position: 'top-right',
            },
          );
        }
        setIsAddingAstro(false);
      },
    );
  }, [group, hasAstroAgent, isAddingAstro, onGroupUpdate, socket]);

  const menuItems = [
    ...(canManageMembers && !isProtectedSystemGroup && !hasAstroAgent
      ? [
          {
            label: isAddingAstro ? 'Adding Astro...' : 'Add Astro',
            icon: isAddingAstro ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bot className="h-4 w-4" />
            ),
            action: () => {
              handleAddAstro();
              closeMenu();
            },
            color: 'default',
          },
        ]
      : []),
    ...(canManageMembers
      ? [
          {
            label: 'Add Member',
            icon: <UserPlus className="h-4 w-4" />,
            action: () => {
              setActiveModal('addMember');
              closeMenu();
            },
            color: 'default',
          },
          {
            label: 'Remove Member',
            icon: <UserMinus className="h-4 w-4" />,
            action: () => {
              setActiveModal('removeMember');
              closeMenu();
            },
            color: 'default',
          },
        ]
      : []),
    ...(canEditInfo
      ? [
          {
            label: 'Edit Group',
            icon: <Pencil className="h-4 w-4" />,
            action: () => {
              setActiveModal('editGroup');
              closeMenu();
            },
            color: 'default',
          },
        ]
      : []),
    ...(isProtectedSystemGroup
      ? []
      : [
          {
            label: 'Leave Group',
            icon: <LogOut className="h-4 w-4" />,
            action: () => {
              setActiveModal('leaveGroup');
              closeMenu();
            },
            color: 'warning',
          },
        ]),
    ...(!isProtectedSystemGroup && canDelete
      ? [
          {
            label: 'Delete Group',
            icon: <Trash2 className="h-4 w-4" />,
            action: () => {
              setActiveModal('deleteGroup');
              closeMenu();
            },
            color: 'danger',
          },
        ]
      : []),
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Group menu"
        className="dm-btn grid h-11 w-11 place-items-center rounded-[13px] border border-white/[0.07] bg-[#101217] text-[#9396a0] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={closeMenu} />

          {/* Menu */}
          <div className="absolute right-0 top-full z-50 mt-2 min-w-52 overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#111318] py-1 shadow-[0_18px_50px_rgba(0,0,0,0.6)]">
            {menuItems.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={item.action}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-semibold transition-colors ${
                  item.color === 'danger'
                    ? 'text-[#ff8589] hover:bg-[#e5484d]/10'
                    : item.color === 'warning'
                      ? 'text-[#fbbf24] hover:bg-[#f59e0b]/10'
                      : 'text-[#c8ccd5] hover:bg-white/[0.05]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {activeModal === 'addMember' && (
        <AddMemberModal
          group={group}
          socket={socket}
          onClose={closeModal}
          onSuccess={onGroupUpdate}
        />
      )}

      {activeModal === 'removeMember' && (
        <RemoveMemberModal
          group={group}
          socket={socket}
          currentUser={currentUser}
          onClose={closeModal}
          onSuccess={onGroupUpdate}
        />
      )}

      {activeModal === 'editGroup' && (
        <EditGroupModal
          group={group}
          socket={socket}
          onClose={closeModal}
          onSuccess={onGroupUpdate}
        />
      )}

      {activeModal === 'leaveGroup' && (
        <LeaveGroupModal
          group={group}
          socket={socket}
          onClose={closeModal}
          onLeaveGroup={onLeaveGroup}
        />
      )}

      {activeModal === 'deleteGroup' && (
        <DeleteGroupModal
          group={group}
          socket={socket}
          onClose={closeModal}
          onDeleted={onLeaveGroup}
        />
      )}
    </div>
  );
}

// ==================== ADD MEMBER MODAL ====================

function AddMemberModal({
  group,
  socket,
  onClose,
  onSuccess,
}: {
  group: Group;
  socket: any;
  onClose: () => void;
  onSuccess?: (updatedGroup?: Group) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(
    null,
  );

  const searchUsers = useCallback(
    (query: string) => {
      if (!query.trim() || !socket) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      socket.emit(
        'search_users',
        // Passing groupId makes the backend exclude existing members
        { query, limit: 10, groupId: group._id },
        (response: SearchResponse) => {
          if (response?.success) {
            const users = response.results || response.users || [];
            // Also filter client-side in case the group changed meanwhile
            const existingUserIds = new Set(
              (group.participants || []).map((participant) =>
                getParticipantId(participant),
              ),
            );
            const filteredUsers = users.filter(
              (user) => !existingUserIds.has(getObjectIdString(user)),
            );
            setSearchResults(filteredUsers);
          } else {
            setSearchResults([]);
          }
          setIsSearching(false);
        },
      );
    },
    [socket, group._id, group.participants],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleAddMember = (userId: string, displayName: string) => {
    if (!socket || addingUserId) return;

    setAddingUserId(userId);

    socket.emit(
      'add_group_member',
      {
        groupId: group._id,
        userIdToAdd: userId,
        role: 'member',
      },
      (response: SocketResponse) => {
        if (response?.success) {
          toast.success(`${displayName} added successfully!`, {
            position: 'top-right',
          });

          setSearchQuery('');
          setSearchResults([]);
          onSuccess?.(response.group);
          onClose();
        } else {
          toast.error(
            `Failed to add ${displayName}: ${getResponseErrorMessage(
              response,
              'Unknown error',
            )}`,
            {
              position: 'top-right',
            },
          );
        }
        setAddingUserId(null);
      },
    );
  };

  return (
    <div className={OVERLAY_CLASS}>
      <div className={`${PANEL_CLASS} flex max-h-[80vh] flex-col`}>
        <ModalHeader
          title="Add Member"
          subtitle={`Group: ${group.name}`}
          onClose={onClose}
        />

        {/* Search */}
        <div className="px-5 pt-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a5e69]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search username, ENS, or name..."
              className={`${INPUT_CLASS} pl-10`}
            />
            {isSearching && (
              <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#3fe08f]" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="dm-scroll flex-1 overflow-y-auto px-5 py-5">
          {isSearching && searchResults.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-7 w-7 animate-spin text-[#3fe08f]" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-8 text-center text-[13px] font-semibold text-[#7b808c]">
              {searchQuery
                ? 'No users found'
                : 'Start typing to search'}
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div key={user._id} className={ROW_CLASS}>
                  <div className="flex min-w-0 items-center gap-3">
                    <MemberAvatar user={user} />
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-bold text-[#eceef2]">
                        {user.displayName || user.name}
                      </div>
                      <div className="dm-mono truncate text-[11px] font-semibold text-[#5a5e69]">
                        {user.ens || user.username || user.email}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleAddMember(
                        user._id,
                        user.displayName || user.name || 'User',
                      )
                    }
                    disabled={addingUserId === user._id}
                    className={PRIMARY_BUTTON_CLASS}
                  >
                    {addingUserId === user._id ? 'Adding...' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== REMOVE MEMBER MODAL ====================

function RemoveMemberModal({
  group,
  socket,
  currentUser,
  onClose,
  onSuccess,
}: {
  group: Group;
  socket: any;
  currentUser: string;
  onClose: () => void;
  onSuccess?: (updatedGroup?: Group) => void;
}) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(
    null,
  );
  const [confirmingUser, setConfirmingUser] = useState<User | null>(
    null,
  );

  // Filter out the current user (can't remove yourself), the group
  // creator, and unpopulated rows
  const removableMembers = (group.participants || []).filter(
    (participant) => {
      const participantId = getParticipantId(participant);
      return (
        participantId &&
        participantId !== currentUser &&
        !isGroupCreator(group, participantId) &&
        getParticipantUser(participant)
      );
    },
  );

  const handleConfirmRemove = () => {
    if (!confirmingUser || !socket) return;
    const user = confirmingUser;
    setRemovingUserId(user._id);

    socket.emit(
      'remove_group_member',
      {
        groupId: group._id,
        userIdToRemove: user._id,
      },
      (response: SocketResponse) => {
        if (response?.success) {
          toast.success(`${user.name} removed successfully!`, {
            position: 'top-right',
          });
          onSuccess?.(response.group);
          setConfirmingUser(null);
          onClose();
        } else {
          toast.error(
            `Failed to remove ${user.name}: ${getResponseErrorMessage(
              response,
              'Unknown error',
            )}`,
            {
              position: 'top-right',
            },
          );
        }
        setRemovingUserId(null);
      },
    );
  };

  return (
    <>
      {/* Main Modal */}
      <div className={OVERLAY_CLASS}>
        <div className={`${PANEL_CLASS} flex max-h-[80vh] flex-col`}>
          <ModalHeader
            title="Remove Member"
            subtitle={`Group: ${group.name}`}
            onClose={onClose}
          />

          {/* Members List */}
          <div className="dm-scroll flex-1 overflow-y-auto px-5 py-5">
            {removableMembers.length === 0 ? (
              <div className="py-8 text-center text-[13px] font-semibold text-[#7b808c]">
                No members to remove (you cannot remove yourself)
              </div>
            ) : (
              <div className="space-y-2">
                {removableMembers.map((participant) => {
                  const user = getParticipantUser(participant)!;
                  return (
                    <div key={user._id} className={ROW_CLASS}>
                      <div className="flex min-w-0 items-center gap-3">
                        <MemberAvatar user={user} />
                        <div className="min-w-0">
                          <div className="truncate text-[13.5px] font-bold text-[#eceef2]">
                            {user.name}
                          </div>
                          <div className="dm-mono truncate text-[11px] font-semibold text-[#5a5e69]">
                            {isGroupAdmin(participant)
                              ? 'admin'
                              : user.username || user.ens || 'member'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmingUser(user)}
                        disabled={removingUserId === user._id}
                        className={DANGER_BUTTON_CLASS}
                      >
                        {removingUserId === user._id
                          ? 'Removing...'
                          : 'Remove'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
          <div className={`${PANEL_CLASS} max-w-sm p-5`}>
            <h3 className="mb-3 text-[16px] font-semibold text-[#ff8589]">
              Remove Member
            </h3>
            <p className="mb-6 text-[13.5px] leading-relaxed text-[#c8ccd5]">
              Are you sure you want to remove{' '}
              <strong className="text-[#eceef2]">
                {confirmingUser.name}
              </strong>{' '}
              from the group{' '}
              <strong className="text-[#eceef2]">{group.name}</strong>
              ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingUser(null)}
                className={CANCEL_BUTTON_CLASS}
              >
                No
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={removingUserId === confirmingUser._id}
                className={DANGER_BUTTON_CLASS}
              >
                {removingUserId === confirmingUser._id
                  ? 'Removing...'
                  : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== EDIT GROUP MODAL ====================

function EditGroupModal({
  group,
  socket,
  onClose,
  onSuccess,
}: {
  group: Group;
  socket: any;
  onClose: () => void;
  onSuccess?: (updatedGroup?: Group) => void;
}) {
  const [groupName, setGroupName] = useState(group.name || '');
  const [groupDescription, setGroupDescription] = useState(
    group.description || '',
  );
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    group.settings?.groupInfo?.groupPicture || null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);

  const { accessToken } = useUser();

  const handlePhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo must be smaller than 5MB', {
          position: 'top-right',
        });
        return;
      }
      setGroupPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove the group photo?'))
      return;

    try {
      setIsRemovingPhoto(true);
      const response = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/group/${group._id}/photo`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        const updatedGroup = extractUpdatedGroup(data);
        setPhotoPreview(null);
        setGroupPhoto(null);
        toast.success('Group photo removed successfully!', {
          position: 'top-right',
        });
        socket?.emit('update_group_info', {
          groupId: group._id,
          groupPicture: null,
        });
        onSuccess?.(
          updatedGroup || {
            ...group,
            settings: {
              ...group.settings,
              groupInfo: {
                ...group.settings?.groupInfo,
                groupPicture: undefined,
              },
            },
          },
        );
      } else {
        toast.error(
          `Failed to remove photo: ${getApiErrorMessage(
            data,
            'Unknown error',
          )}`,
          {
            position: 'top-right',
          },
        );
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Error removing group photo', {
        position: 'top-right',
      });
    } finally {
      setIsRemovingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      toast('Group name is required', {
        position: 'top-right',
      });
      return;
    }

    setIsSaving(true);

    try {
      let hasChanges = false;
      let updatedGroup: Group | undefined;

      // Update name and description
      if (
        groupName !== group.name ||
        groupDescription !== (group.description || '')
      ) {
        const response = await apiFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/group/${group._id}/info`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: groupName,
              description: groupDescription,
            }),
          },
        );

        const data = await response.json();
        if (!data.success) {
          throw new Error(
            getApiErrorMessage(data, 'Failed to update group info'),
          );
        }
        updatedGroup = extractUpdatedGroup(data) || updatedGroup;
        hasChanges = true;

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit('update_group_info', {
            groupId: group._id,
            name: groupName,
            description: groupDescription,
          });
        }
      }

      // Upload new photo
      if (groupPhoto) {
        const formData = new FormData();
        formData.append('groupPhoto', groupPhoto);

        const response = await apiFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/group/${group._id}/photo`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
          },
        );

        const data = await response.json();
        if (!data.success) {
          throw new Error(getApiErrorMessage(data, 'Failed to upload photo'));
        }
        updatedGroup = extractUpdatedGroup(data) || updatedGroup;
        if (socket) {
          socket.emit('update_group_info', {
            groupId: group._id,
            groupPicture: data.data?.photoUrl || data.photoUrl || null,
          });
        }
        hasChanges = true;
      }

      if (hasChanges) {
        toast.success('Group updated successfully!', {
          position: 'top-right',
        });
        onSuccess?.(updatedGroup);
        onClose();
      } else {
        toast('No changes to save', {
          position: 'top-right',
        });
      }
    } catch (error: any) {
      console.error('Error updating group:', error);
      toast.error(`Error: ${error.message}`, {
        position: 'top-right',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={OVERLAY_CLASS}>
      <div
        className={`${PANEL_CLASS} dm-scroll max-h-[90vh] overflow-y-auto`}
      >
        <ModalHeader title="Edit Group" onClose={onClose} />

        {/* Body */}
        <div className="space-y-6 px-5 py-5">
          {/* Group Photo */}
          <div>
            <label className="dm-mono mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#7b808c]">
              Group Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-white/[0.07] bg-black/30">
                {photoPreview ? (
                  <Image
                    src={photoPreview}
                    alt="Group"
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">👥</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  id="photoInput"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('photoInput')?.click()
                  }
                  className={`${PRIMARY_BUTTON_CLASS} w-full`}
                >
                  Choose Photo
                </button>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isRemovingPhoto}
                    className={`${DANGER_BUTTON_CLASS} w-full`}
                  >
                    {isRemovingPhoto ? (
                      <Loader2 className="h-5 w-auto animate-spin" />
                    ) : (
                      'Remove Photo'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Group Name */}
          <div>
            <label className="dm-mono mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#7b808c]">
              Group Name *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={100}
              placeholder="Enter group name"
              className={INPUT_CLASS}
            />
          </div>

          {/* Group Description */}
          <div>
            <label className="dm-mono mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#7b808c]">
              Description (Optional)
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              maxLength={500}
              placeholder="Add a group description"
              rows={4}
              className="w-full resize-none rounded-[12px] border border-white/[0.07] bg-black/30 px-3.5 py-2.5 text-[14px] font-semibold text-[#eceef2] outline-none placeholder:text-[#5a5e69] focus:border-[#3fe08f]/60 focus:ring-2 focus:ring-[#3fe08f]/15"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-white/[0.07] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className={CANCEL_BUTTON_CLASS}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={PRIMARY_BUTTON_CLASS}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== LEAVE GROUP MODAL ====================

function LeaveGroupModal({
  group,
  socket,
  onClose,
  onLeaveGroup,
}: {
  group: Group;
  socket: any;
  onClose: () => void;
  onLeaveGroup?: () => void;
}) {
  const [isLeaving, setIsLeaving] = useState(false);

  const { accessToken } = useUser();

  const handleLeave = async () => {
    setIsLeaving(true);

    try {
      const response = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/group/${group._id}/leave`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json();
      if (data.success) {
        // Leave the socket room so no further group events arrive
        socket?.emit('leave_group', { groupId: group._id });
        toast.success('Left group successfully', {
          position: 'top-right',
        });
        onLeaveGroup?.();
        onClose();
      } else {
        toast.error(
          `Failed to leave group: ${data.message || 'Unknown error'}`,
          {
            position: 'top-right',
          },
        );
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Error leaving group', {
        position: 'top-right',
      });
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className={OVERLAY_CLASS}>
      <div className={`${PANEL_CLASS} p-5`}>
        <h3 className="mb-3 text-[16px] font-semibold text-[#fbbf24]">
          Leave Group
        </h3>
        <p className="mb-6 text-[13.5px] leading-relaxed text-[#c8ccd5]">
          Are you sure you want to leave the group{' '}
          <strong className="text-[#eceef2]">{group.name}</strong>?
          <br />
          <br />
          You will no longer receive messages from this group and will
          need to be re-added by an admin to join again.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={CANCEL_BUTTON_CLASS}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLeave}
            disabled={isLeaving}
            className={WARNING_BUTTON_CLASS}
          >
            {isLeaving ? 'Leaving...' : 'Leave Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== DELETE GROUP MODAL ====================

function DeleteGroupModal({
  group,
  socket,
  onClose,
  onDeleted,
}: {
  group: Group;
  socket: any;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    if (!socket) {
      toast.error('Not connected. Please try again.', {
        position: 'top-right',
      });
      return;
    }
    setIsDeleting(true);

    socket.emit(
      'delete_group_chat',
      { groupId: group._id },
      (response: SocketResponse) => {
        if (response?.success) {
          toast.success(
            response.deletedForEveryone
              ? 'Group deleted successfully'
              : 'Group removed from your chats',
            {
              position: 'top-right',
            },
          );
          onClose();
          onDeleted?.();
        } else {
          toast.error(
            `Failed to delete group: ${getResponseErrorMessage(
              response,
              'Unknown error',
            )}`,
            {
              position: 'top-right',
            },
          );
        }
        setIsDeleting(false);
      },
    );
  };

  return (
    <div className={OVERLAY_CLASS}>
      <div className={`${PANEL_CLASS} p-5`}>
        <h3 className="mb-3 text-[16px] font-semibold text-[#ff8589]">
          Delete Group
        </h3>
        <p className="mb-6 text-[13.5px] leading-relaxed text-[#c8ccd5]">
          Are you sure you want to delete the group{' '}
          <strong className="text-[#eceef2]">{group.name}</strong>?
          <br />
          <br />
          <strong className="text-[#ff8589]">
            This action cannot be undone.
          </strong>{' '}
          All messages and group data will be permanently deleted.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={CANCEL_BUTTON_CLASS}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={DANGER_BUTTON_CLASS}
          >
            {isDeleting ? 'Deleting...' : 'Delete Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
