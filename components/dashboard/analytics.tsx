import { Button } from '@/components/ui/button';
import { Settings, Download } from 'lucide-react';
import RecentLeadsSlider from '@/components/analytics/recent-leads-slider';
import SmartSiteSlider from '@/components/analytics/smartsite-slider';
import SmartSiteAnalytics from '@/components/analytics/smartsite-analytics';
import QrcodeGenerator from './qrcode-generator';

export default function DashboardAnalytics() {
  return (
    <div className="bg-white rounded-lg p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">
              SmartSite Analytics
            </h1>
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
            <h2 className="text-lg font-semibold">Smartsites</h2>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage Sites
            </Button>
          </div>

          {/* Profile Card */}
          <SmartSiteSlider />

          {/* Qrcode */}
          <QrcodeGenerator />
        </div>
      </div>
    </div>
  );
}
