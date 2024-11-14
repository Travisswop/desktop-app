import { Card, Skeleton } from "@nextui-org/react";
import React from "react";

const HomePageLoading = () => {
  return (
    <Card className="h-screen p-6 shadow-none rounded-none m-8 overflow-hidden">
      {/* <Skeleton className="rounded-lg">
        <div className="h-24 rounded-lg bg-default-300"></div>
      </Skeleton> */}
      <div className="flex gap-6 mb-6">
        <div className="w-[60%]">
          <div className="flex items-center gap-3 mb-6">
            <div>
              <Skeleton className="flex rounded-full w-14 h-14" />
            </div>
            <div className="flex justify-between items-center w-full">
              <div className="flex flex-col gap-3 w-[90%]">
                <Skeleton className="h-6 w-1/2 rounded-lg" />
                <Skeleton className="h-6 w-1/2 rounded-lg" />
                <Skeleton className="h-6 w-1/2 rounded-lg" />
              </div>
              <Skeleton className="h-10 w-[20%] rounded-lg" />
            </div>
          </div>
          <div>
            <Skeleton className="flex w-full h-48" />
          </div>
        </div>
        <div className="w-[40%]">
          <Skeleton className="flex w-full h-full" />
        </div>
      </div>
      <div className="w-full flex gap-6">
        <div className="w-1/2">
          <Skeleton className="flex w-full h-[30rem]" />
        </div>
        <div className="w-1/2">
          <Skeleton className="flex w-full h-full" />
        </div>
      </div>
    </Card>
  );
};

export default HomePageLoading;
