// app/components/GroupMenu.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import isUrl from "@/lib/isUrl";
import toast from "react-hot-toast";

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
  userId: User;
  role?: string;
  joinedAt?: string;
}

interface GroupSettings {
  groupInfo?: {
    groupPicture?: string;
    description?: string;
  };
  isPublic?: boolean;
}

interface Group {
  _id: string;
  name: string;
  description?: string;
  participants?: Participant[];
  settings?: GroupSettings;
  createdBy?: string;
}

interface GroupMenuProps {
  group: Group;
  socket: any;
  currentUser: string;
  onGroupUpdate?: () => void;
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
  | "addMember"
  | "removeMember"
  | "editGroup"
  | "deleteGroup"
  | "leaveGroup";

// ==================== MAIN COMPONENT ====================

export default function GroupMenu({
  group,
  socket,
  currentUser,
  onGroupUpdate,
}: GroupMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const closeMenu = () => setIsOpen(false);
  const closeModal = () => setActiveModal(null);

  const menuItems = [
    {
      label: "👥 Add Member",
      action: () => {
        setActiveModal("addMember");
        closeMenu();
      },
      color: "default",
    },
    {
      label: "👤 Remove Member",
      action: () => {
        setActiveModal("removeMember");
        closeMenu();
      },
      color: "default",
    },
    {
      label: "✏️ Edit Group",
      action: () => {
        setActiveModal("editGroup");
        closeMenu();
      },
      color: "default",
    },
    {
      label: "🚪 Leave Group",
      action: () => {
        setActiveModal("leaveGroup");
        closeMenu();
      },
      color: "warning",
    },
    {
      label: "🗑️ Delete Group",
      action: () => {
        setActiveModal("deleteGroup");
        closeMenu();
      },
      color: "danger",
    },
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
                  item.color === "danger"
                    ? "text-red-600 hover:bg-red-50"
                    : item.color === "warning"
                    ? "text-orange-600 hover:bg-orange-50"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      {activeModal === "addMember" && (
        <AddMemberModal
          group={group}
          socket={socket}
          currentUser={currentUser}
          onClose={closeModal}
          onSuccess={onGroupUpdate}
        />
      )}

      {activeModal === "removeMember" && (
        <RemoveMemberModal
          group={group}
          socket={socket}
          currentUser={currentUser}
          onClose={closeModal}
          onSuccess={onGroupUpdate}
        />
      )}

      {activeModal === "editGroup" && (
        <EditGroupModal
          group={group}
          socket={socket}
          onClose={closeModal}
          onSuccess={onGroupUpdate}
        />
      )}

      {activeModal === "leaveGroup" && (
        <LeaveGroupModal
          group={group}
          onClose={closeModal}
          onSuccess={onGroupUpdate}
        />
      )}

      {activeModal === "deleteGroup" && (
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  // const { toast } = useToast();

  const searchUsers = useCallback(
    (query: string) => {
      if (!query.trim() || !socket) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      socket.emit(
        "search_users",
        { query, limit: 10, forGroupCreation: true },
        (response: SearchResponse) => {
          if (response.success) {
            const users = response.results || response.users || [];
            // Filter out users already in the group
            const existingUserIds =
              group.participants?.map((p) => p.userId._id) || [];
            const filteredUsers = users.filter(
              (user) => !existingUserIds.includes(user._id)
            );
            setSearchResults(filteredUsers);
          }
          setIsSearching(false);
        }
      );
    },
    [socket, group.participants]
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
      "add_group_member",
      {
        groupId: group._id,
        userIdToAdd: userId,
        role: "member",
      },
      (response: SocketResponse) => {
        if (response.success) {
          toast.success(`${displayName} added successfully!`, {
            position: "top-right",
          });

          setSearchQuery("");
          setSearchResults([]);
          onSuccess?.();
          onClose();
        } else {
          toast.error(`Failed to add ${displayName}: ${response.error}`, {
            position: "top-right",
          });
        }
        setAddingUserId(null);
      }
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
          <p className="text-sm text-gray-600 mt-1">Group: {group.name}</p>
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
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
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
              {searchQuery ? "No users found" : "Start typing to search"}
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
                        user.displayName || user.name || "User"
                      )
                    }
                    disabled={addingUserId === user._id}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    {addingUserId === user._id ? "Adding..." : "Add"}
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
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [confirmingUser, setConfirmingUser] = useState<User | null>(null);

  // Filter out current user (can't remove yourself)
  const removableMembers =
    group.participants?.filter((p) => p.userId._id !== currentUser) || [];

  const confirmRemoveMember = (user: User) => {
    setConfirmingUser(user);
  };

  const handleConfirmRemove = () => {
    if (!confirmingUser) return;
    const user = confirmingUser;
    setRemovingUserId(user._id);

    socket.emit(
      "remove_group_member",
      {
        groupId: group._id,
        userIdToRemove: user._id,
      },
      (response: SocketResponse) => {
        if (response.success) {
          toast.success(`${user.name} removed successfully!`, {
            position: "top-right",
          });
          onSuccess?.();
          setConfirmingUser(null);
          onClose();
        } else {
          toast.error(`Failed to remove ${user.name}: ${response.error}`, {
            position: "top-right",
          });
        }
        setRemovingUserId(null);
      }
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
            <p className="text-sm text-gray-600 mt-1">Group: {group.name}</p>
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
                  const user = participant.userId;
                  return (
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
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">
                            {user.username || user.ens || ""}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => confirmRemoveMember(user)}
                        disabled={removingUserId === user._id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                      >
                        {removingUserId === user._id ? "Removing..." : "Remove"}
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
              Are you sure you want to remove{" "}
              <strong>{confirmingUser.name}</strong> from the group{" "}
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
                  ? "Removing..."
                  : "Yes, Remove"}
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
  onSuccess?: () => void;
}) {
  const [groupName, setGroupName] = useState(group.name || "");
  const [groupDescription, setGroupDescription] = useState(
    group.description || ""
  );
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    group.settings?.groupInfo?.groupPicture || null
  );
  const [isSaving, setIsSaving] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Photo must be smaller than 5MB");
        return;
      }
      setGroupPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Are you sure you want to remove the group photo?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/group/${group._id}/photo`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setPhotoPreview(null);
        toast.success(`Group photo removed successfully!`, {
          position: "top-right",
        });
        onSuccess?.();
      } else {
        toast.error(`Failed to remove photo: ${data.message}`, {
          position: "top-right",
        });
      }
    } catch (error) {
      console.error("Error removing photo:", error);
      alert("Error removing group photo");
    }
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      alert("Group name is required");
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem("token");
      let hasChanges = false;

      // Update name and description
      if (
        groupName !== group.name ||
        groupDescription !== (group.description || "")
      ) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/group/${group._id}/info`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: groupName,
              description: groupDescription,
            }),
          }
        );

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || "Failed to update group info");
        }
        hasChanges = true;

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit("update_group_info", {
            groupId: group._id,
            name: groupName,
            description: groupDescription,
          });
        }
      }

      // Upload new photo
      if (groupPhoto) {
        const formData = new FormData();
        formData.append("groupPhoto", groupPhoto);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/group/${group._id}/photo`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || "Failed to upload photo");
        }
        hasChanges = true;
      }

      if (hasChanges) {
        alert("Group updated successfully!");
        onSuccess?.();
        onClose();
      } else {
        alert("No changes to save");
      }
    } catch (error: any) {
      console.error("Error updating group:", error);
      alert(`Error: ${error.message}`);
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
                  onClick={() => document.getElementById("photoInput")?.click()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  📷 Choose Photo
                </button>
                {photoPreview && (
                  <button
                    onClick={handleRemovePhoto}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    🗑️ Remove Photo
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
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== LEAVE GROUP MODAL ====================

function LeaveGroupModal({
  group,
  onClose,
  onSuccess,
}: {
  group: Group;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeave = async () => {
    setIsLeaving(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/group/${group._id}/leave`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        alert("Left group successfully");
        onSuccess?.();
        onClose();
      } else {
        alert(`Failed to leave group: ${data.message}`);
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      alert("Error leaving group");
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
          Are you sure you want to leave the group{" "}
          <strong>"{group.name}"</strong>?
          <br />
          <br />
          You will no longer receive messages from this group and will need to
          be re-added by an admin to join again.
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
            {isLeaving ? "Leaving..." : "Leave Group"}
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
      "delete_group",
      { groupId: group._id },
      (response: SocketResponse) => {
        if (response.success) {
          alert("Group deleted successfully");
          onSuccess?.();
          onClose();
        } else {
          alert(`Failed to delete group: ${response.error}`);
        }
        setIsDeleting(false);
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4 text-red-600">
          ⚠️ Delete Group
        </h3>
        <p className="text-gray-700 mb-6">
          Are you sure you want to delete the group{" "}
          <strong>"{group.name}"</strong>?
          <br />
          <br />
          <strong className="text-red-600">
            This action cannot be undone.
          </strong>{" "}
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
            {isDeleting ? "Deleting..." : "Delete Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
