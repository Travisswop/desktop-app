import FeedMain from '@/components/feed/FeedMain';
import Header from '@/components/Header';
import Sidenav from '@/components/Sidenav';
import { Suspense } from 'react';
import TabSwitcher from '@/components/feed/TabSwitcher';

const FeedPage = () => {
  return (
    <div className="min-h-screen">
      <Sidenav />
      <Header />
      <div className="pl-64">
        <div className="main-container p-6">
          <div className="bg-white rounded-lg">
            <div className="pb-6 border-b border-gray-200">
              <div className="flex items-center justify-between px-6 pt-6 sticky top-10 z-10">
                <Suspense fallback={<p>Loading...</p>}>
                  <TabSwitcher />
                </Suspense>
              </div>
            </div>
            <Suspense fallback={<p>Loading...</p>}>
              <FeedMain />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
