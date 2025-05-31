"use client";

import React, { Suspense, useEffect, useState } from "react";
import Feed from "./Feed";
import Timeline from "./Timeline";
import Transaction from "./Transaction";
import PostFeed from "./PostFeed";
import { useUser } from "@/lib/UserContext";
import { useSearchParams } from "next/navigation";
import Connections from "./Connections";
import Cookies from "js-cookie";
import { FeedHomepageLoading } from "../loading/TabSwitcherLoading";
import SpotlightMap from "./SpotlightMap";

type AuthData = {
  userId: string;
  accessToken: string;
};

const FeedMain = ({ isFromHome = false }: { isFromHome?: boolean }) => {
  const [isPosting, setIsPosting] = useState(false);
  const [isPostLoading, setIsPostLoading] = useState(false);
  const [primaryMicrositeImg, setPrimaryMicrositeImg] = useState("");
  const [authData, setAuthData] = useState<AuthData | null>(null);

  // Combined auth data initialization
  useEffect(() => {
    const initializeAuth = () => {
      const token = Cookies.get("access-token");
      const userId = Cookies.get("user-id");
      if (token && userId) {
        setAuthData({ userId, accessToken: token });
      }
    };

    // Try immediately
    initializeAuth();

    // Fallback: try again after a short delay if first attempt fails
    const fallbackTimer = setTimeout(initializeAuth, 300);
    return () => clearTimeout(fallbackTimer);
  }, []);

  const { user, loading: userLoading } = useUser();

  // Sync auth data with user context
  useEffect(() => {
    if (user?._id && !authData?.userId) {
      const token = Cookies.get("access-token");
      if (token) {
        setAuthData({ userId: user._id, accessToken: token });
      }
    }
  }, [user, authData]);

  // Set primary microsite image
  useEffect(() => {
    if (user?.microsites && user?.microsites?.length > 0) {
      const smartsite = user?.microsites.find((m: any) => m.primary);
      if (smartsite) {
        setPrimaryMicrositeImg(smartsite.profilePic);
      }
    }
  }, [user?.microsites, user?.microsites?.length]);

  const searchParams = useSearchParams();
  const tab = searchParams?.get("tab") || "feed";

  // Derived state for the effective user ID
  const effectiveUserId = authData?.userId || user?._id;
  const effectiveToken = authData?.accessToken;

  // Don't render until we have all required data
  if (!effectiveUserId || !effectiveToken || userLoading) {
    return <FeedHomepageLoading />;
  }

  // Component render function (no longer memoized)
  const renderComponent = () => {
    switch (tab) {
      case "feed":
        return (
          <Feed
            accessToken={effectiveToken}
            userId={effectiveUserId}
            setIsPosting={setIsPosting}
            isPosting={isPosting}
            setIsPostLoading={setIsPostLoading}
            isPostLoading={isPostLoading}
          />
        );
      case "timeline":
        return (
          <Timeline
            accessToken={effectiveToken}
            userId={effectiveUserId}
            setIsPosting={setIsPosting}
            isPosting={isPosting}
            setIsPostLoading={setIsPostLoading}
            isPostLoading={isPostLoading}
          />
        );
      case "transaction":
        return (
          <Transaction
            accessToken={effectiveToken}
            userId={effectiveUserId}
            setIsPosting={setIsPosting}
            isPosting={isPosting}
            setIsPostLoading={setIsPostLoading}
          />
        );
      default:
        return (
          <Feed
            accessToken={effectiveToken}
            userId={effectiveUserId}
            setIsPosting={setIsPosting}
            isPosting={isPosting}
            setIsPostLoading={setIsPostLoading}
            isPostLoading={isPostLoading}
          />
        );
    }
  };

  return (
    <div className="w-full flex relative">
      <div
        style={{ height: "calc(100vh - 108px)" }}
        className={`${
          isFromHome
            ? "w-3/5 xl:w-2/3 2xl:w-[54%]"
            : "w-3/5 xl:w-2/3 2xl:w-[54%]"
        } overflow-y-auto`}
      >
        <PostFeed
          primaryMicrositeImg={primaryMicrositeImg}
          userId={effectiveUserId}
          token={effectiveToken}
          setIsPosting={setIsPosting}
          setIsPostLoading={setIsPostLoading}
        />
        <hr />

        <Suspense fallback={<div>Loading feed...</div>}>
          <section className="p-6">{renderComponent()}</section>
        </Suspense>
      </div>

      <div
        style={{ height: "calc(100vh - 108px)" }}
        className="flex-1 overflow-y-auto"
      >
        <SpotlightMap token={effectiveToken} />
        <Connections userId={effectiveUserId} accessToken={effectiveToken} />
      </div>
    </div>
  );
};

export default FeedMain;
