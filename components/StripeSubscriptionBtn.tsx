// app/subscribe/page.tsx or a component
"use client";

import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";
import { useUser } from "@/lib/UserContext";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Plan keys the backend checkout route accepts (routes/v1/stripe.js).
export type CheckoutPlan = "Pro" | "Premium" | "PremiumYearly" | "Free";

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
    setLoading(true);

    if (plan === "Free") {
      await fetch("/api/set-free-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: user?.email, userId: user?._id }),
      });

      toast.success("You are in free tier now");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, email: user?.email, userId: user?._id }),
    });

    const data = await res.json();
    const stripe = await stripePromise;
    if (stripe && data.url) {
      window.location.href = data.url;
    } else if (data.error) {
      toast.error(data.error);
    }

    setLoading(false);
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
