"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/publicProfile/header";
import Bio from "@/components/publicProfile/bio";
import Blog from "@/components/publicProfile/blog";
import SocialLarge from "@/components/publicProfile/socialLarge";
import SocialSmall from "@/components/publicProfile/socialSmall";
import Ens from "@/components/publicProfile/ens";
import MP3 from "@/components/publicProfile/mp3";
import Referral from "@/components/publicProfile/referral";
import Redeem from "@/components/publicProfile/redeem";
import EmbedVideo from "@/components/publicProfile/embedvideo";
import Message from "@/components/publicProfile/message";
import Contact from "@/components/publicProfile/contact";
import InfoBar from "@/components/publicProfile/infoBar";
import PaymentBar from "@/components/publicProfile/paymentBar";
import Footer from "@/components/publicProfile/footer";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import MarketPlace from "@/components/publicProfile/MarketPlace";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

import { CartProvider } from "./cart/context/CartContext";
import { useUser } from "@/lib/UserContext";
import { useMicrositeData } from "./context/MicrositeContext";
import TokenGateVerification from "@/components/publicProfile/TokenGateVerification";
import distributeSmallIcons from "@/components/util/distributeSmallIcons";
import { fontMap } from "@/lib/fonts";
import getMediaType from "@/utils/getMediaType";
import MediaList from "@/components/publicProfile/MediaList";
import EmbeddedFeed from "./_EmbeddedFeed";
import Cookies from "js-cookie";
import {
  groupSmartsiteMarketplaceItems,
  normalizeSmartsiteMarketplaceItems,
} from "@/lib/smartsite-marketplace-display";
import {
  flattenSmartsiteTabs,
  getSmartsiteTemplateItemKey,
  isFeedOnlySmartsiteTab,
  isTabbedSmartsite,
  normalizeSmartsitePinnedOrder,
  normalizeSmartsiteTabs,
  normalizeSmartsiteTemplateBlockOrder,
} from "@/lib/smartsite-template-order";
import { Lock } from "lucide-react";
import TipJarCard from "@/components/publicProfile/widgets/TipJarCard";
import LeadFormCard from "@/components/publicProfile/widgets/LeadFormCard";

interface ClientProfileProps {
  userName: string;
}

