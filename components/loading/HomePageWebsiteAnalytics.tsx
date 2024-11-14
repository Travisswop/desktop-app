import { Card, Skeleton } from "@nextui-org/react";
import React from "react";

const HomepageWebsiteAnalyticsLoading = () => {
  return (
    <Card className="w-full shadow-none">
      <div className="grid grid-cols-2 gap-6 w-full">
        <Skeleton className="h-40 w-full rounded-lg flex justify-center">
          <div className="rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="h-40 w-full rounded-lg flex justify-center">
          <div className="rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="h-40 w-full rounded-lg flex justify-center">
          <div className="rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="h-40 w-full rounded-lg flex justify-center">
          <div className="rounded-lg bg-gray-100"></div>
        </Skeleton>
      </div>
    </Card>
  );
};

export default HomepageWebsiteAnalyticsLoading;
