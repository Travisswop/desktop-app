"use client";
import { Card, Skeleton } from "@nextui-org/react";
import React from "react";

const QrCodePageLoading = () => {
  return (
    <Card className="h-screen shadow-none rounded-none p-8 overflow-hidden">
      <div className="flex gap-6">
        <div className=" flex flex-col gap-2 w-2/3">
          <Skeleton className="rounded-lg h-[40px] w-[200px] mb-4" />
          <Skeleton className="h-[70px] w-full border-b" />
          <Skeleton className="h-[70px] w-full border-b" />
          <Skeleton className="h-[70px] w-full border-b" />
          <Skeleton className="h-[70px] w-full border-b" />
          <Skeleton className="h-[70px] w-full border-b" />
          <Skeleton className="h-[70px] w-full border-b mb-8" />
          <div className="flex items-center justify-center">
            <Skeleton className="rounded-lg h-[50px] w-[200px]" />
          </div>
        </div>
        <div className="flex justify-center w-1/3">
          <Skeleton className="rounded-lg h-[200px] w-[200px] mb-4" />
        </div>
      </div>
    </Card>
  );
};

export default QrCodePageLoading;
