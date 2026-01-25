import type { SessionStep } from "@/lib/polymarket/session";

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
  const isProcessing = currentStep !== "idle" && currentStep !== "complete";

  if (isComplete) {
    return (
      <button
        onClick={onEnd}
        className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-lg transition-colors border border-red-500/30"
      >
        End Session
      </button>
    );
  }

  return (
    <button
      onClick={onInitialize}
      disabled={isProcessing}
      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
    >
      {isProcessing ? "Initializing..." : "Initialize Trading Session"}
    </button>
  );
}
