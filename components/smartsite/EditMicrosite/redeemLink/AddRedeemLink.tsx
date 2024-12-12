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
// import { icon, newIcons } from "@/util/data/smartsiteIconData";
// import { isEmptyObject } from "@/util/checkIsEmptyObject";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
// import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
// import { toast } from "react-toastify";
// import AnimateButton from "../../Button/AnimateButton";
import { postInfoBar } from "@/actions/infoBar";
import { FaAngleDown, FaTimes } from "react-icons/fa";
import { icon, newIcons } from "@/components/util/data/smartsiteIconData";

import filePlaceholder from "@/public/images/placeholder-photo.png";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { MdInfoOutline } from "react-icons/md";
import { InfoBarIconMap, InfoBarSelectedIconType } from "@/types/smallIcon";
import contactCardImg from "@/public/images/IconShop/appIconContactCard.png";
import productImg from "@/public/images/product.png";
import toast from "react-hot-toast";
import placeholder from "@/public/images/image_placeholder.png";
import CustomFileInput from "@/components/CustomFileInput";

const AddRedeemLink = ({ handleRemoveIcon, handleToggleIcon }: any) => {
  const demoToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjM4NjMyMDIzMDQxMDMyODAyOTk4MmIiLCJpYXQiOjE3MjcxNTI4MzB9.CsHnZAgUzsfkc_g_CZZyQMXc02Ko_LhnQcCVpeCwroY";
  const state: any = useSmartSiteApiDataStore((state) => state); //get small icon store value
  //const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value
  const [selectedIconType, setSelectedIconType] =
    useState<InfoBarSelectedIconType>("Link");
  const [selectedIcon, setSelectedIcon] = useState({
    name: "Amazon Music",
    icon: icon.appIconAmazonMusic,
    placeHolder: "https://www.music.amazon.com/abc",
    inputText: "Amazon Music Link",
    url: "https://music.amazon.com",
  });
  const [selectedIconData, setSelectedIconData] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [buttonName, setButtonName] = useState(selectedIcon.name);
  const [description, setDescription] = useState("");
  const [linkName, setLinkName] = useState("");
  const [imageFile, setImageFile] = useState<any>(null);
  const [imageFileError, setImageFileError] = useState<string>("");
  // console.log("selected icon name", selectedIcon);
  // console.log("selected icon data", selectedIconData);
  // console.log("selected icon", selectedIcon);

  const iconData: any = newIcons[1];
  // console.log("iconData", iconData);

  useEffect(() => {
    if (selectedIconType) {
      const data = iconData.icons.find(
        (item: any) => item.category === selectedIconType
      );
      setSelectedIconData(data);
    }
  }, [iconData.icons, selectedIconType]);

  const handleImageFileChange = (event: any) => {
    // get image file
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 10 * 1024 * 1024) {
        // Check if file size is greater than 10 MB
        setImageFileError("File size should be less than 10 MB");
        setImageFile(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageFile(reader.result as any);
          setImageFileError("");
        };
        reader.readAsDataURL(file);
      }
    } else {
      setImageFileError("Please upload a image file.");
    }
  };

  const handleSelectIconType = (category: InfoBarSelectedIconType) => {
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
    } else if (category === "Product Link") {
      handleToggleIcon("Swop Pay");
    } else if (category === "Contact Card") {
      handleToggleIcon("Contact Card");
    }
  };

  const handleInfoBarFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const infobarInfo = {
      micrositeId: state.data._id,
      title: formData.get("url"),
      link: selectedIcon.url,
      buttonName: buttonName,
      description: formData.get("description"),
      iconName: selectedIcon.name,
      iconPath: "",
      group: selectedIconData.category,
    };
    // console.log("smallIconInfo", infobarInfo);
    try {
      const data = await postInfoBar(infobarInfo, demoToken);
      // console.log("data", data);

      if ((data.state = "success")) {
        toast.success("Info bar crated successfully");
        handleRemoveIcon("Info Bar");
      } else {
        toast.error("Something went wrong");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // console.log("selected icon", selectedIcon);
  // console.log("button", buttonName);

  const addSelectedIcon = (data: any) => {
    setSelectedIcon({
      name: data.name,
      icon: data.icon,
      placeHolder: data.placeHolder,
      inputText: data.inputText,
      url: data.url,
    });
    setButtonName(data.name);
  };

  const iconMap: InfoBarIconMap = {
    Link: icon.SocialIconType,
    "Call To Action": icon.ChatlinkType,
    "Product Link": productImg,
    "Contact Card": contactCardImg,
  };

  return (
    <div className="relative bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
      {/* top part  */}
      <div className="flex items-end gap-1 justify-center">
        <h2 className="font-semibold text-gray-700 text-xl text-center">
          Redeem Link
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                Create a portal that people can click to collect tokens and
                collectables.
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
        onClick={() => handleRemoveIcon("Redeem Link")}
      >
        <FaTimes size={18} />
      </button>

      <div className="flex flex-col gap-2 mt-4 px-10 2xl:px-[10%]">
        <div className="bg-white rounded-xl shadow-medium w-full flex items-center gap-2 p-3 mb-1">
          {imageFile ? (
            <Image
              className="w-14 h-14 rounded-lg"
              src={imageFile}
              width={120}
              height={120}
              alt="icon"
            />
          ) : (
            <Image
              className="w-14 h-14 rounded-lg"
              src={placeholder}
              alt="icon"
            />
          )}
          <div>
            <p className="text-gray-700 font-medium">
              {linkName ? linkName : "Redeemable"}
            </p>
            <p className="text-gray-500 text-sm font-normal">
              {description
                ? description
                : "Click to Redeem a Free Digital Collectible"}
            </p>
          </div>
        </div>

        {/* middle part  */}
        <div>
          <form
            onSubmit={handleInfoBarFormSubmit}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-4">
              <div className="w-full bg-white shadow-medium rounded-xl p-4">
                <div className="bg-gray-100 rounded-xl p-4 flex flex-col items-center gap-2">
                  <div className="w-16 h-10">
                    <Image
                      src={filePlaceholder}
                      alt="placeholder"
                      className="w-10 h-auto mx-auto"
                    />
                  </div>
                  <p className="text-gray-400 font-normal text-sm">
                    Redeem Link Icon
                  </p>
                  <CustomFileInput
                    title={"Browse"}
                    handleFileChange={handleImageFileChange}
                  />
                  {/* {inputError.image && (
                  <p className="text-red-600 font-medium text-sm mt-1">
                    cover photo is required
                  </p>
                )} */}

                  {imageFileError && (
                    <p className="text-red-600 font-medium text-sm mt-1">
                      {imageFileError}
                    </p>
                  )}
                </div>
              </div>
              <div className="w-full">
                <div className="flex flex-col xl:flex-row items-center gap-x-2">
                  <h3 className="font-semibold text-gray-700 w-44">
                    Select Token
                  </h3>
                  <Dropdown
                    isDisabled
                    className="w-full rounded-lg"
                    placement="bottom-start"
                  >
                    <DropdownTrigger>
                      <button
                        type="button"
                        className="bg-white mb-2 xl:mb-0 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small w-full"
                      >
                        <span className="flex items-center gap-2">
                          {/* {selectedIconType && (
                            <Image
                              alt="app-icon"
                              src={iconMap[selectedIconType]}
                              className="w-5 h-auto"
                            />
                          )} */}
                          {/* {selectedIconType} */}
                          Select Token
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
                              className="w-5 h-auto"
                            />{" "}
                            {data.category}
                          </div>
                        </DropdownItem>
                      ))}
                      <DropdownItem
                        onClick={() => handleSelectIconType("Product Link")}
                        className="border-b rounded-none hover:rounded-md"
                      >
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          <Image
                            src={productImg}
                            alt={"product"}
                            className="w-5 h-auto"
                          />
                          <p>Product Link</p>
                        </div>
                      </DropdownItem>
                      <DropdownItem
                        onClick={() => handleSelectIconType("Contact Card")}
                        className="border-b rounded-none hover:rounded-md"
                      >
                        <div className="flex items-center gap-2 font-semibold text-sm">
                          <Image
                            src={contactCardImg}
                            alt={"contact card"}
                            className="w-5 h-auto"
                          />
                          <p>Contact Card</p>
                        </div>
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
                <p className="font-semibold text-gray-700 mb-0.5">Amount</p>
                <div>
                  <input
                    type="text"
                    name="amount"
                    //   value={buttonName}
                    //   onChange={(e) => setButtonName(e.target.value)}
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                    placeholder={"Enter Amount"}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="w-full flex items-center gap-4">
              <div className="w-full">
                <p className="font-semibold text-gray-700 mb-0.5">Link Name</p>
                <div>
                  <input
                    type="text"
                    name="link"
                    //   value={buttonName}
                    //   onChange={(e) => setButtonName(e.target.value)}
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                    placeholder={"Enter Link Name"}
                    required
                  />
                </div>
              </div>
              <div className="w-full">
                <p className="font-semibold text-gray-700 mb-0.5">Mint Limit</p>
                <div>
                  <input
                    type="text"
                    name="mintLimit"
                    //   value={buttonName}
                    //   onChange={(e) => setButtonName(e.target.value)}
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                    placeholder={"Enter Mint Limit"}
                    required
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-1">Description</p>
              <div>
                <textarea
                  name="description"
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                  placeholder="Enter description"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-center">
              <AnimateButton
                isDisabled
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

export default AddRedeemLink;
