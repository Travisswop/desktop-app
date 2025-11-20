"use client";

import { Info, RefreshCw } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

// Types
interface MetricCardProps {
  value: number;
  label: string;
  period: string;
}

interface SmartSiteClick {
  id: string;
  name: string;
  avatar: string;
}

interface SocialLink {
  platform: string;
  icon: string;
  count: number;
}

// Metric Card Component
const MetricCard = ({ value, label, period }: MetricCardProps) => (
  <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200">
    <div className="flex items-center gap-2 mb-2">
      <Info className="w-4 h-4 text-gray-400" />
    </div>
    <div className="text-3xl font-bold text-gray-900">{value}</div>
    <div className="text-sm font-medium text-gray-600">{label}</div>
    <div className="text-xs text-gray-400 mt-1">{period}</div>
  </div>
);

// Main Analytics Dashboard Component
export default function AnalyticsDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sample data
  const metrics = [
    { value: 6, label: "Page Visit", period: "30 Days" },
    { value: 27, label: "Leads", period: "30 Days" },
    { value: 7, label: "Page Visit", period: "Life Time" },
    { value: 40, label: "Followers", period: "30 days" },
  ];

  const smartSiteClicks: SmartSiteClick[] = [
    { id: "1", name: "Travis Herron", avatar: "/avatar.png" },
    { id: "2", name: "Travis Herron", avatar: "/avatar.png" },
    { id: "3", name: "Travis Herron", avatar: "/avatar.png" },
    { id: "4", name: "Travis Herron", avatar: "/avatar.png" },
    { id: "5", name: "Travis Herron", avatar: "/avatar.png" },
  ];

  const socialLinks: SocialLink[] = [
    { platform: "X", icon: "𝕏", count: 10 },
    { platform: "LinkedIn", icon: "in", count: 20 },
    { platform: "Bluesky", icon: "☁️", count: 0 },
    { platform: "Facebook", icon: "f", count: 501 },
    { platform: "Github", icon: "", count: 14 },
    { platform: "Instagram", icon: "📷", count: 16 },
    { platform: "Rumble", icon: "R", count: 2 },
    { platform: "Snapchat", icon: "👻", count: 34 },
    { platform: "Truth", icon: "T", count: 0 },
    { platform: "YouTube", icon: "▶", count: 19 },
    { platform: "TikTok", icon: "🎵", count: 117 },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl">
      <div className="">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section - Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">
                Analytics
              </h1>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                disabled={isRefreshing}
              >
                Refresh
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((metric, index) => (
                <MetricCard key={index} {...metric} />
              ))}
            </div>

            {/* Smartsite Clicks Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Smartsite Clicks
              </h2>
              <div className="space-y-3">
                {smartSiteClicks.map((click) => (
                  <div
                    key={click.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          TH
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {click.name}
                      </span>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-lg">›</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Section - User Profile & Social Links */}
          <div className="space-y-6">
            {/* User Profile Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Travis Herron
              </h2>

              {/* Social Links */}
              <div className="space-y-3">
                {socialLinks.map((link, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 text-sm">{link.icon}</span>
                      <span className="text-sm text-gray-700">
                        {link.platform}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {link.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
