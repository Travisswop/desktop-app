interface SessionStatusProps {
  isComplete: boolean | undefined;
}

export default function SessionStatus({ isComplete }: SessionStatusProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold text-gray-900">Trading Session</h3>
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          isComplete
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'bg-amber-100 text-amber-700 border border-amber-200'
        }`}
      >
        {isComplete ? 'Ready' : 'Not Ready'}
      </span>
    </div>
  );
}
