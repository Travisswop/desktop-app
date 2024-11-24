import { Card, Skeleton } from "@nextui-org/react";

export default function SmartSiteIconLoading() {
  return (
    <Card className="h-screen shadow-none rounded-none m-8 overflow-hidden bg-[#F3F4F6]">
      <div className="flex gap-10 mb-6">
        <div className="w-[60%] bg-white p-6 rounded-xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-40 rounded-lg" />
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-40 w-28 rounded-lg" />
            <Skeleton className="h-40 w-28 rounded-lg" />
            <Skeleton className="h-40 w-28 rounded-lg" />
            <Skeleton className="h-40 w-28 rounded-lg" />
            <Skeleton className="h-40 w-28 rounded-lg" />
            <Skeleton className="h-40 w-28 rounded-lg" />
            <Skeleton className="h-40 w-28 rounded-lg" />
            <Skeleton className="h-40 w-28 rounded-lg" />
          </div>
          <div className="flex items-center gap-3 justify-center">
            <Skeleton className="h-11 w-52 rounded-full" />
            <Skeleton className="h-11 w-52 rounded-full" />
            <Skeleton className="h-11 w-52 rounded-full" />
          </div>
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-48 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <div className="w-[40%] bg-white rounded-xl">
          <Skeleton className="rounded-full w-40 h-40 mx-auto mt-20 mb-10" />
          <div className="flex flex-col items-center gap-3 mb-8">
            <Skeleton className="rounded-md w-64 h-9" />
            <Skeleton className="rounded-md w-40 h-9" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-10">
            <Skeleton className="rounded-md w-10 h-8" />
            <Skeleton className="rounded-md w-10 h-8" />
            <Skeleton className="rounded-md w-10 h-8" />
            <Skeleton className="rounded-md w-10 h-8" />
            <Skeleton className="rounded-md w-10 h-8" />
          </div>
          <div className="flex flex-col items-center gap-3 mb-8 px-4">
            <Skeleton className="rounded-md w-full h-12" />
            <Skeleton className="rounded-md w-full h-12" />
            <Skeleton className="rounded-md w-full h-12" />
            <Skeleton className="rounded-md w-full h-12" />
            <Skeleton className="rounded-md w-full h-12" />
          </div>
          <Skeleton className="rounded-md w-48 h-12 mx-auto" />
        </div>
      </div>
    </Card>
  );
}
