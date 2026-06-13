"use client";

import React, { Suspense, useMemo } from "react";
import Feed from "./Feed";
import { useUser } from "@/lib/UserContext";
import { useSearchParams } from "next/navigation";
import SpotlightMap from "./SpotlightMap";
import PostFeed from "./PostFeed";
import CustomModal from "../modal/CustomModal";
import { useModalStore } from "@/zustandStore/modalstore";

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

  const primaryMicrositeImg = useMemo(() => {
    if (!user?.microsites?.length) return "";
    const smartsite = user.microsites.find((m: any) => m.primary);
    return smartsite?.profilePic || "";
  }, [user?.microsites]);

  if (!userId || !accessToken) return null;

  const Component = TAB_COMPONENTS[tab] || Feed;

  return (
    <div className="w-full flex h-full justify-center relative">
      <div className={`${CONTAINER_WIDTH} overflow-y-auto`}>
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
  );
}
