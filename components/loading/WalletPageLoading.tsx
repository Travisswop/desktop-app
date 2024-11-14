import { Card, Skeleton } from "@nextui-org/react";
import React from "react";

const WalletPageLoading = () => {
  return (
    <Card className="h-screen shadow-none rounded-none m-8 p-8 overflow-hidden">
      <div className="flex items-center w-full gap-x-4">
        <Skeleton className="rounded-lg h-[48px] w-full" />
        <Skeleton className="rounded-lg h-[48px] w-full" />
        <Skeleton className="rounded-lg h-[48px] w-full" />
        <Skeleton className="rounded-lg h-[48px] w-full" />
        <Skeleton className="rounded-lg h-[48px] w-full" />
        <Skeleton className="rounded-lg h-[48px] w-full" />
        <Skeleton className="rounded-lg h-[48px] w-full" />
        <Skeleton className="rounded-lg h-[48px] w-full" />
      </div>
      <div className="flex items-start gap-x-6 mt-6">
        <div className="w-[75%]">
          <Skeleton className="flex rounded-lg w-[200px] h-[45px] mb-2" />
          <Skeleton className="flex rounded-lg w-[300px] h-[45px] mb-2" />
          <Skeleton className="flex rounded-lg w-full h-[500px]" />
          <Skeleton className="flex rounded-lg w-full h-[500px] mt-6" />
        </div>
        <div className="w-[1%] flex items-start justify-center">
          <hr className="w-px h-[1300px] bg-gray-300 border-0" />
        </div>
        <div className="w-[34%]">
          <Skeleton className="flex rounded-lg w-full h-[800px]" />
        </div>
      </div>
    </Card>
  );
};

export default WalletPageLoading;
