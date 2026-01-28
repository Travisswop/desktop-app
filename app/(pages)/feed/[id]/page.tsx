import { getFeedDetails } from "@/actions/postFeed";
import FeedDetails from "@/components/feed/FeedDetails";
import FeedLoading from "@/components/loading/FeedLoading";
import { Metadata, ResolvingMetadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import React, { Suspense } from "react";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id } = await params;
  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}`;

  try {
    const responseData = await getFeedDetails(url);
    let feed = responseData?.data;

    // Handle repost
    if (responseData?.data?.postType === "repost") {
      feed = responseData?.repostedPostDetails;
    }

    if (!feed) {
      return {
        title: "Feed not found",
        description: "No feed post available.",
      };
    }

    // First media content (if any)
    const firstContent = feed?.content?.post_content?.[0];
    const contentSrc = firstContent?.src;
    const hasImage = Boolean(contentSrc);

    // Metadata fields
    const smartsiteEnsName =
      feed?.smartsiteEnsName ||
      feed?.smartsiteId?.ens ||
      feed?.smartsiteId?.ensData?.name;

    const feedTitle = feed?.content?.title || "Swop Feed";
    const createdAt = feed?.createdAt || new Date().toISOString();

    // Format date
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    // Cloudinary thumbnail helper
    const getCloudinaryThumbnail = (url: string): string => {
      const isVideo =
        url.includes("/video/upload/") ||
        url.match(/\.(mp4|mov|avi|webm|mkv)$/i);

      // Image handling
      if (!isVideo) {
        // HEIC → JPG
        if (url.match(/\.heic$/i)) {
          const parts = url.split("/upload/");
          if (parts.length === 2) {
            return `${
              parts[0]
            }/upload/f_jpg,w_1200,h_630,c_fill,q_auto/${parts[1].replace(
              /\.heic$/i,
              ".jpg",
            )}`;
          }
        }

        // Normal Cloudinary image optimization
        if (url.includes("cloudinary.com")) {
          const parts = url.split("/upload/");
          if (parts.length === 2) {
            return `${parts[0]}/upload/f_auto,w_1200,h_630,c_fill,q_auto/${parts[1]}`;
          }
        }

        return url;
      }

      // Video → thumbnail
      const parts = url.split("/upload/");
      if (parts.length !== 2) return "";

      const publicId = parts[1].replace(/\.(mp4|mov|avi|webm|mkv)$/i, "");

      return `${parts[0]}/upload/so_1.0,w_1200,h_630,c_fill,f_jpg,q_auto/${publicId}.jpg`;
    };

    let ogImageUrl: string | undefined;

    if (hasImage && contentSrc) {
      const feedImage = getCloudinaryThumbnail(contentSrc);

      ogImageUrl =
        `${process.env.NEXT_PUBLIC_APP_URL}/api/og-feed?` +
        `ensName=${encodeURIComponent(smartsiteEnsName)}` +
        `&title=${encodeURIComponent(feedTitle)}` +
        `&image=${encodeURIComponent(feedImage)}` +
        `&date=${encodeURIComponent(formatDate(createdAt))}`;
    }

    const description = `${smartsiteEnsName} • ${formatDate(createdAt)}`;

    // Base metadata (text-only safe)
    const metadata: Metadata = {
      title: feedTitle,
      description,
      openGraph: {
        title: feedTitle,
        description,
        type: "article",
        url: `${process.env.NEXT_PUBLIC_APP_URL}/feed/${id}`,
        siteName: "Swop",
      },
      twitter: {
        card: hasImage ? "summary_large_image" : "summary",
        title: feedTitle,
        description,
      },
    };

    // Attach images ONLY if media exists
    if (hasImage && ogImageUrl) {
      metadata.openGraph!.images = [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: feedTitle,
          type: "image/png",
        },
      ];

      metadata.twitter!.images = [ogImageUrl];

      metadata.other = {
        "og:image:secure_url": ogImageUrl,
        "og:image:type": "image/png",
        "og:image:width": "1200",
        "og:image:height": "630",
      };
    }

    return metadata;
  } catch (error) {
    console.error("Error generating metadata:", error);

    return {
      title: "Feed Details",
      description: "Check out this feed",
      twitter: {
        card: "summary",
      },
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

  // console.log("feed data", feedData);

  return (
    <div className="relative flex flex-col items-center">
      <div className="w-[90%] sm:w-[70%] xl:w-[30%] overflow-y-auto">
        <Suspense fallback={<FeedLoading />}>
          {feedData && (
            <FeedDetails feedData={feedData.data} feedDetails={feedData} />
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
