"use client";
import React from "react";
// import Slider from "react-slick";
// import "slick-carousel/slick/slick.css";
// import "slick-carousel/slick/slick-theme.css";
import Image from "next/image";
import { MdInfoOutline, MdOutlineAddBox } from "react-icons/md";
// import twitter from "@/public/images/websites/edit-microsite/twitter.svg";
// import youtube from "@/public/images/websites/edit-microsite/youtube.svg";
// import linkedin from "@/public/images/websites/edit-microsite/linkedin.svg";
// import swopPay from "@/public/images/websites/edit-microsite/swop-pay.svg";
// import contactCard from "@/public/images/websites/edit-microsite/contact-card.svg";
// import x from "@/public/images/IconShop/x@3x.png";
// import mp4 from "@/public/images/websites/edit-microsite/mp4.svg";
// import photosVideos from "@/public/images/websites/edit-microsite/photos-videos.svg";
// import redeemLink from "@/public/images/websites/edit-microsite/redeem-link.svg";
// import appIcon from "@/public/images/websites/edit-microsite/updated/app-icon.svg"
import smallIcon from "@/public/images/social-icon/small-icon.png";
import appIcon from "@/public/images/smartsite_icon/app-icon.png";
import embedIcon from "@/public/images/smartsite_icon/embeed.png";
import blogIcon from "@/public/images/smartsite_icon/blog.png";
import redeemIcon from "@/public/images/smartsite_icon/redeem-link.png";
import marketPlaceIcon from "@/public/images/smartsite_icon/marketplace.png";
// import photoIcon from "@/public/images/smartsite_icon/photo.png";
import mp3Icon from "@/public/images/smartsite_icon/audio.png";
import videoIcon from "@/public/images/smartsite_icon/video.png";
// import blog from "@/public/images/websites/edit-microsite/updated/blog.svg";
// import contact from "@/public/images/websites/edit-microsite/updated/contact-card.svg";
import infobarIcon from "@/public/images/smartsite_icon/info-bar.png";
// import embedIcon from "@/public/images/websites/edit-microsite/updated/embed-icon.svg";
// import infoBar from "@/public/images/websites/edit-microsite/updated/info-bar.svg";
// import referral from "@/public/images/websites/edit-microsite/updated/referral.svg";
// import message from "@/public/images/websites/edit-microsite/updated/message.svg";
// import feed from "@/public/images/feed.png";
import { FaRegSquareMinus } from "react-icons/fa6";
import { Tooltip } from "@nextui-org/react";
import plus from "@/public/images/custom-icons/plus.png";
import minus from "@/public/images/custom-icons/minus.png";
import { FiMinusCircle } from "react-icons/fi";

function SampleNextArrow(props: any) {
  const { className, style, onClick } = props;
  return (
    <div
      className={className}
      style={{
        ...style,
        // marginRight: 20,
      }}
      onClick={onClick}
    />
  );
}

function SamplePrevArrow(props: any) {
  const { className, style, onClick } = props;
  return (
    <div
      className={className}
      style={{
        ...style,
        // marginLeft: 20,
      }}
      onClick={onClick}
    />
  );
}

const IconMaker = ({ handleToggleIcon, toggleIcon }: any) => {
  // const settings = {
  //   // dots: true,
  //   infinite: true,
  //   speed: 500,
  //   slidesToShow: 8,
  //   slidesToScroll: 4,
  //   nextArrow: <SampleNextArrow />,
  //   prevArrow: <SamplePrevArrow />,
  //   responsive: [
  //     {
  //       breakpoint: 1500,
  //       settings: {
  //         slidesToShow: 7,
  //         slidesToScroll: 4,
  //       },
  //     },
  //     {
  //       breakpoint: 1350,
  //       settings: {
  //         slidesToShow: 5,
  //         slidesToScroll: 4,
  //       },
  //     },
  //     {
  //       breakpoint: 1000,
  //       settings: {
  //         slidesToShow: 4,
  //         slidesToScroll: 4,
  //       },
  //     },
  //     {
  //       breakpoint: 730,
  //       settings: {
  //         slidesToShow: 2,
  //         slidesToScroll: 4,
  //       },
  //     },
  //   ],
  // };

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
    // {
    //   _id: 9,
    //   src: photoIcon,
    //   title: "Photo",
    //   toolTip: "Select the icon to upload a new photo.",
    // },
    {
      _id: 10,
      src: videoIcon,
      title: "Video",
      toolTip:
        "You can embed a video by either uploading it directly or sharing an external link, along with providing a title for the content.",
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

              <p className="text-center text-sm font-medium mt-1 2xl:mt-0">
                {data.title}
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
                      : data.title === "Photo"
                      ? "h-14"
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
