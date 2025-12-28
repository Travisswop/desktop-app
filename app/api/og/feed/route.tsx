import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

async function getFeedData(id: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}`,
      { cache: "no-store" }
    );
    const data = await response.json();
    return data?.data;
  } catch (error) {
    console.error("Error fetching feed:", error);
    return null;
  }
}

function isUrl(str: string) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response("Missing feed ID", { status: 400 });
    }

    const feed = await getFeedData(id);

    if (!feed) {
      return new Response("Feed not found", { status: 404 });
    }

    // Get post content
    const postContent = feed.content?.post_content || [];
    const firstMedia = postContent[0];
    const mediaType = firstMedia?.type;
    const isImage = mediaType === "image" || mediaType === "gif";

    // Determine background image
    let backgroundImage = "";
    if (isImage && firstMedia?.src) {
      backgroundImage = firstMedia.src;
    }

    // Get profile picture
    let profilePic = "";
    if (feed.smartsiteProfilePic) {
      profilePic = isUrl(feed.smartsiteProfilePic)
        ? feed.smartsiteProfilePic
        : `${process.env.NEXT_PUBLIC_API_URL}/images/user_avator/${feed.smartsiteProfilePic}@3x.png`;
    }

    const title = feed.content?.title || "Swop Feed Post";
    const description =
      feed.content?.description ||
      feed.description ||
      "Check out this post on Swop!";
    const userName = feed.smartsiteUserName || "Swop User";
    const userHandle = feed.smartsiteUserName
      ? `@${feed.smartsiteUserName}`
      : "Swop.ID";

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
            backgroundColor: "#4a7c59",
            padding: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#d4f4dd",
              borderRadius: "24px",
              padding: "48px",
              width: "100%",
              height: "100%",
              position: "relative",
            }}
          >
            {/* Background Image */}
            {backgroundImage && (
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "180px",
                  marginBottom: "32px",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                <img
                  src={backgroundImage}
                  alt="background"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            )}

            {/* Title */}
            <h1
              style={{
                fontSize: "52px",
                fontWeight: "400",
                color: "#2d5016",
                marginBottom: "20px",
                lineHeight: "1.2",
                maxHeight: "130px",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {title}
            </h1>

            {/* Description */}
            <p
              style={{
                fontSize: "32px",
                color: "#4a7c59",
                marginBottom: "auto",
                lineHeight: "1.4",
                maxHeight: "140px",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
              }}
            >
              {description}
            </p>

            {/* Footer with author info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "32px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                {profilePic && (
                  <img
                    src={profilePic}
                    alt={userName}
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      marginRight: "16px",
                      objectFit: "cover",
                    }}
                  />
                )}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "28px",
                      fontWeight: "600",
                      color: "#2d5016",
                    }}
                  >
                    {userName}
                  </span>
                  <span style={{ fontSize: "24px", color: "#5a8c5a" }}>
                    {userHandle}
                  </span>
                </div>
              </div>

              {/* Swop Planet Icon */}
              <div
                style={{
                  fontSize: "72px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                🪐
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
    console.error("Error generating OG image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
