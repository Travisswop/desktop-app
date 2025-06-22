import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
// import appIconImg from "@/public/images/websites/edit-microsite/add-icon/app-icon.svg";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from "@nextui-org/react";
import { IoLinkOutline } from "react-icons/io5";
import { LiaFileMedicalSolid } from "react-icons/lia";
import { FaAngleDown, FaTimes } from "react-icons/fa";
import { MdDelete, MdInfoOutline } from "react-icons/md";
import { handleDeleteAppIcon, handleUpdateAppIcon } from "@/actions/appIcon";
import { icon, newIcons } from "@/components/util/data/smartsiteIconData";
import { isEmptyObject } from "@/components/util/checkIsEmptyObject";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import CustomImg from "@/public/images/IconShop/upload@2x.png";
import CustomFileInput from "@/components/CustomFileInput";
import isUrl from "@/lib/isUrl";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";

const UpdateAppIcon = ({ iconDataObj, isOn, setOff }: any) => {
  const [token, setToken] = useState("");

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get("access-token");
      setToken(token || "");
    };
    getAccessToken();
  }, []);

  const [selectedIconType, setSelectedIconType] = useState<any>("Link");
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
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>("");

  const modalRef = useRef<HTMLDivElement>(null);

  // console.log("ishit", isHit);

  console.log("selectedIconType", selectedIconType);
  console.log("selected icon data", selectedIconData);
  console.log("selected icon", selectedIcon);
  // console.log("open", open);
  console.log("icondataobj", iconDataObj);

  const iconData: any = newIcons[1];
  // console.log("selectedIconByLivePreview", selectedIconByLivePreview);
  useEffect(() => {
    if (
      iconDataObj.data.group === "Link" ||
      iconDataObj.data.group === "Call To Action" ||
      iconDataObj.data.group === "custom"
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

  // useEffect(() => {
  //   if (isHit) {
  //     if (selectedIconData && selectedIconData?.icons?.length > 0) {
  //       // console.log("hit");

  //       const data = selectedIconData.icons.find(
  //         (data: any) => data.name === iconDataObj.data.iconName
  //       );
  //       setSelectedIcon(data);
  //       if (data) {
  //         setIsHit(false);
  //       }
  //     }
  //   }
  // }, [selectedIconData, isHit, iconDataObj.data.iconName]);

  //   const tintStyle = {
  //     filter: "brightness(0) invert(0)",
  //   };

  // const handleSelectedIcon = (data: any) => {
  //   // setSelectedIconByLivePreview(null);
  //   setSelectedIcon(data);
  // };

  const handleSelectIconType = (category: string) => {
    setSelectedIconType(category);
    console.log("cateogy", category);
    if (category === "Link") {
      console.log("hit link");

      return setSelectedIcon({
        name: "Amazon Music",
        icon: icon.appIconAmazonMusic,
        placeHolder: "https://www.music.amazon.com/abc",
        inputText: "Amazon Music Link",
        url: "https://music.amazon.com",
      });
    } else if (category === "Call To Action") {
      console.log("hit action");
      return setSelectedIcon({
        name: "Email",
        icon: icon.appIconEmail,
        placeHolder: "Type Your Email Address",
        inputText: "Email Address",
        url: "www.email.com",
      });
    } else {
      console.log("hit else");
      return setSelectedIcon({
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
      group: selectedIconData?.category,
    };
    const customIconInfo = {
      micrositeId: iconDataObj.data.micrositeId,
      _id: iconDataObj.data._id,
      name: formData.get("customName") || "Custom name",
      value: formData.get("url"),
      url: "custom",
      iconName: iconDataObj.data.iconName,
      iconPath: "",
      group: "custom",
    };
    console.log("customIconInfo", customIconInfo);

    if (selectedIconType === "custom" && imageFile) {
      const imgUrl = await sendCloudinaryImage(imageFile);
      customIconInfo.iconName = imgUrl;
    }

    try {
      const data: any = await handleUpdateAppIcon(
        selectedIconType === "custom" ? customIconInfo : appIconInfo,
        token
      );
      // console.log("data,", data);

      if (data && data?.state === "success") {
        toast.success("App icon updated successfully");
        setOff();
      } else {
        toast.error("Something went wrong");
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
      const data: any = await handleDeleteAppIcon(submitData, token);
      // console.log("data,", data);

      if (data && data?.state === "success") {
        toast.success("App icon deleted successfully");
        setOff();
      } else {
        toast.error("Something went wrong");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const iconMap: any = {
    Link: icon.Custom_link1,
    "Call To Action": icon.ChatlinkType,
    custom: CustomImg,
  };

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
              <div className="flex items-end gap-1 justify-center">
                <h2 className="font-semibold text-gray-700 text-xl text-center">
                  App Icon
                </h2>
                <div className="translate-y-0.5">
                  <Tooltip
                    size="sm"
                    content={
                      <span className="font-medium">
                        Select the icon type and icon you want to use then
                        upload the account information.
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
              <div
                className={`flex justify-center bg-[#F2F2F2] rounded-xl px-[60px] py-4 w-max mx-auto`}
              >
                {selectedIcon &&
                selectedIcon?.icon &&
                selectedIconType !== "custom" ? (
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
                    {selectedIconType === "custom" &&
                    !imageFile &&
                    isUrl(iconDataObj.data.iconName) ? (
                      <Image
                        alt="custom-image"
                        src={iconDataObj.data.iconName}
                        width={220}
                        height={180}
                        className="w-14 h-auto"
                        quality={100}
                      />
                    ) : selectedIconType === "custom" &&
                      !imageFile &&
                      !isUrl(iconDataObj.data.iconName) ? (
                      <Image
                        alt="custom-image"
                        src="/images/smartsite_icon/photo.png"
                        width={220}
                        height={180}
                        className="w-24 h-auto"
                        quality={100}
                      />
                    ) : (
                      selectedIconType === "custom" &&
                      imageFile && (
                        <Image
                          alt="custom-image"
                          src={imageFile}
                          width={220}
                          height={180}
                          className="w-14 h-auto"
                          quality={100}
                        />
                      )
                    )}
                  </>
                )}
              </div>
              <div className="flex flex-col gap-3 mt-4 px-10 xl:px-[10%]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-700 w-32">
                      Small Icon Type
                    </h3>
                    <Dropdown
                      className="w-max rounded-lg"
                      placement="bottom-start"
                    >
                      <DropdownTrigger>
                        <button
                          type="button"
                          className="bg-white w-64 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small"
                        >
                          <span className="flex items-center gap-2">
                            {selectedIconType && (
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
                          onClick={() => handleSelectIconType("custom")}
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
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-700 w-32">
                    Select Icon
                  </h3>

                  {selectedIconType === "custom" ? (
                    <CustomFileInput handleFileChange={handleFileChange} />
                  ) : (
                    <Dropdown
                      className="w-max rounded-lg"
                      placement="bottom-start"
                    >
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
                              isEmptyObject(selectedIconData) &&
                              "cursor-not-allowed"
                            } `}
                          >
                            <span className="flex items-center gap-2">
                              <Image
                                src={selectedIcon?.icon}
                                alt={selectedIcon?.inputText}
                                className="w-4 h-auto"
                                quality={100}
                                // style={tintStyle}
                              />
                              {selectedIcon?.name}
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
                      {selectedIconData &&
                        selectedIconData?.icons?.length > 0 && (
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

                            {selectedIconData?.icons?.map(
                              (data: any, index: number) => (
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
                              )
                            )}
                          </DropdownMenu>
                        )}
                    </Dropdown>
                  )}
                  {/* {!selectedIconType && (
                    <Image
                      alt="app-icon"
                      src={appIconImg}
                      className="w-8 h-auto"
                    />
                  )}

                  <Dropdown
                    className="w-max rounded-lg"
                    placement="bottom-start"
                  >
                    <DropdownTrigger>
                      <div
                        className={`flex items-center ${
                          isEmptyObject(selectedIconData) && "relative group"
                        }`}
                      >
                        <button
                          type="button"
                          disabled={isEmptyObject(selectedIconData)}
                          className={`bg-white w-64 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small ${
                            isEmptyObject(selectedIconData) &&
                            "cursor-not-allowed"
                          } `}
                        >
                          <span className="flex items-center gap-2">
                            <Image
                              src={selectedIcon?.icon}
                              alt={selectedIcon?.inputText}
                              className="w-4 h-auto"
                              quality={100}
                              // style={tintStyle}
                            />
                            {selectedIcon?.name}
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
                    {selectedIconData &&
                      selectedIconData?.icons?.length > 0 && (
                        <DropdownMenu
                          disabledKeys={["title"]}
                          aria-label="Static Actions"
                          className="p-2 overflow-y-auto  max-h-[30rem]"
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
                  </Dropdown> */}
                </div>
                <div>
                  <form onSubmit={handleAppIcon}>
                    {selectedIconType === "custom" && (
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">
                          Name :
                        </p>
                        <input
                          type="text"
                          name="customName"
                          className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          placeholder={"Enter name"}
                          defaultValue={iconDataObj.data.name || "Custom Name"}
                          required
                        />
                      </div>
                    )}
                    <p className="font-semibold text-gray-700 mb-1">
                      {selectedIconType === "custom"
                        ? "Link"
                        : selectedIcon?.inputText}{" "}
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
                        defaultValue={iconDataObj.data.value}
                        placeholder={
                          selectedIconType === "custom"
                            ? "Enter Link"
                            : selectedIcon?.placeHolder
                        }
                        required
                      />
                    </div>
                    <div className="flex justify-between mt-4">
                      <AnimateButton
                        whiteLoading={true}
                        className="bg-black text-white py-2 !border-0"
                        isLoading={isLoading}
                        width={"w-52"}
                      >
                        <LiaFileMedicalSolid size={20} />
                        Update Changes
                      </AnimateButton>

                      <AnimateButton
                        whiteLoading={true}
                        className="bg-black text-white py-2 !border-0"
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
        </div>
      )}
    </>
  );
};

export default UpdateAppIcon;
