import React, { Suspense } from "react";
import TabSwitcher from "@/components/feed/TabSwitcher";
import FeedMain from "@/components/feed/FeedMain";

const FeedPage = () => {
  return (
    <div className="main-container">
      <div className="bg-white rounded-xl">
        <div className="pb-6 border-b border-gray-200">
          <div className="flex items-center justify-between px-6 pt-6 sticky top-10 z-10">
            {/* tab switcher */}
            <Suspense fallback={<p>Loading...</p>}>
              <TabSwitcher />
            </Suspense>

            {/* search with swop id */}
            {/* <SearchSwopId /> */}
          </div>
        </div>
        <Suspense fallback={<p>Loading...</p>}>
          <FeedMain />
        </Suspense>
      </div>
    </div>
  );
};

export default FeedPage;
