import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, CheckCircle2, Download } from 'lucide-react';
import RecentLeadsSlider from '@/components/analytics/recent-leads-slider';
import SmartSiteSlider from '@/components/analytics/smartsite-slider';

interface StatCard {
  title: string;
  value: number;
  change: number;
  period: string;
}

const stats: StatCard[] = [
  { title: 'Leads', value: 34, change: 24, period: '30 days' },
  { title: 'Orders', value: 34, change: 3, period: '30 days' },
  { title: 'Followers', value: 34, change: 24, period: '30 days' },
  {
    title: 'Swopple Point',
    value: 34,
    change: -24,
    period: '30 days',
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
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="mb-2">
                      <span className="text-md text-muted-foreground">
                        {stat.title}
                      </span>
                    </div>
                    <div className="text-2xl font-bold">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.period}
                    </div>
                  </div>
                  <div>
                    <Badge
                      className={`${
                        stat.change > 0
                          ? 'bg-green-400 text-green-500'
                          : 'bg-red-400 text-red-500'
                      } bg-opacity-10 px-4 py-2 rounded-xl font-bold text-sm`}
                    >
                      {stat.change > 0 ? '+' : ''}
                      {stat.change}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

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
    </div>
  );
}
