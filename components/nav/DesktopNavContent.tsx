"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Gem,
  LayoutDashboard,
  Newspaper,
  Package,
  Plus,
  QrCode,
  ReceiptText,
  Sparkles,
  UserRoundCog,
  Wallet,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === "/dashboard",
  },
  {
    href: "/feed",
    label: "Feed",
    icon: Newspaper,
    match: (pathname: string) => pathname === "/" || pathname.startsWith("/feed"),
  },
  {
    href: "/wallet",
    label: "Wallet",
    icon: Wallet,
    match: (pathname: string) => pathname.startsWith("/wallet"),
  },
  {
    href: "/smartsite",
    label: "SmartSite",
    icon: Sparkles,
    match: (pathname: string) => pathname.startsWith("/smartsite"),
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    match: (pathname: string) => pathname.startsWith("/analytics"),
  },
  {
    href: "/order",
    label: "Orders",
    icon: Package,
    match: (pathname: string) => pathname.startsWith("/order"),
  },
  {
    href: "/dashboard/settlements",
    label: "Settlements",
    icon: ReceiptText,
    match: (pathname: string) => pathname.startsWith("/dashboard/settlements"),
  },
  {
    href: "/qr-code",
    label: "QR Codes",
    icon: QrCode,
    match: (pathname: string) => pathname.startsWith("/qr-code"),
  },
  {
    href: "/account-settings",
    label: "Settings",
    icon: UserRoundCog,
    match: (pathname: string) =>
      pathname.startsWith("/account-settings") ||
      pathname.startsWith("/wallet-settings"),
  },
];

const DesktopNavContent = () => {
  const pathname = usePathname() || "/";

  return (
    <aside className="sticky top-28 hidden h-[calc(100vh-8rem)] w-64 shrink-0 flex-col rounded-2xl border border-gray-100 bg-white p-3 shadow-small lg:flex">
      <div className="px-3 pb-3 pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
          Workspace
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.match(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-gray-100 pt-3">
        <Link
          href="/smartsite/create-smartsite"
          className="flex h-10 items-center gap-2 rounded-lg bg-gray-950 px-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          <span>New SmartSite</span>
        </Link>
        <Link
          href="/mint"
          className="flex h-10 items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-200"
        >
          <Gem className="h-4 w-4" />
          <span>Mint NFT</span>
        </Link>
      </div>
    </aside>
  );
};

export default DesktopNavContent;
