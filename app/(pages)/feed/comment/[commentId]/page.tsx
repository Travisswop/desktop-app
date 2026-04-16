import { getCommentDetails } from "@/actions/postFeed";
import FeedDetailsClient from "@/components/feed/FeedDetailsClient";
import FeedReplyDetailsClient from "@/components/feed/FeedReplyDetailsClient";
import FeedLoading from "@/components/loading/FeedLoading";
import { Metadata, ResolvingMetadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import React, { Suspense } from "react";

type Props = {
  params: Promise<{ commentId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { commentId } = await params;
  const cookieStore = cookies();
  const userId = (await cookieStore).get("user-id")?.value;

  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/comment/${commentId}?userId=${userId}`;

  try {
    const responseData = await getCommentDetails(url);
    const comment = responseData?.data;

    if (!comment) {
      return {
        title: "Comment not found",
        description: "No comment available.",
      };
    }

    const smartsiteEnsName =
      comment?.smartsiteEnsName || comment?.smartsiteId?.ens || "";

    const commentTitle = comment?.title || "Swop Comment";
    const createdAt = comment?.createdAt || new Date().toISOString();

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    const description = `${smartsiteEnsName} • ${formatDate(createdAt)}`;

    // Check for media
    const firstContent = comment?.post_content?.[0];
    const hasImage = Boolean(firstContent?.src);

    const metadata: Metadata = {
      title: commentTitle,
      description,
      openGraph: {
        title: commentTitle,
        description,
        type: "article",
        url: `${process.env.NEXT_PUBLIC_APP_URL}/feed/comment/${commentId}`,
        siteName: "Swop",
      },
      twitter: {
        card: hasImage ? "summary_large_image" : "summary",
        title: commentTitle,
        description,
      },
    };

    return metadata;
  } catch (error) {
    console.error("Error generating comment metadata:", error);
    return {
      title: "Comment Details",
      description: "Check out this comment",
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
      <div className="w-full sm:w-[520px] overflow-y-auto">
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
