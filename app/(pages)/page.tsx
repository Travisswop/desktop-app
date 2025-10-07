import FeedMain from "@/components/feed/FeedMain";
import { Suspense } from "react";
// import TabSwitcher from "@/components/feed/TabSwitcher";
import {
  FeedHomepageLoading,
  // TabSwitcherLoading,
} from "@/components/loading/TabSwitcherLoading";

const FeedPage = () => {
  return (
    <Suspense fallback={<FeedHomepageLoading />}>
      <FeedMain />
    </Suspense>
  );
};

export default FeedPage;
