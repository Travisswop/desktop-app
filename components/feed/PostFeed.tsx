"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

import { postFeed } from "@/actions/postFeed";
import { useUser } from "@/lib/UserContext";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import { sendCloudinaryVideo } from "@/lib/sendCloudinaryVideo";
import { useModalStore } from "@/zustandStore/modalstore";
import { formatEns } from "@/lib/formatEnsName";
import isUrl from "@/lib/isUrl";
import getSingleSmartsiteData from "@/actions/singleSmartsiteDataFetching";

import UserImageAvatar from "../util/Avatar";
import MediaPreview from "./MediaPreview";
import CreatePoll from "./CreatePoll";
import CustomModal from "../modal/CustomModal";
import { PrimaryButton } from "../ui/Button/PrimaryButton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostFeedProps {
  userId: string;
  primaryMicrositeImg: string;
  token: string;
}

interface MediaFile {
  type: "image" | "video" | "gif";
  src: string;
}

interface MintItem {
  _id: string;
  itemName: string;
  itemImageUrl: string;
  itemPrice: string;
}

interface MentionUser {
  _id: string;
  ens?: string;
  username?: string;
  name?: string;
  profilePic?: string;
  image?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_POST_LENGTH = 2000;
const MENTION_MIN_CHARS = 2;
const MENTION_DEBOUNCE_MS = 250;
const MENTION_PAGE_LIMIT = 8;

// ─── Component ────────────────────────────────────────────────────────────────

const PostFeed = ({ primaryMicrositeImg, userId, token }: PostFeedProps) => {
  const { user } = useUser() as { user: any };
  const router = useRouter();
  const { closeModal, triggerFeedRefetch } = useModalStore();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [postContent, setPostContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [charError, setCharError] = useState("");
  const [fileError, setFileError] = useState("");
  const [postLoading, setPostLoading] = useState(false);

  // ── Microsite state ─────────────────────────────────────────────────────────
  const [primaryMicrosite, setPrimaryMicrosite] = useState("");
  const [primaryMicrositeDetails, setPrimaryMicrositeDetails] =
    useState<any>(null);

  // ── Mint state ──────────────────────────────────────────────────────────────
  const [showMintModal, setShowMintModal] = useState(false);
  const [mintDataLoading, setMintDataLoading] = useState(false);
  const [mintData, setMintData] = useState<MintItem[]>([]);
  const [selectedMint, setSelectedMint] = useState<MintItem | null>(null);

  // ── Poll state ──────────────────────────────────────────────────────────────
  const [showPollModal, setShowPollModal] = useState(false);

  // ── Mention state ───────────────────────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    setPrimaryMicrosite(user.primaryMicrosite);
    const primary = user.microsites?.find((m: any) => m?.primary);
    setPrimaryMicrositeDetails(primary ?? null);
  }, [user]);

  useEffect(() => {
    if (!user?.primaryMicrosite) return;
    const fetchMintData = async () => {
      setMintDataLoading(true);
      try {
        const data = await getSingleSmartsiteData(user.primaryMicrosite, token);
        setMintData(data?.data?.info?.marketPlace ?? []);
      } catch {
        toast.error("Failed to load mint data.");
      } finally {
        setMintDataLoading(false);
      }
    };
    fetchMintData();
  }, [user?.primaryMicrosite, token]);

  useEffect(() => {
    if (fileError) toast.error(fileError);
  }, [fileError]);

  // ── Mention: debounced search ───────────────────────────────────────────────

  useEffect(() => {
    if (mentionQuery === null) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (mentionQuery.length < MENTION_MIN_CHARS) {
        setMentionResults([]);
        return;
      }
      try {
        setMentionLoading(true);
        const params = new URLSearchParams({
          q: mentionQuery,
          userId,
          filter: "following",
          page: "1",
          limit: String(MENTION_PAGE_LIMIT),
        });
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/search?${params}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const json = await res.json();
        setMentionResults(json?.data?.results ?? []);
        setMentionIndex(0);
      } catch (err) {
        console.error("Mention search error:", err);
      } finally {
        setMentionLoading(false);
      }
    }, MENTION_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [mentionQuery, userId, token]);

