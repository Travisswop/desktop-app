"use client";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import swop from "@/public/images/live-preview/swop.svg";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";
import useUpdateSmartIcon from "@/zustandStore/UpdateSmartIcon";
import useSmallIconToggleStore from "@/zustandStore/SmallIconModalToggle";
// import useSideBarToggleStore from "@/zustandStore/SideBarToggleStore";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Modal,
  ModalBody,
  ModalContent,
  useDisclosure,
} from "@nextui-org/react";
// import { handleSmartSiteUpdate } from "@/actions/update";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AnimateButton from "../ui/Button/AnimateButton";
import { fontMap } from "@/lib/fonts";
import { MdDelete, MdDeleteForever } from "react-icons/md";
import { handleDeleteMarketPlace } from "@/actions/handleMarketPlace";
import { handleV5SmartSiteUpdate } from "@/actions/update";
import { RiDeleteBinFill } from "react-icons/ri";
import LivePreviewTimeline from "../feed/LivePreviewTimeline";
import UpdateModalComponents from "./EditMicrosite/UpdateModalComponents";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useUser } from "@/lib/UserContext";
import distributeSmallIcons from "../util/distributeSmallIcons";
import Bio from "../publicProfile/bio";
import Header from "../publicProfile/header";
import SocialSmall from "../publicProfile/socialSmall";
import SocialLarge from "../publicProfile/socialLarge";
import InfoBar from "../publicProfile/infoBar";
import Contact from "../publicProfile/contact";
import Ens from "../publicProfile/ens";
import PaymentBar from "../publicProfile/paymentBar";
import Message from "../publicProfile/message";
import Redeem from "../publicProfile/redeem";
import MP3 from "../publicProfile/mp3";
import Referral from "../publicProfile/referral";
import MediaList from "../publicProfile/MediaList";
import getMediaType from "@/utils/getMediaType";
import EmbedVideo from "../publicProfile/embedvideo";
import EmbeddedFeed from "@/app/(public-profile)/sp/[username]/_EmbeddedFeed";
import {
  getSmartsiteMarketplaceImage,
  getSmartsiteMarketplaceName,
  getSmartsiteMarketplacePrice,
  groupSmartsiteMarketplaceItems,
  normalizeSmartsiteMarketplaceItems,
} from "@/lib/smartsite-marketplace-display";
import {
  SMARTSITE_MAX_TABS,
  SMARTSITE_TAB_NAME_MAX_LENGTH,
  SMARTSITE_TEMPLATE_SECTION_META,
  SmartsiteTab,
  areSmartsiteTabsEqual,
  buildDefaultSmartsiteTabs,
  flattenSmartsiteTabs,
  generateSmartsiteTabId,
  getDefaultSmartsiteTemplateBlockOrder,
  getSmartsiteTemplateItemKey,
  getSmartsiteTemplateSectionKeyFromOrderKey,
  moveKeyBetweenSmartsiteTabs,
  normalizeSmartsiteTabs,
  normalizeSmartsiteTemplateBlockOrder,
  SmartsiteTemplateSectionKey,
} from "@/lib/smartsite-template-order";
import {
  handleV5SmartSiteTabDelete,
  handleV5SmartSiteTabRestore,
} from "@/actions/update";
import {
  FolderInput,
  GripVertical,
  Loader2,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import TipJarCard from "../publicProfile/widgets/TipJarCard";
import PredictionMarketCard from "../publicProfile/widgets/PredictionMarketCard";
import VaultCard from "../publicProfile/widgets/VaultCard";
import LeadFormCard from "../publicProfile/widgets/LeadFormCard";

type SaveState = "idle" | "saving" | "saved" | "error";

type PendingDragMove = {
  sourceKey: string;
  pointerY: number;
};

type TemplateDragTargetRow = {
  key: string;
  top: number;
  bottom: number;
  centerY: number;
  height: number;
};

const smartsitePreviewItemKey = (
  section: string,
  item: any,
  index: number,
  extra?: string,
) =>
  [
    section,
    extra,
    item?._id,
    item?.id,
    item?.marketplaceEntryId,
    item?.marketplaceProductId,
    item?.name,
    item?.title,
    index,
  ]
    .filter(Boolean)
    .join("-");

const COMPACT_SORTABLE_ROW_SECTIONS = new Set<SmartsiteTemplateSectionKey>([
  "message",
  "redeemLink",
  "contact",
  "ens",
  "infoBar",
  "product",
  "audio",
]);

const areTemplateOrdersEqual = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((orderKey, index) => orderKey === right[index]);

const COMPACT_ROW_DRAG_CLICK_SUPPRESSION_MS = 180;

const getTemplateOrderSectionKey = (orderKey: string) =>
  getSmartsiteTemplateSectionKeyFromOrderKey(orderKey);

const isCompactTemplateOrderKey = (orderKey: string) => {
  const sectionKey = getTemplateOrderSectionKey(orderKey);
  return Boolean(sectionKey && COMPACT_SORTABLE_ROW_SECTIONS.has(sectionKey));
};

const getTemplateDragActivationInset = (
  sourceKey: string,
  targetKey: string,
  targetHeight: number,
) => {
  const sourceSectionKey = getTemplateOrderSectionKey(sourceKey);
  const targetSectionKey = getTemplateOrderSectionKey(targetKey);
  const isInfoBarDrag =
    sourceSectionKey === "infoBar" || targetSectionKey === "infoBar";

  if (isInfoBarDrag) {
    return Math.min(18, Math.max(8, targetHeight * 0.24));
  }

  if (isCompactTemplateOrderKey(sourceKey) || isCompactTemplateOrderKey(targetKey)) {
    return Math.min(20, Math.max(10, targetHeight * 0.35));
  }

  return targetHeight / 2;
};

const SortablePreviewSection = ({
  orderKey,
  sectionKey,
  order,
  isDragging,
  isDragOver,
  isSaving,
  hidden = false,
  className = "w-full",
  moveTargets,
  onMoveToTab,
  onDragStart,
  onDragMove,
  onDragEnd,
  children,
}: {
  orderKey: string;
  sectionKey: SmartsiteTemplateSectionKey;
  order: number;
  isDragging: boolean;
  isDragOver: boolean;
  isSaving: boolean;
  hidden?: boolean;
  className?: string;
  /** Other tabs this block can move to (tabbed sites with >1 tab, edit mode). */
  moveTargets?: Array<{ id: string; name: string }>;
  onMoveToTab?: (orderKey: string, targetTabId: string) => void;
  onDragStart: (orderKey: string) => void;
  onDragMove: (orderKey: string, pointerY: number) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}) => {
  const dragControls = useDragControls();
  const suppressClickAfterDragRef = useRef(false);
  const resolvedSectionKey =
    getSmartsiteTemplateSectionKeyFromOrderKey(orderKey) || sectionKey;
  const label = SMARTSITE_TEMPLATE_SECTION_META[resolvedSectionKey].label;
  const isCompactRow = COMPACT_SORTABLE_ROW_SECTIONS.has(resolvedSectionKey);
  const isFeedRow = resolvedSectionKey === "feed";

  return (
    <motion.div
      layout="position"
      data-smartsite-order-key={orderKey}
      drag="y"
      dragControls={dragControls}
      dragElastic={0.035}
      dragListener={isCompactRow}
      dragMomentum={false}
      dragSnapToOrigin
      onClickCapture={(event) => {
        if (!suppressClickAfterDragRef.current) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
      }}
      onDragStart={() => {
        suppressClickAfterDragRef.current = true;
        onDragStart(orderKey);
      }}
      onDrag={(_, info) => onDragMove(orderKey, info.point.y)}
      onDragEnd={() => {
        onDragEnd();
        window.setTimeout(() => {
          suppressClickAfterDragRef.current = false;
        }, COMPACT_ROW_DRAG_CLICK_SUPPRESSION_MS);
      }}
      whileDrag={{ scale: isFeedRow ? 1.005 : 1.015, zIndex: 50 }}
      transition={{ layout: { duration: 0.18, ease: "easeOut" } }}
      className={`group/preview-sort grid w-[calc(100%+3rem)] -ml-12 grid-cols-[2.5rem_minmax(0,1fr)] gap-2 transition ${
        isDragging ? "relative z-50 cursor-grabbing" : ""
      } ${
        isCompactRow ? "touch-none select-none" : ""
      } ${
        isCompactRow && !isDragging ? "cursor-grab active:cursor-grabbing" : ""
      } ${
        isDragOver && !isDragging ? "rounded-xl ring-2 ring-black/10" : ""
      }`}
      style={{
        order,
        contain: isFeedRow ? "layout paint" : undefined,
        // Tabs: blocks on inactive tabs stay mounted but hidden so drag
        // targeting and feed state survive tab switches.
        display: hidden ? "none" : undefined,
      }}
    >
      <div
        className={`relative z-20 flex flex-col items-center gap-1.5 ${
          isCompactRow ? "h-full justify-center" : "min-h-[72px] pt-4"
        }`}
      >
        <button
          type="button"
          aria-label={`Drag ${label}`}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDragStart(orderKey);
            dragControls.start(event);
          }}
          className={`flex ${
            isCompactRow ? "h-12 w-10" : "h-10 w-8"
          } cursor-grab touch-none items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-[0_4px_14px_rgba(15,23,42,0.10)] transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:cursor-grabbing`}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GripVertical className="h-4 w-4" />
          )}
        </button>
        {/* move-to-tab affordance (tabbed sites with >1 tab, edit mode) */}
        {moveTargets && moveTargets.length > 0 && onMoveToTab && (
          <Dropdown className="w-max rounded-lg" placement="bottom-start">
            <DropdownTrigger>
              <button
                type="button"
                aria-label={`Move ${label} to another tab`}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                className={`flex ${
                  isCompactRow ? "h-7 w-10" : "h-7 w-8"
                } items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 shadow-[0_4px_14px_rgba(15,23,42,0.10)] transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950`}
              >
                <FolderInput className="h-3.5 w-3.5" />
              </button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label={`Move ${label} to tab`}
              disabledKeys={["move-title"]}
              className="p-2"
            >
              <DropdownItem
                key="move-title"
                className="hover:!bg-white opacity-100 cursor-text disabled dropDownTitle"
              >
                <p className="text-xs font-semibold text-gray-400">Move to</p>
              </DropdownItem>
              {
                moveTargets.map((target) => (
                  <DropdownItem
                    key={target.id}
                    onClick={() => onMoveToTab(orderKey, target.id)}
                    className="border-b rounded-none last:border-b-0 hover:rounded-md"
                  >
                    <span className="text-sm font-semibold">{target.name}</span>
                  </DropdownItem>
                )) as any
              }
            </DropdownMenu>
          </Dropdown>
        )}
      </div>
      <div className={`${className} ${isCompactRow ? "[&_.my-2]:my-0" : ""}`}>
        {isFeedRow && isDragging ? (
          <div className="flex h-28 w-full items-center rounded-lg bg-white p-4 shadow-small">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500">
              <GripVertical className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className="text-base font-semibold text-gray-950">Feed</p>
              <p className="text-sm font-medium text-gray-400">
                Latest posts
              </p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  );
};

