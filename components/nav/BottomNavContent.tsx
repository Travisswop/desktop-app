"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BiSolidEdit } from "react-icons/bi";
import {
  ClipboardList,
  Bot,
  BarChart3,
  HandCoins,
  Layers,
  LayoutGrid,
  Menu,
  WalletCards,
} from "lucide-react";
import { VscChip } from "react-icons/vsc";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import { useModalStore } from "@/zustandStore/modalstore";
import { IoAdd, IoClose } from "react-icons/io5";
import { TbLockDollar } from "react-icons/tb";
import { MdPhoneIphone, MdQrCodeScanner } from "react-icons/md";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CustomModal from "../modal/CustomModal";
//import image
import appIconImg from "@/public/assets/smartsiteIconsPreview/app-icon.png";
import blogImg from "@/public/assets/smartsiteIconsPreview/blog.png";
import embedImg from "@/public/assets/smartsiteIconsPreview/embed.png";
import feedImg from "@/public/assets/smartsiteIconsPreview/feed.png";
import infobarImg from "@/public/assets/smartsiteIconsPreview/infobar.png";
import marketplaceImg from "@/public/assets/smartsiteIconsPreview/marketplace.png";
import mp3Img from "@/public/assets/smartsiteIconsPreview/mp3.png";
import photoVideoImg from "@/public/assets/smartsiteIconsPreview/photo-video.png";
import redeemLinkImg from "@/public/assets/smartsiteIconsPreview/redeem-link.png";
import smallIconImg from "@/public/assets/smartsiteIconsPreview/small-icon.png";
import AddSmallIcon from "../smartsite/EditMicrosite/AddSmallIcon";
import AddInfoBar from "../smartsite/EditMicrosite/infoBar/AddInfoBar";
import AddEmbed from "../smartsite/EditMicrosite/embed/AddEmbed";
import AddAppIcon from "../smartsite/EditMicrosite/appIcon/AddAppIcon";
import ManageBlink from "../smartsite/EditMicrosite/redeemLink/ManageBlink";
import AddBlog from "../smartsite/EditMicrosite/blog/AddBlog";
import ManageMarketplace from "../smartsite/EditMicrosite/marketplace/ManageMarketplace";
import AddFeed from "../smartsite/EditMicrosite/feed/AddFeed";
import AddTipJar from "../smartsite/EditMicrosite/widget/AddTipJar";
import AddLeadForm from "../smartsite/EditMicrosite/widget/AddLeadForm";
import AddAiChat from "../smartsite/EditMicrosite/widget/AddAiChat";
import AddTraderStats from "../smartsite/EditMicrosite/widget/AddTraderStats";
import AddChartPost from "../smartsite/EditMicrosite/widget/AddChartPost";
import AddFiles from "../smartsite/EditMicrosite/widget/AddFiles";
import AddMusic from "../smartsite/EditMicrosite/widget/AddMusic";
import AddMediaCarousel from "../smartsite/EditMicrosite/widget/AddMediaCarousel";
import { PrimaryButton } from "../ui/Button/PrimaryButton";
import { FiEdit } from "react-icons/fi";
import { AiOutlineFileAdd } from "react-icons/ai";
import { SMARTSITE_TEMPLATE_CATALOG } from "@/lib/smartsite-template-order";

const baseNavItemClass =
  "flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[14px] px-1 text-[10px] font-semibold leading-none tracking-[0] transition-colors duration-150 sm:max-w-16";

// Titles/descriptions come from the shared catalog in
// lib/smartsite-template-order.ts (single source of truth — see
// SMARTSITE_TEMPLATE_CATALOG). Only the visual assets live here.
const TEMPLATE_VISUALS: Record<
  string,
  { image?: any; icon?: ComponentType<{ className?: string }> }
> = {
  "small-icons": { image: smallIconImg },
  infobar: { image: infobarImg },
  embed: { image: embedImg },
  "app-icon": { image: appIconImg },
  "redeem-link": { image: redeemLinkImg },
  blog: { image: blogImg },
  "photo-video": { image: photoVideoImg },
  mp3: { image: mp3Img },
  marketplace: { image: marketplaceImg },
  feed: { image: feedImg },
  "tip-jar": { icon: HandCoins },
  "leads-form": { icon: ClipboardList },
  "ai-chat": { icon: Bot },
  "trader-stats": { icon: BarChart3 },
  "chart-post": { icon: BarChart3 },
  files: { icon: AiOutlineFileAdd },
};

