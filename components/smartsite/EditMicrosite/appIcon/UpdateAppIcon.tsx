import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import appIconImg from "@/public/images/websites/edit-microsite/add-icon/app-icon.svg";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Switch,
} from "@nextui-org/react";
import { AiOutlineDownCircle } from "react-icons/ai";
import { IoLinkOutline } from "react-icons/io5";
import { LiaFileMedicalSolid } from "react-icons/lia";
import { icon, newIcons } from "@/util/data/smartsiteIconData";
import { isEmptyObject } from "@/util/checkIsEmptyObject";
// import {
//   handleDeleteSmallIcon,
//   handleUpdateSmallIcon,
// } from "@/actions/createSmallIcon";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import { FaTimes } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import AnimateButton from "@/components/Button/AnimateButton";
import { handleDeleteAppIcon, handleUpdateAppIcon } from "@/actions/appIcon";
// import AnimateButton from "../Button/AnimateButton";

const UpdateAppIcon = ({ iconDataObj, isOn, setOff }: any) => {
  const sesstionState = useLoggedInUserStore((state) => state.state.user); //get session value

  const [selectedIconType, setSelectedIconType] = useState("Link");
  const [selectedIcon, setSelectedIcon] = useState({
    name: "Amazon Music",
    icon: icon.appIconAmazonMusic,
    placeHolder: "https://www.music.amazon.com/abc",
    inputText: "Amazon Music Link",
    url: "https://music.amazon.com",
  });
  const [selectedIconData, setSelectedIconData] = useState<any>({});
  // const [selectedIconByLivePreview, setSelectedIconByLivePreview] =
  //   useState<any>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
  const [isHit, setIsHit] = useState<boolean>(true);

  const modalRef = useRef<HTMLDivElement>(null);

  // console.log("ishit", isHit);

  // console.log("selectedIconType", selectedIconType);
  // console.log("selected icon data", selectedIconData);
  // console.log("selected icon", selectedIcon);
  // console.log("open", open);
  // console.log("icondataobj", iconDataObj);

  const iconData: any = newIcons[1];
  // console.log("selectedIconByLivePreview", selectedIconByLivePreview);
  useEffect(() => {
    if (
      iconDataObj.data.group === "Link" ||
      iconDataObj.data.group === "Call To Action"
    ) {
      setSelectedIconType(iconDataObj.data.group);
    }
  }, [iconDataObj.data.group]);

  useEffect(() => {
    if (selectedIconType) {
      const data = iconData.icons.find(
        (item: any) => item.category === selectedIconType
      );
      setSelectedIconData(data);
    }
  }, [selectedIconType, iconData.icons]);

  useEffect(() => {
    if (isHit) {
      if (selectedIconData && selectedIconData?.icons?.length > 0) {
        // console.log("hit");

        const data = selectedIconData.icons.find(
          (data: any) => data.name === iconDataObj.data.iconName
        );
        setSelectedIcon(data);
        if (data) {
          setIsHit(false);
        }
      }
    }
  }, [selectedIconData, isHit, iconDataObj.data.iconName]);

  //   const tintStyle = {
  //     filter: "brightness(0) invert(0)",
  //   };

  const handleSelectedIcon = (data: any) => {
    // setSelectedIconByLivePreview(null);
    setSelectedIcon(data);
  };

  const handleSelectIconType = (category: string) => {
    setSelectedIconType(category);
    // console.log("cateogy", category);
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
    } else {
      setSelectedIcon({
        name: "Amazon Music",
        icon: icon.appIconAmazonMusic,
        placeHolder: "https://www.music.amazon.com/abc",
        inputText: "Amazon Music Link",
        url: "https://music.amazon.com",
      });
    }
  };

  // console.log("icondaa", iconDataObj);

  const handleAppIcon = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const appIconInfo = {
      micrositeId: iconDataObj.data.micrositeId,
      _id: iconDataObj.data._id,
      name: selectedIcon.name,
      value: formData.get("url"),
      url: selectedIcon.url,
      iconName: selectedIcon.name,
      iconPath: "",
      group: selectedIconData.category,
    };
    try {
      const data: any = await handleUpdateAppIcon(
        appIconInfo,
        sesstionState.accessToken
      );
      // console.log("data,", data);

      if (data && data?.state === "success") {
        toast.success("app icon updated successfully");
        setOff();
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

  // Function to close the modal
  const closeModal = () => {
    setOff();
  };

  // Function to handle click on the backdrop
  const handleBackdropClick = (e: any) => {
    if (
      e.target.classList.contains("backdrop") &&
      !e.target.closest(".modal-content")
    ) {
      closeModal();
    }
  };

  const handleDeleteIcon = async () => {
    setIsDeleteLoading(true);
    const submitData = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
    };
    try {
      const data: any = await handleDeleteAppIcon(
        submitData,
        sesstionState.accessToken
      );
      // console.log("data,", data);

      if (data && data?.state === "success") {
        toast.success("app icon deleted successfully");
        setOff();
      } else {
        toast.error("something went wrong");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  // console.log("ison", isOn);

  return (
    <>
      {isOn && (
        <div
          className="fixed z-50 left-0 top-0 h-full w-full overflow-auto flex items-center justify-center bg-overlay/50 backdrop"
          onMouseDown={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className="modal-content h-max w-96 lg:w-[40rem] bg-white relative rounded-xl"
          >
            <button
              className="btn btn-sm btn-circle absolute right-4 top-[12px]"
              onClick={closeModal}
            >
              <FaTimes color="gray" />
            </button>
            <div className="bg-white rounded-xl shadow-small py-10 px-7 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-700">
                    Small Icon Type
                  </h3>
                  {selectedIconType === "Link" && (
                    <Image
                      alt="app-icon"
                      src={icon.SocialIconType}
                      className="w-5 h-auto"
                    />
                  )}

                  {selectedIconType === "Call To Action" && (
                    <Image
                      alt="app-icon"
                      src={icon.ChatlinkType}
                      className="w-5 h-auto"
                    />
                  )}

                  <Dropdown
                    className="w-max rounded-lg"
                    placement="bottom-start"
                  >
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
                <div className="flex items-center gap-2 font-medium text-gray-600">
                  <p>Redirect</p>
                  <Switch
                    color="success"
                    size="sm"
                    defaultSelected
                    aria-label="Lead Captures"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-700">Select Icon</h3>
                {!selectedIconType && (
                  <Image
                    alt="app-icon"
                    src={appIconImg}
                    className="w-8 h-auto"
                  />
                )}

                {selectedIcon && selectedIcon?.icon ? (
                  <Image
                    alt="app-icon"
                    src={selectedIcon?.icon}
                    className="w-4 h-auto"
                    // style={tintStyle}
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
                    {selectedIconType === "Link" && (
                      <Image
                        alt="app-icon"
                        src={icon.SocialIconType}
                        className="w-5 h-auto"
                      />
                    )}

                    {selectedIconType === "Call To Action" && (
                      <Image
                        alt="app-icon"
                        src={icon.ChatlinkType}
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
                          isEmptyObject(selectedIconData) &&
                          "cursor-not-allowed"
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
                      className="p-2 overflow-y-auto custom-scrollbar max-h-[30rem]"
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
                            handleSelectedIcon({
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
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">
                  {selectedIcon?.inputText} :
                </p>
                <form onSubmit={handleAppIcon}>
                  <div className="relative">
                    <IoLinkOutline
                      className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                      size={20}
                    />
                    <input
                      type="text"
                      name="url"
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-11 py-2 text-gray-700 bg-gray-100"
                      defaultValue={iconDataObj.data.value}
                      placeholder={selectedIcon?.placeHolder}
                      required
                    />
                  </div>
                  <div className="flex justify-between mt-6">
                    <AnimateButton isLoading={isLoading} width={"w-52"}>
                      <LiaFileMedicalSolid size={20} />
                      Update Changes
                    </AnimateButton>

                    <AnimateButton
                      type="button"
                      onClick={handleDeleteIcon}
                      isLoading={isDeleteLoading}
                      width={"w-28"}
                    >
                      <MdDelete size={20} /> Delete
                    </AnimateButton>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateAppIcon;
