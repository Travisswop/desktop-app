"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader } from "lucide-react";
import { FaRegTimesCircle } from "react-icons/fa";
import toast from "react-hot-toast";
import { logger } from "ethers5";

import { postComment } from "@/actions/postFeed";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import { useUser } from "@/lib/UserContext";
import { useCommentContentStore } from "@/zustandStore/CommentImgContent";
import { useModalStore } from "@/zustandStore/modalstore";
import { formatEns } from "@/lib/formatEnsName";
import isUrl from "@/lib/isUrl";

import CommentImagePicker from "./SelectImage";
import CommentGifPickerContent from "./GifPicker";
import CommentEmoji from "../CommentEmoji";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentInputProps {
  postId: string;
  accessToken: string;
  latestCommentCount: number;
  setLatestCommentCount: (count: number | ((prev: number) => number)) => void;
  onCommentSubmitted?: (newTotalCommentCount: number) => void;
  parentCommentId?: string | null;
  placeholder?: string;
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

const MAX_LENGTH = 280;
const MENTION_MIN_CHARS = 2;
const MENTION_DEBOUNCE_MS = 250;
const MENTION_PAGE_LIMIT = 8;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommentInput({
  postId,
  accessToken,
  latestCommentCount,
  setLatestCommentCount,
  onCommentSubmitted,
  parentCommentId = null,
  placeholder = "Post your reply...",
}: CommentInputProps) {
  const { user } = useUser() as { user: any };
  const { triggerFeedRefetch } = useModalStore();
  const { postContent, setPostContent, removeContent } =
    useCommentContentStore();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [commentText, setCommentText] = useState("");
  const [charError, setCharError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // ── Mention state ───────────────────────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Mention: detect @query from caret position ──────────────────────────────
  const detectMention = (value: string, cursorPos: number) => {
    const textUpToCursor = value.slice(0, cursorPos);
    const match = textUpToCursor.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      closeMention();
    }
  };

  const closeMention = () => {
    setMentionQuery(null);
    setMentionResults([]);
  };

  // ── Mention: debounced API search ───────────────────────────────────────────
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
          userId: user?._id,
          filter: "following",
          page: "1",
          limit: String(MENTION_PAGE_LIMIT),
        });

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user/search?${params}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
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
  }, [mentionQuery, user?._id, accessToken]);

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

  // ── Mention: insert chosen user ─────────────────────────────────────────────
  const insertMention = (selectedUser: MentionUser) => {
    const ens =
      selectedUser.ens || selectedUser.username || selectedUser.name || "";
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart ?? commentText.length;
    const before = commentText
      .slice(0, cursorPos)
      .replace(/@(\w*)$/, `@${ens} `);
    const after = commentText.slice(cursorPos);

    setCommentText(before + after);
    closeMention();

    // Restore focus and move caret to end of inserted mention
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(before.length, before.length);
    });
  };

  // ── Mention: keyboard navigation ────────────────────────────────────────────
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

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCharError(
      value.length > MAX_LENGTH
        ? `** Comment cannot exceed ${MAX_LENGTH} characters.`
        : "",
    );
    setCommentText(value);
    detectMention(value, e.target.selectionStart ?? value.length);
  };

  const handleEmojiSelect = (emoji: string) => {
    setCommentText((prev) => prev + emoji);
  };

  const handleSubmit = async () => {
    const isEmpty = !commentText.trim() && postContent.length === 0;
    if (
      commentText.length > MAX_LENGTH ||
      isEmpty ||
      isLoading ||
      !accessToken
    ) {
      toast.error("Cannot post empty comment or exceeds character limit.");
      return;
    }

    setIsLoading(true);
    try {
      const uploadedMedia = await Promise.all(
        postContent.map(async (item) => ({
          type: item.type,
          src: item.src.startsWith("data:image")
            ? await sendCloudinaryImage(item.src)
            : item.src,
        })),
      );

      await postComment(
        {
          postId,
          parentCommentId: parentCommentId || null,
          userId: user?._id,
          smartsiteId: user?.primaryMicrosite,
          title: commentText,
          post_content: uploadedMedia,
        },
        accessToken,
      );

      toast.success("Comment posted successfully!");
      triggerFeedRefetch();

      setPostContent([]);
      setCommentText("");
      const newTotal = latestCommentCount + 1;
      logger.info("New total comment count:", newTotal);
      setLatestCommentCount(newTotal);
      onCommentSubmitted?.(newTotal);
    } catch (err) {
      console.error("Failed to post comment:", err);
      toast.error("Failed to post comment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isOverLimit = commentText.length > MAX_LENGTH;
  const isEmpty = !commentText.trim() && postContent.length === 0;
  const showMentionDropdown =
    mentionQuery !== null && (mentionLoading || mentionResults.length > 0);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Textarea + mention dropdown */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          rows={3}
          className={`w-full resize-none rounded-lg bg-gray-100 p-3 text-sm transition-colors focus:outline-none ${
            isOverLimit
              ? "ring-1 ring-red-500 focus:ring-red-500"
              : "focus:ring-1 focus:ring-gray-300"
          }`}
          placeholder={placeholder}
          value={commentText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />

        {/* Mention dropdown — sits below the textarea, full width */}
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
                          className="object-cover"
                          sizes="32px"
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

      {/* Character error */}
      {charError && <p className="mt-1 text-xs text-red-500">{charError}</p>}

      {/* Media previews */}
      {postContent.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {postContent.map((item, index) => (
            <div key={index} className="relative">
              <Image
                src={item.src}
                alt="media preview"
                width={96}
                height={96}
                className="size-24 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removeContent(index)}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-white shadow"
              >
                <FaRegTimesCircle
                  size={16}
                  className="text-gray-600 hover:scale-105"
                />
              </button>
            </div>
          ))}
          {postContent.length < 4 && (
            <p className="self-end pb-1 text-xs text-gray-400">
              {postContent.length}/4 media
            </p>
          )}
        </div>
      )}

      {/* Toolbar + submit */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CommentImagePicker />
          <CommentGifPickerContent />
          <CommentEmoji
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            onEmojiSelect={handleEmojiSelect}
          />
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs ${isOverLimit ? "text-red-500" : "text-gray-400"}`}
          >
            {commentText.length}/{MAX_LENGTH}
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isOverLimit || isEmpty || isLoading || !accessToken}
            className="flex items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
          >
            {isLoading ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              "Reply"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
