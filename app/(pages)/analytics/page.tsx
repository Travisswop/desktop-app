import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, CheckCircle2, Download } from 'lucide-react';
import RecentLeadsSlider from '@/components/analytics/recent-leads-slider';
import SmartSiteSlider from '@/components/analytics/smartsite-slider';
import SmartSiteAnalytics from '@/components/analytics/smartsite-analytics';
import ViewerAnalytics from '@/components/analytics/viewer-analytics';

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
          <SmartSiteAnalytics />

          {/* Recent Leads */}
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Recent Leads
            </h2>
            <RecentLeadsSlider />
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
          <Card>
            <CardContent className="p-0 h-[200px] bg-gray-100 rounded-lg">
              {/* Map placeholder - Replace with actual map component */}
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Map View
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <ViewerAnalytics />
    </div>
  );
}
