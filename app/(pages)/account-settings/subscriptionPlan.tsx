"use client";
import { Check } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import SubscribeButton from "@/components/StripeSubscriptionBtn";
import { useUser } from "@/lib/UserContext";

type BillingTerm = "month" | "year";

interface Plan {
  name: "Pro" | "Premium" | "Free";
  description: string;
  price: number;
  yearlyPrice?: number;
  interval?: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
}

const plans: Plan[] = [
  {
    name: "Free",
    description: "Start with the basics for one SmartSite and one blink.",
    price: 0,
    features: [
      "1 SmartSite",
      "Core templates",
      "1 active blink",
      "Unlimited scans",
      "Encrypted Messenger",
      "Lead capture",
      "Basic analytics",
      "Astro + Goldman AI when holding 1,000+ SWOP",
      "1 Seat",
    ],
    buttonText: "Start for Free",
  },
  {
    name: "Premium",
    description: "Everything unlocked — sites, templates, AI, and blinks.",
    price: 8.99,
    yearlyPrice: 59.99,
    interval: "month",
    features: [
      "Unlimited SmartSites",
      "All premium templates (incl. Bot Chat)",
      "Unlimited blinks",
      "Leads & forms tab + CRM export",
      "Goldman + Astro AI access (no SWOP required)",
      "Longer videos & larger file uploads",
      "Token-gated SmartSite content",
      "Swop Support 24/7",
    ],
    buttonText: "Upgrade Premium",
    isPopular: true,
  },
];

// $59.99/yr vs 12 × $8.99
const YEARLY_SAVINGS_LABEL = "Save 44%";

export default function SubscriptionPlans() {
  const [selectedPlan, setSelectedPlan] = useState("Premium");
  const [term, setTerm] = useState<BillingTerm>("month");
  const { user } = useUser();
  // 'premium' | 'free' | null while unknown (loading / logged out) — unknown
  // keeps the default upgrade buttons so nothing flashes or blocks checkout.
  const [currentPlan, setCurrentPlan] = useState<"premium" | "free" | null>(
    null
  );

  useEffect(() => {
    const userId = user?._id;
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/manage-subscription/${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const status = data?.subscription?.status;
        const periodEnd = data?.subscription?.currentPeriodEnd;
        const active =
          (status === "premium" || status === "pro") &&
          (!periodEnd || new Date(periodEnd).getTime() > Date.now());
        setCurrentPlan(active ? "premium" : "free");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  return (
    <div className="">
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const yearly = term === "year" && plan.yearlyPrice != null;
          const price = yearly ? plan.yearlyPrice! : plan.price;
          const interval = plan.interval
            ? yearly
              ? "year"
              : plan.interval
            : null;
          const checkoutPlan =
            plan.name === "Premium" && yearly ? "PremiumYearly" : plan.name;
          const buttonLabel =
            plan.price === 0
              ? plan.buttonText
              : `${plan.buttonText} $${price}/${yearly ? "yr" : "mo"}`;
          return (
            <Card
              key={plan.name}
              onClick={() => setSelectedPlan(plan.name)}
              className={`relative flex flex-col !rounded-3xl ${
                plan.name === selectedPlan ? "border-[#593ED3] shadow-lg" : ""
              }`}
            >
              {plan.isPopular && (
                <Badge className="absolute -top-2 right-1/2 translate-x-1/2 bg-[#593ED3]">
                  Recommended
                </Badge>
              )}
              <div className="h-full">
                <CardHeader>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-[#593ED3]">
                      ${price}
                    </span>
                    {interval && (
                      <span className="text-muted-foreground ml-1">
                        / {interval}
                      </span>
                    )}
                  </div>
                  {plan.yearlyPrice != null && (
                    <div className="mt-3 flex gap-2">
                      {(["month", "year"] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTerm(option);
                          }}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                            term === option
                              ? "border-[#593ED3] text-[#593ED3] bg-[#593ED3]/5"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {option === "month" ? "Monthly" : "Yearly"}
                          {option === "year" && (
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                              {YEARLY_SAVINGS_LABEL}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Key Features</h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-[#593ED3] mt-1 shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </div>
              <CardFooter>
                {currentPlan === "premium" && plan.name === "Premium" ? (
                  <div className="w-full space-y-2">
                    <div className="w-full rounded-lg border border-[#593ED3] bg-[#593ED3]/5 py-2 text-center font-medium text-[#593ED3]">
                      Current plan
                    </div>
                    <Link
                      href="/manage-subscription"
                      className="block w-full text-center text-sm text-gray-500 underline-offset-2 hover:underline"
                    >
                      Manage subscription
                    </Link>
                  </div>
                ) : currentPlan === "premium" && plan.price === 0 ? (
                  <Link
                    href="/manage-subscription"
                    className="w-full rounded-lg bg-black py-2 text-center text-white hover:bg-gray-800"
                  >
                    Downgrade plan
                  </Link>
                ) : currentPlan === "free" && plan.price === 0 ? (
                  <div className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 text-center font-medium text-gray-500">
                    Current plan
                  </div>
                ) : (
                  <div
                    className={`w-full text-white rounded-lg ${
                      plan.isPopular
                        ? "bg-[#593ED3] hover:bg-purple-600"
                        : "bg-black hover:bg-gray-800"
                    }`}
                  >
                    <SubscribeButton plan={checkoutPlan} label={buttonLabel} />
                  </div>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
