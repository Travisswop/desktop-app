"use client";
import { Skeleton } from "@/components/ui/skeleton";

const QRCustomizeLoading = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
      {/* Left Side - Customization Options */}
      <div className="space-y-6">
        {/* Title */}
        <Skeleton className="h-8 w-40 bg-gray-300" />

        {/* Choose A Pattern Section */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-32 bg-gray-300" />
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-16 h-16 bg-gray-300 rounded-md" />
            ))}
          </div>
        </div>

        {/* Pick QR Color Section */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-28 bg-gray-300" />
          <Skeleton className="h-12 w-full bg-gray-200 rounded-lg" />
        </div>

        {/* Default QR Colors Section */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-36 bg-gray-300" />
          <div className="flex gap-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton
                key={i}
                className="w-10 h-10 rounded-full bg-gray-300"
              />
            ))}
          </div>
        </div>

        {/* Choose Background Color Section */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-48 bg-gray-300" />
          <Skeleton className="h-12 w-full bg-gray-200 rounded-lg" />
        </div>

        {/* Default Background Colors Section */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-52 bg-gray-300" />
          <div className="flex gap-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton
                key={i}
                className="w-10 h-10 rounded-full bg-gray-300"
              />
            ))}
          </div>
        </div>

        {/* Edit Logo Section */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-24 bg-gray-300" />
          <Skeleton className="h-11 w-36 bg-gray-300 rounded-full" />
        </div>

        {/* Save Changes Button */}
        <Skeleton className="h-11 w-40 bg-gray-300 rounded-full mt-6" />
      </div>

      {/* Right Side - Live Preview */}
      <div className="flex flex-col items-center space-y-4">
        {/* Live Preview Title */}
        <Skeleton className="h-6 w-28 bg-gray-300" />

        {/* QR Code Preview */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <Skeleton className="w-64 h-64 bg-gray-300 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default QRCustomizeLoading;
