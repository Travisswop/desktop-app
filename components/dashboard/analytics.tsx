import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import RecentLeadsSlider from "@/components/analytics/recent-leads-slider";
import SmartSiteSlider from "@/components/analytics/smartsite-slider";
import SmartSiteAnalytics from "@/components/analytics/smartsite-analytics";

import { UserData } from "@/lib/UserContext";
import { Parser } from "json2csv";
import CreateQRCode from "./create-qrcode";
import { Toaster } from "../ui/toaster";

export default function DashboardAnalytics({
  data,
}: {
  data: UserData | null;
}) {
  const handleExportLeads = () => {
    // Define the fields you want in the CSV
    const fields = ["name", "jobTitle", "email", "mobileNo"];

    const dataToDownload = data?.subscribers;

    // Use json2csv parser to convert the data
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(dataToDownload || []);

    // Create a blob and download the file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Swop-Leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 2xl:gap-x-8">
        {/* Left Column */}
        <div className="space-y-6 bg-white rounded-xl p-8">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">SmartSite Analytics</h1>
          </div>

          {/* Stats Grid */}
          <SmartSiteAnalytics
            followers={data?.followers || 0}
            leads={data?.subscribers?.length || 0}
          />

          {/* Recent Leads */}
          <div className="w-full">
            <h2 className="text-lg font-semibold mb-4">Recent Leads</h2>
            <RecentLeadsSlider
              leads={data?.subscribers || []}
              microsites={data?.microsites || []}
            />
            <div className="flex justify-center">
              <Button
                variant="outline"
                className="mt-4 mx-auto"
                onClick={handleExportLeads}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Leads to CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 overflow-hidden">
          {/* Profile Card */}
          <SmartSiteSlider microsites={data?.microsites || []} />

          {/* Qrcode */}
          {/* <QrcodeGenerator /> */}
          <CreateQRCode />
        </div>
        <Toaster />
      </div>
    </div>
  );
}
