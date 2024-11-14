import { Card, Skeleton } from "@nextui-org/react";
import React from "react";
import AnimateButton from "../Button/AnimateButton";
import { CiSettings } from "react-icons/ci";

const HomepageSmartsiteLoading = () => {
  return (
    <Card className="w-full h-full p-6 shadow-none">
      <div className="flex items-center justify-between w-full mb-6">
        <h3 className="text-lg text-gray-700 font-semibold">Smart Sites</h3>
        <AnimateButton
          width="w-48"
          className="text-gray-700 flex gap-1 cursor-not-allowed"
        >
          <CiSettings size={20} />
          Manage Sites
        </AnimateButton>
      </div>
      <div className="flex flex-col items-center gap-6 w-full">
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

export default HomepageSmartsiteLoading;
