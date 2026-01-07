import { getFeedDetails } from "@/actions/postFeed";
import FeedDetails from "@/components/feed/FeedDetails";
import FeedLoading from "@/components/loading/FeedLoading";
import { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import React, { Suspense } from "react";

// Generate metadata for OG tags
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}`;

  try {
    const feedData = await getFeedDetails(url);
    const feed = feedData?.data;

    // Use your custom OG image route
    const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/og/feed/${id}`;

    const title = feed?.content?.title || "Check out this post!";
    const description =
      title.length > 155 ? title.substring(0, 155) + "..." : title;
    const author = feed?.smartsiteUserName || "Anonymous";

    return {
      title: `${title} - ${author}`,
      description: description,
      openGraph: {
        title: title,
        description: description,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: "article",
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/feed/${id}`,
        siteName: "Your Site Name",
        publishedTime: feed?.createdAt,
        modifiedTime: feed?.updatedAt,
        authors: [author],
      },
      twitter: {
        card: "summary_large_image",
        title: title,
        description: description,
        images: [ogImageUrl],
        creator: `@${author}`,
      },
    };
  } catch (error) {
    console.error("Metadata generation error:", error);
    return {
      title: "Feed Details",
      description: "Check out this post!",
    };
  }
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
    <div className="relative flex flex-col items-center">
      <div className="w-[90%] sm:w-[70%] xl:w-[30%] overflow-y-auto">
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
          <p className="text-lg font-bold">{`Don't miss what's happening`}</p>
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
