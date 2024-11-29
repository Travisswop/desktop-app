import { Button } from '@/components/ui/button';
import { Settings, Download } from 'lucide-react';
import RecentLeadsSlider from '@/components/analytics/recent-leads-slider';
import SmartSiteSlider from '@/components/analytics/smartsite-slider';
import SmartSiteAnalytics from '@/components/analytics/smartsite-analytics';
import QrcodeGenerator from './qrcode-generator';
import { UserData } from '@/lib/UserContext';
import { Parser } from 'json2csv';

export default function DashboardAnalytics({
  data,
}: {
  data: UserData | null;
}) {
  const handleExportLeads = () => {
    // Define the fields you want in the CSV
    const fields = ['name', 'jobTitle', 'email', 'mobileNo'];

    const dataToDownload = data?.subscribers;

    // Use json2csv parser to convert the data
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(dataToDownload || []);

    // Create a blob and download the file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Swop-Leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">
              SmartSite Analytics
            </h1>
          </div>

          {/* Stats Grid */}
          <SmartSiteAnalytics
            followers={data?.followers || 0}
            leads={data?.subscribers?.length || 0}
          />

          {/* Recent Leads */}
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Recent Leads
            </h2>
            <RecentLeadsSlider
              leads={data?.subscribers || []}
              microsites={data?.microsites || []}
            />
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleExportLeads}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Leads to CSV
            </Button>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Profile Card */}
          <SmartSiteSlider microsites={data?.microsites || []} />

          {/* Qrcode */}
          <QrcodeGenerator />
        </div>
      </div>
    </div>
  );
}
