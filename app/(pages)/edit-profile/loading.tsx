// components/LoadingProfile.tsx
"use client";
import { BentoCard } from "@/components/ui/bento";
import { Skeleton } from "@/components/ui/skeleton";

const LoadingProfile = () => {
  return (
    <section className="-m-6 min-h-[calc(100%+3rem)] bg-[#fafafa] px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-[855px]">
        {/* Header */}
        <div className="mb-3">
          <Skeleton className="h-7 w-44 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>

        <BentoCard padding="p-5 sm:p-7" className="mb-5">
          {/* Profile header */}
          <div className="mb-7 flex items-center gap-4 border-b border-black/[0.06] pb-6">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-56" />
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`space-y-2 ${i === 5 ? "sm:col-span-2" : ""}`}
              >
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default LoadingProfile;
