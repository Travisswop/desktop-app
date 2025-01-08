"use client";

import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/lib/UserContext";
import { Skeleton } from "./ui/skeleton";
import { useRouter } from "next/navigation";
import isUrl from "@/lib/isUrl";
import { useState } from "react";
import logo from "@/public/logo.png";
// import { LiaFileMedicalSolid } from "react-icons/lia";
import filePlus from "@/public/images/file-plus.png";
import bellIcon from "@/public/images/bell-icon.png";
import { BiMessageSquareDots } from "react-icons/bi";

export default function Header() {
  const { logout } = usePrivy();
  const { user, loading, clearCache } = useUser();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  if (loading) {
    return (
      <header className="bg-white p-6 flex justify-between items-center h-20 border-b">
        <Link href="/dashboard" className="h-20">
          <Image src={logo} alt="Logo" width={120} height={50} />
        </Link>
        <Skeleton className="h-14 w-48 rounded-full" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 h-20 items-center border-b bg-white px-4 flex justify-end">
      <div>
        <Link href="/chat">
          <button className="rounded-full w-[38px] h-[38px] bg-black flex items-center justify-center">
            <BiMessageSquareDots color="white" size={19} />
          </button>
          {/* <Button variant="black" className="gap-2 font-bold rounded-xl">
            <Image src={filePlus} alt="file-plus" className="w-6 h-6" />
            Create Microsite
          </Button> */}
        </Link>
      </div>
      <div className="bg-[#f6f6fd] p-2 rounded-full mx-2">
        <Image src={bellIcon} alt="bell icon" className="w-7 h-7" />
      </div>
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative flex items-center gap-2 px-3 py-4 rounded-full bg-[#F7F7F9] hover:bg-accent h-14"
              disabled={isLoggingOut}
            >
              <div className="relative h-8 w-8">
                {user.profilePic && (
                  <>
                    {isUrl(user?.profilePic) ? (
                      <Image
                        src={user.profilePic}
                        alt={user.name || ""}
                        fill
                        className="rounded-full object-cover border"
                      />
                    ) : (
                      <Image
                        src={`/images/user_avator/${user.profilePic}.png`}
                        alt={user.name || ""}
                        fill
                        className="rounded-full object-cover"
                      />
                    )}
                  </>
                )}
              </div>
              <span className="text-sm font-medium">{user.name}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              color="red"
              className="cursor-pointer"
              onSelect={() => {
                router.push("/account-settings");
              }}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
