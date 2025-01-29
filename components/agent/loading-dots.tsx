export function LoadingDots() {
  return (
    <div className="flex space-x-1.5 items-center">
      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" />
      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-150" />
      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse delay-300" />
    </div>
  );
}
