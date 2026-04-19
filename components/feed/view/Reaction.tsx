"use client";
import { deleteFeed, postFeed, postFeedLike } from "@/actions/postFeed";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  useDisclosure,
} from "@nextui-org/react";
import React, {
  useEffect,
  useRef,
  useState,
  memo,
  useCallback,
  useMemo,
} from "react";
import { FiShare } from "react-icons/fi";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import CommentMain from "../reaction/CommentMain";
import { BiEdit, BiRepost } from "react-icons/bi";
import { useUser } from "@/lib/UserContext";
import { formatCountReaction } from "@/lib/formatFeedReactionCount";
import { TbCopy, TbCopyCheckFilled, TbEdit } from "react-icons/tb";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { Loader } from "lucide-react";
import repostImg from "@/public/images/custom-icons/feed_repost.png";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import isUrl from "@/lib/isUrl";
import { useModalStore } from "@/zustandStore/modalstore";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@nextui-org/react";
import CommentInput from "../comment/CommentInput";
import RepostComposer from "../RepostComposer";
import logger from "@/utils/logger";

// New self-contained repost composer

// ─── Types ────────────────────────────────────────────────────────────────────
interface FeedItemType {
  _id: string;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  [key: string]: any;
}

interface ReactionProps {
  postId: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  viewsCount: number;
  commentId?: string | null;
  replyId?: string | null;
  isLiked?: boolean;
  isFromFeedDetailsPage?: boolean;
  onRepostSuccess?: () => void;
  onPostInteraction?: (postId: string, updates: Partial<FeedItemType>) => void;
  feed?: any;
  parentCommentId?: string | null;
  isFromMainFeed?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
const Reaction = memo(
  ({
    postId,
    likeCount: initialLikeCount,
    commentCount,
    repostCount,
    viewsCount,
    isLiked = false,
    onRepostSuccess,
    onPostInteraction,
    feed,
    parentCommentId = null,
    isFromMainFeed = false,
  }: ReactionProps) => {
    const { triggerFeedRefetch } = useModalStore();
    const router = useRouter();

    // ── Like state ──────────────────────────────────────────────────────────
    const [liked, setLiked] = useState(isLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [animate, setAnimate] = useState(false);

    // ── Auth / user ─────────────────────────────────────────────────────────
    const [accessToken, setAccessToken] = useState("");
    const [smartsiteId, setSmartsiteId] = useState("");
    const [primarySmartsiteData, setPrimarySmartsiteData] = useState<any>(null);
    const { user }: any = useUser();

    // ── Comment state ───────────────────────────────────────────────────────
    const [isCommentInputOpen, setIsCommentInputOpen] = useState(false);
    const [latestCommentCount, setLatestCommentCount] = useState(
      commentCount || 0,
    );

    // ── Share popover ───────────────────────────────────────────────────────
    const [isPopOpen, setIsPopOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // ── Repost popover ──────────────────────────────────────────────────────
    const [isRepostPopOpen, setIsRepostPopOpen] = useState(false);
    const [repostLoading, setRepostLoading] = useState(false);

    // ── Repost composer modal ───────────────────────────────────────────────
    const {
      isOpen: isRepostComposerOpen,
      onOpen: openRepostComposer,
      onOpenChange: onRepostComposerChange,
    } = useDisclosure();

    // ── Memoised formatted counts ───────────────────────────────────────────
    const formattedCounts = useMemo(
      () => ({
        likes: formatCountReaction(likeCount),
        comments: formatCountReaction(latestCommentCount),
        reposts: formatCountReaction(repostCount),
        views: formatCountReaction(viewsCount),
      }),
      [likeCount, latestCommentCount, repostCount, viewsCount],
    );

    // ── Effects ─────────────────────────────────────────────────────────────
    useEffect(() => {
      const token = Cookies.get("access-token");
      if (token) setAccessToken(token);
    }, []);

    useEffect(() => {
      if (user) setSmartsiteId(user.primaryMicrosite);
    }, [user]);

    useEffect(() => {
      const primary = user?.microsites?.find(
        (site: any) => site._id === user.primaryMicrosite,
      );
      if (primary) setPrimarySmartsiteData(primary);
    }, [user?.microsites, user?.primaryMicrosite]);

    useEffect(() => {
      setLiked(isLiked);
    }, [isLiked]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleLike = async () => {
      if (!accessToken) return toast.error("Please Login to Continue.");

      const originalLiked = liked;
      const originalCount = likeCount;
      const newLiked = !liked;
      const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);

      setLiked(newLiked);
      setLikeCount(newCount);
      if (newLiked) {
        setAnimate(true);
        setTimeout(() => setAnimate(false), 500);
      }

      try {
        const payload = {
          targetId: postId,
          targetType: "post",
          userId: user?._id,
          smartsiteId: user?.primaryMicrosite,
          reactionType: "like",
        };
        await postFeedLike(payload, accessToken);
        onPostInteraction?.(postId, { likeCount: newCount, isLiked: newLiked });
      } catch {
        setLiked(originalLiked);
        setLikeCount(originalCount);
        toast.error("Failed to update like status.");
      }
    };

    const handleCopyLink = useCallback(() => {
      const link = `${window.location.origin}/feed/${postId}`;
      navigator.clipboard
        .writeText(link)
        .then(() => {
          setIsCopied(true);
          toast.success("Copied!", { position: "bottom-center" });
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(() => toast.error("Failed to copy link."));
    }, [postId]);

    // Instant repost — no quote, just postId + isFromFeed
    const handleInstantRepost = async () => {
      if (!accessToken) return toast.error("Please Login to Continue.");
      setRepostLoading(true);
      try {
        const payload = {
          smartsiteId: user?.primaryMicrosite,
          userId: user?._id,
          postType: "repost",
          content: {
            postId,
            isFromFeed: isFromMainFeed,
            // no quote field — simple repost
          },
        };
        const data = await postFeed(payload, accessToken);
        if (data?.state === "success") {
          toast.success("Reposted successfully!");
          triggerFeedRefetch();
          setIsRepostPopOpen(false);
        } else if (data?.state === "not-allowed") {
          toast.error("You are not allowed to create a feed post!");
        }
      } catch {
        toast.error("Repost failed. Please try again.");
      } finally {
        setRepostLoading(false);
      }
    };

    const handleUndoRepost = async () => {
      if (!accessToken) return toast.error("Please Login to Continue.");
      setRepostLoading(true);
      try {
        const result = await deleteFeed(postId, accessToken, user?._id);
        logger.info("Undo repost result", result);
        if (result.success === true) {
          toast.success("Undo Repost successfully");
          triggerFeedRefetch();
          setIsRepostPopOpen(false);
          router.refresh();
        }
      } finally {
        setRepostLoading(false);
      }
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
      <div className="relative">
        <div className="flex items-center justify-between gap-2 mt-2 text-gray-700 font-normal">
          {/* ── Comment ── */}
          <CommentMain
            latestCommentCount={latestCommentCount}
            isCommentInputOpen={isCommentInputOpen}
            setIsCommentInputOpen={setIsCommentInputOpen}
          />

          {/* ── Repost popover ── */}
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
                    <p>
                      {Number(formattedCounts?.reposts) > 0
                        ? formattedCounts.reposts
                        : 0}
                    </p>
                  </button>
                </Tooltip>
              </div>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-2 rounded-lg shadow-lg border border-gray-200 bg-white">
              {feed?.postType === "repost" && feed?.userId === user?._id ? (
                /* — already reposted by this user — */
                <div>
                  <button
                    onClick={handleUndoRepost}
                    disabled={repostLoading}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <Image
                      src={repostImg}
                      alt="repost"
                      className="w-5 h-auto"
                      quality={100}
                    />
                    <span className="text-sm font-medium text-red-600 flex items-center gap-1">
                      Undo Repost
                      {repostLoading && (
                        <Loader size={16} className="animate-spin" />
                      )}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      openRepostComposer();
                      setIsRepostPopOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <TbEdit size={20} />
                    <span className="text-sm font-medium text-gray-900">
                      Quote
                    </span>
                  </button>
                </div>
              ) : (
                /* — not yet reposted — */
                <div>
                  <button
                    onClick={handleInstantRepost}
                    disabled={repostLoading}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <Image
                      src={repostImg}
                      alt="repost"
                      className="w-5 h-auto"
                      quality={100}
                    />
                    <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      Repost
                      {repostLoading && (
                        <Loader size={16} className="animate-spin" />
                      )}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      openRepostComposer();
                      setIsRepostPopOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <TbEdit size={20} />
                    <span className="text-sm font-medium text-gray-900">
                      Quote
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
              className={`relative flex items-center gap-1 text-sm font-medium w-12 ${liked ? "text-[#FF0000]" : ""}`}
            >
              {liked ? (
                <IoMdHeart size={18} color="red" />
              ) : (
                <IoMdHeartEmpty size={18} color="black" />
              )}
              <p>{formattedCounts.likes}</p>
              <span
                className={`absolute top-[-10px] left-[10px] text-red-500 ${
                  animate ? "animate-ping-heart" : "hidden"
                }`}
              >
                <IoMdHeart size={30} />
              </span>
            </button>
          </Tooltip>

          {/* ── Share popover ── */}
          <Popover
            placement="bottom-end"
            isOpen={isPopOpen}
            onOpenChange={setIsPopOpen}
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
                  <button>
                    <FiShare size={17} />
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

        {/* ── Comment reply modal ── */}
        {isCommentInputOpen && (
          <Modal
            isOpen={isCommentInputOpen}
            onOpenChange={setIsCommentInputOpen}
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
                    {/* Original post preview */}
                    {feed && (
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                            {feed.smartsiteDetails?.profilePic && (
                              <Image
                                src={
                                  isUrl(feed.smartsiteDetails.profilePic)
                                    ? feed.smartsiteDetails.profilePic
                                    : `/images/user_avator/${feed.smartsiteDetails.profilePic}@3x.png`
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
                              {feed.smartsiteDetails?.name ||
                                feed.smartsiteUserName ||
                                "Unknown User"}
                            </span>
                            <span className="text-xs text-gray-400">
                              · {dayjs(feed.createdAt).fromNow()}
                            </span>
                          </div>
                          {feed.content?.title && (
                            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                              {feed.content.title}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="w-9 flex justify-center">
                        <div className="w-0.5 bg-gray-200 mt-1.5 rounded-full min-h-[32px]" />
                      </div>
                      <p className="text-xs text-gray-400">
                        Replying to{" "}
                        <a
                          href={`/sp/${feed?.smartsiteDetails?.ens || feed?.smartsiteUserName || "user"}`}
                          target="_blank"
                          className="text-blue-500 font-medium"
                        >
                          @{feed?.smartsiteDetails?.ens || "user"}
                        </a>
                      </p>
                    </div>

                    {/* Reply input */}
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
                          latestCommentCount={latestCommentCount}
                          setLatestCommentCount={setLatestCommentCount}
                          onCommentSubmitted={() => {
                            onPostInteraction?.(postId, {
                              commentCount: latestCommentCount + 1,
                            });
                            onClose();
                          }}
                          parentCommentId={parentCommentId}
                        />
                      </div>
                    </div>
                  </ModalBody>
                </>
              )}
            </ModalContent>
          </Modal>
        )}

        {/* ── Repost Composer Modal ── */}
        <RepostComposer
          isOpen={isRepostComposerOpen}
          onOpenChange={onRepostComposerChange}
          postId={postId}
          feed={feed}
          user={user}
          accessToken={accessToken}
          primarySmartsiteData={primarySmartsiteData}
          onPostInteraction={onPostInteraction}
          isFromMainFeed={isFromMainFeed}
          onRepostSuccess={() => {
            triggerFeedRefetch();
            onRepostSuccess?.();
          }}
        />
      </div>
    );
  },
  (prev, next) =>
    prev.postId === next.postId &&
    prev.likeCount === next.likeCount &&
    prev.commentCount === next.commentCount &&
    prev.repostCount === next.repostCount &&
    prev.viewsCount === next.viewsCount &&
    prev.isLiked === next.isLiked &&
    prev.commentId === next.commentId &&
    prev.replyId === next.replyId,
);

Reaction.displayName = "Reaction";
export default Reaction;
