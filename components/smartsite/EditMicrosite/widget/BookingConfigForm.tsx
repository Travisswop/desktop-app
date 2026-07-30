"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { CalendarDays, Loader, Trash2, Unplug } from "lucide-react";
import toast from "react-hot-toast";
import {
  disconnectGoogleIntegration,
  getGoogleConnectUrl,
  getGoogleIntegrationStatus,
  type GoogleIntegrationStatus,
} from "@/actions/googleIntegration";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";

export interface BookingWidgetConfig {
  title: string;
  description: string;
  durationsMinutes: number[];
  availability: Array<{ day: number; start: string; end: string }>;
  timezone: string;
  bufferMinutes: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  addMeetLink: boolean;
  collectNote: boolean;
}

export const DEFAULT_BOOKING_AVAILABILITY = [1, 2, 3, 4, 5].map((day) => ({
  day,
  start: "09:00",
  end: "17:00",
}));

export const defaultBookingConfig = (): BookingWidgetConfig => ({
  title: "Book a meeting",
  description: "Pick a time that works for you.",
  durationsMinutes: [30],
  availability: DEFAULT_BOOKING_AVAILABILITY,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  bufferMinutes: 0,
  minNoticeHours: 12,
  maxDaysAhead: 30,
  addMeetLink: true,
  collectNote: true,
});

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DURATION_OPTIONS = [15, 30, 45, 60];

const inputClass =
  "w-full rounded-xl border border-black/[0.08] bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black/20";

/**
 * Shared booking-widget editor: Google connection state + scheduling rules.
 * Used by AddBooking (create) and UpdateWidget (edit).
 */
