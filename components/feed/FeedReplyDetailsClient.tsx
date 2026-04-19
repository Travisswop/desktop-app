"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { IoArrowBack } from "react-icons/io5";
import CommentItem from "./CommentItem";
import { FiMessageCircle } from "react-icons/fi";
import { logger } from "ethers5";
import FeedReplyItem from "./FeedReplyItem";
import { useModalStore } from "@/zustandStore/modalstore";
import { CommentSkeleton } from "../loading/CommentLoading";

interface FeedItemType {
  _id: string;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  [key: string]: any;
}

interface Comment {
  _id: string;
  likeCount: number;
  replyCount: number;
  isLiked?: boolean;
  createdAt: string;
  userId: string;
  [key: string]: any;
}

const LIMIT = 10;

export default function FeedReplyDetailsClient({
  feedData,
  userId,
  accessToken,
}: {
  feedData: any;
  userId: string;
  accessToken: string;
}) {
  const [feed, setFeed] = useState(feedData);
  const router = useRouter();

  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sort, setSort] = useState<"latest" | "oldest" | "popular">("latest");

  const feedRefetchTrigger = useModalStore((s) => s.feedRefetchTrigger);

  logger.info("FeedDetailsClient rendered with feed:", feed);
  logger.info("FeedDetailsClient rendered with comments:", comments);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  const fetchComments = useCallback(
    async (pageNum: number, sortBy = sort) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setLoading(true);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v2/feed/${feed._id}/replies?userId=${userId}&postId=${feed.postId}&page=${pageNum}&limit=${LIMIT}&sort=${sortBy}`,
          {
            headers: accessToken
              ? { Authorization: `Bearer ${accessToken}` }
              : {},
          },
        );
        const json = await res.json();
        logger.info("Fetched comments:", json);
        const newComments: Comment[] = json?.comments || [];
        const fetchedTotal: number = json?.total || 0;
        const totalPages: number = json?.totalPages || 1;

        setTotal(fetchedTotal);
        setComments((prev) =>
          pageNum === 1 ? newComments : [...prev, ...newComments],
        );
        setPage(pageNum);
        setHasMore(pageNum < totalPages); // ← clean and reliable
      } catch (err) {
        console.error("Failed to fetch comments", err);
      } finally {
        fetchingRef.current = false;
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [feed?._id, userId, accessToken, comments?.length, sort],
  );

  // Initial load
  useEffect(() => {
    fetchComments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refetch trigger
  useEffect(() => {
    if (feedRefetchTrigger === 0) return;

    setPage(1);
    setHasMore(true);
    fetchComments(1);
  }, [feedRefetchTrigger, fetchComments]);

  // Scroll pagination
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loading &&
          !fetchingRef.current
        ) {
          fetchComments(page + 1);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page, fetchComments]);

  const handlePostInteraction = (
    postId: string,
    updates: Partial<FeedItemType>,
  ) => {
    setFeed((prev: any) => ({ ...prev, ...updates }));
  };

  // Prepend newly added top-level comment
  const handleCommentSuccess = (newComment: Comment) => {
    setComments((prev) => [newComment, ...prev]);
    setFeed((prev: any) => ({
      ...prev,
      commentCount: (prev.commentCount ?? 0) + 1,
    }));
  };

  const handleSortChange = (newSort: "latest" | "oldest" | "popular") => {
    setSort(newSort);
    setComments([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
    fetchComments(1, newSort).finally(() => setInitialLoading(false));
  };

  return (
    <div className="flex flex-col pb-20">
      {/* Back */}
      <button
        className="flex items-center gap-2 py-3"
        // className="flex items-center gap-2 py-3 fixed top-20 bg-white border-b border-gray-100 w-max"
        onClick={() => router.back()}
      >
        <IoArrowBack size={20} />
        <span className="font-semibold">Post</span>
      </button>

      {/* Main Post Details */}
      <div className="pt-4">
        <FeedReplyItem
          feed={feed}
          userId={userId}
          accessToken={accessToken}
          onRepostSuccess={() => {}}
          onDeleteSuccess={() => router.back()}
          onPostInteraction={handlePostInteraction}
          isFromFeedDetailsPage={true}
        />
      </div>

      {/* Comments header */}
      <div className="mt-4 mb-2 flex items-center justify-between">
        <h3 className="font-bold text-base">
          Replies
          {total > 0 && (
            <span className="text-gray-400 font-normal text-sm ml-1">
              ({total})
            </span>
          )}
        </h3>

        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
          {(["latest", "oldest", "popular"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSortChange(s)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all capitalize ${
                sort === s
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Skeleton */}
      {initialLoading && <CommentSkeleton />}

      {/* Skeleton */}
      {/* {initialLoading && (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 flex flex-col gap-2 pt-1">
                <div className="h-3 w-28 bg-gray-200 rounded" />
                <div className="h-3 w-full bg-gray-200 rounded" />
                <div className="h-3 w-2/3 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )} */}

      {/* Replace the comment list section: */}
      {!initialLoading && (
        <>
          {comments.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <FiMessageCircle size={24} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-bold text-base">
                No replies yet
              </p>
              <p className="text-gray-400 text-sm">Be the first to reply</p>
            </div>
          ) : (
            // No gap — X.com threads are tight
            <div className="flex flex-col">
              {comments.map((comment, idx) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  userId={userId}
                  postId={feed.postId || feed._id}
                  isLast={idx === comments.length - 1 && !hasMore}
                />
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-4" />

          {loading && comments.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
            </div>
          )}

          {!hasMore && comments.length > 0 && (
            <p className="text-center text-xs text-gray-300 py-6">— end —</p>
          )}
        </>
      )}
    </div>
  );
}
