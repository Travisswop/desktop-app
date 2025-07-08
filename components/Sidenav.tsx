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
  Bot,
  ScanQrCode,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import swopLogo from "@/public/images/swop-logo.png";
import swopCollapseLogo from "@/public/images/swop-collapse-logo.png";
import { MdOutlineShoppingCart } from "react-icons/md";
import { useState, useMemo } from "react";
import { HiOutlineLogout } from "react-icons/hi";
import { useUser } from "@/lib/UserContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";
import { UpgradePlanNavbar } from "./UpgradePlanNavbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { ChartNoAxesColumn } from "lucide-react";

// First, create the base nav items without the Agent item
const baseNavItems = [
  { href: "/", label: "Feed", icon: Newspaper },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/smartsite", label: "Smartsites", icon: ChartNoAxesColumn },
  { href: "/qr-code", label: "QR Code", icon: ScanQrCode },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/mint", label: "Mint", icon: ImageIcon },
  { href: "/order", label: "Orders", icon: ShoppingBag },
  { href: "/content", label: "Content", icon: FileText },
];

export default function Sidenav() {
  const [hideUpgradePlan, setHideUpgradePlan] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { open } = useSidebar();

  console.log("sidebar open", open);

  const { user } = useUser();
  const pathname = usePathname();
  const { logout } = useUser();
  const router = useRouter();

  // Create the final nav items array based on email
  const navItems = useMemo(() => {
    if (user?.email === "salmansaikote9@gmail.com") {
      return [...baseNavItems, { href: "/agent", label: "Agent", icon: Bot }];
    }
    return baseNavItems;
  }, [user?.email]);

  const handleLogout = async () => {
    // Prevent multiple logout attempts
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      // Use the logout function from UserContext which handles clearing user data
      await logout();

      // Navigate to login page
      router.replace("/login");
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
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarContent className="h-full">
        <SidebarGroup className="!p-0 overflow-x-hidden">
          <SidebarGroupContent>
            {/* <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white overflow-x-hidden"> */}
            <div className="flex h-full flex-col !p-0">
              <SidebarHeader
                className={`${open ? "h-[92px]" : "h-[90px]"} flex border-b ${
                  !open && "flex items-center justify-center"
                }`}
              >
                {open ? (
                  <Link
                    href="/"
                    className="h-full flex justify-start items-center translate-x-4"
                  >
                    <Image
                      className="w-24 xl:w-[120px] h-auto"
                      src={swopLogo}
                      quality={100}
                      alt="SWOP"
                    />
                  </Link>
                ) : (
                  <Link
                    href="/"
                    className=" flex justify-start items-center w-9 h-full"
                  >
                    <Image
                      className="w-9 h-auto"
                      src={swopCollapseLogo}
                      quality={100}
                      alt="SWOP"
                    />
                  </Link>
                )}
              </SidebarHeader>
              <div className="h-full flex flex-col justify-between overflow-y-auto overflow-x-hidden">
                <SidebarMenu
                  className={`py-6 flex flex-col ${
                    open ? "justify-start px-3" : "justify-center items-center"
                  } gap-2`}
                >
                  {navItems.map((item) => {
                    const Icon = item.icon;

                    // Check if pathname starts with item's href
                    const isActive =
                      (pathname && pathname === item.href) ||
                      (pathname && pathname.startsWith(item.href + "/"));

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          tooltip={item.label}
                          asChild
                          className={`text-base ${
                            isActive
                              ? "bg-[#efeff7] hover:bg-[#efeff7] text-[#2f333d]"
                              : "hover:bg-[#efeff7]"
                          }`}
                        >
                          <Link
                            href={item.href}
                            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[#424651]"
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  {!open && (
                    <>
                      <div className="mt-8 border-t w-full flex justify-center pt-2">
                        <UpgradePlanNavbar
                          hideUpgradePlan={hideUpgradePlan}
                          setHideUpgradePlan={setHideUpgradePlan}
                        />
                      </div>

                      <div className="w-full flex justify-center pt-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={handleLogout}
                              className="flex items-center gap-1 font-medium hover:bg-[#efeff7] p-1.5 rounded"
                            >
                              <HiOutlineLogout size={18} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">Logout</TooltipContent>
                        </Tooltip>
                      </div>
                    </>
                  )}
                </SidebarMenu>
                {/* <div className="border-t p-4 text-[#454547] text-base h-full flex flex-col justify-end">
                  {hideUpgradePlan && (
                    <div className=" rounded-lg bg-gray-100 p-4">
                      <MdOutlineShoppingCart
                        color="#454547"
                        size={20}
                        className="mb-3"
                      />
                      <h5 className="mb-2 font-medium">
                        Unlock Unlimited Access
                      </h5>
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
                </div> */}
              </div>
            </div>
            {/* </aside> */}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {open && (
        <div className="border-t p-4 text-[#454547] text-base flex flex-col justify-end">
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
      )}
    </Sidebar>
  );
}
