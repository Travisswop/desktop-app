import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_TIMEOUT_MS = 15000;

/**
 * Forwards a subscription call to the backend and ALWAYS answers JSON with the
 * upstream status. The client parses this response; before this existed, an
 * upstream HTML error page or a hung request left the Subscribe button
 * spinning forever with no error shown.
 */
export async function proxySubscriptionPost(
  req: NextRequest,
  upstreamPath: string,
  logLabel: string
) {
  try {
    const body = await req.json();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/subscription/${upstreamPath}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    try {
      return NextResponse.json(text ? JSON.parse(text) : {}, {
        status: res.status,
      });
    } catch {
      console.error(
        `${logLabel}: non-JSON upstream response (${res.status})`,
        text.slice(0, 500)
      );
      return NextResponse.json(
        { error: "Subscriptions are temporarily unavailable. Please try again." },
        { status: 502 }
      );
    }
  } catch (err: any) {
    console.error(`${logLabel} failed:`, err);
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return NextResponse.json(
      {
        error: timedOut
          ? "The request timed out. Please try again."
          : "Something went wrong. Please try again.",
      },
      { status: timedOut ? 504 : 500 }
    );
  }
}
