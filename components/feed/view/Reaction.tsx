"use client";
import { isPostLiked, postFeedLike, removeFeedLike } from "@/actions/postFeed";
import { Tooltip } from "@nextui-org/react";
import React, { useEffect, useState } from "react";
import { FiShare } from "react-icons/fi";
import { IoMdHeart, IoMdHeartEmpty } from "react-icons/io";
import { RiBarChartGroupedFill } from "react-icons/ri";
import CommentMain from "../reaction/CommentMain";
import { BiRepost } from "react-icons/bi";
import CommentContent from "../CommentContent";
import { useUser } from "@/lib/UserContext";
import { formatCountReaction } from "@/lib/formatFeedReactionCount";

const Reaction = ({
  postId,
  likeCount: initialLikeCount,
  commentCount,
  repostCount,
  viewsCount,
  accessToken,
  commentId = null,
  replyId = null,
}: {
  postId: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  viewsCount: number;
  accessToken: string;
  commentId?: string | null;
  replyId?: string | null;
}) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [animate, setAnimate] = useState(false); // Trigger for the animation
  const [smartsiteId, setSmartsiteId] = useState(""); // Trigger for the animation
  const [isCommentInputOpen, setIsCommentInputOpen] = useState(false);
  // const [propsCommentCount, setPropsCommentCount] = useState(commentCount)
  const [latestCommentCount, setLatestCommentCount] = useState(commentCount);

  const handleLike = async () => {
    // Optimistically update the like state
    setLiked(!liked);
    setLikeCount((prevCount) => (liked ? prevCount - 1 : prevCount + 1));
    if (!liked) {
      setAnimate(true); // Start animation
      setTimeout(() => setAnimate(false), 500); // Stop animation after 500ms
    }

    try {
      if (!liked) {
        await postFeedLike({ postId, smartsiteId }, accessToken);
      } else {
        const payload = { postId, smartsiteId, commentId, replyId };
        const remove = await removeFeedLike(payload, accessToken);
        // console.log("remove like", remove);
      }
    } catch (error) {
      console.error("Error updating like status:", error);
      // Revert the like state if the API call fails
      setLiked(liked); // Reset to previous state
      setLikeCount((prevCount) => (liked ? prevCount + 1 : prevCount - 1));
    }
  };

  const { user, loading, error: userError } = useUser();

  useEffect(() => {
    if (user) {
      setSmartsiteId(user.primaryMicrosite);
    }

    const fetchLikeStatus = async () => {
      try {
        const payload = {
          postId,
          smartsiteId: user.primaryMicrosite,
          commentId,
          replyId,
        };
        const like = await isPostLiked(payload, accessToken);
        setLiked(like.liked);
      } catch (error) {
        console.error("Error fetching like status:", error);
      }
    };
    fetchLikeStatus();
  }, [accessToken, commentId, postId, replyId, user]);

  // console.log("commentPostContent", commentPostContent);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mt-2 text-gray-700 font-normal">
        {/* comment */}
        <CommentMain
          latestCommentCount={latestCommentCount}
          // commentCount={latestCommentCount ? latestCommentCount : commentCount}
          isCommentInputOpen={isCommentInputOpen}
          setIsCommentInputOpen={setIsCommentInputOpen}
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

        <Tooltip
          className="text-xs font-medium"
          placement="bottom"
          showArrow
          content="Share"
        >
          <button className="flex items-center gap-1 text-sm font-medium">
            <FiShare size={17} />
          </button>
        </Tooltip>
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
