'use client';
import React, { Suspense, memo } from 'react';
// import TabSwitcher from "@/components/feed/TabSwitcher";
import FeedMain from '@/components/feed/FeedMain';
import { FeedMainQuietLoading } from '@/components/loading/TabSwitcherLoading';

const FeedPageLoading = () => (
  <div className="w-full sm:w-[520px] mx-auto">
    <FeedMainQuietLoading />
  </div>
);

const FeedPage = memo(() => {
  return (
    <div className="main-container mx-6">
      <div className="bg-white rounded-xl">
        {/* <div className="pb-6 border-b border-gray-200">
          <div className="flex items-center justify-between px-6 pt-6 sticky top-10">
            <Suspense fallback={<p>Loading...</p>}>
              <TabSwitcher />
            </Suspense>
          </div>
        </div> */}
        <Suspense fallback={<FeedPageLoading />}>
          <FeedMain />
        </Suspense>
      </div>
    </div>
  );
});

FeedPage.displayName = 'FeedPage';

export default FeedPage;
