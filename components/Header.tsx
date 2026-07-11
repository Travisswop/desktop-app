'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/lib/UserContext';
import { Skeleton } from './ui/skeleton';
import { usePathname, useRouter } from 'next/navigation';
import isUrl from '@/lib/isUrl';
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from 'react';
import swopLogo from '@/public/images/swop.png';
import swopWorldLogo from '@/public/images/swop-world.png';
import { AiOutlineMessage } from 'react-icons/ai';
import { NotificationBell } from '@/components/notifications';
import { FaUserCheck, FaUserPlus } from 'react-icons/fa6';
import { formatCount } from '@/lib/formatNumberCount';
import { FaUserEdit } from 'react-icons/fa';
import { HiBellAlert } from 'react-icons/hi2';
import { PiMedalFill } from 'react-icons/pi';
import { TiInfoLarge } from 'react-icons/ti';
import { RiCustomerService2Line, RiShieldKeyholeLine } from 'react-icons/ri';
import { LuWallet } from 'react-icons/lu';
import { IoLogOutOutline } from 'react-icons/io5';

const profileMenuItemClass =
  'h-11 cursor-pointer rounded-xl px-3 text-sm font-medium text-slate-900 focus:bg-slate-100 focus:text-slate-950 [&_svg]:size-5 [&_svg]:text-slate-950';

const profileMenuExternalItemClass =
  'flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:bg-slate-100 focus:text-slate-950 [&_svg]:size-5 [&_svg]:text-slate-950';

type WindowWithIdleCallback = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout?: number },
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

let chatRouteWarmup: Promise<unknown> | null = null;

