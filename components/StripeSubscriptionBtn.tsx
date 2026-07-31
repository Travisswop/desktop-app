"use client";

import { useState } from "react";
import { useUser } from "@/lib/UserContext";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";

// Plan keys the backend checkout route accepts (routes/v1/stripe.js).
export type CheckoutPlan = "Pro" | "Premium" | "PremiumYearly" | "Free";

// Checkout is a plain redirect to a Stripe-hosted URL, so Stripe.js is never
// needed here. It used to be awaited before the redirect, which meant an ad
// blocker on js.stripe.com left the button spinning forever.
const REQUEST_TIMEOUT_MS = 20000;

async function postJson(url: string, body: unknown) {
  // AbortController rather than AbortSignal.timeout: the latter is missing on
  // older Safari/Chrome, and calling it would throw before the request is even
  // sent — turning a slow checkout into a broken one.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  // A gateway timeout or crashed route replies with HTML, not JSON — parsing
  // that used to throw and strand the spinner.
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Checkout is unavailable right now (${res.status}). Please try again.`
    );
  }

  if (!res.ok) {
    throw new Error(
      data?.error || `Checkout failed (${res.status}). Please try again.`
    );
  }
  return data;
}

export default function SubscribeButton({
  plan,
  label,
}: {
  plan: CheckoutPlan;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const handleSubscribe = async () => {
    if (loading) return;

    const userId = user?._id;
    // The Stripe webhook resolves the account solely from metadata.userId. A
    // session created without it takes the payment and never grants Premium,
    // so refuse to start checkout instead.
    if (!userId) {
      toast.error("Please sign in again before subscribing.");
      return;
    }

    setLoading(true);
    try {
      if (plan === "Free") {
        await postJson("/api/set-free-plan", {
          plan,
          email: user?.email,
          userId,
        });
        toast.success("You are in free tier now");
        return;
      }

      const data = await postJson("/api/create-session", {
        plan,
        email: user?.email,
        userId,
      });

      if (!data?.url) {
        throw new Error(
          data?.error || "Could not start checkout. Please try again."
        );
      }

      window.location.href = data.url;
    } catch (err: any) {
      const message =
        err?.name === "TimeoutError" || err?.name === "AbortError"
          ? "Checkout timed out. Please check your connection and try again."
          : err?.message || "Something went wrong. Please try again.";
      toast.error(message);
      console.error("Subscription checkout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="w-full flex justify-center gap-2 items-center py-2 rounded-lg"
      onClick={handleSubscribe}
      disabled={loading}
    >
      {label ?? plan} {loading && <Loader className="animate-spin" size={20} />}
    </button>
  );
}
