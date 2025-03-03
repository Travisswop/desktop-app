import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatCard {
  title: string;
  value: number;
  change: number;
  period: string;
}

export default function SmartSiteAnalytics({
  followers,
  leads,
}: {
  followers: number;
  leads: number;
}) {
  const stats: StatCard[] = [
    { title: 'Leads', value: leads, change: 24, period: '30 days' },
    { title: 'Orders', value: 0, change: 0, period: '30 days' },
    {
      title: 'Followers',
      value: followers,
      change: 24,
      period: '30 days',
    },
    {
      title: 'Swopple Point',
      value: 0,
      change: 0,
      period: '30 days',
    },
  ];

  return (
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
              <div className="text-2xl font-bold">{stat.value}</div>
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
  );
}
