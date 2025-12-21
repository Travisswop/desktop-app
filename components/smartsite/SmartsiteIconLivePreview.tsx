"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import swop from "@/public/images/live-preview/swop.svg";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";
import useUpdateSmartIcon from "@/zustandStore/UpdateSmartIcon";
import useSmallIconToggleStore from "@/zustandStore/SmallIconModalToggle";
import { FaEdit, FaPause, FaPlay } from "react-icons/fa";
import useSideBarToggleStore from "@/zustandStore/SideBarToggleStore";
import AudioPlayer from "react-h5-audio-player";
import referral from "@/public/images/websites/referral.jpeg";
import ethereum from "@/public/images/social-icon/ethereum.png";
import card from "@/public/images/social-icon/card.png";
import message from "@/public/images/social-icon/message.png";
import isUrl from "@/lib/isUrl";
import { tintStyle } from "../util/IconTintStyle";
import getSmallIconImage from "./retriveIconImage/getSmallIconImage";
import EmbedPlayer from "./embed/renderEmbedPlayer";
import getAllSmartsitesIcon from "./retriveIconImage/getAllSmartsiteIcon";
import {
  Modal,
  ModalBody,
  ModalContent,
  useDisclosure,
} from "@nextui-org/react";
import { handleSmartSiteUpdate } from "@/actions/update";
import { useRouter } from "next/navigation";
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

