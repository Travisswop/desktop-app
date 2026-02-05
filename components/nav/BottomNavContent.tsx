"use client";

import { useParams, usePathname } from "next/navigation";
import Image from "next/image";
import dashboard from "@/public/images/nav/dashboard.png";
import feed from "@/public/images/nav/feed.png";
import smartsite from "@/public/images/nav/smartsite.png";
import wallet from "@/public/images/nav/wallet.png";
import Link from "next/link";
import { BiSolidEdit } from "react-icons/bi";
import { VscChip } from "react-icons/vsc";
import { useMemo, useState } from "react";
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
import AddRedeemLink from "../smartsite/EditMicrosite/redeemLink/AddRedeemLink";
import AddBlog from "../smartsite/EditMicrosite/blog/AddBlog";
import AddVideo from "../smartsite/EditMicrosite/Video/AddVideo";
import AddAudio from "../smartsite/EditMicrosite/audio/AddAudio";
import AddMarketplace from "../smartsite/EditMicrosite/marketplace/AddMarketplace";
import AddFeed from "../smartsite/EditMicrosite/feed/AddFeed";
import { PrimaryButton } from "../ui/Button/PrimaryButton";
import { FiEdit } from "react-icons/fi";
import { AiOutlineFileAdd } from "react-icons/ai";

