"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Link2, MoreHorizontal } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { PrimaryButton } from "../ui/Button/PrimaryButton";

interface MetricCardProps {
  title: string;
  value: number;
  period: string;
  trend: number;
  icon: LucideIcon;
}

interface InsightsProps {
  totalTaps: {
    value: number;
    period: string;
    trend: number;
  };
  leads: {
    value: number;
    period: string;
    trend: number;
  };
  connections: {
    value: number;
    period: string;
    trend: number;
  };
  onViewClick?: () => void;
  showViewButton?: boolean;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  period,
  trend,
  icon: Icon,
}) => {
  const isPositive = trend > 0;
  const trendSign = isPositive ? "+" : "";

  return (
    <Card className="flex-1">
      <CardContent className="p-4">
        {/* Header with title and icon */}
        <div className="flex items-center justify-between mb-3 border-b -mx-4 px-4 pb-3">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <div className="border-2 rounded border-black">
            <Icon className="h-4 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Value */}
          <div className="mb-1">
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{period}</p>
          </div>

          {/* Period and Trend */}

          <div className="inline-flex items-center rounded-lg bg-green-100 dark:bg-green-950 px-3 py-2 text-xs font-medium text-green-700 dark:text-green-400">
            {trendSign}
            {trend}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Insights: React.FC<InsightsProps> = ({
  totalTaps,
  leads,
  connections,
  onViewClick,
  showViewButton = true,
  className = "",
}) => {
  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Insights</h2>
        {showViewButton && (
          <PrimaryButton onClick={onViewClick} className="text-sm">
            View
          </PrimaryButton>
        )}
      </div>

      {/* Metric Cards */}
      <div className="flex flex-wrap gap-4">
        <MetricCard
          title="Total Taps"
          value={totalTaps.value}
          period={totalTaps.period}
          trend={totalTaps.trend}
          icon={MoreHorizontal}
        />
        <MetricCard
          title="Leads"
          value={leads.value}
          period={leads.period}
          trend={leads.trend}
          icon={MoreHorizontal}
        />
        <MetricCard
          title="Connection"
          value={connections.value}
          period={connections.period}
          trend={connections.trend}
          icon={MoreHorizontal}
        />
      </div>
    </div>
  );
};

export default Insights;
