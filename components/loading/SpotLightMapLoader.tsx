const SpotLightMapLoader = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {/* Map Container Skeleton */}
      <div className="relative w-full h-[600px] bg-gray-200 rounded-2xl overflow-hidden shadow-lg">
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Map background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-300 via-gray-200 to-gray-300" />

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
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="gray"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Multiple marker placeholders */}
        <div className="absolute top-[35%] left-[45%] w-10 h-10 bg-gray-400 rounded-full animate-pulse shadow-lg" />
        <div className="absolute top-[55%] left-[60%] w-8 h-8 bg-gray-300 rounded-full animate-pulse shadow-md" />
        <div className="absolute top-[40%] left-[30%] w-6 h-6 bg-gray-300 rounded-full animate-pulse shadow-md" />
      </div>
    </div>
  );
};
export default SpotLightMapLoader;
