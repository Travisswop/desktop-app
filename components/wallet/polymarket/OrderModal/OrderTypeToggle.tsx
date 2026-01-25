"use client";

interface OrderTypeToggleProps {
  orderType: "market" | "limit";
  onChangeOrderType: (type: "market" | "limit") => void;
}

export default function OrderTypeToggle({
  orderType,
  onChangeOrderType,
}: OrderTypeToggleProps) {
  return (
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => onChangeOrderType("market")}
        className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
          orderType === "market"
            ? "bg-blue-600 text-white"
            : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
        }`}
      >
        Market Order
      </button>
      <button
        onClick={() => onChangeOrderType("limit")}
        className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
          orderType === "limit"
            ? "bg-blue-600 text-white"
            : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
        }`}
      >
        Limit Order
      </button>
    </div>
  );
}
