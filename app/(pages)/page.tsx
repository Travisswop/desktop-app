import FeedMain from "@/components/feed/FeedMain";
import { Suspense } from "react";
import { FeedMainComponentLoading } from "@/components/loading/TabSwitcherLoading";

const FeedPage = () => {
  return (
    <Suspense
      fallback={
        <div className="w-full sm:w-[520px] mx-auto">
          <FeedMainComponentLoading />
          {/* <p>loading...</p> */}
        </div>
      }
    >
      <FeedMain />
    </Suspense>
  );
};

export default FeedPage;
