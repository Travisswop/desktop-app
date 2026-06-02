const SpotLightMapLoader = () => {
  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)] w-full flex-col items-center justify-center overflow-hidden">
      {/* Map Container Skeleton */}
      <div className="relative h-full min-h-[calc(100vh-6rem)] w-full overflow-hidden bg-sky-100">
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Map background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-200 via-emerald-100 to-blue-100" />

        {/* Simulated map grid */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2563eb" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Multiple marker placeholders */}
        <div className="absolute left-[45%] top-[35%] h-10 w-10 animate-pulse rounded-full bg-emerald-400 shadow-lg" />
        <div className="absolute left-[60%] top-[55%] h-8 w-8 animate-pulse rounded-full bg-sky-400 shadow-md" />
        <div className="absolute left-[30%] top-[40%] h-6 w-6 animate-pulse rounded-full bg-violet-400 shadow-md" />
      </div>
    </div>
  );
};
export default SpotLightMapLoader;
