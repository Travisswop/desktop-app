import { getFeedDetails } from "@/actions/postFeed";
import FeedDetails from "@/components/feed/FeedDetails";
import FeedLoading from "@/components/loading/FeedLoading";
import { cookies } from "next/headers";
import React, { Suspense } from "react";

const FeedDetailsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get("access-token")?.value;
  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}`;

  const feedData = await getFeedDetails(url, accessToken || "");
  // console.log("id", id);
  // console.log("accessToken", accessToken);
  // console.log("feedData", feedData);

  return (
    <div className="">
      <div className="bg-white rounded-xl w-2/3 2xl:w-1/2 p-4">
        <Suspense fallback={<FeedLoading />}>
          {feedData && (
            <FeedDetails feedData={feedData.data} accessToken={accessToken} />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default FeedDetailsPage;