export default function ClientProfile({ userName }: ClientProfileProps) {
  const { micrositeData } = useMicrositeData();
  const { user, accessToken } = useUser();
  const accessUserIdFromCookie = Cookies.get("user-id");
  const marketplaceItems = useMemo(
    () => normalizeSmartsiteMarketplaceItems(micrositeData?.info?.marketPlace),
    [micrositeData?.info?.marketPlace],
  );
  const groupedMarketplaceItems = useMemo(
    () => groupSmartsiteMarketplaceItems(marketplaceItems),
    [marketplaceItems],
  );

  // Named tabs: [] = legacy flat rendering (all pre-tabs smartsites)
  const searchParams = useSearchParams();
  const tabs = useMemo(
    () => normalizeSmartsiteTabs(micrositeData),
    [micrositeData],
  );
  // Pinned-header zone: templates pinned above the tab bar, visible on every
  // tab (like the small icons). Legacy sites (tabs=[]) ignore it entirely.
  const pinnedOrder = useMemo(
    () =>
      isTabbedSmartsite(micrositeData)
        ? normalizeSmartsitePinnedOrder(micrositeData)
        : [],
    [micrositeData],
  );
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  // Gated tabs the visitor unlocked this page-view (session-local)
  const [verifiedTabIds, setVerifiedTabIds] = useState<string[]>([]);

  if (!micrositeData) {
    return <div>Loading...</div>;
  }

  if (micrositeData.redirect) {
    redirect(`/sp/${micrositeData.username}`);
  }

  const {
    _id,
    name,
    bio,
    profilePic,
    backgroundImg,
    backgroundColor,
    fontColor,
    secondaryFontColor,
    fontFamily,
    info,
    gatedAccess,
    direct,
    parentId,
    gatedInfo,
    theme,
    ens,
  } = micrositeData;

  const ensDomain = info.ensDomain[info.ensDomain.length - 1];

  const isTabbed = tabs.length > 0;
  // Feed-only tab: when the tab holding 'feed' contains nothing else, the
  // embedded feed renders plain (no card chrome, full-width posts). Keyed
  // off the owning tab — not the active one — since blocks stay mounted
  // (hidden) across tab switches. Mixed-content tabs and legacy flat sites
  // keep the card look.
  const isFeedPlain =
    isTabbed &&
    isFeedOnlySmartsiteTab(
      tabs.find((tab) => tab.order.includes("feed")) ?? null,
    );
  const requestedTab = searchParams?.get("tab") || null;
  const activeTab = isTabbed
    ? tabs.find((tab) => tab.id === selectedTabId) ??
      (requestedTab
        ? tabs.find(
            (tab) =>
              tab.id === requestedTab ||
              tab.name.toLowerCase() === requestedTab.toLowerCase(),
          )
        : undefined) ??
      tabs[0]
    : null;
  const activeTabKeySet = activeTab ? new Set(activeTab.order) : null;

  // Token-gated tab: only meaningful when the site actually has a token gate
  // configured (gatedInfo.isOn) — otherwise the flag is inert and the tab's
  // content renders normally.
  const hasSiteTokenGate = Boolean(gatedInfo?.isOn);
  const isActiveTabLocked = Boolean(
    activeTab?.gated &&
      hasSiteTokenGate &&
      !verifiedTabIds.includes(activeTab.id),
  );

  const templateOrder = isTabbed
    ? flattenSmartsiteTabs(tabs)
    : normalizeSmartsiteTemplateBlockOrder(
        micrositeData,
        micrositeData.templateOrder,
      );
  // The whole page is one flex column ordered by these constants:
  //   socialTop pinned row 3 → pinned zone 400+i → tab bar 500 → gate panel
  //   600 → tab content 1000+i → footer 10000. Legacy sites only ever use
  //   the 1000+i band (plus the footer), so relative order is unchanged.
  const getTemplateBlockOrder = (orderKey: string) => {
    const pinnedIndex = pinnedOrder.indexOf(orderKey);
    if (pinnedIndex !== -1) {
      return 400 + pinnedIndex;
    }
    return 1000 + templateOrder.indexOf(orderKey);
  };
  // Blocks on inactive tabs stay mounted but hidden — panels are just
  // visibility. Pinned-header blocks are visible on EVERY tab and even while
  // a gated tab is locked (never display:none), like the small icons.
  const getTemplateBlockStyle = (orderKey: string) => {
    if (pinnedOrder.includes(orderKey)) {
      return { order: getTemplateBlockOrder(orderKey) };
    }
    return {
      order: getTemplateBlockOrder(orderKey),
      display:
        (activeTabKeySet && !activeTabKeySet.has(orderKey)) ||
        // Locked gated tab: hide its blocks and show the verification panel
        (isActiveTabLocked && activeTabKeySet?.has(orderKey))
          ? ("none" as const)
          : undefined,
    };
  };

  return (
    <>
      {/* Token Gate Verification Modal - Shows when gatedInfo.isOn is true */}
      {/* {gatedInfo?.isOn && (
        <TokenGateVerification gatedInfo={gatedInfo} micrositeName={name} />
      )} */}

      <div
        style={{
          backgroundImage:
            backgroundImg && !backgroundColor
              ? `url(/images/smartsite-background/${backgroundImg}.png)`
              : "none",
          backgroundColor: backgroundColor && backgroundColor,
        }}
        className={`bg-cover scrollbar-hide bg-no-repeat h-screen overflow-y-auto px-4 lg:px-0 pt-6 ${
          fontFamily ? fontMap[fontFamily?.toLowerCase() || "roboto"] : ""
        }`}
      >
        <main
          className={`flex max-w-md mx-auto min-h-screen flex-col items-center z-50 gap-2 overflow-x-hidden`}
        >
          <CartProvider>
            <Header
              avatar={profilePic}
              name={name}
              parentId={parentId}
              micrositeId={_id}
              theme={theme}
              accessToken={accessToken ? accessToken : ""}
            />
            <Bio
              name={name}
              bio={bio}
              primaryFontColor={fontColor}
              secondaryFontColor={secondaryFontColor}
            />

            {/* ── named tabs bar (only when the site has >1 tab) ── */}
            {tabs.length > 1 && (
              <nav
                aria-label="Site sections"
                className="w-full flex items-center gap-2 overflow-x-auto scrollbar-hide px-1 pb-1 pt-2"
                style={{ order: 500 }}
              >
                {tabs.map((tab) => {
                  const isActive = activeTab?.id === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedTabId(tab.id)}
                      className="flex-shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition"
                      style={
                        isActive
                          ? {
                              backgroundColor: fontColor || "#0a0a0c",
                              color: backgroundColor || "#ffffff",
                            }
                          : {
                              backgroundColor: "rgba(0,0,0,0.05)",
                              color: secondaryFontColor || "#8a8a8f",
                            }
                      }
                    >
                      <span className="flex items-center gap-1.5">
                        {tab.gated && hasSiteTokenGate && (
                          <Lock className="h-3 w-3 opacity-70" />
                        )}
                        {tab.name}
                      </span>
                    </button>
                  );
                })}
              </nav>
            )}

            {/* Token-gate panel for a locked gated tab — scoped to the tab
                panel area; the tab's blocks stay hidden until verified */}
            {isActiveTabLocked && gatedInfo && (
              <div className="w-full" style={{ order: 600 }}>
                <TokenGateVerification
                  inline
                  gatedInfo={gatedInfo}
                  micrositeName={name}
                  onVerified={() => {
                    if (activeTab) {
                      setVerifiedTabIds((prev) =>
                        prev.includes(activeTab.id)
                          ? prev
                          : [...prev, activeTab.id],
                      );
                    }
                  }}
                />
              </div>
            )}

            {/* Social Media Small — on tabbed sites the icons are pinned in
                the header: fixed between the Bio and the pinned zone /
                tab bar (order 500), visible on every tab and even while a
                gated tab is locked (never display:none). Legacy sites keep
                the ordered block. */}
            {info?.socialTop && info.socialTop.length > 0 && (
              <div
                className="space-y-4"
                style={
                  isTabbed
                    ? { order: 3 }
                    : { ...getTemplateBlockStyle("socialTop") }
                }
              >
                {distributeSmallIcons(info.socialTop).map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="flex justify-center gap-x-6 gap-y-4 flex-wrap"
                  >
                    {row.map((item, index) => (
                      <SocialSmall
                        number={index}
                        key={item.name}
                        data={item}
                        socialType="socialTop"
                        parentId={parentId}
                        accessToken={accessToken || ""}
                        fontColor={fontColor || "#000000"}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* market place */}
            {marketplaceItems.length > 0 && (
              <div
                className="w-full space-y-1 mb-4"
                style={{ ...getTemplateBlockStyle("marketPlace") }}
              >
                {Object.entries(groupedMarketplaceItems).map(
                  ([sectionTitle, items]) => (
                    <div key={sectionTitle} className="w-full">
                      <h2
                        style={{
                          color: fontColor ? fontColor : "black",
                        }}
                        className="text-base font-medium capitalize mb-1"
                      >
                        {sectionTitle}
                      </h2>

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
                            {items.map((item, index) => (
                              <CarouselItem
                                key={item._id}
                                className={`${index === 0 ? "pl-2" : "pl-3"} basis-[45%]`}
                              >
                                <MarketPlace
                                  data={item}
                                  socialType="redeemLink"
                                  sellerId={_id}
                                  userName={userName}
                                  number={index}
                                  userId={user?._id}
                                  accessToken={accessToken}
                                  fontColor={fontColor}
                                />
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                        </Carousel>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 mr-[11%] sm:mr-12 ml-1 pb-4">
                          {items.map((item, index) => (
                            <MarketPlace
                              key={item._id}
                              data={item}
                              socialType="redeemLink"
                              sellerId={_id}
                              userName={userName}
                              number={index}
                              userId={user?._id}
                              accessToken={accessToken}
                              fontColor={fontColor}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}

            {/* Blog */}
            {info?.blog && info.blog.length > 0 && (
              <>
                {info.blog.map((social: any, index: number) => (
                  <div
                    key={social._id}
                    className="w-full"
                    style={{
                      ...getTemplateBlockStyle(
                        getSmartsiteTemplateItemKey("blog", social, index),
                      ),
                    }}
                  >
                    <Blog
                      number={index}
                      data={social}
                      socialType="blog"
                      parentId={parentId}
                      fontColor={fontColor}
                      secondaryFontColor={secondaryFontColor}
                    />
                  </div>
                ))}
              </>
            )}
            {/* Social Media Big */}
            {info?.socialLarge && info.socialLarge.length > 0 && (
              <div
                className="w-full flex flex-wrap items-center justify-center gap-y-6 my-4"
                style={{ ...getTemplateBlockStyle("socialLarge") }}
              >
                {info.socialLarge.map((social: any, index: number) => (
                  <SocialLarge
                    number={index}
                    key={index}
                    data={social}
                    socialType="socialLarge"
                    parentId={parentId}
                    fontColor={fontColor}
                    accessToken={accessToken || ""}
                  />
                ))}
              </div>
            )}

            <div
              style={{
                color: secondaryFontColor && secondaryFontColor,
              }}
              className="contents"
            >
              {/* Message */}
              {info?.ensDomain && info.ensDomain.length > 0 && (
                <div
                  className="w-full"
                  style={{ ...getTemplateBlockStyle("message") }}
                >
                  <Message
                    number={0}
                    key={ensDomain._id}
                    data={ensDomain}
                    socialType="ens"
                    parentId={parentId}
                    fontColor={fontColor}
                    secondaryFontColor={secondaryFontColor}
                  />
                </div>
              )}
              {/* Redeem Link */}
              {info?.redeemLink && info.redeemLink.length > 0 && (
                <>
                  {info.redeemLink.map((social: any, index: number) => (
                    <div
                      key={social._id}
                      className="w-full"
                      style={{
                        ...getTemplateBlockStyle(
                          getSmartsiteTemplateItemKey(
                            "redeemLink",
                            social,
                            index,
                          ),
                        ),
                      }}
                    >
                      <Redeem
                        number={index}
                        data={social}
                        socialType="redeemLink"
                        parentId={parentId}
                        accessToken={accessToken || ""}
                        fontColor={fontColor}
                        secondaryFontColor={secondaryFontColor}
                      />
                    </div>
                  ))}
                </>
              )}

              {/* Referral Code */}
              {info.referral && info.referral.length > 0 && (
                <>
                  {info.referral.map((social: any, index: number) => (
                    <div
                      key={social._id}
                      className="w-full"
                      style={{
                        ...getTemplateBlockStyle(
                          getSmartsiteTemplateItemKey("referral", social, index),
                        ),
                      }}
                    >
                      <Referral
                        number={index}
                        data={social}
                        socialType="referral"
                        parentId={parentId}
                        accessToken={accessToken || ""}
                        fontColor={fontColor}
                        secondaryFontColor={secondaryFontColor}
                      />
                    </div>
                  ))}
                </>
              )}

              {/* ENS */}
              {info?.ensDomain && info.ensDomain.length > 0 && (
                <div
                  className="w-full"
                  style={{ ...getTemplateBlockStyle("ens") }}
                >
                  <Ens
                    number={0}
                    key={ensDomain._id}
                    data={ensDomain}
                    socialType="ens"
                    parentId={parentId}
                    accessToken={accessToken || ""}
                    fontColor={fontColor}
                    secondaryFontColor={secondaryFontColor}
                  />
                </div>
              )}

              {/* Contact card */}
              {info?.contact && info.contact.length > 0 && (
                <>
                  {info.contact.map((social: any, index: number) => (
                    <div
                      key={social._id}
                      className="w-full"
                      style={{
                        ...getTemplateBlockStyle(
                          getSmartsiteTemplateItemKey("contact", social, index),
                        ),
                      }}
                    >
                      <Contact
                        number={index}
                        data={social}
                        socialType="contact"
                        parentId={parentId}
                        accessToken={accessToken || ""}
                        fontColor={fontColor}
                        secondaryFontColor={secondaryFontColor}
                      />
                    </div>
                  ))}
                </>
              )}

              {/* InfoBar */}
              {info?.infoBar && info.infoBar.length > 0 && (
                <>
                  {info.infoBar.map((social: any, index: number) => (
                    <div
                      key={social._id}
                      className="w-full"
                      style={{
                        ...getTemplateBlockStyle(
                          getSmartsiteTemplateItemKey("infoBar", social, index),
                        ),
                      }}
                    >
                      <InfoBar
                        number={index}
                        data={social}
                        socialType="infoBar"
                        parentId={parentId}
                        accessToken={accessToken || ""}
                        fontColor={fontColor}
                        secondaryFontColor={secondaryFontColor}
                      />
                    </div>
                  ))}
                </>
              )}

              {/* Product Payment */}
              {info?.product && info.product.length > 0 && (
                <>
                  {info.product.map((social: any, index: number) => (
                    <div
                      key={social._id}
                      className="w-full"
                      style={{
                        ...getTemplateBlockStyle(
                          getSmartsiteTemplateItemKey("product", social, index),
                        ),
                      }}
                    >
                      <PaymentBar
                        number={index}
                        data={social}
                        socialType="product"
                        parentId={parentId}
                        accessToken={accessToken || ""}
                        fontColor={fontColor}
                        secondaryFontColor={secondaryFontColor}
                      />
                    </div>
                  ))}
                </>
              )}

              {/* Audio */}
              {info?.audio && info.audio.length > 0 && (
                <>
                  {info.audio.map((social: any, index: number) => (
                    <div
                      key={social._id}
                      className="w-full mt-1"
                      style={{
                        ...getTemplateBlockStyle(
                          getSmartsiteTemplateItemKey("audio", social, index),
                        ),
                      }}
                    >
                      <MP3
                        number={index}
                        data={social}
                        socialType="audio"
                        parentId={parentId}
                        length={info.audio.length}
                        fontColor={fontColor}
                        secondaryFontColor={secondaryFontColor}
                      />
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Image / Video Section */}
            {info?.video && info.video.length > 0 && (
              <div
                className="w-full"
                style={{ ...getTemplateBlockStyle("video") }}
              >
                <MediaList
                  items={info.video}
                  getMediaType={getMediaType}
                  fontColor={fontColor}
                />
              </div>
            )}

            {/* Embeded Link */}
            {info?.videoUrl && info.videoUrl.length > 0 && (
              <>
                {info.videoUrl.map((social: any, index: number) => (
                  <div
                    key={social._id}
                    className="w-full"
                    style={{
                      ...getTemplateBlockStyle(
                        getSmartsiteTemplateItemKey("videoUrl", social, index),
                      ),
                    }}
                  >
                    <EmbedVideo data={social} />
                  </div>
                ))}
              </>
            )}

            {/* Widgets (tip jar / leads form) */}
            {info?.widget && info.widget.length > 0 && (
              <>
                {info.widget.map((item: any, index: number) => (
                  <div
                    key={item._id}
                    className="w-full"
                    style={{
                      ...getTemplateBlockStyle(
                        getSmartsiteTemplateItemKey("widget", item, index),
                      ),
                    }}
                  >
                    {item.widgetType === "tipJar" ? (
                      <TipJarCard
                        widgetId={item._id}
                        config={item.config || {}}
                        mode="public"
                        parentId={parentId}
                        micrositeId={_id}
                      />
                    ) : item.widgetType === "leadForm" ? (
                      <LeadFormCard
                        widgetId={item._id}
                        config={item.config || {}}
                        mode="public"
                        parentId={parentId}
                        micrositeId={_id}
                      />
                    ) : null}
                  </div>
                ))}
              </>
            )}

            {micrositeData?.showFeed && (
              // <LivePreviewTimeline
              //   accessToken={accessToken || ""}
              //   userId={user?._id || ""}
              //   micrositeId={micrositeData._id}
              //   isPostLoading={false}
              //   isPosting={false}
              //   setIsPostLoading={() => {}}
              //   setIsPosting={() => {}}
              //   isFromPublicProfile={true}
              // />
              <div
                className={
                  // Feed-only tab: the panel stretches to fill everything
                  // below the tab bar (main is a min-h-screen flex column),
                  // and the feed inside paginates with the page scroll.
                  isFeedPlain ? "w-full grow flex flex-col" : "w-full"
                }
                style={{ ...getTemplateBlockStyle("feed") }}
              >
                <EmbeddedFeed
                  accessToken={accessToken || ""}
                  userId={user?._id || accessUserIdFromCookie || ""}
                  micrositeId={micrositeData._id}
                  plain={isFeedPlain}
                />
              </div>
            )}

            {/* Footer stays below every band (tab content is 1000+i) */}
            <div style={{ order: 10000 }}>
              <Footer brandIcon="/brand-icon.svg" />
            </div>
          </CartProvider>
        </main>
        <Toaster />
      </div>
    </>
  );
}
