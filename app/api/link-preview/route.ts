// app/api/link-preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
      (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Open Graph metadata
    const metadata = {
      title:
        $('meta[property="og:title"]').attr("content") || $("title").text(),
      description:
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content"),
      image: $('meta[property="og:image"]').attr("content"),
      url: $('meta[property="og:url"]').attr("content") || url,
      siteName: $('meta[property="og:site_name"]').attr("content"),
    };

    return NextResponse.json(metadata);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch preview" },
      { status: 500 }
    );
  }
}
