// // app/api/og-feed/route.tsx
// import { ImageResponse } from "next/og";

// export async function GET(request: Request) {
//   try {
//     const { searchParams } = new URL(request.url);

//     const ensName = searchParams.get("ensName") || "swop.user";
//     const title = searchParams.get("title") || "Swop Feed";
//     const imageUrl = searchParams.get("image") || "";
//     const date = searchParams.get("date") || "";

//     return new ImageResponse(
//       (
//         <div
//           style={{
//             height: "100%",
//             width: "100%",
//             display: "flex",
//             flexDirection: "column",
//             backgroundColor: "#ffffff",
//           }}
//         >
//           {/* ENS Name at top */}
//           <div
//             style={{
//               fontSize: "40px",
//               fontWeight: "bold",
//               color: "#000000",
//               padding: "40px 60px 20px 60px",
//               display: "flex",
//             }}
//           >
//             {ensName}
//           </div>

//           {/* Title */}
//           <div
//             style={{
//               fontSize: "28px",
//               color: "#333333",
//               padding: "0 60px 30px 60px",
//               display: "flex",
//               lineHeight: "1.4",
//             }}
//           >
//             {title}
//           </div>

//           {/* Main Image */}
//           {imageUrl && (
//             <div
//               style={{
//                 display: "flex",
//                 flex: 1,
//                 margin: "0 60px 30px 60px",
//                 backgroundColor: "#f5f5f5",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 borderRadius: "12px",
//                 overflow: "hidden",
//               }}
//             >
//               <img
//                 src={imageUrl}
//                 width="1080"
//                 height="350"
//                 style={{
//                   width: "100%",
//                   height: "100%",
//                   objectFit: "cover",
//                 }}
//                 alt="Feed"
//               />
//             </div>
//           )}

//           {/* Footer with Logo and Date */}
//           <div
//             style={{
//               display: "flex",
//               alignItems: "center",
//               padding: "0 60px 40px 60px",
//               gap: "15px",
//             }}
//           >
//             {/* Swop Logo */}
//             <div
//               style={{
//                 width: "40px",
//                 height: "40px",
//                 borderRadius: "50%",
//                 background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 fontSize: "24px",
//                 fontWeight: "bold",
//                 color: "white",
//               }}
//             >
//               <img
//                 src={`${process.env.NEXT_PUBLIC_APP_URL}/astro-agent.png`}
//                 width="200"
//                 height="200"
//                 style={{
//                   width: "100%",
//                   height: "100%",
//                 }}
//                 alt="swop"
//               />
//             </div>
//             <div
//               style={{
//                 fontSize: "22px",
//                 color: "#666666",
//                 display: "flex",
//               }}
//             >
//               Swop • {date}
//             </div>
//           </div>
//         </div>
//       ),
//       {
//         width: 1200,
//         height: 630,
//       }
//     );
//   } catch (e: any) {
//     console.error("OG Image generation error:", e);

//     return new ImageResponse(
//       (
//         <div
//           style={{
//             height: "100%",
//             width: "100%",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             backgroundColor: "#fee",
//             fontSize: "30px",
//             color: "#c00",
//           }}
//         >
//           Error: {e.message}
//         </div>
//       ),
//       {
//         width: 1200,
//         height: 630,
//       }
//     );
//   }
// }

import { ImageResponse } from "next/og";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const ensName = searchParams.get("ensName") || "swop.user";
    const title = searchParams.get("title") || "Swop Feed";
    const imageUrl = searchParams.get("image") || "";
    const date = searchParams.get("date") || "";
    const showGifPlaceholder =
      searchParams.get("showGifPlaceholder") === "true";

    const hasImage = Boolean(imageUrl);
    const hasMedia = hasImage || showGifPlaceholder;

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
        }}
      >
        {/* ENS Name */}
        <div
          style={{
            fontSize: "40px",
            fontWeight: "bold",
            color: "#000000",
            padding: "40px 60px 20px 60px",
            display: "flex",
          }}
        >
          {ensName}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "28px",
            color: "#333333",
            padding: "0 60px 30px 60px",
            display: "flex",
            lineHeight: "1.4",
          }}
        >
          {title}
        </div>

        {/* Real image */}
        {hasImage && (
          <div
            style={{
              display: "flex",
              flex: 1,
              margin: "0 60px 30px 60px",
              backgroundColor: "#f5f5f5",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <img
              src={imageUrl}
              width="1080"
              height="350"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              alt="Feed"
            />
          </div>
        )}

        {/* GIF placeholder */}
        {!hasImage && showGifPlaceholder && (
          <div
            style={{
              display: "flex",
              flex: 1,
              margin: "0 60px 30px 60px",
              backgroundColor: "#f0f0f0",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "64px", display: "flex" }}>🎞️</div>
            <div
              style={{
                fontSize: "28px",
                color: "#888888",
                fontWeight: "bold",
                display: "flex",
              }}
            >
              GIF
            </div>
            <div
              style={{
                fontSize: "18px",
                color: "#aaaaaa",
                display: "flex",
              }}
            >
              View on Swop
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 60px 40px 60px",
            gap: "15px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: "bold",
              color: "white",
            }}
          >
            <img
              src={`${process.env.NEXT_PUBLIC_APP_URL}/astro-agent.png`}
              width="200"
              height="200"
              style={{ width: "100%", height: "100%" }}
              alt="swop"
            />
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "#666666",
              display: "flex",
            }}
          >
            Swop • {date}
          </div>
        </div>
      </div>,
      { width: 1200, height: 630 },
    );
  } catch (e: any) {
    console.error("OG Image generation error:", e);
    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fee",
          fontSize: "30px",
          color: "#c00",
        }}
      >
        Error: {e.message}
      </div>,
      { width: 1200, height: 630 },
    );
  }
}
