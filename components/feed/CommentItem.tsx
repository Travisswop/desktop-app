"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { FiMessageCircle } from "react-icons/fi";
import isUrl from "@/lib/isUrl";
import CommentInput from "./CommentInput";
import Cookies from "js-cookie";

dayjs.extend(relativeTime);

interface PostContent {
  type: "image" | "gif" | "video";
  src: string;
  _id?: string;
}

export interface Comment {
  _id: string;
  postId: string;
  parentCommentId?: string | null;
  title?: string | null;
  post_content?: PostContent[];
  likeCount: number;
  replyCount: number;
  isLiked?: boolean;
  createdAt: string;
  userId: string;
  smartsiteId?: {
    _id: string;
    name: string;
    profilePic: string;
    ens: string;
  };
  smartsiteUserName?: string;
  smartsiteEnsName?: string;
  smartsiteProfilePic?: string;
}

interface CommentItemProps {
  comment: Comment;
  userId: string;
  postId: string;
  isLast?: boolean; // controls thread line extension
}

const REPLIES_LIMIT = 5;

export default function CommentItem({
  comment,
  userId,
  postId,
  isLast = false,
}: CommentItemProps) {
  const accessToken = Cookies.get("access-token") || "";

  const [isLiked, setIsLiked] = useState(comment.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(comment.likeCount ?? 0);
  const [replyCount, setReplyCount] = useState(comment.replyCount ?? 0);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [repliesPage, setRepliesPage] = useState(1);
  const [repliesTotalPages, setRepliesTotalPages] = useState(1);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [latestReplyCount, setLatestReplyCount] = useState(replyCount);
  const likePending = useRef(false);

  const profilePic =
    comment.smartsiteId?.profilePic || comment.smartsiteProfilePic;
  const userName =
    comment.smartsiteId?.name || comment.smartsiteUserName || "Anonymous";
  const ensName = comment.smartsiteId?.ens || comment.smartsiteEnsName || "";

  // Thread line should extend when we have open reply input or replies shown
  const hasChildren = showReplyInput || showReplies;

  // ── Like ───────────────────────────────────────────────────────────────────
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likePending.current || !userId) return;
    likePending.current = true;

    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((p) => (wasLiked ? p - 1 : p + 1));

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/comment/${comment._id}/like`,
        {
          method: wasLiked ? "DELETE" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } catch {
      setIsLiked(wasLiked);
      setLikeCount((p) => (wasLiked ? p + 1 : p - 1));
    } finally {
      likePending.current = false;
    }
  };

  // ── Load replies ───────────────────────────────────────────────────────────
  const loadReplies = async (page: number) => {
    if (repliesLoading) return;
    setRepliesLoading(true);
    try {
      const params = new URLSearchParams({
        postId,
        page: String(page),
        limit: String(REPLIES_LIMIT),
        sort: "latest",
        ...(userId ? { userId } : {}),
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/${comment._id}/replies?${params}`,
        {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {},
        },
      );
      const json = await res.json();
      const fetched: Comment[] = json?.comments || [];

      setReplies((prev) => (page === 1 ? fetched : [...prev, ...fetched]));
      setRepliesPage(page);
      setRepliesTotalPages(json?.totalPages ?? 1);
    } catch (err) {
      console.error("Failed to load replies", err);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleToggleReplies = () => {
    const next = !showReplies;
    setShowReplies(next);
    if (next && replies.length === 0 && replyCount > 0) loadReplies(1);
  };

  // ── New reply ──────────────────────────────────────────────────────────────
  const handleReplySuccess = (newReply: Comment | null) => {
    if (newReply) setReplies((prev) => [newReply, ...prev]);
    setLatestReplyCount((p) => p + 1);
    setReplyCount((p) => p + 1);
    setShowReplies(true);
    setShowReplyInput(false);
  };

  return (
    <div className="flex gap-3 px-4">
      {/* ── Left column: avatar + thread line ─────────────────────────────── */}
      <div className="flex flex-col items-center shrink-0 w-10">
        <Link href={ensName ? `/sp/${ensName}` : "#"} className="shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 ring-[1.5px] ring-white">
            {profilePic ? (
              <Image
                src={
                  isUrl(profilePic)
                    ? profilePic
                    : `/images/user_avator/${profilePic}@3x.png`
                }
                alt={userName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-sm font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {/* Thread line — continuous vertical bar */}
        {/* {!isLast || hasChildren ? (
          <div className="w-0.5 flex-1 mt-1 bg-gray-200 min-h-[20px]" />
        ) : null} */}
      </div>

      {/* ── Right column: all content ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0 pb-1">
        {/* Header */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <p className="font-bold text-[15px] text-gray-900 ">{userName}</p>
          <span className="text-[14px] text-gray-500">·</span>
          {ensName && (
            <span className="text-[14px] text-gray-500">{ensName}</span>
          )}
          <span className="text-[14px] text-gray-500">·</span>
          <span className="text-[14px] text-gray-500">
            {dayjs(comment.createdAt).fromNow()}
          </span>
        </div>

        {/* Text body */}
        {comment.title && (
          <p className="text-[15px] text-gray-900 leading-normal mt-0.5 whitespace-pre-wrap break-words">
            {comment.title}
          </p>
        )}

        {/* Media grid — exactly like X */}
        {comment.post_content && comment.post_content.length > 0 && (
          <div
            className={`mt-2 rounded-2xl overflow-hidden grid gap-0.5 ${
              comment.post_content.length === 1
                ? "grid-cols-1"
                : comment.post_content.length === 2
                  ? "grid-cols-2"
                  : comment.post_content.length === 3
                    ? "grid-cols-2"
                    : "grid-cols-2"
            }`}
            style={{ maxHeight: 280 }}
          >
            {comment.post_content.slice(0, 4).map((item, i) => {
              const isFirst3 = comment.post_content!.length === 3 && i === 0;
              return (
                <div
                  key={i}
                  className={`relative overflow-hidden bg-gray-100 ${isFirst3 ? "row-span-2" : ""}`}
                  style={{
                    aspectRatio:
                      comment.post_content!.length === 1 ? "16/9" : "1/1",
                  }}
                >
                  {item.type === "video" ? (
                    <video
                      src={item.src}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={item.src}
                      alt=""
                      fill
                      className="object-cover hover:opacity-90 transition-opacity cursor-pointer"
                      sizes="240px"
                    />
                  )}
                  {i === 3 && comment.post_content!.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        +{comment.post_content!.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Action row ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-5 mt-2 -ml-1.5">
          {/* Reply */}
          <button
            onClick={() => setShowReplyInput((p) => !p)}
            className="group flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors"
          >
            <span className="p-1.5 rounded-full group-hover:bg-blue-50 transition-colors">
              <FiMessageCircle size={16} />
            </span>
            {replyCount > 0 && (
              <span className="text-[13px] font-medium">{replyCount}</span>
            )}
          </button>

          {/* Like */}
          <button
            onClick={handleLike}
            disabled={!userId}
            className={`group flex items-center gap-1.5 transition-colors ${
              isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
            }`}
          >
            <span
              className={`p-1.5 rounded-full transition-colors ${
                isLiked ? "bg-red-50" : "group-hover:bg-red-50"
              }`}
            >
              {isLiked ? (
                <IoMdHeart
                  size={16}
                  className="animate-[heartbeat_0.3s_ease-out]"
                />
              ) : (
                <IoMdHeartEmpty size={16} />
              )}
            </span>
            {likeCount > 0 && (
              <span className="text-[13px] font-medium">{likeCount}</span>
            )}
          </button>
        </div>

        {/* ── Inline reply input ────────────────────────────────────────────── */}
        {showReplyInput && (
          <div className="mt-3 flex gap-3">
            {/* tiny thread stub */}
            <div className="w-0.5 bg-gray-200 self-stretch ml-[19px] -mr-[27px]" />
            <div className="flex-1 rounded-2xl border border-gray-200 px-3 py-2 focus-within:border-blue-300 transition-colors bg-white">
              <CommentInput
                postId={postId}
                accessToken={accessToken}
                latestCommentCount={latestReplyCount}
                setLatestCommentCount={setLatestReplyCount}
                onCommentSubmitted={handleReplySuccess}
                parentCommentId={comment._id}
                placeholder={`Reply to @${ensName || userName}…`}
                autoFocus
                compact
                onCancel={() => setShowReplyInput(false)}
              />
            </div>
          </div>
        )}

        {/* ── "N replies" toggle — X.com style ─────────────────────────────── */}
        {replyCount > 0 && (
          <button
            onClick={handleToggleReplies}
            className="mt-3 flex items-center gap-2 text-blue-500 hover:text-blue-600 text-[14px] font-medium transition-colors group"
          >
            <span className="w-10 h-px bg-gray-200 group-hover:bg-blue-200 transition-colors" />
            {repliesLoading && replies.length === 0 ? (
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-400 rounded-full animate-spin" />
                Loading
              </span>
            ) : showReplies ? (
              "Hide replies"
            ) : (
              `Show ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`
            )}
          </button>
        )}

        {/* ── Nested replies ────────────────────────────────────────────────── */}
        {showReplies && (
          <div className="mt-1 -ml-4 -mr-0">
            {repliesLoading && replies.length === 0 ? (
              <div className="flex flex-col gap-3 px-4 py-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 pt-1 flex flex-col gap-2">
                      <div className="h-3 w-28 bg-gray-200 rounded-full" />
                      <div className="h-3 w-3/4 bg-gray-200 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              replies.map((reply, idx) => (
                <CommentItem
                  key={reply._id}
                  comment={reply}
                  userId={userId}
                  postId={postId}
                  isLast={
                    idx === replies.length - 1 &&
                    repliesPage >= repliesTotalPages
                  }
                />
              ))
            )}

            {/* Load more replies */}
            {repliesPage < repliesTotalPages && !repliesLoading && (
              <button
                onClick={() => loadReplies(repliesPage + 1)}
                className="ml-4 mb-2 flex items-center gap-2 text-blue-500 hover:text-blue-600 text-[14px] font-medium transition-colors group"
              >
                <span className="w-6 h-px bg-gray-200 group-hover:bg-blue-200 transition-colors" />
                Load more replies
              </button>
            )}

            {repliesLoading && replies.length > 0 && (
              <div className="flex justify-center py-2">
                <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
