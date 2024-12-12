"use client";
import React, { Suspense, useEffect, useState } from "react";
import Feed from "./Feed";
import Timeline from "./Timeline";
import Transaction from "./Transaction";
import PostFeed from "./PostFeed";
// import Connections from "./Connections";
import { useUser } from "@/lib/UserContext";
import { useSearchParams } from "next/navigation";
import Connections from "./Connections";
// import { cookies } from "next/headers";
import Cookies from "js-cookie";

// interface IProps {
//   isFromHome?: boolean;
// }
const FeedMain = ({ isFromHome = false }: any) => {
  const [isPosting, setIsPosting] = useState(false);
  const [isPostLoading, setIsPostLoading] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [primaryMicrositeImg, setPrimaryMicrositeImg] = useState<any>("");

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get("access-token");
      if (token) {
        setAccessToken(token);
      }
    };
    getAccessToken();
  }, []);

  const { user, loading } = useUser();

  useEffect(() => {
    if (user && user?.microsites && user?.microsites?.length > 0) {
      const smartsite = user.microsites.find((microsite) => microsite.primary);
      setPrimaryMicrositeImg(smartsite.profilePic);
      // console.log("smartsite detials", smartsite);
    }
  }, [user]);

  // console.log("primaryMicrositeImg", primaryMicrositeImg);

  const searchParams = useSearchParams();

  const tab = searchParams.get("tab");

  console.log("accessToken", accessToken);

  let ComponentToRender: any;

  if (!loading) {
    switch (tab) {
      case "feed":
        ComponentToRender = (
          <Feed
            accessToken={accessToken as string}
            userId={user?._id as any}
            setIsPosting={setIsPosting}
            isPosting={isPosting}
            setIsPostLoading={setIsPostLoading}
            isPostLoading={isPostLoading}
          />
        );
        break;
      case "timeline":
        ComponentToRender = (
          <Timeline
            accessToken={accessToken as string}
            userId={user?._id as any}
            setIsPosting={setIsPosting}
            isPosting={isPosting}
            setIsPostLoading={setIsPostLoading}
            isPostLoading={isPostLoading}
          />
        );
        break;
      case "transaction":
        ComponentToRender = (
          <Transaction
            accessToken={accessToken as string}
            userId={user?._id as any}
            setIsPosting={setIsPosting}
            isPosting={isPosting}
            setIsPostLoading={setIsPostLoading}
            isPostLoading={isPostLoading}
          />
        );
        break;
      default:
        ComponentToRender = (
          <Feed
            accessToken={accessToken as string}
            userId={user?._id as any}
            setIsPosting={setIsPosting}
            isPosting={isPosting}
            setIsPostLoading={setIsPostLoading}
            isPostLoading={isPostLoading}
          />
        ); // Default to Feed
    }
  }
  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="w-full flex relative">
          <div
            style={{ height: "calc(100vh - 108px)" }}
            className={`${
              isFromHome
                ? "w-3/5 xl:w-2/3 2xl:w-[54%]"
                : "w-3/5 xl:w-2/3 2xl:w-[54%]"
            }  overflow-y-auto`}
          >
            <PostFeed
              primaryMicrositeImg={primaryMicrositeImg}
              userId={user?._id as any}
              token={accessToken as string}
              setIsPosting={setIsPosting}
              setIsPostLoading={setIsPostLoading}
            />
            <hr />
            {/* component to render based on tab */}
            <Suspense fallback={"loading..."}>
              <section className="p-6">{ComponentToRender}</section>
            </Suspense>
          </div>
          <div
            style={{ height: "calc(100vh - 108px)" }}
            className="flex-1 overflow-y-auto"
          >
            <Suspense fallback={"loading..."}>
              <Connections
                userId={user?._id as any}
                accessToken={accessToken}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedMain;
