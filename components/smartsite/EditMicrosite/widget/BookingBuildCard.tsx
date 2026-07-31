"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Link2,
  Loader2,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  Video,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  getGoogleConnectUrl,
  getGoogleIntegrationStatus,
  type GoogleIntegrationStatus,
} from "@/actions/googleIntegration";
import { handleDeleteWidget, handleUpdateWidget } from "@/actions/widget";
import type { BookingConfig } from "@/components/publicProfile/widgets/BookingCard";

/**
 * Staged inline build card for the Calendar template (design: Smartsite
 * Calendar Template — Connect → Availability → Live). Lives directly in the
 * builder canvas; all editing happens here, no modal.
 */

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon-first, per design
const HOURS_12 = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM",
  "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM",
];

const to24 = (label: string) => {
  const [hm, ap] = label.split(" ");
  let h = Number(hm.split(":")[0]);
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:00`;
};
const to12 = (value: string) => {
  const h = Number(value.split(":")[0]);
  const ap = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${ap}`;
};

const BUFFERS: Array<[string, number]> = [["None", 0], ["5 min", 5], ["10 min", 10], ["15 min", 15]];
const NOTICES: Array<[string, number]> = [["1 hr", 1], ["4 hrs", 4], ["1 day", 24], ["2 days", 48]];
const WINDOWS: Array<[string, number]> = [["14 days", 14], ["30 days", 30], ["60 days", 60]];
const LENGTHS = [15, 30, 45, 60];

const label =
  "flex items-center gap-2 mb-2 [&>span]:font-mono [&>span]:text-[10.5px] [&>span]:font-bold [&>span]:uppercase [&>span]:tracking-wider [&>span]:text-gray-400";

function SectionLabel({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <div className={label}>
      <span>{children}</span>
      <span className="h-px flex-1 bg-black/[0.07]" />
      {right}
    </div>
  );
}

