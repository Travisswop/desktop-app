// app/api/og-feed/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const ensName = searchParams.get("ensName") || "swop.user";
    const title = searchParams.get("title") || "Swop Feed";
    const imageUrl = searchParams.get("image") || "";
    const date = searchParams.get("date") || "";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
            padding: "50px 60px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {/* ENS Name at top (bold) */}
          <div
            style={{
              fontSize: "32px",
              fontWeight: "700",
              color: "#1a1a1a",
              marginBottom: "16px",
              display: "flex",
            }}
          >
            {ensName}
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "26px",
              fontWeight: "500",
              color: "#4a4a4a",
              marginBottom: "32px",
              lineHeight: 1.4,
              maxHeight: "120px",
              overflow: "hidden",
              display: "flex",
            }}
          >
            {title}
          </div>

          {/* Main Image - takes remaining space */}
          {imageUrl && (
            <div
              style={{
                display: "flex",
                flex: 1,
                marginBottom: "24px",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid #e5e5e5",
              }}
            >
              <img
                src={imageUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                alt="Feed content"
              />
            </div>
          )}

          {/* Footer with Logo and Date */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              paddingTop: "8px",
            }}
          >
            {/* Swop Logo Placeholder - you'll need to fetch the actual logo */}
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: "bold",
                color: "white",
              }}
            >
              S
            </div>
            <div
              style={{
                fontSize: "20px",
                color: "#6b7280",
                display: "flex",
              }}
            >
              Swop • {date}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error("OG Image generation error:", e);
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    });
  }
}
