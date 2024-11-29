"use client";
import { Button } from "@/components/ui/button";
import { Settings, CheckCircle2, Download } from "lucide-react";
import RecentLeadsSlider from "@/components/analytics/recent-leads-slider";
import SmartSiteSlider from "@/components/analytics/smartsite-slider";
import SmartSiteAnalytics from "@/components/analytics/smartsite-analytics";
import ViewerAnalytics from "@/components/analytics/viewer-analytics";
import { LocationInfo } from "@/types/map";
import dynamic from "next/dynamic";

const ConnectionMap = dynamic(() => import("@/components/analytics/map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] rounded-lg bg-gray-100 animate-pulse" />
  ),
});

const locations: LocationInfo[] = [
  {
    id: 1,
    position: { lat: 40.7128, lng: -74.006 },
    title: "Sarah Johnson",
    role: "Senior Developer",
    description:
      "Full-stack developer with 8 years of experience in React and Node.js",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200",
  },
  {
    id: 2,
    position: { lat: 40.7614, lng: -73.9776 },
    title: "Michael Chen",
    role: "UX Designer",
    description:
      "Creative designer focused on building intuitive user experiences",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200",
  },
  {
    id: 3,
    position: { lat: 40.7527, lng: -73.9772 },
    title: "Emily Rodriguez",
    role: "Product Manager",
    description:
      "Experienced in leading cross-functional teams and delivering successful products",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&h=200",
  },
];

export default function Analytics() {
  return (
    <div className="bg-white rounded-lg p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Travis Herron</h1>
            <CheckCircle2 className="text-blue-500 h-5 w-5" />
          </div>

          {/* Stats Grid */}
          {/* <SmartSiteAnalytics /> */}

          {/* Recent Leads */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Recent Leads</h2>
            {/* <RecentLeadsSlider leads={} /> */}
            <Button variant="outline" className="w-full mt-4">
              <Download className="h-4 w-4 mr-2" />
              Export Leads to CSV
            </Button>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Websites</h2>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage Sites
            </Button>
          </div>

          {/* Profile Card */}
          <SmartSiteSlider />

          {/* Map */}
          <ConnectionMap locations={locations} />
        </div>
      </div>
      <ViewerAnalytics />
    </div>
  );
}
