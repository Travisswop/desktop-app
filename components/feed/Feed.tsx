"use client";

import { getUserFeed } from "@/actions/postFeed";
import React, { useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { FeedMainComponentLoading } from "../loading/TabSwitcherLoading";
import FeedLoading from "../loading/FeedLoading";
import FeedItem from "./FeedItem";
import { useModalStore } from "@/zustandStore/modalstore";
import InfiniteScroll from "react-infinite-scroll-component";

dayjs.extend(relativeTime);

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Feed({
  accessToken,
  userId,
  initialFeedData,
}: {
  accessToken: string;
  userId: string;
  initialFeedData?: any;
}) {
  const initialArray = initialFeedData?.data ?? [];
  const initialTotalPages = initialFeedData?.pagination?.totalPages ?? 1;

  const feedRefetchTrigger = useModalStore((s) => s.feedRefetchTrigger);
  // logger.info("Feed feedRefetchTrigger", feedRefetchTrigger);

  const [feedData, setFeedData] = useState(initialArray);
  const [initialLoading, setInitialLoading] = useState(
    initialArray.length === 0,
  );

  const [hasMore, setHasMore] = useState(
    initialArray.length > 0 && initialTotalPages > 1,
  );
  // logger.info("Feed component rendered with initial feedData:", feedData);
  // logger.info("Feed component rendered with initial hasMore:", hasMore);

  const pageRef = useRef(initialArray.length > 0 ? 2 : 1);

  const fetchFeedData = useCallback(
    async (reset = false) => {
      // console.log("reset", reset);

      if (!reset && !hasMore) return;

      try {
        const currentPage = reset ? 1 : pageRef.current;

        const url = `${API_URL}/api/v2/feed/user/connect/${userId}?page=${currentPage}&limit=10`;
        console.log("fetch urls", url);

        const response = await getUserFeed(url, accessToken);

        const data = response?.data ?? [];
        // const totalPages = response?.pagination?.totalPages ?? 1;

        console.log("data fetch 1", data);

        if (reset) {
          setFeedData(data);
          pageRef.current = 2;
          setHasMore(initialTotalPages > pageRef.current);
          console.log("data fetch 2", data);
        } else {
          setFeedData((prev: any[]) => [...prev, ...data]);
          pageRef.current += 1;

          // ✅ safer logic
          setHasMore(pageRef.current <= initialTotalPages);
        }
      } catch (error) {
        console.error(error);
        setHasMore(false);
      } finally {
        setInitialLoading(false);
      }
    },
    [hasMore, userId, accessToken, initialTotalPages],
  );

  // initial load
  useEffect(() => {
    if (initialArray.length === 0) {
      fetchFeedData();
    }
  }, [fetchFeedData, initialArray.length]);

  // refetch trigger
  useEffect(() => {
    if (feedRefetchTrigger === 0) return;

    pageRef.current = 1;
    setHasMore(true);
    fetchFeedData(true);
  }, [feedRefetchTrigger, fetchFeedData]);

  if (initialLoading) {
    return (
      <div className="w-full sm:w-[520px]">
        <FeedMainComponentLoading />
      </div>
    );
  }

  return (
    <div className="w-full flex gap-10">
      <div className="w-full flex flex-col gap-4">
        <InfiniteScroll
          dataLength={feedData.length}
          next={fetchFeedData}
          hasMore={hasMore}
          loader={<FeedLoading />}
          endMessage={
            <p className="text-center text-sm text-gray-500">No more posts</p>
          }
        >
          {feedData.map((feed: any) => (
            <FeedItem
              key={feed._id}
              feed={feed}
              userId={userId}
              accessToken={accessToken}
              onRepostSuccess={() => {}}
              onDeleteSuccess={() => {
                pageRef.current = 1;
                setHasMore(true);
                fetchFeedData(true);
              }}
              onPostInteraction={() => {}}
            />
          ))}
        </InfiniteScroll>
      </div>
    </div>
  );
}
