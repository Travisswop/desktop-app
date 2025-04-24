import Image from "next/image";
import React, { useEffect, useState } from "react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from "@nextui-org/react";
import { IoLinkOutline } from "react-icons/io5";
import { LiaFileMedicalSolid } from "react-icons/lia";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { postAppIcon } from "@/actions/appIcon";
import { FaAngleDown, FaTimes } from "react-icons/fa";
import { icon, newIcons } from "@/components/util/data/smartsiteIconData";
import { isEmptyObject } from "@/components/util/checkIsEmptyObject";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { MdInfoOutline } from "react-icons/md";
import { AppIconMap, AppSelectedIconType } from "@/types/smallIcon";
import toast from "react-hot-toast";
import { useUser } from "@/lib/UserContext";
import customImg from "@/public/images/IconShop/Upload@3x.png";
import CustomFileInput from "@/components/CustomFileInput";
import { sendCloudinaryImage } from "@/lib/SendCloudineryImage";

const AddAppIcon = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state); //get small icon store value
  const { accessToken }: any = useUser();
  const [selectedIconType, setSelectedIconType] =
    useState<AppSelectedIconType>("Link");
  const [selectedIcon, setSelectedIcon] = useState({
    name: "Amazon Music",
    icon: icon.appIconAmazonMusic,
    placeHolder: "https://www.music.amazon.com/abc",
    inputText: "Amazon Music Link",
    url: "https://music.amazon.com",
  });
  const [selectedIconData, setSelectedIconData] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>("");
  // console.log("selected icon data", selectedIconData);
  console.log("selected icon", selectedIcon);
  console.log("selected icon selectedIconType", selectedIconType);
  console.log("imageFile", imageFile);

  const iconData: any = newIcons[1];

  useEffect(() => {
    if (selectedIconType) {
      const data = iconData.icons.find(
        (item: any) => item.category === selectedIconType
      );
      setSelectedIconData(data);
    }
  }, [iconData.icons, selectedIconType]);

  const handleSelectIconType = (category: AppSelectedIconType) => {
    setSelectedIconType(category);
    if (category === "Link") {
      setSelectedIcon({
        name: "Amazon Music",
        icon: icon.appIconAmazonMusic,
        placeHolder: "https://www.music.amazon.com/abc",
        inputText: "Amazon Music Link",
        url: "https://music.amazon.com",
      });
    } else if (category === "Call To Action") {
      setSelectedIcon({
        name: "Email",
        icon: icon.appIconEmail,
        placeHolder: "Type Your Email Address",
        inputText: "Email Address",
        url: "www.email.com",
      });
    }
  };

  const handleAppIconFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const appIconInfo = {
      micrositeId: state.data._id,
      name: selectedIcon.name,
      value: formData.get("url"),
      url: selectedIcon.url,
      iconName: selectedIcon.name,
      iconPath: "",
      group: selectedIconData?.category,
    };
    const customIconInfo = {
      micrositeId: state.data._id,
      name: formData.get("customName") || "Custom name",
      value: formData.get("url"),
      url: "custom",
      iconName: selectedIcon.name,
      iconPath: "",
      group: "custom",
    };
    if (selectedIconType === "Custom Image" && imageFile) {
      const imgUrl = await sendCloudinaryImage(imageFile);
      customIconInfo.iconName = imgUrl;
    } else if (selectedIconType === "Custom Image" && !imageFile) {
      return toast.error("Select custom image");
    }

    console.log("appIconInfo", customIconInfo);
    try {
      const data = await postAppIcon(
        selectedIconType === "Custom Image" ? customIconInfo : appIconInfo,
        accessToken
      );
      console.log("data", data);

      if ((data.state = "success")) {
        toast.success("App icon created successfully");
        handleRemoveIcon("App Icon");
      } else {
        toast.error("Something went wrong");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const iconMap: AppIconMap = {
    Link: icon.Custom_link1,
    "Call To Action": icon.ChatlinkType,
    "Custom Image": customImg,
  };

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // Check if file size is greater than 10 MB
        setFileError("File size should be less than 10 MB");
        setImageFile(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageFile(reader.result as any);
          setFileError("");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
      <div className="flex items-end gap-1 justify-center">
        <h2 className="font-semibold text-gray-700 text-xl text-center">
          App Icon
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                Select the icon type and icon you want to use then upload the
                account information.
              </span>
            }
            className={`max-w-40 h-auto`}
          >
            <button>
              <MdInfoOutline />
            </button>
          </Tooltip>
        </div>
      </div>
      <button
        className="absolute top-3 right-3"
        type="button"
        onClick={() => handleRemoveIcon("App Icon")}
      >
        <FaTimes size={18} />
      </button>
      <div
        className={`flex justify-center bg-[#F2F2F2] rounded-xl ${
          selectedIconType !== "Custom Image" && !imageFile
            ? "py-5 px-20"
            : "px-[60px] py-4"
        }  w-max mx-auto`}
      >
        {selectedIcon &&
        selectedIcon?.icon &&
        selectedIconType !== "Custom Image" ? (
          <Image
            alt="app-icon"
            src={selectedIcon?.icon}
            className="w-14 h-auto"
            // style={tintStyle}
            quality={100}
          />
        ) : (
          <>
            {selectedIconType === "Link" && (
              <Image
                alt="app-icon"
                src={icon.SocialIconType}
                className="w-14 h-auto"
                quality={100}
              />
            )}
            {selectedIconType === "Call To Action" && (
              <Image
                alt="app-icon"
                src={icon.ChatlinkType}
                className="w-14 h-auto"
                quality={100}
              />
            )}
            {selectedIconType === "Custom Image" && !imageFile ? (
              <Image
                alt="custom-image"
                src="/images/smartsite_icon/photo.png"
                width={220}
                height={180}
                className="w-24 h-auto"
                quality={100}
              />
            ) : (
              <Image
                alt="custom-image"
                src={imageFile}
                width={220}
                height={180}
                className="w-14 h-auto"
                quality={100}
              />
            )}
          </>
        )}
      </div>
      <div className="flex flex-col gap-2 mt-4 px-10 2xl:px-[10%]">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold w-32">App Icon Types</h3>
          <Dropdown className="w-max rounded-lg" placement="bottom-start">
            <DropdownTrigger>
              <button
                type="button"
                className="bg-white w-48 2xl:w-64 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small"
              >
                <span className="flex items-center gap-2">
                  {selectedIconType && (
                    // <Image
                    //   alt="app-icon"
                    //   src={iconMap[selectedIconType]}
                    //   className={"w-5 h-5"}
                    // />
                    <Image
                      alt="app-icon"
                      src={iconMap[selectedIconType]}
                      className={`w-5 h-5 ${
                        selectedIconType === "Link" && "rounded-full"
                      }`}
                    />
                  )}
                  {selectedIconType}
                </span>{" "}
                <FaAngleDown />
              </button>
            </DropdownTrigger>
            <DropdownMenu
              disabledKeys={["title"]}
              aria-label="Static Actions"
              className="p-2"
            >
              <DropdownItem
                key={"title"}
                className=" hover:!bg-white opacity-100 cursor-text disabled dropDownTitle"
              >
                <p>Choose Icon Type</p>
              </DropdownItem>
              {iconData.icons.map((data: any, index: number) => (
                <DropdownItem
                  key={index}
                  onClick={() => handleSelectIconType(data.category)}
                  className="border-b rounded-none hover:rounded-md"
                >
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Image
                      src={data.categoryIcon}
                      alt={data.category}
                      className={`w-5 h-5 ${
                        data.category === "Link" && "rounded-full"
                      }`}
                    />{" "}
                    {data.category}
                  </div>
                </DropdownItem>
              ))}
              <DropdownItem
                onClick={() => handleSelectIconType("Custom Image")}
                className="border-b rounded-none hover:rounded-md"
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Image
                    src={"/images/IconShop/Upload@3x.png"}
                    alt={"custom image"}
                    width={120}
                    height={120}
                    className="w-5 h-auto"
                  />{" "}
                  Upload Custom Image
                </div>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold w-32">Select Icon</h3>

          {selectedIconType === "Custom Image" ? (
            <CustomFileInput handleFileChange={handleFileChange} />
          ) : (
            <Dropdown className="w-max rounded-lg" placement="bottom-start">
              <DropdownTrigger>
                <div
                  className={`flex items-center ${
                    isEmptyObject(selectedIconData) && "relative group"
                  }`}
                >
                  <button
                    type="button"
                    disabled={isEmptyObject(selectedIconData)}
                    className={`bg-white w-48 2xl:w-64 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small ${
                      isEmptyObject(selectedIconData) && "cursor-not-allowed"
                    } `}
                  >
                    <span className="flex items-center gap-2">
                      <Image
                        src={selectedIcon.icon}
                        alt={selectedIcon.inputText}
                        className="w-4 h-auto"
                        quality={100}
                        // style={tintStyle}
                      />
                      {selectedIcon.name}
                    </span>{" "}
                    <FaAngleDown />
                  </button>
                  {isEmptyObject(selectedIconData) && (
                    <div className="hidden text-xs text-gray-600 px-2 w-28 py-1.5 bg-slate-200 shadow-medium z-50 absolute left-6 top-0 group-hover:flex justify-center">
                      <p>select icon type</p>
                    </div>
                  )}
                </div>
              </DropdownTrigger>
              {selectedIconData && selectedIconData?.icons?.length > 0 && (
                <DropdownMenu
                  disabledKeys={["title"]}
                  aria-label="Static Actions"
                  className="p-2 overflow-y-auto max-h-[30rem]"
                >
                  <DropdownItem
                    key={"title"}
                    className=" hover:!bg-white opacity-100 cursor-text disabled dropDownTitle"
                  >
                    <p>Choose Icon</p>
                  </DropdownItem>

                  {selectedIconData?.icons?.map((data: any, index: number) => (
                    <DropdownItem
                      key={index}
                      onClick={() =>
                        setSelectedIcon({
                          name: data.name,
                          icon: data.icon,
                          placeHolder: data.placeHolder,
                          inputText: data.inputText,
                          url: data.url,
                        })
                      }
                      className="border-b rounded-none hover:rounded-md"
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Image
                          src={data.icon}
                          alt={data.inputText}
                          className="w-4 h-auto"
                          quality={100}
                          //   style={tintStyle}
                        />
                        {data.name}
                      </div>
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              )}
            </Dropdown>
          )}
        </div>
        <div>
          <form onSubmit={handleAppIconFormSubmit}>
            {selectedIconType === "Custom Image" && (
              <div>
                <p className="font-semibold text-gray-700 mb-1">Name :</p>
                <input
                  type="text"
                  name="customName"
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                  placeholder={"Enter name"}
                  defaultValue={"Custom Name"}
                  required
                />
              </div>
            )}
            <p className="font-semibold text-gray-700 mb-1">
              {selectedIconType === "Custom Image"
                ? "Link"
                : selectedIcon.inputText}{" "}
              :
            </p>
            <div className="relative">
              <IoLinkOutline
                className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                size={20}
              />
              <input
                type="text"
                name="url"
                className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-11 py-2 text-gray-700 bg-gray-100"
                placeholder={
                  selectedIconType === "Custom Image"
                    ? "Enter Link"
                    : selectedIcon.placeHolder
                }
                required
              />
            </div>
            <div className="flex justify-center mt-3">
              <AnimateButton
                whiteLoading={true}
                className="bg-black text-white py-2 !border-0"
                isLoading={isLoading}
                width={"w-40"}
              >
                <LiaFileMedicalSolid size={20} />
                Create
              </AnimateButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAppIcon;
