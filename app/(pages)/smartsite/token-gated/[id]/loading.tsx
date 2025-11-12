"use client";
import { Skeleton } from "@/components/ui/skeleton";

const Loading = () => {
  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg">
      {/* Title */}
      <div className="flex justify-center mb-8">
        <Skeleton className="h-8 w-52 bg-gray-300" />
      </div>

      {/* On/Off and Token Type Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* On/Off Section */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 bg-gray-300" />
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 bg-gray-300 rounded-full" />
            <Skeleton className="h-11 flex-1 bg-gray-200 rounded-full" />
          </div>
        </div>

        {/* Token Type Section */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 bg-gray-300" />
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 bg-gray-300 rounded-full" />
            <Skeleton className="h-11 flex-1 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>

      {/* Select Token and Forward Link Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Select Token */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 bg-gray-300" />
          <Skeleton className="h-11 w-full bg-gray-200 rounded-lg" />
        </div>

        {/* Forward Link */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 bg-gray-300" />
          <Skeleton className="h-11 w-full bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Min Required */}
      <div className="space-y-2 mb-6">
        <Skeleton className="h-4 w-32 bg-gray-300" />
        <Skeleton className="h-11 w-full bg-gray-200 rounded-lg" />
      </div>

      {/* Upload Cover Image Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 mb-6">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="w-20 h-20 bg-gray-300 rounded-lg" />
          <Skeleton className="h-10 w-44 bg-gray-300 rounded-lg" />
        </div>
      </div>

      {/* Save Button */}
      <Skeleton className="h-12 w-full bg-gray-300 rounded-lg" />
    </div>
  );
};

export default Loading;
