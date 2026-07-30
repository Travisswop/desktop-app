"use client";

import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Globe,
  Loader2,
  Plus,
  Video,
} from "lucide-react";
import toast from "react-hot-toast";
import { createBooking, getBookingSlots } from "@/actions/booking";

export interface BookingConfig {
  title?: string;
  description?: string;
  durationsMinutes?: number[];
  availability?: Array<{ day: number; start: string; end: string }>;
  timezone?: string;
  bufferMinutes?: number;
  minNoticeHours?: number;
  maxDaysAhead?: number;
  addMeetLink?: boolean;
  collectNote?: boolean;
  published?: boolean;
}

interface Props {
  widgetId?: string;
  config: BookingConfig;
  /**
   * builder: static month preview (the staged build card owns editing).
   * public: the live full-page booking flow (design: Smartsite Calendar
   * Template — month → time → details → confirmed).
   */
  mode: "builder" | "public";
  ownerName?: string;
}

type Step = "month" | "time" | "form" | "done";

const DAY_MS = 24 * 3600 * 1000;
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["M", "T", "W", "T", "F", "S", "S"]; // Monday-start, per design

const TZ_CHOICES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const deviceTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

// Calendar-date key of an instant in a display timezone (en-CA → YYYY-MM-DD).
const dayKeyInTz = (date: Date, tz: string) => {
  try {
    return date.toLocaleDateString("en-CA", { timeZone: tz });
  } catch {
    return date.toLocaleDateString("en-CA");
  }
};

