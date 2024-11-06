'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { Info } from 'lucide-react';

interface Viewer {
  name: string;
  country: string;
  device: string;
}

interface ViewData {
  day: string;
  views: number;
}

const viewers: Viewer[] = [
  { name: 'Travis', country: 'USA', device: 'CPU' },
  { name: 'Salman', country: 'Bangladesh', device: 'Tablet' },
  { name: 'Neel', country: 'Bangladesh', device: 'Phone' },
  { name: 'Sadit', country: 'India', device: 'CPU' },
  { name: 'Abu', country: 'UAE', device: 'Tablet' },
];

const viewsData: ViewData[] = [
  { day: 'Sat', views: 100 },
  { day: 'Sun', views: 500 },
  { day: 'Mon', views: 800 },
  { day: 'Tue', views: 2000 },
  { day: 'Wed', views: 1000 },
  { day: 'Thu', views: 5000 },
  { day: 'Fri', views: 10000 },
];

export default function ViewerAnalytics() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Viewers List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            List of Viewers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Device</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewers.map((viewer) => (
                <TableRow key={viewer.name}>
                  <TableCell>{viewer.name}</TableCell>
                  <TableCell>{viewer.country}</TableCell>
                  <TableCell>{viewer.device}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Views Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">
              Views Per Day
            </CardTitle>
            <p className="text-3xl font-bold mt-2">1155</p>
          </div>
          <Info className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={viewsData}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E5E7EB"
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `${value / 1000}k`;
                    }
                    return value;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#000"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
