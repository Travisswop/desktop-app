"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { MdOutlineShoppingCart } from "react-icons/md";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function UpgradePlanNavbar({
  hideUpgradePlan,
  setHideUpgradePlan,
}: any) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex justify-center">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="hover:bg-[#efeff7] p-1.5 rounded">
                  <MdOutlineShoppingCart color="#454547" size={18} />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Upgrade Plan</p>
            </TooltipContent>
          </Tooltip>
          {!hideUpgradePlan && (
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg bg-white"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <div className=" text-[#454547] text-base flex flex-col justify-end">
                <div className=" rounded-lg bg-white p-4">
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
              </div>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
