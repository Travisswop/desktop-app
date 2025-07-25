"use client";
import React, { Suspense, memo } from "react";
import TabSwitcher from "@/components/feed/TabSwitcher";
import FeedMain from "@/components/feed/FeedMain";

const FeedPage = memo(() => {
  return (
    <div className="main-container mx-6">
      <div className="bg-white rounded-xl">
        <div className="pb-6 border-b border-gray-200">
          <div className="flex items-center justify-between px-6 pt-6 sticky top-10">
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
});

FeedPage.displayName = "FeedPage";

export default FeedPage;
