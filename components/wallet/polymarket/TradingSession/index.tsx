'use client';

import { usePolymarketWallet } from '@/providers/polymarket';

import SessionInfo from './SessionInfo';
import SessionStatus from './SessionStatus';
import SessionSuccess from './SessionSuccess';
import SessionActions from './SessionActions';
import SessionProgress from './SessionProgress';

import type {
  TradingSession as TradingSessionType,
  SessionStep,
} from '@/lib/polymarket/session';

interface Props {
  session: TradingSessionType | null;
  currentStep: SessionStep;
  error: Error | null;
  isComplete: boolean | undefined;
  initialize: () => Promise<void>;
  endSession: () => void;
}

export default function TradingSession({
  session,
  currentStep,
  error,
  isComplete,
  initialize,
  endSession,
}: Props) {
  const { eoaAddress } = usePolymarketWallet();

  if (!eoaAddress) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <SessionStatus isComplete={isComplete} />
      <SessionInfo isComplete={isComplete} />
      <SessionProgress currentStep={currentStep} />
      {isComplete && session && <SessionSuccess session={session} />}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700 font-medium mb-1">Error</p>
          <pre className="text-xs text-red-600 whitespace-pre-wrap">
            {error.message}
          </pre>
        </div>
      )}

      <div className="flex gap-3">
        <SessionActions
          isComplete={isComplete}
          currentStep={currentStep}
          onInitialize={initialize}
          onEnd={endSession}
        />
      </div>
    </div>
  );
}
