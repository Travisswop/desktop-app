interface SessionStatusProps {
  isComplete: boolean | undefined;
}

export default function SessionStatus({ isComplete }: SessionStatusProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold">Trading Session</h3>
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          isComplete
            ? "bg-green-500/20 text-green-400"
            : "bg-yellow-500/20 text-yellow-400"
        }`}
      >
        {isComplete ? "Ready" : "Not Ready"}
      </span>
    </div>
  );
}
