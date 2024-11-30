import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Plan {
  name: string;
  description: string;
  price: number | "Free";
  interval?: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
}

const plans: Plan[] = [
  {
    name: "Basic",
    description: "Lorem ipsum dolor sit amet consectetur adipisicing elit.",
    price: "Free",
    features: [
      "1 SmartSite",
      "1 QR Code",
      "Unlimited Scans",
      "Bypass",
      "Click Rate",
      "1 Seat",
      "Video Hosting*",
      "Mp3 Hosting*",
      "No Transaction Fees",
      "Encrypted Messenger",
      "Web2 Domain + Hosting",
      "Lead Generation",
      "Analytics",
    ],
    buttonText: "Start for Free",
  },
  {
    name: "Pro",
    description: "Lorem ipsum dolor sit amet consectetur adipisicing elit.",
    price: 5.99,
    interval: "Day",
    features: [
      "5 SmartSites",
      "5 Qr Codes",
      "Customize QR",
      "Pull Request Cap",
      "Unlimited Scans",
      "Bypass",
      "Click Rate",
      "Lead Generation",
      "Export Leads to CRM",
      "Video Hosting*",
      "MP3 Hosting*",
      "Photo Hosting*",
      "Web3 Domain + Hosting",
      "Token Powered Sites",
      "1 Seat",
    ],
    buttonText: "Upgrade Pro for $5.99",
  },
  {
    name: "Premium",
    description: "Lorem ipsum dolor sit amet consectetur adipisicing elit.",
    price: 99.99,
    interval: "Day",
    features: [
      "50 SmartSites",
      "50 Qr Codes",
      "Customize",
      "Pull Request Cap: 100,000",
      "Unlimited Scans",
      "Digitization (Mining)",
      "Bypass",
      "Click Rate",
      "Lead Generation",
      "Export Leads to CRM",
      "Swop Support 24/7",
      "Mp3/Video Hosting",
      "No Transaction Fees",
      "Token Powered Sites",
      "OnChain Store Feature",
      "Smart Contract Coupons",
      "No Cap on MP3, Photo, Video Size",
      "5 Seats",
    ],
    buttonText: "Upgrade Premium $99.99",
    isPopular: true,
  },
];

export default function SubscriptionPlans() {
  return (
    <div className="px-4 py-8">
      <h2 className="text-xl font-semibold mb-8">All Plans</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${
              plan.isPopular ? "border-purple-500 shadow-lg" : ""
            }`}
          >
            {plan.isPopular && (
              <Badge className="absolute -top-2 right-20 bg-purple-500">
                Recommended
              </Badge>
            )}
            <CardHeader>
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">
                {plan.description}
              </p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-purple-600">
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
                      <Check className="h-4 w-4 text-purple-500 mt-1 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className={`w-full ${
                  plan.isPopular
                    ? "bg-purple-500 hover:bg-purple-600"
                    : plan.price === "Free"
                    ? "bg-black hover:bg-gray-800"
                    : "bg-black hover:bg-gray-800"
                }`}
              >
                {plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
