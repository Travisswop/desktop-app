import { getCommentDetails } from "@/actions/postFeed";
import FeedReplyDetailsClient from "@/components/feed/FeedReplyDetailsClient";
import FeedLoading from "@/components/loading/FeedLoading";

import { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import React, { Suspense } from "react";

type Props = {
  params: Promise<{ commentId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// ── Extract image src based on postType ───────────────────────────────────────
function extractOgImageSrc(feed: any): {
  src: string;
  type: "image" | "video" | "gif" | null;
} {
  const { postType, content } = feed ?? {};
  if (!content) return { src: "", type: null };

  switch (postType) {
    case "post": {
      const postContents: any[] = content.post_content ?? [];

      const image = postContents.find((c) => c.type === "image");
      if (image) return { src: image.src, type: "image" };

      const video = postContents.find((c) => c.type === "video");
      if (video) return { src: video.src, type: "video" };

      const gif = postContents.find((c) => c.type === "gif");
      if (gif) return { src: "", type: "gif" };

      return { src: "", type: null };
    }

    case "repost": {
      // ── Check quote first ─────────────────────────────────────────────
      const quote = content.quote;
      const hasQuoteTitle = Boolean(quote?.title?.trim());
      const hasQuoteMedia =
        Array.isArray(quote?.post_content) && quote.post_content.length > 0;

      if (hasQuoteTitle || hasQuoteMedia) {
        // Quote exists — use quote's media
        const quoteContents: any[] = quote?.post_content ?? [];

        const image = quoteContents.find((c) => c.type === "image");
        if (image) return { src: image.src, type: "image" };

        const video = quoteContents.find((c) => c.type === "video");
        if (video) return { src: video.src, type: "video" };

        const gif = quoteContents.find((c) => c.type === "gif");
        if (gif) return { src: "", type: "gif" };

        // Quote has title but no media — no image
        return { src: "", type: null };
      }

      // ── No quote — fall through to repostedPostDetails ────────────────
      // This is handled in generateMetadata by swapping feed to repostedPostDetails
      return { src: "", type: null };
    }

    case "minting":
      return { src: content.image ?? "", type: "image" };

    case "transaction":
      return { src: content.image ?? "", type: "image" };

    case "redeem":
      return { src: content.tokenImgUrl ?? "", type: "image" };

    // case "swapTransaction":
    //   return {
    //     src:
    //       content.inputToken?.tokenImg ?? content.outputToken?.tokenImg ?? "",
    //     type: "image",
    //   };

    case "swapTransaction":
      // Don't return token image — swap gets its own card layout
      return { src: "", type: null };

    case "connection":
    case "smartsite":
      return { src: content.smartsiteImage ?? "", type: "image" };

    default:
      return { src: "", type: null };
  }
}

function extractOgTitle(feed: any): string {
  const { postType, content } = feed ?? {};
  if (!content) return "Swop Feed";

  switch (postType) {
    case "post":
      return content.title || "Swop Feed";

    case "repost": {
      // ── Check quote first ─────────────────────────────────────────────
      const quote = content.quote;
      const hasQuoteTitle = Boolean(quote?.title?.trim());
      const hasQuoteMedia =
        Array.isArray(quote?.post_content) && quote.post_content.length > 0;

      if (hasQuoteTitle || hasQuoteMedia) {
        return quote?.title || "Repost on Swop";
      }

      // ── No quote — repostedPostDetails title handled below ────────────
      return "Repost on Swop";
    }

    case "poll":
      return content.question || "Poll on Swop";
    case "minting":
      return content.title || "Minted on Swop";
    case "transaction":
      return content.name
        ? `${content.name} Transaction`
        : `${content.transaction_type?.toUpperCase() ?? ""} Transaction on Swop`;
    case "swapTransaction":
      return `Swapped ${content.inputToken?.symbol ?? ""} → ${
        content.outputToken?.symbol ?? ""
      } on Swop`;
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

function getCloudinaryThumbnail(url: string, type: "image" | "video"): string {
  if (type === "video") {
    const parts = url.split("/upload/");
    if (parts.length !== 2) return url;
    const publicId = parts[1].replace(/\.(mp4|mov|avi|webm|mkv)$/i, "");
    return `${parts[0]}/upload/so_1.0,w_1200,h_630,c_fill,f_jpg,q_auto/${publicId}.jpg`;
  }

  // HEIC → JPG
  if (/\.heic$/i.test(url)) {
    const parts = url.split("/upload/");
    if (parts.length === 2) {
      return `${parts[0]}/upload/f_jpg,w_1200,h_630,c_fill,q_auto/${parts[1].replace(/\.heic$/i, ".jpg")}`;
    }
  }

  // Cloudinary image — force f_jpg, never f_auto (Satori doesn't support webp)
  if (url.includes("cloudinary.com")) {
    const parts = url.split("/upload/");
    if (parts.length === 2) {
      // Strip any existing transformations and replace with safe ones
      const publicIdWithVersion = parts[1].replace(
        /^(v\d+\/)?([^/]+\/)*/, // strip existing transform segments
        (match) => match,
      );
      return `${parts[0]}/upload/f_jpg,w_1200,h_630,c_fill,q_auto/${publicIdWithVersion}`;
    }
  }

  return url;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { commentId } = await params;

  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/${commentId}/og`;

  try {
    const response = await fetch(url);

    const responseData = await response.json();
    let feed = responseData?.data;

    if (!feed) {
      return {
        title: "Feed not found",
        description: "No feed post available.",
      };
    }

    // For reposts, use the original post's content for OG
    // if (
    //   feed.postType === "repost" &&
    //   feed.repostedPostDetails &&
    //   !feed.isOriginalDeleted
    // ) {
    //   feed = feed.repostedPostDetails;
    // }

    // ── Repost logic ──────────────────────────────────────────────────────────
    if (feed.postType === "repost") {
      const quote = feed.content?.quote;
      const hasQuoteTitle = Boolean(quote?.title?.trim());
      const hasQuoteMedia =
        Array.isArray(quote?.post_content) && quote.post_content.length > 0;
      const hasQuote = hasQuoteTitle || hasQuoteMedia;

      if (!hasQuote && feed.repostedPostDetails && !feed.isOriginalDeleted) {
        // Simple repost with no quote — use original post's content for OG
        feed = feed.repostedPostDetails;
      }
      // If quote exists — keep feed as-is, extractOgImageSrc/Title handles it
    }

    const smartsiteEnsName =
      feed?.smartsiteDetails?.ens || feed?.smartsiteEnsName || "Swop";

    const { src: contentSrc, type: contentType } = extractOgImageSrc(feed);
    const hasImage =
      (contentType === "image" || contentType === "video") &&
      Boolean(contentSrc);
    const isGifOnly = contentType === "gif";

    const feedTitle = extractOgTitle(feed);
    const createdAt = feed?.createdAt || new Date().toISOString();
    const description = `${smartsiteEnsName} • ${formatDate(createdAt)}`;

    let ogImageUrl: string | undefined;

    // ── Swap gets its own card — check first ─────────────────────────────────
    if (feed.postType === "swapTransaction" && feed.content) {
      const c = feed.content;
      // ── Calculate price change percentage ──────────────────────────────────
      const inputValueUsd =
        (Number(c.inputToken?.amount) ?? 0) *
        (Number(c.inputToken?.price) ?? 0);
      const outputValueUsd =
        (Number(c.outputToken?.amount) ?? 0) *
        (Number(c.outputToken?.price) ?? 0);

      let priceChangePercent = "0.00";
      if (inputValueUsd > 0) {
        const change = ((outputValueUsd - inputValueUsd) / inputValueUsd) * 100;
        priceChangePercent = change.toFixed(2);
      }
      ogImageUrl =
        `${process.env.NEXT_PUBLIC_APP_URL}/api/og-feed?` +
        `ensName=${encodeURIComponent(smartsiteEnsName)}` +
        `&title=${encodeURIComponent(feedTitle)}` +
        `&date=${encodeURIComponent(formatDate(createdAt))}` +
        `&type=swap` +
        `&inputSymbol=${encodeURIComponent(c.inputToken?.symbol ?? "")}` +
        `&inputAmount=${encodeURIComponent(Number(c.inputToken?.amount ?? 0).toFixed(4))}` +
        `&inputImg=${encodeURIComponent(c.inputToken?.tokenImg ?? "")}` +
        `&outputSymbol=${encodeURIComponent(c.outputToken?.symbol ?? "")}` +
        `&outputAmount=${encodeURIComponent(Number(c.outputToken?.amount ?? 0).toFixed(4))}` +
        `&outputImg=${encodeURIComponent(c.outputToken?.tokenImg ?? "")}` +
        `&priceChange=${encodeURIComponent(priceChangePercent)}`;
    } else if (hasImage && contentSrc) {
      const feedImage = getCloudinaryThumbnail(
        contentSrc,
        contentType as "image" | "video",
      );
      ogImageUrl =
        `${process.env.NEXT_PUBLIC_APP_URL}/api/og-feed?` +
        `ensName=${encodeURIComponent(smartsiteEnsName)}` +
        `&title=${encodeURIComponent(feedTitle)}` +
        `&image=${encodeURIComponent(feedImage)}` +
        `&date=${encodeURIComponent(formatDate(createdAt))}`;
    } else if (isGifOnly) {
      ogImageUrl =
        `${process.env.NEXT_PUBLIC_APP_URL}/api/og-feed?` +
        `ensName=${encodeURIComponent(smartsiteEnsName)}` +
        `&title=${encodeURIComponent(feedTitle)}` +
        `&showGifPlaceholder=true` +
        `&date=${encodeURIComponent(formatDate(createdAt))}`;
    }

    const metadata: Metadata = {
      title: feedTitle,
      description,
      openGraph: {
        title: feedTitle,
        description,
        type: "article",
        url: `${process.env.NEXT_PUBLIC_APP_URL}/feed/comment/${commentId}`,
        siteName: "Swop",
      },
      twitter: {
        card: hasImage || isGifOnly ? "summary_large_image" : "summary",
        title: feedTitle,
        description,
      },
    };

    if (ogImageUrl) {
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

// ─── Page ──────────────────────────────────────────────────────────────────────

const FeedCommentDetailsPage = async ({
  params,
}: {
  params: Promise<{ commentId: string }>;
}) => {
  const { commentId } = await params;
  const cookieStore = cookies();
  const accessToken = (await cookieStore).get("access-token")?.value;
  const userId = (await cookieStore).get("user-id")?.value;

  const url = userId
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/comment/${commentId}?userId=${userId}`
    : `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/comment/${commentId}`;

  const commentData = await getCommentDetails(url);

  console.log("reply data hola shit man", commentData);

  return (
    <div className="relative flex flex-col items-center">
      <div className="w-full sm:w-[520px]">
        <Suspense fallback={<FeedLoading />}>
          {commentData && (
            <FeedReplyDetailsClient
              feedData={commentData.data}
              userId={userId || ""}
              accessToken={accessToken || ""}
              //isCommentDetail  // signals FeedDetailsClient to render comment layout
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

export default FeedCommentDetailsPage;
