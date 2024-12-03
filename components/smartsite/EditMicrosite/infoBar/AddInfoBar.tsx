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

import { isEmptyObject } from "@/components/util/checkIsEmptyObject";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { MdInfoOutline } from "react-icons/md";
import { InfoBarIconMap, InfoBarSelectedIconType } from "@/types/smallIcon";
import contactCardImg from "@/public/images/IconShop/appIconContactCard.png";
import productImg from "@/public/images/product.png";
import toast from "react-hot-toast";

const AddInfoBar = ({ handleRemoveIcon, handleToggleIcon }: any) => {
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
          Info Bar
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            content={
              <span className="font-medium">
                You will be able to set the icon type, choose an icon , specify
                a button name, provide a link, and add a description.
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
        onClick={() => handleRemoveIcon("Info Bar")}
      >
        <FaTimes size={18} />
      </button>

      <div className="flex flex-col gap-2 mt-4 px-10 2xl:px-[10%]">
        <div className="w-full rounded-xl bg-gray-200 p-3">
          <div className="bg-white rounded-xl w-full flex items-center gap-2 py-1 px-3">
            <Image
              className="w-12 rounded-full"
              src={selectedIcon.icon}
              alt="icon"
            />
            <div>
              <p className="text-gray-700 font-medium">{selectedIcon.name}</p>
              <p className="text-gray-500 text-sm font-medium">{description}</p>
            </div>
          </div>
        </div>

        {/* middle part  */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-700 w-32">Info Bar Types</h3>
            <Dropdown className="w-max rounded-lg" placement="bottom-start">
              <DropdownTrigger>
                <button
                  type="button"
                  className="bg-white w-48 2xl:w-64 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small"
                >
                  <span className="flex items-center gap-2">
                    {selectedIconType && (
                      <Image
                        alt="app-icon"
                        src={iconMap[selectedIconType]}
                        className="w-5 h-auto"
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
        </div>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-700 w-32">Select Icon</h3>

          <Dropdown className="w-max rounded-lg" placement="bottom-start">
            <DropdownTrigger>
              <div
                className={`flex items-center ${
                  isEmptyObject(selectedIconData) && "relative group"
                }`}
              >
                {/* <button
                  disabled={isEmptyObject(selectedIconData)}
                  className={`${
                    isEmptyObject(selectedIconData) && "cursor-not-allowed"
                  } `}
                >
                  <AiOutlineDownCircle size={20} color="gray" />
                </button> */}
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
                {selectedIconData.icons.map((data: any) => (
                  <DropdownItem
                    key={data._id}
                    onClick={() => addSelectedIcon(data)}
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
        </div>
        <div>
          <form
            onSubmit={handleInfoBarFormSubmit}
            className="flex flex-col gap-3"
          >
            <div>
              <p className="font-semibold text-gray-700 mb-1">Button Name</p>
              <div>
                <input
                  type="text"
                  name="buttonName"
                  value={buttonName}
                  onChange={(e) => setButtonName(e.target.value)}
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                  placeholder={"Enter Button Name"}
                  required
                />
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-1">
                {selectedIcon.inputText}
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
                  placeholder={selectedIcon.placeHolder}
                  required
                />
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-1">Description</p>

              <textarea
                name="description"
                required
                className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                placeholder="Enter description"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-center">
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

export default AddInfoBar;
