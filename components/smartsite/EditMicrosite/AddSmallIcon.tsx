import Image from "next/image";
import React, { useEffect, useState } from "react";
import appIconImg from "@/public/images/websites/edit-microsite/add-icon/app-icon.svg";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Spinner,
  Switch,
} from "@nextui-org/react";
import { AiOutlineDownCircle } from "react-icons/ai";
import { IoLinkOutline } from "react-icons/io5";
import { LiaFileMedicalSolid } from "react-icons/lia";
import EditMicrositeBtn from "../Button/EditMicrositeBtn";
import { icon, newIcons } from "@/util/data/smartsiteIconData";
import { isEmptyObject } from "@/util/checkIsEmptyObject";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { handleSmallIcon } from "@/actions/createSmallIcon";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import AnimateButton from "../Button/AnimateButton";
import { FaTimes } from "react-icons/fa";

const AddSmallIcon = ({ handleRemoveIcon }: any) => {
  const state: any = useSmartSiteApiDataStore((state) => state); //get small icon store value
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value
  const [selectedIconType, setSelectedIconType] = useState("Social Media");
  const [selectedIcon, setSelectedIcon] = useState({
    name: "X",
    icon: icon.SmallIconTwitter,
    placeHolder: "https://x.com/username",
    inputText: "X Username",
    url: "www.x.com",
  });
  const [selectedIconData, setSelectedIconData] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // console.log("selected icon name", selectedIcon);
  // console.log("selected icon data", selectedIconData);
  // console.log("selected icon", selectedIcon);

  const iconData: any = newIcons[0];
  // console.log("iconData", iconData);

  useEffect(() => {
    if (selectedIconType) {
      const data = iconData.icons.find(
        (item: any) => item.category === selectedIconType
      );
      setSelectedIconData(data);
    }
  }, [selectedIconType]);

  const tintStyle = {
    filter: "brightness(0) invert(0)",
  };

  const handleSelectIconType = (category: string) => {
    setSelectedIconType(category);
    if (category === "Social Media") {
      setSelectedIcon({
        name: "X",
        icon: icon.SmallIconTwitter,
        placeHolder: "https://x.com/username",
        inputText: "X Username",
        url: "www.x.com",
      });
    } else if (category === "Chat Links") {
      setSelectedIcon({
        name: "Whatsapp",
        icon: icon.smallIconWhatsapp,
        placeHolder: "+123456789",
        inputText: "Whatsapp Number",
        url: "www.whatsapp.com",
      });
    } else if (category === "Commands") {
      setSelectedIcon({
        name: "Email",
        icon: icon.smallIconEmail,
        placeHolder: "xyz@gmail.com",
        inputText: "Email Address",
        url: "www.gmail.com",
      });
    }
  };

  const handleSmallIconFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const smallIconInfo = {
      micrositeId: state.data._id,
      name: selectedIcon.name,
      value: formData.get("url"),
      url: selectedIcon.url,
      iconName: selectedIcon.name,
      iconPath: "",
      group: selectedIconData.category,
    };
    // console.log("smallIconInfo", smallIconInfo);
    // console.log("token", sesstionState.accessToken);
    try {
      const data = await handleSmallIcon(
        smallIconInfo,
        sesstionState.accessToken
      );

      // console.log("create small icon", data);

      if ((data.state = "success")) {
        toast.success("small icon created successfully");
      } else {
        toast.error("something went wrong");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // console.log("smartSiteData", state);
  // console.log("sesstionState", sesstionState);

  return (
    <div className="bg-white rounded-xl shadow-small p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-700">Small Icon Type</h3>
          {!selectedIconType && (
            <Image alt="app-icon" src={appIconImg} className="w-8 h-auto" />
          )}
          {selectedIconType === "Social Media" && (
            <Image
              alt="app-icon"
              src={icon.SocialIconType}
              className="w-5 h-auto"
            />
          )}
          {selectedIconType === "Chat Links" && (
            <Image
              alt="app-icon"
              src={icon.ChatlinkType}
              className="w-5 h-auto"
            />
          )}
          {selectedIconType === "Commands" && (
            <Image
              alt="app-icon"
              src={icon.CommandType}
              className="w-5 h-auto"
            />
          )}

          <Dropdown className="w-max rounded-lg" placement="bottom-start">
            <DropdownTrigger>
              <button>
                <AiOutlineDownCircle size={20} color="gray" />
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
            </DropdownMenu>
          </Dropdown>
        </div>

        <button type="button" onClick={() => handleRemoveIcon("Small Icon")}>
          <FaTimes size={20} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-gray-700">Select Icon</h3>
        {!selectedIconType && (
          <Image alt="app-icon" src={appIconImg} className="w-8 h-auto" />
        )}

        {selectedIcon && selectedIcon?.icon ? (
          <Image
            alt="app-icon"
            src={selectedIcon?.icon}
            className="w-4 h-auto"
            style={tintStyle}
            quality={100}
          />
        ) : (
          <>
            {selectedIconType === "Social Media" && (
              <Image
                alt="app-icon"
                src={icon.SocialIconType}
                className="w-5 h-auto"
              />
            )}
            {selectedIconType === "Chat Links" && (
              <Image
                alt="app-icon"
                src={icon.ChatlinkType}
                className="w-5 h-auto"
              />
            )}
            {selectedIconType === "Commands" && (
              <Image
                alt="app-icon"
                src={icon.CommandType}
                className="w-5 h-auto"
              />
            )}
          </>
        )}

        <Dropdown className="w-max rounded-lg" placement="bottom-start">
          <DropdownTrigger>
            <div
              className={`flex items-center ${
                isEmptyObject(selectedIconData) && "relative group"
              }`}
            >
              <button
                disabled={isEmptyObject(selectedIconData)}
                className={`${
                  isEmptyObject(selectedIconData) && "cursor-not-allowed"
                } `}
              >
                <AiOutlineDownCircle size={20} color="gray" />
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
              className="p-2"
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
                      style={tintStyle}
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
        <p className="font-semibold text-gray-700 mb-1">
          {selectedIcon.inputText} :
        </p>
        <form onSubmit={handleSmallIconFormSubmit}>
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
          <div className="flex justify-between mt-3">
            <div className="flex items-center gap-2 font-medium text-gray-600">
              <p>Redirect</p>
              <Switch
                color="success"
                size="sm"
                defaultSelected={false}
                aria-label="Lead Captures"
              />
            </div>
            <AnimateButton isLoading={isLoading} width={"w-52"}>
              <LiaFileMedicalSolid size={20} />
              Save Changes
            </AnimateButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSmallIcon;
