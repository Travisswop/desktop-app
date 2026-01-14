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

export default function SubscribeButton({
  plan,
}: {
  plan: "Pro" | "Premium" | "Free";
}) {
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  console.log("user", user);
  console.log("plan", plan);

  const handleSubscribe = async () => {
    setLoading(true);

    if (plan === "Free") {
      const res = await fetch("/api/set-free-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: user?.email, userId: user?._id }),
      });
      console.log("res free plan", res);

      toast.success("You are in free tier now");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, email: user?.email, userId: user?._id }),
    });

    console.log("res from pro", res);

    const data = await res.json();
    console.log("res from pro data", data);
    const stripe = await stripePromise;
    if (stripe && data.url) {
      window.location.href = data.url;
    }

    setLoading(false);
  };

  return (
    <button
      className="w-full flex justify-center gap-2 items-center py-2 rounded-lg"
      onClick={handleSubscribe}
      disabled={loading}
    >
      {plan} {loading && <Loader className="animate-spin" size={20} />}
    </button>
  );
}