const SMARTSITE_TEMPLATES = SMARTSITE_TEMPLATE_CATALOG.map((entry) => ({
  ...entry,
  ...(TEMPLATE_VISUALS[entry.id] || {}),
})) as Array<{
  id: string;
  title: string;
  description: string;
  image?: any;
  icon?: ComponentType<{ className?: string }>;
}>;

const FeedRouteLoadingOverlay = () => (
  <div
    aria-live="polite"
    aria-label="Loading feed"
    className="fixed inset-x-0 bottom-0 top-[97px] z-40 overflow-hidden bg-white px-6 pt-10"
  >
    <div className="mx-auto min-h-[520px] w-full max-w-[520px]" />
  </div>
);

const BottomNavContent = () => {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openModal } = useModalStore();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isIconsModalOpen, setIsIconsModalOpen] = useState(false);
  const [isActivateChipModalOpen, setIsActivateChipModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const navigationFallbackTimerRef = useRef<number | null>(null);

  const tab = useMemo(
    () => searchParams && searchParams.get("tab"),
    [searchParams],
  );

  // console.log("params", params);

  const isSmartsite = pathname?.startsWith("/smartsite/");
  const isFeedSurface = pathname === "/" || pathname?.startsWith("/feed");
  const showFeedCompose = isFeedSurface && tab !== "map";
  const isFeedTransitionPending = pendingRoute === "/feed" && !isFeedSurface;

  useEffect(() => {
    router.prefetch("/feed");
    router.prefetch("/wallet");
  }, [router]);

  useEffect(() => {
    setPendingRoute(null);
    if (navigationFallbackTimerRef.current) {
      window.clearTimeout(navigationFallbackTimerRef.current);
      navigationFallbackTimerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (navigationFallbackTimerRef.current) {
        window.clearTimeout(navigationFallbackTimerRef.current);
      }
    };
  }, []);

  const scheduleNavigationFallback = (href: string) => {
    if (navigationFallbackTimerRef.current) {
      window.clearTimeout(navigationFallbackTimerRef.current);
    }

    // Feed is a heavy client surface; fall back if a soft tab transition stalls.
    navigationFallbackTimerRef.current = window.setTimeout(() => {
      navigationFallbackTimerRef.current = null;
      const targetUrl = new URL(href, window.location.origin);
      const targetPath = `${targetUrl.pathname}${targetUrl.search}`;
      const currentPath = `${window.location.pathname}${window.location.search}`;

      if (currentPath !== targetPath) {
        window.location.assign(targetPath);
      }
    }, 1800);
  };

  const warmFeedNavIntent = () => {
    router.prefetch("/feed");
    if (!isFeedSurface && pendingRoute !== "/feed") {
      setPendingRoute("/feed");
    }
  };

  const handlePrimaryNavClick =
    (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
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

      router.prefetch(href);

      if (href === "/feed" && !isFeedSurface) {
        setPendingRoute("/feed");
      }

      if (isFeedSurface || href === "/feed") {
        scheduleNavigationFallback(href);
      }
    };

  // Get the dynamic ID from the route
  const pageId =
    (params?.editId as string | undefined) ||
    (params?.id as string | undefined);

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return SMARTSITE_TEMPLATES;

    const query = searchQuery.toLowerCase();
    return SMARTSITE_TEMPLATES.filter(
      (template) =>
        template.title.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  // Define routes where BottomNav should be hidden
  const hideOnRoutes = [
    "/smartsite/edit/",
    "/smartsite/create-smartsite",
    "/smartsite/token-gated/",
    "/dashboard/chat",
    "/edit-profile",
    "/subscription",
    "/notifications",
    "/feed/",
    // "/smartsite/profile/",
  ]; // Add routes here which we want to hide the bottom nav on

  // Hide bottom nav on specific routes
  if (hideOnRoutes.some((route) => pathname?.startsWith(route))) {
    return null;
  }

  const handleIconslistOpen = () => {
    setIsIconsModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleCloseIconsModal = () => {
    setIsIconsModalOpen(false);
    setSearchQuery("");
    setSelectedTemplate(null);
  };

  // Every template create flow must land back on the Smartsite canvas after
  // a successful save. Older template forms use `handleRemoveIcon` while
  // newer forms use `onCloseModal`; keep one completion handler and pass it
  // under the callback name each form expects.
  const handleTemplateSaved = () => {
    setSelectedTemplate(null);
    setSearchQuery("");
    setIsIconsModalOpen(false);
    router.refresh();
  };

  const handleOpenActiveChip = () => {
    setIsActivateChipModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleCloseActivateChipModal = () => {
    setIsActivateChipModalOpen(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
  };

  // Render template content based on selection
  const renderTemplateContent = () => {
    switch (selectedTemplate) {
      case "small-icons":
        return (
          <div className="p-6">
            <button
              onClick={handleBackToTemplates}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Templates
            </button>
            <AddSmallIcon onCloseModal={handleTemplateSaved} />
          </div>
        );

      case "infobar":
        return (
          <div className="p-6">
            <button
              onClick={handleBackToTemplates}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Templates
            </button>
            <AddInfoBar onCloseModal={handleTemplateSaved} />
          </div>
        );

      case "embed":
        return (
          <div className="p-6">
            <button
              onClick={handleBackToTemplates}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Templates
            </button>
            <AddEmbed handleRemoveIcon={handleTemplateSaved} />
          </div>
        );

      case "app-icon":
        return (
          <div className="p-6">
            <button
              onClick={handleBackToTemplates}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Templates
            </button>
            <AddAppIcon onCloseModal={handleTemplateSaved} />
          </div>
        );

      case "redeem-link":
        return (
          <div className="p-6">
            <button
              onClick={handleBackToTemplates}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Templates
            </button>
            <ManageBlink onCloseModal={handleTemplateSaved} />
          </div>
        );

      case "blog":
        return (
          <div className="p-6">
            <button
              onClick={handleBackToTemplates}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Templates
            </button>
            <AddBlog onCloseModal={handleTemplateSaved} />
          </div>
        );

      case "photo-video":
        return (
          <div className="p-6">
            <button
              onClick={handleBackToTemplates}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Templates
            </button>
            <AddMediaCarousel onCloseModal={handleTemplateSaved} />
          </div>
        );

      case "mp3":
        return (
          <div className="p-6">
            <button
              onClick={handleBackToTemplates}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Templates
            </button>
            <AddMusic onCloseModal={handleTemplateSaved} />
          </div>
        );

      case "marketplace":
        return (
          <div className="p-6">
            <button
              onClick={handleBackToTemplates}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Templates
            </button>
            <ManageMarketplace onCloseModal={handleTemplateSaved} />
          </div>
        );

      case "feed":
        return (
          <div className="p-6">
            <button
              onClick={handleBackToTemplates}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Templates
            </button>
            <AddFeed onCloseModal={handleTemplateSaved} />
          </div>
        );

      case "tip-jar":
        return (
          <div className="p-6">
            <button
              onClick={handleBackToTemplates}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Templates
            </button>
            <AddTipJar onCloseModal={handleTemplateSaved} />
          </div>
        );

      case "leads-form":
        return (
          <div className="p-6">
            <button
              onClick={handleBackToTemplates}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Templates
            </button>
            <AddLeadForm onCloseModal={handleTemplateSaved} />
          </div>
        );
      case "ai-chat":
        return <div className="p-6"><button onClick={handleBackToTemplates} className="mb-4 text-sm font-semibold text-gray-500">← Back to Templates</button><AddAiChat onCloseModal={handleTemplateSaved} /></div>;
      case "trader-stats":
        return <div className="p-6"><button onClick={handleBackToTemplates} className="mb-4 text-sm font-semibold text-gray-500">← Back to Templates</button><AddTraderStats onCloseModal={handleTemplateSaved} /></div>;
      case "chart-post":
        return <div className="p-6"><button onClick={handleBackToTemplates} className="mb-4 text-sm font-semibold text-gray-500">← Back to Templates</button><AddChartPost onCloseModal={handleTemplateSaved} /></div>;
      case "files":
        return <div className="p-6"><button onClick={handleBackToTemplates} className="mb-4 text-sm font-semibold text-gray-500">← Back to Templates</button><AddFiles onCloseModal={handleTemplateSaved} /></div>;
      default:
        return null;
    }
  };

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      Icon: LayoutGrid,
      isActive: Boolean(pathname?.startsWith("/dashboard")),
      prefetch: true,
      onPointerEnter: () => router.prefetch("/dashboard"),
      onFocus: () => router.prefetch("/dashboard"),
      onClick: handlePrimaryNavClick("/dashboard"),
    },
    {
      href: "/feed",
      label: "Feed",
      Icon: Menu,
      isActive: pathname === "/" || pathname === "/feed",
      prefetch: true,
      onPointerEnter: () => router.prefetch("/feed"),
      onPointerDown: warmFeedNavIntent,
      onFocus: () => router.prefetch("/feed"),
      onClick: handlePrimaryNavClick("/feed"),
    },
    {
      href: "/wallet",
      label: "Wallet",
      Icon: WalletCards,
      isActive: Boolean(pathname?.startsWith("/wallet")),
      prefetch: true,
      onPointerEnter: () => router.prefetch("/wallet"),
      onFocus: () => router.prefetch("/wallet"),
      onClick: handlePrimaryNavClick("/wallet"),
    },
    {
      href: "/smartsite",
      label: "Build",
      Icon: Layers,
      isActive: Boolean(pathname?.startsWith("/smartsite")),
      prefetch: true,
      onPointerEnter: () => router.prefetch("/smartsite"),
      onFocus: () => router.prefetch("/smartsite"),
      onClick: handlePrimaryNavClick("/smartsite"),
    },
  ];

  return (
    <>
      {isFeedTransitionPending ? <FeedRouteLoadingOverlay /> : null}
      <div
        className={`fixed bottom-5 left-1/2 z-50 w-[calc(100vw_-_32px)] -translate-x-1/2 ${
          isSmartsite || showFeedCompose ? "max-w-[340px]" : "max-w-[272px]"
        }`}
      >
        <nav
          aria-label="Primary"
          className="flex h-14 w-full items-center justify-between gap-0 rounded-[22px] border border-black/[0.03] bg-white px-1.5 py-1.5 shadow-[0_10px_22px_rgba(15,23,42,0.12),0_2px_6px_rgba(15,23,42,0.05)]"
        >
          {navItems.map(({ href, label, Icon, isActive, ...linkProps }) => (
            <Fragment key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`${baseNavItemClass} ${
                  isActive
                    ? "bg-[#f3f3f2] text-[#171717]"
                    : "text-[#73747b] hover:bg-[#f8f8f7]"
                }`}
                {...linkProps}
              >
                <Icon
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0"
                  strokeWidth={isActive ? 2.4 : 2.2}
                />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            </Fragment>
          ))}
          {showFeedCompose ? (
            <button
              type="button"
              aria-label="Compose feed post"
              onClick={openModal}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-black text-white transition-colors hover:bg-gray-900"
            >
              <BiSolidEdit size={17} />
            </button>
          ) : null}
          {isSmartsite && (
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`${baseNavItemClass} bg-black text-white hover:bg-gray-900`}
                >
                  <div className="flex h-4 w-4 items-center justify-center">
                    {isMenuOpen ? (
                      <IoClose size={16} color="white" />
                    ) : (
                      <IoAdd size={16} color="white" />
                    )}
                  </div>
                  <span className="whitespace-nowrap">Add</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="bg-white rounded-2xl p-2 w-56 shadow-xl border-none mb-1"
                side="top"
                align="start"
                sideOffset={8}
              >
                <DropdownMenuItem asChild className="cursor-pointer p-0">
                  <Link
                    href={`/smartsite/edit/${pageId}`}
                    className="flex items-center gap-3 py-1.5 px-3 rounded-xl w-full"
                  >
                    <div className="flex-1 text-start">
                      <p className="font-semibold text-base">Edit Page</p>
                      <p className="text-xs text-gray-500">
                        Change Backgrounds
                      </p>
                    </div>
                    <FiEdit className="min-w-5 min-h-5" />
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer p-0">
                  <button
                    onClick={handleIconslistOpen}
                    className="flex items-center gap-3 py-1.5 px-3 rounded-xl w-full"
                  >
                    <div className="flex-1 text-start">
                      <p className="font-semibold text-base">Add Template</p>
                      <p className="text-xs text-gray-500">
                        Design Your Smartsite
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <AiOutlineFileAdd className="min-w-[22px] min-h-[22px]" />
                    </div>
                  </button>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer p-0">
                  <Link
                    href={`/smartsite/qr-code/${pageId}`}
                    className="flex items-center gap-3 py-1.5 px-3 rounded-xl w-full"
                  >
                    <div className="flex-1 text-start">
                      <p className="font-semibold text-base">Edit QR</p>
                      <p className="text-xs text-gray-500">Customize QR</p>
                    </div>
                    <div className="flex-shrink-0">
                      <MdQrCodeScanner className="min-w-[22px] min-h-[22px]" />
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer p-0">
                  <button
                    onClick={handleOpenActiveChip}
                    className="flex items-center gap-3 py-1.5 px-3 rounded-xl w-full"
                  >
                    <div className="flex-1 text-start">
                      <p className="font-semibold text-base">Activate</p>
                      <p className="text-xs text-gray-500">Program Your Chip</p>
                    </div>
                    <div className="flex-shrink-0">
                      <VscChip className="min-w-[22px] min-h-[22px]" />
                    </div>
                  </button>
                </DropdownMenuItem>

                <DropdownMenuItem asChild className="cursor-pointer p-0">
                  <Link
                    href={`/smartsite/token-gated/${pageId}`}
                    className="flex items-center gap-3 py-1.5 px-3 rounded-xl w-full"
                  >
                    <div className="flex-1 text-start">
                      <p className="font-semibold text-base">Token Gate</p>
                      <p className="text-xs text-gray-500">
                        Monetize Your Content
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <TbLockDollar className="min-w-[22px] min-h-[22px]" />
                    </div>
                  </Link>
                </DropdownMenuItem>

                {/* <DropdownMenuItem asChild className="cursor-pointer p-0">
                  <Link
                    href="/smartsite/toggle"
                    className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded-lg transition-colors w-full"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <RiExchangeBoxLine />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Toggle</p>
                      <p className="text-xs text-gray-500">
                        Switch Smart Sites
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>

      {/* Icons Modal */}
      <CustomModal
        isOpen={isIconsModalOpen}
        onCloseModal={handleCloseIconsModal}
        removeCloseButton={true}
        width={selectedTemplate ? "max-w-2xl" : "max-w-4xl"}
      >
        {selectedTemplate ? (
          renderTemplateContent()
        ) : (
          <div className="p-6">
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <p className="text-xl font-semibold">Templates</p>
              <div className="mb-6 relative min-w-80 max-w-96">
                <input
                  type="text"
                  placeholder="Search Templates"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className="flex items-start gap-4 p-5 bg-white rounded-2xl hover:bg-gray-50 transition-colors text-left shadow-medium"
                  >
                    <div
                      className={`w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        template.title === "Redeem Link" ? "p-1" : "p-3"
                      }`}
                    >
                      {template.icon ? (
                        <template.icon className="w-full h-auto text-gray-700" />
                      ) : (
                        <Image
                          src={template.image}
                          alt={template.title}
                          className="w-full h-auto"
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {template.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {template.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No templates found</p>
                <p className="text-gray-400 text-sm mt-2">
                  Try searching with different keywords
                </p>
              </div>
            )}
          </div>
        )}
      </CustomModal>

      {/* Activate Chip Modal */}
      <CustomModal
        isOpen={isActivateChipModalOpen}
        onCloseModal={handleCloseActivateChipModal}
        removeCloseButton={false}
        width="max-w-md"
      >
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MdPhoneIphone size={40} className="text-gray-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Mobile Only Feature
          </h2>

          <p className="text-gray-600 mb-6">
            Chip activation is only available on mobile devices. Please open
            this page on your smartphone to program your chip.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Scan the QR code on your smartsite from your
              mobile device to access this feature.
            </p>
          </div>

          <PrimaryButton
            onClick={handleCloseActivateChipModal}
            className="w-full py-3 rounded-xl font-medium"
          >
            Got It
          </PrimaryButton>
        </div>
      </CustomModal>
    </>
  );
};
export default BottomNavContent;
