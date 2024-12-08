import DashboardContent from "@/components/dashboard/DashboardContent";
import FeedMain from "@/components/feed/FeedMain";
import Header from "@/components/Header";
import Sidenav from "@/components/Sidenav";
import { Suspense } from "react";
function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Sidenav />
      <Header />
      <div className="pl-64">
        <main className="container mx-auto px-6 pt-6 max-w-7xl 2xl:max-w-full">
          <DashboardContent />
          <div className="bg-white rounded-xl w-full">
            <Suspense fallback={<p>Loading...</p>}>
              <FeedMain isFromHome={true} />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardPage;
