import type { SessionStep } from '@/lib/polymarket/session';

interface SessionActionsProps {
  isComplete: boolean | undefined;
  currentStep: SessionStep;
  onInitialize: () => Promise<void>;
  onEnd: () => void;
}

export default function SessionActions({
  isComplete,
  currentStep,
  onInitialize,
  onEnd,
}: SessionActionsProps) {
  const isProcessing = currentStep !== 'idle' && currentStep !== 'complete';

  if (isComplete) {
    return (
      <button
        onClick={onEnd}
        className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors border border-red-200"
      >
        End Session
      </button>
    );
  }

  return (
    <button
      onClick={onInitialize}
      disabled={isProcessing}
      className="w-full py-3 bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
    >
      {isProcessing ? 'Initializing...' : 'Initialize Trading Session'}
    </button>
  );
}
