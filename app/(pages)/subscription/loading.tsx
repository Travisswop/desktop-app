// components/PricingLoading.tsx
"use client";
import { Skeleton } from "@/components/ui/skeleton";

const PricingLoading = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto">
      {[1, 2, 3].map((index) => (
        <div
          key={index}
          className={`relative border rounded-2xl p-6 bg-white ${
            index === 3 ? "ring-2 ring-indigo-500" : ""
          }`}
        >
          {/* Recommended Badge for Premium */}
          {index === 3 && (
            <div className="absolute -top-3 right-6">
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
          )}

          {/* Header */}
          <div className="mb-6">
            <Skeleton className="h-7 w-24 mb-3" />
            <Skeleton className="h-4 w-full mb-4" />
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>

          {/* Key Features */}
          <div className="mb-8">
            <Skeleton className="h-5 w-28 mb-4" />
            <div className="space-y-3">
              {Array.from({
                length: index === 3 ? 16 : index === 2 ? 14 : 13,
              }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-sm flex-shrink-0" />
                  <Skeleton
                    className="h-4"
                    style={{ width: `${Math.random() * 40 + 60}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Button */}
          <Skeleton
            className={`h-12 w-full rounded-lg ${
              index === 3 ? "bg-indigo-200" : ""
            }`}
          />
        </div>
      ))}
    </div>
  );
};

export default PricingLoading;
