import Image from "next/image";
import React, { useEffect } from "react";
import swop from "@/public/images/live-preview/swop.svg";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";
// import isUrl from "@/util/isUrl";
// import { tintStyle } from "@/util/IconTintStyle";
import useUpdateSmartIcon from "@/zustandStore/UpdateSmartIcon";
import useSmallIconToggleStore from "@/zustandStore/SmallIconModalToggle";
// import getSmallIconImage from "@/util/retriveIconImage/getSmallIconImage";
// import getAppIconImage from "@/util/retriveIconImage/getAppIconImage";
import { FaEdit, FaEye } from "react-icons/fa";
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
import AnimateButton from "../ui/Button/AnimateButton";
import EmbedPlayer from "./embed/renderEmbedPlayer";
import getAllSmartsitesIcon from "./retriveIconImage/getAllSmartsiteIcon";
import { fontMap } from "@/app/layout";

const SmartsiteIconLivePreview = ({ data }: { data?: any }) => {
  const setSmartSiteData = useUpdateSmartIcon((state: any) => state.setState);
  const { toggle } = useSideBarToggleStore();

  // console.log("data form live", data.info.socialLarge);
  const { formData, setFormData } = useSmartsiteFormStore();

  // console.log("form data from live preview", formData);

  const { setOn }: any = useSmallIconToggleStore();

  const handleTriggerUpdate = (data: {
    data: any;
    categoryForTrigger: string;
  }) => {
    setSmartSiteData(data);
    setOn(true);
  };

  // console.log("audio", data.info.audio);

  // console.log("formdata", formData);
  // console.log("data from live preview", data);

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

  return (
    <section
      style={{
        backgroundImage:
          formData.theme &&
          `url(/images/smartsite-background/${formData.backgroundImg}.png)`,
        height: "100%",
      }}
      className="w-[38%] overflow-y-auto custom-scrollbar shadow-md bg-white bg-cover "
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
              className={`${
                !formData.theme
                  ? "absolute top-full -translate-y-1/2 left-1/2 -translate-x-1/2"
                  : "flex justify-center pt-16"
              } `}
            >
              {formData.profileImg && (
                <>
                  {isUrl(formData.profileImg) ? (
                    <div className="relative overflow-hidden rounded-full w-28 xl:w-36 2xl:w-44 h-28 xl:h-36 2xl:h-44 p-1 bg-white shadow-medium">
                      <Image
                        alt="user image"
                        src={formData.profileImg}
                        quality={100}
                        fill
                      />
                    </div>
                  ) : (
                    <Image
                      alt="user image"
                      src={`/images/user_avator/${formData.profileImg}@3x.png`}
                      width={420}
                      height={420}
                      quality={100}
                      className="rounded-full w-28 xl:w-36 2xl:w-44 h-auto p-1 bg-white shadow-medium border-2 border-gray-200"
                    />
                  )}
                </>
              )}
            </div>
          </div>
          <div
            className={`${
              !formData.theme && "mt-[4.5rem] xl:mt-20 2xl:mt-28"
            }  flex flex-col gap-6 mt-6 h-full justify-start`}
          >
            <div
              className={`flex flex-col items-center text-center ${
                formData.fontType && fontMap[formData.fontType.toLowerCase()]
              }`}
            >
              <p
                className={`text-lg font-bold ${
                  formData.fontColor ? formData.fontColor : "text-gray-700"
                }`}
              >
                {formData.name || data?.name}
              </p>
              <p
                className={`font-medium text-sm ${
                  formData.fontColor ? formData.fontColor : "text-gray-500"
                }`}
              >
                {formData.bio || data?.bio}
              </p>
            </div>
            {/* small icon display here start */}
            {data.info.socialTop.length > 0 && (
              <div className="flex gap-x-4 gap-y-2 justify-center items-center flex-wrap px-16">
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
                      className="w-5"
                      quality={100}
                    />
                  </button>
                ))}
              </div>
            )}
            {/* small icon display here end */}
            {/* blog display here start */}
            {data.info.blog.length > 0 && (
              <div className="flex flex-col gap-y-3 px-4">
                {data.info.blog.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="shadow-small hover:shadow-medium p-3 2xl:p-4 rounded-lg bg-white"
                  >
                    <div>
                      <div>
                        <div className="relative">
                          <Image
                            src={item.image}
                            alt={item.title}
                            width={400}
                            height={300}
                            className="w-full h-32 2xl:h-60 object-cover rounded-lg"
                          />
                        </div>
                        <div>
                          {item?.title && (
                            <p className="text-lg font-bold text-gray-700 mt-2 mb-1">
                              {item.title}
                            </p>
                          )}
                          {item?.headline && (
                            <p className="text-sm font-medium text-gray-600 truncate">
                              {item.headline}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center lg:justify-between items-center mt-3 gap-2">
                      <AnimateButton
                        type="button"
                        onClick={() =>
                          handleTriggerUpdate({
                            data: item,
                            categoryForTrigger: "blog",
                          })
                        }
                        width="w-28"
                        className="!rounded-lg"
                      >
                        <FaEdit /> Edit
                      </AnimateButton>

                      <AnimateButton
                        type="button"
                        onClick={() =>
                          handleTriggerUpdate({
                            data: item,
                            categoryForTrigger: "showBlog",
                          })
                        }
                        width="w-40"
                        className="!rounded-lg"
                      >
                        <FaEye size={18} /> Read More
                      </AnimateButton>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* blog display here end */}
            {/* app icon display here start */}
            {data.info.socialLarge.length > 0 && (
              <div className="flex gap-x-5 gap-y-3 justify-center items-center flex-wrap px-10">
                {data.info.socialLarge.map((data: any, index: number) => (
                  <div
                    className={`flex flex-col items-center gap-1 ${
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
                        <Image
                          src={data.iconName}
                          alt="icon"
                          // style={tintStyle}
                          className="w-[4.2rem] rounded-lg"
                          quality={100}
                          width={200}
                          height={200}
                        />
                      ) : (
                        <Image
                          src={getAllSmartsitesIcon(data.iconName) as any}
                          alt="icon"
                          // style={tintStyle}
                          className="w-[4.2rem]"
                          quality={100}
                        />
                      )}
                    </button>
                    <p className="text-sm">{data.name}</p>
                  </div>
                ))}
              </div>
            )}

            {/* app icon display here end */}
            {/* card here  */}
            <div className="flex flex-col gap-y-3">
              {/* message me display here start */}
              {data.info.ensDomain.length > 0 && (
                <div className="flex flex-col gap-y-3 px-4">
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
                    className="flex items-center gap-3 bg-white py-2 px-3 rounded-lg shadow-medium"
                  >
                    <Image
                      src={message}
                      // style={tintStyle}
                      alt="icon"
                      quality={100}
                      className="w-9 h-9"
                    />
                    <div className="flex flex-col items-start gap-0.5 text-start">
                      <p className="font-semibold text-gray-700">Message Me</p>
                      <p className="text-xs text-gray-400">
                        Message me using the Swop wallet
                      </p>
                    </div>
                  </button>
                </div>
              )}
              {/* referral display here start */}
              {data.info.referral.length > 0 && (
                <div className="flex flex-col gap-y-3 px-4">
                  {data.info.referral.map((data: any) => (
                    <button
                      key={data._id}
                      onClick={() =>
                        handleTriggerUpdate({
                          data,
                          categoryForTrigger: "referral",
                        })
                      }
                      className="flex items-center gap-3 bg-white py-2 px-3 rounded-lg shadow-medium"
                    >
                      <Image
                        src={referral}
                        alt="icon"
                        quality={100}
                        className="w-9 h-9"
                        // style={tintStyle}
                      />
                      <div className="flex flex-col items-start gap-0.5 text-start">
                        <p className="font-semibold text-gray-700">
                          {data.buttonName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {data.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* referral display here end */}
              {/* contact card display here start */}
              {data.info.contact.length > 0 && (
                <div className="flex flex-col gap-y-3 px-4">
                  {data.info.contact.map((data: any) => (
                    <button
                      key={data._id}
                      onClick={() =>
                        handleTriggerUpdate({
                          data,
                          categoryForTrigger: "contactCard",
                        })
                      }
                      className="flex items-center gap-3 bg-white py-2 px-3 rounded-lg shadow-medium"
                    >
                      <Image
                        src={card}
                        alt="icon"
                        quality={100}
                        className="w-9 h-9"
                        style={tintStyle}
                      />
                      <div className="flex flex-col items-start gap-0.5 text-start">
                        <p className="font-semibold text-gray-700">
                          {data.name}
                        </p>
                        <p className="text-xs text-gray-400">{data.mobileNo}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {/* contact card display here end */}

              {/* ENS display here start */}
              {data.info.ensDomain.length > 0 && (
                <div className="flex flex-col gap-y-3 px-4">
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
                    className="flex items-center gap-3 bg-white py-2 px-3 rounded-lg shadow-medium"
                  >
                    <Image
                      src={ethereum}
                      style={tintStyle}
                      alt="icon"
                      quality={100}
                      className="w-9 h-9"
                    />
                    <div className="flex flex-col items-start gap-0.5 text-start">
                      <p className="font-semibold text-gray-700">
                        {
                          data.info.ensDomain[data.info.ensDomain.length - 1]
                            .domain
                        }
                      </p>
                      <p className="text-xs text-gray-400">
                        Pay me using my Swop.ID
                      </p>
                    </div>
                  </button>
                </div>
              )}
              {/* ENS display here end */}

              {/* info bar display here start */}
              {data.info.infoBar.length > 0 && (
                <div className="flex flex-col gap-y-3 px-4">
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
                      className={`flex items-center gap-3 bg-white py-2 px-3 rounded-lg shadow-medium ${
                        isUrl(data.iconName) && "cursor-not-allowed"
                      }`}
                    >
                      {isUrl(data.iconName) ? (
                        <Image
                          src={data.iconName}
                          // src={getAppIconImage(data.iconName, data.group) as any}
                          alt="icon"
                          quality={100}
                          className="w-9 h-9 rounded-lg"
                          width={100}
                          height={100}
                        />
                      ) : (
                        <Image
                          src={getAllSmartsitesIcon(data.iconName) as any}
                          alt="icon"
                          quality={100}
                          className="w-9 h-9"
                        />
                      )}

                      <div className="flex flex-col items-start gap-0.5 text-start">
                        <p className="font-semibold text-gray-700">
                          {data.buttonName ? data.buttonName : data.iconName}
                        </p>
                        <p className="text-xs text-gray-400">
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
                <div className="flex flex-col gap-y-3 px-4">
                  {data.info.product.map((data: any) => (
                    <div
                      key={data._id}
                      className="flex items-center gap-2 w-full"
                    >
                      <div
                        className={`w-full h-full bg-white py-2 px-3 rounded-lg shadow-medium`}
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
                          <div className="flex items-center gap-3 w-full">
                            <div className="relative">
                              <Image
                                src={data.imageUrl}
                                alt="cover photo"
                                width={120}
                                height={60}
                                className="w-11 h-11 rounded-md object-cover"
                              />
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{data.title}</p>
                              <p className="text-sm text-gray-600">
                                {data.description}
                              </p>
                            </div>
                          </div>
                          <div className="custom-audio">${data.price}</div>
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
                <div className="flex flex-col gap-y-3 px-4">
                  {data.info.audio.map((audioData: any) => (
                    <div
                      key={audioData._id}
                      className="flex items-center gap-2 w-full"
                    >
                      <div
                        className={`w-full h-full bg-white py-2 px-3 rounded-lg shadow-medium`}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() =>
                              handleTriggerUpdate({
                                data: audioData,
                                categoryForTrigger: "audio",
                              })
                            }
                            className="flex items-center gap-3"
                          >
                            <div className="relative">
                              <Image
                                src={audioData.coverPhoto}
                                alt="cover photo"
                                width={120}
                                height={60}
                                className="w-11 h-11 rounded-md object-cover"
                              />
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{audioData.name}</p>
                              <p className="text-sm">
                                Tap play button to listen the audio
                              </p>
                            </div>
                          </button>
                          <div className="custom-audio">
                            <AudioPlayer
                              key={audioData.fileUrl}
                              autoPlay={false}
                              src={audioData.fileUrl}
                              showJumpControls={false}
                              customAdditionalControls={[]}
                              customVolumeControls={[]}
                              layout="stacked-reverse"
                              className="!w-max !p-0 !shadow-none translate-y-1"
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
              <div key={"video"} className="flex flex-col gap-y-3 px-4">
                {data.info.video.map((videoData: any) => (
                  <div
                    key={videoData._id}
                    className="flex items-center gap-2 w-full"
                  >
                    <div
                      className={`w-[96%] h-full border-4 border-[#c685ff] rounded-2xl overflow-hidden`}
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
                        className=""
                      >
                        <FaEdit size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* video display here end */}
            {/* embed link display here start */}
            {data.info.videoUrl && (
              <div key={"embed"} className="flex flex-col gap-y-3 px-4 w-full">
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

        <div className="flex items-center justify-center gap-2 h-16">
          <Image alt="swop logo" src={swop} />
          {/* <BiSolidEdit /> */}
        </div>
      </div>
    </section>
  );
};

export default SmartsiteIconLivePreview;
