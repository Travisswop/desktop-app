"use client";
import { Spinner } from "@nextui-org/react";
import { Switch } from "@nextui-org/react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { MdAttachFile } from "react-icons/md";
import { MdQrCode2 } from "react-icons/md";
import { MdLockOutline } from "react-icons/md";
import {
  QrCode1,
  QrCode2,
  QrCode3,
  QrCode4,
} from "@/components/smartsite/qrCode/QRData";
import qrJson1 from "@/components/smartsite/qrCode/qr-code-json/1-A.json";
import qrJson2 from "@/components/smartsite/qrCode/qr-code-json/2-A.json";
import qrJson3 from "@/components/smartsite/qrCode/qr-code-json/3-A.json";
import qrJson4 from "@/components/smartsite/qrCode/qr-code-json/4-A.json";
import { FaSave } from "react-icons/fa";
import { updateUserCustomQrCode } from "@/actions/customQrCode";
import { IoMdLink } from "react-icons/io";
import { useRouter } from "next/navigation";
import { sendCloudinaryImage } from "@/lib/SendCloudineryImage";
import toast from "react-hot-toast";
import CustomFileInput from "@/components/CustomFileInput";
import DynamicPrimaryBtn from "@/components/ui/Button/DynamicPrimaryBtn";
import colorCancel from "@/public/images/color-cancel.png";
import Link from "next/link";

