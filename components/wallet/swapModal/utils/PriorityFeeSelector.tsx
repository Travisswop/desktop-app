import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

export type PriorityLevel = 'none' | 'medium' | 'high' | 'veryHigh';

interface PriorityFeeSelectorProps {
  priorityLevel: PriorityLevel;
  setPriorityLevel: (level: PriorityLevel) => void;
}

export default function PriorityFeeSelector({
  priorityLevel,
  setPriorityLevel,
}: PriorityFeeSelectorProps) {
  const options = [
    { value: 'none', label: 'Default', color: 'bg-gray-200' },
    { value: 'medium', label: 'Medium', color: 'bg-green-200' },
    { value: 'high', label: 'Fast', color: 'bg-yellow-200' },
    { value: 'veryHigh', label: 'Fastest', color: 'bg-red-200' },
  ];

  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
        <Zap className="w-3 h-3" />
        <span>Transaction Priority</span>
      </div>
      <div className="flex gap-1">
        {options.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            size="sm"
            className={`flex-1 text-xs py-1 h-auto ${
              priorityLevel === option.value
                ? `${option.color} border-2`
                : ''
            }`}
            onClick={() =>
              setPriorityLevel(option.value as PriorityLevel)
            }
          >
            {option.label}
          </Button>
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {priorityLevel === 'none'
          ? 'Standard network fee'
          : priorityLevel === 'medium'
          ? 'Medium priority for faster processing'
          : priorityLevel === 'high'
          ? 'High priority for quick processing'
          : 'Maximum priority for instant processing'}
      </div>
    </div>
  );
}
