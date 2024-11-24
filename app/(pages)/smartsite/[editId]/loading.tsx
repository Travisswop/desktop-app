import { Card, Skeleton } from "@nextui-org/react";

export default function Loading() {
  return (
    <Card className="h-screen shadow-none rounded-none m-8 overflow-hidden bg-[#F3F4F6]">
      <div className="flex gap-10 mb-6">
        <div className="w-[60%] bg-white p-6 rounded-xl">
          <Skeleton className="flex rounded-full w-40 h-40 mx-auto mb-9" />
          <div className="flex flex-col gap-5 mb-9">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="flex items-center justify-between mb-9">
            <Skeleton className="h-11 w-52 rounded-lg" />
            <Skeleton className="h-11 w-52 rounded-lg" />
          </div>
          <Skeleton className="h-24 w-full rounded-lg mb-9" />
          <Skeleton className="h-11 w-52 rounded-lg mb-9" />
          <Skeleton className="h-11 w-full rounded-lg mb-9" />
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
