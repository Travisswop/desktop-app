import { Card, Skeleton } from "@nextui-org/react";

const HomepageRecentLeadsLoading = () => {
  return (
    <Card className="w-full shadow-none px-7">
      <div className="w-full flex flex-col items-center gap-5">
        <Skeleton className="h-52 w-full rounded-lg flex justify-center">
          <div className="rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="h-52 w-full rounded-lg flex justify-center">
          <div className="rounded-lg bg-gray-100"></div>
        </Skeleton>
        <Skeleton className="h-12 w-60 rounded-2xl flex justify-center">
          <div className="rounded-lg bg-gray-100"></div>
        </Skeleton>
      </div>
    </Card>
  );
};

export default HomepageRecentLeadsLoading;
