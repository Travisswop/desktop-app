import type { TradingSession } from '@/lib/polymarket/session';
import { formatAddress } from '@/lib/polymarket/formatting';

interface SessionSuccessProps {
  session: TradingSession;
}

export default function SessionSuccess({ session }: SessionSuccessProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-5 h-5 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-green-700 font-medium">Session Active</span>
      </div>
      <div className="text-sm space-y-1">
        <p className="text-gray-500">
          Safe Address:{' '}
          <span className="text-gray-900 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
            {formatAddress(session.safeAddress)}
          </span>
        </p>
        <p className="text-gray-500">
          EOA Address:{' '}
          <span className="text-gray-900 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
            {formatAddress(session.eoaAddress)}
          </span>
        </p>
      </div>
    </div>
  );
}