function ChipRow<T extends number>({
  options,
  value,
  onPick,
}: {
  options: Array<[string, T]>;
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([text, v]) => (
        <button
          key={text}
          type="button"
          onClick={() => onPick(v)}
          className={`rounded-xl py-2.5 text-[13px] font-semibold ${
            v === value
              ? "border-[1.5px] border-gray-950 bg-gray-950 text-white"
              : "border border-black/[0.08] bg-white text-gray-950"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

const BookingBuildCard = ({
  widget,
  micrositeId,
  siteUrl,
}: {
  widget: { _id: string; config?: BookingConfig };
  micrositeId: string;
  siteUrl?: string;
}) => {
  const router = useRouter();
  const config = widget.config || {};
  const [token, setToken] = useState("");
  const [google, setGoogle] = useState<GoogleIntegrationStatus | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // 'live' when published; owner can drop back to 'setup' via Availability.
  const [editing, setEditing] = useState(false);

  const [title, setTitle] = useState(config.title || "Book a call");
  const [length, setLength] = useState((config.durationsMinutes || [30])[0] || 30);
  const [buffer, setBuffer] = useState(Number(config.bufferMinutes) || 0);
  const [notice, setNotice] = useState(
    Number.isFinite(Number(config.minNoticeHours)) ? Number(config.minNoticeHours) : 4,
  );
  const [windowDays, setWindowDays] = useState(Number(config.maxDaysAhead) || 30);
  const [hours, setHours] = useState(() =>
    DAY_ORDER.map((day) => {
      const found = (config.availability || []).find((w) => w.day === day);
      return {
        day,
        on: Boolean(found),
        from: found?.start || "09:00",
        to: found?.end || "17:00",
      };
    }),
  );

  useEffect(() => setToken(Cookies.get("access-token") || ""), []);
  useEffect(() => {
    if (!token) return;
    getGoogleIntegrationStatus(token).then((status) => {
      setGoogle(status);
      setGoogleLoading(false);
    });
  }, [token]);

  // Returning from Google (?google=connected) — surface the result once.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (!result) return;
    if (result === "connected") toast.success("Google Calendar connected");
    if (result === "error") toast.error("Google connection failed");
    params.delete("google");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, []);

  const stage: "connect" | "setup" | "live" =
    googleLoading || !google?.connected
      ? "connect"
      : config.published && !editing
        ? "live"
        : "setup";

  const connect = async () => {
    setConnecting(true);
    const url = await getGoogleConnectUrl(token);
    if (url) window.location.href = url;
    else {
      toast.error("Google connection is not available right now");
      setConnecting(false);
    }
  };

  const save = async () => {
    const availability = hours
      .filter((h) => h.on)
      .map((h) => ({ day: h.day, start: h.from, end: h.to }));
    if (!availability.length) {
      toast.error("Turn on at least one day");
      return;
    }
    for (const w of availability) {
      if (w.end <= w.start) {
        toast.error(`${DAY_LABELS[w.day]}: end must be after start`);
        return;
      }
    }
    setSaving(true);
    try {
      const data = await handleUpdateWidget(
        {
          _id: widget._id,
          micrositeId,
          config: {
            ...config,
            title: title.trim() || "Book a call",
            durationsMinutes: [length],
            availability,
            timezone:
              config.timezone ||
              Intl.DateTimeFormat().resolvedOptions().timeZone ||
              "UTC",
            bufferMinutes: buffer,
            minNoticeHours: notice,
            maxDaysAhead: windowDays,
            addMeetLink: true,
            published: true,
          },
        },
        token,
      );
      if (data?.state !== "success") throw new Error("Save failed");
      toast.success("Calendar is live");
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove the Calendar template? Its tab stays until you delete it.")) return;
    setDeleting(true);
    try {
      const data = await handleDeleteWidget({ _id: widget._id, micrositeId }, token);
      if (data?.state !== "success") throw new Error("Delete failed");
      toast.success("Calendar removed");
      router.refresh();
    } catch {
      toast.error("Could not remove the template");
    } finally {
      setDeleting(false);
    }
  };

  const copyLink = () => {
    if (!siteUrl) return;
    navigator.clipboard.writeText(siteUrl);
    toast.success("Link copied");
  };

  // Months forward from the current one; the preview walks the same bookable
  // window a visitor sees (today → today + maxDaysAhead).
  const [monthOffset, setMonthOffset] = useState(0);
  const monthSwipeStart = useRef<{ x: number; y: number } | null>(null);

  const monthPreview = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const horizon = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + windowDays,
    );
    const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = first.getFullYear();
    const month = first.getMonth();
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const openWeekdays = new Set(hours.filter((h) => h.on).map((h) => h.day));
    return {
      year,
      month,
      lead,
      days,
      openWeekdays,
      today,
      horizon,
      canPrev: monthOffset > 0,
      canNext: new Date(year, month + 1, 1) <= horizon,
    };
  }, [hours, monthOffset, windowDays]);

  // A shorter bookable window can strand the view past the horizon.
  useEffect(() => {
    const now = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + windowDays);
    const maxOffset =
      (horizon.getFullYear() - now.getFullYear()) * 12 +
      (horizon.getMonth() - now.getMonth());
    setMonthOffset((offset) => Math.min(offset, Math.max(0, maxOffset)));
  }, [windowDays]);

  const showPreviousMonth = () => {
    if (!monthPreview.canPrev) return;
    setMonthOffset((offset) => Math.max(0, offset - 1));
  };

  const showNextMonth = () => {
    if (!monthPreview.canNext) return;
    setMonthOffset((offset) => offset + 1);
  };

  const handleMonthTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    monthSwipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleMonthTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = monthSwipeStart.current;
    const touch = event.changedTouches[0];
    monthSwipeStart.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (deltaX < 0) showNextMonth();
    else showPreviousMonth();
  };

  return (
    <div
      className="w-full rounded-[20px] border border-black/[0.06] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      onClick={(e) => e.stopPropagation()}
    >
      {/* header row — matches the design's card chrome */}
      <div className="flex items-center gap-2.5 border-b border-black/[0.06] px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
          <CalendarDays className="h-4 w-4 text-gray-950" />
        </span>
        <span className="flex-1 text-[13.5px] font-semibold text-gray-950">Calendar</span>
        <button
          type="button"
          aria-label="Remove Calendar template"
          onClick={remove}
          disabled={deleting}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-gray-100"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 text-red-700" />
          )}
        </button>
      </div>

      <div className="p-3.5">
        {/* ── stage 1: connect ── */}
        {stage === "connect" && (
          <div>
            <SectionLabel>Calendar</SectionLabel>
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] border border-black/[0.08] bg-white">
                <CalendarDays className="h-6 w-6 text-gray-950" />
              </span>
              <p className="mt-3 text-[16.5px] font-bold text-gray-950">
                Connect Google Calendar
              </p>
              <p className="mx-auto mt-1 max-w-[250px] text-[13px] leading-relaxed text-gray-500">
                Swop reads your busy times and creates Meet links for new
                bookings. Connect once — visitors never sign in.
              </p>
              <button
                type="button"
                onClick={connect}
                disabled={connecting || googleLoading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 py-[15px] text-[15px] font-bold text-white disabled:opacity-60"
              >
                {(connecting || googleLoading) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {googleLoading ? "Checking…" : connecting ? "Opening Google…" : "Continue with Google"}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-gray-500">
                <ShieldCheck className="h-3.5 w-3.5" /> Read busy times + create
                events only
              </p>
            </div>
          </div>
        )}

        {/* ── stage 3: live ── */}
        {stage === "live" && (
          <div>
            <SectionLabel
              right={
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-[12px] font-bold text-gray-950"
                >
                  <Pencil className="h-3 w-3" /> Availability
                </button>
              }
            >
              Calendar · live
            </SectionLabel>

            <div className="flex items-center gap-2.5 rounded-xl bg-gray-100 px-3.5 py-3">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] border border-black/[0.08] bg-white">
                <CalendarDays className="h-4 w-4 text-gray-950" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold text-gray-950">
                  {google?.googleEmail}
                </span>
                <span className="block text-[11.5px] text-gray-500">
                  Connected · syncing busy times
                </span>
              </span>
              <span className="h-[7px] w-[7px] rounded-full bg-emerald-700" />
            </div>

            <div className="mt-3 rounded-2xl border border-black/[0.08] p-3.5">
              <p className="text-[16px] font-bold text-gray-950">{config.title || title}</p>
              <p className="mt-0.5 text-[12.5px] text-gray-500">
                {(config.durationsMinutes || [length])[0]} min · Google Meet ·{" "}
                {hours.filter((h) => h.on).length} days a week
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous month"
                  disabled={!monthPreview.canPrev}
                  onClick={showPreviousMonth}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-gray-950 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <p
                  aria-live="polite"
                  className="flex-1 text-center text-[13px] font-bold text-gray-950"
                >
                  {MONTH_LABELS[monthPreview.month]} {monthPreview.year}
                </p>
                <button
                  type="button"
                  aria-label="Next month"
                  disabled={!monthPreview.canNext}
                  onClick={showNextMonth}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-gray-950 disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div
                className="mt-2 grid touch-pan-y grid-cols-7 gap-[3px]"
                onTouchStart={handleMonthTouchStart}
                onTouchEnd={handleMonthTouchEnd}
                onTouchCancel={() => {
                  monthSwipeStart.current = null;
                }}
              >
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={i} className="text-center font-mono text-[10px] font-bold text-gray-400">
                    {d}
                  </span>
                ))}
                {Array.from({ length: monthPreview.lead }).map((_, i) => (
                  <span key={`l${i}`} />
                ))}
                {Array.from({ length: monthPreview.days }, (_, i) => i + 1).map((d) => {
                  const date = new Date(monthPreview.year, monthPreview.month, d);
                  const open =
                    date >= monthPreview.today &&
                    date <= monthPreview.horizon &&
                    monthPreview.openWeekdays.has(date.getDay());
                  return (
                    <span
                      key={d}
                      className={`relative flex h-[30px] items-center justify-center rounded-lg text-[12px] ${
                        open
                          ? "border border-black/[0.08] bg-white font-semibold text-gray-950"
                          : "text-gray-300"
                      }`}
                    >
                      {d}
                      {open && (
                        <span className="absolute bottom-[3px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-emerald-700" />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-100 py-[13px] text-[14px] font-bold text-gray-950"
              >
                <Link2 className="h-4 w-4" /> Copy link
              </button>
              <button
                type="button"
                onClick={() => {
                  if (siteUrl && navigator.share) {
                    navigator.share({ url: siteUrl }).catch(() => {});
                  } else {
                    copyLink();
                  }
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-100 py-[13px] text-[14px] font-bold text-gray-950"
              >
                <Send className="h-4 w-4" /> Share
              </button>
            </div>
          </div>
        )}

        {/* ── stage 2: availability setup ── */}
        {stage === "setup" && (
          <div>
            <SectionLabel>Calendar · setup</SectionLabel>

            <div className="flex items-center gap-2.5 rounded-xl bg-gray-100 px-3.5 py-3">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] border border-black/[0.08] bg-white">
                <CalendarDays className="h-4 w-4 text-gray-950" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold text-gray-950">
                  {google?.googleEmail}
                </span>
                <span className="block text-[11.5px] text-gray-500">Primary calendar</span>
              </span>
              <Check className="h-4 w-4 text-emerald-700" />
            </div>

            <div className="mt-4">
              <SectionLabel>Booking title</SectionLabel>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="Book a call"
                className="w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-[14.5px] text-gray-950 outline-none focus:border-gray-950/40"
              />
            </div>

            <div className="mt-4">
              <SectionLabel>Meeting length</SectionLabel>
              <ChipRow
                options={LENGTHS.map((n) => [`${n} min`, n]) as Array<[string, number]>}
                value={length}
                onPick={setLength}
              />
            </div>

            <div className="mt-4">
              <SectionLabel>Weekly hours</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {hours.map((row, i) => (
                  <div key={row.day} className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={row.on}
                      aria-label={`Toggle ${DAY_LABELS[row.day]}`}
                      onClick={() =>
                        setHours((h) => h.map((r, j) => (j === i ? { ...r, on: !r.on } : r)))
                      }
                      className={`flex h-[25px] w-[42px] items-center rounded-full p-[2px] transition-colors ${
                        row.on ? "justify-end bg-gray-950" : "justify-start bg-gray-300"
                      }`}
                    >
                      <span className="h-[21px] w-[21px] rounded-full bg-white shadow" />
                    </button>
                    <span
                      className={`w-9 text-[13px] font-bold ${row.on ? "text-gray-950" : "text-gray-400"}`}
                    >
                      {DAY_LABELS[row.day]}
                    </span>
                    {row.on ? (
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <select
                          value={to12(row.from)}
                          aria-label={`${DAY_LABELS[row.day]} start`}
                          onChange={(e) =>
                            setHours((h) =>
                              h.map((r, j) => (j === i ? { ...r, from: to24(e.target.value) } : r)),
                            )
                          }
                          className="min-w-0 flex-1 cursor-pointer appearance-none rounded-[10px] border border-black/[0.08] bg-white px-2 py-2 text-center text-[12.5px] font-semibold text-gray-950 outline-none"
                        >
                          {HOURS_12.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        <span className="text-[12px] text-gray-400">–</span>
                        <select
                          value={to12(row.to)}
                          aria-label={`${DAY_LABELS[row.day]} end`}
                          onChange={(e) =>
                            setHours((h) =>
                              h.map((r, j) => (j === i ? { ...r, to: to24(e.target.value) } : r)),
                            )
                          }
                          className="min-w-0 flex-1 cursor-pointer appearance-none rounded-[10px] border border-black/[0.08] bg-white px-2 py-2 text-center text-[12.5px] font-semibold text-gray-950 outline-none"
                        >
                          {HOURS_12.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="flex-1 text-[12.5px] text-gray-300">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <SectionLabel>Buffer between meetings</SectionLabel>
              <ChipRow options={BUFFERS} value={buffer} onPick={setBuffer} />
            </div>

            <div className="mt-4">
              <SectionLabel>Minimum notice</SectionLabel>
              <ChipRow options={NOTICES} value={notice} onPick={setNotice} />
            </div>

            <div className="mt-4">
              <SectionLabel>Bookable window</SectionLabel>
              <ChipRow options={WINDOWS} value={windowDays} onPick={setWindowDays} />
            </div>

            <div className="mt-4">
              <SectionLabel>Location</SectionLabel>
              <div className="flex items-center gap-2.5 rounded-xl bg-gray-100 px-3.5 py-3">
                <Video className="h-[18px] w-[18px] text-gray-950" />
                <span className="flex-1">
                  <span className="block text-[13.5px] font-bold text-gray-950">Google Meet</span>
                  <span className="block text-[11.5px] text-gray-500">
                    A new link is generated per booking
                  </span>
                </span>
                <Check className="h-4 w-4 text-emerald-700" strokeWidth={2.4} />
              </div>
            </div>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 py-[15px] text-[15px] font-bold text-white disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save availability
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingBuildCard;
