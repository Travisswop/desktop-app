"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useModalStore } from "@/zustandStore/modalstore";
import InfiniteScroll from "react-infinite-scroll-component";
// import { FeedMainComponentLoading } from "@/components/loading/TabSwitcherLoading";
import FeedLoading from "@/components/loading/FeedLoading";
import FeedItem from "@/components/feed/FeedItem";
import logger from "@/utils/logger";
// import logger from "@/utils/logger";

dayjs.extend(relativeTime);

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function EmbeddedFeed({
  accessToken,
  userId,
  micrositeId,
}: {
  accessToken: string;
  userId: string;
  initialFeedData?: any;
  micrositeId: string;
}) {
  const feedRefetchTrigger = useModalStore((s) => s.feedRefetchTrigger);
  // logger.info("Feed feedRefetchTrigger", feedRefetchTrigger);

  const [feedData, setFeedData] = useState([]);

  const [hasMore, setHasMore] = useState(true);
  logger.info("Feed component rendered with initial feedData:", feedData);
  // logger.info("Feed component rendered with initial hasMore:", hasMore);

  const pageRef = useRef(1);

  const fetchFeedData = useCallback(
    async (reset = false) => {
      // console.log("reset", reset);

      if (!reset && !hasMore) return;

      try {
        const currentPage = reset ? 1 : pageRef.current;

        const url = `${API_URL}/api/v2/feed/smartsite-feed/${micrositeId}?userId=${userId}&page=${currentPage}&limit=10`;
        logger.info("Fetching feed data from URL:", url);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });
        const data = await response.json();
        const feedItems = data?.data ?? [];

        if (reset) {
          setFeedData(feedItems);
          pageRef.current = 2;
          setHasMore(data?.pagination?.totalPages > 1);
        } else {
          setFeedData((prev) => [...prev, ...feedItems]);
          pageRef.current += 1;

          // ✅ safer logic
          setHasMore(pageRef.current <= data?.pagination?.totalPages);
        }
      } catch (error) {
        console.error(error);
        setHasMore(false);
      }
    },
    [hasMore, accessToken, micrositeId],
  );

  // refetch trigger
  useEffect(() => {
    if (feedRefetchTrigger === 0) return;

    pageRef.current = 1;
    setHasMore(true);
    fetchFeedData(true);
  }, [feedRefetchTrigger, fetchFeedData]);

  return (
    <div className="w-full flex flex-col gap-4 h-[40rem] overflow-auto hide-scrollbar bg-white rounded-lg p-4">
      <InfiniteScroll
        dataLength={feedData.length}
        next={fetchFeedData}
        hasMore={hasMore}
        loader={<FeedLoading />}
        endMessage={
          <p className="text-center text-sm text-gray-500">No more posts</p>
        }
        className=""
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
  );
}
