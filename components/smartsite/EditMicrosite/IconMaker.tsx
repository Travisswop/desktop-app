"use client";
import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Image from "next/image";
import { MdOutlineAddBox } from "react-icons/md";
import twitter from "@/public/images/websites/edit-microsite/twitter.svg";
import youtube from "@/public/images/websites/edit-microsite/youtube.svg";
import linkedin from "@/public/images/websites/edit-microsite/linkedin.svg";
import swopPay from "@/public/images/websites/edit-microsite/swop-pay.svg";
import contactCard from "@/public/images/websites/edit-microsite/contact-card.svg";
import x from "@/public/images/IconShop/x@3x.png";
import mp4 from "@/public/images/websites/edit-microsite/mp4.svg";
import photosVideos from "@/public/images/websites/edit-microsite/photos-videos.svg";
import redeemLink from "@/public/images/websites/edit-microsite/redeem-link.svg";
import appIcon from "@/public/images/websites/edit-microsite/updated/app-icon.svg";
import blog from "@/public/images/websites/edit-microsite/updated/blog.svg";
import contact from "@/public/images/websites/edit-microsite/updated/contact-card.svg";
import embedIcon from "@/public/images/websites/edit-microsite/updated/embed-icon.svg";
import infoBar from "@/public/images/websites/edit-microsite/updated/info-bar.svg";
import referral from "@/public/images/websites/edit-microsite/updated/referral.svg";
import message from "@/public/images/websites/edit-microsite/updated/message.svg";
import feed from "@/public/images/feed.png";
import { FaRegSquareMinus } from "react-icons/fa6";

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

const IconMaker = ({ handleAddIcon, handleRemoveIcon, toggleIcon }: any) => {
  const settings = {
    // dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 8,
    slidesToScroll: 4,
    nextArrow: <SampleNextArrow />,
    prevArrow: <SamplePrevArrow />,
    responsive: [
      {
        breakpoint: 1500,
        settings: {
          slidesToShow: 7,
          slidesToScroll: 4,
        },
      },
      {
        breakpoint: 1350,
        settings: {
          slidesToShow: 5,
          slidesToScroll: 4,
        },
      },
      {
        breakpoint: 1000,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 4,
        },
      },
      {
        breakpoint: 730,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 4,
        },
      },
    ],
  };

  const iconBuilderArry = [
    {
      _id: 1234,
      src: x,
      title: "Small Icon",
    },

    {
      _id: 45234,
      src: appIcon,
      title: "App Icon",
    },
    {
      _id: 4555234,
      src: blog,
      title: "Blog",
    },

    {
      _id: 1238,
      src: contact,
      title: "Contact Card",
    },
    {
      _id: 1235,
      src: embedIcon,
      title: "Embed",
    },
    {
      _id: 1236,
      src: infoBar,
      title: "Info Bar",
    },
    {
      _id: 126338,
      src: message,
      title: "Message",
    },
    {
      _id: 1239,
      src: mp4,
      title: "Music File",
    },
    {
      _id: 1244,
      src: photosVideos,
      title: "Video",
    },
    // {
    //   _id: 1254,
    //   src: redeemLink,
    //   title: "Redeem Link",
    // },
    {
      _id: 1237,
      src: swopPay,
      title: "Swop Pay",
    },
    {
      _id: 1254,
      src: referral,
      title: "Referral",
    },
    {
      _id: 12542,
      src: feed,
      title: "Feed",
    },
  ];

  return (
    <div className="w-full">
      <div className="slider-container">
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
        </Slider>
      </div>
    </div>
  );
};

export default IconMaker;
