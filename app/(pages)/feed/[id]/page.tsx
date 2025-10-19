import { getFeedDetails } from "@/actions/postFeed";
import FeedDetails from "@/components/feed/FeedDetails";
import FeedLoading from "@/components/loading/FeedLoading";
import { cookies } from "next/headers";
import Link from "next/link";
import React, { Suspense } from "react";
import type { Metadata, ResolvingMetadata } from "next";
import isUrl from "@/lib/isUrl";

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
  console.log("feedrr", feed);

  if (!feed) {
    return {
      title: "Feed",
      description: "Feed details",
    };
  }

  // Get post content array
  const postContent = feed.content?.post_content || [];
  const firstMedia = postContent[0];

  // Determine media type
  const mediaType = firstMedia?.type;
  const isVideo = mediaType === "video";
  const isImage = mediaType === "image";
  const isGif = mediaType === "gif";

  // For metadata purposes, treat GIFs as images
  const hasVisualMedia = isImage || isGif || isVideo;

  // Get the media URL
  let mediaUrl = "";
  if (hasVisualMedia && firstMedia?.src) {
    mediaUrl = firstMedia.src;
  } else if (feed.smartsiteProfilePic) {
    mediaUrl = isUrl(feed.smartsiteProfilePic)
      ? feed.smartsiteProfilePic
      : `${process.env.NEXT_PUBLIC_APP_URL}/images/user_avator/${feed.smartsiteProfilePic}@3x.png`;
  }

  // Create title and description
  const title =
    feed.content?.title || feed.smartsiteUserName || "Swop Feed Post";
  const description =
    feed.description ||
    feed.content?.description ||
    `Check out this post by ${feed.smartsiteUserName || "Swop user"}!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.swopme.app/feed/${feed._id}`,
      siteName: "Swop",
      type: isVideo ? "video.other" : "article",
      // Remove fixed dimensions - let platforms handle responsive sizing
      images: mediaUrl
        ? [
            {
              url: mediaUrl,
              alt: title,
            },
          ]
        : [],
      ...(isVideo &&
        firstMedia?.src && {
          videos: [
            {
              url: firstMedia.src,
            },
          ],
        }),
    },
    twitter: {
      card: isVideo ? "player" : "summary_large_image",
      title,
      description,
      site: "@swopme",
      creator: feed.smartsiteUserName
        ? `@${feed.smartsiteUserName}`
        : undefined,
      images: mediaUrl ? [mediaUrl] : [],
      ...(isVideo &&
        firstMedia?.src && {
          player: {
            url: firstMedia.src,
          },
        }),
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
