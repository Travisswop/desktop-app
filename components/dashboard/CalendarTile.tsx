"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import { CalendarDays, Video } from "lucide-react";
import {
  getBookingSummary,
  type BookingSummary,
} from "@/actions/booking";

const SWATCH = "#E7EDD6";

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Full-width dashboard Calendar tile (design: Dashboard Calendar Canvas).
 * Left: count + label. Right: next three bookings + connection state.
 * Self-fetching; renders a set-up CTA until the Calendar template exists.
 */
export default function CalendarTile() {
  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("access-token") || "";
    if (!token) {
      setLoading(false);
      return;
    }
    getBookingSummary(token).then((data) => {
      setSummary(data);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  const next = (summary?.upcoming ?? []).slice(0, 3);
  const upcoming = summary?.counts.upcoming30d ?? 0;
  const thisWeek = summary?.counts.thisWeek ?? 0;
  const hasWidget = Boolean(summary?.widget);
  const connected = Boolean(summary?.google.connected);

  return (
    <Link
      href={hasWidget ? "/dashboard/calendar" : "/smartsite"}
      className="grid gap-5 rounded-[18px] border border-black/[0.06] bg-white p-4 no-underline shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)] sm:grid-cols-[212px_1fr]"
    >
      {/* left block */}
      <div className="flex h-full flex-col gap-3 sm:border-r sm:border-black/[0.06] sm:pr-5">
        <div className="flex items-center justify-between">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-gray-950"
            style={{ backgroundColor: SWATCH }}
          >
            <CalendarDays className="h-[18px] w-[18px]" />
          </span>
          <span className="font-mono text-[26px] font-semibold tracking-[-1px] text-gray-950">
            {hasWidget ? upcoming : "—"}
          </span>
        </div>
        <div>
          <p className="text-[14px] font-semibold tracking-[-0.2px] text-gray-950">
            Calendar
          </p>
          <p className="mt-0.5 text-[11.5px] font-medium text-gray-500">
            {hasWidget
              ? `${thisWeek} this week${summary?.widget?.published ? "" : " · not published"}`
              : "Add the Calendar template"}
          </p>
        </div>
      </div>

      {/* right block */}
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
            Next up
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.4px] text-gray-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected
                  ? "bg-emerald-600 shadow-[0_0_0_3px_rgba(5,150,105,0.15)]"
                  : "bg-gray-300"
              }`}
            />
            {connected ? "Google connected" : "Not connected"}
          </span>
        </div>

        {next.length ? (
          <div className="flex flex-col">
            {next.map((b, i) => (
              <div
                key={b._id}
                className={`grid grid-cols-[72px_1fr_auto] items-center gap-3 py-[9px] sm:grid-cols-[96px_150px_1fr_auto] ${
                  i ? "border-t border-black/[0.04]" : ""
                }`}
              >
                <span className="font-mono text-[12.5px] font-semibold text-gray-950">
                  {timeOf(b.startTime)}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#e8e8e6] text-[10px] font-semibold text-gray-950">
                    {initialsOf(b.visitorName)}
                  </span>
                  <span className="truncate text-[12.5px] font-medium text-gray-950">
                    {b.visitorName}
                  </span>
                </span>
                <span className="hidden truncate text-[12px] text-gray-500 sm:block">
                  {b.note || b.visitorEmail}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-gray-500">
                  <Video className="h-[13px] w-[13px]" />
                  {dayOf(b.startTime)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-[12.5px] text-gray-500">
            {hasWidget
              ? connected
                ? "No upcoming bookings — share your Meet tab to fill the calendar."
                : "Connect Google Calendar on your SmartSite's Calendar card to go live."
              : "Visitors book time on your Google Calendar straight from your SmartSite's Meet tab."}
          </p>
        )}
      </div>
    </Link>
  );
}
