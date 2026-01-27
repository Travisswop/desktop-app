interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({
  message = 'Loading...',
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
