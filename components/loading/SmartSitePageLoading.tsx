import { Card, Skeleton } from "@nextui-org/react";
import React from "react";

const SmartSitePageLoading = () => {
  return (
    <Card className="h-screen shadow-none rounded-none m-8 p-8 overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-3 items-center w-full gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9]?.map((el: any, index: number) => (
          <Skeleton key={index} className="rounded-lg h-[250px]" />
        ))}
      </div>
    </Card>
  );
};

export default SmartSitePageLoading;
