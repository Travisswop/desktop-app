import { Card, Skeleton } from "@nextui-org/react";
import React from "react";

const ProfileLoading = () => {
  return (
    <Card className="w-full h-full p-6 shadow-none">
      <h6 className="font-semibold mb-4 text-lg">Parent Profile</h6>
      <div className="flex flex-col gap-6">
        <Skeleton className="w-full rounded-lg">
          <div className="h-10 w-full rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="w-full rounded-lg">
          <div className="h-10 w-full rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="w-full rounded-lg">
          <div className="h-10 w-full rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="w-full rounded-lg">
          <div className="h-10 w-full rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="w-full rounded-lg">
          <div className="h-10 w-full rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="w-full rounded-lg">
          <div className="h-10 w-full rounded-lg bg-gray-100"></div>
        </Skeleton>
      </div>
    </Card>
  );
};

export default ProfileLoading;
