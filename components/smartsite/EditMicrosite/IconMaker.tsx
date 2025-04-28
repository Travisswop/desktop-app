"use client";
import React from "react";
import Image from "next/image";
import { MdInfoOutline } from "react-icons/md";
import smallIcon from "@/public/images/social-icon/small-icon.png";
import appIcon from "@/public/images/smartsite_icon/app-icon.png";
import embedIcon from "@/public/images/smartsite_icon/embeed.png";
import blogIcon from "@/public/images/smartsite_icon/blog.png";
import redeemIcon from "@/public/images/smartsite_icon/redeem-link.png";
import marketPlaceIcon from "@/public/images/smartsite_icon/marketplace.png";
import mp3Icon from "@/public/images/smartsite_icon/audio.png";
import videoIcon from "@/public/images/smartsite_icon/video.png";
import infobarIcon from "@/public/images/smartsite_icon/info-bar.png";
import { Tooltip } from "@nextui-org/react";
import plus from "@/public/images/custom-icons/plus.png";
import minus from "@/public/images/custom-icons/minus.png";
import photoIcon from "@/public/images/smartsite_icon/photo.png";
import feedIcon from "@/public/images/smartsite_icon/feed-embeed.png";

const IconMaker = ({ handleToggleIcon, toggleIcon }: any) => {
  const iconBuilderArry = [
    {
      _id: 1,
      src: smallIcon,
      title: "Small Icon",
      toolTip:
        "Select the icon type and icon then find your username or link that you want to share to create your small icon.",
    },

    {
      _id: 2,
      src: appIcon,
      title: "App Icon",
      toolTip:
        "Select the icon ype and icon you want to use then upload the account information.",
    },
    {
      _id: 3,
      src: infobarIcon,
      title: "Info Bar",
      toolTip:
        "You will be able to set the icon type, choose an icon , specify a button name, provide a link, and add a description.",
    },
    {
      _id: 4,
      src: blogIcon,
      title: "Blog",
      toolTip: "Write a blog and host it right on your swop smart site.",
    },
    {
      _id: 5,
      src: embedIcon,
      title: "Embed",
      toolTip: "Select which platform you want to embed and paste the link",
    },

    {
      _id: 6,
      src: redeemIcon,
      title: "Redeem Link",
      toolTip:
        "Create a portal that people can click to collect tokens and collectables.",
    },

    {
      _id: 7,
      src: marketPlaceIcon,
      title: "Marketplace",
      toolTip: "Buy and Sell any products.",
    },
    {
      _id: 8,
      src: mp3Icon,
      title: "Mp3",
      toolTip: "Embed music to your smart site that people can listen to.",
    },
    {
      _id: 10,
      src: photoIcon,
      title: "Video",
      toolTip:
        "You can embed a video by either uploading it directly or sharing an external link, along with providing a title for the content.",
    },
    {
      _id: 12,
      src: feedIcon,
      title: "Feed",
      toolTip: "You can embed feed into your smartsite.",
    },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6 gap-3">
        {iconBuilderArry.map((data) => (
          <div key={data._id} className="">
            <div
              onClick={() => handleToggleIcon(data.title)}
              className="bg-white cursor-pointer pt-4 pb-2 2xl:py-4 rounded-2xl flex flex-col items-center gap-1 shadow-small relative"
            >
              {data?.toolTip && (
                <div className="absolute top-1 right-2">
                  <Tooltip
                    size="sm"
                    content={data.toolTip}
                    className={`${
                      data.title === "Marketplace" ? "max-w-32" : "max-w-40"
                    } h-auto `}
                  >
                    <button>
                      <MdInfoOutline />
                    </button>
                  </Tooltip>
                </div>
              )}

              <p className="text-center text-sm font-medium mt-1 2xl:mt-0">
                {data.title === "Video" ? "Photo/Video" : data.title}
              </p>
              <div className="h-7 2xl:h-10 my-auto w-full flex justify-center items-center">
                <Image
                  alt="icon"
                  src={data.src}
                  quality={100}
                  className={`w-auto ${
                    data.title === "Small Icon"
                      ? "h-4 2xl:h-5"
                      : data.title === "Info Bar"
                      ? "h-6 2xl:h-7"
                      : data.title === "Video"
                      ? "h-14"
                      : data.title === "Redeem Link"
                      ? "h-11"
                      : data.title === "Marketplace"
                      ? "h-11"
                      : "h-full"
                  }`}
                />
              </div>
              <div className="h-6">
                {toggleIcon.find((item: any) => item == data.title) ? (
                  <button
                    // onClick={() => handleRemoveIcon(data.title)}
                    className="w-6"
                  >
                    <Image
                      src={minus}
                      alt="minus icons"
                      width={600}
                      height={600}
                      className="w-full h-auto"
                      quality={100}
                    />
                    {/* <FiMinusCircle color="black" size={18} /> */}
                    {/* <FaRegSquareMinus size={17} /> */}
                  </button>
                ) : (
                  <button className="w-5 translate-y-0.5">
                    <Image
                      src={plus}
                      alt="plus icons"
                      width={600}
                      height={600}
                      className="w-full h-auto"
                      quality={100}
                    />
                    {/* <MdOutlineAddBox size={17} /> */}
                  </button>
                )}
              </div>
              {/* <button
                  onClick={() => handleAddIcon(data.title)}
                  className="h-[10%] "
                >
                  <MdOutlineAddBox size={20} />
                </button> */}
              {/* // <button
                //   onClick={() => handleRemoveIcon(data.title)}
                //   className="h-[10%] "
                // >
                //   <FaRegSquareMinus size={18} />
                // </button> */}
            </div>
          </div>
        ))}
      </div>
      {/* <div className="slider-container">
        <Slider {...settings}>
          {iconBuilderArry.map((data) => (
            <div key={data._id} className="px-2 py-2">
              <div className="bg-white px-2 py-6 rounded-2xl flex flex-col items-center gap-3 h-40 2xl:h-40 shadow-md">
                <p className="text-center h-[45%] text-sm font-medium">
                  {data.title}
                </p>
                <div className="h-[45%]  my-auto w-full flex justify-center items-center">
                  <Image
                    alt="icon"
                    src={data.src}
                    quality={100}
                    className={`${
                      data.title === "Small Icon" && "w-9 h-auto"
                    } ${data.title === "Feed" && "w-9 h-auto"}`}
                  />
                </div>
                {toggleIcon.find((item: any) => item == data.title) ? (
                  <button
                    onClick={() => handleRemoveIcon(data.title)}
                    className="h-[10%] "
                  >
                    <FaRegSquareMinus size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleAddIcon(data.title)}
                    className="h-[10%] "
                  >
                    <MdOutlineAddBox size={20} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </Slider>
      </div> */}
    </div>
  );
};

export default IconMaker;
