"use client";

import { usePolymarketWallet } from "@/providers/polymarket";

import SessionInfo from "./SessionInfo";
import SessionStatus from "./SessionStatus";
import SessionSuccess from "./SessionSuccess";
import SessionActions from "./SessionActions";
import SessionProgress from "./SessionProgress";

import type {
  TradingSession as TradingSessionType,
  SessionStep,
} from "@/lib/polymarket/session";

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
    <div className="bg-white/5 backdrop-blur-md rounded-lg p-6 border border-white/10">
      <SessionStatus isComplete={isComplete} />
      <SessionInfo isComplete={isComplete} />
      <SessionProgress currentStep={currentStep} />
      {isComplete && session && <SessionSuccess session={session} />}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-4 mb-4">
          <p className="text-sm text-red-300 font-medium mb-2">Error</p>
          <pre className="text-xs text-red-400 whitespace-pre-wrap">
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
