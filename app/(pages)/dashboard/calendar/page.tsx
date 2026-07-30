"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  Loader2,
  Pencil,
  Video,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getBookingSummary,
  type BookingSummary,
  type OwnerBooking,
} from "@/actions/booking";

const SWATCH = "#E7EDD6";
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const longDayOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
const initialsOf = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const availabilitySummary = (
  availability: Array<{ day: number; start: string; end: string }>,
) => {
  if (!availability.length) return "Not set";
  const days = [...availability].sort((a, b) => a.day - b.day);
  const label =
    days.length === 5 && days.every((w) => w.day >= 1 && w.day <= 5)
      ? "Mon–Fri"
      : days.map((w) => DAY_LABELS[w.day]).join(", ");
  const first = days[0];
  return `${label} · ${first.start}–${first.end}`;
};

/**
 * Owner bookings screen (design: Dashboard Calendar Canvas) — upcoming/past
 * agenda plus connection, settings, and booking-link rail.
 */
export default function DashboardCalendarPage() {
  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const token = Cookies.get("access-token") || "";
    getBookingSummary(token).then((data) => {
      setSummary(data);
      setLoading(false);
    });
  }, []);

  const groups = useMemo(() => {
    const list = view === "upcoming" ? summary?.upcoming : summary?.past;
    const map = new Map<string, OwnerBooking[]>();
    for (const b of list ?? []) {
      const key = longDayOf(b.startTime);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return [...map.entries()];
  }, [summary, view]);

  const widget = summary?.widget;

  const copyLink = () => {
    if (!widget?.siteUrl) return;
    navigator.clipboard.writeText(widget.siteUrl);
    toast.success("Booking link copied");
  };

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1060px] px-4 py-8">
      {/* header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white text-gray-950"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-gray-950">
            Calendar
          </h1>
          <p className="text-[12.5px] text-gray-500">
            {summary?.counts.upcoming30d ?? 0} upcoming ·{" "}
            {summary?.google.connected
              ? "Google Calendar connected"
              : "Google Calendar not connected"}
            {widget ? ` · ${widget.durationsMinutes[0]} min default` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {widget?.siteUrl && (
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-gray-950"
            >
              <Copy className="h-3.5 w-3.5" /> Copy booking link
            </button>
          )}
          <Link
            href="/smartsite"
            className="flex items-center gap-1.5 rounded-full bg-gray-950 px-3.5 py-2 text-[12.5px] font-semibold text-white no-underline"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit availability
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_296px]">
        {/* agenda */}
        <div className="rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
            <div>
              <p className="text-[15px] font-bold text-gray-950">
                {view === "upcoming" ? "Upcoming" : "Past bookings"}
              </p>
              <p className="mt-0.5 text-[11.5px] text-gray-500">
                {view === "upcoming" ? "Your local time" : "Most recent first"}
              </p>
            </div>
            <div className="flex gap-1 rounded-[10px] border border-black/[0.06] bg-[#f4f4f2] p-[3px]">
              {(["upcoming", "past"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setView(k)}
                  className={`rounded-[7px] px-3 py-[5px] text-[11.5px] font-semibold ${
                    view === k
                      ? "bg-white text-gray-950 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  {k === "upcoming" ? "Upcoming" : "Past"}
                </button>
              ))}
            </div>
          </div>

          {groups.length === 0 && (
            <p className="px-5 py-10 text-center text-[13px] text-gray-500">
              {view === "upcoming"
                ? "No upcoming bookings — share your Meet tab to fill the calendar."
                : "No past bookings yet."}
            </p>
          )}

          {groups.map(([date, list]) => (
            <div key={date}>
              <div className="flex items-center gap-2.5 border-b border-black/[0.04] bg-[#fbfbfa] px-5 py-2.5">
                <span className="text-[12px] font-semibold text-gray-950">
                  {date}
                </span>
                <span className="text-[11.5px] text-gray-500">
                  {list.length} booking{list.length > 1 ? "s" : ""}
                </span>
              </div>
              {list.map((b) => {
                const isOpen = open === b._id;
                return (
                  <div key={b._id} className="border-b border-black/[0.04]">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : b._id)}
                      className="grid w-full grid-cols-[80px_1fr_auto] items-center gap-3 px-5 py-3 text-left sm:grid-cols-[104px_1.4fr_1.6fr_auto]"
                    >
                      <span>
                        <span className="block font-mono text-[13px] font-semibold text-gray-950">
                          {timeOf(b.startTime)}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-gray-500">
                          {b.durationMinutes} min
                        </span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-gray-950"
                          style={{ backgroundColor: SWATCH }}
                        >
                          {initialsOf(b.visitorName)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-gray-950">
                            {b.visitorName}
                          </span>
                          <span className="block truncate text-[11.5px] text-gray-500">
                            {b.visitorEmail}
                          </span>
                        </span>
                      </span>
                      <span className="hidden truncate text-[12.5px] text-gray-700 sm:block">
                        {b.note || "—"}
                      </span>
                      {view === "upcoming" && b.meetLink ? (
                        <a
                          href={b.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 justify-self-end rounded-full bg-gray-950 px-3 py-1.5 text-[11.5px] font-semibold text-white no-underline"
                        >
                          <Video className="h-[13px] w-[13px]" /> Join
                        </a>
                      ) : (
                        <span className="justify-self-end text-[11.5px] text-gray-400">
                          {b.status === "cancelled" ? "Cancelled" : "—"}
                        </span>
                      )}
                    </button>
                    {isOpen && (
                      <div className="grid gap-3 px-5 pb-4 sm:grid-cols-2">
                        <div className="rounded-[14px] border border-black/[0.06] bg-[#fbfbfa] p-3.5">
                          <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                            Guest
                          </p>
                          <p className="mt-2 text-[12.5px] text-gray-950">
                            {b.visitorEmail}
                          </p>
                          {b.meetLink && (
                            <span className="mt-3 flex items-center gap-2">
                              <span className="truncate font-mono text-[11.5px] text-gray-500">
                                {b.meetLink.replace(/^https?:\/\//, "")}
                              </span>
                              <button
                                type="button"
                                aria-label="Copy Meet link"
                                onClick={() => {
                                  navigator.clipboard.writeText(b.meetLink!);
                                  toast.success("Meet link copied");
                                }}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border border-black/[0.08] bg-white text-gray-950"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                        </div>
                        <div className="rounded-[14px] border border-black/[0.06] bg-[#fbfbfa] p-3.5">
                          <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                            Notes from booking form
                          </p>
                          <p className="mt-2 text-[12.5px] leading-relaxed text-gray-950">
                            {b.note ? `“${b.note}”` : "No note left."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* rail */}
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-black/[0.06] bg-white p-[18px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-gray-950"
                style={{ backgroundColor: SWATCH }}
              >
                <CalendarDays className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-gray-950">
                  {summary?.google.email || "Not connected"}
                </span>
                <span className="block text-[11.5px] text-gray-500">
                  {summary?.google.connected
                    ? "Primary · busy times synced"
                    : "Connect from your SmartSite"}
                </span>
              </span>
              <span
                className={`h-[7px] w-[7px] rounded-full ${
                  summary?.google.connected
                    ? "bg-emerald-600 shadow-[0_0_0_3px_rgba(5,150,105,0.15)]"
                    : "bg-gray-300"
                }`}
              />
            </div>
            {widget && (
              <div className="mt-3.5 flex flex-col gap-[7px] border-t border-black/[0.06] pt-3.5">
                {(
                  [
                    ["Availability", availabilitySummary(widget.availability)],
                    [
                      "Length",
                      `${widget.durationsMinutes[0]} min${widget.bufferMinutes ? ` · ${widget.bufferMinutes} min buffer` : ""}`,
                    ],
                    ["Notice", `${widget.minNoticeHours} hours minimum`],
                    ["Location", "Google Meet"],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2.5 text-[12px]">
                    <span className="w-[82px] shrink-0 text-gray-500">{k}</span>
                    <span className="font-medium text-gray-950">{v}</span>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/smartsite"
              className="mt-3.5 flex items-center justify-center gap-1.5 rounded-full border border-black/[0.08] py-2 text-[12.5px] font-semibold text-gray-950 no-underline"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit availability
            </Link>
          </div>

          {widget?.siteUrl && (
            <div className="rounded-2xl border border-black/[0.06] bg-white p-[18px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                Booking link
              </p>
              <div className="mt-2.5 flex items-center gap-2 rounded-[11px] border border-black/[0.06] bg-[#fbfbfa] px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-gray-950">
                  {widget.siteUrl.replace(/^https?:\/\//, "")}
                </span>
                <button
                  type="button"
                  aria-label="Copy booking link"
                  onClick={copyLink}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border border-black/[0.08] bg-white text-gray-950"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-gray-500">
                Lives on the{" "}
                <b className="font-semibold text-gray-950">Meet</b> tab of your
                SmartSite.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
