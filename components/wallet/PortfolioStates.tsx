/**
 * Portfolio loading and empty state components
 */

export function PortfolioChartSkeleton() {
  return (
    <div className="w-full p-5">
      <div className="flex flex-row items-center justify-between pb-2">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="pt-6">
        <div className="flex items-center justify-center gap-8">
          <div className="h-[200px] w-[200px] bg-gray-200 rounded-full animate-pulse" />
          <div className="flex flex-col gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortfolioEmptyState() {
  return (
    <div className="w-full p-5">
      <div className="flex flex-row items-center justify-between pb-2">
        <h2 className="text-lg font-semibold">Portfolio</h2>
      </div>
      <div className="pt-6 pb-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-gray-600 font-medium mb-1">No tokens found</p>
        <p className="text-sm text-gray-500">
          Connect your wallet to view your portfolio.
        </p>
      </div>
    </div>
  );
}
