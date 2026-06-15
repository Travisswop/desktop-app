"use client";

import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ViewData {
  day: string;
  date: string;
  views: number;
}

interface ViewerDataEntry {
  createdAt: string;
  viewerName?: string;
  micrositeName?: string;
  device?: string;
  country?: string;
}

function generateCurrentWeekData(): ViewData[] {
  const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

  return Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(startOfCurrentWeek, index);

    return {
      day: format(date, "EEE"),
      date: format(date, "yyyy-MM-dd"),
      views: 0,
    };
  });
}

function getWeeklyViewData(viewersData?: ViewerDataEntry[]): ViewData[] {
  const weekData = generateCurrentWeekData();

  viewersData?.forEach(({ createdAt }) => {
    const createdAtDate = new Date(createdAt);

    if (Number.isNaN(createdAtDate.getTime())) {
      return;
    }

    weekData.forEach((dayData) => {
      if (isSameDay(createdAtDate, new Date(dayData.date))) {
        dayData.views += 1;
      }
    });
  });

  return weekData;
}

export default function ViewerAnalytics({
  viewersData,
}: {
  viewersData?: ViewerDataEntry[];
}) {
  const viewsData = getWeeklyViewData(viewersData);

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">List of Viewers</CardTitle>
        </CardHeader>
        <CardContent>
          {viewersData?.length ? (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Microsite</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Country</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewersData.slice(0, 6).map((viewer, index) => (
                    <TableRow key={`${viewer.createdAt}-${index}`}>
                      <TableCell>{viewer.viewerName || "Unknown"}</TableCell>
                      <TableCell>{viewer.micrositeName || "Unknown"}</TableCell>
                      <TableCell>{viewer.device || "Unknown"}</TableCell>
                      <TableCell>{viewer.country || "Unknown"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="mt-20 text-center">Viewers data not available</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium">Views Per Day</CardTitle>
          <Info className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="mt-4 h-[300px]">
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
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `${value / 1000}k`;
                    }

                    return value;
                  }}
                />
                <Tooltip />
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
