import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

async function getFeedDetails(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}`;
    const feedData = await getFeedDetails(url);
    const feed = feedData?.data;

    // Get the first image from post_content array
    const feedImage = feed?.content?.post_content?.find(
      (item: any) => item.type === "image"
    )?.src;

    const feedTitle = feed?.content?.title || "Check out this post!";
    const authorName = feed?.smartsiteUserName || "Anonymous";
    const authorAvatar = feed?.smartsiteProfilePic;

    // Format date
    const createdDate = feed?.createdAt
      ? new Date(feed.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff",
            backgroundImage:
              "linear-gradient(to bottom right, #3b82f6, #8b5cf6)",
            padding: "40px",
          }}
        >
          {/* Feed Image */}
          {feedImage && (
            <div
              style={{
                display: "flex",
                marginBottom: "30px",
              }}
            >
              <img
                src={feedImage}
                alt="Feed"
                style={{
                  width: "600px",
                  height: "400px",
                  objectFit: "cover",
                  borderRadius: "20px",
                  border: "5px solid white",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                }}
              />
            </div>
          )}

          {/* Content Container */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "0 40px",
              maxWidth: "1000px",
            }}
          >
            {/* Feed Title */}
            <h1
              style={{
                fontSize: feedImage ? "48px" : "64px",
                fontWeight: "bold",
                color: "white",
                textAlign: "center",
                marginBottom: "20px",
                textShadow: "2px 2px 8px rgba(0,0,0,0.4)",
                lineHeight: 1.2,
              }}
            >
              {feedTitle}
            </h1>

            {/* Stats Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "30px",
                marginTop: "20px",
                backgroundColor: "rgba(255,255,255,0.2)",
                padding: "15px 30px",
                borderRadius: "50px",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "24px" }}>❤️</span>
                <span
                  style={{
                    fontSize: "22px",
                    color: "white",
                    fontWeight: "600",
                  }}
                >
                  {feed?.likeCount || 0}
                </span>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "24px" }}>💬</span>
                <span
                  style={{
                    fontSize: "22px",
                    color: "white",
                    fontWeight: "600",
                  }}
                >
                  {feed?.commentCount || 0}
                </span>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "24px" }}>🔄</span>
                <span
                  style={{
                    fontSize: "22px",
                    color: "white",
                    fontWeight: "600",
                  }}
                >
                  {feed?.repostCount || 0}
                </span>
              </div>
            </div>

            {/* Author Info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "30px",
                gap: "15px",
                backgroundColor: "rgba(255,255,255,0.15)",
                padding: "12px 25px",
                borderRadius: "50px",
                backdropFilter: "blur(10px)",
              }}
            >
              {authorAvatar && (
                <img
                  src={authorAvatar}
                  alt="Author"
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    border: "3px solid white",
                  }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span
                  style={{
                    fontSize: "24px",
                    color: "white",
                    fontWeight: "700",
                  }}
                >
                  {authorName}
                </span>
                {createdDate && (
                  <span
                    style={{
                      fontSize: "18px",
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    {createdDate}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error("OG Image generation error:", error);

    // Fallback image
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#3b82f6",
            backgroundImage:
              "linear-gradient(to bottom right, #3b82f6, #8b5cf6)",
          }}
        >
          <h1
            style={{
              fontSize: "72px",
              color: "white",
              fontWeight: "bold",
              textShadow: "2px 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            Feed Details
          </h1>
          <p
            style={{
              fontSize: "28px",
              color: "rgba(255,255,255,0.9)",
              marginTop: "20px",
            }}
          >
            Check out this amazing post!
          </p>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
