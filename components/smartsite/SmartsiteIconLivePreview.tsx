"use client";
import Image from "next/image";
import React, { FC, useEffect, useState } from "react";
import swop from "@/public/images/live-preview/swop.svg";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";
import useUpdateSmartIcon from "@/zustandStore/UpdateSmartIcon";
import useSmallIconToggleStore from "@/zustandStore/SmallIconModalToggle";
import useSideBarToggleStore from "@/zustandStore/SideBarToggleStore";
import {
  Modal,
  ModalBody,
  ModalContent,
  useDisclosure,
} from "@nextui-org/react";
// import { handleSmartSiteUpdate } from "@/actions/update";
// import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AnimateButton from "../ui/Button/AnimateButton";
import { fontMap } from "@/lib/fonts";
import { MdDelete, MdDeleteForever } from "react-icons/md";
import { handleDeleteMarketPlace } from "@/actions/handleMarketPlace";
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

const SmartsiteIconLivePreview = ({
  data,
}: {
  isEditDetailsLivePreview?: boolean;
  data?: any;
}) => {
  const setSmartSiteData = useUpdateSmartIcon((state: any) => state.setState);

  const { isOn, setOff, setOn }: any = useSmallIconToggleStore();
  const iconData: any = useUpdateSmartIcon();

  console.log("state iconData", iconData);
  // const [isPrimaryMicrosite, setIsPrimaryMicrosite] = useState<boolean>(false);
  // const [isLeadCapture, setIsLeadCapture] = useState<boolean>(false);

  // const [isPublishedLoading, setIsPublishedLoading] = useState(false);

  // console.log("data form live", data.info.socialLarge);
  const { formData, setFormData } = useSmartsiteFormStore();

  // console.log("form data from live preview data", data.info.socialLarge);

  const setSmartSiteApiData = useSmartSiteApiDataStore(
    (state: any) => state.setSmartSiteData,
  );

  const { user, accessToken } = useUser();

  console.log("formDatagg", formData);

  useEffect(() => {
    if (data) {
      setSmartSiteApiData(data);
    }
  }, [data, setSmartSiteApiData]);

  const handleTriggerUpdate = (data: {
    data: any;
    categoryForTrigger: string;
  }) => {
    setSmartSiteData(data);
    setOn(true);
  };

  useEffect(() => {
    if (data) {
      setFormData("name", data.name);
      setFormData("bio", data.bio);
      setFormData("profileImg", data.profilePic);
      setFormData("backgroundImg", data.backgroundImg);
      setFormData("theme", data.theme);
      setFormData("backgroundColor", data.backgroundColor);
      setFormData("fontColor", data.fontColor);
      setFormData("secondaryFontColor", data.secondaryFontColor);
      setFormData("fontType", data.fontFamily);
      setFormData("templateColor", data.themeColor);
    }
  }, [data, setFormData]);

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
      setIsMarketPlaceDeleteLoading(false);
      onOpenChange();
    } catch (error) {
      toast.error("Something Went Wrong!");
      console.log(error);
      setIsMarketPlaceDeleteLoading(false);
    }
  };

  const socialRows = distributeSmallIcons(data.info.socialTop);

  // Add this helper function at the top of your component or in a separate utils file
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

  return (
    <div
      style={{
        backgroundImage:
          formData.backgroundImg && !formData.backgroundColor
            ? `url(/images/smartsite-background/${formData.backgroundImg}.png)`
            : "none",
        backgroundColor: formData.backgroundColor && formData.backgroundColor,
      }}
      className="max-w-screen h-[calc(100vh-96px)] overflow-x-hidden -m-6 bg-cover bg-no-repeat overflow-y-auto"
    >
      <div className="relative max-w-md mx-auto h-full ">
        <section
          className={`${
            formData.fontType && fontMap[formData.fontType.toLowerCase()]
          }`}
        >
          <div className={`flex flex-col justify-between`}>
            <div>
              <div className={`space-y-5 h-full justify-start mt-10`}>
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
                  name={data.name}
                  bio={data.bio}
                  primaryFontColor={data.fontColor}
                  secondaryFontColor={data.secondaryFontColor}
                />

                {/* small icon display here start */}
                <div className="space-y-4">
                  {socialRows.map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="flex justify-center gap-x-6 gap-y-4 flex-wrap"
                    >
                      {row.map((item: any, index: number) => (
                        <SocialSmall
                          key={item.name}
                          number={index}
                          data={item}
                          socialType="socialTop"
                          fontColor={formData.fontColor}
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
                </div>
                {/* small icon display here end */}

                {/* marketPlace display here start */}
                {data.info.marketPlace.length > 0 && (
                  <div className="flex flex-col gap-y-5 px-3 overflow-x-hidden">
                    {Object.entries(
                      groupMarketPlaceByType(data.info.marketPlace),
                    ).map(([nftType, items]) => (
                      <div key={nftType} className="flex flex-col gap-y-1">
                        <h3
                          style={{
                            color: formData.fontColor
                              ? formData.fontColor
                              : "black",
                          }}
                          className="text-base font-medium capitalize mb-1"
                        >
                          {nftType === "phygital" ? "Product" : nftType}
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
                                  key={item._id}
                                  className={`${index === 0 ? "pl-2" : "pl-3"} basis-[45%]`}
                                >
                                  <div className="bg-white rounded-xl shadow-small hover:shadow-medium transition-all duration-200 relative overflow-hidden group">
                                    <button
                                      onClick={() =>
                                        handleMarketPlaceDelete(
                                          item._id,
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
                                          src={item.itemImageUrl}
                                          alt={item.itemName}
                                          fill
                                          quality={100}
                                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                                        />
                                      </div>

                                      <div className="p-3 pt-0">
                                        <div className="flex flex-col gap-0.5">
                                          <p
                                            style={{
                                              color: formData.fontColor
                                                ? formData.fontColor
                                                : "black",
                                            }}
                                            className="text-sm font-semibold line-clamp-1"
                                          >
                                            {item.itemName}
                                          </p>
                                          <p className="text-xs font-medium mt-0.5 bg-gray-100 w-max px-2 py-0.5 rounded-md">
                                            ${item.itemPrice}
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
                            {items.map((item: any) => (
                              <div
                                key={item._id}
                                className="bg-white rounded-xl shadow-small hover:shadow-medium transition-all duration-200 relative overflow-hidden group"
                              >
                                <button
                                  onClick={() =>
                                    handleMarketPlaceDelete(
                                      item._id,
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
                                      src={item.itemImageUrl}
                                      alt={item.itemName}
                                      fill
                                      quality={100}
                                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                  </div>

                                  <div className="p-3 pt-0">
                                    <div className="flex flex-col gap-0.5">
                                      <p
                                        style={{
                                          color: formData.fontColor
                                            ? formData.fontColor
                                            : "black",
                                        }}
                                        className="text-sm font-semibold line-clamp-1"
                                      >
                                        {item.itemName}
                                      </p>
                                      <p className="text-xs font-medium mt-0.5 bg-gray-100 w-max px-2 py-0.5 rounded-md">
                                        ${item.itemPrice}
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
                  </div>
                )}
                {/* marketPlace display here end */}

                {/* blog display here start */}
                {data.info.blog.length > 0 && (
                  <div className="flex flex-col gap-y-3 px-3">
                    {data.info.blog.map((item: any, index: number) => (
                      <div
                        key={index}
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
                                style={{ color: formData.fontColor }}
                                className="font-medium mt-1 truncate"
                              >
                                {item.title}
                              </p>
                            )}
                            {item?.headline && (
                              <p
                                style={{ color: formData.secondaryFontColor }}
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
                    ))}
                  </div>
                )}
                {/* blog display here end */}

                {/* app icon display here start */}
                {data.info.socialLarge.length > 0 && (
                  <div className="w-full flex flex-wrap items-center justify-center gap-y-6 my-4">
                    {data.info.socialLarge.map((social: any, index: number) => (
                      <SocialLarge
                        number={index}
                        key={index}
                        data={social}
                        socialType="socialLarge"
                        fontColor={formData.fontColor || "black"}
                        accessToken={accessToken || ""}
                        onClick={() =>
                          handleTriggerUpdate({
                            data: social,
                            categoryForTrigger: "socialLarge",
                          })
                        }
                      />
                    ))}
                  </div>
                )}
                {/* app icon display here end */}

                {/* referral display here start */}
                {data.info.referral.length > 0 && (
                  <div className="w-full">
                    {data.info.referral.map((social: any, index: number) => (
                      <Referral
                        number={index}
                        key={social._id}
                        onClick={() =>
                          handleTriggerUpdate({
                            data,
                            categoryForTrigger: "referral",
                          })
                        }
                        data={social}
                        socialType="referral"
                        accessToken={accessToken || ""}
                        fontColor={data.fontColor}
                        secondaryFontColor={data.secondaryFontColor}
                      />
                    ))}
                  </div>
                )}
                {/* referral display here end */}

                {/* card here  */}
                <div className="flex flex-col">
                  {/* message me display here start */}
                  {data.info.ensDomain.length > 0 && (
                    <div className="w-full">
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
                        key={data.info.ensDomain[0]._id}
                        data={data.info.ensDomain[0]}
                        socialType="ens"
                        fontColor={data.fontColor}
                        secondaryFontColor={data.secondaryFontColor}
                      />
                    </div>
                  )}

                  {/* redeemable link display here start */}
                  {data.info.redeemLink.length > 0 && (
                    <div className="w-full">
                      {data.info.redeemLink.map((item: any, index: number) => (
                        <Redeem
                          number={index}
                          key={item._id}
                          onClick={() =>
                            handleTriggerUpdate({
                              data: item,
                              categoryForTrigger: "redeemLink",
                            })
                          }
                          data={item}
                          socialType="redeemLink"
                          accessToken={accessToken || ""}
                          fontColor={data.fontColor}
                          secondaryFontColor={data.secondaryFontColor}
                        />
                      ))}
                    </div>
                  )}
                  {/* redeemable link display here start */}
                  {/* contact card display here start */}
                  {data.info.contact.length > 0 && (
                    <div className="w-full">
                      {data.info.contact.map((item: any, index: number) => (
                        <Contact
                          number={index}
                          key={item._id}
                          data={item}
                          socialType="contact"
                          accessToken={accessToken || ""}
                          fontColor={data.fontColor}
                          secondaryFontColor={data.secondaryFontColor}
                          onClick={() =>
                            handleTriggerUpdate({
                              data: item,
                              categoryForTrigger: "contactCard",
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                  {/* contact card display here end */}

                  {/* ENS display here start */}
                  {data.info.ensDomain.length > 0 && (
                    <div className="w-full">
                      <Ens
                        number={0}
                        key={data.info.ensDomain[0]._id}
                        data={data.info.ensDomain[0]}
                        socialType="ens"
                        // parentId={parentId}
                        accessToken={accessToken || ""}
                        fontColor={data.fontColor}
                        secondaryFontColor={data.secondaryFontColor}
                        onClick={() =>
                          handleTriggerUpdate({
                            data,
                            // data.info.ensDomain[data.info.ensDomain.length -1],
                            categoryForTrigger: "ens",
                          })
                        }
                      />
                    </div>
                  )}
                  {/* ENS display here end */}

                  {/* info bar display here start */}
                  {data.info.infoBar.length > 0 && (
                    <div className="w-full">
                      {data.info.infoBar.map((item: any, index: number) => (
                        <InfoBar
                          number={index}
                          key={item._id}
                          data={item}
                          socialType="infoBar"
                          // parentId={parentId}
                          accessToken={accessToken || ""}
                          fontColor={data.fontColor}
                          secondaryFontColor={data.secondaryFontColor}
                        />
                      ))}
                    </div>
                  )}
                  {/* info bar display here end */}

                  {/* swop pay display here start */}
                  {data.info.product.length > 0 && (
                    <div className="w-full">
                      {data.info.product.map((item: any, index: number) => (
                        <PaymentBar
                          number={index}
                          key={item._id}
                          data={item}
                          socialType="product"
                          // parentId={parentId}
                          accessToken={accessToken || ""}
                          fontColor={data.fontColor}
                          secondaryFontColor={data.secondaryFontColor}
                          onClick={() =>
                            handleTriggerUpdate({
                              data: item,
                              categoryForTrigger: "swopPay",
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                  {/* swop pay display here end */}

                  {/* audio||music display here start */}
                  {data.info.audio.length > 0 && (
                    <div className="w-full">
                      {data.info.audio.map((audioData: any, index: number) => (
                        <MP3
                          number={index}
                          key={audioData._id}
                          onClick={() =>
                            handleTriggerUpdate({
                              data: audioData,
                              categoryForTrigger: "audio",
                            })
                          }
                          data={audioData}
                          socialType="audio"
                          length={data.info.audio.length}
                          fontColor={data.fontColor}
                          secondaryFontColor={data.secondaryFontColor}
                        />
                        // <div
                        //   key={audioData._id}
                        //   className="flex items-center gap-2 w-full overflow-hidden"
                        // >
                        //   <div
                        //     style={{
                        //       backgroundColor: formData.templateColor
                        //         ? formData.templateColor
                        //         : "white",
                        //     }}
                        //     className={`w-full h-full py-2 px-3 rounded-lg shadow-medium`}
                        //   >
                        //     <div className="flex items-center justify-between overflow-hidden">
                        //       <button
                        //         style={{
                        //           color: formData.secondaryFontColor
                        //             ? formData.secondaryFontColor
                        //             : "black",
                        //         }}
                        //         onClick={() =>
                        //           handleTriggerUpdate({
                        //             data: audioData,
                        //             categoryForTrigger: "audio",
                        //           })
                        //         }
                        //         className="flex items-center gap-2"
                        //       >
                        //         <div className="relative">
                        //           <Image
                        //             src={audioData.coverPhoto}
                        //             alt="cover photo"
                        //             width={120}
                        //             height={60}
                        //             className="w-14 h-10 rounded-md object-cover"
                        //           />
                        //         </div>
                        //         <div className="text-start text-sm">
                        //           <p className="font-medium">
                        //             {audioData.name}
                        //           </p>
                        //           <p className="text-xs">
                        //             Tap play button to listen the audio
                        //           </p>
                        //         </div>
                        //       </button>
                        //       <div className="custom-audio">
                        //         <AudioPlayer
                        //           style={{
                        //             backgroundColor: formData.templateColor,
                        //           }}
                        //           key={audioData.fileUrl}
                        //           autoPlay={false}
                        //           src={audioData.fileUrl}
                        //           showJumpControls={false}
                        //           customAdditionalControls={[]}
                        //           customVolumeControls={[]}
                        //           layout="stacked-reverse"
                        //           className={`!w-max !p-0 !shadow-none translate-y-1 rounded-full translate-x-4`}
                        //           customIcons={{
                        //             play: (
                        //               <FaPlay
                        //                 // style={{
                        //                 //   color: formData.secondaryFontColor,
                        //                 // }}
                        //                 className="text-xl"
                        //               />
                        //             ), // Your custom play icon
                        //             pause: (
                        //               <FaPause
                        //                 // style={{
                        //                 //   color: formData.secondaryFontColor,
                        //                 // }}
                        //                 className="text-xl"
                        //               />
                        //             ), // Your custom pause icon
                        //           }}
                        //         />
                        //       </div>
                        //     </div>
                        //   </div>
                        // </div>
                      ))}
                    </div>
                  )}
                  {/* audio||music display here end */}
                </div>

                {/* Image / Video Section */}
                {data.info.video.length > 0 && (
                  <MediaList
                    items={data.info.video}
                    getMediaType={getMediaType}
                    fontColor={data.fontColor}
                    onClick={(item, index) =>
                      handleTriggerUpdate({
                        data: item,
                        categoryForTrigger: "video",
                      })
                    }
                  />
                )}

                {/* Embeded Link */}
                {data.info?.videoUrl && data.info.videoUrl.length > 0 && (
                  <div className="w-full space-y-3">
                    {data.info.videoUrl.map((social: any, index: number) => (
                      <EmbedVideo
                        key={social._id}
                        data={social}
                        onClick={() =>
                          handleTriggerUpdate({
                            data: social,
                            categoryForTrigger: "embed",
                          })
                        }
                      />
                    ))}
                  </div>
                )}
                {/* embed link display here end */}
              </div>

              {data?.showFeed && accessToken && user && (
                <LivePreviewTimeline
                  accessToken={accessToken}
                  userId={user?._id}
                  isPostLoading={false}
                  isPosting={false}
                  setIsPostLoading={() => {}}
                  setIsPosting={() => {}}
                />
              )}
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
