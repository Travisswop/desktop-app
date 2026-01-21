// app/api/tiktok-resolve/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // Check if it's already a full TikTok URL
    if (url.includes("tiktok.com/@") || url.includes("/video/")) {
      return NextResponse.json({ resolvedUrl: url });
    }

    // If it's a short URL (vt.tiktok.com or vm.tiktok.com), resolve it
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    // Get the final URL after redirects
    const resolvedUrl = response.url;

    if (
      resolvedUrl &&
      (resolvedUrl.includes("tiktok.com/@") || resolvedUrl.includes("/video/"))
    ) {
      return NextResponse.json({ resolvedUrl });
    }

    return NextResponse.json(
      { error: "Could not resolve TikTok URL" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Error resolving TikTok URL:", error);
    return NextResponse.json(
      { error: "Failed to resolve TikTok URL" },
      { status: 500 },
    );
  }
}
