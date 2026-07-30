"use client";

import { use, useState } from "react";
import { CalendarX, Check, Loader2 } from "lucide-react";
import { cancelBooking } from "@/actions/booking";

/**
 * Public cancel page reached from the booking confirmation email
 * (WEB_URL/booking/<manageToken>/cancel). The token alone authorizes the
 * cancellation — no session required.
 */
export default function CancelBookingPage({
  params,
}: {
  params: Promise<{ manageToken: string }>;
}) {
  const { manageToken } = use(params);
  const [state, setState] = useState<"idle" | "working" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const handleCancel = async () => {
    setState("working");
    const result = await cancelBooking(manageToken);
    if (result.state === "success") {
      setState("done");
    } else {
      setState("error");
      setMessage(result.message || "Could not cancel this booking");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-black/[0.06] bg-white p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)]">
        {state === "done" ? (
          <>
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-6 w-6 text-emerald-600" />
            </span>
            <h1 className="text-[17px] font-bold text-gray-950">
              Meeting cancelled
            </h1>
            <p className="mt-1 text-[13px] text-gray-500">
              The calendar event has been removed and the host was notified.
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <CalendarX className="h-6 w-6 text-red-500" />
            </span>
            <h1 className="text-[17px] font-bold text-gray-950">
              Cancel this meeting?
            </h1>
            <p className="mt-1 text-[13px] text-gray-500">
              This removes the event from both calendars. It can’t be undone —
              you’re welcome to book a new time afterwards.
            </p>
            {state === "error" && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                {message}
              </p>
            )}
            <button
              type="button"
              onClick={handleCancel}
              disabled={state === "working"}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gray-950 py-3 text-[14px] font-bold text-white disabled:opacity-60"
            >
              {state === "working" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarX className="h-4 w-4" />
              )}
              Cancel meeting
            </button>
          </>
        )}
      </div>
    </main>
  );
}
