"use client";
import RecentLeadsSlider from "@/components/analytics/recent-leads-slider";
import SmartSiteAnalytics from "@/components/analytics/smartsite-analytics";
import SmartSiteSlider from "@/components/analytics/smartsite-slider";
import ViewerAnalytics from "@/components/analytics/viewer-analytics";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/UserContext";
import { LocationInfo } from "@/types/map";
import { CheckCircle2, Download } from "lucide-react";
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

export default function AnalyticsView({ viewersData }: any) {
  const { user, loading } = useUser();

  if (loading || !user) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="pb-8 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6 bg-white rounded-xl p-8">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{user.name}</h1>
            <CheckCircle2 className="text-blue-500 h-5 w-5" />
          </div>

          {/* Stats Grid */}
          <SmartSiteAnalytics
            followers={user.followers}
            leads={user.subscribers.length}
          />

          {/* Recent Leads */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Recent Leads</h2>
            <RecentLeadsSlider
              leads={user.subscribers}
              microsites={user.microsites || []}
            />
            <Button variant="outline" className="w-full mt-4">
              <Download className="h-4 w-4 mr-2" />
              Export Leads to CSV
            </Button>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Profile Card */}
          <SmartSiteSlider microsites={user.microsites || []} />

          {/* Map */}
          {/* <ConnectionMap locations={locations} /> */}
        </div>
      </div>
      <ViewerAnalytics viewersData={viewersData} />
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="max-w-full mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6 bg-white rounded-xl p-8">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-48" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>

          {/* Recent Leads */}
          <div>
            <Skeleton className="h-6 w-36 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-10 w-full mt-4" />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Profile Card Skeleton */}
          <div className="bg-white rounded-xl p-6">
            <Skeleton className="h-6 w-36 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>

          {/* QR Code Skeleton */}
          <div className="bg-white rounded-xl p-6">
            <Skeleton className="h-6 w-36 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
