"use client";
import {
  addFeedLikePoints,
  postFeedLike,
  removeFeedLike,
} from "@/actions/postFeed";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from "@nextui-org/react";
import React, { useEffect, useState } from "react";
import { FiShare } from "react-icons/fi";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { RiBarChartGroupedFill } from "react-icons/ri";
import CommentMain from "../reaction/CommentMain";
import { BiRepost } from "react-icons/bi";
import CommentContent from "../CommentContent";
import { useUser } from "@/lib/UserContext";
import { formatCountReaction } from "@/lib/formatFeedReactionCount";
import { TbCopy, TbCopyCheckFilled } from "react-icons/tb";
import toast from "react-hot-toast";
import Cookies from "js-cookie";

const Reaction = ({
  postId,
  likeCount: initialLikeCount,
  commentCount,
  repostCount,
  viewsCount,
  commentId = null,
  replyId = null,
  isLiked = false,
  isFromFeedDetails = false,
}: {
  postId: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  viewsCount: number;
  commentId?: string | null;
  replyId?: string | null;
  isLiked?: boolean;
  isFromFeedDetails?: boolean;
}) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [animate, setAnimate] = useState(false); // Trigger for the animation
  const [smartsiteId, setSmartsiteId] = useState(""); // Trigger for the animation
  const [isCommentInputOpen, setIsCommentInputOpen] = useState(
    isFromFeedDetails ? true : false
  );
  const [latestCommentCount, setLatestCommentCount] = useState(commentCount);
  const [isPopOpen, setIsPopOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  // Get the access token from cookies once on mount.
  useEffect(() => {
    if (window !== undefined) {
      const token = Cookies.get("access-token");
      if (token) {
        setAccessToken(token);
      }
    }
  }, []);

  const handleCopyLink = () => {
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
  };

  const handleLike = async () => {
    // Optimistically update the like state
    setLiked(!liked);
    setLikeCount((prevCount) => {
      if (liked) {
        // If already liked and count is 0, return 0
        return prevCount > 0 ? prevCount - 1 : 0;
      } else {
        // If not liked, increment the count
        return prevCount + 1;
      }
    });

    if (!liked) {
      setAnimate(true); // Start animation
      setTimeout(() => setAnimate(false), 500); // Stop animation after 500ms
    }

    try {
      if (!liked) {
        await postFeedLike({ postId, smartsiteId }, accessToken);
        //add points for feed like
        if (user?._id) {
          const payloadForPoints = {
            userId: user._id,
            pointType: "Receiving a Like on Your Feed",
            actionKey: "launch-swop", //use same value
            feedPostId: postId,
          };
          console.log("payloadForPoints", payloadForPoints);

          const response = await addFeedLikePoints(
            payloadForPoints,
            accessToken
          );
          console.log("response", response);
        }
      } else {
        const payload = { postId, smartsiteId, commentId, replyId };
        await removeFeedLike(payload, accessToken);
        // console.log("remove like", remove);
      }
    } catch (error) {
      console.error("Error updating like status:", error);
      // Revert the like state if the API call fails
      setLiked(liked); // Reset to previous state
      setLikeCount((prevCount) => {
        if (liked) {
          // If already liked and count is 0, return 0
          return prevCount > 0 ? prevCount - 1 : 0;
        } else {
          // If not liked, increment the count
          return prevCount + 1;
        }
      });
    }
  };

  const { user, loading, error: userError }: any = useUser();
  // console.log("user", user);

  useEffect(() => {
    if (user) {
      setSmartsiteId(user.primaryMicrosite);
    }
  }, [user]);

  useEffect(() => {
    setLiked(isLiked);
  }, []); //don't change

  // console.log("commentPostContent", commentPostContent);

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
            <p>{formatCountReaction(likeCount)}</p>

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
            <p>{viewsCount}</p>
          </button>
        </Tooltip>

        <Popover
          placement="bottom-end"
          isOpen={isPopOpen}
          onOpenChange={(open) => setIsPopOpen(open)}
        >
          <PopoverTrigger>
            <div className="relative">
              <Tooltip
                className="text-xs font-medium"
                placement="bottom"
                showArrow
                content="Share"
              >
                <button className="absolute top-0 left-0">
                  <FiShare size={17} />
                </button>
              </Tooltip>
              <button className="opacity-0">
                <FiShare size={17} />
              </button>
            </div>
          </PopoverTrigger>
          <PopoverContent>
            <div className="px-1 py-2">
              <div className="text-small font-bold">
                <button
                  onClick={!isCopied ? handleCopyLink : () => {}}
                  className="flex items-center gap-1 "
                >
                  {isCopied ? (
                    <TbCopyCheckFilled color="green" size={20} />
                  ) : (
                    <TbCopy size={20} />
                  )}
                  <span>Copy Link</span>
                </button>
              </div>
            </div>
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
        />
      )}
    </div>
  );
};

export default Reaction;
