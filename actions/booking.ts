"use server";

/**
 * Public (visitor-side) Booking widget calls. No auth — the backend resolves
 * the SmartSite owner from the widget id server-side.
 */

export interface BookingSlotsResponse {
  live: boolean;
  timezone: string;
  durations: number[];
  maxDaysAhead?: number;
  slots: string[]; // ISO UTC start times
}

export async function getBookingSlots(info: {
  widgetId: string;
  from: string;
  to: string;
  duration?: number;
}): Promise<BookingSlotsResponse | null> {
  try {
    const params = new URLSearchParams({ from: info.from, to: info.to });
    if (info.duration) params.set("duration", String(info.duration));
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/widget/${info.widgetId}/booking/slots?${params}`,
      { cache: "no-store" },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    return data?.data ?? null;
  } catch (error) {
    console.error("Booking slots fetch failed:", error);
    return null;
  }
}

export async function createBooking(info: {
  widgetId: string;
  startTime: string;
  duration: number;
  name: string;
  email: string;
  note?: string;
  visitorTimezone?: string;
}): Promise<
  | { state: "success"; data: { startTime: string; endTime: string; meetLink?: string } }
  | { state: "error"; message: string }
> {
  try {
    const { widgetId, ...body } = info;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/widget/${widgetId}/booking`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        state: "error",
        message: data?.message || "Could not book that time",
      };
    }
    return { state: "success", data: data?.data };
  } catch (error) {
    console.error("Booking create failed:", error);
    return { state: "error", message: "Could not book that time" };
  }
}

export async function cancelBooking(manageToken: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v5/microsite/widget/booking/manage/${manageToken}/cancel`,
      { method: "POST" },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return { state: "error", message: data?.message || "Could not cancel" };
    }
    return { state: "success" };
  } catch (error) {
    console.error("Booking cancel failed:", error);
    return { state: "error", message: "Could not cancel" };
  }
}
