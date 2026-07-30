"use client";

import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Video,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { createBooking, getBookingSlots } from "@/actions/booking";

export interface BookingConfig {
  title?: string;
  description?: string;
  durationsMinutes?: number[];
  availability?: Array<{ day: number; start: string; end: string }>;
  timezone?: string;
  maxDaysAhead?: number;
  collectNote?: boolean;
}

interface Props {
  widgetId?: string;
  config: BookingConfig;
  /**
   * builder: static preview with mock availability, clicks bubble up to the
   * edit modal. public: live calendar + booking flow.
   */
  mode: "builder" | "public";
  fontColor?: string;
}

const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Local (visitor-tz) date key for grouping slots under calendar days.
const dateKeyOf = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

const startOfMonth = (year: number, month: number) => new Date(year, month, 1);

const shortTz = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz.replace(/_/g, " ");
  } catch {
    return "local time";
  }
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const BookingCard: FC<Props> = ({ widgetId, config, mode }) => {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const durations = useMemo(() => {
    const list = (config.durationsMinutes || [30]).filter(
      (minutes) => Number.isFinite(minutes) && minutes > 0,
    );
    return list.length ? list : [30];
  }, [config.durationsMinutes]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [duration, setDuration] = useState(durations[0]);
  const [slotsByDay, setSlotsByDay] = useState<Map<string, Date[]>>(new Map());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [live, setLive] = useState(true);

  // Sheet state
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [step, setStep] = useState<"times" | "form" | "success">("times");
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [meetLink, setMeetLink] = useState("");

  const maxDaysAhead = config.maxDaysAhead || 30;
  const horizon = useMemo(
    () => new Date(today.getTime() + maxDaysAhead * 24 * 3600 * 1000),
    [today, maxDaysAhead],
  );

  // Builder preview: fabricate availability from the configured weekly
  // windows so the card looks real without touching the network.
  const builderDays = useMemo(() => {
    if (mode !== "builder") return new Set<string>();
    const availableWeekdays = new Set(
      (config.availability || []).map((window) => window.day),
    );
    const days = new Set<string>();
    for (let i = 0; i < 45; i += 1) {
      const date = new Date(today.getTime() + i * 24 * 3600 * 1000);
      if (availableWeekdays.has(date.getDay()) && date <= horizon) {
        days.add(dateKeyOf(date));
      }
    }
    return days;
  }, [mode, config.availability, today, horizon]);

  const fetchMonth = useCallback(async () => {
    if (mode !== "public" || !widgetId) return;
    setLoadingSlots(true);
    const monthStart = startOfMonth(viewYear, viewMonth);
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
      setLoadingSlots(false);
      return;
    }
    setLive(response.live);
    const grouped = new Map<string, Date[]>();
    for (const iso of response.slots || []) {
      const date = new Date(iso);
      const key = dateKeyOf(date);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(date);
    }
    setSlotsByDay(grouped);
    setLoadingSlots(false);
  }, [mode, widgetId, viewYear, viewMonth, duration, today]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  // Calendar grid for the viewed month.
  const weeks = useMemo(() => {
    const first = startOfMonth(viewYear, viewMonth);
    const gridStart = new Date(first);
    gridStart.setDate(1 - first.getDay());
    const cells: Date[] = [];
    for (let i = 0; i < 42; i += 1) {
      cells.push(new Date(gridStart.getTime() + i * 24 * 3600 * 1000));
    }
    // Drop trailing all-outside weeks.
    const rows: Date[][] = [];
    for (let i = 0; i < 6; i += 1) {
      const row = cells.slice(i * 7, i * 7 + 7);
      if (row.some((date) => date.getMonth() === viewMonth)) rows.push(row);
    }
    return rows;
  }, [viewYear, viewMonth]);

  const hasAvailability = (date: Date) => {
    if (date < today || date > horizon) return false;
    if (mode === "builder") return builderDays.has(dateKeyOf(date));
    return (slotsByDay.get(dateKeyOf(date))?.length || 0) > 0;
  };

  const canGoPrev =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  const canGoNext =
    startOfMonth(viewYear, viewMonth + 1).getTime() <= horizon.getTime();

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const openDay = (date: Date) => {
    if (mode !== "public") return;
    if (!hasAvailability(date)) return;
    setSelectedDay(date);
    setSelectedSlot(null);
    setStep("times");
  };

  const closeSheet = () => {
    setSelectedDay(null);
    setSelectedSlot(null);
    setStep("times");
  };

  const nextAvailableAfter = (date: Date): Date | null => {
    for (const [, slots] of slotsByDay) {
      for (const slot of slots) {
        if (slot > date) return slot;
      }
    }
    return null;
  };

  const daySlots = selectedDay
    ? slotsByDay.get(dateKeyOf(selectedDay)) || []
    : [];

  const handleConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!widgetId || !selectedSlot) return;
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSubmitting(true);
    const result = await createBooking({
      widgetId,
      startTime: selectedSlot.toISOString(),
      duration,
      name: name.trim(),
      email: email.trim(),
      note: note.trim() || undefined,
      visitorTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setSubmitting(false);
    if (result.state !== "success") {
      toast.error(result.message);
      if (/no longer available|just booked/i.test(result.message)) {
        setStep("times");
        setSelectedSlot(null);
        fetchMonth();
      }
      return;
    }
    setMeetLink(result.data?.meetLink || "");
    setStep("success");
  };

  const title = config.title || "Book a meeting";

  return (
    <div className="w-full rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-bold text-gray-950">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="truncate">{title}</span>
          </p>
          {config.description ? (
            <p className="mt-0.5 text-[12px] text-gray-500">
              {config.description}
            </p>
          ) : null}
        </div>
        {durations.length > 1 && (
          <div className="flex shrink-0 gap-1">
            {durations.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (mode === "public") setDuration(minutes);
                }}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  duration === minutes
                    ? "bg-gray-950 text-white"
                    : "border border-black/[0.08] text-gray-500"
                }`}
              >
                {minutes}m
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === "public" && !live && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700">
          Booking is temporarily unavailable — the calendar isn’t connected.
        </p>
      )}
      {mode === "builder" && (
        <p className="mb-3 rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
          Preview — visitors will see your real open times.
        </p>
      )}

      {/* Month navigation */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoPrev}
          onClick={(event) => {
            event.stopPropagation();
            if (mode === "public") shiftMonth(-1);
          }}
          className="rounded-full p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-[13px] font-bold text-gray-950">
          {MONTH_LABELS[viewMonth]} {viewYear}
          {loadingSlots && (
            <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-gray-400" />
          )}
        </p>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canGoNext}
          onClick={(event) => {
            event.stopPropagation();
            if (mode === "public") shiftMonth(1);
          }}
          className="rounded-full p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_HEADERS.map((label, index) => (
          <p
            key={`${label}-${index}`}
            className="py-1 text-[10px] font-bold uppercase tracking-wide text-gray-400"
          >
            {label}
          </p>
        ))}
        {weeks.flat().map((date) => {
          const inMonth = date.getMonth() === viewMonth;
          const available = inMonth && hasAvailability(date);
          const isToday = date.getTime() === today.getTime();
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={!available && mode === "public"}
              onClick={(event) => {
                if (mode === "public") event.stopPropagation();
                openDay(date);
              }}
              className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold transition ${
                !inMonth
                  ? "text-transparent"
                  : available
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "text-gray-300"
              } ${isToday && inMonth ? "ring-1 ring-gray-950/20" : ""}`}
            >
              {date.getDate()}
              {available && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-[11px] text-gray-400">
        Times shown in {shortTz()}
      </p>

      {/* Blurred-backdrop sheet: times → form → success */}
      {mode === "public" && selectedDay && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSheet();
          }}
        >
          <div className="max-h-[85vh] w-full overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {step === "form" && (
                  <button
                    type="button"
                    aria-label="Back to times"
                    onClick={() => setStep("times")}
                    className="rounded-full p-1.5 text-gray-500 hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <p className="text-[15px] font-bold text-gray-950">
                  {step === "success"
                    ? "You’re booked!"
                    : selectedDay.toLocaleDateString([], {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeSheet}
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {step === "times" && (
              <>
                {durations.length > 1 && (
                  <div className="mb-3 flex gap-2">
                    {durations.map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setDuration(minutes)}
                        className={`rounded-full px-4 py-1.5 text-[12px] font-bold ${
                          duration === minutes
                            ? "bg-gray-950 text-white"
                            : "border border-black/[0.08] text-gray-500"
                        }`}
                      >
                        {minutes} min
                      </button>
                    ))}
                  </div>
                )}
                {daySlots.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {daySlots.map((slot) => (
                      <button
                        key={slot.toISOString()}
                        type="button"
                        onClick={() => {
                          setSelectedSlot(slot);
                          setStep("form");
                        }}
                        className="rounded-xl border border-black/[0.08] py-2.5 text-[13px] font-bold text-gray-950 hover:border-gray-950"
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-[13px] text-gray-500">
                      No times this day.
                    </p>
                    {(() => {
                      const next = nextAvailableAfter(selectedDay);
                      return next ? (
                        <button
                          type="button"
                          onClick={() => {
                            const day = new Date(
                              next.getFullYear(),
                              next.getMonth(),
                              next.getDate(),
                            );
                            setViewYear(day.getFullYear());
                            setViewMonth(day.getMonth());
                            setSelectedDay(day);
                          }}
                          className="mt-3 rounded-full bg-gray-950 px-4 py-2 text-[12px] font-bold text-white"
                        >
                          Next available:{" "}
                          {next.toLocaleDateString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </button>
                      ) : null;
                    })()}
                  </div>
                )}
                <p className="mt-3 text-center text-[11px] text-gray-400">
                  Times in {shortTz()}
                </p>
              </>
            )}

            {step === "form" && selectedSlot && (
              <form onSubmit={handleConfirm} className="flex flex-col gap-3">
                <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-[13px] font-semibold text-gray-950">
                  {selectedSlot.toLocaleDateString([], {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  · {formatTime(selectedSlot)} · {duration} min
                </div>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  maxLength={120}
                  required
                  className="w-full rounded-xl border border-black/[0.08] bg-gray-50 px-3 py-2.5 text-[14px] outline-none focus:border-gray-950/30"
                />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email for the invite"
                  type="email"
                  maxLength={254}
                  required
                  className="w-full rounded-xl border border-black/[0.08] bg-gray-50 px-3 py-2.5 text-[14px] outline-none focus:border-gray-950/30"
                />
                {config.collectNote !== false && (
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Anything they should know? (optional)"
                    maxLength={1000}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-black/[0.08] bg-gray-50 px-3 py-2.5 text-[14px] outline-none focus:border-gray-950/30"
                  />
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 flex items-center justify-center gap-2 rounded-full bg-gray-950 py-3 text-[14px] font-bold text-white disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Confirm booking
                </button>
              </form>
            )}

            {step === "success" && selectedSlot && (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <Check className="h-6 w-6 text-emerald-600" />
                </span>
                <p className="text-[14px] font-semibold text-gray-950">
                  {selectedSlot.toLocaleDateString([], {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  · {formatTime(selectedSlot)}
                </p>
                <p className="text-[12px] text-gray-500">
                  A calendar invite is on its way to {email}.
                </p>
                {meetLink && (
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full border border-black/[0.08] px-4 py-2 text-[12px] font-bold text-gray-950 hover:border-gray-950"
                  >
                    <Video className="h-4 w-4" /> Google Meet link
                  </a>
                )}
                <button
                  type="button"
                  onClick={closeSheet}
                  className="mt-1 rounded-full bg-gray-950 px-6 py-2.5 text-[13px] font-bold text-white"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingCard;
