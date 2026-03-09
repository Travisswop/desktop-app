import { Suspense } from "react";
import { FeedMainComponentLoading } from "@/components/loading/TabSwitcherLoading";
import { cookies } from "next/headers";
import { getUserFeed } from "@/actions/postFeed";
import FeedMainV2 from "@/components/feed/FeedMainV2";

const FeedPage = async () => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access-token")?.value || "";
  const userId = cookieStore.get("user-id")?.value;

  const url = `${API_URL}/api/v2/feed/user/connect/${userId}?page=1&limit=5`;
  const newFeedData = await getUserFeed(url, accessToken);
  console.log("newFeedDatass", newFeedData);

  return (
    <Suspense
      fallback={
        <div className="w-full sm:w-[520px] mx-auto">
          <FeedMainComponentLoading />
        </div>
      }
    >
      <FeedMainV2
        accessToken={accessToken}
        userId={userId || ""}
        initialFeedData={newFeedData}
      />
    </Suspense>
  );
};

export default FeedPage;
