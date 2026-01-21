// app/api/rumble-embed/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // Use Rumble's oEmbed API to get the embed URL
    const oembedUrl = `https://rumble.com/api/Media/oembed.json?url=${encodeURIComponent(url)}`;

    const response = await fetch(oembedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Rumble API returned ${response.status}`);
    }

    const data = await response.json();

    // Extract the iframe src from the HTML
    if (data.html) {
      const iframeMatch = data.html.match(/src="([^"]+)"/);
      if (iframeMatch && iframeMatch[1]) {
        return NextResponse.json({ embedUrl: iframeMatch[1] });
      }
    }

    return NextResponse.json(
      { error: "Could not extract embed URL from oEmbed response" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Error fetching Rumble embed:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Rumble oEmbed API" },
      { status: 500 },
    );
  }
}
