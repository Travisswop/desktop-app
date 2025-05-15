"use client";

import { Skeleton } from "@nextui-org/react";

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div className="h-screen shadow-none rounded-none overflow-hidden bg-[#F3F4F6] w-[55%]">
      <div className="w-full bg-white p-6 rounded-xl flex flex-col gap-6">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}
