import { getFeedDetails } from "@/actions/postFeed";
import FeedDetails from "@/components/feed/FeedDetails";
import TabSwitcher from "@/components/feed/TabSwitcher";
import FeedLoading from "@/components/loading/FeedLoading";
import { cookies } from "next/headers";
import Link from "next/link";
import React, { Suspense } from "react";
import type { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;

  const feedData = await getFeedDetails(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}`
  );

  const feed = feedData?.data;
  console.log("feed dta", feed);

  if (!feed) {
    return {
      title: "Feed",
      description: "Feed details",
    };
  }

  // Description fallback: first 150 chars of first content src or text

  const firstMedia = feed.post_content?.[0];
  const isVideo = firstMedia?.type === "video";
  const isImage = firstMedia?.type === "image";

  const imageUrl = isImage ? firstMedia.src : feed.smartsiteProfilePic; // fallback to profile pic

  return {
    title: feed.content.title || "Feed Post",
    description:
      feed?.description ||
      feed?.content?.description ||
      "Check out this feed post!",
    openGraph: {
      title: feed.content.title || "Feed Post",
      description:
        feed?.description ||
        feed?.content?.description ||
        "Check out this feed post!",
      url: `https://www.swopme.app/feed/${feed._id}`,
      type: isVideo ? "video.other" : "article",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 800,
              height: 600,
              alt: feed.title || "Feed Image",
            },
          ]
        : [],
      videos: isVideo
        ? [
            {
              url: firstMedia.src,
              width: 1280,
              height: 720,
            },
          ]
        : [],
    },
    // twitter: {
    //   card: "summary_large_image",
    //   title: feed.title || "Feed Post",
    //   description: feed.description || "Check out this feed post!",
    //   images: feed.imageUrl ? [feed.imageUrl] : [],
    // },

    twitter: {
      card: isVideo ? "player" : "summary_large_image",
      title: feed.title || "Feed Post",
      description:
        feed?.description ||
        feed?.content?.description ||
        "Check out this feed post!",
      images: imageUrl ? [imageUrl] : [],
      player: isVideo ? firstMedia.src : undefined,
    },
  };
}

const FeedDetailsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get("access-token")?.value;
  const userId = (await cookieStore).get("user-id")?.value;

  const url = userId
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}?userId=${userId}`
    : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}`;

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
            <FeedDetails
              feedData={feedData.data}
              feedDetails={feedData}
              accessToken={accessToken}
            />
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
