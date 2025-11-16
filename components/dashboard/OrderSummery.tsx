"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrimaryButton } from "../ui/Button/PrimaryButton";

interface StatItemProps {
  label: string;
  value: string | number;
  valueColor?: "green" | "blue" | "default";
}

interface OrdersStatsProps {
  totalMints: number;
  totalRevenue: number;
  inEscrow: number;
  closedOrders: number;
  openOrders: number;
  disputes: number;
  onViewClick?: () => void;
  showViewButton?: boolean;
}

const StatItem: React.FC<StatItemProps> = ({
  label,
  value,
  valueColor = "default",
}) => {
  const getValueColorClass = () => {
    switch (valueColor) {
      case "green":
        return "text-green-600";
      case "blue":
        return "text-blue-600";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${getValueColorClass()}`}>
        {value}
      </p>
    </div>
  );
};

const OrdersStats: React.FC<OrdersStatsProps> = ({
  totalMints,
  totalRevenue,
  inEscrow,
  closedOrders,
  openOrders,
  disputes,
  onViewClick,
  showViewButton = true,
}) => {
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="w-full">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Orders</h2>
            <p className="text-sm text-muted-foreground">Payments</p>
          </div>
          {showViewButton && (
            <PrimaryButton onClick={onViewClick} className="text-sm">
              View
            </PrimaryButton>
          )}
        </div>

        {/* Top Row - Green and Blue Stats */}
        <div className="grid grid-cols-3 gap-6 mb-6 pb-6 border-b">
          <StatItem
            label="Total Mints:"
            value={totalMints.toLocaleString()}
            valueColor="green"
          />
          <StatItem
            label="Total Revenue:"
            value={formatCurrency(totalRevenue)}
            valueColor="green"
          />
          <StatItem
            label="$ In Escrow:"
            value={formatCurrency(inEscrow)}
            valueColor="blue"
          />
        </div>

        {/* Bottom Row - Default Stats */}
        <div className="grid grid-cols-3 gap-6">
          <StatItem label="Closed Orders" value={closedOrders} />
          <StatItem label="Open Orders" value={openOrders} />
          <StatItem label="Disputes" value={disputes} />
        </div>
      </div>
    </div>
  );
};

export default OrdersStats;
