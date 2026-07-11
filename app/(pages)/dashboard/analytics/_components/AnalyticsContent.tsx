"use client";

import getAllSmartsitesIcon from "@/components/smartsite/retriveIconImage/getAllSmartsiteIcon";
import getSmallIconImage from "@/components/smartsite/retriveIconImage/getSmallIconImage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { tintStyle } from "@/components/util/IconTintStyle";
import isUrl from "@/lib/isUrl";
import { Info, RefreshCw } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

interface MetricCardProps {
  value: number;
  label: string;
  period: string;
}

interface AnalyticsData {
  last30DaysMicrositeTaps?: number;
  lifetimeMicrositeTaps?: number;
  last30DaysConnections?: number;
  last30DaysLeads?: number;
}

interface AnalyticsItem {
  _id?: unknown;
  active?: boolean;
  totalTap?: unknown;
  name?: unknown;
  value?: unknown;
  url?: unknown;
  iconName?: unknown;
  iconPath?: unknown;
  group?: unknown;
  buttonName?: unknown;
  title?: unknown;
  headline?: unknown;
  link?: unknown;
  description?: unknown;
  image?: unknown;
  coverPhoto?: unknown;
  imageUrl?: unknown;
  tokenUrl?: unknown;
  videoUrl?: unknown;
  type?: unknown;
  mobileNo?: unknown;
  email?: unknown;
  address?: unknown;
  websiteUrl?: unknown;
  domain?: unknown;
  ensData?: {
    domain?: unknown;
    name?: unknown;
  };
  mintName?: unknown;
  symbol?: unknown;
  tokenType?: unknown;
  referralCode?: unknown;
  itemName?: unknown;
  templateId?: {
    name?: unknown;
    image?: unknown;
  };
}

interface MicrositeInfo {
  socialTop?: unknown[];
  socialLarge?: unknown[];
  infoBar?: unknown[];
  referral?: unknown[];
  redeemLink?: unknown[];
  blog?: unknown[];
  audio?: unknown[];
  video?: unknown[];
  videoUrl?: unknown[];
  contact?: unknown[];
  ensDomain?: unknown[];
  marketPlace?: unknown[];
}

interface Microsite {
  _id: string;
  name?: string;
  ens?: string;
  profilePic?: string;
  totalTap?: number;
  info?: MicrositeInfo;
}

interface AnalyticsContentProps {
  userData: {
    microsites?: Microsite[];
  } | null;
  analyticsData: AnalyticsData | null;
}

type ImageSource = string | StaticImageData;

const sections = [
  { key: "socialTop", label: "Social Links" },
  { key: "socialLarge", label: "Featured Links" },
  { key: "infoBar", label: "Info Links" },
  { key: "referral", label: "Referral Links" },
  { key: "redeemLink", label: "Redeem Links" },
  { key: "blog", label: "Blogs" },
  { key: "audio", label: "Audio" },
  { key: "video", label: "Videos" },
  { key: "videoUrl", label: "Embeds" },
  { key: "contact", label: "Contacts" },
  { key: "ensDomain", label: "Domains" },
  { key: "marketPlace", label: "Marketplace" },
] as const;

type SectionKey = (typeof sections)[number]["key"];

const MetricCard = ({ value, label, period }: MetricCardProps) => (
  <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 text-center">
    <div className="mb-2 flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 cursor-pointer text-gray-400" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{`${label} for ${period}`}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <div className="text-3xl font-bold text-gray-900">{value}</div>
    <div className="text-sm font-medium text-gray-600">{label}</div>
    <div className="mt-1 text-xs text-gray-400">{period}</div>
  </div>
);

