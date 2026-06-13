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
  { name: "Travis", country: "USA", device: "CPU" },
  { name: "Salman", country: "Bangladesh", device: "Tablet" },
  { name: "Neel", country: "Bangladesh", device: "Phone" },
  { name: "Sadit", country: "India", device: "CPU" },
  { name: "Abu", country: "UAE", device: "Tablet" },
];

// const viewsData: ViewData[] = [
//   { day: "Sat", views: 100 },
//   { day: "Sun", views: 500 },
//   { day: "Mon", views: 800 },
//   { day: "Tue", views: 2000 },
//   { day: "Wed", views: 1000 },
//   { day: "Thu", views: 5000 },
//   { day: "Fri", views: 10000 },
// ];

export default function ViewerAnalytics({ viewersData }: any) {
  // const generateLastWeekData = (): ViewData[] => {
  //   return Array.from({ length: 7 })
  //     .map((_, index) => {
  //       const date = subDays(new Date(), index);
  //       return { day: format(date, "EEE"), views: 0 }; // EEE => "Mon", "Tue", etc.
  //     })
  //     .reverse();
  // };

  // // Process JSON data into last week's format
  // const getWeeklyViewData = (data: typeof viewersData): ViewData[] => {
  //   const lastWeekData = generateLastWeekData();

  //   viewersData?.forEach((entry) => {
  //     const createdAtDate = new Date(entry.createdAt);
  //     lastWeekData.forEach((dayData) => {
  //       if (
  //         isSameDay(
  //           createdAtDate,
  //           subDays(new Date(), lastWeekData.indexOf(dayData))
  //         )
  //       ) {
  //         dayData.views += 1; // Increment count if the date matches
  //       }
  //     });
  //   });

  //   return lastWeekData;
  // };

  // const viewsData: ViewData[] = getWeeklyViewData(viewersData);

  const generateLastWeekData = (): ViewData[] => {
    const startOfLastWeek = startOfWeek(new Date(), { weekStartsOn: 1 }); // Always start from Monday

    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(startOfLastWeek, index);
      return {
        day: format(date, "EEE"),
        date: format(date, "yyyy-MM-dd"),
        views: 0,
      };
    });
  };

  const getWeeklyViewData = (viewersData: typeof viewersData): ViewData[] => {
    const lastWeekData = generateLastWeekData();

    viewersData?.forEach(({ createdAt }) => {
      const createdAtDate = new Date(createdAt);

      lastWeekData.forEach((dayData) => {
        if (isSameDay(createdAtDate, new Date(dayData.date))) {
          dayData.views += 1;
        }
      });
    });

    return lastWeekData;
  };

  const viewsData: ViewData[] = getWeeklyViewData(viewersData);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Viewers List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">List of Viewers</CardTitle>
        </CardHeader>
        <CardContent>
          {viewersData?.length ? (
            <div className="">
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
                  {viewersData?.slice(0, 6).map((viewer) => (
                    <TableRow key={viewer.name}>
                      <TableCell>{viewer.viewerName}</TableCell>
                      <TableCell>{viewer.micrositeName}</TableCell>
                      <TableCell>{viewer.device}</TableCell>
                      <TableCell>{viewer.country}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center mt-20"> Viewers data not available</p>
          )}
        </CardContent>
      </Card>

      {/* Views Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">Views Per Day</CardTitle>
            {/* <p className="text-3xl font-bold mt-2">1155</p> */}
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
