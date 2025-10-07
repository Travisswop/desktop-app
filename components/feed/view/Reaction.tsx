"use client";
import {
  addFeedLikePoints,
  postFeed,
  postFeedLike,
  removeFeedLike,
} from "@/actions/postFeed";
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
  useEffect,
  useRef,
  useState,
  memo,
  useCallback,
  useMemo,
} from "react";
import { FiShare } from "react-icons/fi";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { RiBarChartGroupedFill } from "react-icons/ri";
import CommentMain from "../reaction/CommentMain";
import { BiEdit, BiRepost } from "react-icons/bi";
import CommentContent from "../CommentContent";
import { useUser } from "@/lib/UserContext";
import { formatCountReaction } from "@/lib/formatFeedReactionCount";
import { TbCopy, TbCopyCheckFilled } from "react-icons/tb";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import EmojiPicker from "emoji-picker-react";
import { BsEmojiSmile } from "react-icons/bs";
import { Loader } from "lucide-react";

// Assuming FeedItemType is available or defined elsewhere
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
  isFromFeedDetails?: boolean;
  onRepostSuccess?: () => void;
  onPostInteraction?: (postId: string, updates: Partial<FeedItemType>) => void;
}

const Reaction = memo(
  ({
    postId,
    likeCount: initialLikeCount,
    commentCount,
    repostCount,
    viewsCount,
    commentId = null,
    replyId = null,
    isLiked = false,
    isFromFeedDetails = false,
    onRepostSuccess,
    onPostInteraction,
  }: ReactionProps) => {
    const [liked, setLiked] = useState(isLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [animate, setAnimate] = useState(false); // Trigger for the animation
    const [smartsiteId, setSmartsiteId] = useState(""); // Trigger for the animation
    const [isCommentInputOpen, setIsCommentInputOpen] = useState(
      isFromFeedDetails ? true : false
    );
    const [latestCommentCount, setLatestCommentCount] = useState(commentCount);
    const [isPopOpen, setIsPopOpen] = useState(false);
    const [isRepostPopOpen, setIsRepostPopOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [accessToken, setAccessToken] = useState("");

    const [postContent, setPostContent] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [repostLoading, setRepostLoading] = useState(false);
    const [repostContentError, setRepostContentError] = useState("");

    const emojiPickerRef = useRef<HTMLDivElement>(null);

    // Memoized formatted counts
    const formattedCounts = useMemo(
      () => ({
        likes: formatCountReaction(likeCount),
        comments: formatCountReaction(latestCommentCount),
        reposts: formatCountReaction(repostCount),
        views: formatCountReaction(viewsCount),
      }),
      [likeCount, latestCommentCount, repostCount, viewsCount]
    );

    // Memoized copy link handler
    const handleCopyLink = useCallback(() => {
      const link = `${window.location.origin}/feed/${postId}`;
      navigator.clipboard
        .writeText(link)
        .then(() => {
          setIsCopied(true);
          toast.success("Copied!", { position: "bottom-center" });
          setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        })
        .catch((err) => {
          console.error("Failed to copy link: ", err);
        });
    }, [postId]);

    // Add this useEffect to handle outside clicks
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          emojiPickerRef.current &&
          !emojiPickerRef.current.contains(event.target as Node)
        ) {
          setShowEmojiPicker(false);
        }
      };

      if (showEmojiPicker) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showEmojiPicker]);

    // Get the access token from cookies once on mount.
    useEffect(() => {
      if (window !== undefined) {
        const token = Cookies.get("access-token");
        if (token) {
          setAccessToken(token);
        }
      }
    }, []);

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
        if (newLikedState) {
          await postFeedLike({ postId, smartsiteId }, accessToken);
          //add points for feed like
          if (user?._id) {
            const payloadForPoints = {
              userId: user._id,
              pointType: "Receiving a Like on Your Feed",
              actionKey: "launch-swop", //use same value
              feedPostId: postId,
            };
            await addFeedLikePoints(payloadForPoints, accessToken);
          }
        } else {
          const payload = { postId, smartsiteId, commentId, replyId };
          await removeFeedLike(payload, accessToken);
        }
        // If API call is successful, call the callback to update parent state
        onPostInteraction?.(postId, {
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

    const { user, loading, error: userError }: any = useUser();

    useEffect(() => {
      if (user) {
        setSmartsiteId(user.primaryMicrosite);
      }
    }, [user]);

    useEffect(() => {
      setLiked(isLiked);
    }, [isLiked]); // Depend on isLiked prop for initialization and external changes

    // console.log("commentPostContent", commentPostContent);

    const {
      isOpen: isRepostModalOpen,
      onOpen: onRepostModalOpen,
      onOpenChange: onRepostModalChange,
    } = useDisclosure();

    const MAX_LENGTH = 512;

    const handlePostChange = (e: any) => {
      const value = e.target.value;

      // Check if the content length exceeds the max length
      if (value.length > MAX_LENGTH) {
        setRepostContentError(
          `** Content cannot exceed ${MAX_LENGTH} characters.`
        );
      } else {
        setRepostContentError("");
      }

      setPostContent(value);
    };

    const handlePostingRepost = async (e: any) => {
      e.preventDefault();
      if (!accessToken) {
        return toast.error("Please Login to Continue.");
      }
      setRepostLoading(true);
      const payload = {
        smartsiteId: user?.primaryMicrosite,
        userId: user?._id,
        postType: "repost",
        content: {
          postId: postId,
          title: postContent,
        },
      };

      try {
        const data = await postFeed(payload, accessToken);

        if (data?.state === "success") {
          toast.success("You reposted successfully!");
          if (isRepostModalOpen) {
            onRepostModalChange();
          }
          onRepostSuccess?.();
          setIsRepostPopOpen(false);
        }
        if (data?.state === "not-allowed") {
          toast.error("You not allowed to create feed post!");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setRepostLoading(false);
      }
    };

    return (
      <div className="relative">
        <div className="flex items-center justify-between gap-2 mt-2 text-gray-700 font-normal">
          {/* comment */}
          <CommentMain
            latestCommentCount={latestCommentCount}
            // commentCount={latestCommentCount ? latestCommentCount : commentCount}
            isCommentInputOpen={isCommentInputOpen}
            setIsCommentInputOpen={setIsCommentInputOpen}
            isFromFeedDetails={isFromFeedDetails}
          />
          {/* repost */}
          {/* <Tooltip
          className="text-xs font-medium"
          placement="bottom"
          showArrow
          content="Repost"
        >
          <button className="flex items-center gap-1 text-sm font-medium w-12">
            <BiRepost size={21} />
            <p>{repostCount}</p>
          </button>
        </Tooltip> */}

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
                    <BiRepost size={21} />
                    <p>{repostCount}</p>
                  </button>
                </Tooltip>
                {/* <button className="opacity-0">
                <FiShare size={17} />
              </button> */}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2 rounded-lg shadow-lg border border-gray-200 bg-white">
              <div className="">
                <button
                  onClick={(e: any) => {
                    handlePostingRepost(e);
                  }}
                  disabled={repostLoading}
                  className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 transition-colors duration-150"
                >
                  <BiRepost className="text-lg text-gray-700" size={20} />
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    Instant Repost{" "}
                    {repostLoading && (
                      <Loader size={20} className="animate-spin" />
                    )}
                  </span>
                </button>

                <button
                  onClick={() => {
                    onRepostModalOpen();
                    setIsRepostPopOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 transition-colors duration-150"
                >
                  <BiEdit className="text-lg text-gray-700" />
                  <span className="text-sm font-medium text-gray-900">
                    Repost With Content
                  </span>
                </button>

                {/* <div className="border-t border-gray-100 my-1"></div> */}

                {/* <button className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors duration-150 text-red-500">
                <BiTrash className="text-lg" />
                <span className="text-sm font-medium">Cancel Repost</span>
              </button> */}
              </div>
            </PopoverContent>
          </Popover>

          <Tooltip
            className="text-xs font-medium"
            placement="bottom"
            showArrow
            content={liked ? "Unlike" : "Like"}
          >
            <button
              onClick={handleLike}
              className={`relative flex items-center gap-1 text-sm font-medium w-12 ${
                liked ? "text-[#FF0000]" : ""
              }`}
            >
              {liked ? (
                <IoMdHeart size={17} color="red" />
              ) : (
                <IoMdHeartEmpty size={17} color="black" />
              )}
              <p>{formattedCounts.likes}</p>

              {/* Heart animation effect */}
              <span
                className={`absolute top-[-10px] left-[10px] text-red-500 ${
                  animate ? "animate-ping-heart" : "hidden"
                }`}
              >
                <IoMdHeart size={30} />
              </span>
            </button>
          </Tooltip>

          <Tooltip
            className="text-xs font-medium"
            placement="bottom"
            showArrow
            content="View"
          >
            <button className="flex items-center gap-1 text-sm font-medium w-12">
              <RiBarChartGroupedFill size={17} />
              <p>{formattedCounts.views}</p>
            </button>
          </Tooltip>

          <Popover
            placement="bottom-end"
            isOpen={isPopOpen}
            onOpenChange={(open) => setIsPopOpen(open)}
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
                {/* <button className="opacity-0">
                <FiShare size={17} />
              </button> */}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1.5 rounded-lg shadow-lg border border-gray-100 bg-white">
              <button
                onClick={!isCopied ? handleCopyLink : () => {}}
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
        {/* comment input field  */}
        {isCommentInputOpen && (
          <CommentContent
            postId={postId}
            accessToken={accessToken}
            latestCommentCount={latestCommentCount}
            setLatestCommentCount={setLatestCommentCount}
            onCommentSubmitted={(newTotalCommentCount: number) => {
              onPostInteraction?.(postId, {
                commentCount: newTotalCommentCount,
              });
            }}
          />
        )}
        <Modal
          isOpen={isRepostModalOpen}
          onOpenChange={onRepostModalChange}
          size="lg"
        >
          <ModalContent className="max-w-md overflow-visible">
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1 border-b border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Repost this post
                  </h3>
                  <p className="text-sm text-gray-500">
                    Add your thoughts here
                  </p>
                </ModalHeader>
                <ModalBody className="p-6">
                  <form onSubmit={handlePostingRepost}>
                    <div className="space-y-4">
                      <div className="relative ">
                        <textarea
                          name="postRepost"
                          id="postRepost"
                          rows={3}
                          className="w-full rounded-lg bg-gray-50 p-4 pr-10 text-sm focus:outline-gray-100 transition-colors"
                          placeholder="What are your thoughts?"
                          maxLength={280}
                          value={postContent}
                          onChange={handlePostChange}
                        />
                        <div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowEmojiPicker(!showEmojiPicker);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            type="button"
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
                                onEmojiClick={(emojiObject) => {
                                  setPostContent(
                                    (prev) => prev + emojiObject.emoji
                                  );
                                }}
                                width={300}
                                height={350}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {postContent?.length || 0}/280
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
                            isDisabled={!postContent.trim() || repostLoading}
                          >
                            {repostLoading ? (
                              <Loader className="animate-spin" />
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
  (prevProps, nextProps) => {
    // Custom comparison to prevent rerenders when only unrelated props change
    return (
      prevProps.postId === nextProps.postId &&
      prevProps.likeCount === nextProps.likeCount &&
      prevProps.commentCount === nextProps.commentCount &&
      prevProps.repostCount === nextProps.repostCount &&
      prevProps.viewsCount === nextProps.viewsCount &&
      prevProps.isLiked === nextProps.isLiked &&
      prevProps.isFromFeedDetails === nextProps.isFromFeedDetails &&
      prevProps.commentId === nextProps.commentId &&
      prevProps.replyId === nextProps.replyId
    );
  }
);

Reaction.displayName = "Reaction";

export default Reaction;
