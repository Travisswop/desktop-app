"use client";
import { Tooltip } from "@nextui-org/react";
import React from "react";
import { BiMessageSquare } from "react-icons/bi";

const CommentMain = ({
  latestCommentCount,
  isCommentInputOpen,
  setIsCommentInputOpen,
}: any) => {
  const handleCommentOpen = () => {
    setIsCommentInputOpen(!isCommentInputOpen);
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
        <BiMessageSquare size={17} />
        <p>{latestCommentCount}</p>
      </button>
    </Tooltip>
  );
};

export default CommentMain;
