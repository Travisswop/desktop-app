"use client";
import { Skeleton } from "@nextui-org/react";

export default function SettingPageLoading() {
  return (
    <div className="h-screen shadow-none rounded-none overflow-hidden bg-[#F3F4F6]">
      <div className="w-full bg-white p-6 rounded-xl flex flex-col gap-6">
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-11 w-64 rounded-lg" />
        <Skeleton className="h-11 w-64 rounded-lg" />
        <Skeleton className="h-16 w-96 rounded-lg" />
        <Skeleton className="h-44 w-44 rounded-full" />
        <Skeleton className="h-11 w-64 rounded-lg" />
        <div className="grid grid-cols-2 gap-10">
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
        <Skeleton className="h-11 w-64 rounded-lg" />
        <Skeleton className="h-11 w-64 rounded-lg" />
      </div>
    </div>
  );
}
