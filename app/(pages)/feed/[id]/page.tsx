import { getFeedDetails } from "@/actions/postFeed";
import FeedDetailsClient from "@/components/feed/FeedDetailsClient";
import FeedLoading from "@/components/loading/FeedLoading";
import { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import React, { Suspense } from "react";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};
// ── Extract image src based on postType ───────────────────────────────────────
function extractOgImageSrc(feed: any): string | null {
  const { postType, content } = feed ?? {};
  if (!content) return null;

  switch (postType) {
    case "post":
      return content.post_content?.[0]?.src ?? null;
    case "repost":
      return content.quote?.post_content?.[0]?.src ?? null;
    case "poll":
      return null;
    case "minting":
      return content.image ?? null;
    case "transaction":
      return content.image ?? null;
    case "redeem":
      return content.tokenImgUrl ?? null;
    case "swapTransaction":
      return (
        content.inputToken?.tokenImg ?? content.outputToken?.tokenImg ?? null
      );
    case "connection":
    case "smartsite":
      return content.smartsiteImage ?? null;
    default:
      return null;
  }
}

// ── Extract title based on postType ──────────────────────────────────────────
function extractOgTitle(feed: any): string {
  const { postType, content } = feed ?? {};
  if (!content) return "Swop Feed";

  switch (postType) {
    case "post":
      return content.title || "Swop Feed";
    case "repost":
      return content.quote?.title || "Repost on Swop";
    case "poll":
      return content.question || "Poll on Swop";
    case "minting":
      return content.title || "Minted on Swop";
    case "transaction":
      return content.name
        ? `${content.name} Transaction`
        : `${content.transaction_type?.toUpperCase() ?? ""} Transaction on Swop`;
    case "swapTransaction":
      return `Swapped ${content.inputToken?.symbol ?? ""} → ${content.outputToken?.symbol ?? ""} on Swop`;
    case "redeem":
      return `Redeemed ${content.redeemName ?? ""} on Swop`;
    case "connection":
      return `Connected on Swop`;
    case "smartsite":
      return `Smartsite on Swop`;
    case "ensClaim":
      return `Claimed ${content.claimEnsName ?? ""} on Swop`;
    case "joiningDate":
      return `Joined Swop`;
    default:
      return "Swop Feed";
  }
}

// ── Cloudinary thumbnail helper ───────────────────────────────────────────────
function getCloudinaryThumbnail(url: string): string {
  const isVideo =
    url.includes("/video/upload/") || /\.(mp4|mov|avi|webm|mkv)$/i.test(url);

  if (!isVideo) {
    if (/\.heic$/i.test(url)) {
      const parts = url.split("/upload/");
      if (parts.length === 2) {
        return `${parts[0]}/upload/f_jpg,w_1200,h_630,c_fill,q_auto/${parts[1].replace(/\.heic$/i, ".jpg")}`;
      }
    }
    if (url.includes("cloudinary.com")) {
      const parts = url.split("/upload/");
      if (parts.length === 2) {
        return `${parts[0]}/upload/f_auto,w_1200,h_630,c_fill,q_auto/${parts[1]}`;
      }
    }
    return url;
  }

  const parts = url.split("/upload/");
  if (parts.length !== 2) return "";
  const publicId = parts[1].replace(/\.(mp4|mov|avi|webm|mkv)$/i, "");
  return `${parts[0]}/upload/so_1.0,w_1200,h_630,c_fill,f_jpg,q_auto/${publicId}.jpg`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── generateMetadata ──────────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/${id}/og`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 600 }, // cache for 10 min — matches backend TTL
    });

    if (!response.ok) {
      throw new Error(`OG API returned ${response.status}`);
    }

    const responseData = await response.json();
    let feed = responseData?.data;

    if (!feed) {
      return {
        title: "Feed not found",
        description: "No feed post available.",
      };
    }

    // For reposts, use the original post's content for OG
    if (
      feed.postType === "repost" &&
      feed.repostedPostDetails &&
      !feed.isOriginalDeleted
    ) {
      feed = feed.repostedPostDetails;
    }

    const smartsiteEnsName =
      feed?.smartsiteDetails?.ens || feed?.smartsiteEnsName || "Swop";

    const contentSrc = extractOgImageSrc(feed);
    const hasImage = Boolean(contentSrc);
    const feedTitle = extractOgTitle(feed);
    const createdAt = feed?.createdAt || new Date().toISOString();
    const description = `${smartsiteEnsName} • ${formatDate(createdAt)}`;

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
    console.error("generateMetadata error:", error);
    return {
      title: "Feed Details",
      description: "Check out this feed on Swop",
      twitter: { card: "summary" },
    };
  }
}

const FeedDetailsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access-token")?.value;
  const userId = cookieStore.get("user-id")?.value;

  const url = userId
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/${id}?userId=${userId}`
    : `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/${id}`;

  const feedData = await getFeedDetails(url);

  console.log("feed data count 1", feedData);

  return (
    <div className="relative flex flex-col items-center">
      <div className="w-full sm:w-[520px] overflow-y-auto">
        <Suspense fallback={<FeedLoading />}>
          {feedData && (
            <FeedDetailsClient
              feedData={feedData.data}
              userId={userId || ""}
              accessToken={accessToken || ""}
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