  // ── Mention: close on outside click ────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current?.contains(e.target as Node) ||
        textareaRef.current?.contains(e.target as Node)
      )
        return;
      closeMention();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Mention helpers ─────────────────────────────────────────────────────────

  const closeMention = () => {
    setMentionQuery(null);
    setMentionResults([]);
  };

  const detectMention = (value: string, cursorPos: number) => {
    const match = value.slice(0, cursorPos).match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      closeMention();
    }
  };

  const insertMention = (selectedUser: MentionUser) => {
    const ens =
      selectedUser.ens || selectedUser.username || selectedUser.name || "";
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart ?? postContent.length;
    const before = postContent
      .slice(0, cursorPos)
      .replace(/@(\w*)$/, `@${ens} `);
    const after = postContent.slice(cursorPos);

    setPostContent(before + after);
    closeMention();

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(before.length, before.length);
    });
  };

  // ── Textarea handlers ───────────────────────────────────────────────────────

  const handlePostChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCharError(
      value.length > MAX_POST_LENGTH
        ? `** Post cannot exceed ${MAX_POST_LENGTH} characters.`
        : "",
    );
    setPostContent(value);
    detectMention(value, e.target.selectionStart ?? value.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionResults.length) return;

    const actions: Record<string, () => void> = {
      ArrowDown: () => setMentionIndex((i) => (i + 1) % mentionResults.length),
      ArrowUp: () =>
        setMentionIndex(
          (i) => (i - 1 + mentionResults.length) % mentionResults.length,
        ),
      Enter: () => insertMention(mentionResults[mentionIndex]),
      Escape: closeMention,
    };

    if (actions[e.key]) {
      e.preventDefault();
      actions[e.key]();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setPostContent((prev) => prev + emoji);
  };

  // ── Submit handlers ─────────────────────────────────────────────────────────

  const handleFeedPosting = async () => {
    setPostLoading(true);
    try {
      const uploadedMedia = await Promise.all(
        mediaFiles.map(async (file) => {
          if (file.type === "image")
            return { type: "image", src: await sendCloudinaryImage(file.src) };
          if (file.type === "video")
            return { type: "video", src: await sendCloudinaryVideo(file.src) };
          return file;
        }),
      );

      const data = await postFeed(
        {
          smartsiteId: primaryMicrosite,
          userId,
          postType: "post",
          content: { title: postContent, post_content: uploadedMedia },
        },
        token,
      );

      if (data?.state === "success") {
        toast.success("You posted successfully!");
        setMediaFiles([]);
        setPostContent("");
        router.push("/");
        triggerFeedRefetch();
        closeModal();
      } else if (data?.state === "not-allowed") {
        toast.error("You are not allowed to create a feed post.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPostLoading(false);
    }
  };

  const handleMintFeedPosting = async () => {
    if (!selectedMint) return;
    setPostLoading(true);
    try {
      const data = await postFeed(
        {
          smartsiteId: primaryMicrosite,
          userId,
          postType: "minting",
          content: {
            title: selectedMint.itemName,
            type: "product",
            image: selectedMint.itemImageUrl,
            price: selectedMint.itemPrice,
          },
        },
        token,
      );

      if (data?.state === "success") {
        toast.success("You posted successfully!");
        setMediaFiles([]);
        setPostContent("");
        router.push("/");
        triggerFeedRefetch();
        closeModal();
      } else if (data?.state === "not-allowed") {
        toast.error("You are not allowed to create a feed post.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPostLoading(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const isOverLimit = postContent.length > MAX_POST_LENGTH;
  const isEmpty = !postContent.trim() && mediaFiles.length === 0;
  const isSubmitDisabled = postLoading || isEmpty || isOverLimit;
  const showMentionDropdown =
    mentionQuery !== null && (mentionLoading || mentionResults.length > 0);

  const avatarSrc = isUrl(primaryMicrositeImg)
    ? primaryMicrositeImg
    : `/images/user_avator/${primaryMicrositeImg}.png`;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative p-6 pt-2">
      {/* Loading overlay */}
      {postLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-white/70 backdrop-blur-sm">
          <Loader className="animate-spin text-gray-700" size={32} />
          <p className="text-sm font-medium text-gray-600">
            Publishing your post...
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* Author row */}
        <div className="flex items-start gap-2">
          <UserImageAvatar src={avatarSrc} />
          <div>
            <p className="font-medium">{primaryMicrositeDetails?.name}</p>
            <p className="text-sm text-gray-700">
              {formatEns(
                primaryMicrositeDetails?.ens ||
                  primaryMicrositeDetails?.ensData?.name,
              )}
            </p>
          </div>
        </div>

        {/* Textarea + mention dropdown */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            name="user-feed"
            id="user-feed"
            rows={4}
            className={`w-full resize-none rounded-lg bg-gray-100 p-3 focus:outline-none ${
              isOverLimit
                ? "ring-1 ring-red-500"
                : "focus:ring-1 focus:ring-gray-300"
            }`}
            placeholder="What's happening? Type @ to mention someone"
            value={postContent}
            onChange={handlePostChange}
            onKeyDown={handleKeyDown}
          />

          {/* Mention dropdown — snaps below textarea, no DOM measurement needed */}
          {showMentionDropdown && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-10 z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
            >
              {mentionLoading && mentionResults.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                  <Loader className="animate-spin" size={14} />
                  Searching...
                </div>
              ) : (
                mentionResults.map((u, idx) => {
                  const displayEns = u.ens || u.username || "";
                  const displayName = u.name || u.username || displayEns;
                  const avatar = u.profilePic || u.image || null;
                  const isActive = idx === mentionIndex;

                  return (
                    <button
                      key={u._id ?? idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // prevent textarea blur
                        insertMention(u);
                      }}
                      onMouseEnter={() => setMentionIndex(idx)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative size-8 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                        {avatar ? (
                          <Image
                            src={
                              isUrl(avatar)
                                ? avatar
                                : `/images/user_avator/${avatar}.png`
                            }
                            alt={displayName}
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-xs font-semibold uppercase text-gray-500">
                            {displayName?.[0] ?? "?"}
                          </span>
                        )}
                      </div>

                      {/* Name + ENS */}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {displayName}
                        </p>
                        {displayEns && displayEns !== displayName && (
                          <p className="truncate text-xs text-gray-400">
                            {formatEns(displayEns)}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {charError && <p className="text-sm text-red-500">{charError}</p>}

        <MediaPreview
          mediaFiles={mediaFiles}
          setMediaFiles={setMediaFiles}
          setFileError={setFileError}
          postContent={postContent}
          onEmojiSelect={handleEmojiSelect}
          onOpenPoll={() => setShowPollModal(true)}
          onOpenMint={() => setShowMintModal(true)}
        />

        <div className="mt-5 flex justify-center">
          <PrimaryButton
            className="w-[90%] py-2"
            disabled={isSubmitDisabled}
            onClick={handleFeedPosting}
          >
            {postLoading ? (
              <Loader className="animate-spin" size={26} />
            ) : (
              "Post"
            )}
          </PrimaryButton>
        </div>
      </div>

      {/* Poll modal */}
      {showPollModal && (
        <CustomModal
          isOpen={showPollModal}
          onCloseModal={setShowPollModal}
          title="Create Poll"
        >
          <CreatePoll setIsCreatePollModalOpen={setShowPollModal} />
        </CustomModal>
      )}

      {/* Mint modal */}
      {showMintModal && (
        <CustomModal
          isOpen={showMintModal}
          onCloseModal={setShowMintModal}
          title="Mint as NFT"
        >
          <div className="p-4">
            {mintDataLoading ? (
              <p className="flex items-center justify-center gap-2 py-20">
                Loading data <Loader className="animate-spin" size={26} />
              </p>
            ) : mintData.length === 0 ? (
              <p className="py-20 text-center">No Mint Available!</p>
            ) : (
              <div className="mb-6 space-y-3">
                {mintData.map((item) => {
                  const isSelected = item._id === selectedMint?._id;
                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedMint(item)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl p-4 transition-all duration-200 ${
                        isSelected
                          ? "-translate-y-2 mx-1 border border-gray-200 bg-white shadow-lg"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className="relative size-10 flex-shrink-0 overflow-hidden rounded-lg bg-orange-100">
                        <Image
                          src={item.itemImageUrl}
                          alt={item.itemName}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">
                          {item.itemName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.itemPrice}
                        </p>
                      </div>
                      <div
                        className={`flex size-6 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                          isSelected
                            ? "scale-100 bg-black opacity-100"
                            : "scale-75 bg-gray-200 opacity-0"
                        }`}
                      >
                        <span className="text-xs text-white">✓</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <PrimaryButton
              className="w-full py-3"
              disabled={!selectedMint || postLoading}
              onClick={handleMintFeedPosting}
            >
              Create{" "}
              {postLoading && <Loader className="animate-spin" size={26} />}
            </PrimaryButton>
          </div>
        </CustomModal>
      )}
    </div>
  );
};

export default PostFeed;
