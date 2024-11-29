"use client";
// import { withAuth } from "@/lib/withAuth";
// import { usePrivy } from "@privy-io/react-auth";
// import React, { useEffect } from "react";

// const Feed: React.FC = () => {
//   const { getAccessToken } = usePrivy();
//   const posts = [
//     { id: 1, content: "First post!" },
//     { id: 2, content: "Second post!" },
//     { id: 3, content: "Third post!" },
//   ];
//   useEffect(() => {
//     const token = async () => {
//       const accessToken = await getAccessToken();
//       console.log("accesstoken", accessToken);
//     };
//     token();
//   }, [getAccessToken]);
//   console.log("withAuth", withAuth);

//   return (
//     <div className="">
//       <h1>Feed</h1>
//       <ul>
//         {posts.map((post) => (
//           <li key={post.id}>{post.content}</li>
//         ))}
//       </ul>
//     </div>
//   );
// };

// export default withAuth(Feed);

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
            <TabSwitcher />
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
