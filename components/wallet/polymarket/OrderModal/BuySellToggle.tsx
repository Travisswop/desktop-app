"use client";

import { useState, useRef, useEffect } from "react";

export type OrderVariant = "market" | "fak" | "limit" | "gtd";

const ORDER_OPTIONS: { value: OrderVariant; label: string; description: string }[] = [
  { value: "market", label: "Market", description: "All-or-nothing fill" },
  { value: "fak", label: "Market (FAK)", description: "Fill what's available" },
  { value: "limit", label: "Limit", description: "Rest on book" },
  { value: "gtd", label: "Limit (GTD)", description: "Expires automatically" },
];

function orderVariantLabel(v: OrderVariant): string {
  return ORDER_OPTIONS.find((o) => o.value === v)?.label ?? "Market";
}

interface BuySellToggleProps {
  side: "BUY" | "SELL";
  onSideChange: (side: "BUY" | "SELL") => void;
  orderType: OrderVariant;
  onOrderTypeChange: (type: OrderVariant) => void;
}

export default function BuySellToggle({
  side,
  onSideChange,
  orderType,
  onOrderTypeChange,
}: BuySellToggleProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between mb-4">
      {/* Buy/Sell Tabs */}
      <div className="flex gap-1">
        <button
          onClick={() => onSideChange("BUY")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
            side === "BUY"
              ? "text-gray-900"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => onSideChange("SELL")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
            side === "SELL"
              ? "text-gray-900"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Order Type Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          {orderVariantLabel(orderType)}
          <svg
            className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-10 min-w-[160px]">
            {ORDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onOrderTypeChange(opt.value);
                  setIsDropdownOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left transition-colors ${
                  orderType === opt.value
                    ? "bg-gray-100"
                    : "hover:bg-gray-50"
                }`}
              >
                <p className={`text-sm font-medium ${orderType === opt.value ? "text-gray-900" : "text-gray-600"}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-400">{opt.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
