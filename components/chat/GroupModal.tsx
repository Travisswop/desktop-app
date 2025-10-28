"use client";
import { useState, useEffect } from "react";
import CustomModal from "../modal/CustomModal";
import { Button } from "../ui/button";
import { FaTimes } from "react-icons/fa";
import { LiaTimesCircle } from "react-icons/lia";
import Image from "next/image";
import isUrl from "@/lib/isUrl";

export default function GroupModal({
  isOpen,
  onClose,
  socket,
  currentUser,
  onGroupCreated,
}) {
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  console.log("searchResultsInGroup", searchResults);

  // 🔍 Search users with debounce
  useEffect(() => {
    if (searchQuery.trim() && socket) {
      const timeoutId = setTimeout(() => {
        socket.emit(
          "search_users",
          {
            query: searchQuery,
            limit: 10,
            forGroupCreation: true,
          },
          (response) => {
            if (response?.success) {
              setSearchResults(response.users || []);
            }
          }
        );
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, socket]);

  // 🧩 Select/deselect members
  const toggleMemberSelection = (user) => {
    setSelectedMembers((prev) =>
      prev.some((m) => m._id === user._id)
        ? prev.filter((m) => m._id !== user._id)
        : [...prev, user]
    );
  };

  // 🚀 Create group
  const handleCreateGroup = () => {
    if (!groupName.trim() || !socket) return;

    const groupData = {
      name: groupName,
      description: groupDescription,
      isPublic: isPublic,
      members: selectedMembers.map((m) => m._id),
    };

    socket.emit("create_group", groupData, (response) => {
      if (response?.success) {
        onGroupCreated?.(response.group);
        onClose?.();
      } else {
        alert(`Failed to create group: ${response?.error}`);
      }
    });
  };

  // 🔄 Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setGroupName("");
      setGroupDescription("");
      setIsPublic(false);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedMembers([]);
    }
  }, [isOpen]);

  return (
    <CustomModal
      isOpen={isOpen}
      onCloseModal={onClose}
      title={step === 1 ? "Create New Group" : "Add Members"}
      width="max-w-md"
    >
      <div className="p-6 space-y-5">
        {step === 1 ? (
          <>
            {/* Step 1: Group Info */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-whatsapp-input-bg text-whatsapp-text-primary px-3 py-2 rounded border border-whatsapp-border focus:outline-none focus:border-whatsapp-green"
                placeholder="Enter group name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="w-full bg-whatsapp-input-bg text-whatsapp-text-primary px-3 py-2 rounded border border-whatsapp-border focus:outline-none focus:border-whatsapp-green resize-none"
                placeholder="Enter group description (optional)"
                rows="3"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="isPublic" className="text-sm">
                Make this group public
              </label>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: Add Members */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Add Members
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-whatsapp-input-bg text-whatsapp-text-primary px-3 py-2 rounded border border-whatsapp-border focus:outline-none focus:border-whatsapp-green"
                  placeholder="Search users..."
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      // setShowSearchResults(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <LiaTimesCircle size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Selected Members
                </label>
                <div className="flex flex-wrap gap-2 ">
                  {selectedMembers.map((member) => (
                    <div
                      key={member._id}
                      className="bg-whatsapp-green text-black px-3 py-1 rounded-full text-sm flex items-center gap-2 bg-gray-100"
                    >
                      <p>{member.name}</p>
                      <button
                        onClick={() => toggleMemberSelection(member)}
                        className="hover:text-red-200"
                      >
                        <FaTimes size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Search Results
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => toggleMemberSelection(user)}
                      className={`p-3 rounded border cursor-pointer transition-colors ${
                        selectedMembers.some((m) => m._id === user._id)
                          ? "bg-whatsapp-green bg-opacity-20 border-whatsapp-green"
                          : "bg-whatsapp-input-bg border-whatsapp-border hover:bg-whatsapp-hover"
                      }`}
                    >
                      <div className="flex items-center gap-3">
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
                          <div className="text-xs text-whatsapp-text-secondary">
                            {user.ens || user.microsite.ens || ""}
                          </div>
                        </div>
                        {selectedMembers.some((m) => m._id === user._id) && (
                          <div className="ml-auto text-green-700">✓</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-whatsapp-border px-6 py-4 flex justify-between bg-white">
        {step === 1 ? (
          <>
            <Button
              onClick={onClose}
              variant={"outline"}
              className="px-4 py-2 rounded border border-whatsapp-border hover:bg-whatsapp-hover"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!groupName.trim()}
              className="px-4 py-2 disabled:opacity-50"
            >
              Next
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded border border-whatsapp-border hover:bg-whatsapp-hover"
            >
              Back
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim()}
              className="px-4 py-2 disabled:opacity-50"
            >
              Create Group
            </Button>
          </>
        )}
      </div>
    </CustomModal>
  );
}
