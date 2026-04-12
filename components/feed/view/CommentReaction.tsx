"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  useDisclosure,
} from "@nextui-org/react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import { FiShare, FiMessageCircle } from "react-icons/fi";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { TbCopy, TbCopyCheckFilled } from "react-icons/tb";
import { BiEdit, BiRepost } from "react-icons/bi";
import { BsEmojiSmile } from "react-icons/bs";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import Image from "next/image";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import EmojiPicker from "emoji-picker-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { formatCountReaction } from "@/lib/formatFeedReactionCount";
import isUrl from "@/lib/isUrl";
import { deleteFeed, postFeed, postFeedLike } from "@/actions/postFeed";
import repostImg from "@/public/images/custom-icons/feed_repost.png";
import CommentInput from "../comment/CommentInput";
import { logger } from "ethers5";

dayjs.extend(relativeTime);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentReactionProps {
  /** The comment or reply _id */
  commentId: string;
  /** Root post _id — for share link anchor & CommentInput */
  postId: string;
  /** "comment" for top-level, "reply" for nested */
  targetType: "comment" | "reply";

  likeCount: number;
  replyCount: number;
  repostCount: number;
  isLiked?: boolean;

  /**
   * If the current user already reposted this comment, pass the repost's
   * feed post _id here so "Undo Repost" can delete it.
   */
  myRepostId?: string | null;

  /**
   * Snapshot of the comment being replied to / reposted — shown in modals
   */
  commentSnapshot?: {
    userName?: string;
    ensName?: string;
    profilePic?: string;
    title?: string;
    createdAt?: string;
  };

  /** Syncs like state back to the parent list */
  onLikeUpdate?: (
    commentId: string,
    updates: { likeCount: number; isLiked: boolean },
  ) => void;

  /** Called with the new reply object after a successful reply post */
  // onReplySuccess?: (newReply: any) => void;

  /** Called after a repost / undo-repost so parent can refresh its list */
  onRepostSuccess?: () => void;

  /** Controlled reply count — owned by parent so new replies show immediately */
  latestReplyCount: number;
  setLatestReplyCount: React.Dispatch<React.SetStateAction<number>>;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CommentReaction = memo(
  ({
    commentId,
    postId,
    targetType,
    likeCount: initialLikeCount,
    replyCount,
    repostCount,
    isLiked = false,
    myRepostId = null,
    commentSnapshot,
    onLikeUpdate,
    // onReplySuccess,
    onRepostSuccess,
    latestReplyCount,
    setLatestReplyCount,
  }: CommentReactionProps) => {
    // ── Local state ───────────────────────────────────────────────────────────
    const [liked, setLiked] = useState(isLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [animate, setAnimate] = useState(false);
    const [smartsiteId, setSmartsiteId] = useState("");
    const [primarySmartsiteData, setPrimarySmartsiteData] = useState<any>(null);
    const [accessToken, setAccessToken] = useState("");

    // Share popover
    const [isSharePopOpen, setIsSharePopOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Repost popover + quote modal
    const [isRepostPopOpen, setIsRepostPopOpen] = useState(false);
    const [quoteContent, setQuoteContent] = useState("");
    const [quoteContentError, setQuoteContentError] = useState("");
    const [repostLoading, setRepostLoading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    const likePending = useRef(false);
    const router = useRouter();
    const { user }: any = useUser();

    const {
      isOpen: isReplyModalOpen,
      onOpen: onReplyModalOpen,
      onOpenChange: onReplyModalChange,
    } = useDisclosure();

    const {
      isOpen: isQuoteModalOpen,
      onOpen: onQuoteModalOpen,
      onOpenChange: onQuoteModalChange,
    } = useDisclosure();

    // ── Bootstrap ─────────────────────────────────────────────────────────────

    useEffect(() => {
      const token = Cookies.get("access-token");
      if (token) setAccessToken(token);
    }, []);

    useEffect(() => {
      if (user?.primaryMicrosite) setSmartsiteId(user.primaryMicrosite);
    }, [user]);

    useEffect(() => {
      const primary = user?.microsites?.find(
        (s: any) => s._id === user.primaryMicrosite,
      );
      if (primary) setPrimarySmartsiteData(primary);
    }, [user?.microsites, user?.primaryMicrosite]);

    useEffect(() => {
      setLiked(isLiked);
    }, [isLiked]);
    useEffect(() => {
      setLikeCount(initialLikeCount);
    }, [initialLikeCount]);

    // Close emoji picker on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          emojiPickerRef.current &&
          !emojiPickerRef.current.contains(e.target as Node)
        ) {
          setShowEmojiPicker(false);
        }
      };
      if (showEmojiPicker) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [showEmojiPicker]);

    // ── Formatted counts ──────────────────────────────────────────────────────

    const formattedCounts = useMemo(
      () => ({
        likes: formatCountReaction(likeCount),
        replies: formatCountReaction(latestReplyCount),
        reposts: formatCountReaction(repostCount),
      }),
      [likeCount, latestReplyCount, repostCount],
    );

    // ── Like ──────────────────────────────────────────────────────────────────

    // const handleLike = async () => {
    //   if (!accessToken) return toast.error("Please Login to Continue.");
    //   if (likePending.current) return;
    //   likePending.current = true;

    //   const wasLiked = liked;
    //   const prevCount = likeCount;
    //   const newLiked = !wasLiked;
    //   const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);

    //   setLiked(newLiked);
    //   setLikeCount(newCount);

    //   if (newLiked) {
    //     setAnimate(true);
    //     setTimeout(() => setAnimate(false), 500);
    //   }

    //   try {
    //     await fetch(
    //       `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/comment/${commentId}/like`,
    //       {
    //         method: wasLiked ? "DELETE" : "POST",
    //         headers: {
    //           "Content-Type": "application/json",
    //           Authorization: `Bearer ${accessToken}`,
    //         },
    //         body: JSON.stringify({ smartsiteId, targetType }),
    //       },
    //     );
    //     onLikeUpdate?.(commentId, { likeCount: newCount, isLiked: newLiked });
    //   } catch {
    //     setLiked(wasLiked);
    //     setLikeCount(prevCount);
    //     toast.error("Failed to update like status.");
    //   } finally {
    //     likePending.current = false;
    //   }
    // };

    const handleLike = async () => {
      if (!accessToken) {
        return toast.error("Please Login to Continue.");
      }

      const originalLiked = liked;
      const originalLikeCount = likeCount;

      // Optimistically update the like state
      const newLikedState = !liked;
      const newLikeCountState = newLikedState
        ? likeCount + 1
        : Math.max(0, likeCount - 1);

      setLiked(newLikedState);
      setLikeCount(newLikeCountState);

      if (newLikedState) {
        setAnimate(true); // Start animation
        setTimeout(() => setAnimate(false), 500); // Stop animation after 500ms
      }

      try {
        const payload = {
          targetId: commentId,
          targetType: targetType,
          userId: user?._id,
          smartsiteId: user?.primaryMicrosite,
          reactionType: "like",
        };
        logger.info("Sending like payload:", payload);
        const hola = await postFeedLike(payload, accessToken);
        logger.info("Like API response:", hola);
        // onPostInteraction?.(postId, {
        //   likeCount: newLikeCountState,
        //   isLiked: newLikedState,
        // });
        onLikeUpdate?.(commentId, {
          likeCount: newLikeCountState,
          isLiked: newLikedState,
        });
      } catch (error) {
        console.error("Error updating like status:", error);
        // Revert the like state if the API call fails
        setLiked(originalLiked);
        setLikeCount(originalLikeCount);
        toast.error("Failed to update like status."); // Notify user
      }
    };

    // ── Instant repost (no quote) ─────────────────────────────────────────────

    const handleInstantRepost = async () => {
      if (!accessToken) return toast.error("Please Login to Continue.");
      setRepostLoading(true);

      const payload = {
        smartsiteId: user?.primaryMicrosite,
        userId: user?._id,
        postType: "repost",
        content: {
          postId: commentId, // the comment/reply _id being reposted
          isFromFeed: false, // always false for comment/reply reposts
        },
      };

      try {
        const data = await postFeed(payload, accessToken);
        if (data?.state === "success") {
          toast.success("Reposted successfully!");
          setIsRepostPopOpen(false);
          onRepostSuccess?.();
          router.refresh();
        } else if (data?.state === "not-allowed") {
          toast.error("You are not allowed to create a feed post!");
        }
      } catch {
        toast.error("Failed to repost. Please try again.");
      } finally {
        setRepostLoading(false);
      }
    };

    // ── Undo repost ───────────────────────────────────────────────────────────

    const handleUndoRepost = async () => {
      if (!myRepostId) return;
      setRepostLoading(true);
      try {
        const result = await deleteFeed(myRepostId, accessToken);
        if (result?.state === "success") {
          toast.success("Undo repost successfully");
          setIsRepostPopOpen(false);
          onRepostSuccess?.();
          router.refresh();
        }
      } catch {
        toast.error("Failed to undo repost.");
      } finally {
        setRepostLoading(false);
      }
    };

    // ── Quote repost ──────────────────────────────────────────────────────────

    const QUOTE_MAX = 512;

    const handleQuoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setQuoteContentError(
        value.length > QUOTE_MAX
          ? `** Content cannot exceed ${QUOTE_MAX} characters.`
          : "",
      );
      setQuoteContent(value);
    };

    const handleQuoteRepost = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!accessToken) return toast.error("Please Login to Continue.");
      if (!quoteContent.trim()) return;

      setRepostLoading(true);

      const payload = {
        smartsiteId: user?.primaryMicrosite,
        userId: user?._id,
        postType: "repost",
        content: {
          postId: commentId, // the comment/reply _id being reposted
          isFromFeed: false, // always false for comment/reply reposts
          quote: {
            title: quoteContent,
          },
        },
      };

      try {
        const data = await postFeed(payload, accessToken);
        if (data?.state === "success") {
          toast.success("Reposted successfully!");
          onQuoteModalChange(); // close quote modal
          setQuoteContent("");
          setIsRepostPopOpen(false);
          onRepostSuccess?.();
          router.refresh();
        } else if (data?.state === "not-allowed") {
          toast.error("You are not allowed to create a feed post!");
        }
      } catch {
        toast.error("Failed to repost. Please try again.");
      } finally {
        setRepostLoading(false);
      }
    };

    // ── Share / copy link ─────────────────────────────────────────────────────

    const handleCopyLink = useCallback(() => {
      const link = `${window.location.origin}/feed/${postId}#${commentId}`;
      navigator.clipboard
        .writeText(link)
        .then(() => {
          setIsCopied(true);
          toast.success("Copied!", { position: "bottom-center" });
          setTimeout(() => {
            setIsCopied(false);
            setIsSharePopOpen(false);
          }, 2000);
        })
        .catch((err) => console.error("Failed to copy link:", err));
    }, [postId, commentId]);

    // ── Reply submitted ───────────────────────────────────────────────────────

    // const handleReplySubmitted = useCallback(
    //   (newReply: any) => {
    //     onReplySuccess?.(newReply);
    //   },
    //   [onReplySuccess],
    // );

    // ─────────────────────────────────────────────────────────────────────────

    return (
      <div className="relative">
        {/* ── Action bar ── */}
        <div className="flex items-center justify-between gap-2 mt-1.5 text-gray-500">
          {/* ── Reply ── */}
          <Tooltip
            className="text-xs font-medium"
            placement="bottom"
            showArrow
            content="Reply"
          >
            <button
              onClick={onReplyModalOpen}
              className="flex items-center gap-1 text-sm font-medium hover:text-blue-500 transition-colors w-12"
            >
              <FiMessageCircle size={17} color="black" />
              {latestReplyCount > 0 && (
                <span className="text-sm font-medium text-black">
                  {formattedCounts.replies}
                </span>
              )}
            </button>
          </Tooltip>

          {/* ── Repost ── */}
          <Popover
            placement="bottom-start"
            isOpen={isRepostPopOpen}
            onOpenChange={(open) => setIsRepostPopOpen(open)}
          >
            <PopoverTrigger>
              <div className="z-0">
                <Tooltip
                  className="text-xs font-medium"
                  placement="bottom"
                  showArrow
                  content="Repost"
                >
                  <button className="flex items-center gap-1 text-sm font-medium w-12">
                    <Image
                      src={repostImg}
                      alt="repost"
                      className="w-5 h-auto"
                      quality={100}
                    />
                    {repostCount > 0 && (
                      <p className="text-black">{formattedCounts.reposts}</p>
                    )}
                  </button>
                </Tooltip>
              </div>
            </PopoverTrigger>

            <PopoverContent className="w-52 p-2 rounded-lg shadow-lg border border-gray-200 bg-white">
              {/* ── Already reposted by this user ── */}
              {myRepostId ? (
                <div>
                  <button
                    onClick={handleUndoRepost}
                    disabled={repostLoading}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <BiRepost size={24} />
                    <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      Undo Repost{" "}
                      {repostLoading && (
                        <Loader size={16} className="animate-spin" />
                      )}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      onQuoteModalOpen();
                      setIsRepostPopOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <BiEdit />
                    <span className="text-sm font-medium text-gray-900">
                      Repost With Content
                    </span>
                  </button>
                </div>
              ) : (
                /* ── Not yet reposted ── */
                <div>
                  <button
                    onClick={handleInstantRepost}
                    disabled={repostLoading}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <BiRepost size={24} />
                    <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      Instant Repost{" "}
                      {repostLoading && (
                        <Loader size={16} className="animate-spin" />
                      )}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      onQuoteModalOpen();
                      setIsRepostPopOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <BiEdit />
                    <span className="text-sm font-medium text-gray-900">
                      Repost With Content
                    </span>
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* ── Like ── */}
          <Tooltip
            className="text-xs font-medium"
            placement="bottom"
            showArrow
            content={liked ? "Unlike" : "Like"}
          >
            <button
              onClick={handleLike}
              className={`relative flex items-center gap-1 text-sm font-medium transition-colors w-12 ${
                liked ? "text-[#FF0000]" : "hover:text-red-500"
              }`}
            >
              {liked ? (
                <IoMdHeart size={18} color="red" />
              ) : (
                <IoMdHeartEmpty size={18} color="black" />
              )}
              {likeCount > 0 && (
                <span
                  className={`text-sm font-medium ${
                    liked ? "text-red-500" : "text-black"
                  }`}
                >
                  {formattedCounts.likes}
                </span>
              )}
              {/* Ping animation */}
              <span
                className={`absolute top-[-10px] left-[10px] text-red-500 ${
                  animate ? "animate-ping-heart" : "hidden"
                }`}
              >
                <IoMdHeart size={30} />
              </span>
            </button>
          </Tooltip>

          {/* ── Share ── */}
          <Popover
            placement="bottom-end"
            isOpen={isSharePopOpen}
            onOpenChange={(open) => setIsSharePopOpen(open)}
            className="z-0"
          >
            <PopoverTrigger className="z-0">
              <div className="z-0">
                <Tooltip
                  className="text-xs font-medium z-0"
                  placement="bottom"
                  showArrow
                  content="Share"
                >
                  <button className="hover:text-gray-800 transition-colors">
                    <FiShare size={16} color="black" />
                  </button>
                </Tooltip>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1.5 rounded-lg shadow-lg border border-gray-100 bg-white">
              <button
                onClick={!isCopied ? handleCopyLink : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isCopied
                    ? "text-green-600 hover:bg-green-50"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {isCopied ? (
                  <>
                    <TbCopyCheckFilled size={18} className="shrink-0" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <TbCopy size={18} className="shrink-0" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </PopoverContent>
          </Popover>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            REPLY MODAL — mirrors Reaction.tsx post reply modal exactly
        ════════════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={isReplyModalOpen}
          onOpenChange={onReplyModalChange}
          placement="top"
          backdrop="opaque"
          classNames={{
            base: "max-w-xl rounded-2xl overflow-visible",
            backdrop: "bg-black/70",
            body: "px-4 pb-4 pt-2 gap-0 overflow-visible relative",
            header: "px-4 pt-4 pb-0 border-none",
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>
                  <span className="text-base font-bold">Send Reply</span>
                </ModalHeader>

                <ModalBody>
                  {/* Original comment preview */}
                  {commentSnapshot && (
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                          {commentSnapshot.profilePic && (
                            <Image
                              src={
                                isUrl(commentSnapshot.profilePic)
                                  ? commentSnapshot.profilePic
                                  : `/images/user_avator/${commentSnapshot.profilePic}@3x.png`
                              }
                              alt="avatar"
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-gray-900 truncate">
                            {commentSnapshot.userName || "Unknown"}
                          </span>
                          {commentSnapshot.createdAt && (
                            <span className="text-xs text-gray-400">
                              · {dayjs(commentSnapshot.createdAt).fromNow()}
                            </span>
                          )}
                        </div>
                        {commentSnapshot.title && (
                          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                            {commentSnapshot.title}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Thread line + "Replying to" */}
                  <div className="flex items-center gap-2">
                    <div className="w-9 flex justify-center">
                      <div className="w-0.5 bg-gray-200 mt-1.5 rounded-full min-h-[32px]" />
                    </div>
                    <p className="text-xs text-gray-400">
                      Replying to{" "}
                      <a
                        href={`/sp/${
                          commentSnapshot?.ensName ||
                          commentSnapshot?.userName ||
                          "user"
                        }`}
                        target="_blank"
                        className="text-blue-500 font-medium"
                      >
                        @
                        {commentSnapshot?.ensName ||
                          commentSnapshot?.userName ||
                          "user"}
                      </a>
                    </p>
                  </div>

                  {/* Current user avatar + reply input */}
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-300 shrink-0 mt-1 overflow-hidden">
                      {primarySmartsiteData?.profilePic && (
                        <Image
                          src={
                            isUrl(primarySmartsiteData.profilePic)
                              ? primarySmartsiteData.profilePic
                              : `/images/user_avator/${primarySmartsiteData.profilePic}@3x.png`
                          }
                          alt="you"
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <CommentInput
                        postId={postId}
                        accessToken={accessToken}
                        latestCommentCount={latestReplyCount}
                        setLatestCommentCount={setLatestReplyCount}
                        onCommentSubmitted={(newReply) => {
                          // handleReplySubmitted(newReply);
                          onClose();
                        }}
                        parentCommentId={commentId}
                        placeholder={`Reply to @${
                          commentSnapshot?.ensName ||
                          commentSnapshot?.userName ||
                          "user"
                        }…`}
                        // autoFocus
                        // compact={false}
                      />
                    </div>
                  </div>
                </ModalBody>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* ════════════════════════════════════════════════════════════════════
            QUOTE REPOST MODAL — mirrors Reaction.tsx repost modal exactly
        ════════════════════════════════════════════════════════════════════ */}
        <Modal
          isOpen={isQuoteModalOpen}
          onOpenChange={onQuoteModalChange}
          size="lg"
        >
          <ModalContent className="max-w-md overflow-visible">
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1 border-b border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Repost this {targetType}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">
                    Add your thoughts here
                  </p>
                </ModalHeader>

                <ModalBody className="p-6">
                  {/* Original comment preview inside quote modal */}
                  {commentSnapshot && (
                    <div className="mb-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm font-bold text-gray-900">
                          {commentSnapshot.userName || "Unknown"}
                        </span>
                        {commentSnapshot.ensName && (
                          <span className="text-xs text-gray-400">
                            · {commentSnapshot.ensName}
                          </span>
                        )}
                        {commentSnapshot.createdAt && (
                          <span className="text-xs text-gray-400">
                            · {dayjs(commentSnapshot.createdAt).fromNow()}
                          </span>
                        )}
                      </div>
                      {commentSnapshot.title && (
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {commentSnapshot.title}
                        </p>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleQuoteRepost}>
                    <div className="space-y-4">
                      <div className="relative">
                        <textarea
                          rows={3}
                          className="w-full rounded-lg bg-gray-50 p-4 pr-10 text-sm focus:outline-gray-100 transition-colors"
                          placeholder="Add your thoughts…"
                          maxLength={QUOTE_MAX}
                          value={quoteContent}
                          onChange={handleQuoteChange}
                        />
                        {quoteContentError && (
                          <p className="text-red-500 text-xs mt-0.5">
                            {quoteContentError}
                          </p>
                        )}
                        {/* Emoji picker button */}
                        <div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowEmojiPicker((p) => !p);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute right-3 bottom-3 p-1 text-gray-400 hover:text-gray-600"
                          >
                            <BsEmojiSmile size={20} />
                          </button>
                          {showEmojiPicker && (
                            <div
                              ref={emojiPickerRef}
                              className="absolute z-[9999] top-[90px] right-0"
                            >
                              <EmojiPicker
                                onEmojiClick={(emojiObject) =>
                                  setQuoteContent(
                                    (prev) => prev + emojiObject.emoji,
                                  )
                                }
                                width={300}
                                height={350}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {quoteContent.length}/{QUOTE_MAX}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="light"
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            onPress={onClose}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            color="primary"
                            className="px-4 py-2 text-sm font-medium text-white shadow-sm rounded-md"
                            isDisabled={
                              !quoteContent.trim() ||
                              !!quoteContentError ||
                              repostLoading
                            }
                          >
                            {repostLoading ? (
                              <Loader className="animate-spin" size={16} />
                            ) : (
                              "Repost"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                </ModalBody>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    );
  },
  (prev, next) =>
    prev.commentId === next.commentId &&
    prev.postId === next.postId &&
    prev.targetType === next.targetType &&
    prev.likeCount === next.likeCount &&
    prev.replyCount === next.replyCount &&
    prev.repostCount === next.repostCount &&
    prev.isLiked === next.isLiked &&
    prev.myRepostId === next.myRepostId &&
    prev.latestReplyCount === next.latestReplyCount,
);

CommentReaction.displayName = "CommentReaction";

export default CommentReaction;
