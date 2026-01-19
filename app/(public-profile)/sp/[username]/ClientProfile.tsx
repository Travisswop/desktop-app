"use client";

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
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { CartProvider } from "./cart/context/CartContext";
import { useUser } from "@/lib/UserContext";
import LivePreviewTimeline from "@/components/feed/LivePreviewTimeline";
import { useMicrositeData } from "./context/MicrositeContext";
import TokenGateVerification from "@/components/publicProfile/TokenGateVerification";
import distributeSmallIcons from "@/components/util/distributeSmallIcons";
import { fontMap } from "@/lib/fonts";

interface ClientProfileProps {
  userName: string;
}

export default function ClientProfile({ userName }: ClientProfileProps) {
  const { micrositeData } = useMicrositeData();
  const { user, accessToken } = useUser();

  if (!micrositeData) {
    return <div>Loading...</div>;
  }

  if (micrositeData.redirect) {
    redirect(`/sp/${micrositeData.username}`);
  }

  console.log("micrositeData", micrositeData);

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

  console.log("info.infoBar", info.infoBar);

  const groupMarketPlaceByType = (marketPlaceItems: any[]) => {
    const grouped: { [key: string]: any[] } = {};

    marketPlaceItems.forEach((item) => {
      const nftType = item.templateId?.nftType || "other";
      if (!grouped[nftType]) {
        grouped[nftType] = [];
      }
      grouped[nftType].push(item);
    });

    return grouped;
  };

  const ensDomain = info.ensDomain[info.ensDomain.length - 1];

  return (
    <>
      {/* Token Gate Verification Modal - Shows when gatedInfo.isOn is true */}
      {gatedInfo?.isOn && (
        <TokenGateVerification gatedInfo={gatedInfo} micrositeName={name} />
      )}

      <div
        style={{
          backgroundImage: backgroundImg
            ? `url(/images/smartsite-background/${backgroundImg}.png)`
            : "none",
          backgroundColor: backgroundColor && backgroundColor,
        }}
        className={`bg-cover scrollbar-hide bg-no-repeat h-screen overflow-y-auto px-4 lg:px-0 pt-6 ${
          fontFamily ? fontMap[fontFamily?.toLowerCase() || "roboto"] : ""
        }`}
      >
        <main
          className={`flex max-w-md mx-auto min-h-screen flex-col items-center z-50 space-y-5`}
        >
          <CartProvider>
            <Header
              avatar={profilePic}
              // cover={backgroundImg.toString()}
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

            {/* Social Media Small */}
            {info?.socialTop && info.socialTop.length > 0 && (
              <div className="space-y-4">
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

            {/* market place - Grouped by nftType */}
            {info?.marketPlace && info.marketPlace.length > 0 && (
              <div className="w-full space-y-3 mb-4">
                {Object.entries(groupMarketPlaceByType(info.marketPlace)).map(
                  ([nftType, items]: [string, any[]]) => (
                    <div key={nftType} className="w-full">
                      {/* Group Title */}
                      <h2
                        style={{
                          color: fontColor ? fontColor : "black",
                        }}
                        className="text-base font-semibold capitalize mb-1"
                      >
                        {nftType}
                      </h2>

                      {/* If items > 2, show carousel, else show grid */}
                      {items.length > 2 ? (
                        <Carousel
                          opts={{
                            align: "start",
                            loop: true,
                            slidesToScroll: 2,
                          }}
                          className="w-full"
                        >
                          <CarouselContent className="-ml-2 md:-ml-4">
                            {items.map((item, index) => (
                              <CarouselItem
                                key={item._id}
                                className="pl-2 md:pl-3 basis-[45%]"
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
                        <div className="grid grid-cols-2 gap-2">
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
                              secondaryFontColor={secondaryFontColor}
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
              <div className="w-full">
                {info.blog.map((social: any, index: number) => (
                  <Blog
                    number={index}
                    key={social._id}
                    data={social}
                    socialType="blog"
                    parentId={parentId}
                    fontColor={fontColor}
                    secondaryFontColor={secondaryFontColor}
                  />
                ))}
              </div>
            )}
            {/* Social Media Big */}
            {info?.socialLarge && info.socialLarge.length > 0 && (
              <div className="w-full grid grid-cols-3 gap-4 sm:gap-10 my-4">
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
            >
              {/* Message */}
              {/* ENS */}
              {info?.ensDomain && info.ensDomain.length > 0 && (
                <div className="w-full">
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
                <div className="w-full">
                  {info.redeemLink.map((social: any, index: number) => (
                    <Redeem
                      number={index}
                      key={social._id}
                      data={social}
                      socialType="redeemLink"
                      parentId={parentId}
                      accessToken={accessToken || ""}
                    />
                  ))}
                </div>
              )}

              {/* Referral Code */}
              {info.referral && info.referral.length > 0 && (
                <div className="w-full">
                  {info.referral.map((social: any, index: number) => (
                    <Referral
                      number={index}
                      key={social._id}
                      data={social}
                      socialType="referral"
                      parentId={parentId}
                      accessToken={accessToken || ""}
                    />
                  ))}
                </div>
              )}

              {/* ENS */}
              {info?.ensDomain && info.ensDomain.length > 0 && (
                <div className="w-full">
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
                <div className="w-full">
                  {info.contact.map((social: any, index: number) => (
                    <Contact
                      number={index}
                      key={social._id}
                      data={social}
                      socialType="contact"
                      parentId={parentId}
                      accessToken={accessToken || ""}
                      fontColor={fontColor}
                      secondaryFontColor={secondaryFontColor}
                    />
                  ))}
                </div>
              )}

              {/* InfoBar */}
              {info?.infoBar && info.infoBar.length > 0 && (
                <div className="w-full">
                  {info.infoBar.map((social: any, index: number) => (
                    <InfoBar
                      number={index}
                      key={social._id}
                      data={social}
                      socialType="infoBar"
                      parentId={parentId}
                      accessToken={accessToken || ""}
                      fontColor={fontColor}
                      secondaryFontColor={secondaryFontColor}
                    />
                  ))}
                </div>
              )}

              {/* Product Payment */}
              {info?.product && info.product.length > 0 && (
                <div className="w-full">
                  {info.product.map((social: any, index: number) => (
                    <PaymentBar
                      number={index}
                      key={social._id}
                      data={social}
                      socialType="product"
                      parentId={parentId}
                      accessToken={accessToken || ""}
                      fontColor={fontColor}
                      secondaryFontColor={secondaryFontColor}
                    />
                  ))}
                </div>
              )}

              {/* Audio */}
              {info?.audio && info.audio.length > 0 && (
                <div className="w-full mt-1">
                  {info.audio.map((social: any, index: number) => (
                    <MP3
                      number={index}
                      key={social._id}
                      data={social}
                      socialType="audio"
                      parentId={parentId}
                      length={info.audio.length}
                      fontColor={fontColor}
                      secondaryFontColor={secondaryFontColor}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Video */}
            {info?.video && info.video.length > 0 && (
              <div className="w-full">
                {info.video.map((social: any, index: number) => (
                  <div key={index} className="my-2">
                    <video
                      className="w-full h-76 max-w-full border border-gray-200 rounded-lg dark:border-gray-700"
                      controls
                    >
                      <source src={social.link} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ))}
              </div>
            )}

            {/* Embeded Link */}
            {info?.videoUrl && info.videoUrl.length > 0 && (
              <div className="w-full">
                {info.videoUrl.map((social: any, index: number) => (
                  <EmbedVideo key={social._id} data={social} />
                ))}
              </div>
            )}

            {micrositeData?.showFeed && (
              <LivePreviewTimeline
                accessToken={accessToken || ""}
                userId={user?._id || ""}
                micrositeId={micrositeData._id}
                isPostLoading={false}
                isPosting={false}
                setIsPostLoading={() => {}}
                setIsPosting={() => {}}
                isFromPublicProfile={true}
              />
            )}

            {/* Message */}
            <div>
              <Footer brandIcon="/brand-icon.svg" />
            </div>
          </CartProvider>
        </main>
        <Toaster />
      </div>
    </>
  );
}
