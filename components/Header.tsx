"use client";

import {
  useLoginWithPasskey,
  useMfaEnrollment,
  usePrivy,
} from "@privy-io/react-auth";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Loader } from "lucide-react";
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
import swopLogo from "@/public/images/swop.png";
import swopWorldLogo from "@/public/images/swop-world.png";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { AiOutlineMessage } from "react-icons/ai";
import { NotificationBell } from "@/components/notifications";
import { FaUserCheck, FaUserPlus } from "react-icons/fa6";
import { Badge } from "./ui/badge";
import { formatCount } from "@/lib/formatNumberCount";
import { FaUserEdit } from "react-icons/fa";
import { HiBellAlert } from "react-icons/hi2";
import { PiMedalFill } from "react-icons/pi";
import { TiInfoLarge } from "react-icons/ti";
import { RiCustomerService2Line } from "react-icons/ri";
import { LuWallet } from "react-icons/lu";
import { IoLogOut, IoLogOutOutline } from "react-icons/io5";

export default function Header() {
  const { user, loading, logout: userLogout } = useUser();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { state, loginWithPasskey } = useLoginWithPasskey();

  const { exportWallet } = usePrivy();
  const { exportWallet: exportSolanaWallet } = useSolanaWallets();

  const handleLogout = async () => {
    // Prevent multiple logout attempts
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      // Use the UserContext logout function which already handles clearing session
      await userLogout();
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
        <Skeleton className="h-7 w-7 rounded" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-14 w-48 rounded-full" />
        </div>
      </header>
    );
  }

  return (
    <div className="bg-white rounded-b-xl shadow-small sticky top-0 z-10">
      <header className="h-24 bg-white mx-8 flex items-center justify-between">
        {/* <SidebarTrigger /> */}
        <Link href={"/"} className="flex items-center gap-2.5">
          <Image src={swopWorldLogo} alt="swop" className="h-8 w-auto" />
          <Image src={swopLogo} alt="swop" className="h-6 w-auto" />
        </Link>
        <div className=" flex items-center justify-end">
          <div>
            <Link href="/dashboard/chat">
              <button className="rounded-full w-[38px] h-[38px] bg-black flex items-center justify-center">
                <AiOutlineMessage color="white" size={19} />
              </button>
              {/* <Button variant="black" className="gap-2 font-bold rounded-xl">
            <Image src={filePlus} alt="file-plus" className="w-6 h-6" />
            Create Microsite
          </Button> */}
            </Link>
          </div>
          <div className="mx-2">
            <NotificationBell />
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
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <FaUserPlus />
                  <p>Followers</p>
                  <Badge className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums bg-blue-700 flex items-center justify-center">
                    {user ? formatCount(user.followers) : 0}
                  </Badge>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <FaUserCheck />
                  <p>Following</p>
                  <Badge className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums bg-green-700 flex items-center justify-center">
                    {user ? formatCount(user.following) : 0}
                  </Badge>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    router.push("/edit-profile");
                  }}
                  className="cursor-pointer"
                >
                  <FaUserEdit />
                  <p>Edit Profile</p>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    router.push("/notification");
                  }}
                  className="cursor-pointer"
                >
                  <HiBellAlert />
                  <p>Notification</p>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    router.push("/subscription");
                  }}
                  className="cursor-pointer"
                >
                  <PiMedalFill />
                  <p>Swop Pro</p>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <a
                    href={"https://www.swopme.co"}
                    target="_blank"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <TiInfoLarge />
                    <p>About</p>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <a
                    href={"https://www.swopme.co/support"}
                    target="_blank"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <RiCustomerService2Line />
                    <p>Support Center</p>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    router.push("/wallet-settings");
                  }}
                  className="cursor-pointer"
                >
                  <LuWallet />
                  <p>Wallet Setting</p>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={handleLogout}
                  disabled={isLoggingOut}
                >
                  <span className="flex items-center gap-2">
                    <IoLogOutOutline />
                    Logout
                    {isLoggingOut && <Loader className="animate-spin" />}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
    </div>
  );
}