const SmartsiteIconLivePreview = ({
  data,
  token,
  onTemplateOrderChange,
}: {
  isEditDetailsLivePreview?: boolean;
  data?: any;
  token?: string;
  onTemplateOrderChange?: (order: string[]) => void;
}) => {
  const setSmartSiteData = useUpdateSmartIcon((state: any) => state.setState);

  const { isOn, setOff, setOn }: any = useSmallIconToggleStore();
  const iconData: any = useUpdateSmartIcon();

  const [socialRows, setSocialRows] = useState<any>([]);
  const normalizedTemplateOrder = useMemo(
    () => normalizeSmartsiteTemplateBlockOrder(data, data?.templateOrder),
    [data],
  );
  const [templateOrder, setTemplateOrder] = useState<string[]>(
    () => normalizedTemplateOrder,
  );
  const [draggingOrderKey, setDraggingOrderKey] = useState<string | null>(null);
  const [dragOverOrderKey, setDragOverOrderKey] = useState<string | null>(null);
  const [orderSaveState, setOrderSaveState] = useState<SaveState>("idle");
  const templateOrderRef = useRef<string[]>([]);
  const dragStartOrderRef = useRef<string[] | null>(null);
  const pendingDragMoveRef = useRef<PendingDragMove | null>(null);
  const dragMoveFrameRef = useRef<number | null>(null);
  const lastDragOverOrderKeyRef = useRef<string | null>(null);

  // ── Named tabs ──
  const normalizedTabsFromData = useMemo(
    () => normalizeSmartsiteTabs(data),
    [data],
  );
  const [tabs, setTabs] = useState<SmartsiteTab[]>(normalizedTabsFromData);
  const tabsRef = useRef<SmartsiteTab[]>(normalizedTabsFromData);
  const [activeTabId, setActiveTabId] = useState<string | null>(
    normalizedTabsFromData[0]?.id ?? null,
  );
  const activeTabIdRef = useRef<string | null>(activeTabId);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [tabDeleteTarget, setTabDeleteTarget] = useState<SmartsiteTab | null>(
    null,
  );
  const [isTabDeleting, setIsTabDeleting] = useState(false);
  const knownContentKeysRef = useRef<Set<string> | null>(null);

  const isTabbed = tabs.length > 0;
  const isTabEditable = Boolean(token);
  const activeTab = isTabbed
    ? tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]
    : null;
  const activeTabKeySet = useMemo(
    () => (activeTab ? new Set(activeTab.order) : null),
    [activeTab],
  );

  useEffect(() => {
    activeTabIdRef.current = activeTab?.id ?? null;
  }, [activeTab]);

  // console.log("state iconData", iconData);
  // const [isPrimaryMicrosite, setIsPrimaryMicrosite] = useState<boolean>(false);
  // const [isLeadCapture, setIsLeadCapture] = useState<boolean>(false);

  // const [isPublishedLoading, setIsPublishedLoading] = useState(false);

  // console.log("data form live", data.info.socialLarge);
  const { formData, setFormData } = useSmartsiteFormStore();
  const setAllFormData = useSmartsiteFormStore((s) => s.setAllFormData);
  const router = useRouter();

  // console.log("form data from live preview data", data.info.socialLarge);

  const setSmartSiteApiData = useSmartSiteApiDataStore(
    (state: any) => state.setSmartSiteData,
  );

  const { user, accessToken } = useUser();

  useEffect(() => {
    if (data) {
      setSmartSiteApiData(data);
    }
  }, [data]);

  const handleTriggerUpdate = (data: {
    data: any;
    categoryForTrigger: string;
  }) => {
    setSmartSiteData(data);
    setOn(true);
  };

  // useEffect(() => {
  //   setFormData("name", data.name);
  //   setFormData("bio", data.bio);
  //   setFormData("profileImg", data.profilePic);
  //   setFormData("backgroundImg", data.backgroundImg);
  //   setFormData("theme", data.theme);
  //   setFormData("backgroundColor", data.backgroundColor);
  //   setFormData("fontColor", data.fontColor);
  //   setFormData("secondaryFontColor", data.secondaryFontColor);
  //   setFormData("fontType", data.fontFamily);
  //   setFormData("templateColor", data.themeColor);
  // }, [data]);
  useEffect(() => {
    if (!data) return;

    setAllFormData({
      name: data.name,
      bio: data.bio,
      profileImg: data.profilePic,
      backgroundImg: data.backgroundImg,
      theme: data.theme,
      backgroundColor: data.backgroundColor,
      fontColor: data.fontColor,
      secondaryFontColor: data.secondaryFontColor,
      fontType: data.fontFamily,
      templateColor: data.themeColor,
    });
  }, [data]);

  // const handleSmartSiteUpdateInfo = async (e: any) => {
  //   setIsPublishedLoading(true);
  //   e.preventDefault();

  //   const smartSiteInfo = {
  //     _id: data._id,
  //     primary: isPrimaryMicrosite,
  //     leadCapture: isLeadCapture,
  //   };

  //   try {
  //     const response = await handleSmartSiteUpdate(
  //       smartSiteInfo,
  //       accessToken || ""
  //     );

  //     if (response.state === "success") {
  //       router.push("/smartsite");
  //       toast.success("Smartsite published successfully");
  //     } else if (response.state === "fail") {
  //       toast.error(
  //         response.message || "At least one primary smartsite required"
  //       );
  //     }
  //   } catch (error: any) {
  //     toast.error("Something went wrong!");
  //     console.log("error", error);
  //   } finally {
  //     setIsPublishedLoading(false);
  //   }
  // };

  const showReadMoreForBlog = (e: any, item: any) => {
    e.stopPropagation();
    handleTriggerUpdate({
      data: item,
      categoryForTrigger: "showBlog",
    });
  };

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [marketPlaceDeleteInfo, setMarketPlaceDeleteInfo] = useState({
    id: "",
    micrositeId: "",
  });
  const [isMarketPlaceDeleteLoading, setIsMarketPlaceDeleteLoading] =
    useState(false);

  const handleMarketPlaceDelete = async (id: string, micrositeId: string) => {
    onOpen();
    setMarketPlaceDeleteInfo({
      id,
      micrositeId,
    });
  };

  const deleteMarketPlace = async () => {
    setIsMarketPlaceDeleteLoading(true);
    try {
      const payload = {
        _id: marketPlaceDeleteInfo?.id,
        micrositeId: marketPlaceDeleteInfo?.micrositeId,
      };

      console.log("payload", payload);

      const response = await handleDeleteMarketPlace(
        payload,
        accessToken || "",
      );

      console.log("response hola", response);
      console.log("accessToken", accessToken);

      toast.success("Market Place Deleted");
      router.refresh();
      setIsMarketPlaceDeleteLoading(false);
      onOpenChange();
    } catch (error) {
      toast.error("Something Went Wrong!");
      console.log(error);
      setIsMarketPlaceDeleteLoading(false);
    }
  };

  useEffect(() => {
    setSocialRows(distributeSmallIcons(data.info.socialTop));
  }, [data]);

  const marketplaceItems = normalizeSmartsiteMarketplaceItems(
    data.info.marketPlace,
  );
  const groupedMarketplaceItems = groupSmartsiteMarketplaceItems(
    marketplaceItems,
  );
  const getMarketplaceItemKey = (
    item: any,
    sectionTitle: string,
    index: number,
  ) =>
    [
      item.marketplaceEntryId,
      item.marketplaceProductId,
      item._id,
      sectionTitle,
      index,
    ]
      .filter(Boolean)
      .join("-");
  const previewName = formData.name || data.name;
  const previewBio = formData.bio || data.bio;
  const previewFontColor = formData.fontColor || data.fontColor || "black";
  const previewSecondaryFontColor =
    formData.secondaryFontColor || data.secondaryFontColor || "#D3D3D3";

  useEffect(() => {
    templateOrderRef.current = templateOrder;
  }, [templateOrder]);

  useEffect(() => {
    if (dragStartOrderRef.current) {
      return;
    }

    // Tabbed sites derive the flat order from the tabs (see tabs sync below)
    if (normalizedTabsFromData.length > 0) {
      return;
    }

    if (areTemplateOrdersEqual(templateOrderRef.current, normalizedTemplateOrder)) {
      return;
    }

    templateOrderRef.current = normalizedTemplateOrder;
    setTemplateOrder(normalizedTemplateOrder);
  }, [normalizedTemplateOrder, normalizedTabsFromData]);

  const applyTabsState = (nextTabs: SmartsiteTab[]) => {
    tabsRef.current = nextTabs;
    setTabs(nextTabs);
    const flatOrder = flattenSmartsiteTabs(nextTabs);
    templateOrderRef.current = flatOrder;
    setTemplateOrder(flatOrder);
    onTemplateOrderChange?.(flatOrder);
  };

  const persistTabs = async (
    nextTabs: SmartsiteTab[],
    previousTabs: SmartsiteTab[],
  ) => {
    applyTabsState(nextTabs);

    if (!token || !data?._id) {
      return true;
    }

    setOrderSaveState("saving");

    try {
      const result = await handleV5SmartSiteUpdate(
        {
          _id: data._id,
          tabs: nextTabs,
          templateOrder: flattenSmartsiteTabs(nextTabs),
        },
        token,
      );

      if (!result || result.state !== "success") {
        throw new Error("Tabs update failed");
      }

      setOrderSaveState("saved");
      window.setTimeout(() => setOrderSaveState("idle"), 1200);
      return true;
    } catch (error) {
      console.error(error);
      applyTabsState(previousTabs);
      setOrderSaveState("error");
      toast.error("Couldn't save tabs");
      return false;
    }
  };

  // Sync tabs from fetched data (skipped mid-drag). When new content appears
  // (a template was just added via the Add flows), reassign it from the
  // normalizer's default (first tab) to the tab the user is actually on —
  // one central hook instead of patching every Add* component.
  useEffect(() => {
    if (dragStartOrderRef.current) {
      return;
    }

    const contentKeys = new Set(getDefaultSmartsiteTemplateBlockOrder(data));
    const previousKnown = knownContentKeysRef.current;
    knownContentKeysRef.current = contentKeys;

    let nextTabs = normalizedTabsFromData;

    if (previousKnown && normalizedTabsFromData.length > 0) {
      const newKeys = Array.from(contentKeys).filter(
        (key) => !previousKnown.has(key),
      );
      const targetTabId = activeTabIdRef.current;
      const targetExists = normalizedTabsFromData.some(
        (tab) => tab.id === targetTabId,
      );

      if (
        newKeys.length > 0 &&
        targetTabId &&
        targetExists &&
        normalizedTabsFromData[0]?.id !== targetTabId
      ) {
        nextTabs = normalizedTabsFromData.map((tab) => {
          if (tab.id === targetTabId) {
            const missing = newKeys.filter((key) => !tab.order.includes(key));
            return { ...tab, order: [...tab.order, ...missing] };
          }
          return {
            ...tab,
            order: tab.order.filter((key) => !newKeys.includes(key)),
          };
        });
        void persistTabs(nextTabs, normalizedTabsFromData);
        return;
      }
    }

    if (!areSmartsiteTabsEqual(tabsRef.current, nextTabs)) {
      applyTabsState(nextTabs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedTabsFromData, data]);

  // Keep the active tab id pointing at a real tab
  useEffect(() => {
    if (!isTabbed) {
      if (activeTabId !== null) setActiveTabId(null);
      return;
    }
    if (!tabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, isTabbed]);

  useEffect(
    () => () => {
      if (dragMoveFrameRef.current !== null) {
        window.cancelAnimationFrame(dragMoveFrameRef.current);
      }
    },
    [],
  );

  const getTemplateBlockOrder = (orderKey: string) =>
    templateOrder.indexOf(orderKey) + 10;

  const moveTemplateOrderKey = (
    order: string[],
    sourceKey: string,
    targetKey: string,
  ) => {
    if (sourceKey === targetKey) {
      return order;
    }

    const sourceIndex = order.indexOf(sourceKey);
    const targetIndex = order.indexOf(targetKey);

    if (sourceIndex === -1 || targetIndex === -1) {
      return order;
    }

    const nextOrder = [...order];
    const [movedTemplate] = nextOrder.splice(sourceIndex, 1);
    nextOrder.splice(targetIndex, 0, movedTemplate);

    return nextOrder;
  };

  const saveTemplateOrder = async (
    nextOrder: string[],
    previousOrder: string[],
  ) => {
    // Tabbed: a drag reorders within the active tab — rebuild that tab's
    // order from the flat result and save tabs + dual-written templateOrder.
    if (isTabbed && activeTab) {
      const activeKeys = new Set(activeTab.order);
      const nextActiveOrder = nextOrder.filter((key) => activeKeys.has(key));
      const previousTabs = tabsRef.current;
      const nextTabs = previousTabs.map((tab) =>
        tab.id === activeTab.id ? { ...tab, order: nextActiveOrder } : tab,
      );
      await persistTabs(nextTabs, previousTabs);
      return;
    }

    templateOrderRef.current = nextOrder;
    setTemplateOrder(nextOrder);
    onTemplateOrderChange?.(nextOrder);

    if (!token || !data?._id) {
      return;
    }

    setOrderSaveState("saving");

    try {
      const result = await handleV5SmartSiteUpdate(
        {
          _id: data._id,
          templateOrder: nextOrder,
        },
        token,
      );

      if (!result || result.state !== "success") {
        throw new Error("Template order update failed");
      }

      setOrderSaveState("saved");
      window.setTimeout(() => setOrderSaveState("idle"), 1200);
    } catch (error) {
      console.error(error);
      templateOrderRef.current = previousOrder;
      setTemplateOrder(previousOrder);
      onTemplateOrderChange?.(previousOrder);
      setOrderSaveState("error");
    }
  };

  // ── Tab operations ──
  const handleAddTab = () => {
    if (!isTabEditable || tabs.length >= SMARTSITE_MAX_TABS) {
      return;
    }

    const previousTabs = tabsRef.current;
    let nextTabs: SmartsiteTab[];
    let newTabId: string;

    if (!isTabbed) {
      // First tab inherits every existing template so nothing moves
      nextTabs = buildDefaultSmartsiteTabs(data, "Home");
      newTabId = nextTabs[0].id;
    } else {
      newTabId = generateSmartsiteTabId();
      nextTabs = [
        ...previousTabs,
        { id: newTabId, name: `Tab ${previousTabs.length + 1}`, order: [] },
      ];
    }

    setActiveTabId(newTabId);
    setRenamingTabId(newTabId);
    void persistTabs(nextTabs, previousTabs);
  };

  const handleTabNameInput = (tabId: string, name: string) => {
    const nextTabs = tabsRef.current.map((tab) =>
      tab.id === tabId
        ? { ...tab, name: name.slice(0, SMARTSITE_TAB_NAME_MAX_LENGTH) }
        : tab,
    );
    tabsRef.current = nextTabs;
    setTabs(nextTabs);
  };

  const commitTabRename = (tabId: string) => {
    setRenamingTabId(null);
    const previousTabs = normalizeSmartsiteTabs(data);
    const nextTabs = tabsRef.current.map((tab, index) =>
      tab.id === tabId
        ? { ...tab, name: tab.name.trim() || `Tab ${index + 1}` }
        : tab,
    );
    void persistTabs(nextTabs, previousTabs);
  };

  // Move a block from the active tab to the end of another tab
  const handleMoveToTab = (orderKey: string, targetTabId: string) => {
    const currentActiveTabId = activeTabIdRef.current;
    if (!currentActiveTabId) {
      return;
    }

    const previousTabs = tabsRef.current;
    const nextTabs = moveKeyBetweenSmartsiteTabs(
      previousTabs,
      orderKey,
      currentActiveTabId,
      targetTabId,
    );

    if (nextTabs === previousTabs) {
      return;
    }

    const targetName =
      previousTabs.find((tab) => tab.id === targetTabId)?.name || "tab";
    void persistTabs(nextTabs, previousTabs).then((saved) => {
      if (saved) {
        toast.success(`Moved to ${targetName}`);
      }
    });
  };

  // Toggle the active tab's token gate. Allowed even when the site has no
  // token gate configured (the flag is inert then) — but warn the user.
  const handleToggleTabGate = () => {
    const currentActiveTabId = activeTabIdRef.current;
    if (!currentActiveTabId || !isTabEditable) {
      return;
    }

    const previousTabs = tabsRef.current;
    const currentTab = previousTabs.find(
      (tab) => tab.id === currentActiveTabId,
    );
    if (!currentTab) {
      return;
    }

    const enabling = !currentTab.gated;
    if (enabling && !data?.gatedInfo?.isOn) {
      toast("Set up Token Gate first from the Add menu", { icon: "🔒" });
    }

    const nextTabs = previousTabs.map((tab) =>
      tab.id === currentActiveTabId ? { ...tab, gated: enabling } : tab,
    );
    void persistTabs(nextTabs, previousTabs);
  };

  const describeTabContent = (tab: SmartsiteTab) => {
    const counts = new Map<string, number>();
    tab.order.forEach((orderKey) => {
      const sectionKey = getSmartsiteTemplateSectionKeyFromOrderKey(orderKey);
      if (!sectionKey) return;
      const label = SMARTSITE_TEMPLATE_SECTION_META[sectionKey].label;
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) =>
      count > 1 ? `${count}× ${label}` : label,
    );
  };

  const restoreDeletedTab = async (trashId?: string) => {
    if (!token || !data?._id) {
      return;
    }

    try {
      const result = await handleV5SmartSiteTabRestore(
        data._id,
        trashId,
        token,
      );

      if (!result || result.state !== "success") {
        throw new Error("Tab restore failed");
      }

      toast.success("Tab restored");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Couldn't restore tab");
    }
  };

  const confirmDeleteTab = async () => {
    if (!tabDeleteTarget || !token || !data?._id) {
      return;
    }

    setIsTabDeleting(true);
    try {
      const result = await handleV5SmartSiteTabDelete(
        data._id,
        tabDeleteTarget.id,
        token,
      );

      if (!result || result.state !== "success") {
        throw new Error("Tab delete failed");
      }

      const previousTabs = tabsRef.current;
      const deletedIndex = previousTabs.findIndex(
        (tab) => tab.id === tabDeleteTarget.id,
      );
      const remaining = previousTabs.filter(
        (tab) => tab.id !== tabDeleteTarget.id,
      );
      const neighbor =
        remaining[Math.min(Math.max(deletedIndex, 0), remaining.length - 1)];

      applyTabsState(remaining);
      setActiveTabId(neighbor?.id ?? null);
      setTabDeleteTarget(null);

      // Undo toast — the DELETE response carries a trashId the backend can
      // restore from (POST …/tab-restore).
      const trashId: string | undefined =
        result?.data?.trashId ?? result?.trashId ?? undefined;
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-950">
              Tab deleted
            </span>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                void restoreDeletedTab(trashId);
              }}
              className="rounded-full bg-gray-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-gray-800"
            >
              Undo
            </button>
          </div>
        ),
        { duration: 8000 },
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Couldn't delete tab");
    } finally {
      setIsTabDeleting(false);
    }
  };

  const findTemplateDragTarget = (sourceKey: string, pointerY: number) => {
    const currentOrder = templateOrderRef.current;
    const sourceIndex = currentOrder.indexOf(sourceKey);

    if (sourceIndex === -1) {
      return null;
    }

    const rows: TemplateDragTargetRow[] = Array.from(
      document.querySelectorAll<HTMLElement>("[data-smartsite-order-key]"),
    )
      .map((element) => {
        const key = element.dataset.smartsiteOrderKey || "";
        const rect = element.getBoundingClientRect();

        return {
          key,
          top: rect.top,
          bottom: rect.bottom,
          centerY: rect.top + rect.height / 2,
          height: rect.height,
        };
      })
      .filter(
        (row) =>
          row.key &&
          row.key !== sourceKey &&
          // Tabs: hidden blocks (inactive tabs) report zero-height rects and
          // must never become drop targets
          row.height > 0 &&
          (!activeTabKeySet || activeTabKeySet.has(row.key)),
      );

    if (!rows.length) {
      return null;
    }

    const target = rows.reduce((closest, row) => {
      const distance = Math.abs(row.centerY - pointerY);
      const closestDistance = Math.abs(closest.centerY - pointerY);
      return distance < closestDistance ? row : closest;
    }, rows[0]);

    const targetIndex = currentOrder.indexOf(target.key);

    if (targetIndex === -1) {
      return null;
    }

    const activationInset = getTemplateDragActivationInset(
      sourceKey,
      target.key,
      target.height,
    );

    if (sourceIndex < targetIndex && pointerY < target.top + activationInset) {
      return null;
    }

    if (sourceIndex > targetIndex && pointerY > target.bottom - activationInset) {
      return null;
    }

    return target.key;
  };

  const maybeScrollPreviewWhileDragging = (pointerY: number) => {
    const scrollContainer = document.querySelector<HTMLElement>(
      "[data-smartsite-preview-scroll]",
    );
    if (!scrollContainer) {
      return;
    }

    const bounds = scrollContainer.getBoundingClientRect();
    const edgeSize = 92;
    const maxScrollStep = 16;

    if (pointerY < bounds.top + edgeSize) {
      scrollContainer.scrollTop -= maxScrollStep;
    } else if (pointerY > bounds.bottom - edgeSize) {
      scrollContainer.scrollTop += maxScrollStep;
    }
  };

  const previewTemplateReorder = (sourceKey: string, targetKey: string) => {
    const previousOrder = templateOrderRef.current;
    const nextOrder = moveTemplateOrderKey(previousOrder, sourceKey, targetKey);

    if (nextOrder === previousOrder || areTemplateOrdersEqual(nextOrder, previousOrder)) {
      return;
    }

    templateOrderRef.current = nextOrder;
    setTemplateOrder(nextOrder);
  };

  const handleTemplateDragStart = (orderKey: string) => {
    if (dragStartOrderRef.current) {
      return;
    }

    if (dragMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(dragMoveFrameRef.current);
      dragMoveFrameRef.current = null;
    }

    pendingDragMoveRef.current = null;
    lastDragOverOrderKeyRef.current = null;
    dragStartOrderRef.current = [...templateOrderRef.current];
    setDraggingOrderKey(orderKey);
    setDragOverOrderKey(null);
  };

  const processTemplateDragMove = (sourceKey: string, pointerY: number) => {
    maybeScrollPreviewWhileDragging(pointerY);

    const targetKey = findTemplateDragTarget(sourceKey, pointerY);
    if (!targetKey) {
      return;
    }

    if (lastDragOverOrderKeyRef.current !== targetKey) {
      lastDragOverOrderKeyRef.current = targetKey;
      setDragOverOrderKey(targetKey);
    }

    previewTemplateReorder(sourceKey, targetKey);
  };

  const flushPendingTemplateDragMove = () => {
    const pendingMove = pendingDragMoveRef.current;
    dragMoveFrameRef.current = null;
    pendingDragMoveRef.current = null;

    if (!pendingMove) {
      return;
    }

    processTemplateDragMove(pendingMove.sourceKey, pendingMove.pointerY);
  };

  const handleTemplateDragMove = (sourceKey: string, pointerY: number) => {
    pendingDragMoveRef.current = { sourceKey, pointerY };

    if (dragMoveFrameRef.current !== null) {
      return;
    }

    dragMoveFrameRef.current = window.requestAnimationFrame(
      flushPendingTemplateDragMove,
    );
  };

  const handleTemplateDragEnd = () => {
    if (dragMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(dragMoveFrameRef.current);
      dragMoveFrameRef.current = null;
    }

    const pendingMove = pendingDragMoveRef.current;
    pendingDragMoveRef.current = null;

    if (pendingMove) {
      processTemplateDragMove(pendingMove.sourceKey, pendingMove.pointerY);
    }

    const previousOrder = dragStartOrderRef.current;
    const nextOrder = templateOrderRef.current;

    dragStartOrderRef.current = null;
    lastDragOverOrderKeyRef.current = null;
    setDraggingOrderKey(null);
    setDragOverOrderKey(null);

    if (!previousOrder || areTemplateOrdersEqual(previousOrder, nextOrder)) {
      return;
    }

    void saveTemplateOrder(nextOrder, previousOrder);
  };

  const tabMoveTargets =
    isTabEditable && isTabbed && tabs.length > 1 && activeTab
      ? tabs
          .filter((tab) => tab.id !== activeTab.id)
          .map((tab) => ({ id: tab.id, name: tab.name }))
      : undefined;

  const getSortablePreviewProps = (orderKey: string) => ({
    order: getTemplateBlockOrder(orderKey),
    isDragging: draggingOrderKey === orderKey,
    isDragOver: dragOverOrderKey === orderKey,
    isSaving: orderSaveState === "saving" && draggingOrderKey === orderKey,
    hidden: Boolean(activeTabKeySet && !activeTabKeySet.has(orderKey)),
    moveTargets: tabMoveTargets,
    onMoveToTab: handleMoveToTab,
    onDragStart: handleTemplateDragStart,
    onDragMove: handleTemplateDragMove,
    onDragEnd: handleTemplateDragEnd,
  });

  return (
    <div
      style={{
        backgroundImage:
          formData.backgroundImg && !formData.backgroundColor
            ? `url(/images/smartsite-background/${formData.backgroundImg}.png)`
            : "none",
        backgroundColor: formData.backgroundColor && formData.backgroundColor,
      }}
      data-smartsite-preview-scroll
      className="max-w-screen h-[calc(100vh-96px)] overflow-x-hidden -m-6 bg-cover bg-no-repeat overflow-y-auto"
    >
      <div className="relative max-w-md mx-auto h-full ">
        <section
          className={`${
            formData.fontType && fontMap[formData.fontType.toLowerCase()]
          }`}
        >
          <div className={`flex flex-col justify-between pb-24`}>
            <div>
              <div className={`flex h-full flex-col gap-3 justify-start mt-10`}>
                <Header
                  isFromPublicProfile={false}
                  avatar={data.profilePic}
                  // cover={backgroundImg.toString()}
                  name={data.name}
                  parentId={data.parentId}
                  micrositeId={data._id}
                  theme={data.theme}
                  accessToken={accessToken ? accessToken : ""}
                />
                <Bio
                  name={previewName}
                  bio={previewBio}
                  primaryFontColor={previewFontColor}
                  secondaryFontColor={previewSecondaryFontColor}
                />

                {/* ── tab bar ── */}
                {(isTabEditable || tabs.length > 1) &&
                  (isTabbed || isTabEditable) && (
                    <div className="flex items-center gap-2 overflow-x-auto px-3 pb-1 pt-2 hide-scrollbar">
                      {tabs.map((tab, index) => {
                        const isActive = activeTab?.id === tab.id;

                        if (
                          isActive &&
                          isTabEditable &&
                          renamingTabId === tab.id
                        ) {
                          return (
                            <input
                              key={tab.id}
                              autoFocus
                              value={tab.name}
                              maxLength={SMARTSITE_TAB_NAME_MAX_LENGTH}
                              onChange={(event) =>
                                handleTabNameInput(tab.id, event.target.value)
                              }
                              onBlur={() => commitTabRename(tab.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  commitTabRename(tab.id);
                                }
                              }}
                              className="w-28 flex-shrink-0 rounded-full border-2 border-gray-950 bg-white px-4 py-1.5 text-[13px] font-semibold text-gray-950 outline-none"
                            />
                          );
                        }

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              if (isActive && isTabEditable) {
                                setRenamingTabId(tab.id);
                                return;
                              }
                              setActiveTabId(tab.id);
                              setRenamingTabId(null);
                            }}
                            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${
                              isActive
                                ? "bg-gray-950 text-white"
                                : "bg-black/[0.04] text-gray-500 hover:text-gray-950"
                            }`}
                          >
                            {tab.gated && (
                              <Lock className="h-3 w-3 opacity-70" />
                            )}
                            {tab.name || `Tab ${index + 1}`}
                            {isActive && isTabEditable && (
                              <Pencil className="h-3 w-3 opacity-70" />
                            )}
                          </button>
                        );
                      })}

                      {isTabEditable && tabs.length < SMARTSITE_MAX_TABS && (
                        <button
                          type="button"
                          onClick={handleAddTab}
                          className="flex flex-shrink-0 items-center gap-1 rounded-full border-[1.5px] border-dashed border-gray-400 px-3.5 py-1.5 text-[13px] font-semibold text-gray-500 transition hover:border-gray-950 hover:text-gray-950"
                        >
                          <Plus className="h-3.5 w-3.5" /> Tab
                        </button>
                      )}

                      {isTabEditable && activeTab && (
                        <button
                          type="button"
                          aria-label={
                            activeTab.gated
                              ? `Remove token gate from ${activeTab.name} tab`
                              : `Token-gate ${activeTab.name} tab`
                          }
                          title={
                            activeTab.gated
                              ? "Tab is token-gated — click to unlock"
                              : "Token-gate this tab"
                          }
                          onClick={handleToggleTabGate}
                          className={`ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition ${
                            activeTab.gated
                              ? "bg-gray-950 text-white hover:bg-gray-800"
                              : "bg-black/[0.04] text-gray-400 hover:bg-black/[0.08] hover:text-gray-950"
                          }`}
                        >
                          {activeTab.gated ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : (
                            <LockOpen className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {isTabEditable && activeTab && (
                        <button
                          type="button"
                          aria-label={`Delete ${activeTab.name} tab`}
                          onClick={() => setTabDeleteTarget(activeTab)}
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                {/* empty tab placeholder */}
                {isTabbed && activeTab && activeTab.order.length === 0 && (
                  <div className="mx-3 rounded-2xl border border-dashed border-gray-300 px-5 py-10 text-center">
                    <p
                      className="text-[15px] font-semibold"
                      style={{ color: previewFontColor }}
                    >
                      Nothing here yet
                    </p>
                    <p
                      className="mt-1.5 text-[13px]"
                      style={{ color: previewSecondaryFontColor }}
                    >
                      {isTabEditable
                        ? "Add a template to this tab from the Add menu."
                        : "This tab is empty."}
                    </p>
                  </div>
                )}

                {/* small icon display here start */}
                <SortablePreviewSection
                  orderKey="socialTop"
                  sectionKey="socialTop"
                  {...getSortablePreviewProps("socialTop")}
                  className="space-y-4"
                >
                  {socialRows.map((row: any[], rowIndex: number) => (
                    <div
                      key={rowIndex}
                      className="flex justify-center gap-x-6 gap-y-4 flex-wrap"
                    >
                      {row.map((item: any, index: number) => (
                        <SocialSmall
                          key={smartsitePreviewItemKey(
                            "socialTop",
                            item,
                            index,
                            String(rowIndex),
                          )}
                          number={index}
                          data={item}
                          socialType="socialTop"
                          fontColor={previewFontColor}
                          onClick={() =>
                            handleTriggerUpdate({
                              data: item,
                              categoryForTrigger: "socialTop",
                            })
                          }
                        />
                      ))}
                    </div>
                  ))}
                </SortablePreviewSection>
                {/* small icon display here end */}

                {/* marketPlace display here start */}
                {marketplaceItems.length > 0 && (
                  <SortablePreviewSection
                    orderKey="marketPlace"
                    sectionKey="marketPlace"
                    {...getSortablePreviewProps("marketPlace")}
                    className="flex flex-col gap-y-5 px-3 overflow-x-hidden"
                  >
                    {Object.entries(groupedMarketplaceItems).map(
                      ([sectionTitle, items]) => (
                      <div key={sectionTitle} className="flex flex-col gap-y-1">
                        <h3
                          style={{
                            color: previewFontColor,
                          }}
                          className="text-base font-medium capitalize mb-1"
                        >
                          {sectionTitle}
                        </h3>

                        {items.length > 2 ? (
                          <Carousel
                            opts={{
                              align: "start",
                              loop: false,
                              slidesToScroll: 2,
                            }}
                            className="w-full [&>div]:overflow-visible"
                          >
                            <CarouselContent className="-ml-2 pb-4 px-1">
                              {items.map((item: any, index: number) => (
                                <CarouselItem
                                  key={getMarketplaceItemKey(
                                    item,
                                    sectionTitle,
                                    index,
                                  )}
                                  className={`${index === 0 ? "pl-2" : "pl-3"} basis-[45%]`}
                                >
                                  <div className="bg-white rounded-xl shadow-small hover:shadow-medium transition-all duration-200 relative overflow-hidden group">
                                    <button
                                      onClick={() =>
                                        handleMarketPlaceDelete(
                                          item.marketplaceEntryId || item._id,
                                          item.micrositeId,
                                        )
                                      }
                                      className="absolute top-2 right-2 z-10 bg-white rounded-lg p-1.5 shadow-sm hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                      <MdDeleteForever
                                        size={18}
                                        className="text-gray-600 hover:text-red-500"
                                      />
                                    </button>

                                    <div className="flex flex-col">
                                      <div className="relative aspect-square overflow-hidden m-6 mx-10 rounded-md">
                                        <Image
                                          src={getSmartsiteMarketplaceImage(item)}
                                          alt={getSmartsiteMarketplaceName(item)}
                                          fill
                                          quality={100}
                                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                                        />
                                      </div>

                                      <div className="p-3 pt-0">
                                        <div className="flex flex-col gap-0.5">
                                          <p
                                            style={{
                                              color: previewFontColor,
                                            }}
                                            className="text-sm font-semibold line-clamp-1"
                                          >
                                            {getSmartsiteMarketplaceName(item)}
                                          </p>
                                          <p className="text-xs font-medium mt-0.5 bg-gray-100 w-max px-2 py-0.5 rounded-md">
                                            ${getSmartsiteMarketplacePrice(item)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                          </Carousel>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 mr-[11%] sm:mr-12 ml-1 pb-4">
                            {items.map((item: any, index: number) => (
                              <div
                                key={getMarketplaceItemKey(
                                  item,
                                  sectionTitle,
                                  index,
                                )}
                                className="bg-white rounded-xl shadow-small hover:shadow-medium transition-all duration-200 relative overflow-hidden group"
                              >
                                <button
                                  onClick={() =>
                                    handleMarketPlaceDelete(
                                      item.marketplaceEntryId || item._id,
                                      item.micrositeId,
                                    )
                                  }
                                  className="absolute top-2 right-2 z-10 bg-white rounded-lg p-1.5 shadow-sm hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <MdDeleteForever
                                    size={18}
                                    className="text-gray-600 hover:text-red-500"
                                  />
                                </button>

                                <div className="flex flex-col">
                                  <div className="relative aspect-square overflow-hidden m-6 mx-12 rounded-md">
                                    <Image
                                      src={getSmartsiteMarketplaceImage(item)}
                                      alt={getSmartsiteMarketplaceName(item)}
                                      fill
                                      quality={100}
                                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                  </div>

                                  <div className="p-3 pt-0">
                                    <div className="flex flex-col gap-0.5">
                                      <p
                                        style={{
                                          color: previewFontColor,
                                        }}
                                        className="text-sm font-semibold line-clamp-1"
                                      >
                                        {getSmartsiteMarketplaceName(item)}
                                      </p>
                                      <p className="text-xs font-medium mt-0.5 bg-gray-100 w-max px-2 py-0.5 rounded-md">
                                        ${getSmartsiteMarketplacePrice(item)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </SortablePreviewSection>
                )}
                {/* marketPlace display here end */}

                {/* blog display here start */}
                {data.info.blog.length > 0 && (
                  <>
                    {data.info.blog.map((item: any, index: number) => (
                    <SortablePreviewSection
                      key={smartsitePreviewItemKey("blog", item, index)}
                      orderKey={getSmartsiteTemplateItemKey(
                        "blog",
                        item,
                        index,
                      )}
                      sectionKey="blog"
                      {...getSortablePreviewProps(
                        getSmartsiteTemplateItemKey("blog", item, index),
                      )}
                      className="px-3"
                    >
                      <div
                        onClick={() =>
                          handleTriggerUpdate({
                            data: item,
                            categoryForTrigger: "blog",
                          })
                        }
                        className="shadow-small hover:shadow-medium p-2 2xl:p-3 rounded-lg cursor-pointer bg-white"
                      >
                        <div>
                          <div className="relative">
                            <Image
                              src={item.image}
                              alt={item.title}
                              width={1200}
                              height={600}
                              quality={100}
                              className="w-full h-36 2xl:h-48 object-cover rounded-lg"
                            />
                          </div>
                          <div>
                            {item?.title && (
                              <p
                                style={{ color: previewFontColor }}
                                className="font-medium mt-1 truncate"
                              >
                                {item.title}
                              </p>
                            )}
                            {item?.headline && (
                              <p
                                style={{ color: previewSecondaryFontColor }}
                                className="text-sm truncate"
                              >
                                {item.headline}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-end justify-end">
                          <button
                            type="button"
                            onClick={(e) => showReadMoreForBlog(e, item)}
                            className="text-xs bg-slate-900 text-white rounded-full px-3 py-1"
                          >
                            Read More
                          </button>
                        </div>
                      </div>
                    </SortablePreviewSection>
                    ))}
                  </>
                )}
                {/* blog display here end */}

                {/* app icon display here start */}
                {data.info.socialLarge.length > 0 && (
                  <SortablePreviewSection
                    orderKey="socialLarge"
                    sectionKey="socialLarge"
                    {...getSortablePreviewProps("socialLarge")}
                    className="w-full flex flex-wrap items-center justify-center gap-y-6 my-4"
                  >
                    {data.info.socialLarge.map((social: any, index: number) => (
                      <SocialLarge
                        number={index}
                        key={smartsitePreviewItemKey(
                          "socialLarge",
                          social,
                          index,
                        )}
                        data={social}
                        socialType="socialLarge"
                        fontColor={previewFontColor}
                        accessToken={accessToken || ""}
                        onClick={() =>
                          handleTriggerUpdate({
                            data: social,
                            categoryForTrigger: "socialLarge",
                          })
                        }
                      />
                    ))}
                  </SortablePreviewSection>
                )}
                {/* app icon display here end */}

                {/* referral display here start */}
                {data.info.referral.length > 0 && (
                  <>
                    {data.info.referral.map((social: any, index: number) => (
                      <SortablePreviewSection
                        key={smartsitePreviewItemKey(
                          "referral",
                          social,
                          index,
                        )}
                        orderKey={getSmartsiteTemplateItemKey(
                          "referral",
                          social,
                          index,
                        )}
                        sectionKey="referral"
                        {...getSortablePreviewProps(
                          getSmartsiteTemplateItemKey(
                            "referral",
                            social,
                            index,
                          ),
                        )}
                      >
                        <Referral
                          number={index}
                          onClick={() =>
                            handleTriggerUpdate({
                              data,
                              categoryForTrigger: "referral",
                            })
                          }
                          data={social}
                          socialType="referral"
                          accessToken={accessToken || ""}
                          fontColor={previewFontColor}
                          secondaryFontColor={previewSecondaryFontColor}
                        />
                      </SortablePreviewSection>
                    ))}
                  </>
                )}
                {/* referral display here end */}

                {/* card here  */}
                <div className="contents">
                  {/* message me display here start */}
                  {data.info.ensDomain.length > 0 && (
                    <SortablePreviewSection
                      orderKey="message"
                      sectionKey="message"
                      {...getSortablePreviewProps("message")}
                    >
                      <Message
                        number={0}
                        onClick={() =>
                          handleTriggerUpdate({
                            // data,
                            data: data.info.ensDomain[
                              data.info.ensDomain.length - 1
                            ],
                            categoryForTrigger: "ens",
                          })
                        }
                        key={smartsitePreviewItemKey(
                          "message",
                          data.info.ensDomain[0],
                          0,
                        )}
                        data={data.info.ensDomain[0]}
                        socialType="ens"
                        fontColor={previewFontColor}
                        secondaryFontColor={previewSecondaryFontColor}
                        />
                    </SortablePreviewSection>
                  )}

                  {/* redeemable link display here start */}
                  {data.info.redeemLink.length > 0 && (
                    <>
                      {data.info.redeemLink.map((item: any, index: number) => (
                        <SortablePreviewSection
                          key={smartsitePreviewItemKey(
                            "redeemLink",
                            item,
                            index,
                          )}
                          orderKey={getSmartsiteTemplateItemKey(
                            "redeemLink",
                            item,
                            index,
                          )}
                          sectionKey="redeemLink"
                          {...getSortablePreviewProps(
                            getSmartsiteTemplateItemKey(
                              "redeemLink",
                              item,
                              index,
                            ),
                          )}
                        >
                          <Redeem
                            number={index}
                            onClick={() =>
                              handleTriggerUpdate({
                                data: item,
                                categoryForTrigger: "redeemLink",
                              })
                            }
                            data={item}
                            socialType="redeemLink"
                            accessToken={accessToken || ""}
                            fontColor={previewFontColor}
                            secondaryFontColor={previewSecondaryFontColor}
                          />
                        </SortablePreviewSection>
                      ))}
                    </>
                  )}
                  {/* redeemable link display here start */}
                  {/* contact card display here start */}
                  {data.info.contact.length > 0 && (
                    <>
                      {data.info.contact.map((item: any, index: number) => (
                        <SortablePreviewSection
                          key={smartsitePreviewItemKey(
                            "contact",
                            item,
                            index,
                          )}
                          orderKey={getSmartsiteTemplateItemKey(
                            "contact",
                            item,
                            index,
                          )}
                          sectionKey="contact"
                          {...getSortablePreviewProps(
                            getSmartsiteTemplateItemKey(
                              "contact",
                              item,
                              index,
                            ),
                          )}
                        >
                          <Contact
                            number={index}
                            data={item}
                            socialType="contact"
                            accessToken={accessToken || ""}
                            fontColor={previewFontColor}
                            secondaryFontColor={previewSecondaryFontColor}
                            onClick={() =>
                              handleTriggerUpdate({
                                data: item,
                                categoryForTrigger: "contactCard",
                              })
                            }
                          />
                        </SortablePreviewSection>
                      ))}
                    </>
                  )}
                  {/* contact card display here end */}

                  {/* ENS display here start */}
                  {data.info.ensDomain.length > 0 && (
                    <SortablePreviewSection
                      orderKey="ens"
                      sectionKey="ens"
                      {...getSortablePreviewProps("ens")}
                    >
                      <Ens
                        number={0}
                        key={smartsitePreviewItemKey(
                          "ens",
                          data.info.ensDomain[0],
                          0,
                        )}
                        data={data.info.ensDomain[0]}
                        socialType="ens"
                        // parentId={parentId}
                        accessToken={accessToken || ""}
                        fontColor={previewFontColor}
                        secondaryFontColor={previewSecondaryFontColor}
                        onClick={() =>
                          handleTriggerUpdate({
                            data,
                            // data.info.ensDomain[data.info.ensDomain.length -1],
                            categoryForTrigger: "ens",
                          })
                        }
                        />
                    </SortablePreviewSection>
                  )}
                  {/* ENS display here end */}

                  {/* info bar display here start */}
                  {data.info.infoBar.length > 0 && (
                    <>
                      {data.info.infoBar.map((item: any, index: number) => (
                        <SortablePreviewSection
                          key={smartsitePreviewItemKey(
                            "infoBar",
                            item,
                            index,
                          )}
                          orderKey={getSmartsiteTemplateItemKey(
                            "infoBar",
                            item,
                            index,
                          )}
                          sectionKey="infoBar"
                          {...getSortablePreviewProps(
                            getSmartsiteTemplateItemKey(
                              "infoBar",
                              item,
                              index,
                            ),
                          )}
                        >
                          <InfoBar
                            number={index}
                            data={item}
                            socialType="infoBar"
                            accessToken={accessToken || ""}
                            fontColor={previewFontColor}
                            secondaryFontColor={previewSecondaryFontColor}
                            onClick={() =>
                              handleTriggerUpdate({
                                data: item,
                                categoryForTrigger:
                                  item.group === "reviewReward"
                                    ? "reviewReward"
                                    : "infoBar",
                              })
                            }
                          />
                        </SortablePreviewSection>
                      ))}
                    </>
                  )}
                  {/* info bar display here end */}

                  {/* swop pay display here start */}
                  {data.info.product.length > 0 && (
                    <>
                      {data.info.product.map((item: any, index: number) => (
                        <SortablePreviewSection
                          key={smartsitePreviewItemKey(
                            "product",
                            item,
                            index,
                          )}
                          orderKey={getSmartsiteTemplateItemKey(
                            "product",
                            item,
                            index,
                          )}
                          sectionKey="product"
                          {...getSortablePreviewProps(
                            getSmartsiteTemplateItemKey(
                              "product",
                              item,
                              index,
                            ),
                          )}
                        >
                          <PaymentBar
                            number={index}
                            data={item}
                            socialType="product"
                            // parentId={parentId}
                            accessToken={accessToken || ""}
                            fontColor={previewFontColor}
                            secondaryFontColor={previewSecondaryFontColor}
                            onClick={() =>
                              handleTriggerUpdate({
                                data: item,
                                categoryForTrigger: "swopPay",
                              })
                            }
                          />
                        </SortablePreviewSection>
                      ))}
                    </>
                  )}
                  {/* swop pay display here end */}

                  {/* audio||music display here start */}
                  {data.info.audio.length > 0 && (
                    <>
                      {data.info.audio.map((audioData: any, index: number) => (
                        <SortablePreviewSection
                          key={smartsitePreviewItemKey(
                            "audio",
                            audioData,
                            index,
                          )}
                          orderKey={getSmartsiteTemplateItemKey(
                            "audio",
                            audioData,
                            index,
                          )}
                          sectionKey="audio"
                          {...getSortablePreviewProps(
                            getSmartsiteTemplateItemKey(
                              "audio",
                              audioData,
                              index,
                            ),
                          )}
                        >
                          <MP3
                            number={index}
                            onClick={() =>
                              handleTriggerUpdate({
                                data: audioData,
                                categoryForTrigger: "audio",
                              })
                            }
                            data={audioData}
                            socialType="audio"
                            length={data.info.audio.length}
                            fontColor={previewFontColor}
                            secondaryFontColor={previewSecondaryFontColor}
                          />
                        </SortablePreviewSection>
                      ))}
                    </>
                  )}
                  {/* audio||music display here end */}
                </div>

                {/* Image / Video Section */}
                {data.info.video.length > 0 && (
                  <SortablePreviewSection
                    orderKey="video"
                    sectionKey="video"
                    {...getSortablePreviewProps("video")}
                  >
                    <MediaList
                      items={data.info.video}
                      getMediaType={getMediaType}
                      fontColor={previewFontColor}
                      onClick={(item) =>
                        handleTriggerUpdate({
                          data: item,
                          categoryForTrigger: "video",
                        })
                      }
                    />
                  </SortablePreviewSection>
                )}

                {/* Embeded Link */}
                {data.info?.videoUrl && data.info.videoUrl.length > 0 && (
                  <>
                    {data.info.videoUrl.map((social: any, index: number) => (
                      <SortablePreviewSection
                        key={smartsitePreviewItemKey(
                          "videoUrl",
                          social,
                          index,
                        )}
                        orderKey={getSmartsiteTemplateItemKey(
                          "videoUrl",
                          social,
                          index,
                        )}
                        sectionKey="videoUrl"
                        {...getSortablePreviewProps(
                          getSmartsiteTemplateItemKey(
                            "videoUrl",
                            social,
                            index,
                          ),
                        )}
                      >
                        <EmbedVideo
                          data={social}
                          onClick={() =>
                            handleTriggerUpdate({
                              data: social,
                              categoryForTrigger: "embed",
                            })
                          }
                        />
                      </SortablePreviewSection>
                    ))}
                  </>
                )}
                {/* embed link display here end */}

                {/* widgets (tip jar / prediction market / agent vault) start */}
                {Array.isArray(data.info?.widget) &&
                  data.info.widget.length > 0 && (
                    <>
                      {data.info.widget.map((item: any, index: number) => (
                        <SortablePreviewSection
                          key={smartsitePreviewItemKey("widget", item, index)}
                          orderKey={getSmartsiteTemplateItemKey(
                            "widget",
                            item,
                            index,
                          )}
                          sectionKey="widget"
                          {...getSortablePreviewProps(
                            getSmartsiteTemplateItemKey("widget", item, index),
                          )}
                        >
                          <div
                            className="cursor-pointer"
                            onClick={() =>
                              handleTriggerUpdate({
                                data: { ...item, micrositeId: data._id },
                                categoryForTrigger: "widget",
                              })
                            }
                          >
                            {item.widgetType === "tipJar" ? (
                              <TipJarCard
                                widgetId={item._id}
                                config={item.config || {}}
                                mode="builder"
                              />
                            ) : item.widgetType === "predictionMarket" ? (
                              <PredictionMarketCard
                                config={item.config || {}}
                                mode="builder"
                              />
                            ) : item.widgetType === "vaultCard" ? (
                              <VaultCard
                                config={item.config || {}}
                                mode="builder"
                              />
                            ) : item.widgetType === "leadForm" ? (
                              <LeadFormCard
                                widgetId={item._id}
                                config={item.config || {}}
                                mode="builder"
                              />
                            ) : null}
                          </div>
                        </SortablePreviewSection>
                      ))}
                    </>
                  )}
                {/* widgets end */}

                {data?.showFeed && accessToken && user && (
                  <SortablePreviewSection
                    orderKey="feed"
                    sectionKey="feed"
                    {...getSortablePreviewProps("feed")}
                    className="mt-1"
                  >
                    <EmbeddedFeed
                      accessToken={accessToken || ""}
                      userId={user?._id || ""}
                      micrositeId={user?.primaryMicrosite || ""}
                      isOrderPreview
                    />
                  </SortablePreviewSection>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 h-12 2xl:-translate-y-3 pt-3">
              <Image
                alt="swop logo"
                src={swop}
                className="w-16"
                quality={100}
              />
              {/* <BiSolidEdit /> */}
            </div>
          </div>
        </section>
      </div>

      <UpdateModalComponents isOn={isOn} iconData={iconData} setOff={setOff} />

      {/* delete tab confirmation — destructive, enumerates what's removed */}
      <Modal
        isOpen={Boolean(tabDeleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isTabDeleting) {
            setTabDeleteTarget(null);
          }
        }}
        className="overflow-y-auto hide-scrollbar"
      >
        <ModalContent>
          <div className="mx-auto w-[91%] py-6">
            <ModalBody className="text-center">
              <div className="flex flex-col items-center text-center">
                <p className="text-lg font-bold">
                  Delete “{tabDeleteTarget?.name}” tab?
                </p>
                {tabDeleteTarget && tabDeleteTarget.order.length > 0 ? (
                  <>
                    <p className="mt-2 text-sm text-gray-500">
                      This permanently deletes everything on this tab:
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {describeTabContent(tabDeleteTarget).map((entry) => (
                        <span
                          key={entry}
                          className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                        >
                          {entry}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    This tab is empty — nothing else will be deleted.
                  </p>
                )}
                <RiDeleteBinFill size={40} className="my-3" />
                <AnimateButton
                  whiteLoading={true}
                  type="button"
                  onClick={confirmDeleteTab}
                  isLoading={isTabDeleting}
                  width={"w-32"}
                  className="bg-black text-white py-2 !border-0"
                >
                  <MdDelete size={20} /> Delete Tab
                </AnimateButton>
              </div>
            </ModalBody>
          </div>
        </ModalContent>
      </Modal>

      <Modal
        // size="4xl"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        // backdrop={"blur"}
        className=" overflow-y-auto hide-scrollbar"
      >
        <ModalContent>
          <div className="w-[91%] mx-auto py-6">
            <ModalBody className="text-center">
              <div className="text-center flex flex-col items-center ">
                <p className="text-lg font-bold">Do you want to delete your</p>
                <p className="text-lg font-bold">Market place?</p>
                <RiDeleteBinFill size={40} className="my-3" />
                <AnimateButton
                  whiteLoading={true}
                  type="button"
                  onClick={deleteMarketPlace}
                  isLoading={isMarketPlaceDeleteLoading}
                  width={"w-28"}
                  className="bg-black text-white py-2 !border-0"
                >
                  <MdDelete size={20} /> Delete
                </AnimateButton>
              </div>
            </ModalBody>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default SmartsiteIconLivePreview;
