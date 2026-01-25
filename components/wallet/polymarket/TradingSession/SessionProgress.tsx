import type { SessionStep } from "@/lib/polymarket/session";

interface SessionProgressProps {
  currentStep: SessionStep;
}

const steps: { id: SessionStep; label: string }[] = [
  { id: "checking", label: "Checking session..." },
  { id: "deploying", label: "Deploying Safe wallet..." },
  { id: "credentials", label: "Creating API credentials..." },
  { id: "approvals", label: "Setting token approvals..." },
  { id: "complete", label: "Session ready!" },
];

export default function SessionProgress({ currentStep }: SessionProgressProps) {
  if (currentStep === "idle") return null;

  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="mb-4">
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isComplete = index < currentIndex;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-2 rounded ${
                isActive
                  ? "bg-blue-500/20 border border-blue-500/30"
                  : isComplete
                    ? "bg-green-500/10"
                    : "bg-gray-800/30"
              }`}
            >
              {isActive ? (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : isComplete ? (
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              ) : (
                <div className="w-4 h-4 border border-gray-500 rounded-full" />
              )}
              <span
                className={`text-sm ${
                  isActive
                    ? "text-blue-400 font-medium"
                    : isComplete
                      ? "text-green-400"
                      : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
