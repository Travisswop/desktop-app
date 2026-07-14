"use client";
import { Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import SubscribeButton from "@/components/StripeSubscriptionBtn";

interface Plan {
  name: "Pro" | "Premium" | "Free";
  description: string;
  price: number;
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
      "1 Seat",
    ],
    buttonText: "Start for Free",
  },
  {
    name: "Premium",
    description: "Everything unlocked — sites, templates, AI, and blinks.",
    price: 8.99,
    interval: "month",
    features: [
      "1,000 SWOP welcome bonus",
      "Unlimited SmartSites",
      "All premium templates (incl. Bot Chat)",
      "Unlimited blinks",
      "Leads & forms tab + CRM export",
      "Goldman + Astro AI access",
      "Longer videos & larger file uploads",
      "Token-gated SmartSite content",
      "Swop Support 24/7",
    ],
    buttonText: "Upgrade Premium $8.99/mo",
    isPopular: true,
  },
];

export default function SubscriptionPlans() {
  const [selectedPlan, setSelectedPlan] = useState("Premium");
  return (
    <div className="">
      {/* <h2 className="text-xl font-semibold mb-8">All Plans</h2> */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan) => (
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
                    {typeof plan.price === "number"
                      ? `$${plan.price}`
                      : plan.price}
                  </span>
                  {plan.interval && (
                    <span className="text-muted-foreground ml-1">
                      / {plan.interval}
                    </span>
                  )}
                </div>
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
              <div
                className={`w-full text-white rounded-lg ${
                  plan.isPopular
                    ? "bg-[#593ED3] hover:bg-purple-600"
                    : plan.price === 0
                    ? "bg-black hover:bg-gray-800"
                    : "bg-black hover:bg-gray-800"
                }`}
              >
                <SubscribeButton plan={plan.name} />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      {/* <SubscribeButton plan="Pro" /> */}
    </div>
  );
}
