import { getFeedDetails } from "@/actions/postFeed";
import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Image generation
export default async function Image({ params }: { params: { id: string } }) {
  const { id } = await params;
  const feedData = await getFeedDetails(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/feed/${id}`
  );

  const feed = feedData?.data;
  console.log("feedrr from meta data in og", feed);

  if (!feed) {
    return {
      title: "Feed",
      description: "Feed details",
    };
  }

  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 128,
          background: "green",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {feed.content.title}
      </div>
    )
  );
}
