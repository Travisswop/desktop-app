"use client";

import { useTrading } from "@/providers/polymarket";

export default function GeoBlockedBanner() {
  const { isGeoblocked, isGeoblockLoading, geoblockStatus } = useTrading();

  if (isGeoblockLoading || !isGeoblocked) {
    return null;
  }

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <h4 className="text-red-400 font-semibold mb-1">
            Trading Not Available
          </h4>
          <p className="text-red-300 text-sm">
            Polymarket is not available in your region
            {geoblockStatus?.country && ` (${geoblockStatus.country})`}.
            Trading functionality is disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
