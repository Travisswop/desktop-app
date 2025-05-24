"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Feed from "./Feed";
import Timeline from "./Timeline";
import Transaction from "./Transaction";
import PostFeed from "./PostFeed";
import { useUser } from "@/lib/UserContext";
import { useSearchParams } from "next/navigation";
import Connections from "./Connections";
import Cookies from "js-cookie";
import { Loader } from "lucide-react";

const FeedMain = ({ isFromHome = false }: { isFromHome?: boolean }) => {
  const [isPosting, setIsPosting] = useState(false);
  const [isPostLoading, setIsPostLoading] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [primaryMicrositeImg, setPrimaryMicrositeImg] = useState("");

  // Get the access token from cookies once on mount.
  useEffect(() => {
    const token = Cookies.get("access-token");
    if (token) {
      setAccessToken(token);
    }
  }, []);

  const { user, loading } = useUser();

  // Set the primary microsite image from the user's microsites.
  useEffect(() => {
    if (user && Array.isArray(user.microsites) && user.microsites.length > 0) {
      const smartsite = user.microsites.find(
        (microsite: any) => microsite.primary
      );
      if (smartsite) {
        setPrimaryMicrositeImg(smartsite.profilePic);
      }
    }
  }, [user]);

  const searchParams = useSearchParams();
  const tab = searchParams && searchParams.get("tab");

  const ComponentToRender = useMemo(() => {
    if (loading || !user?._id) return null;
    switch (tab) {
      case "feed":
        return (
          <Feed
            accessToken={accessToken}
            userId={user._id}
            setIsPosting={setIsPosting}
            isPosting={isPosting}
            setIsPostLoading={setIsPostLoading}
            isPostLoading={isPostLoading}
          />
        );
      case "timeline":
        return (
          <Timeline
            accessToken={accessToken}
            userId={user._id}
            setIsPosting={setIsPosting}
            isPosting={isPosting}
            setIsPostLoading={setIsPostLoading}
            isPostLoading={isPostLoading}
          />
        );
      case "transaction":
        return (
          <Transaction
            accessToken={accessToken}
            userId={user._id}
            setIsPosting={setIsPosting}
            isPosting={isPosting}
            setIsPostLoading={setIsPostLoading}
          />
        );
      default:
        return (
          <Feed
            accessToken={accessToken}
            userId={user._id}
            setIsPosting={setIsPosting}
            isPosting={isPosting}
            setIsPostLoading={setIsPostLoading}
            isPostLoading={isPostLoading}
          />
        );
    }
  }, [tab, loading, accessToken, user, isPosting, isPostLoading]);

  // Don't render connections until we have a valid user ID
  const shouldRenderConnections = !loading && user?._id;

  return (
    <div>
      {loading ? (
        <div className="flex flex-col items-center justify-center w-full h-[77vh] gap-2">
          <div className="flex items-center gap-2">
            <Loader size={24} className="animate-spin" aria-hidden="true" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Loading content...
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This will just take a moment
          </p>
        </div>
      ) : (
        <div className="w-full flex relative">
          <div
            style={{ height: "calc(100vh - 108px)" }}
            className={`${
              isFromHome
                ? "w-3/5 xl:w-2/3 2xl:w-[54%]"
                : "w-3/5 xl:w-2/3 2xl:w-[54%]"
            } overflow-y-auto`}
          >
            {user?._id && (
              <>
                <PostFeed
                  primaryMicrositeImg={primaryMicrositeImg}
                  userId={user._id}
                  token={accessToken}
                  setIsPosting={setIsPosting}
                  setIsPostLoading={setIsPostLoading}
                />
                <hr />
              </>
            )}
            {/* Render the selected component based on the 'tab' query parameter */}
            <Suspense fallback={"loading..."}>
              <section className="p-6">{ComponentToRender}</section>
            </Suspense>
          </div>
          <div
            style={{ height: "calc(100vh - 108px)" }}
            className="flex-1 overflow-y-auto"
          >
            {shouldRenderConnections ? (
              <Suspense fallback={"loading..."}>
                <Connections userId={user._id} accessToken={accessToken} />
              </Suspense>
            ) : (
              <p>Loading connections...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default FeedMain;
