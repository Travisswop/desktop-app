import { getFeedDetails } from "@/actions/postFeed";
import FeedDetails from "@/components/feed/FeedDetails";
import TabSwitcher from "@/components/feed/TabSwitcher";
import FeedLoading from "@/components/loading/FeedLoading";
import { cookies } from "next/headers";
import Link from "next/link";
import React, { Suspense } from "react";

const FeedDetailsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}`;
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get("access-token")?.value;

  const feedData = await getFeedDetails(url);

  console.log("feed data", feedData);

  return (
    <div className="relative">
      <div className="bg-white rounded-xl w-2/3 2xl:w-[54%] py-4 px-6">
        <div className="pb-6 border-b border-gray-200 pt-2">
          <TabSwitcher />
        </div>
        <Suspense fallback={<FeedLoading />}>
          {feedData && (
            <FeedDetails feedData={feedData.data} feedDetails={feedData} />
          )}
        </Suspense>
      </div>
      {!accessToken && (
        <div className="text-white bg-blue-500 py-4 w-full z-50 flex items-center gap-4 justify-between px-8 fixed bottom-0 left-0">
          <p className="text-lg font-bold">Don’t miss what’s happening</p>
          <Link
            href={"/login"}
            className="border border-white rounded-full px-4 py-1 hover:bg-white hover:text-black font-medium"
          >
            Log in
          </Link>
        </div>
      )}
    </div>
  );
};

export default FeedDetailsPage;
