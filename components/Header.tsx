"use client";

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
import { usePathname, useRouter } from "next/navigation";
import isUrl from "@/lib/isUrl";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import swopLogo from "@/public/images/swop.png";
import swopWorldLogo from "@/public/images/swop-world.png";
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
import { IoLogOutOutline } from "react-icons/io5";

let chatRouteWarmup: Promise<unknown> | null = null;

function warmChatRoute() {
  chatRouteWarmup ??= import("@/components/chat/ChatRuntime");
  return chatRouteWarmup;
}

export default function Header() {
  const {
    user,
    loading,
    logout: userLogout,
    primaryMicrositeProfilePic,
  } = useUser();

  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpeningMessages, setIsOpeningMessages] = useState(false);
  const [isMessageRoutePending, startMessageRouteTransition] = useTransition();
  const messageFallbackTimerRef = useRef<number | null>(null);
  const showMessageSpinner = isOpeningMessages || isMessageRoutePending;
  const connectionCounts = {
    followers:
      (user as any)?.connections?.followers?.length ?? user?.followers ?? 0,
    following:
      (user as any)?.connections?.following?.length ?? user?.following ?? 0,
  };

  useEffect(() => {
    router.prefetch("/dashboard/chat");
    const warmOnIdle = () => {
      void warmChatRoute();
    };
    const idleId =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback(warmOnIdle, { timeout: 3500 })
        : window.setTimeout(warmOnIdle, 1200);

    return () => {
      if ("cancelIdleCallback" in window && typeof idleId === "number") {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [router]);

  useEffect(() => {
    setIsOpeningMessages(false);
    if (messageFallbackTimerRef.current) {
      window.clearTimeout(messageFallbackTimerRef.current);
      messageFallbackTimerRef.current = null;
    }
  }, [pathname]);

  const warmMessagesRoute = () => {
    router.prefetch("/dashboard/chat");
    void warmChatRoute();
  };

  const handleMessagesClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    warmMessagesRoute();
    setIsOpeningMessages(true);
    startMessageRouteTransition(() => {
      router.push("/dashboard/chat");
    });

    messageFallbackTimerRef.current = window.setTimeout(() => {
      if (window.location.pathname !== "/dashboard/chat") {
        window.location.assign("/dashboard/chat");
      }
    }, 1800);
  };

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
      <div className="bg-white rounded-b-xl shadow-small sticky top-0 z-[70]">
        <header className="h-24 bg-white mx-8 flex items-center justify-between">
          <Skeleton className="h-7 w-7 rounded" />

          <div className="flex items-center gap-2">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-14 w-48 rounded-full" />
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-b-xl shadow-small sticky top-0 z-[70]">
      <header className="h-24 bg-white mx-8 flex items-center justify-between">
        {/* <SidebarTrigger /> */}
        <Link href={"/"} className="flex items-center gap-2.5">
          <Image src={swopWorldLogo} alt="swop" className="h-8 w-auto" />
          <Image src={swopLogo} alt="swop" className="h-6 w-auto" />
        </Link>
        <div className=" flex items-center justify-end">
          <div>
            {/* Use a hard navigation here because wallet providers can swallow App Router transitions. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/dashboard/chat"
              aria-label="Open messages"
              aria-busy={isOpeningMessages}
              title="Open messages"
              onClick={handleMessagesClick}
              onPointerEnter={warmMessagesRoute}
              onFocus={warmMessagesRoute}
              className="relative z-[75] rounded-full w-[38px] h-[38px] bg-black flex items-center justify-center transition-transform active:scale-95"
            >
              {showMessageSpinner ? (
                <Loader className="h-[18px] w-[18px] animate-spin text-white" />
              ) : (
                <AiOutlineMessage color="white" size={19} />
              )}
            </a>
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
                    {(() => {
                      const pic =
                        primaryMicrositeProfilePic ?? user?.profilePic;
                      if (!pic) return null;
                      return isUrl(pic) ? (
                        <Image
                          src={pic}
                          alt={user?.name || ""}
                          fill
                          sizes="32px"
                          className="rounded-full object-cover border"
                        />
                      ) : (
                        <Image
                          src={`/images/user_avator/${pic}.png`}
                          alt={user?.name || ""}
                          fill
                          sizes="32px"
                          className="rounded-full object-cover"
                        />
                      );
                    })()}
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
                    {formatCount(connectionCounts.followers)}
                  </Badge>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <FaUserCheck />
                  <p>Following</p>
                  <Badge className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums bg-green-700 flex items-center justify-center">
                    {formatCount(connectionCounts.following)}
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
                    router.push("/notifications");
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
