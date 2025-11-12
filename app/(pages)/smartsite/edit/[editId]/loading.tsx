"use client";
import { Skeleton } from "@/components/ui/skeleton";

const Loading = () => {
  return (
    <div className="w-full lg:w-[84%] xl:w-[72%] 2xl:w-[68%] mx-auto bg-white py-4 px-[4%] lg:px-[10%] rounded-xl h-full">
      {/* Profile Picture Skeleton */}
      <div className="flex justify-center mb-8">
        <Skeleton className="w-24 h-24 rounded-full bg-gray-300" />
      </div>

      {/* Name Field Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-4 w-16 mb-2 bg-gray-300" />
        <Skeleton className="h-12 w-full rounded-lg bg-gray-200" />
      </div>

      {/* Profile URL Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-4 w-24 mb-2 bg-gray-300" />
        <Skeleton className="h-12 w-full rounded-lg bg-gray-200" />
      </div>

      {/* Bio Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-4 w-12 mb-2 bg-gray-300" />
        <Skeleton className="h-24 w-full rounded-lg bg-gray-200" />
      </div>

      {/* Font Selector and Color Options Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Font Selector */}
        <div>
          <Skeleton className="h-4 w-20 mb-2 bg-gray-300" />
          <Skeleton className="h-12 rounded-lg bg-gray-200" />
        </div>

        {/* Primary Text Color */}
        <div>
          <Skeleton className="h-4 w-32 mb-2 bg-gray-300" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-8 h-8 rounded-full bg-gray-300" />
            ))}
          </div>
        </div>

        {/* Secondary Text Color */}
        <div>
          <Skeleton className="h-4 w-36 mb-2 bg-gray-300" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-8 h-8 rounded-full bg-gray-300" />
            ))}
          </div>
        </div>

        {/* Theme Color */}
        <div>
          <Skeleton className="h-4 w-24 mb-2 bg-gray-300" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-8 h-8 rounded-full bg-gray-300" />
            ))}
          </div>
        </div>
      </div>

      {/* Toggle Switches Row */}
      <div className="flex gap-4 mb-6 items-center">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="h-4 w-40 bg-gray-300" />
          <Skeleton className="w-12 h-6 rounded-full bg-gray-300" />
        </div>
        <Skeleton className="h-12 w-48 rounded-lg bg-gray-200" />
      </div>

      {/* Web3 Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-4 w-36 bg-gray-300" />
        <Skeleton className="w-12 h-6 rounded-full bg-gray-300" />
      </div>

      {/* ENS Name Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-4 w-28 mb-2 bg-gray-300" />
        <Skeleton className="h-12 w-full rounded-lg bg-gray-200" />
      </div>

      {/* Gated Access Toggle */}
      <div className="flex items-center gap-2 mb-8">
        <Skeleton className="h-4 w-28 bg-gray-300" />
        <Skeleton className="w-12 h-6 rounded-full bg-gray-300" />
      </div>

      {/* Action Buttons Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-14 w-full rounded-lg bg-gray-300" />
        <Skeleton className="h-14 w-full rounded-lg bg-gray-200" />
      </div>
    </div>
  );
};

export default Loading;
