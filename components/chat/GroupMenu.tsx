// app/components/GroupMenu.tsx
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import isUrl from '@/lib/isUrl';
import toast from 'react-hot-toast';
import { useUser } from '@/lib/UserContext';
import { ChevronDown, Loader } from 'lucide-react';
import { useMultiChainTokenData } from '@/lib/hooks/useToken';
import { useNFT } from '@/lib/hooks/useNFT';

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
  participantUser: User;
  role?: string;
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
  createdBy?: string | User;
}

interface GroupMenuProps {
  group: Group;
  socket: any;
  currentUser: string;
  onGroupUpdate?: () => void;
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

const getUserId = (user?: string | User) =>
  typeof user === 'string' ? user : user?._id;

const getParticipantUser = (
  participant: Participant | RawParticipant,
) =>
  participant.participantUser ||
  (participant as RawParticipant).userId;

const isGroupAdmin = (participant?: Participant) =>
  participant?.role === 'admin' ||
  participant?.permissions?.includes('manage_members');

const isGroupCreator = (group: Group, userId?: string) =>
  Boolean(userId && getUserId(group.createdBy) === userId);

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

  const menuItems = [
    ...(canManageGroup
      ? [
          {
            label: '👥 Add Member',
            action: () => {
              setActiveModal('addMember');
              closeMenu();
            },
            color: 'default',
          },
          {
            label: '👤 Remove Member',
            action: () => {
              setActiveModal('removeMember');
              closeMenu();
            },
            color: 'default',
          },
          // {
          //   label: '⭐ Manage Admins',
          //   action: () => {
          //     setActiveModal('manageAdmins');
          //     closeMenu();
          //   },
          //   color: 'default',
          // },
          {
            label: '✏️ Edit Group',
            action: () => {
              setActiveModal('editGroup');
              closeMenu();
            },
            color: 'default',
          },
        ]
      : []),
    {
      label: '🚪 Leave Group',
      action: () => {
        setActiveModal('leaveGroup');
        closeMenu();
      },
      color: 'warning',
    },
    ...(canDeleteGroup
      ? [
          {
            label: '🗑️ Delete Group',
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
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-xl font-bold"
      >
        ⋮
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={closeMenu} />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.action}
                className={`w-full text-left px-4 py-3 border-b border-gray-200 last:border-b-0 transition-colors ${
                  item.color === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : item.color === 'warning'
                      ? 'text-orange-600 hover:bg-orange-50'
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
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
          currentUser={currentUser}
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
          onClose={closeModal}
          onSuccess={onGroupUpdate}
          onLeaveGroup={onLeaveGroup}
        />
      )}

      {activeModal === 'deleteGroup' && (
        <DeleteGroupModal
          group={group}
          socket={socket}
          onClose={closeModal}
          onSuccess={onGroupUpdate}
        />
      )}
    </div>
  );
}

// ==================== ADD MEMBER MODAL ====================

function AddMemberModal({
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(
    null,
  );

  // const { toast } = useToast();

  const searchUsers = useCallback(
    (query: string) => {
      if (!query.trim() || !socket) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      socket.emit(
        'search_users',
        { query, limit: 10, forGroupCreation: true },
        (response: SearchResponse) => {
          if (response.success) {
            const users = response.results || response.users || [];
            // Filter out users already in the group
            const existingUserIds =
              group.participants?.map(
                (participant) => getParticipantUser(participant)._id,
              ) || [];
            const filteredUsers = users.filter(
              (user) => !existingUserIds.includes(user._id),
            );
            setSearchResults(filteredUsers);
          }
          setIsSearching(false);
        },
      );
    },
    [socket, group.participants],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleAddMember = (userId: string, displayName: string) => {
    // console.log("hit add member");

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
        if (response.success) {
          toast.success(`${displayName} added successfully!`, {
            position: 'top-right',
          });

          setSearchQuery('');
          setSearchResults([]);
          onSuccess?.();
          onClose();
        } else {
          toast.error(
            `Failed to add ${displayName}: ${response.error}`,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Add Member</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Group: {group.name}
          </p>
        </div>

        {/* Search */}
        <div className="p-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search username, ENS, or name..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              🔍
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isSearching ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700 mx-auto"></div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery
                ? 'No users found'
                : 'Start typing to search'}
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {user.profilePic ? (
                      <Image
                        src={
                          isUrl(user.profilePic)
                            ? user.profilePic
                            : `/images/user_avator/${user.profilePic}@3x.png`
                        }
                        alt={user.name}
                        width={120}
                        height={120}
                        className="rounded-full w-10 h-10"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">
                        {user.ens || user.username || user.email}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleAddMember(
                        user._id,
                        user.displayName || user.name || 'User',
                      )
                    }
                    disabled={addingUserId === user._id}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
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
  onSuccess?: () => void;
}) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(
    null,
  );
  const [confirmingUser, setConfirmingUser] = useState<User | null>(
    null,
  );

  // Filter out current user and group creator
  const removableMembers =
    group.participants?.filter((participant) => {
      const participantUser = getParticipantUser(participant);

      return (
        participantUser._id !== currentUser &&
        !isGroupCreator(group, participantUser._id)
      );
    }) || [];

  const confirmRemoveMember = (user: User) => {
    setConfirmingUser(user);
  };

  const handleConfirmRemove = () => {
    if (!confirmingUser) return;
    const participantUser = confirmingUser;
    setRemovingUserId(participantUser._id);

    socket.emit(
      'remove_group_member',
      {
        groupId: group._id,
        userIdToRemove: participantUser._id,
      },
      (response: SocketResponse) => {
        if (response.success) {
          toast.success(
            `${participantUser.name} removed successfully!`,
            {
              position: 'top-right',
            },
          );
          onSuccess?.();
          setConfirmingUser(null);
          onClose();
        } else {
          toast.error(
            `Failed to remove ${participantUser.name}: ${response.error}`,
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Remove Member</h3>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Group: {group.name}
            </p>
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-6">
            {removableMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No members to remove (you cannot remove yourself)
              </div>
            ) : (
              <div className="space-y-2">
                {removableMembers.map((participant) => {
                  const participantUser =
                    getParticipantUser(participant);
                  return (
                    <div
                      key={participantUser._id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
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
                          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold">
                            {participantUser.name
                              ?.charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">
                            {participantUser.name}
                            {isGroupAdmin(participant) && (
                              <span className="ml-2 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {participantUser.username ||
                              participantUser.ens ||
                              ''}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          confirmRemoveMember(participantUser)
                        }
                        disabled={
                          removingUserId === participantUser._id
                        }
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-3 text-red-600">
              ⚠️ Remove Member
            </h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to remove{' '}
              <strong>{confirmingUser.name}</strong> from the group{' '}
              <strong>{group.name}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmingUser(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                No
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={removingUserId === confirmingUser._id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
  onSuccess?: () => void;
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
        alert('Photo must be smaller than 5MB');
        return;
      }
      setGroupPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove the group photos?'))
      return;

    try {
      setIsRemovingPhoto(true);
      const response = await fetch(
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
      console.log('data response', data);

      if (data.success) {
        setPhotoPreview(null);
        toast.success(`Group photo removed successfully!`, {
          position: 'top-right',
        });
        onSuccess?.();
        setIsRemovingPhoto(false);
      } else {
        toast.error(`Failed to remove photo: ${data.message}`, {
          position: 'top-right',
        });
        setIsRemovingPhoto(false);
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Error removing group photo', {
        position: 'top-right',
      });
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
        const response = await fetch(
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

        const response = await fetch(
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Edit Group</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Group Photo */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Group Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {photoPreview ? (
                  <Image
                    src={photoPreview}
                    alt="Group"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
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
                  onClick={() =>
                    document.getElementById('photoInput')?.click()
                  }
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  📷 Choose Photo
                </button>
                {photoPreview && (
                  <button
                    onClick={handleRemovePhoto}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {isRemovingPhoto ? (
                      <Loader className="w-6 h-auto animate-spin mx-auto text-white" />
                    ) : (
                      '🗑️ Remove Photo'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={100}
              placeholder="Enter group name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Group Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              maxLength={500}
              placeholder="Add a group description"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
  onClose,
  onSuccess,
  onLeaveGroup,
}: {
  group: Group;
  onClose: () => void;
  onSuccess?: () => void;
  onLeaveGroup?: () => void;
}) {
  const [isLeaving, setIsLeaving] = useState(false);

  const { accessToken } = useUser();

  const handleLeave = async () => {
    setIsLeaving(true);

    try {
      const response = await fetch(
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
      console.log('data response', data);
      if (data.success) {
        toast.success('Left group successfully', {
          position: 'top-right',
        });
        onSuccess?.();
        onLeaveGroup?.();
        onClose();
      } else {
        toast.error(`Failed to leave group: ${data.message}`, {
          position: 'top-right',
        });
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-orange-600">
          🚪 Leave Group
        </h3>
        <p className="text-gray-700 mb-6">
          Are you sure you want to leave the group{' '}
          <strong>{group.name}</strong>
          ?
          <br />
          <br />
          You will no longer receive messages from this group and will
          need to be re-added by an admin to join again.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleLeave}
            disabled={isLeaving}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
  onSuccess,
}: {
  group: Group;
  socket: any;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);

    socket.emit(
      'delete_group',
      { groupId: group._id },
      (response: SocketResponse) => {
        if (response.success) {
          toast.success('Group deleted successfully', {
            position: 'top-right',
          });
          onSuccess?.();
          onClose();
        } else {
          toast.error(`Failed to delete group: ${response.error}`, {
            position: 'top-right',
          });
        }
        setIsDeleting(false);
      },
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-red-600">
          ⚠️ Delete Group
        </h3>
        <p className="text-gray-700 mb-6">
          Are you sure you want to delete the group{' '}
          <strong>{group.name}</strong>?
          <br />
          <br />
          <strong className="text-red-600">
            This action cannot be undone.
          </strong>{' '}
          All messages and group data will be permanently deleted.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
