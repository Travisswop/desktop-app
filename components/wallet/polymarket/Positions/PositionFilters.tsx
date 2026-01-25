"use client";

interface PositionFiltersProps {
  positionCount: number;
  hideDust: boolean;
  onToggleHideDust: () => void;
}

export default function PositionFilters({
  positionCount,
  hideDust,
  onToggleHideDust,
}: PositionFiltersProps) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold text-white">
        Positions ({positionCount})
      </h3>
      <button
        onClick={onToggleHideDust}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          hideDust
            ? "bg-blue-500/20 text-blue-400"
            : "bg-gray-700/50 text-gray-400"
        }`}
      >
        {hideDust ? "Show Dust" : "Hide Dust"}
      </button>
    </div>
  );
}
