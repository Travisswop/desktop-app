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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    // ── Pre-fetch logo as base64 ──────────────────────────────────────────
    let logoBase64: string | null = null;
    try {
      const logoRes = await fetch(`${appUrl}/astro-agent.png`);
      if (logoRes.ok) {
        const logoBuffer = await logoRes.arrayBuffer();
        logoBase64 = `data:image/png;base64,${Buffer.from(logoBuffer).toString("base64")}`;
      }
    } catch (e) {
      console.error("Logo fetch failed:", e);
    }

    // ── Validate feed image is accessible ────────────────────────────────
    let resolvedImageUrl = "";
    if (imageUrl) {
      try {
        const imgRes = await fetch(imageUrl, { method: "HEAD" });
        if (imgRes.ok) {
          resolvedImageUrl = imageUrl;
        } else {
          console.error("Feed image not accessible:", imgRes.status, imageUrl);
        }
      } catch (e) {
        console.error("Feed image HEAD check failed:", e);
      }
    }

    const hasImage = Boolean(resolvedImageUrl);
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
            fontSize: "38px",
            fontWeight: "bold",
            color: "#000000",
            padding: hasMedia ? "40px 60px 16px 60px" : "60px 60px 24px 60px",
            display: "flex",
          }}
        >
          {ensName}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: hasMedia ? "26px" : "42px",
            color: "#333333",
            padding: hasMedia ? "0 60px 24px 60px" : "0 60px 0 60px",
            display: "flex",
            lineHeight: "1.5",
            flex: hasMedia ? undefined : 1,
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
              margin: "0 60px 24px 60px",
              backgroundColor: "#f5f5f5",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={resolvedImageUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "12px",
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
              margin: "0 60px 24px 60px",
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
                display: "flex",
                fontWeight: "bold",
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
            gap: "14px",
            marginTop: "auto",
          }}
        >
          {/* Logo — use base64 if available, fallback to colored circle */}
          {logoBase64 ? (
            <img
              src={logoBase64}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                flexShrink: 0,
              }}
              alt="swop"
            />
          ) : (
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: "bold",
                color: "white",
                flexShrink: 0,
              }}
            >
              S
            </div>
          )}

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
    console.error("OG Image generation error:", e.message);

    // ── Fallback image — no external deps, guaranteed to work ─────────────
    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            color: "white",
            display: "flex",
          }}
        >
          Swop
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "rgba(255,255,255,0.8)",
            marginTop: "16px",
            display: "flex",
          }}
        >
          Web3 Social
        </div>
      </div>,
      { width: 1200, height: 630 },
    );
  }
}
