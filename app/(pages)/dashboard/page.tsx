import DashboardContent from "@/components/dashboard/DashboardContent";
import FeedMain from "@/components/feed/FeedMain";
import { Suspense } from "react";

function DashboardPage() {
  return (
    <main className="mx-auto max-w-7xl 2xl:max-w-full">
      <DashboardContent />
      <div className="bg-white rounded-xl w-full">
        <h4 className="text-xl font-semibold p-4 pl-6 text-gray-800 ">Feed</h4>
        <Suspense fallback={<p>Loading...</p>}>
          <FeedMain isFromHome={true} />
        </Suspense>
      </div>
    </main>
  );
}
export default DashboardPage;
