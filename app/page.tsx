// import DashboardContent from "@/components/dashboard/DashboardContent";
import FeedMain from "@/components/feed/FeedMain";
// import FeedMain from "@/components/feed/FeedMain";
import Header from "@/components/Header";
import Sidenav from "@/components/Sidenav";
import { Suspense } from "react";
import TabSwitcher from "@/components/feed/TabSwitcher";
// import { Suspense } from "react";
// function DashboardPage() {
//   return (
//     <div className="min-h-screen">
//       <Sidenav />
//       <Header />
//       <div className="pl-64">
//         <main className="container mx-auto px-6 pt-6 max-w-7xl 2xl:max-w-full">
//           <DashboardContent />
//           <div className="bg-white rounded-xl w-full">
//             <h4 className="text-lg font-semibold p-4 pl-6 text-gray-800 ">
//               Feed
//             </h4>
//             <Suspense fallback={<p>Loading...</p>}>
//               <FeedMain isFromHome={true} />
//             </Suspense>
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// }
// export default DashboardPage;

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
      </div>
    </div>
  );
};

export default FeedPage;
