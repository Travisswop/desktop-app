"use client";
import Image from "next/image";
import Link from "next/link";
import {
  QrCode,
  Wallet,
  BarChart2,
  FileText,
  ShoppingBag,
  ImageIcon,
  LayoutDashboard,
  Newspaper,
  LayoutGrid,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import swopLogo from "@/public/images/swop-logo.png";
import { MdOutlineShoppingCart } from "react-icons/md";
import { useState } from "react";
import { HiOutlineLogout } from "react-icons/hi";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/lib/UserContext";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/smartsite", label: "Smartsites", icon: LayoutGrid },
  { href: "/qr-code", label: "QR Code", icon: QrCode },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/mint", label: "Mint", icon: ImageIcon },
  { href: "/order", label: "Orders", icon: ShoppingBag },
  { href: "/content", label: "Content", icon: FileText },
];

export default function Sidenav() {
  const [hideUpgradePlan, setHideUpgradePlan] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { loading, clearCache } = useUser();
  const pathname = usePathname();
  const { logout } = usePrivy();
  const router = useRouter();

  const handleLogout = async () => {
    // Prevent multiple logout attempts
    if (isLoggingOut) {
      console.log("Logout already in progress");
      return;
    }

    setIsLoggingOut(true);
    try {
      // Clear user data first to prevent any state inconsistencies
      clearCache();

      // Perform logout and navigation in parallel for better performance
      await Promise.all([logout(), router.replace("/login")]);
    } catch (error) {
      console.error("Logout failed:", error);
      // Revert loading state on error
      setIsLoggingOut(false);
      throw error; // Re-throw to allow error handling by parent components
    }
    // Only clear loading state on success to prevent UI flicker
    setIsLoggingOut(false);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white overflow-x-hidden">
      <div className="flex h-full flex-col">
        <div className="flex h-[89px] items-center border-b px-4">
          <Link
            href="/"
            className="h-full flex justify-start items-center translate-x-3"
          >
            <div className="w-32 h-auto">
              <Image src={swopLogo} quality={100} alt="SWOP" />
            </div>
          </Link>
        </div>
        <div className="h-full flex flex-col overflow-y-auto">
          <nav
            className={`${
              hideUpgradePlan ? "flex-1" : "pb-10"
            } space-y-1 px-2 pt-4`}
          >
            <ul className="flex-1 px-2 py-2 space-y-1 font-normal">
              {navItems.map((item) => {
                const Icon = item.icon;

                // Check if pathname starts with item's href
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-[#424651]",
                        isActive
                          ? "bg-gray-200 hover:bg-gray-200 text-[#2f333d]"
                          : "hover:bg-gray-100"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="border-t p-4 text-[#454547]">
            {hideUpgradePlan && (
              <div className=" rounded-lg bg-gray-100 p-4">
                <MdOutlineShoppingCart
                  color="#454547"
                  size={20}
                  className="mb-3"
                />
                <h5 className="mb-2 font-medium">Unlock Unlimited Access</h5>
                <p className="mb-3 text-xs text-gray-600 font-normal">
                  Free NFC with a yearly <br /> subscription
                </p>
                <div className="w-full flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => setHideUpgradePlan(false)}
                    className="text-gray-600 font-medium text-sm"
                  >
                    Dismiss
                  </button>
                  <Link
                    href={"/account-settings?upgrade=true"}
                    className="text-black font-semibold"
                  >
                    Upgrade Plan
                  </Link>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 mt-3 pl-2 font-medium"
            >
              <HiOutlineLogout size={18} /> Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
