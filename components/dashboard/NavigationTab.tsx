import React from "react";

import blink from "@/public/assets/dashboardHub/blink.png";
import collectible from "@/public/assets/dashboardHub/collectible.png";
import coupon from "@/public/assets/dashboardHub/coupon.png";
import digital from "@/public/assets/dashboardHub/digital.png";
import leads from "@/public/assets/dashboardHub/leads.png";
import membership from "@/public/assets/dashboardHub/membership.png";
import menu from "@/public/assets/dashboardHub/menu.png";
import nfc from "@/public/assets/dashboardHub/nfc.png";
import points from "@/public/assets/dashboardHub/points.png";
import pos from "@/public/assets/dashboardHub/pos.png";
import products from "@/public/assets/dashboardHub/products.png";
import subscription from "@/public/assets/dashboardHub/subscription.png";
import Image from "next/image";
import Link from "next/link";

interface NavItem {
  id: string;
  label: string;
  icon: any;
}

const navigationItems: NavItem[] = [
  { id: "coupon", label: "Coupon", icon: coupon },
  { id: "menu", label: "Menu", icon: menu },
  {
    id: "collectible",
    label: "Collectible",
    icon: collectible,
  },
  {
    id: "products",
    label: "Products",
    icon: products,
  },
  { id: "digital", label: "Digital", icon: digital },
  {
    id: "membership",
    label: "Membership",
    icon: membership,
  },
  {
    id: "subscription",
    label: "Subscription",
    icon: subscription,
  },
  { id: "blink", label: "Blink", icon: blink },
  { id: "points", label: "Points", icon: points },
  { id: "leads", label: "Leads", icon: leads },
  { id: "nfc", label: "NFC", icon: nfc },
  { id: "pos", label: "POS", icon: pos },
];

interface NavigationHubProps {
  onItemClick?: (itemId: string) => void;
}

export const NavigationHub: React.FC<NavigationHubProps> = () => {
  return (
    <div className="w-full bg-white rounded-xl">
      <div className="w-full px-4">
        <div className="flex flex-col gap-1 items-start py-4">
          <p className="font-medium">Hub</p>
          {/* Navigation Items */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:flex items-center gap-2 lg:gap-6 xl:gap-10 w-full">
            {navigationItems.map((item) => (
              <Link
                href={"/mint"}
                key={item.id}
                // onClick={() => handleClick(item.id)}
                className="flex flex-col items-center gap-2 group cursor-pointer transition-all hover:opacity-70 "
              >
                <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700 group-hover:border-gray-200 transition-colors">
                  <Image
                    src={item.icon}
                    alt={item.label}
                    className="w-[50%] lg:w-[70%] 2xl:w-[60%] h-auto"
                  />
                </div>
                <span className="text-xs font-medium text-gray-800 whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationHub;
