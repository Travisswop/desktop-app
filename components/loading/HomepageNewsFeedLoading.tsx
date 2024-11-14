import { Card, Skeleton } from "@nextui-org/react";
import { BsThreeDots } from "react-icons/bs";

const HomepageNewsFeedLoading = () => {
  return (
    <Card className="w-full h-full py-6 px-2 shadow-none">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-start gap-5 w-full h-full pb-6 border-b">
          <Skeleton className="h-16 w-16 rounded-full flex justify-center">
            <div className="rounded-full bg-gray-100"></div>
          </Skeleton>
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="w-full h-10 rounded-lg">
              <div className="h-full w-full rounded-lg bg-gray-100"></div>
            </Skeleton>
            <Skeleton className="w-full h-10 rounded-lg">
              <div className="h-full w-full rounded-lg bg-gray-100"></div>
            </Skeleton>
          </div>
          <BsThreeDots className="text-gray-300" size={36} />
        </div>
        <div className="flex items-start gap-5 w-full h-full pb-6 border-b">
          <Skeleton className="h-16 w-16 rounded-full flex justify-center">
            <div className="rounded-full bg-gray-100"></div>
          </Skeleton>
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="w-full h-10 rounded-lg">
              <div className="h-full w-full rounded-lg bg-gray-100"></div>
            </Skeleton>
            <Skeleton className="w-full h-10 rounded-lg">
              <div className="h-full w-full rounded-lg bg-gray-100"></div>
            </Skeleton>
          </div>
          <BsThreeDots className="text-gray-300" size={36} />
        </div>
        <div className="flex items-start gap-5 w-full h-full pb-6 border-b">
          <Skeleton className="h-16 w-16 rounded-full flex justify-center">
            <div className="rounded-full bg-gray-100"></div>
          </Skeleton>
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="w-full h-10 rounded-lg">
              <div className="h-full w-full rounded-lg bg-gray-100"></div>
            </Skeleton>
            <Skeleton className="w-full h-10 rounded-lg">
              <div className="h-full w-full rounded-lg bg-gray-100"></div>
            </Skeleton>
          </div>
          <BsThreeDots className="text-gray-300" size={36} />
        </div>
        <div className="flex items-start gap-5 w-full h-full pb-6 border-b">
          <Skeleton className="h-16 w-16 rounded-full flex justify-center">
            <div className="rounded-full bg-gray-100"></div>
          </Skeleton>
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="w-full h-10 rounded-lg">
              <div className="h-full w-full rounded-lg bg-gray-100"></div>
            </Skeleton>
            <Skeleton className="w-full h-10 rounded-lg">
              <div className="h-full w-full rounded-lg bg-gray-100"></div>
            </Skeleton>
          </div>
          <BsThreeDots className="text-gray-300" size={36} />
        </div>
        <div className="flex items-start gap-5 w-full h-full pb-6 border-b">
          <Skeleton className="h-16 w-16 rounded-full flex justify-center">
            <div className="rounded-full bg-gray-100"></div>
          </Skeleton>
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="w-full h-10 rounded-lg">
              <div className="h-full w-full rounded-lg bg-gray-100"></div>
            </Skeleton>
            <Skeleton className="w-full h-10 rounded-lg">
              <div className="h-full w-full rounded-lg bg-gray-100"></div>
            </Skeleton>
          </div>
          <BsThreeDots className="text-gray-300" size={36} />
        </div>
      </div>
    </Card>
  );
};

export default HomepageNewsFeedLoading;
