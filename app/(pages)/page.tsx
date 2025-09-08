import FeedMain from "@/components/feed/FeedMain";
import { Suspense } from "react";
import TabSwitcher from "@/components/feed/TabSwitcher";
import {
  FeedHomepageLoading,
  TabSwitcherLoading,
} from "@/components/loading/TabSwitcherLoading";

const FeedPage = () => {
  return (
    <div className="bg-white rounded-lg">
      <div className="pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between px-6 pt-6 sticky top-10">
          <Suspense fallback={<TabSwitcherLoading />}>
            <TabSwitcher />
          </Suspense>
        </div>
      </div>
      <Suspense fallback={<FeedHomepageLoading />}>
        <FeedMain />
      </Suspense>
    </div>
  );
};

export default FeedPage;