function safeArray<T>(value?: T[] | null): T[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asItem(value: unknown): AnalyticsItem {
  return isRecord(value) ? (value as AnalyticsItem) : {};
}

function toText(value?: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed || undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function toCount(value?: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function readableUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.hostname.includes("cloudinary.com")) {
      return "";
    }

    return url.hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function isReadableText(value?: unknown) {
  const trimmed = toText(value);

  return Boolean(trimmed && !isUrl(trimmed));
}

function firstReadable(candidates: unknown[]) {
  const match = candidates.find(isReadableText);

  return toText(match);
}

function firstUrl(
  candidates: unknown[],
  options: { allowCloudinary?: boolean } = {}
) {
  const match = candidates.find((value) => {
    const trimmed = toText(value);

    if (!trimmed || !isUrl(trimmed)) {
      return false;
    }

    return options.allowCloudinary || Boolean(readableUrl(trimmed));
  });

  return toText(match);
}

const fallbackLabels: Record<SectionKey, string> = {
  socialTop: "Social link",
  socialLarge: "Featured link",
  infoBar: "Info link",
  referral: "Referral link",
  redeemLink: "Redeem link",
  blog: "Blog post",
  audio: "Audio track",
  video: "Video",
  videoUrl: "Embedded video",
  contact: "Contact",
  ensDomain: "Domain",
  marketPlace: "Marketplace item",
};

function itemLabel(item: AnalyticsItem, sectionKey: SectionKey) {
  const common = [
    item.buttonName,
    item.title,
    item.headline,
    item.name,
    item.value,
    item.mintName,
    item.symbol,
    item.referralCode,
    item.domain,
    item.ensData?.domain,
    item.ensData?.name,
    item.templateId?.name,
    item.itemName,
    item.description,
  ];

  const bySection: Record<SectionKey, unknown[]> = {
    socialTop: [item.name, item.value],
    socialLarge: [item.name, item.value],
    infoBar: [item.buttonName, item.title, item.description],
    referral: [item.buttonName, item.referralCode, item.description],
    redeemLink: [item.mintName, item.symbol, item.tokenType, item.description],
    blog: [item.title, item.headline, item.description],
    audio: [item.name],
    video: [item.title],
    videoUrl: [item.title, item.type, item.videoUrl],
    contact: [item.name, item.email, item.mobileNo, item.websiteUrl],
    ensDomain: [item.domain, item.ensData?.domain, item.ensData?.name],
    marketPlace: [item.itemName, item.templateId?.name],
  };

  const label = firstReadable([...bySection[sectionKey], ...common]);

  if (label) {
    return label;
  }

  const url = firstUrl([
    item.url,
    item.link,
    item.tokenUrl,
    item.websiteUrl,
    item.videoUrl,
  ]);

  return url ? readableUrl(url) : fallbackLabels[sectionKey];
}

function itemImage(item: AnalyticsItem, sectionKey: SectionKey) {
  const name = toText(item.name);
  const group = toText(item.group);
  const iconName = toText(item.iconName);

  if (sectionKey === "socialTop" && name) {
    return getSmallIconImage(name, group) as ImageSource;
  }

  if (
    (sectionKey === "socialLarge" || sectionKey === "infoBar") &&
    iconName &&
    !isUrl(iconName)
  ) {
    return getAllSmartsitesIcon(iconName) as ImageSource;
  }

  return firstUrl(
    [
      item.image,
      item.coverPhoto,
      item.imageUrl,
      item.iconName,
      item.templateId?.image,
    ],
    { allowCloudinary: true }
  );
}

function smartsiteRollupTotal(microsite: Microsite) {
  const itemTotal = sections.reduce<number>((total, section) => {
    return (
      total +
      safeArray<unknown>(microsite.info?.[section.key]).reduce<number>(
        (sectionTotal, entry) => sectionTotal + toCount(asItem(entry).totalTap),
        0
      )
    );
  }, 0);

  return Math.max(toCount(microsite.totalTap), itemTotal);
}

function detailItemKey(entry: unknown, sectionKey: SectionKey, index: number) {
  const item = asItem(entry);
  const id = toText(item._id) || (typeof entry === "string" ? entry : "");

  return id || `${sectionKey}-${index}`;
}

function DetailIcon({
  item,
  sectionKey,
}: {
  item: AnalyticsItem;
  sectionKey: SectionKey;
}) {
  const image = itemImage(item, sectionKey);
  const shouldTint = sectionKey === "socialTop" && typeof image === "string";

  if (image) {
    return (
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-gray-100">
        <Image
          src={image}
          alt=""
          fill
          sizes="36px"
          className="object-cover"
          quality={80}
          style={shouldTint && !isUrl(image) ? tintStyle : undefined}
        />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-500">
      {toText(item.name)?.slice(0, 1) ||
        toText(item.buttonName)?.slice(0, 1) ||
        "-"}
    </div>
  );
}

function SmartsiteAvatar({ microsite }: { microsite: Microsite }) {
  const profilePic = microsite.profilePic;
  const src =
    profilePic && isUrl(profilePic)
      ? profilePic
      : `/images/user_avator/${profilePic || "profile-1"}@3x.png`;

  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-blue-100">
      <Image
        src={src}
        alt=""
        width={96}
        height={96}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export default function AnalyticsContent({
  userData,
  analyticsData,
}: AnalyticsContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const microsites = useMemo(
    () => safeArray(userData?.microsites),
    [userData?.microsites]
  );
  const [selectedSmartsiteId, setSelectedSmartsiteId] = useState(
    microsites[0]?._id || ""
  );

  useEffect(() => {
    if (!microsites.length) {
      setSelectedSmartsiteId("");
      return;
    }

    if (!microsites.some((microsite) => microsite._id === selectedSmartsiteId)) {
      setSelectedSmartsiteId(microsites[0]._id);
    }
  }, [microsites, selectedSmartsiteId]);

  const selectedSmartsite = useMemo(
    () =>
      microsites.find((microsite) => microsite._id === selectedSmartsiteId) ||
      microsites[0],
    [microsites, selectedSmartsiteId]
  );

  const detailSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: safeArray(selectedSmartsite?.info?.[section.key]).map(
            (entry, index) => ({
              item: asItem(entry),
              key: detailItemKey(entry, section.key, index),
            })
          ),
        }))
        .filter((section) => section.items.length > 0),
    [selectedSmartsite]
  );

  const metrics = [
    {
      value: toCount(analyticsData?.last30DaysMicrositeTaps),
      label: "Page Visit",
      period: "30 Days",
    },
    {
      value: toCount(analyticsData?.lifetimeMicrositeTaps),
      label: "Page Visit",
      period: "Life Time",
    },
    {
      value: toCount(analyticsData?.last30DaysConnections),
      label: "Followers",
      period: "30 days",
    },
    {
      value: toCount(analyticsData?.last30DaysLeads),
      label: "Form submissions",
      period: "30 days",
    },
  ];

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-wait disabled:opacity-60"
            disabled={isPending}
          >
            Refresh
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={`${metric.label}-${metric.period}`} {...metric} />
          ))}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Smartsite Clicks
          </h2>
          <div className="space-y-3">
            {microsites.length ? (
              microsites.map((microsite) => {
                const isSelected = microsite._id === selectedSmartsite?._id;

                return (
                  <button
                    key={microsite._id}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left shadow-small transition hover:shadow-medium ${
                      isSelected
                        ? "border-gray-900 bg-gray-50"
                        : "border-transparent bg-white"
                    }`}
                    onClick={() => setSelectedSmartsiteId(microsite._id)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <SmartsiteAvatar microsite={microsite} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {microsite.name || "Untitled smartsite"}
                        </p>
                        {microsite.ens ? (
                          <small className="block truncate text-gray-500">
                            {microsite.ens}
                          </small>
                        ) : null}
                      </div>
                    </div>
                    <div className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                      {smartsiteRollupTotal(microsite)}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                No smartsites found.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-center font-semibold text-gray-900">
            {selectedSmartsite?.name || "Smartsite Details"}
          </h2>
          <hr className="-mx-6 mb-4 mt-4" />

          {detailSections.length ? (
            <div className="space-y-5">
              {detailSections.map((section) => (
                <div key={section.key} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {section.label}
                  </h3>
                  {section.items.map(({ item, key }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <DetailIcon item={item} sectionKey={section.key} />
                        <span className="min-w-0 truncate text-sm text-gray-700">
                          {itemLabel(item, section.key)}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-gray-900">
                        {toCount(item.totalTap)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              No tracked links yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