const UpdateQRCode = ({ session, data }: any) => {
  const [color, setColor] = useState("#B396FF");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [qrCodeShape, setqrCodeShape] = useState("circle");
  const [qrCodeFrame, setqrCodeFrame] = useState("circle");
  const [selectQrCodeSocialLink, setSelectQrCodeSocialLink] = useState(
    data.data
  );

  const [socialImage, setSocialImage] = useState(
    "https://res.cloudinary.com/dziyri2ge/image/upload/v1733895036/link_jrgwpk.png"
  );

  console.log("socialImage", socialImage);

  const [uploadImageFileName, setUploadImageFileName] = useState("");

  const [toggle, setToggle] = useState(false);
  const [backgroundColorToggle, setBackgroundColorToggle] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>("");

  const router = useRouter();

  const [qrPattern, setQrPattern] = useState("QrCode1");
  const backgroundUpdatePickerRef = useRef<HTMLDivElement>(null);
  const updateColorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        backgroundUpdatePickerRef.current &&
        !backgroundUpdatePickerRef.current.contains(event.target as Node)
      ) {
        setBackgroundColorToggle(false);
      }
    };

    // Add event listener to detect clicks outside
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      // Cleanup event listener when component unmounts
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        updateColorPickerRef.current &&
        !updateColorPickerRef.current.contains(event.target as Node)
      ) {
        setToggle(false);
      }
    };

    // Add event listener to detect clicks outside
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      // Cleanup event listener when component unmounts
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setQrPattern(data.qrCodeSvgName);
    setColor(data.qrDotColor);
    setBgColor(data.backgroundColor);
    setSocialImage(data.overLayImage);
  }, [
    data.backgroundColor,
    data.overLayImage,
    data.qrCodeSvgName,
    data.qrDotColor,
  ]);

  const defaultColorArray = [
    {
      _id: "1234",
      hexCode: "#000000",
    },
    {
      _id: "11234",
      hexCode: "#E6379A",
    },
    {
      _id: "12534",
      hexCode: "#6F2FC0",
    },
    {
      _id: "12314",
      hexCode: "#FF6C08",
    },
    {
      _id: "15234",
      hexCode: "#FF9500",
    },
    {
      _id: "12334",
      hexCode: "#6B6B6B",
    },
    {
      _id: "12324",
      hexCode: "#BF0000",
    },
    {
      _id: "12344",
      hexCode: "#027AFF",
    },
  ];
  const defaultBackgroundColorArray = [
    {
      _id: "1234",
      hexCode: "#000000",
    },
    {
      _id: "11234",
      hexCode: "#E6379A",
    },
    {
      _id: "12534",
      hexCode: "#6F2FC0",
    },
    {
      _id: "12314",
      hexCode: "#FF6C08",
    },
    {
      _id: "15234",
      hexCode: "#FF9500",
    },
    {
      _id: "12334",
      hexCode: "#6B6B6B",
    },
    {
      _id: "12324",
      hexCode: "#BF0000",
    },
    {
      _id: "12344",
      hexCode: "#027AFF",
    },
  ];

  const defaultShapeArray = [
    {
      _id: "1",
      shapeUrl: "/images/qr-code/circle.png",
      shapeTitle: "circle",
    },
    {
      _id: "2",
      shapeUrl: "/images/qr-code/square.png",
      shapeTitle: "square",
    },
    {
      _id: "3",
      shapeUrl: "/images/qr-code/round.png",
      shapeTitle: "round",
    },
  ];

  const defaultFrameArray = [
    {
      _id: "1",
      frameUrl: "/images/qr-code/circle.png",
      frameTitle: "circle",
    },
    {
      _id: "2",
      frameUrl: "/images/qr-code/square.png",
      frameTitle: "square",
    },
  ];

  const defaultSocialLinkArray = [
    {
      _id: "1",
      socialIcon:
        "https://res.cloudinary.com/dziyri2ge/image/upload/v1733895036/link_jrgwpk.png",
      socialTitle: "link",
      socialUrl: "www.swopme.co",
    },
    {
      _id: "2",
      socialIcon:
        "https://res.cloudinary.com/dziyri2ge/image/upload/v1733895036/search_ugvgto.png",
      socialTitle: "google",
      socialUrl: "www.google.com",
    },
    {
      _id: "3",
      socialIcon:
        "https://res.cloudinary.com/dziyri2ge/image/upload/v1733895036/youtube_gb2ckd.png",
      socialTitle: "youtube",
      socialUrl: "www.youtube.com",
    },
    {
      _id: "4",
      socialIcon:
        "https://res.cloudinary.com/dziyri2ge/image/upload/v1733895037/instagram_dvuvuq.png",
      socialTitle: "instagram",
      socialUrl: "www.instagram.com",
    },
    {
      _id: "5",
      socialIcon:
        "https://res.cloudinary.com/dziyri2ge/image/upload/v1733895036/linkedin_pqwube.png",
      socialTitle: "linkedin",
      socialUrl: "www.linkedin.com",
    },
    {
      _id: "6",
      socialIcon:
        "https://res.cloudinary.com/dziyri2ge/image/upload/v1733895036/tik-tok_owuxna.png",
      socialTitle: "tik-tok",
      socialUrl: "www.tiktok.com",
    },
    {
      _id: "7",
      socialIcon:
        "https://res.cloudinary.com/dziyri2ge/image/upload/v1733895036/snapchat_cgbkce.png",
      socialTitle: "snapchat",
      socialUrl: "www.snapchat.com",
    },
    {
      _id: "8",
      socialIcon:
        "https://res.cloudinary.com/dziyri2ge/image/upload/v1733895036/twitter_ckhyj9.png",
      socialTitle: "twitter",
      socialUrl: "www.x.com",
    },
    {
      _id: "9",
      socialIcon:
        "https://res.cloudinary.com/dziyri2ge/image/upload/v1733895037/spotify_d28luq.png",
      socialTitle: "spotify",
      socialUrl: "www.spotify.com",
    },
  ];

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // Check if file size is greater than 10 MB
        setFileError("*File size must be less than 10 MB");
        setImageFile(null);
      } else {
        setUploadImageFileName(file.name);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageFile(reader.result as any);
          setFileError("");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFormSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    let qrData;
    switch (qrPattern) {
      case "QrCode1":
        qrData = { ...qrJson1 };
        break;
      case "QrCode2":
        qrData = { ...qrJson2 };
        break;
      case "QrCode3":
        qrData = { ...qrJson3 };
        break;
      case "QrCode4":
        qrData = { ...qrJson4 };
        break;
      default:
        qrData = { ...qrJson1 };
    }

    // Update the JSON data with current state values
    // qrData.dotsOptions.color = color;
    // qrData.backgroundOptions.color = bgColor || "#ffffff00";

    //userId, customQrData, qrCodeName, data, qrCodeSvgName

    try {
      const payload = {
        customQrData: qrData,
        qrCodeName: formData.get("title"),
        data: formData.get("url"),
        qrCodeSvgName: qrPattern,
      };

      if (imageFile) {
        const imageUrl = await sendCloudinaryImage(imageFile);
        qrData.image = imageUrl;
      } else {
        qrData.image = socialImage;
      }

      qrData.backgroundOptions = { color: bgColor };
      qrData.dotsOptions = { ...qrData.dotsOptions, color: color };
      //   qrData.data = profileUrl;
      // corner dot color
      qrData.cornersDotOptions = {
        ...qrData.cornersDotOptions,
        color: color,
      };
      qrData.cornersSquareOptions = {
        ...qrData.cornersSquareOptions,
        color: color,
      };

      // console.log("payload", payload);

      // Send the updated JSON data in a POST request
      const info: any = await updateUserCustomQrCode(
        payload,
        session.accessToken,
        data._id
      );

      // console.log("updated data ", info);

      if (info && info.status === "success") {
        toast.success("Qr code updated");
        setIsLoading(false);
        router.push("/qr-code");
      } else {
        toast.error("something went wrong");
      }
    } catch (error) {
      toast.error("something went wrong");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSelect = (data: any) => {
    setSelectQrCodeSocialLink(data.socialUrl);
    setSocialImage(data.socialIcon);
  };

  return (
    <main className="main-container overflow-hidden">
      <div className="flex gap-6 items-start">
        <div className="w-[62%] border-r border-gray-300 pr-8 flex flex-col gap-4 h-screen overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-gray-700">Customize QR</p>
            {/* <div onClick={handleModal}>
              <EditMicrositeBtn>
                <FiSend />
                Share
              </EditMicrositeBtn>
            </div> */}
          </div>
          <form
            onSubmit={handleFormSubmit}
            className="bg-white py-6 px-10 flex flex-col gap-4"
          >
            <div className="">
              <label
                htmlFor="name"
                className="font-semibold text-gray-700 text-sm block mb-1"
              >
                Your QR Name{" "}
              </label>
              <div className="flex-1">
                <input
                  required
                  type="text"
                  placeholder={`Enter qr name`}
                  id="title"
                  defaultValue={data.name}
                  name="title"
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-lg focus:outline-none px-4 py-2.5 text-gray-700 bg-gray-100 pl-4"
                />
              </div>
            </div>
            <div className="">
              <label
                htmlFor="url"
                className="font-semibold text-gray-700 text-sm"
              >
                I want my QR code to scan to:{" "}
              </label>
              <div className="flex items-center gap-x-1 mb-2">
                {defaultSocialLinkArray.map((data) => (
                  <div
                    className={`p-2 border-2 cursor-pointer ${
                      data.socialUrl === selectQrCodeSocialLink
                        ? "border-blue-500"
                        : "border-gray-200"
                    }`}
                    key={data._id}
                    onClick={() => handleSocialSelect(data)}
                  >
                    <Image
                      src={data.socialIcon}
                      alt={data.socialTitle}
                      width={30}
                      height={30}
                      className="w-6 h-6"
                    />
                  </div>
                ))}
              </div>
              <div className="relative flex-1">
                <IoMdLink
                  className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                  size={18}
                />
                <input
                  type="text"
                  placeholder={selectQrCodeSocialLink}
                  id="url"
                  name="url"
                  // defaultValue={selectQrCodeSocialLink}
                  value={selectQrCodeSocialLink}
                  onChange={(e) => setSelectQrCodeSocialLink(e.target.value)}
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-lg focus:outline-none px-4 py-2.5 text-gray-700 bg-gray-100 pl-10"
                />
              </div>
            </div>
            <div>
              <p className="heading-4 mb-2">Choose A Pattern: </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`w-12 h-12 overflow-hidden rounded-lg ${
                    qrPattern === "QrCode1"
                      ? "bg-black border-2 border-black"
                      : "bg-white"
                  }`}
                  onClick={() => setQrPattern("QrCode1")}
                >
                  <QrCode1
                    height={100}
                    width={100}
                    color={qrPattern === "QrCode1" ? "white" : "black"}
                    className={"-translate-x-[54px] -translate-y-[54px]"}
                  />
                </button>

                <button
                  type="button"
                  className={`w-12 h-12 overflow-hidden rounded-lg ${
                    qrPattern === "QrCode2"
                      ? "bg-black border-2 border-black"
                      : "bg-white"
                  }`}
                  onClick={() => setQrPattern("QrCode2")}
                >
                  <QrCode2
                    height={100}
                    width={100}
                    color={qrPattern === "QrCode2" ? "white" : "black"}
                    className={"-translate-x-[54px] -translate-y-[54px]"}
                  />
                </button>

                <button
                  type="button"
                  className={`w-12 h-12 overflow-hidden rounded-lg ${
                    qrPattern === "QrCode3"
                      ? "bg-black border-2 border-black"
                      : "bg-white"
                  }`}
                  onClick={() => setQrPattern("QrCode3")}
                >
                  <QrCode3
                    height={100}
                    width={100}
                    color={qrPattern === "QrCode3" ? "white" : "black"}
                    className={"-translate-x-[54px] -translate-y-[54px]"}
                  />
                </button>
                <button
                  type="button"
                  className={`w-12 h-12 overflow-hidden rounded-lg ${
                    qrPattern === "QrCode4"
                      ? "bg-black border-2 border-black"
                      : "bg-white"
                  }`}
                  onClick={() => setQrPattern("QrCode4")}
                >
                  <QrCode4
                    height={100}
                    width={100}
                    color={qrPattern === "QrCode4" ? "white" : "black"}
                    className={"-translate-x-[54px] -translate-y-[54px]"}
                  />
                </button>
              </div>
            </div>
            {/* <div>
              <p className="heading-4 mb-2">Pick QR Colors: </p>
              <div className="flex items-center gap-3 bg-gray-100 p-2 rounded-lg">
                <button type="button" onClick={() => setToggle(true)}>
                  <Image
                    alt="pick color"
                    src={"/images/color.png"}
                    width={40}
                    height={40}
                  />
                </button>
                <p className="text-gray-400">
                  {!color || color === "#NaNNaNNaN" ? "#HEX" : color}
                </p>
              </div>
              <div className="w-max" ref={updateColorPickerRef}>
                {toggle && <HexColorPicker color={color} onChange={setColor} />}
              </div>
            </div> */}
            <div>
              <p className="heading-4 mb-2">Pick A Colors: </p>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setColor(data.qrDotColor)}
                  className="w-11 h-11 rounded-full"
                >
                  <Image src={colorCancel} alt="" />
                </button>
                {defaultColorArray.map((data) => (
                  <button
                    type="button"
                    key={data._id}
                    onClick={() => setColor(data.hexCode)}
                    className={`rounded-full border-2 p-1 ${
                      color === data.hexCode
                        ? "border-[#027AFF]"
                        : "border-transparent"
                    } `}
                  >
                    <div
                      style={{ backgroundColor: data.hexCode }}
                      className={`w-11 h-11 rounded-full`}
                    ></div>
                  </button>
                ))}
                <div className="w-11 h-11 rounded-full relative ml-1">
                  {/* <div className="flex items-center gap-3 bg-gray-100 p-2 rounded-lg"> */}
                  <button
                    type="button"
                    onClick={() => setToggle(true)}
                    // className="rounded-full"
                  >
                    <Image
                      alt="pick color"
                      src={"/images/color.png"}
                      width={200}
                      height={200}
                      className="rounded-full"
                    />
                  </button>
                  {/* <p className="text-gray-400">
                      {!color || color === "#NaNNaNNaN" ? "#HEX" : color}
                    </p> */}
                  {/* </div> */}
                  {toggle && (
                    <div
                      ref={updateColorPickerRef}
                      className="w-max absolute top-12 left-0 z-50"
                    >
                      <HexColorPicker color={color} onChange={setColor} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* <div>
              <p className="heading-4 mb-2">Pick Background Colors: </p>
              <div className="flex items-center gap-3 bg-gray-100 p-2 rounded-lg">
                <button
                  type="button"
                  onClick={() => setBackgroundColorToggle(true)}
                >
                  <Image
                    alt="pick color"
                    src={"/images/color.png"}
                    width={40}
                    height={40}
                  />
                </button>
                <p className="text-gray-400">
                  {!bgColor || bgColor === "#NaNNaNNaN" ? "#HEX" : bgColor}
                </p>
              </div>
              <div ref={backgroundUpdatePickerRef} className="w-max">
                {backgroundColorToggle && (
                  <HexColorPicker color={bgColor} onChange={setBgColor} />
                )}{" "}
              </div>
            </div> */}
            <div>
              <p className="heading-4 mb-2">Pick Background Colors: </p>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setBgColor(data.backgroundColor)}
                  className="w-11 h-11 rounded-full"
                >
                  <Image src={colorCancel} alt="" />
                </button>
                {defaultBackgroundColorArray.map((data) => (
                  <button
                    type="button"
                    key={data._id}
                    onClick={() => setBgColor(data.hexCode)}
                    className={`rounded-full border-2 p-1 ${
                      bgColor === data.hexCode
                        ? "border-[#027AFF]"
                        : "border-transparent"
                    } `}
                  >
                    <div
                      style={{ backgroundColor: data.hexCode }}
                      className={`w-11 h-11 rounded-full`}
                    ></div>
                  </button>
                ))}
                <div className="w-11 h-11 rounded-full relative ml-1">
                  {/* <div className="flex items-center gap-3 bg-gray-100 p-2 rounded-lg"> */}
                  <button
                    type="button"
                    onClick={() => setBackgroundColorToggle(true)}
                  >
                    <Image
                      alt="pick color"
                      src={"/images/color.png"}
                      width={200}
                      height={200}
                      className="rounded-full"
                    />
                  </button>
                  {/* <p className="text-gray-400">
                      {!bgColor || bgColor === "#NaNNaNNaN" ? "#HEX" : bgColor}
                    </p> */}
                  {/* </div> */}
                  <div
                    className="w-max absolute top-12 left-0 z-50"
                    ref={backgroundUpdatePickerRef}
                  >
                    {backgroundColorToggle && (
                      <HexColorPicker color={bgColor} onChange={setBgColor} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Choose Shape */}

            <div className="">
              <p className="heading-4 mb-2">Choose Shape:</p>
              <div className="flex items-center gap-3">
                {defaultShapeArray.map((data) => (
                  <div
                    className={`p-2.5 border-2 rounded-full cursor-pointer ${
                      data.shapeTitle === qrCodeShape
                        ? "border-blue-500"
                        : "border-gray-200"
                    }`}
                    key={data._id}
                    // onClick={() => setqrCodeShape(data.shapeTitle)}
                  >
                    <Image
                      src={data.shapeUrl}
                      alt={data.shapeTitle}
                      width={30}
                      height={30}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Choose Frame */}
            <div className="">
              <p className="heading-4 mb-2">Choose Frame:</p>
              <div className="flex items-center gap-3">
                {defaultFrameArray.map((data) => (
                  <div
                    className={`p-2.5 border-2 rounded-full cursor-pointer ${
                      data.frameTitle === qrCodeFrame
                        ? "border-blue-500"
                        : "border-gray-200"
                    }`}
                    key={data._id}
                    // onClick={() => setqrCodeFrame(data.frameTitle)}
                  >
                    <Image
                      src={data.frameUrl}
                      alt={data.frameTitle}
                      width={30}
                      height={30}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="">
              <label htmlFor="name" className="heading-4 mb-2">
                Edit Logo:{" "}
              </label>

              <div>
                <div className="flex items-center w-full border-2 border-[#ede8e8] focus-within:border-[#e5e0e0] rounded-lg bg-white px-4 py-1">
                  {/* Icon at the start */}
                  <span className="text-gray-500 pr-2">
                    <MdAttachFile />
                  </span>

                  {/* Input field */}
                  <input
                    type="text"
                    placeholder={uploadImageFileName}
                    id="title"
                    name="title"
                    className="w-full bg-transparent border-none focus:outline-none text-gray-700"
                  />

                  {/* CustomFileInput component at the end */}
                  <CustomFileInput
                    title="Upload"
                    handleFileChange={handleFileChange}
                  />
                </div>

                {/* {fileError && (
                  <p className='text-red-600 text-sm font-medium'>
                    {fileError}
                  </p>
                )} */}
              </div>
            </div>

            {/* <div className='flex flex-col 2xl:flex-row 2xl:items-center gap-2'>
              <p className='font-semibold text-gray-700 text-sm'>Edit Logo:</p>
              <CustomFileInput handleFileChange={handleFileChange} />
              {fileError && (
                <p className='text-red-600 text-sm font-medium'>{fileError}</p>
              )}
            </div> */}

            {/* <div>
              <div className="flex items-center gap-4">
                <p className="heading-4 mb-2">QR Code Branding</p>
                <DynamicPrimaryBtn className="text-xs !py-1 !px-2 !gap-1">
                  <IoIosLock /> Pro
                </DynamicPrimaryBtn>
              </div>
              <div className="flex items-center gap-2">
                <p>I want to remove the swop logo: </p>
                <Switch
                  color="default"
                  size="sm"
                  defaultSelected
                  aria-label="Lead Captures"
                />
              </div>
            </div> */}

            {/* QR Code Branding */}

            <div className="">
              <div className="flex items-center gap-x-2 mb-2">
                <label htmlFor="name" className="heading-4">
                  QR Code Branding:
                </label>
                <div className="border border-black p-0.5 rounded-full">
                  <MdQrCode2 className="size-3 rounded-full text-black" />
                </div>
                <Link
                  href={"/account-settings?upgrade=true"}
                  className="bg-black rounded-full text-white p-1 flex items-center gap-x-1 px-2 ml-2"
                >
                  <MdLockOutline className="size-3" />
                  <p className="text-xs">Pro</p>
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <p>I want to remove the Swop Logo:</p>
                <Switch
                  isDisabled
                  // defaultSelected
                  aria-label="Automatic updates"
                  color="primary"
                />
              </div>
            </div>

            <div>
              <DynamicPrimaryBtn disabled={isLoading} className="mt-3 w-40">
                {isLoading ? (
                  <Spinner className="py-0.5" size="sm" color="white" />
                ) : (
                  <>
                    {" "}
                    <FaSave size={18} />
                    Update
                  </>
                )}
              </DynamicPrimaryBtn>
            </div>
          </form>
        </div>

        {/* live preview  */}
        <div className="w-[38%] flex flex-col items-center gap-4">
          <p className="text-gray-500 font-medium mb-2">Live Preview</p>
          <div className="bg-white p-2.5 rounded-xl shadow-medium">
            <div
              style={{ backgroundColor: bgColor }}
              className={`relative p-2 rounded-lg`}
            >
              {qrPattern === "QrCode1" && (
                <QrCode1 width={200} height={200} color={color} />
              )}
              {qrPattern === "QrCode2" && (
                <QrCode2 width={200} height={200} color={color} />
              )}
              {qrPattern === "QrCode3" && (
                <QrCode3 width={200} height={200} color={color} />
              )}
              {qrPattern === "QrCode4" && (
                <QrCode4 width={200} height={200} color={color} />
              )}

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                {imageFile ? (
                  <Image
                    src={imageFile}
                    quality={100}
                    alt="logo"
                    width={200}
                    height={200}
                    className="w-11 h-11 -translate-y-2"
                  />
                ) : (
                  <Image
                    src={socialImage}
                    quality={100}
                    alt="logo"
                    width={200}
                    height={200}
                    className="w-10 h-10 -translate-y-2"
                  />
                )}
              </div>
              <p className="text-[10px] text-gray-600 text-center ">
                Powered By Swop
              </p>
            </div>
          </div>
          {/* <p className="heading-4 mt-4">Select Download Type</p>
          <div>
            <RadioGroup value="PDF" orientation="horizontal" color="success">
              <Radio value="PDF">PDF</Radio>
              <Radio value="JPG">JPG</Radio>
              <Radio value="PNG">PNG</Radio>
              <Radio value="SVG">SVG</Radio>
            </RadioGroup>
          </div>
          <DynamicPrimaryBtn>
            <MdOutlineFileUpload size={18} />
            Download
          </DynamicPrimaryBtn> */}
        </div>
      </div>
    </main>
  );
};

export default UpdateQRCode;