const BookingConfigForm = ({
  initialConfig,
  saveLabel,
  saving,
  onSave,
  onDelete,
  deleting,
}: {
  initialConfig: BookingWidgetConfig;
  saveLabel: string;
  saving: boolean;
  onSave: (config: BookingWidgetConfig) => void;
  onDelete?: () => void;
  deleting?: boolean;
}) => {
  const [token, setToken] = useState("");
  const [google, setGoogle] = useState<GoogleIntegrationStatus | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [config, setConfig] = useState<BookingWidgetConfig>(initialConfig);

  useEffect(() => setToken(Cookies.get("access-token") || ""), []);

  const refreshGoogleStatus = async (accessToken: string) => {
    setGoogleLoading(true);
    const status = await getGoogleIntegrationStatus(accessToken);
    setGoogle(status);
    setGoogleLoading(false);
  };

  useEffect(() => {
    if (token) refreshGoogleStatus(token);
  }, [token]);

  // Returning from Google lands back on the editor with ?google=connected.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (!result) return;
    if (result === "connected") toast.success("Google Calendar connected");
    if (result === "error") toast.error("Google connection failed");
    params.delete("google");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    const url = await getGoogleConnectUrl(token);
    if (url) {
      window.location.href = url;
    } else {
      toast.error("Google connection is not available right now");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleIntegration(token);
    toast.success("Google Calendar disconnected");
    refreshGoogleStatus(token);
  };

  const toggleDuration = (minutes: number) => {
    setConfig((current) => {
      const has = current.durationsMinutes.includes(minutes);
      const next = has
        ? current.durationsMinutes.filter((value) => value !== minutes)
        : [...current.durationsMinutes, minutes].sort((a, b) => a - b);
      if (!next.length || next.length > 3) return current;
      return { ...current, durationsMinutes: next };
    });
  };

  const dayWindow = (day: number) =>
    config.availability.find((window) => window.day === day);

  const toggleDay = (day: number) => {
    setConfig((current) => {
      const existing = current.availability.find((w) => w.day === day);
      return {
        ...current,
        availability: existing
          ? current.availability.filter((w) => w.day !== day)
          : [...current.availability, { day, start: "09:00", end: "17:00" }],
      };
    });
  };

  const setWindowTime = (day: number, key: "start" | "end", value: string) => {
    setConfig((current) => ({
      ...current,
      availability: current.availability.map((window) =>
        window.day === day ? { ...window, [key]: value } : window,
      ),
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!config.availability.length) {
      toast.error("Pick at least one available day");
      return;
    }
    for (const window of config.availability) {
      if (window.end <= window.start) {
        toast.error(`${DAY_LABELS[window.day]}: end must be after start`);
        return;
      }
    }
    onSave(config);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-xl flex-col gap-5"
    >
      <div>
        <h2 className="text-lg font-bold text-[#0a0a0c]">Book a Meeting</h2>
        <p className="mt-0.5 text-xs text-[#8a8a8f]">
          Visitors pick an open time straight from your Google Calendar
        </p>
      </div>

      {/* Google connection state */}
      <div className="rounded-2xl border border-black/[0.06] bg-gray-50 p-4">
        {googleLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#8a8a8f]">
            <Loader className="h-4 w-4 animate-spin" /> Checking Google
            Calendar…
          </div>
        ) : google?.connected ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#0a0a0c]">
                Google Calendar connected
              </p>
              <p className="truncate text-xs text-[#8a8a8f]">
                {google.googleEmail}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              className="flex shrink-0 items-center gap-1 rounded-full border border-black/[0.08] px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
            >
              <Unplug className="h-3.5 w-3.5" /> Disconnect
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-[#0a0a0c]">
              Connect Google Calendar
            </p>
            <p className="text-xs text-[#8a8a8f]">
              Availability comes from your calendar’s free/busy; booked
              meetings appear on it automatically with a Meet link.
              {google && !google.configured
                ? " (Google integration is not configured on this server yet.)"
                : ""}
            </p>
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting || Boolean(google && !google.configured)}
              className="flex w-fit items-center gap-2 rounded-full bg-[#0a0a0c] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {connecting ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
              Connect Google Calendar
            </button>
            <p className="text-[11px] text-[#8a8a8f]">
              You can save the template now — it goes live once connected.
            </p>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[#8a8a8f]">Title</p>
        <input
          value={config.title}
          maxLength={80}
          onChange={(event) =>
            setConfig((current) => ({ ...current, title: event.target.value }))
          }
          className={inputClass}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[#8a8a8f]">Description</p>
        <input
          value={config.description}
          maxLength={280}
          onChange={(event) =>
            setConfig((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          className={inputClass}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[#8a8a8f]">
          Meeting lengths (up to 3)
        </p>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => toggleDuration(minutes)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                config.durationsMinutes.includes(minutes)
                  ? "bg-[#0a0a0c] text-white"
                  : "border border-black/[0.08] text-gray-600"
              }`}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[#8a8a8f]">
          Weekly availability{" "}
          <span className="font-normal">({config.timezone})</span>
        </p>
        <div className="flex flex-col gap-1.5">
          {DAY_LABELS.map((label, day) => {
            const window = dayWindow(day);
            return (
              <div key={label} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`w-14 shrink-0 rounded-full py-1.5 text-xs font-bold ${
                    window
                      ? "bg-[#0a0a0c] text-white"
                      : "border border-black/[0.08] text-gray-400"
                  }`}
                >
                  {label}
                </button>
                {window ? (
                  <>
                    <input
                      type="time"
                      value={window.start}
                      onChange={(event) =>
                        setWindowTime(day, "start", event.target.value)
                      }
                      className="rounded-lg border border-black/[0.08] bg-gray-50 px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-[#8a8a8f]">to</span>
                    <input
                      type="time"
                      value={window.end}
                      onChange={(event) =>
                        setWindowTime(day, "end", event.target.value)
                      }
                      className="rounded-lg border border-black/[0.08] bg-gray-50 px-2 py-1 text-xs"
                    />
                  </>
                ) : (
                  <span className="text-xs text-[#c2c2c6]">Unavailable</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold text-[#8a8a8f]">Buffer</p>
          <select
            value={config.bufferMinutes}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                bufferMinutes: Number(event.target.value),
              }))
            }
            className={inputClass}
          >
            {[0, 15, 30, 60].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} min
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-[#8a8a8f]">Notice</p>
          <select
            value={config.minNoticeHours}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                minNoticeHours: Number(event.target.value),
              }))
            }
            className={inputClass}
          >
            {[0, 1, 4, 12, 24, 48].map((hours) => (
              <option key={hours} value={hours}>
                {hours} h
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-[#8a8a8f]">Book ahead</p>
          <select
            value={config.maxDaysAhead}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                maxDaysAhead: Number(event.target.value),
              }))
            }
            className={inputClass}
          >
            {[7, 14, 30, 60, 90].map((days) => (
              <option key={days} value={days}>
                {days} days
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={config.addMeetLink}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                addMeetLink: event.target.checked,
              }))
            }
          />
          Add Google Meet link
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={config.collectNote}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                collectNote: event.target.checked,
              }))
            }
          />
          Ask for a note
        </label>
      </div>

      <PrimaryButton className="w-full py-3" disabled={saving}>
        {saving ? <Loader className="mx-auto h-5 w-5 animate-spin" /> : saveLabel}
      </PrimaryButton>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="flex items-center justify-center gap-2 rounded-xl border border-red-100 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50"
        >
          {deleting ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete template
        </button>
      )}
    </form>
  );
};

export default BookingConfigForm;
