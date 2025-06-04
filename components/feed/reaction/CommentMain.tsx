'use client';
import { Tooltip } from '@nextui-org/react';
import React, { memo } from 'react';
import { BiMessageSquare } from 'react-icons/bi';

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
          <BiMessageSquare size={17} />
          <p>{latestCommentCount}</p>
        </button>
      </Tooltip>
    );
  }
);

CommentMain.displayName = 'CommentMain';

export default CommentMain;
