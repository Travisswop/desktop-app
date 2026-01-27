"use client";

interface OutcomeSelectorProps {
  selectedOutcome: "yes" | "no";
  onOutcomeChange: (outcome: "yes" | "no") => void;
  yesPrice: number;
  noPrice: number;
  side?: "BUY" | "SELL";
}

export default function OutcomeSelector({
  selectedOutcome,
  onOutcomeChange,
  yesPrice,
  noPrice,
  side = "BUY",
}: OutcomeSelectorProps) {
  const formatPriceCents = (price: number) => {
    const cents = Math.round(price * 100);
    return `${cents}¢`;
  };

  // For sell mode, use different styling (green for selected Yes, gray outline for No)
  const getYesButtonStyle = () => {
    if (selectedOutcome === "yes") {
      return side === "SELL"
        ? "bg-green-500 border-2 border-green-500 text-white"
        : "bg-green-50 border-2 border-green-500 text-green-600";
    }
    return "bg-gray-100 border-2 border-transparent text-gray-500 hover:border-gray-300";
  };

  const getNoButtonStyle = () => {
    if (selectedOutcome === "no") {
      return side === "SELL"
        ? "bg-red-500 border-2 border-red-500 text-white"
        : "bg-red-50 border-2 border-red-500 text-red-600";
    }
    return "bg-gray-100 border-2 border-transparent text-gray-500 hover:border-gray-300";
  };

  return (
    <div className="flex gap-2 mb-5">
      <button
        onClick={() => onOutcomeChange("yes")}
        className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${getYesButtonStyle()}`}
      >
        Yes {formatPriceCents(yesPrice)}
      </button>
      <button
        onClick={() => onOutcomeChange("no")}
        className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${getNoButtonStyle()}`}
      >
        No {formatPriceCents(noPrice)}
      </button>
    </div>
  );
}
