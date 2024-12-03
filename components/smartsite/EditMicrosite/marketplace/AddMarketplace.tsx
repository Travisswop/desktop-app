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

const AddMarketplace = ({ handleRemoveIcon, handleToggleIcon }: any) => {
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
          Marketplace
        </h2>
        <div className="translate-y-0.5">
          <Tooltip
            size="sm"
            isDisabled
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
        onClick={() => handleRemoveIcon("Marketplace")}
      >
        <FaTimes size={18} />
      </button>

      <div className="flex flex-col gap-2 mt-4 px-10 2xl:px-[10%]">
        <div className="w-full rounded-xl border border-gray-300 p-3">
          <div className="w-full flex flex-col gap-3">
            <div className="flex justify-center">
              <Image
                src={"/images/headphone.png"}
                width={300}
                height={400}
                alt="icon"
                className="w-48 h-auto rounded-full"
              />
            </div>
            <div className="px-20 flex flex-col items-center gap-2">
              <p className="text-gray-700 font-semibold">
                MackBook Pro 14-inch M1 Chiip
              </p>
              <p className="text-gray-600 font-normal text-sm text-center">
                {`The H2-powered AirPods Pro 2 feature Adaptive Audio,
                automatically prioritizing sounds that need your attention as
                you move through the world`}
              </p>
              <div className="flex items-center justify-between gap-4">
                <AnimateButton
                  whiteLoading={true}
                  className="bg-black text-white py-2 !border-0"
                  isLoading={isLoading}
                  width={"w-40"}
                >
                  {/* <LiaFileMedicalSolid size={20} /> */}
                  Price $565
                </AnimateButton>
                <AnimateButton
                  whiteLoading={true}
                  className="bg-black text-white py-2 !border-0"
                  isLoading={isLoading}
                  width={"w-44"}
                >
                  Add to Cart
                  <LiaFileMedicalSolid size={20} />
                </AnimateButton>
              </div>
            </div>
          </div>
        </div>

        {/* middle part  */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-700 w-20">Add Item</h3>
            <Dropdown
              isDisabled
              className="w-max rounded-lg"
              placement="bottom-start"
            >
              <DropdownTrigger>
                <button
                  type="button"
                  disabled
                  className="bg-white w-48 2xl:w-64 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small"
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
                    <div className="w-5 h-5 bg-black rounded-full"></div>
                    Select Item
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
        <div>
          <form
            onSubmit={handleInfoBarFormSubmit}
            className="flex flex-col gap-3"
          >
            <div>
              <p className="font-semibold text-gray-700 mb-1">Category Name</p>
              <div>
                <input
                  type="text"
                  name="category"
                  //   value={buttonName}
                  //   onChange={(e) => setButtonName(e.target.value)}
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                  placeholder={"Enter Category Name"}
                  required
                />
              </div>
            </div>
            <div className="flex justify-center">
              <AnimateButton
                isDisabled={true}
                type="button"
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

export default AddMarketplace;
