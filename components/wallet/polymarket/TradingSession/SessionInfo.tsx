interface SessionInfoProps {
  isComplete: boolean | undefined;
}

export default function SessionInfo({ isComplete }: SessionInfoProps) {
  if (isComplete) return null;

  return (
    <div className="mb-4">
      <p className="text-gray-500 text-sm">
        Initialize your trading session to start placing orders on Polymarket.
        This will:
      </p>
      <ul className="mt-2 space-y-1 text-sm text-gray-500">
        <li className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-black rounded-full" />
          Deploy a Safe wallet for secure trading
        </li>
        <li className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-black rounded-full" />
          Create your Polymarket API credentials
        </li>
        <li className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-black rounded-full" />
          Set token approvals for trading
        </li>
      </ul>
    </div>
  );
}
