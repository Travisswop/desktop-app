"use client";
import { Skeleton } from "@nextui-org/react";

export const TabSwitcherLoading = () => {
  return (
    <div className="shadow-none rounded-none overflow-hidden flex items-center gap-3">
      <Skeleton className="h-11 w-32 rounded" />
      <Skeleton className="h-11 w-32 rounded" />
      <Skeleton className="h-11 w-32 rounded" />
    </div>
  );
};

const FeedItemSkeleton = () => {
  return (
    <div className="w-full bg-white rounded-lg p-4 mb-3 animate-pulse">
      {/* Header - Avatar, Username, Time */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar skeleton */}
        <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0" />

        <div className="flex-1">
          {/* Username skeleton */}
          <div className="h-4 bg-gray-300 rounded w-40 mb-2" />
          {/* Handle/ID skeleton */}
          <div className="h-3 bg-gray-200 rounded w-32" />
        </div>

        {/* Three dots menu skeleton */}
        <div className="w-6 h-6 bg-gray-200 rounded-full" />
      </div>

      {/* Post content text skeleton */}
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-4/5" />
        <div className="h-3 bg-gray-200 rounded w-3/5" />
      </div>

      {/* Action buttons skeleton */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        {/* Comment */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-4" />
        </div>

        {/* Repost */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-4" />
        </div>

        {/* Like */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-4" />
        </div>

        {/* Share */}
        <div className="w-5 h-5 bg-gray-200 rounded" />
      </div>
    </div>
  );
};

const FeedItemSkeletonWithMedia = () => {
  return (
    <div className="w-full bg-white rounded-lg p-4 mb-3 animate-pulse">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0" />

        <div className="flex-1">
          <div className="h-4 bg-gray-300 rounded w-40 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-32" />
        </div>

        <div className="w-6 h-6 bg-gray-200 rounded-full" />
      </div>

      {/* Post content text */}
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>

      {/* Media skeleton - Image/Video placeholder */}
      <div className="relative w-full h-[280px] bg-gray-300 rounded-xl mb-3 overflow-hidden">
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Play button for video placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-gray-400 rounded-full" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-4" />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-4" />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded w-4" />
        </div>

        <div className="w-5 h-5 bg-gray-200 rounded" />
      </div>
    </div>
  );
};

// Main Feed Loading Component
export const FeedMainComponentLoading = () => {
  return (
    <div className="w-full space-y-0">
      <FeedItemSkeleton />
      <FeedItemSkeletonWithMedia />
      <FeedItemSkeleton />
      <FeedItemSkeletonWithMedia />
      <FeedItemSkeleton />
    </div>
  );
};
