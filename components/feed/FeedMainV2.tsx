"use client";

import React, { Suspense, useMemo } from "react";
import Feed from "./Feed";
import { useUser } from "@/lib/UserContext";
import { useSearchParams } from "next/navigation";
import SpotlightMap from "./SpotlightMap";
import PostFeed from "./PostFeed";
import CustomModal from "../modal/CustomModal";
import { useModalStore } from "@/zustandStore/modalstore";
import PerpsFeedBackfill from "./PerpsFeedBackfill";
import FeedMarketTicker from "./FeedMarketTicker";
import AaveFeedBackfill from "./AaveFeedBackfill";

const CONTAINER_WIDTH = "w-full sm:w-[520px]";

type FeedMainProps = {
  accessToken: string;
  userId: string;
  initialFeedData?: any;
};

const TAB_COMPONENTS: Record<string, React.ComponentType<any>> = {
  feed: Feed,
  map: SpotlightMap,
};

export default function FeedMainV2({
  accessToken,
  userId,
  initialFeedData,
}: FeedMainProps) {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const { isOpen, closeModal } = useModalStore();

  const tab = searchParams?.get("tab") || "feed";
  const isMapTab = tab === "map";

  const primaryMicrositeImg = useMemo(() => {
    if (!user?.microsites?.length) return "";
    const smartsite = user.microsites.find((m: any) => m.primary);
    return smartsite?.profilePic || "";
  }, [user?.microsites]);

  if (!userId || !accessToken) return null;

  const Component = TAB_COMPONENTS[tab] || Feed;

  return (
    <div
      className={
        isMapTab
          ? "w-full"
          : "w-full h-full relative"
      }
    >
      <FeedMarketTicker
        accessToken={accessToken}
        className={isMapTab ? "fixed inset-x-0 top-24 z-20 mx-6" : "mb-6"}
      />
      <div
        className={
          isMapTab
            ? "fixed inset-x-0 bottom-0 top-40 z-0 h-auto w-full overflow-hidden bg-white"
            : "w-full flex justify-center"
        }
      >
        <div
          className={
            isMapTab
              ? "h-full w-full overflow-hidden"
              : `${CONTAINER_WIDTH} overflow-y-auto`
          }
        >
          <PerpsFeedBackfill />
          <AaveFeedBackfill />

          <CustomModal isOpen={isOpen} onClose={closeModal} title="Create Post">
            <PostFeed
              primaryMicrositeImg={primaryMicrositeImg}
              userId={userId}
              token={accessToken}
            />
          </CustomModal>

          <Suspense fallback={<div className="text-black">Loading feed...</div>}>
            <Component
              accessToken={accessToken}
              userId={userId}
              initialFeedData={initialFeedData}
              />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
