import { Skeleton } from "@nextui-org/react";
import React from "react";

const FeedCommentLoading = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="w-full flex items-center gap-3 border-b pb-6">
        <div>
          <Skeleton className="flex rounded-full w-12 h-12" />
        </div>
        <div className="w-full flex flex-col gap-2">
          <Skeleton className="h-5 w-3/5 rounded-lg" />
          <Skeleton className="h-5 w-4/5 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default FeedCommentLoading;