const SmartsiteIconLivePreview = ({
  data,
}: {
  isEditDetailsLivePreview?: boolean;
  data?: any;
}) => {
  const setSmartSiteData = useUpdateSmartIcon((state: any) => state.setState);
  const { toggle } = useSideBarToggleStore();

  console.log("data hhiss", data);

  const { isOn, setOff, setOn }: any = useSmallIconToggleStore();
  const iconData: any = useUpdateSmartIcon();

  const [isPrimaryMicrosite, setIsPrimaryMicrosite] = useState<boolean>(false);
  const [isLeadCapture, setIsLeadCapture] = useState<boolean>(false);

  const [isPublishedLoading, setIsPublishedLoading] = useState(false);

  // console.log("data form live", data.info.socialLarge);
  const { formData, setFormData } = useSmartsiteFormStore();

  // console.log("form data from live preview data", data.info.socialLarge);

  const setSmartSiteApiData = useSmartSiteApiDataStore(
    (state: any) => state.setSmartSiteData
  );

  const { user, accessToken } = useUser();

  console.log("user", user);

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
    if (data.primary) {
      setIsPrimaryMicrosite(true);
    }
    if (data.leadCapture) {
      setIsLeadCapture(true);
    }
  }, [data.leadCapture, data.primary]);

  // console.log("audio", data.info.audio);

  // console.log("formdata", formData);
  // console.log("data from live preview", data);
  const router = useRouter();

  useEffect(() => {
    if (data) {
      setFormData("theme", data.theme);
      setFormData("fontType", data.fontFamily);
      setFormData("fontColor", data.fontColor);
      setFormData("secondaryFontColor", data.secondaryFontColor);
      setFormData("templateColor", data.themeColor);
      setFormData("backgroundColor", data.backgroundColor);
      setFormData("backgroundImg", data.backgroundImg);
      setFormData("profileImg", data.profilePic);
    }
  }, [data, setFormData]);

  const handleSmartSiteUpdateInfo = async (e: any) => {
    setIsPublishedLoading(true);
    e.preventDefault();

    const smartSiteInfo = {
      _id: data._id,
      primary: isPrimaryMicrosite,
      leadCapture: isLeadCapture,
    };

    try {
      const response = await handleSmartSiteUpdate(smartSiteInfo, accessToken);

      if (response.state === "success") {
        router.push("/smartsite");
        toast.success("Smartsite published successfully");
      } else if (response.state === "fail") {
        toast.error(
          response.message || "At least one primary smartsite required"
        );
      }
    } catch (error: any) {
      toast.error("Something went wrong!");
      console.log("error", error);
    } finally {
      setIsPublishedLoading(false);
    }
  };

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

      const response = await handleDeleteMarketPlace(payload, accessToken);

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

  const distributeIcons = (icons: any[]) => {
    const length = icons.length;
    let rows: any[][] = [];
    if (length <= 6) {
      rows = [icons]; // Single row
    } else if (length <= 11) {
      const firstRow = Math.ceil(length / 2) - 1;
      // const secondRow = Math.ceil(length / 2) + 1;
      rows = [icons.slice(0, firstRow), icons.slice(firstRow)];
    } else if (length <= 14) {
      const firstRow = Math.ceil(length / 3) - 2;
      const secondRow = Math.ceil(length / 3);
      // const thirdRow = Math.ceil(length / 3) + 2;
      rows = [
        icons.slice(0, firstRow),
        icons.slice(firstRow, firstRow + secondRow),
        icons.slice(firstRow + secondRow),
      ];
    } else if (length === 15) {
      const firstRow = 4;
      const secondRow = 5;
      // const thirdRow = Math.ceil(length / 3) + 2;
      rows = [
        icons.slice(0, firstRow),
        icons.slice(firstRow, firstRow + secondRow),
        icons.slice(firstRow + secondRow),
      ];
    } else if (length === 16) {
      const firstRow = 4;
      const secondRow = 6;
      // const thirdRow = Math.ceil(length / 3) + 2;
      rows = [
        icons.slice(0, firstRow),
        icons.slice(firstRow, firstRow + secondRow),
        icons.slice(firstRow + secondRow),
      ];
    } else if (length === 17) {
      const firstRow = 5;
      const secondRow = 6;
      // const thirdRow = Math.ceil(length / 3) + 2;
      rows = [
        icons.slice(0, firstRow),
        icons.slice(firstRow, firstRow + secondRow),
        icons.slice(firstRow + secondRow),
      ];
    } else if (length === 18) {
      const firstRow = 6;
      const secondRow = 6;
      // const thirdRow = Math.ceil(length / 3) + 2;
      rows = [
        icons.slice(0, firstRow),
        icons.slice(firstRow, firstRow + secondRow),
        icons.slice(firstRow + secondRow),
      ];
    } else {
      // For lengths greater than 18, distribute icons into rows with a maximum of 6 icons per row
      let start = 0;
      while (start < length) {
        rows.push(icons.slice(start, start + 6));
        start += 6;
      }
    }

    return rows;
  };

  const socialRows = distributeIcons(data.info.socialTop);

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

  // Capitalize first letter for display
  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div
      style={{
        backgroundImage: formData.theme
          ? `url(/images/smartsite-background/${formData.backgroundImg}.png)`
          : "none",
      }}
      className="max-w-screen h-[calc(100vh-96px)] overflow-x-hidden -m-6 bg-cover bg-no-repeat overflow-y-auto"
    >
      <div className="relative min-w-96 max-w-[500px] mx-auto h-full ">
        <section
          className={`${
            formData.fontType && fontMap[formData.fontType.toLowerCase()]
          }`}
        >
          <div className={`flex flex-col justify-between`}>
            <div>
              <div className="relative">
                {!formData.theme && (
                  <div className="bg-white p-2 rounded-xl shadow-md">
                    <Image
                      alt="banner image"
                      src={`/images/smartsite-banner/${formData.backgroundImg}.png`}
                      width={900}
                      height={400}
                      quality={100}
                      className="rounded-xl w-full h-auto"
                    />
                  </div>
                )}

                <div
                  className={` ${
                    !formData.theme
                      ? "absolute top-full -translate-y-1/2 left-1/2 -translate-x-1/2"
                      : "flex justify-center pt-10"
                  } `}
                >
                  {formData.profileImg && (
                    <>
                      {isUrl(formData.profileImg) ? (
                        <div className="relative w-28 xl:w-32 h-28 xl:h-32 overflow-hidden border-3 border-white rounded-full">
                          <Image
                            alt="user image"
                            src={formData.profileImg}
                            quality={100}
                            fill
                          />
                        </div>
                      ) : (
                        <div className="w-28 xl:w-32 h-28 xl:h-32 overflow-hidden border-3 border-white rounded-full">
                          <Image
                            alt="user image"
                            src={`/images/user_avator/${formData.profileImg}@3x.png`}
                            width={1200}
                            height={1200}
                            quality={100}
                            className="w-full h-full shadow-medium"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div
                className={`${
                  !formData.theme ? "mt-14" : "mt-2"
                }  flex flex-col gap-3 h-full justify-start`}
              >
                <div
                  className={`flex flex-col items-center text-center ${
                    formData.fontType &&
                    fontMap[formData.fontType.toLowerCase()]
                  }`}
                >
                  <p
                    style={{
                      color: formData.fontColor && formData.fontColor,
                    }}
                    className={`font-medium text-lg text-gray-900`}
                  >
                    {formData.name || data?.name}
                  </p>
                  <p
                    style={{
                      color: formData.fontColor && formData.fontColor,
                    }}
                    className={`font-medium text-sm text-gray-800`}
                  >
                    {formData.bio || data?.bio}
                  </p>
                </div>

                {/* small icon display here start */}
                {socialRows.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="flex justify-center gap-x-4 gap-y-2 flex-wrap"
                  >
                    {row.map((item: any, index: number) => (
                      <button
                        key={index}
                        onClick={() =>
                          handleTriggerUpdate({
                            data: item,
                            categoryForTrigger: "socialTop",
                          })
                        }
                      >
                        <Image
                          src={getSmallIconImage(item.name, item.group) as any}
                          alt="icon"
                          style={
                            formData.templateColor === "#ffffff" ||
                            formData.templateColor === "#FFFFFF"
                              ? { filter: "brightness(0) invert(1)" }
                              : formData.templateColor === "#D3D3D3" ||
                                formData.templateColor === "#808080"
                              ? {
                                  filter:
                                    "brightness(0) saturate(0%) opacity(0.5)",
                                }
                              : tintStyle
                          }
                          className="w-5 h-auto"
                          width={1200}
                          height={1200}
                          quality={100}
                        />
                      </button>
                    ))}
                  </div>
                ))}
                {/* small icon display here end */}

                {/* marketPlace display here start */}
                {data.info.marketPlace.length > 0 && (
                  <div className="flex flex-col gap-y-5 px-3">
                    {Object.entries(
                      groupMarketPlaceByType(data.info.marketPlace)
                    ).map(([nftType, items]) => (
                      <div key={nftType} className="flex flex-col gap-y-3">
                        <h3
                          style={{
                            color: formData.fontColor
                              ? formData.fontColor
                              : "black",
                          }}
                          className="text-base font-bold"
                        >
                          {capitalizeFirstLetter(nftType)}
                        </h3>

                        {items.length > 2 ? (
                          <Carousel
                            opts={{
                              align: "start",
                              loop: false,
                            }}
                            className="w-full"
                          >
                            <CarouselContent className="-ml-2 md:-ml-3">
                              {items.map((item: any) => (
                                <CarouselItem
                                  key={item._id}
                                  className="pl-2 md:pl-3 basis-[45%]"
                                >
                                  <div
                                    style={{
                                      backgroundColor: formData.templateColor
                                        ? formData.templateColor
                                        : "white",
                                    }}
                                    className="rounded-xl shadow-small hover:shadow-medium transition-all duration-200 relative overflow-hidden group"
                                  >
                                    <button
                                      onClick={() =>
                                        handleMarketPlaceDelete(
                                          item._id,
                                          item.micrositeId
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
                                      <div className="relative w-full aspect-square overflow-hidden">
                                        <Image
                                          src={item.itemImageUrl}
                                          alt={item.itemName}
                                          fill
                                          quality={100}
                                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                                        />
                                      </div>

                                      <div className="p-3">
                                        <div
                                          style={{
                                            color: formData.secondaryFontColor
                                              ? formData.secondaryFontColor
                                              : "black",
                                          }}
                                          className="flex flex-col gap-0.5"
                                        >
                                          <p className="text-sm font-semibold line-clamp-1">
                                            {item.itemName}
                                          </p>
                                          <p className="text-xs font-medium mt-0.5">
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
                          <div className="grid grid-cols-2 gap-3">
                            {items.map((item: any) => (
                              <div
                                key={item._id}
                                style={{
                                  backgroundColor: formData.templateColor
                                    ? formData.templateColor
                                    : "white",
                                }}
                                className="rounded-xl shadow-small hover:shadow-medium transition-all duration-200 relative overflow-hidden group"
                              >
                                <button
                                  onClick={() =>
                                    handleMarketPlaceDelete(
                                      item._id,
                                      item.micrositeId
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
                                  <div className="relative w-full aspect-square overflow-hidden">
                                    <Image
                                      src={item.itemImageUrl}
                                      alt={item.itemName}
                                      fill
                                      quality={100}
                                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                  </div>

                                  <div className="p-3">
                                    <div
                                      style={{
                                        color: formData.secondaryFontColor
                                          ? formData.secondaryFontColor
                                          : "black",
                                      }}
                                      className="flex flex-col gap-0.5"
                                    >
                                      <p className="text-sm font-semibold line-clamp-1">
                                        {item.itemName}
                                      </p>
                                      <p className="text-xs font-medium mt-0.5">
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
                        style={{
                          backgroundColor: formData.templateColor
                            ? formData.templateColor
                            : "white",
                        }}
                        className="shadow-small hover:shadow-medium p-2 2xl:p-3 rounded-lg cursor-pointer"
                      >
                        <div>
                          <div>
                            <div className="relative">
                              <Image
                                src={item.image}
                                alt={item.title}
                                width={600}
                                height={400}
                                className="w-full h-24 2xl:h-28 object-cover rounded-lg"
                              />
                            </div>
                            <div
                              style={{
                                color: formData.secondaryFontColor
                                  ? formData.secondaryFontColor
                                  : "black",
                              }}
                            >
                              {item?.title && (
                                <p className="text-sm font-medium mt-1">
                                  {item.title}
                                </p>
                              )}
                              {item?.headline && (
                                <p className="text-xs truncate">
                                  {item.headline}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-end items-center mt-3 gap-2">
                          {/* <button
                              type="button"
                              onClick={() =>
                                handleTriggerUpdate({
                                  data: item,
                                  categoryForTrigger: "blog",
                                })
                              }
                              style={{
                                backgroundColor:
                                  formData.templateColor && formData.fontColor,

                                color: formData.templateColor,
                              }}
                              className="rounded-lg bg-white flex items-center gap-1 px-5 py-1.5"
                            >
                              <FaEdit /> Edit
                            </button> */}

                          <button
                            type="button"
                            onClick={(e) => showReadMoreForBlog(e, item)}
                            style={{
                              backgroundColor: formData.secondaryFontColor
                                ? formData.secondaryFontColor
                                : "black",
                            }}
                            className="rounded-full text-white flex items-center gap-1 px-3 py-0.5 text-[12px] font-medium"
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
                  <div className="flex flex-wrap gap-x-1 gap-y-3 justify-center items-start px-3">
                    {data.info.socialLarge.map((data: any, index: number) => (
                      <div
                        className={`w-[32%] flex flex-col items-center justify-between gap-1`}
                        key={index}
                      >
                        <button
                          onClick={() =>
                            handleTriggerUpdate({
                              data,
                              categoryForTrigger: "socialLarge",
                            })
                          }
                        >
                          {isUrl(data.iconName) ? (
                            <div className="relative w-[4.2rem] h-[4.2rem] rounded-lg">
                              <Image
                                src={data.iconName}
                                alt="icon"
                                className="rounded-lg object-cover"
                                quality={100}
                                fill
                              />
                            </div>
                          ) : (
                            <div className="relative w-[4.2rem] h-[4.2rem] rounded-lg">
                              <Image
                                src={getAllSmartsitesIcon(data.iconName) as any}
                                alt="icon"
                                // style={tintStyle}
                                className="rounded-lg object-cover"
                                quality={100}
                              />
                            </div>
                          )}
                        </button>
                        <p
                          style={{
                            color: formData.fontColor
                              ? formData.fontColor
                              : "black",
                          }}
                          className="text-xs font-medium text-center"
                        >
                          {data.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {/* app icon display here end */}

                {/* referral display here start */}
                {data.info.referral.length > 0 && (
                  <div className="flex flex-col gap-y-3 px-3">
                    {data.info.referral.map((data: any) => (
                      <button
                        key={data._id}
                        onClick={() =>
                          handleTriggerUpdate({
                            data,
                            categoryForTrigger: "referral",
                          })
                        }
                        style={{
                          backgroundColor: formData.templateColor
                            ? formData.templateColor
                            : "white",
                        }}
                        className="flex items-center gap-2 py-2 px-3 rounded-lg shadow-medium"
                      >
                        <Image
                          src={referral}
                          alt="icon"
                          quality={100}
                          className="w-8 h-8 rounded-lg"
                          style={
                            formData.secondaryFontColor === "#ffffff"
                              ? { filter: "brightness(0) invert(1)" }
                              : formData.secondaryFontColor === "#D3D3D3" ||
                                formData.secondaryFontColor === "#808080"
                              ? {
                                  filter:
                                    "brightness(0) saturate(0%) opacity(0.5)",
                                }
                              : tintStyle
                          }
                        />
                        <div
                          style={{
                            color: formData.secondaryFontColor
                              ? formData.secondaryFontColor
                              : "black",
                          }}
                          className="flex flex-col items-start gap-0.5 text-start"
                        >
                          <p className="text-sm">{data.buttonName}</p>
                          <p
                            className={`text-xs ${
                              !formData.secondaryFontColor && "text-gray-400"
                            }`}
                          >
                            {data.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {/* referral display here end */}

                {/* card here  */}
                <div className="flex flex-col gap-y-3">
                  {/* message me display here start */}
                  {data.info.ensDomain.length > 0 && (
                    <div className="flex flex-col gap-y-3 mx-3">
                      <button
                        // key={data._id}
                        onClick={() =>
                          handleTriggerUpdate({
                            // data,
                            data: data.info.ensDomain[
                              data.info.ensDomain.length - 1
                            ],
                            categoryForTrigger: "ens",
                          })
                        }
                        style={{
                          backgroundColor: formData.templateColor
                            ? formData.templateColor
                            : "white",
                        }}
                        className="flex items-center gap-2 py-2 px-3 rounded-lg shadow-medium"
                      >
                        <Image
                          src={message}
                          style={
                            formData.secondaryFontColor === "#ffffff"
                              ? { filter: "brightness(0) invert(1)" }
                              : formData.secondaryFontColor === "#D3D3D3" ||
                                formData.secondaryFontColor === "#808080"
                              ? {
                                  filter:
                                    "brightness(0) saturate(0%) opacity(0.5)",
                                }
                              : tintStyle
                          }
                          alt="icon"
                          quality={100}
                          className="w-8 h-8"
                        />
                        <div
                          style={{
                            color: formData.secondaryFontColor
                              ? formData.secondaryFontColor
                              : "black",
                          }}
                          className="flex flex-col items-start gap-0.5 text-start"
                        >
                          <p className="text-sm">Message Me</p>
                          <p
                            className={`text-xs ${
                              !formData.secondaryFontColor && "text-gray-400"
                            }`}
                          >
                            Message me on Swop
                          </p>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* redeemable link display here start */}
                  {data.info.redeemLink.length > 0 && (
                    <div className="flex flex-col gap-y-3 px-3">
                      {data.info.redeemLink.map((data: any) => (
                        <button
                          key={data._id}
                          onClick={() =>
                            handleTriggerUpdate({
                              data,
                              categoryForTrigger: "redeemLink",
                            })
                          }
                          style={{
                            backgroundColor: formData.templateColor
                              ? formData.templateColor
                              : "white",
                          }}
                          className="flex items-center gap-2 py-2 px-3 rounded-lg shadow-medium"
                        >
                          <Image
                            src={data.imageUrl}
                            alt="icon"
                            width={200}
                            height={200}
                            quality={100}
                            className="w-8 h-8 rounded-md"
                            // style={
                            //   formData.secondaryFontColor === "#ffffff"
                            //     ? { filter: "brightness(0) invert(1)" }
                            //     : formData.secondaryFontColor === "#D3D3D3" ||
                            //       formData.secondaryFontColor === "#808080"
                            //     ? {
                            //         filter:
                            //           "brightness(0) saturate(0%) opacity(0.5)",
                            //       }
                            //     : tintStyle
                            // }
                          />
                          <div
                            style={{
                              color: formData.secondaryFontColor
                                ? formData.secondaryFontColor
                                : "black",
                            }}
                            className="flex flex-col items-start gap-0.5 text-start"
                          >
                            <p className="text-sm">{data.mintName}</p>
                            <p
                              className={`text-xs ${
                                !formData.secondaryFontColor && "text-gray-400"
                              }`}
                            >
                              {data.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* redeemable link display here start */}
                  {/* contact card display here start */}
                  {data.info.contact.length > 0 && (
                    <div className="flex flex-col gap-y-3 px-3">
                      {data.info.contact.map((data: any) => (
                        <button
                          key={data._id}
                          onClick={() =>
                            handleTriggerUpdate({
                              data,
                              categoryForTrigger: "contactCard",
                            })
                          }
                          style={{
                            backgroundColor: formData.templateColor
                              ? formData.templateColor
                              : "white",
                          }}
                          className="flex items-center gap-2 py-2 px-3 rounded-lg shadow-medium"
                        >
                          <Image
                            src={card}
                            alt="icon"
                            quality={100}
                            className="w-8 h-8"
                            style={
                              formData.secondaryFontColor === "#ffffff"
                                ? {
                                    filter: "brightness(0) invert(1)",
                                  }
                                : formData.secondaryFontColor === "#D3D3D3" ||
                                  formData.secondaryFontColor === "#808080"
                                ? {
                                    filter:
                                      "brightness(0) saturate(0%) opacity(0.5)",
                                  }
                                : tintStyle
                            }
                          />
                          <div
                            style={{
                              color: formData.secondaryFontColor
                                ? formData.secondaryFontColor
                                : "black",
                            }}
                            className="flex flex-col items-start gap-0.5 text-start"
                          >
                            <p className="text-sm">{data.name}</p>
                            <p
                              className={`text-xs ${
                                !formData.secondaryFontColor && "text-gray-400"
                              }`}
                            >
                              {data.mobileNo}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* contact card display here end */}

                  {/* ENS display here start */}
                  {data.info.ensDomain.length > 0 && (
                    <div className="flex flex-col gap-y-3 px-3">
                      {/* {data.info.ensDomain.map((data: any) => (
                    <button
                      key={data._id}
                      onClick={() =>
                        handleTriggerUpdate({
                          data,
                          data.info.ensDomain[data.info.ensDomain.length -1],
                          categoryForTrigger: "ens",
                        })
                      }
                      className="flex items-center gap-3 bg-white py-2 px-3 rounded-lg shadow-medium"
                    >
                      <Image
                        src={ethereum}
                        style={tintStyle}
                        alt="icon"
                        width={40}
                        height={40}
                      />
                      <div className="flex flex-col items-start gap-0.5 text-start">
                        <p className="font-semibold text-gray-700">
                          {data.domain}
                        </p>
                        <p className="text-xs text-gray-400">
                          Pay me using my Swop.ID
                        </p>
                      </div>
                    </button>
                  ))} */}
                      <button
                        // key={data._id}
                        onClick={() =>
                          handleTriggerUpdate({
                            // data,
                            data: data.info.ensDomain[
                              data.info.ensDomain.length - 1
                            ],
                            categoryForTrigger: "ens",
                          })
                        }
                        style={{
                          backgroundColor: formData.templateColor
                            ? formData.templateColor
                            : "white",
                        }}
                        className="flex items-center gap-2 py-2 px-3 rounded-lg shadow-medium"
                      >
                        <Image
                          src={ethereum}
                          style={
                            formData.secondaryFontColor === "#ffffff"
                              ? { filter: "brightness(0) invert(1)" }
                              : formData.secondaryFontColor === "#D3D3D3" ||
                                formData.secondaryFontColor === "#808080"
                              ? {
                                  filter:
                                    "brightness(0) saturate(0%) opacity(0.5)",
                                }
                              : tintStyle
                          }
                          alt="icon"
                          quality={100}
                          className="w-8 h-8"
                        />
                        <div
                          style={{
                            color: formData.secondaryFontColor
                              ? formData.secondaryFontColor
                              : "black",
                          }}
                          className="flex flex-col items-start gap-0.5 text-start"
                        >
                          <p className="text-sm">
                            {
                              data.info.ensDomain[
                                data.info.ensDomain.length - 1
                              ].domain
                            }
                          </p>
                          <p
                            className={`text-xs ${
                              !formData.secondaryFontColor && "text-gray-400"
                            }`}
                          >
                            Pay me using my Swop.ID
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                  {/* ENS display here end */}

                  {/* info bar display here start */}
                  {data.info.infoBar.length > 0 && (
                    <div className="flex flex-col gap-y-3 px-3">
                      {data.info.infoBar.map((data: any) => (
                        <button
                          key={data._id}
                          onClick={() =>
                            handleTriggerUpdate({
                              data,
                              categoryForTrigger: "infoBar",
                            })
                          }
                          // disabled={isUrl(data.iconName)}
                          style={{
                            backgroundColor: formData.templateColor
                              ? formData.templateColor
                              : "white",
                          }}
                          className={`flex items-center gap-2 py-2 px-3 rounded-lg shadow-medium`}
                        >
                          {isUrl(data.iconName) ? (
                            <Image
                              src={data.iconName}
                              // src={getAppIconImage(data.iconName, data.group) as any}
                              alt="icon"
                              quality={100}
                              className="w-8 h-8 rounded-lg"
                              width={100}
                              height={100}
                            />
                          ) : (
                            <Image
                              src={getAllSmartsitesIcon(data.iconName) as any}
                              alt="icon"
                              quality={100}
                              className="w-8 h-8"
                            />
                          )}

                          <div
                            style={{
                              color: formData.secondaryFontColor
                                ? formData.secondaryFontColor
                                : "black",
                            }}
                            className="flex flex-col items-start gap-0.5 text-start"
                          >
                            <p className="text-sm">
                              {data.buttonName
                                ? data.buttonName
                                : data.iconName}
                            </p>
                            <p
                              className={`text-xs ${
                                !formData.secondaryFontColor && "text-gray-400"
                              }`}
                            >
                              {data.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* info bar display here end */}

                  {/* swop pay display here start */}
                  {data.info.product.length > 0 && (
                    <div className="flex flex-col gap-y-3 px-3">
                      {data.info.product.map((data: any) => (
                        <div
                          key={data._id}
                          className="flex items-center gap-2 w-full"
                        >
                          <div
                            style={{
                              color: formData.secondaryFontColor
                                ? formData.secondaryFontColor
                                : "black",

                              backgroundColor: formData.templateColor
                                ? formData.templateColor
                                : "white",
                            }}
                            className={`w-full h-full py-2 px-3 rounded-lg shadow-medium`}
                          >
                            <button
                              onClick={() =>
                                handleTriggerUpdate({
                                  data: data,
                                  categoryForTrigger: "swopPay",
                                })
                              }
                              className="flex items-center justify-between gap-3 w-full"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div className="relative">
                                  <Image
                                    src={data.imageUrl}
                                    alt="cover photo"
                                    width={160}
                                    height={90}
                                    quality={100}
                                    className="w-8 h-8 rounded-md object-cover"
                                  />
                                </div>
                                <div className="text-start">
                                  <p className="text-sm mb-0.5">{data.title}</p>
                                  <p className="text-xs">{data.description}</p>
                                </div>
                              </div>
                              <div className="custom-audio text-sm">
                                ${data.price}
                              </div>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* swop pay display here end */}

                  {/* audio||music display here start */}
                  {data.info.audio.length > 0 && (
                    <div className="flex flex-col gap-y-3 px-3">
                      {data.info.audio.map((audioData: any) => (
                        <div
                          key={audioData._id}
                          className="flex items-center gap-2 w-full overflow-hidden"
                        >
                          <div
                            style={{
                              backgroundColor: formData.templateColor
                                ? formData.templateColor
                                : "white",
                            }}
                            className={`w-full h-full py-2 px-3 rounded-lg shadow-medium`}
                          >
                            <div className="flex items-center justify-between overflow-hidden">
                              <button
                                style={{
                                  color: formData.secondaryFontColor
                                    ? formData.secondaryFontColor
                                    : "black",
                                }}
                                onClick={() =>
                                  handleTriggerUpdate({
                                    data: audioData,
                                    categoryForTrigger: "audio",
                                  })
                                }
                                className="flex items-center gap-2"
                              >
                                <div className="relative">
                                  <Image
                                    src={audioData.coverPhoto}
                                    alt="cover photo"
                                    width={120}
                                    height={60}
                                    className="w-14 h-10 rounded-md object-cover"
                                  />
                                </div>
                                <div className="text-start text-sm">
                                  <p className="font-medium">
                                    {audioData.name}
                                  </p>
                                  <p className="text-xs">
                                    Tap play button to listen the audio
                                  </p>
                                </div>
                              </button>
                              <div className="custom-audio">
                                <AudioPlayer
                                  style={{
                                    backgroundColor: formData.templateColor,
                                  }}
                                  key={audioData.fileUrl}
                                  autoPlay={false}
                                  src={audioData.fileUrl}
                                  showJumpControls={false}
                                  customAdditionalControls={[]}
                                  customVolumeControls={[]}
                                  layout="stacked-reverse"
                                  className={`!w-max !p-0 !shadow-none translate-y-1 rounded-full translate-x-4`}
                                  customIcons={{
                                    play: (
                                      <FaPlay
                                        style={{
                                          color: formData.secondaryFontColor,
                                        }}
                                        className="text-xl"
                                      />
                                    ), // Your custom play icon
                                    pause: (
                                      <FaPause
                                        style={{
                                          color: formData.secondaryFontColor,
                                        }}
                                        className="text-xl"
                                      />
                                    ), // Your custom pause icon
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* audio||music display here end */}
                </div>
                {/* video display here start */}
                {data.info.video.length > 0 && (
                  <div key={"video"} className="flex flex-col gap-y-3 px-3">
                    {data.info.video.map((videoData: any) => (
                      <div
                        key={videoData._id}
                        className="flex items-center w-full"
                      >
                        <div
                          className={`w-[96%] h-full rounded-2xl overflow-hidden shadow-medium`}
                        >
                          <video
                            key={videoData.link as string}
                            className="w-full h-auto"
                            controls
                          >
                            <source src={videoData.link} type="video/mp4" />
                            <track
                              src={videoData.link}
                              kind="subtitles"
                              srcLang="en"
                              label="English"
                            />
                            Your browser does not support the video tag.
                          </video>
                        </div>
                        <div className="w-[4%]">
                          <button
                            onClick={() =>
                              handleTriggerUpdate({
                                data: videoData,
                                categoryForTrigger: "video",
                              })
                            }
                            className="translate-x-1"
                          >
                            <FaEdit size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* video display here end */}
                {/* embed link display here start */}
                {data.info.videoUrl && (
                  <div
                    key={"embed"}
                    className="flex flex-col gap-y-3 px-3 w-full hide-scrollbar"
                  >
                    <EmbedPlayer
                      items={data.info.videoUrl}
                      toggle={toggle}
                      handleTriggerUpdate={handleTriggerUpdate}
                    />
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
