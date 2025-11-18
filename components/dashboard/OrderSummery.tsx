"use client";

import React, { useMemo } from "react";
import { PrimaryButton } from "../ui/Button/PrimaryButton";
import Link from "next/link";
import { useUser } from "@/lib/UserContext";
import { useOrderList, OrderListFilters } from "@/lib/hooks/useOrderQueries";
import { Skeleton } from "@/components/ui/skeleton";

interface StatItemProps {
  label: string;
  value: string | number;
  valueColor?: "green" | "blue" | "red" | "default";
  isLoading?: boolean;
}

interface OrdersStatsProps {
  showViewButton?: boolean;
  role?: "seller" | "buyer"; // Optional: specify which data to show (seller = orders, buyer = purchases)
}

const StatItem: React.FC<StatItemProps> = ({
  label,
  value,
  valueColor = "default",
  isLoading = false,
}) => {
  const getValueColorClass = () => {
    switch (valueColor) {
      case "green":
        return "text-green-600";
      case "blue":
        return "text-blue-600";
      case "red":
        return "text-red-600";
      default:
        return "text-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Skeleton className="h-8 w-20" />
      </div>
    );
  }

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
  showViewButton = true,
  role = "seller",
}) => {
  const { accessToken } = useUser();

  // Set up filters for API call
  const filters: OrderListFilters = useMemo(
    () => ({
      role,
      status: "",
      page: 1,
      limit: 10,
      sortBy: "orderDate",
      sortOrder: "desc",
      startDate: "",
      endDate: "",
      deadOrders: "exclude",
      search: "",
      refresh: false,
    }),
    [role]
  );

  // Fetch order data
  const { data, isLoading, isError } = useOrderList(filters, accessToken || "");

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  // Compute stats from API data
  const stats = useMemo(() => {
    if (!data?.summary) {
      return {
        totalMints: 0,
        totalRevenue: 0,
        inEscrow: 0,
        closedOrders: 0,
        openOrders: 0,
        disputes: 0,
      };
    }

    const { summary } = data;
    return {
      totalMints: role === "seller" ? summary.asSeller : summary.asBuyer,
      totalRevenue:
        role === "seller" ? summary.totalEarned || 0 : summary.totalSpent || 0,
      inEscrow: summary.totalInEscrow || 0,
      closedOrders: summary.completed || 0,
      openOrders: (summary.total || 0) - (summary.completed || 0),
      disputes: summary.totalDispute || 0,
    };
  }, [data, role]);

  // Error state
  if (isError) {
    return (
      <div className="w-full">
        <div className="p-5">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Failed to load order statistics. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">
              {role === "seller" ? "Orders" : "Purchases"}
            </h2>
            <p className="text-sm text-muted-foreground">Payments</p>
          </div>
          {showViewButton && (
            <Link href={"/dashboard/order"}>
              <PrimaryButton className="text-sm">View</PrimaryButton>
            </Link>
          )}
        </div>

        {/* Top Row - Green and Blue Stats */}
        <div className="grid grid-cols-3 gap-6 mb-6 pb-6 border-b">
          <StatItem
            label={`Total ${role === "seller" ? "Mints" : "Purchases"}:`}
            value={stats.totalMints.toLocaleString()}
            valueColor="green"
            isLoading={isLoading}
          />
          <StatItem
            label={`Total ${role === "seller" ? "Revenue" : "Spent"}:`}
            value={formatCurrency(stats.totalRevenue)}
            valueColor="green"
            isLoading={isLoading}
          />
          <StatItem
            label="$ In Escrow:"
            value={formatCurrency(stats.inEscrow)}
            valueColor="blue"
            isLoading={isLoading}
          />
        </div>

        {/* Bottom Row - Default Stats */}
        <div className="grid grid-cols-3 gap-6">
          <StatItem
            label="Closed Orders"
            value={stats.closedOrders}
            isLoading={isLoading}
          />
          <StatItem
            label="Open Orders"
            value={stats.openOrders}
            isLoading={isLoading}
          />
          <StatItem
            label="Disputes"
            value={stats.disputes}
            valueColor="red"
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default OrdersStats;
