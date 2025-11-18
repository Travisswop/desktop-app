"use client";
import { Card, Skeleton } from "@nextui-org/react";
import React from "react";

const SmartSitePageLoading = () => {
  return (
    <Card className="h-full shadow-none rounded-none p-8 overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 h-full">
        {[...Array(9)].map((_, index) => (
          <Skeleton
            key={index}
            className="rounded-lg w-full h-full min-h-[200px]"
          />
        ))}
      </div>
    </Card>
  );
};

export default SmartSitePageLoading;