function warmChatRoute() {
  chatRouteWarmup ??= import('@/components/chat/ChatRuntime');
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
  const [isMessageRoutePending, startMessageRouteTransition] =
    useTransition();
  const messageFallbackTimerRef = useRef<number | null>(null);
  const showMessageSpinner =
    isOpeningMessages || isMessageRoutePending;
  const connectionCounts = {
    followers:
      (user as any)?.connections?.followers?.length ??
      user?.followers ??
      0,
    following:
      (user as any)?.connections?.following?.length ??
      user?.following ??
      0,
  };
  const profilePic =
    primaryMicrositeProfilePic ?? user?.profilePic ?? '';
  const profileImageSrc = profilePic
    ? isUrl(profilePic)
      ? profilePic
      : `/images/user_avator/${profilePic}.png`
    : null;
  const profileName = user?.name?.trim() || 'Swop profile';
  const profileInitial = profileName.charAt(0).toUpperCase();

  useEffect(() => {
    router.prefetch('/dashboard/chat');
    const warmOnIdle = () => {
      void warmChatRoute();
    };
    const browserWindow = window as WindowWithIdleCallback;
    const usesIdleCallback =
      typeof browserWindow.requestIdleCallback === 'function';
    const idleId =
      usesIdleCallback && browserWindow.requestIdleCallback
        ? browserWindow.requestIdleCallback(warmOnIdle, {
            timeout: 3500,
          })
        : browserWindow.setTimeout(warmOnIdle, 1200);

    return () => {
      if (
        usesIdleCallback &&
        typeof browserWindow.cancelIdleCallback === 'function'
      ) {
        browserWindow.cancelIdleCallback(idleId);
      } else {
        browserWindow.clearTimeout(idleId);
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
    router.prefetch('/dashboard/chat');
    void warmChatRoute();
  };

  const handleMessagesClick = (
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
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
      router.push('/dashboard/chat');
    });

    messageFallbackTimerRef.current = window.setTimeout(() => {
      if (window.location.pathname !== '/dashboard/chat') {
        window.location.assign('/dashboard/chat');
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
      console.error('Logout failed:', error);
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
        <header className="h-24 bg-white mx-4 sm:mx-8 flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-7 rounded" />

          <div className="flex items-center gap-2">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-14 w-14 rounded-full sm:w-48" />
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-b-xl shadow-small sticky top-0 z-[70]">
      <header className="h-24 bg-white mx-4 sm:mx-8 flex items-center justify-between gap-3">
        {/* <SidebarTrigger /> */}
        <Link href={'/'} className="flex items-center gap-2.5">
          <Image
            src={swopWorldLogo}
            alt="swop"
            className="h-8 w-auto"
          />
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
                  className="relative flex h-14 items-center gap-2 rounded-full bg-[#F7F7F9] px-3 py-2 text-slate-950 transition-colors hover:bg-[#EFEFF3] data-[state=open]:bg-[#EFEFF3] disabled:opacity-70"
                  disabled={isLoggingOut}
                >
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-semibold text-slate-900 ring-1 ring-slate-200">
                    {profileImageSrc ? (
                      <Image
                        src={profileImageSrc}
                        alt={profileName}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    ) : (
                      profileInitial
                    )}
                  </div>
                  <span className="hidden max-w-36 truncate text-sm font-semibold sm:inline">
                    {profileName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={24}
                collisionPadding={16}
                className="z-[100] w-72 max-w-[calc(100vw-1rem)] rounded-2xl border border-slate-200/80 bg-white p-2 text-slate-950 shadow-[0_18px_44px_rgba(15,23,42,0.18)]"
              >
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
                    {profileImageSrc ? (
                      <Image
                        src={profileImageSrc}
                        alt={profileName}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      profileInitial
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {profileName}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      Account menu
                    </p>
                  </div>
                </div>
                <div className="my-2 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-950">
                      <FaUserPlus className="size-4" />
                      <span>Followers</span>
                    </div>
                    <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-blue-700">
                      {formatCount(connectionCounts.followers)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950">
                      <FaUserCheck className="size-4" />
                      <span>Following</span>
                    </div>
                    <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-emerald-700">
                      {formatCount(connectionCounts.following)}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator className="mx-1 my-2 bg-slate-200" />
                <DropdownMenuItem
                  onSelect={() => {
                    router.push('/account-security');
                  }}
                  className={profileMenuItemClass}
                >
                  <RiShieldKeyholeLine />
                  <p>Account Security</p>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    router.push('/edit-profile');
                  }}
                  className={profileMenuItemClass}
                >
                  <FaUserEdit />
                  <p>Edit Profile</p>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    router.push('/notifications');
                  }}
                  className={profileMenuItemClass}
                >
                  <HiBellAlert />
                  <p>Notifications</p>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    router.push('/subscription');
                  }}
                  className={profileMenuItemClass}
                >
                  <PiMedalFill />
                  <p>Swop Pro</p>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-1 my-2 bg-slate-200" />
                <DropdownMenuItem
                  asChild
                  className={profileMenuItemClass}
                >
                  <a
                    href={'https://www.swopme.co'}
                    target="_blank"
                    rel="noreferrer"
                    className={profileMenuExternalItemClass}
                  >
                    <TiInfoLarge />
                    <p>About</p>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className={profileMenuItemClass}
                >
                  <a
                    href={'https://www.swopme.co/support'}
                    target="_blank"
                    rel="noreferrer"
                    className={profileMenuExternalItemClass}
                  >
                    <RiCustomerService2Line />
                    <p>Support Center</p>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    router.push('/wallet-settings');
                  }}
                  className={profileMenuItemClass}
                >
                  <LuWallet />
                  <p>Wallet Settings</p>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-1 my-2 bg-slate-200" />
                <DropdownMenuItem
                  className={profileMenuItemClass}
                  onSelect={handleLogout}
                  disabled={isLoggingOut}
                >
                  <span className="flex w-full items-center gap-3">
                    <IoLogOutOutline />
                    Logout
                    {isLoggingOut && (
                      <Loader className="ml-auto size-4 animate-spin" />
                    )}
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
