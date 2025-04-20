import { getFeedDetails } from "@/actions/postFeed";
import FeedDetails from "@/components/feed/FeedDetails";
import TabSwitcher from "@/components/feed/TabSwitcher";
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
      <div className="bg-white rounded-xl w-2/3 2xl:w-[54%] py-4 px-6">
        <div className="pb-6 border-b border-gray-200 pt-2">
          <TabSwitcher />
        </div>
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