const timeInTz = (date: Date, tz: string) => {
  try {
    return date.toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
};

const tzLabel = (tz: string) => {
  const city = tz.split("/").pop()?.replace(/_/g, " ") || tz;
  let now = "";
  try {
    now = new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    /* keep empty */
  }
  return now ? `${city} — ${now}` : city;
};

const longDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const BookingCard: FC<Props> = ({ widgetId, config, mode, ownerName }) => {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const duration = useMemo(() => {
    const list = (config.durationsMinutes || []).filter((n) => Number(n) > 0);
    return list[0] || 30;
  }, [config.durationsMinutes]);
  const maxDaysAhead = config.maxDaysAhead || 30;
  const horizon = useMemo(
    () => new Date(today.getTime() + maxDaysAhead * DAY_MS),
    [today, maxDaysAhead],
  );

  const [tz, setTz] = useState(deviceTz());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [slotsByDay, setSlotsByDay] = useState<Map<string, Date[]>>(new Map());
  const [loading, setLoading] = useState(mode === "public");
  const [live, setLive] = useState(true);
  const [published, setPublished] = useState(true);

  const [step, setStep] = useState<Step>("month");
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [slot, setSlot] = useState<Date | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [meetLink, setMeetLink] = useState("");

  // Builder preview marks configured weekdays as open, no network.
  const builderOpenDays = useMemo(() => {
    if (mode !== "builder") return new Set<string>();
    const weekdays = new Set((config.availability || []).map((w) => w.day));
    const days = new Set<string>();
    for (let i = 0; i < 62; i += 1) {
      const d = new Date(today.getTime() + i * DAY_MS);
      if (weekdays.has(d.getDay()) && d <= horizon) days.add(dayKeyInTz(d, deviceTz()));
    }
    return days;
  }, [mode, config.availability, today, horizon]);

  const fetchMonth = useCallback(async () => {
    if (mode !== "public" || !widgetId) return;
    setLoading(true);
    const monthStart = new Date(viewYear, viewMonth, 1);
    const monthEnd = new Date(viewYear, viewMonth + 1, 1);
    const from = monthStart > today ? monthStart : today;
    const response = await getBookingSlots({
      widgetId,
      from: from.toISOString(),
      to: monthEnd.toISOString(),
      duration,
    });
    if (!response) {
      setLive(false);
      setSlotsByDay(new Map());
      setLoading(false);
      return;
    }
    setLive(response.live);
    setPublished(response.published !== false);
    const grouped = new Map<string, Date[]>();
    for (const iso of response.slots || []) {
      const date = new Date(iso);
      const key = dayKeyInTz(date, tz);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(date);
    }
    setSlotsByDay(grouped);
    setLoading(false);
  }, [mode, widgetId, viewYear, viewMonth, duration, today, tz]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  // Month grid, Monday-start per design.
  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    return { lead, daysInMonth };
  }, [viewYear, viewMonth]);

  const keyFor = (dayNum: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

  const isOpen = (dayNum: number) => {
    const date = new Date(viewYear, viewMonth, dayNum);
    if (date < today || date > horizon) return false;
    if (mode === "builder") return builderOpenDays.has(keyFor(dayNum));
    return (slotsByDay.get(keyFor(dayNum))?.length || 0) > 0;
  };

  const canPrev =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  const canNext = new Date(viewYear, viewMonth + 1, 1).getTime() <= horizon.getTime();
  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const daySlots = dayKey ? slotsByDay.get(dayKey) || [] : [];
  const title = config.title || "Book a call";
  const host = ownerName ? ` · with ${ownerName.split(" ")[0]}` : "";

  const confirm = async () => {
    if (!widgetId || !slot) return;
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      toast.error("Name and a valid email are required");
      return;
    }
    setSubmitting(true);
    const result = await createBooking({
      widgetId,
      startTime: slot.toISOString(),
      duration,
      name: name.trim(),
      email: email.trim(),
      note: note.trim() || undefined,
      visitorTimezone: tz,
    });
    setSubmitting(false);
    if (result.state !== "success") {
      toast.error(result.message);
      if (/no longer available|just booked/i.test(result.message)) {
        setStep("time");
        setSlot(null);
        fetchMonth();
      }
      return;
    }
    setMeetLink(result.data?.meetLink || "");
    setStep("done");
  };

  const gcalLink = useMemo(() => {
    if (!slot) return "";
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = new Date(slot.getTime() + duration * 60000);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${title}${ownerName ? ` with ${ownerName}` : ""}`,
      dates: `${fmt(slot)}/${fmt(end)}`,
      details: meetLink ? `Join: ${meetLink}` : "",
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }, [slot, duration, title, ownerName, meetLink]);

  /* ── unpublished / dead states ── */
  if (mode === "public" && (!published || !live) && !loading) {
    return (
      <div className="w-full rounded-2xl border border-black/[0.06] bg-white px-6 py-14 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
          <CalendarDays className="h-5 w-5 text-gray-400" />
        </span>
        <p className="mt-3 text-[15px] font-bold text-gray-950">
          {published ? "Booking is taking a break" : "Not published yet"}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">
          {published
            ? "The calendar isn’t reachable right now — check back soon."
            : "This calendar will open for bookings once its owner finishes setting it up."}
        </p>
      </div>
    );
  }

  const iconSq =
    "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-gray-950 hover:bg-gray-50";

  return (
    <div className="w-full rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)]">
      {/* ── MONTH ── */}
      {step === "month" && (
        <div>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[20px] font-bold tracking-[-0.01em] text-gray-950">
                {title}
              </p>
              <p className="mt-0.5 text-[13.5px] text-gray-500">
                {duration} min · Google Meet{host}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <Video className="h-5 w-5 text-gray-950" />
            </span>
          </div>

          <div className="mb-3 mt-4 flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Previous month"
              className={`${iconSq} disabled:opacity-30`}
              disabled={!canPrev}
              onClick={() => mode === "public" && shiftMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="flex-1 text-center text-[15px] font-bold text-gray-950">
              {MONTH_LABELS[viewMonth]} {viewYear}
              {loading && (
                <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-gray-400" />
              )}
            </p>
            <button
              type="button"
              aria-label="Next month"
              className={`${iconSq} disabled:opacity-30`}
              disabled={!canNext}
              onClick={() => mode === "public" && shiftMonth(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {DOW.map((d, i) => (
              <p
                key={`${d}-${i}`}
                className="text-center font-mono text-[10.5px] font-bold text-gray-400"
              >
                {d}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: cells.lead }).map((_, i) => (
              <span key={`lead-${i}`} />
            ))}
            {Array.from({ length: cells.daysInMonth }, (_, i) => i + 1).map(
              (d) => {
                const open = isOpen(d);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={!open || mode !== "public"}
                    onClick={() => {
                      setDayKey(keyFor(d));
                      setStep("time");
                    }}
                    className={`relative h-10 rounded-xl text-[14px] ${
                      open
                        ? "border border-black/[0.08] bg-white font-semibold text-gray-950 hover:border-gray-950"
                        : "font-normal text-gray-300"
                    }`}
                  >
                    {d}
                    {open && (
                      <span className="absolute bottom-[5px] left-1/2 h-[3.5px] w-[3.5px] -translate-x-1/2 rounded-full bg-emerald-700" />
                    )}
                  </button>
                );
              },
            )}
          </div>

          <p className="mt-3.5 flex items-center gap-1.5 text-[12.5px] text-gray-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" /> Days
            with open times
          </p>
        </div>
      )}

      {/* ── TIME ── */}
      {step === "time" && dayKey && (
        <div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className={iconSq}
              onClick={() => setStep("month")}
              aria-label="Back to calendar"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[18px] font-bold text-gray-950">
                {longDate(dayKey)}
              </p>
              <p className="mt-0.5 text-[12.5px] text-gray-500">
                {daySlots.length} open times · {duration} min
              </p>
            </div>
          </div>

          <div className="mt-3.5">
            <div className="flex items-center gap-2.5 rounded-xl bg-gray-100 px-3.5 py-3">
              <Globe className="h-4 w-4 shrink-0 text-gray-500" />
              <select
                value={tz}
                onChange={(e) => setTz(e.target.value)}
                className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-[13.5px] font-semibold text-gray-950 outline-none"
              >
                {[deviceTz(), ...TZ_CHOICES.filter((z) => z !== deviceTz())].map(
                  (z) => (
                    <option key={z} value={z}>
                      {tzLabel(z)}
                    </option>
                  ),
                )}
              </select>
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
            </div>
            <p className="mt-1.5 pl-0.5 text-[11.5px] text-gray-400">
              Detected from your device
            </p>
          </div>

          {daySlots.length ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {daySlots.map((s) => (
                <button
                  key={s.toISOString()}
                  type="button"
                  onClick={() => {
                    setSlot(s);
                    setStep("form");
                  }}
                  className="rounded-xl border border-black/[0.08] bg-white py-3 text-[14px] font-semibold text-gray-950 hover:border-gray-950"
                >
                  {timeInTz(s, tz)}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-center text-[13px] text-gray-500">
              No times this day — pick another date.
            </p>
          )}
        </div>
      )}

      {/* ── FORM ── */}
      {step === "form" && slot && (
        <div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className={iconSq}
              onClick={() => setStep("time")}
              aria-label="Back to times"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <p className="flex-1 text-[18px] font-bold text-gray-950">
              Your details
            </p>
          </div>

          <div className="mt-3.5 flex flex-col gap-2.5 rounded-2xl border border-black/[0.08] p-3.5">
            <p className="flex items-center gap-2.5 text-[13.5px] text-gray-950">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              {slot.toLocaleDateString("en-US", {
                timeZone: tz,
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="flex items-center gap-2.5 text-[13.5px] text-gray-950">
              <Clock className="h-4 w-4 text-gray-500" />
              {timeInTz(slot, tz)} –{" "}
              {timeInTz(new Date(slot.getTime() + duration * 60000), tz)} ·{" "}
              {tzLabel(tz).split(" — ")[0]}
            </p>
            <p className="flex items-center gap-2.5 text-[13.5px] text-gray-950">
              <Video className="h-4 w-4 text-gray-500" />
              Google Meet — link sent on confirm
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              maxLength={120}
              className="w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-[14.5px] text-gray-950 outline-none focus:border-gray-950/40"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email for the invite"
              maxLength={254}
              className="w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-[14.5px] text-gray-950 outline-none focus:border-gray-950/40"
            />
            {config.collectNote !== false && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="What would you like to cover? (optional)"
                className="w-full resize-none rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-[14.5px] text-gray-950 outline-none focus:border-gray-950/40"
              />
            )}
          </div>

          <button
            type="button"
            onClick={confirm}
            disabled={submitting || !name.trim() || !email.includes("@")}
            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 py-[15px] text-[15px] font-bold text-white disabled:bg-gray-300"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm booking
          </button>
          <p className="mt-2.5 text-center text-[11.5px] leading-relaxed text-gray-400">
            You’ll get a calendar invite with the Meet link. Cancel or
            reschedule anytime from that email.
          </p>
        </div>
      )}

      {/* ── DONE ── */}
      {step === "done" && slot && (
        <div className="text-center">
          <span className="mx-auto mt-1 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-emerald-700">
            <Check className="h-7 w-7 text-white" strokeWidth={2.4} />
          </span>
          <p className="mt-3.5 text-[20px] font-bold text-gray-950">
            You’re booked
          </p>
          <p className="mt-1 text-[13.5px] text-gray-500">
            Invite sent to {email.trim() || "you"}
          </p>

          <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-black/[0.08] p-3.5 text-left">
            <p className="flex items-center gap-2.5 text-[14px] font-bold text-gray-950">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              {longDate(dayKeyInTz(slot, tz))}, {timeInTz(slot, tz)}
            </p>
            <p className="flex items-center gap-2.5 text-[13px] text-gray-500">
              <Clock className="h-4 w-4" />
              {duration} min · {tzLabel(tz).split(" — ")[0]}
            </p>
            {meetLink && (
              <>
                <span className="h-px bg-black/[0.08]" />
                <span className="flex items-center gap-2.5">
                  <Video className="h-4 w-4 shrink-0 text-gray-500" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-gray-950">
                    {meetLink.replace(/^https?:\/\//, "")}
                  </span>
                  <button
                    type="button"
                    aria-label="Copy Meet link"
                    className={iconSq}
                    onClick={() => {
                      navigator.clipboard.writeText(meetLink);
                      toast.success("Meet link copied");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </span>
              </>
            )}
          </div>

          <a
            href={gcalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 py-[15px] text-[15px] font-bold text-gray-950"
          >
            <Plus className="h-4 w-4" /> Add to my calendar
          </a>
          <button
            type="button"
            onClick={() => {
              setStep("month");
              setDayKey(null);
              setSlot(null);
              setMeetLink("");
              fetchMonth();
            }}
            className="mt-2.5 p-1 text-[13px] font-semibold text-gray-500"
          >
            Book another time
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingCard;
