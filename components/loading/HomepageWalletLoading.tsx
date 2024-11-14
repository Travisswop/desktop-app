import { Card, Skeleton } from "@nextui-org/react";
import React from "react";

const HomepageWalletLoading = () => {
  return (
    <Card className="w-full h-full py-6 px-2 shadow-none">
      <div className="flex flex-col items-center gap-6">
        <Skeleton className="h-20 w-20 rounded-full flex justify-center">
          <div className="rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="w-40 h-10 rounded-lg">
          <div className="h-full w-full rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="w-40 h-10 rounded-lg">
          <div className="h-full w-full rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="w-full rounded-lg">
          <div className="h-10 w-full rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="w-full rounded-lg">
          <div className="h-10 w-full rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="w-full rounded-lg">
          <div className="h-[30rem] w-full rounded-lg bg-gray-100"></div>
        </Skeleton>
      </div>
    </Card>
  );
};

export default HomepageWalletLoading;
