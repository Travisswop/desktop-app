import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const ensName = searchParams.get("ensName") || "swop.user";
    const title = searchParams.get("title") || "Swop Feed";
    const imageUrl = searchParams.get("image") || "";
    const date = searchParams.get("date") || "";

    // Load the Swop logo
    const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/astro-agent.png`;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#ffffff",
            padding: "40px",
          }}
        >
          {/* ENS Name at top (bold, linked) */}
          <div
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#000000",
              marginBottom: "20px",
            }}
          >
            {ensName}
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: "40px",
              fontWeight: "600",
              color: "#1a1a1a",
              marginBottom: "30px",
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>

          {/* Main Image */}
          {imageUrl && (
            <div
              style={{
                display: "flex",
                flex: 1,
                marginBottom: "30px",
                borderRadius: "12px",
                overflow: "hidden",
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
              gap: "12px",
            }}
          >
            <img
              src={logoUrl}
              width="32"
              height="32"
              style={{
                borderRadius: "50%",
              }}
              alt="Swop logo"
            />
            <div
              style={{
                fontSize: "20px",
                color: "#666666",
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
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
