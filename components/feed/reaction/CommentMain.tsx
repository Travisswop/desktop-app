"use client";
import { Tooltip } from "@nextui-org/react";
import React, { memo } from "react";
import { FiMessageCircle } from "react-icons/fi";

const CommentMain = memo(
  ({
    latestCommentCount,
    isCommentInputOpen,
    setIsCommentInputOpen,
    isFromFeedDetails,
  }: any) => {
    const handleCommentOpen = () => {
      if (isFromFeedDetails) {
        setIsCommentInputOpen(true);
      } else {
        setIsCommentInputOpen(!isCommentInputOpen);
      }
    };

    return (
      <Tooltip
        className="text-xs font-medium"
        placement="bottom"
        showArrow
        content="Reply"
      >
        <button
          onClick={handleCommentOpen}
          className="flex items-center gap-1 text-sm font-medium w-12"
        >
          <FiMessageCircle size={20} color="black" />
          <p>{latestCommentCount}</p>
        </button>
      </Tooltip>
    );
  }
);

CommentMain.displayName = "CommentMain";

export default CommentMain;