const BottomNavContent = () => {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openModal } = useModalStore();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isIconsModalOpen, setIsIconsModalOpen] = useState(false);
  const [isActivateChipModalOpen, setIsActivateChipModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const tab = useMemo(
    () => searchParams && searchParams.get("tab"),
    [searchParams],
  );

  // console.log("params", params);

  const isSmartsite = pathname?.startsWith("/smartsite/");

  // Get the dynamic ID from the route
  const pageId =
    (params?.editId as string | undefined) ||
    (params?.id as string | undefined);

  // Template data
  const templates = [
    {
      id: "small-icons",
      title: "Small Icons",
      description: "Miniature Icons For Header Area",
      image: smallIconImg,
    },
    {
      id: "infobar",
      title: "Infobar",
      description: "Display Bar for your links or CTAs",
      image: infobarImg,
    },
    {
      id: "embed",
      title: "Embed",
      description: "Embed Youtube videos, Spotify list and more",
      image: embedImg,
    },
    {
      id: "app-icon",
      title: "App Icon",
      description: "Displays your links like a App",
      image: appIconImg,
    },
    {
      id: "redeem-link",
      title: "Redeem Link",
      description: "Incentivize your following",
      image: redeemLinkImg,
    },
    {
      id: "blog",
      title: "Blog",
      description: "Write a blog and host on your page",
      image: blogImg,
    },
    {
      id: "photo-video",
      title: "Photo/Video",
      description: "Upload videos or photos to display",
      image: photoVideoImg,
    },
    {
      id: "mp3",
      title: "MP3",
      description: "Upload MP3 files and host your album",
      image: mp3Img,
    },
    {
      id: "marketplace",
      title: "Marketplace",
      description: "Sell Products, Subscriptions and more",
      image: marketplaceImg,
    },
    {
      id: "feed",
      title: "Feed",
      description: "Display your Swop Feed",
      image: feedImg,
    },
  ];

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;

    const query = searchQuery.toLowerCase();
    return templates.filter(
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
  ]; // Add your routes here

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
            <AddSmallIcon onCloseModal={handleCloseIconsModal} />
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
            <AddInfoBar onCloseModal={handleCloseIconsModal} />
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
            <AddEmbed onCloseModal={handleCloseIconsModal} />
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
            <AddAppIcon onCloseModal={handleCloseIconsModal} />
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
            <AddRedeemLink onCloseModal={handleCloseIconsModal} />
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
            <AddBlog onCloseModal={handleCloseIconsModal} />
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
            <AddVideo onCloseModal={handleCloseIconsModal} />
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
            <AddAudio onCloseModal={handleCloseIconsModal} />
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
            <AddMarketplace onCloseModal={handleCloseIconsModal} />
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
            <AddFeed onCloseModal={handleCloseIconsModal} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className={`${
          isSmartsite ? "w-[22rem]" : "w-[19rem]"
        } fixed bottom-2 left-1/2 transform -translate-x-1/2 `}
      >
        {(pathname === "/" || pathname?.startsWith("/feed")) && (
          <div className="flex text-sm font-medium w-[84%] bg-white p-3 rounded-xl shadow-large items-center justify-between mb-2 mx-auto">
            <Link
              href={"/?tab=feed"}
              className="flex flex-col gap-1 items-center"
            >
              <div
                className={`${
                  (tab === "feed" || !tab) && "bg-gray-100"
                } rounded-full px-3 py-1`}
              >
                <p>Feed</p>
              </div>
            </Link>
            <Link
              href={"/?tab=ledger"}
              className="flex flex-col gap-1 items-center"
            >
              <div
                className={`${
                  tab === "ledger" && "bg-gray-100"
                } rounded-full px-3 py-1`}
              >
                <p>Ledger</p>
              </div>
            </Link>
            <Link
              href={"/?tab=map"}
              className="flex flex-col gap-1 items-center"
            >
              <div
                className={`${
                  tab === "map" && "bg-gray-100"
                } rounded-full px-3 py-1`}
              >
                <p>Map</p>
              </div>
            </Link>
            <button
              onClick={openModal}
              className="flex flex-col gap-1 items-center"
            >
              <div
                className={`${
                  tab === "create-feed" && "bg-gray-100"
                } rounded-full px-3 py-1`}
              >
                <BiSolidEdit size={18} />
              </div>
            </button>
          </div>
        )}

        <div className="flex w-full bg-white p-3 rounded-2xl shadow-large items-center justify-between gap-2">
          <Link
            href={"/dashboard"}
            className="flex flex-col gap-1 items-center"
          >
            <div
              className={`border ${
                pathname?.startsWith("/dashboard")
                  ? "border-gray-300"
                  : "border-gray-50"
              } bg-gray-100 rounded-lg p-3`}
            >
              <Image src={dashboard} alt="dashboard" className="h-5 w-auto" />
            </div>
            <p className="text-sm">Dashboard</p>
          </Link>
          <Link href={"/"} className="flex flex-col gap-1 items-center">
            <div
              className={`border ${
                pathname === "/" ? " border-gray-300" : " border-gray-50"
              } bg-gray-100 rounded-lg p-3`}
            >
              <Image src={feed} alt="feed" className="h-5 w-auto" />
            </div>
            <p className="text-sm">Feed</p>
          </Link>
          <Link href={"/wallet"} className="flex flex-col gap-1 items-center">
            <div
              className={`border ${
                pathname?.startsWith("/wallet")
                  ? "border-gray-300"
                  : "border-gray-50"
              } bg-gray-100 rounded-lg p-3`}
            >
              <Image src={wallet} alt="wallet" className="h-5 w-auto" />
            </div>
            <p className="text-sm">Wallet</p>
          </Link>
          <Link
            href={"/smartsite"}
            className={`flex flex-col gap-1 items-center ${
              isSmartsite && "border-r pr-3"
            }`}
          >
            <div
              className={`border ${
                pathname?.startsWith("/smartsite")
                  ? "border-gray-300"
                  : "border-gray-50"
              } bg-gray-100 rounded-lg p-3`}
            >
              <Image src={smartsite} alt="smartsite" className="h-5 w-auto" />
            </div>
            <p className="text-sm">Build</p>
          </Link>
          {isSmartsite && (
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-col gap-1 items-center">
                  <div className={`border bg-black rounded-lg p-3`}>
                    {isMenuOpen ? (
                      <IoClose size={20} color="white" className="h-5 w-auto" />
                    ) : (
                      <IoAdd size={20} color="white" className="h-5 w-auto" />
                    )}
                  </div>
                  <p className="text-sm">Add</p>
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
        </div>
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
                      <Image
                        src={template.image}
                        alt={template.title}
                        className="w-full h-auto"
                      />
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
