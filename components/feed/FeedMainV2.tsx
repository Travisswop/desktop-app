"use client";

import React, { Suspense, useState, useMemo } from "react";
import Feed from "./Feed";
// import Timeline from "./Timeline";
// import Transaction from "./Transaction";
import { useUser } from "@/lib/UserContext";
import { useSearchParams } from "next/navigation";
import SpotlightMap from "./SpotlightMap";
// import Ledger from "./Ledger";
import PostFeed from "./PostFeed";
import CustomModal from "../modal/CustomModal";
import { useModalStore } from "@/zustandStore/modalstore";
import { logger } from "ethers5";

const CONTAINER_WIDTH = "w-full sm:w-[520px]";

type FeedMainProps = {
  accessToken: string;
  userId: string;
  initialFeedData?: any;
};

const TAB_COMPONENTS: Record<string, React.ComponentType<any>> = {
  feed: Feed,
  //   timeline: Timeline,
  //   transaction: Transaction,
  //   ledger: Ledger,
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

  const [isPosting, setIsPosting] = useState(false);
  logger.info("FeedMainV2 rendered with isPosting:", isPosting);
  const [isPostLoading, setIsPostLoading] = useState(false);

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
            setIsPosting={setIsPosting}
            setIsPostLoading={setIsPostLoading}
          />
        </CustomModal>

        <Suspense fallback={<div>Loading feed...</div>}>
          <Component
            accessToken={accessToken}
            userId={userId}
            initialFeedData={initialFeedData}
            isPosting={isPosting}
            setIsPosting={setIsPosting}
            isPostLoading={isPostLoading}
            setIsPostLoading={setIsPostLoading}
          />
        </Suspense>
      </div>
    </div>
  );
}
