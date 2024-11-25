'use client';

export default function PortfolioBalanceSkeleton() {
  const radius = 85;

  return (
    <div className="flex flex-col items-center gap-6 mb-10">
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="24"
            className="animate-pulse"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {/* Skeleton for eye icon */}
          <div className="h-6 w-6 mb-1 bg-gray-300 animate-pulse rounded-full" />

          <div className="text-sm font-medium bg-gray-300 animate-pulse w-24 h-4 rounded" />
          <div className="text-sm font-medium bg-gray-300 animate-pulse w-20 h-4 rounded mt-2" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-gray-300 animate-pulse w-24 h-6 rounded-full px-3 py-1"
          />
        ))}
      </div>
    </div>
  );
}
