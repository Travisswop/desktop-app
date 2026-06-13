// app/components/GroupMenu.tsx
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import isUrl from '@/lib/isUrl';
import toast from 'react-hot-toast';
import { useUser } from '@/lib/UserContext';
import {
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
  role?: string;
  permissions?: string[];
  joinedAt?: string;
  permissions?: string[];
}

type RawParticipant = Omit<Participant, 'participantUser'> & {
  userId: User;
  participantUser?: User;
};

interface GroupSettings {
  groupInfo?: {
    groupPicture?: string;
    description?: string;
  };
  isPublic?: boolean;
  tokenGate?: {
    enabled?: boolean;
    tokenType?: 'NFT' | 'Token';
    selectedToken?: string | null;
    selectedTokenName?: string | null;
    selectedTokenSymbol?: string | null;
    network?: 'SOLANA';
  };
}

interface Group {
  _id: string;
  name: string;
  description?: string;
  participants?: Participant[];
  settings?: GroupSettings;
  createdBy?: { _id?: string } | string;
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
  error?: string;
  group?: Group;
  participants?: Participant[];
}

type ModalType =
  | null
  | 'addMember'
  | 'removeMember'
  | 'manageAdmins'
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

function getParticipantUser(participant: Participant): User | null {
  if (
    participant.userId &&
    typeof participant.userId === 'object' &&
    '_id' in participant.userId
  ) {
    return participant.userId as User;
  }
  return null;
}

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

  const closeMenu = () => setIsOpen(false);
  const closeModal = () => setActiveModal(null);
  const currentParticipant = group.participants?.find(
    (participant) =>
      getParticipantUser(participant)._id === currentUser,
  );
  const canManageGroup = isGroupAdmin(currentParticipant);
  const canDeleteGroup =
    canManageGroup || isGroupCreator(group, currentUser);

  const { canManageMembers, canEditInfo, canDelete } = useMemo(() => {
    const me = group.participants?.find(
      (participant) => getParticipantId(participant) === currentUser,
    );
    const isCreator =
      getObjectIdString(group.createdBy) === currentUser;
    const isAdmin = me?.role === 'admin';
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
  }, [group.participants, group.createdBy, currentUser]);

  const menuItems = [
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
    {
      label: 'Leave Group',
      icon: <LogOut className="h-4 w-4" />,
      action: () => {
        setActiveModal('leaveGroup');
        closeMenu();
      },
      color: 'warning',
    },
    ...(canDelete
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

      {activeModal === 'manageAdmins' && (
        <ManageAdminsModal
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
          currentUser={currentUser}
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
            `Failed to add ${displayName}: ${
              response?.error || 'Unknown error'
            }`,
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

  // Filter out current user (can't remove yourself) and unpopulated rows
  const removableMembers = (group.participants || []).filter(
    (participant) => {
      const participantId = getParticipantId(participant);
      return (
        participantId &&
        participantId !== currentUser &&
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
        userIdToRemove: participantUser._id,
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
            `Failed to remove ${user.name}: ${
              response?.error || 'Unknown error'
            }`,
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
                            {participant.role === 'admin'
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
                        {removingUserId === participantUser._id
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

// ==================== MANAGE ADMINS MODAL ====================

function ManageAdminsModal({
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
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(
    null,
  );

  const participants = group.participants || [];
  const adminCount = participants.filter(isGroupAdmin).length;

  const handleRoleChange = (
    participant: Participant,
    nextRole: 'admin' | 'member',
  ) => {
    const participantUser = getParticipantUser(participant);
    setUpdatingUserId(participantUser._id);

    socket.emit(
      'update_group_member_role',
      {
        groupId: group._id,
        userIdToUpdate: participantUser._id,
        role: nextRole,
      },
      (response: SocketResponse) => {
        if (response.success) {
          toast.success(
            nextRole === 'admin'
              ? `${participantUser.name} is now an admin`
              : `${participantUser.name} is no longer an admin`,
            { position: 'top-right' },
          );
          onSuccess?.();
        } else {
          toast.error(
            `Failed to update ${participantUser.name}: ${response.error}`,
            { position: 'top-right' },
          );
        }
        setUpdatingUserId(null);
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Manage Admins</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {adminCount} admin{adminCount === 1 ? '' : 's'} in{' '}
            {group.name}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {participants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No members found
            </div>
          ) : (
            <div className="space-y-2">
              {participants.map((participant) => {
                const participantUser =
                  getParticipantUser(participant);
                const isAdmin = isGroupAdmin(participant);
                const isCreator = isGroupCreator(
                  group,
                  participantUser._id,
                );
                const isSelf = participantUser._id === currentUser;
                const canDemote = isAdmin && !isCreator && !isSelf;

                return (
                  <div
                    key={participantUser._id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {participantUser.profilePic ? (
                        <Image
                          src={
                            isUrl(participantUser.profilePic)
                              ? participantUser.profilePic
                              : `/images/user_avator/${participantUser.profilePic}@3x.png`
                          }
                          alt={participantUser.name}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold shrink-0">
                          {participantUser.name
                            ?.charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {participantUser.name}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {isCreator
                            ? 'Creator'
                            : isAdmin
                              ? 'Admin'
                              : participantUser.username ||
                                participantUser.ens ||
                                'Member'}
                        </div>
                      </div>
                    </div>

                    {isAdmin ? (
                      <button
                        onClick={() =>
                          handleRoleChange(participant, 'member')
                        }
                        disabled={
                          !canDemote ||
                          updatingUserId === participantUser._id
                        }
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                      >
                        {updatingUserId === participantUser._id
                          ? 'Updating...'
                          : isCreator
                            ? 'Creator'
                            : isSelf
                              ? 'You'
                              : 'Dismiss'}
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleRoleChange(participant, 'admin')
                        }
                        disabled={
                          updatingUserId === participantUser._id
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                      >
                        {updatingUserId === participantUser._id
                          ? 'Updating...'
                          : 'Make Admin'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== EDIT GROUP MODAL ====================

function EditGroupModal({
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
  onSuccess?: () => void;
}) {
  const tokenGate = group.settings?.tokenGate;
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
  const [showManageAdmins, setShowManageAdmins] = useState(false);
  const [tokenGated, setTokenGated] = useState(
    Boolean(tokenGate?.enabled),
  );
  const [tokenType, setTokenType] = useState<'NFT' | 'Token'>(
    tokenGate?.tokenType || 'NFT',
  );
  const [selectedToken, setSelectedToken] = useState(
    tokenGate?.selectedToken || '',
  );

  const { accessToken, user } = useUser();
  const solanaWalletAddress =
    user?.solanaAddress || user?.solanaWallet || '';

  const {
    tokens: walletTokens,
    loading: tokensLoading,
    error: tokensError,
  } = useMultiChainTokenData(
    solanaWalletAddress || undefined,
    undefined,
    ['SOLANA'],
  );

  const {
    nfts: walletNfts,
    loading: nftsLoading,
    error: nftsError,
  } = useNFT(solanaWalletAddress || undefined, undefined, ['SOLANA']);

  const tokenOptions = useMemo(() => {
    const options =
      tokenType === 'NFT'
        ? walletNfts.map((nft) => ({
            value: nft.contract,
            label: nft.name || nft.symbol || nft.contract,
            symbol: nft.symbol,
            image: nft.image,
          }))
        : walletTokens
            .filter((token) => {
              const balance = Number(token.balance || 0);
              return Number.isFinite(balance) && balance > 0;
            })
            .map((token) => ({
              value: token.address || token.symbol,
              label:
                token.name ||
                token.symbol ||
                token.address ||
                'Token',
              symbol: token.symbol,
              image: token.logoURI || token.marketData?.image,
            }));

    if (
      tokenGate?.selectedToken &&
      (tokenGate.tokenType || 'NFT') === tokenType &&
      !options.some(
        (option) => option.value === tokenGate.selectedToken,
      )
    ) {
      return [
        {
          value: tokenGate.selectedToken,
          label:
            tokenGate.selectedTokenName ||
            tokenGate.selectedTokenSymbol ||
            tokenGate.selectedToken,
          symbol: tokenGate.selectedTokenSymbol || undefined,
          image: undefined,
        },
        ...options,
      ];
    }

    return options;
  }, [tokenType, walletNfts, walletTokens, tokenGate]);

  const selectedGateAsset = tokenOptions.find(
    (option) => option.value === selectedToken,
  );

  useEffect(() => {
    if (
      selectedToken &&
      !tokenOptions.some((option) => option.value === selectedToken)
    ) {
      setSelectedToken('');
    }
  }, [selectedToken, tokenOptions]);

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
        setPhotoPreview(null);
        setGroupPhoto(null);
        toast.success('Group photo removed successfully!', {
          position: 'top-right',
        });
        onSuccess?.();
      } else {
        toast.error(`Failed to remove photo: ${data.message}`, {
          position: 'top-right',
        });
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

    if (tokenGated && !selectedToken) {
      toast.error(
        `Select a ${tokenType.toLowerCase()} for token gate`,
        {
          position: 'top-right',
        },
      );
      return;
    }

    setIsSaving(true);

    try {
      let hasChanges = false;

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
            data.message || 'Failed to update group info',
          );
        }
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
          throw new Error(data.message || 'Failed to upload photo');
        }
        hasChanges = true;
      }

      const nextTokenGate = {
        enabled: tokenGated,
        tokenType,
        selectedToken: tokenGated ? selectedToken : null,
        selectedTokenName:
          tokenGated && selectedGateAsset
            ? selectedGateAsset.label
            : null,
        selectedTokenSymbol:
          tokenGated && selectedGateAsset
            ? selectedGateAsset.symbol || null
            : null,
        network: 'SOLANA' as const,
      };

      const currentTokenGate = {
        enabled: Boolean(tokenGate?.enabled),
        tokenType: tokenGate?.tokenType || 'NFT',
        selectedToken: tokenGate?.selectedToken || null,
        selectedTokenName: tokenGate?.selectedTokenName || null,
        selectedTokenSymbol: tokenGate?.selectedTokenSymbol || null,
        network: tokenGate?.network || 'SOLANA',
      };

      if (
        JSON.stringify(nextTokenGate) !==
        JSON.stringify(currentTokenGate)
      ) {
        await new Promise<void>((resolve, reject) => {
          socket.emit(
            'update_group_settings',
            {
              groupId: group._id,
              settings: {
                tokenGate: nextTokenGate,
              },
            },
            (response: SocketResponse) => {
              if (response?.success) {
                resolve();
              } else {
                reject(
                  new Error(
                    response?.error ||
                      'Failed to update token gate settings',
                  ),
                );
              }
            },
          );
        });
        hasChanges = true;
      }

      if (hasChanges) {
        toast.success('Group updated successfully!', {
          position: 'top-right',
        });
        onSuccess?.();
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

          {/* Token Gate */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Token Gated
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  Require a Solana token or NFT before the chat loads.
                </p>
              </div>
              <div className="inline-flex w-36 shrink-0 rounded-full bg-gray-100 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setTokenGated(true)}
                  className={`flex-1 rounded-full px-3 py-2 text-sm transition-colors ${
                    tokenGated
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  On
                </button>
                <button
                  type="button"
                  onClick={() => setTokenGated(false)}
                  className={`flex-1 rounded-full px-3 py-2 text-sm transition-colors ${
                    !tokenGated
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Off
                </button>
              </div>
            </div>

            {tokenGated && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Token Type
                  </label>
                  <div className="inline-flex w-44 rounded-full bg-gray-100 p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setTokenType('NFT');
                        setSelectedToken('');
                      }}
                      className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${
                        tokenType === 'NFT'
                          ? 'bg-white text-gray-900 shadow'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      NFT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTokenType('Token');
                        setSelectedToken('');
                      }}
                      className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${
                        tokenType === 'Token'
                          ? 'bg-white text-gray-900 shadow'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Token
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Select {tokenType}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedToken}
                      onChange={(event) =>
                        setSelectedToken(event.target.value)
                      }
                      disabled={
                        !solanaWalletAddress ||
                        tokensLoading ||
                        nftsLoading ||
                        tokenOptions.length === 0
                      }
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      <option value="">
                        {!solanaWalletAddress
                          ? 'Connect a Solana wallet first'
                          : tokenType === 'NFT' && nftsLoading
                            ? 'Loading NFTs...'
                            : tokenType === 'Token' && tokensLoading
                              ? 'Loading tokens...'
                              : tokenOptions.length === 0
                                ? `No Solana ${
                                    tokenType === 'NFT'
                                      ? 'NFTs'
                                      : 'tokens'
                                  } found`
                                : `Select a ${tokenType.toLowerCase()}...`}
                      </option>
                      {tokenOptions.map((asset) => (
                        <option key={asset.value} value={asset.value}>
                          {asset.symbol
                            ? `${asset.label} (${asset.symbol})`
                            : asset.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-700"
                    />
                  </div>

                  {(tokensError || nftsError) && (
                    <p className="mt-2 text-xs text-red-500">
                      Failed to load wallet assets. Please try again.
                    </p>
                  )}

                  {selectedGateAsset && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                      {selectedGateAsset.image ? (
                        <Image
                          src={selectedGateAsset.image}
                          alt={selectedGateAsset.label}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs text-white">
                          {selectedGateAsset.label
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900">
                          {selectedGateAsset.label}
                        </div>
                        <div className="truncate text-xs text-gray-500">
                          {selectedGateAsset.value}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin Management */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Admins
                </h4>
                <p className="mt-1 text-xs text-gray-500">
                  Promote members or dismiss existing admins.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageAdmins(true)}
                className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
              >
                Manage
              </button>
            </div>
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

      {showManageAdmins && (
        <ManageAdminsModal
          group={group}
          socket={socket}
          currentUser={currentUser}
          onClose={() => setShowManageAdmins(false)}
          onSuccess={onSuccess}
        />
      )}
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
      'delete_group',
      { groupId: group._id },
      (response: SocketResponse) => {
        if (response?.success) {
          toast.success('Group deleted successfully', {
            position: 'top-right',
          });
          onClose();
          onDeleted?.();
        } else {
          toast.error(
            `Failed to delete group: ${
              response?.error || 'Unknown error'
            }`,
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
