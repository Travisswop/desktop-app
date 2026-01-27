'use client';

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
      <h3 className="text-lg font-bold text-gray-900">
        Positions ({positionCount})
      </h3>
      <button
        onClick={onToggleHideDust}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          hideDust
            ? 'bg-black text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {hideDust ? 'Show Dust' : 'Hide Dust'}
      </button>
    </div>
  );
}
