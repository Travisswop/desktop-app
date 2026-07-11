"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useModalStore } from "@/zustandStore/modalstore";
// import { FeedMainComponentLoading } from "@/components/loading/TabSwitcherLoading";
import FeedLoading from "@/components/loading/FeedLoading";
import FeedItem from "@/components/feed/FeedItem";
import logger from "@/utils/logger";
// import logger from "@/utils/logger";
import { apiFetch } from "@/lib/api/apiFetch";
import {
  getFeedItemKey,
  mergeFreshFeedItems,
  mergeUniqueFeedItems,
} from "@/components/feed/feedPagination";

dayjs.extend(relativeTime);

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function EmbeddedFeed({
  accessToken,
  userId,
  micrositeId,
  isOrderPreview = false,
  plain = false,
}: {
  accessToken: string;
  userId: string;
  initialFeedData?: any;
  micrositeId: string;
  isOrderPreview?: boolean;
  /**
   * Feed-only tab rendering: suppresses the card chrome (white background,
   * rounded corners, padding) AND the fixed-height inner-scroll box, so the
   * feed fills the whole tab panel and paginates with the surrounding page
   * scroll (viewport-intersection sentinel — works inside any ancestor
   * scroller, public page and builder canvas alike).
   */
  plain?: boolean;
}) {
  const feedRefetchTrigger = useModalStore((s) => s.feedRefetchTrigger);
  // logger.info("Feed feedRefetchTrigger", feedRefetchTrigger);

  const [feedData, setFeedData] = useState<any[]>([]);

  const [hasMore, setHasMore] = useState(true);
  logger.info("Feed component rendered with initial feedData:", feedData);
  // logger.info("Feed component rendered with initial hasMore:", hasMore);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const fetchFeedData = useCallback(
    async (reset = false) => {
      // console.log("reset", reset);

      if (!micrositeId) {
        setFeedData([]);
        setHasMore(false);
        return;
      }
      if (!reset && !hasMoreRef.current) return;
      if (isFetchingRef.current) return;

      isFetchingRef.current = true;

      try {
        const currentPage = reset ? 1 : pageRef.current;
        const query = new URLSearchParams({
          page: String(currentPage),
          limit: "10",
        });
        if (userId) query.set("userId", userId);

        const url = `${API_URL}/api/v2/feed/smartsite-feed/${micrositeId}?${query.toString()}`;
        logger.info("Fetching feed data from URL:", url);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (accessToken) {
          headers.authorization = `Bearer ${accessToken}`;
        }

        const response = await apiFetch(url, {
          method: "GET",
          headers,
          cache: "no-store",
        });
        const data = await response.json();
        const feedItems = data?.data ?? [];

        if (reset) {
          setFeedData(mergeFreshFeedItems(feedItems, []));
          pageRef.current = 2;
          setHasMore(data?.pagination?.totalPages > 1);
        } else {
          setFeedData((prev) => mergeUniqueFeedItems(prev, feedItems));
          pageRef.current += 1;

          // ✅ safer logic
          setHasMore(pageRef.current <= data?.pagination?.totalPages);
        }
    } catch (error) {
      console.error(error);
      setHasMore(false);
    } finally {
      isFetchingRef.current = false;
    }
  },
    [accessToken, micrositeId, userId],
  );

  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    fetchFeedData(true);
  }, [fetchFeedData]);

  // refetch trigger
  useEffect(() => {
    if (feedRefetchTrigger === 0) return;

    pageRef.current = 1;
    hasMoreRef.current = true;
    setHasMore(true);
    fetchFeedData(true);
  }, [feedRefetchTrigger, fetchFeedData]);

  // SmartSites always scroll like a webpage: the feed has NO inner scroll
  // box in any mode — it lives in the page's own scroll and paginates on a
  // viewport-intersection sentinel, which fires no matter which ancestor
  // element does the scrolling. Re-observing on every page keeps loading
  // when the sentinel never LEAVES the viewport (a stationary observer
  // only fires on enter/leave transitions).
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Auto-fill guard: posts render short until their media/cards load, so
  // "sentinel still in range after a page" can stay true for many pages and
  // cascade through the whole feed. Allow a few fill-the-viewport loads,
  // then require a real scroll before loading more.
  const autoFillsRef = useRef(0);
  const feedLength = feedData.length;
  useEffect(() => {
    if (isOrderPreview) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // Zero-height means a hidden tab panel (display:none) — never load
    // for those.
    const sentinelInLoadRange = () => {
      const rect = sentinel.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      return rect.height > 0 && rect.top < viewportHeight + 600;
    };

    // Primary driver: any scroll (capture phase sees the page's inner
    // scroll container) re-checks the sentinel position. A real scroll
    // also re-arms the auto-fill budget.
    let scrollCheckQueued = false;
    const handleScroll = () => {
      autoFillsRef.current = 0;
      if (scrollCheckQueued) return;
      scrollCheckQueued = true;
      requestAnimationFrame(() => {
        scrollCheckQueued = false;
        if (sentinelInLoadRange()) {
          fetchFeedData(false);
        }
      });
    };
    window.addEventListener("scroll", handleScroll, true);

    // Secondary driver: intersection transitions catch non-scroll layout
    // changes (images inflating, tab panels becoming visible).
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            fetchFeedData(false);
          }
        },
        { rootMargin: "600px" },
      );
      observer.observe(sentinel);
    }

    // Fill-the-viewport check on each page: keeps loading while the
    // sentinel is still in range after a page renders (no transition, no
    // scroll), bounded by the auto-fill budget.
    if (sentinelInLoadRange() && autoFillsRef.current < 3) {
      autoFillsRef.current += 1;
      fetchFeedData(false);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      observer?.disconnect();
    };
  }, [isOrderPreview, fetchFeedData, hasMore, feedLength]);

  const feedItems = isOrderPreview ? feedData.slice(0, 3) : feedData;
  const feedContent = feedItems.map((feed: any, index: number) => (
    <div
      key={`embedded-feed-item-${index}-${getFeedItemKey(feed) || "no-id"}`}
    >
      <FeedItem
        feed={feed}
        userId={userId}
        accessToken={accessToken}
        onRepostSuccess={() => {}}
        onDeleteSuccess={() => {
          pageRef.current = 1;
          hasMoreRef.current = true;
          setHasMore(true);
          fetchFeedData(true);
        }}
        onPostInteraction={() => {}}
      />
    </div>
  ));

  return (
    <div
      className={`w-full flex flex-col gap-4 ${
        plain ? "" : "bg-white rounded-lg p-4"
      } ${isOrderPreview ? "max-h-[34rem] overflow-hidden" : "grow"}`}
    >
      {isOrderPreview ? (
        <div className="flex flex-col gap-4">
          {feedItems.length > 0 ? feedContent : <FeedLoading />}
        </div>
      ) : (
        <>
          {feedContent}
          {hasMore ? (
            <div ref={sentinelRef}>
              <FeedLoading />
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500">No more posts</p>
          )}
        </>
      )}
    </div>
  );
}
