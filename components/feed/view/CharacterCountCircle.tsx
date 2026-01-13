import React from "react";
import { cn } from "@/lib/utils";

interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

const CharacterCounter = ({
  current,
  max,
  className,
}: CharacterCounterProps) => {
  const percentage = (current / max) * 100;
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color logic similar to X/Twitter
  const getColor = () => {
    if (current > max) return "hsl(var(--destructive))";
    if (percentage > 90) return "hsl(var(--warning))";
    return "hsl(var(--primary))";
  };

  const remaining = max - current;
  const showNumber = current > max * 0.8; // Show number when 80% reached

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showNumber && (
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            current > max && "text-destructive",
            percentage > 90 && current <= max && "text-warning",
            percentage <= 90 && "text-muted-foreground"
          )}
        >
          {remaining}
        </span>
      )}
      <svg width="24" height="24" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="2.5"
        />
        {/* Progress circle */}
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
    </div>
  );
};

export { CharacterCounter };
