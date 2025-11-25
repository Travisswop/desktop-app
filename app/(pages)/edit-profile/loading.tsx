// components/LoadingProfile.tsx
"use client";
import { Skeleton } from "@/components/ui/skeleton";

const LoadingProfile = () => {
  return (
    <div className="lg:mx-10 p-6 bg-white">
      {/* Header */}
      <div className="text-center mb-8">
        <Skeleton className="h-8 w-64 mx-auto mb-2" />
        <Skeleton className="h-4 w-80 mx-auto" />
      </div>

      {/* Profile Image */}
      <div className="flex flex-col items-center mb-8">
        <Skeleton className="h-32 w-32 rounded-full mb-4" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Name and Bio Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>

        {/* Phone and Email Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>

        {/* Birth Date and Address Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-center mt-8">
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
    </div>
  );
};

export default LoadingProfile;
