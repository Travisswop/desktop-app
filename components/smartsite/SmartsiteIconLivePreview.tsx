import Image from "next/image";
import React, { useEffect, useState } from "react";
import swop from "@/public/images/live-preview/swop.svg";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";
// import isUrl from "@/util/isUrl";
// import { tintStyle } from "@/util/IconTintStyle";
import useUpdateSmartIcon from "@/zustandStore/UpdateSmartIcon";
import useSmallIconToggleStore from "@/zustandStore/SmallIconModalToggle";
// import getSmallIconImage from "@/util/retriveIconImage/getSmallIconImage";
// import getAppIconImage from "@/util/retriveIconImage/getAppIconImage";
import { FaEdit, FaEye, FaPause, FaPlay } from "react-icons/fa";
import useSideBarToggleStore from "@/zustandStore/SideBarToggleStore";
// import AnimateButton from "./Button/AnimateButton";
import AudioPlayer from "react-h5-audio-player";
// import EmbedPlayer from "./livePreviewSmartsitesIcons/renderEmbedPlayer";
// import businessCard from "@/public/images/IconShop/outline-icons/dark/business-card-outline@3x.png";
import referral from "@/public/images/websites/referral.jpeg";
import ethereum from "@/public/images/social-icon/ethereum.png";
import card from "@/public/images/social-icon/card.png";
import message from "@/public/images/social-icon/message.png";
// import location from "@/public/images/social-icon/location.png";
// import getAllSmartsitesIcon from "@/util/retriveIconImage/getAllSmartsiteIcon";
import isUrl from "@/lib/isUrl";
import { tintStyle } from "../util/IconTintStyle";
import getSmallIconImage from "./retriveIconImage/getSmallIconImage";
import EmbedPlayer from "./embed/renderEmbedPlayer";
import getAllSmartsitesIcon from "./retriveIconImage/getAllSmartsiteIcon";
// import mockupBtn from "@/public/images/mockup-bottom-button.png";
// import DynamicPrimaryBtn from "../ui/Button/DynamicPrimaryBtn";
import { LiaFileMedicalSolid } from "react-icons/lia";
import { Switch } from "@nextui-org/react";
import { IoIosSend } from "react-icons/io";
import Link from "next/link";
import { handleSmartSiteUpdate } from "@/actions/update";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AnimateButton from "../ui/Button/AnimateButton";
import SmartsiteSocialShare from "./socialShare/SmartsiteSocialShare";
import { fontMap } from "@/lib/fonts";
import Cookies from "js-cookie";
// import { access } from "fs";
import mobileMockup from "@/public/images/mobile-mockup.png";
import { TbEdit } from "react-icons/tb";

const SmartsiteIconLivePreview = ({
  isEditDetailsLivePreview = false,
  data,
}: {
  isEditDetailsLivePreview?: boolean;
  data?: any;
}) => {
  const setSmartSiteData = useUpdateSmartIcon((state: any) => state.setState);
  const { toggle } = useSideBarToggleStore();

  const [isPrimaryMicrosite, setIsPrimaryMicrosite] = useState<boolean>(false);
  const [isLeadCapture, setIsLeadCapture] = useState<boolean>(false);

  const [isPublishedLoading, setIsPublishedLoading] = useState(false);

  // console.log("data form live", data.info.socialLarge);
  const { formData, setFormData } = useSmartsiteFormStore();

  // console.log("form data from live preview data", data.info.socialLarge);

  const { setOn }: any = useSmallIconToggleStore();

  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get("access-token");
      if (token) {
        setAccessToken(token);
      }
    };
    getAccessToken();
  }, []);

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
      console.log("response", response);

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

  return (
    <main className="w-[38%] h-full overflow-y-auto overflow-x-hidden">
      <div className="bg-[url('/images/mobile-mockup.png')] bg-cover bg-center h-[37rem] w-72 mx-auto relative rounded-3xl mt-6 ">
        <section
          style={{
            backgroundImage: formData.theme
              ? `url(/images/smartsite-background/${formData.backgroundImg}.png)`
              : "",
            height: "100%",
          }}
          className={`overflow-y-auto shadow-medium bg-white bg-cover hide-scrollbar rounded-3xl ${
            formData.fontType && fontMap[formData.fontType.toLowerCase()]
          }`}
        >
          {/* <p className="text-sm text-gray-500 mb-2">Preview</p> */}
          <div className={`flex flex-col justify-between min-h-full`}>
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
                  className={`relative ${
                    !formData.theme
                      ? "absolute top-full -translate-y-1/2 left-1/2 -translate-x-1/2"
                      : "flex justify-center pt-10"
                  } `}
                >
                  {formData.profileImg && (
                    <>
                      {isUrl(formData.profileImg) ? (
                        <div className="relative overflow-hidden rounded-full w-20 h-20 p-1 bg-white shadow-medium">
                          <Image
                            alt="user image"
                            src={formData.profileImg}
                            quality={100}
                            fill
                          />
                          <Link
                            href={`/smartsite/${data._id}`}
                            className="absolute bottom-0 -right-1 bg-white rounded-full w-[26px] h-[26px] flex items-center justify-center p-0.5"
                          >
                            <div className="bg-black rounded-full w-full h-full flex items-center justify-center font-bold">
                              <TbEdit size={14} color="white" />
                            </div>
                          </Link>
                        </div>
                      ) : (
                        <div className="w-20 h-20 relative">
                          <Image
                            alt="user image"
                            src={`/images/user_avator/${formData.profileImg}@3x.png`}
                            width={420}
                            height={420}
                            quality={100}
                            className="rounded-full w-20 h-20 bg-white shadow-medium border-2 border-gray-200 z-0"
                          />
                          <Link
                            href={`/smartsite/${data._id}`}
                            className="absolute bottom-0.5 right-0.5 bg-white rounded-full w-[23px] h-[23px] flex items-center justify-center p-0.5"
                          >
                            <div className="bg-black rounded-full w-full h-full flex items-center justify-center font-bold">
                              <TbEdit size={14} color="white" />
                            </div>
                          </Link>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div
                className={`${
                  !formData.theme && "mt-[4.5rem] xl:mt-20"
                }  flex flex-col gap-3 mt-2 h-full justify-start`}
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
                    className={`font-medium text-gray-700`}
                  >
                    {formData.name || data?.name}
                  </p>
                  <p
                    style={{
                      color: formData.fontColor ? formData.fontColor : "gray",
                    }}
                    className={`font-medium text-xs text-gray-500`}
                  >
                    {formData.bio || data?.bio}
                  </p>
                </div>
                {/* small icon display here start */}
                {data.info.socialTop.length > 0 && (
                  <div className="flex gap-x-4 gap-y-2 justify-center items-center flex-wrap px-10">
                    {data.info.socialTop.map((data: any, index: number) => (
                      <button
                        key={index}
                        onClick={() =>
                          handleTriggerUpdate({
                            data,
                            categoryForTrigger: "socialTop",
                          })
                        }
                      >
                        <Image
                          src={getSmallIconImage(data.name, data.group) as any}
                          alt="icon"
                          style={tintStyle}
                          className="w-4 h-auto"
                          quality={100}
                        />
                      </button>
                    ))}
                  </div>
                )}
                {/* small icon display here end */}
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
                                color: formData.fontColor
                                  ? formData.fontColor
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
                              backgroundColor:
                                formData.templateColor && formData.fontColor,

                              color: formData.templateColor,
                            }}
                            className="rounded-full bg-white flex items-center gap-1 px-3 py-0.5 text-[12px] font-medium"
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
                  <div className="flex flex-wrap gap-x-1 gap-y-3 justify-center items-center px-3">
                    {data.info.socialLarge.map((data: any, index: number) => (
                      <div
                        className={`w-[32%] flex flex-col items-center gap-1 ${
                          isUrl(data.iconName) && "cursor-not-allowed"
                        }`}
                        key={index}
                      >
                        <button
                          onClick={() =>
                            handleTriggerUpdate({
                              data,
                              categoryForTrigger: "socialLarge",
                            })
                          }
                          disabled={isUrl(data.iconName)}
                          className={`${
                            isUrl(data.iconName) && "cursor-not-allowed"
                          }`}
                        >
                          {isUrl(data.iconName) ? (
                            <div className="relative w-[4.2rem] h-[4.2rem] rounded-lg">
                              <Image
                                src={data.iconName}
                                alt="icon"
                                // style={tintStyle}
                                className="rounded-lg object-cover"
                                quality={100}
                                fill
                              />
                            </div>
                          ) : (
                            <Image
                              src={getAllSmartsitesIcon(data.iconName) as any}
                              alt="icon"
                              // style={tintStyle}
                              className="w-14 h-auto"
                              quality={100}
                            />
                          )}
                        </button>
                        <p className="text-xs text-center min-w-max">
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
                          // style={tintStyle}
                        />
                        <div
                          style={{
                            color: formData.fontColor
                              ? formData.fontColor
                              : "black",
                          }}
                          className="flex flex-col items-start gap-0.5 text-start"
                        >
                          <p className="text-sm">{data.buttonName}</p>
                          <p
                            className={`text-xs ${
                              !formData.fontColor && "text-gray-400"
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
                          style={{
                            filter:
                              formData.templateColor === "#000000" &&
                              ("brightness(1) invert(1)" as any),
                          }}
                          alt="icon"
                          quality={100}
                          className="w-8 h-8"
                        />
                        <div
                          style={{
                            color: formData.fontColor
                              ? formData.fontColor
                              : "black",
                          }}
                          className="flex flex-col items-start gap-0.5 text-start"
                        >
                          <p className="text-sm">Message Me</p>
                          <p
                            className={`text-xs ${
                              !formData.fontColor && "text-gray-400"
                            }`}
                          >
                            Message me using the Swop wallet
                          </p>
                        </div>
                      </button>
                    </div>
                  )}

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
                            style={{
                              filter:
                                formData.templateColor === "#000000" &&
                                ("brightness(1) invert(1)" as any),
                            }}
                          />
                          <div
                            style={{
                              color: formData.fontColor
                                ? formData.fontColor
                                : "black",
                            }}
                            className="flex flex-col items-start gap-0.5 text-start"
                          >
                            <p className="text-sm">{data.name}</p>
                            <p
                              className={`text-xs ${
                                !formData.fontColor && "text-gray-400"
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
                          style={{
                            filter:
                              formData.templateColor === "#000000" &&
                              ("brightness(1) invert(1)" as any),
                          }}
                          alt="icon"
                          quality={100}
                          className="w-8 h-8"
                        />
                        <div
                          style={{
                            color: formData.fontColor
                              ? formData.fontColor
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
                              !formData.fontColor && "text-gray-400"
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
                          disabled={isUrl(data.iconName)}
                          style={{
                            backgroundColor: formData.templateColor
                              ? formData.templateColor
                              : "white",
                          }}
                          className={`flex items-center gap-2 py-2 px-3 rounded-lg shadow-medium ${
                            isUrl(data.iconName) && "cursor-not-allowed"
                          }`}
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
                              color: formData.fontColor
                                ? formData.fontColor
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
                                !formData.fontColor && "text-gray-400"
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
                              color: formData.fontColor
                                ? formData.fontColor
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
                          {/* <div className="w-[4%]">
                  <button
                    onClick={() =>
                      handleTriggerUpdate({
                        data: audioData,
                        categoryForTrigger: "audio",
                      })
                    }
                    className=""
                  >
                    <FaEdit size={18} />
                  </button>
                </div> */}
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
                                  color: formData.fontColor
                                    ? formData.fontColor
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
                                          color: formData.fontColor,
                                        }}
                                        className="text-xl"
                                      />
                                    ), // Your custom play icon
                                    pause: (
                                      <FaPause
                                        style={{
                                          color: formData.fontColor,
                                        }}
                                        className="text-xl"
                                      />
                                    ), // Your custom pause icon
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          {/* <div className="w-[4%]">
                  <button
                    onClick={() =>
                      handleTriggerUpdate({
                        data: audioData,
                        categoryForTrigger: "audio",
                      })
                    }
                    className=""
                  >
                    <FaEdit size={18} />
                  </button>
                </div> */}
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

      {!isEditDetailsLivePreview && (
        <div className="flex flex-col gap-2 mt-4 pb-4">
          <p className="text-gray-600 font-medium text-center">Live Preview</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link href={`/smartsite/qr-code/${data?._id}`}>
              <button
                type="button"
                className="rounded-full bg-white border border-gray-300 px-6 py-2 text-gray-500 font-medium flex items-center gap-1 hover:bg-gray-300"
              >
                <LiaFileMedicalSolid size={20} />
                Customize QR
              </button>
            </Link>
            <div className="relative">
              <SmartsiteSocialShare
                isAbsolute={false}
                profileUrl={data.profileUrl}
                className="flex items-center justify-center text-gray-600 bg-white gap-1 !rounded-full font-medium border border-gray-300"
              >
                <IoIosSend color="gray" size={18} />
                Share
              </SmartsiteSocialShare>
            </div>
            {/* <button
              type="button"
              className="rounded-full bg-white border border-gray-300 px-6 py-2 text-gray-500 font-medium flex items-center gap-1 hover:bg-gray-300"
            >
              <IoIosSend color="gray" size={18} />
              Share
            </button> */}
          </div>
          <div className="flex justify-center items-center gap-1 2xl:gap-3 flex-wrap overflow-x-hidden">
            <div className="flex items-center gap-2 2xl:gap-8 border border-gray-300 rounded-full pl-3 2xl:pl-5 pr-1 2xl:pr-4 py-2 text-lg font-medium text-gray-600 w-max bg-white">
              <p className="text-sm 2xl:text-base text-gray-500 font-medium w-max">
                Lead Capture
              </p>
              <Switch
                size="sm"
                isSelected={isLeadCapture}
                onValueChange={setIsLeadCapture}
                aria-label="Lead Captures"
              />
            </div>
            <div className="flex items-center gap-2 2xl:gap-8 border border-gray-300 rounded-full pl-3 2xl:pl-5 pr-1 2xl:pr-4 py-2 text-lg font-medium text-gray-600 w-max bg-white">
              <p className="text-sm 2xl:text-base text-gray-500 font-medium w-max">
                Make Primary Microsite
              </p>
              <Switch
                size="sm"
                isSelected={isPrimaryMicrosite}
                onValueChange={setIsPrimaryMicrosite}
                aria-label="Lead Captures"
              />
            </div>
          </div>
          <div className="flex justify-center w-64 mx-auto">
            {/* <a href={data?.data?.profileUrl} target="_blank" className="w-full"> */}
            <AnimateButton
              onClick={handleSmartSiteUpdateInfo}
              isLoading={isPublishedLoading}
              whiteLoading={true}
              className="bg-black text-white py-2 !border-0 !rounded-full mt-2"
            >
              <LiaFileMedicalSolid size={20} /> Publish
            </AnimateButton>
            {/* </a> */}
          </div>
        </div>
      )}
    </main>
  );
};

export default SmartsiteIconLivePreview;
