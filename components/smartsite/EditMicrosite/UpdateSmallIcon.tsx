import Image from "next/image";
import React, { useEffect, useState } from "react";
import appIconImg from "@/public/images/websites/edit-microsite/add-icon/app-icon.svg";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  // Spinner,
  Switch,
} from "@nextui-org/react";
import { AiOutlineDownCircle } from "react-icons/ai";
import { IoLinkOutline } from "react-icons/io5";
import { LiaFileMedicalSolid } from "react-icons/lia";
// import EditMicrositeBtn from "../Button/EditMicrositeBtn";
import { icon, newIcons } from "@/util/data/smartsiteIconData";
import { isEmptyObject } from "@/util/checkIsEmptyObject";
import {
  handleDeleteSmallIcon,
  handleUpdateSmallIcon,
} from "@/actions/createSmallIcon";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { toast } from "react-toastify";
import { FaTimes } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
// import useSmallIconToggleStore from "@/zustandStore/SmallIconModalToggle";
import AnimateButton from "../Button/AnimateButton";

const UpdateSmallIcon = ({ iconDataObj, isOn, setOff }: any) => {
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
  // const [selectedIconByLivePreview, setSelectedIconByLivePreview] =
  //   useState<any>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
  const [isHit, setIsHit] = useState<boolean>(true);

  // console.log("ishit", isHit);

  // console.log("selectedIconType", selectedIconType);
  // console.log("selected icon data", selectedIconData);
  // console.log("selected icon", selectedIcon);
  // console.log("open", open);

  const iconData: any = newIcons[0];
  // console.log("selectedIconByLivePreview", selectedIconByLivePreview);

  useEffect(() => {
    if (selectedIconType) {
      const data = iconData.icons.find(
        (item: any) => item.category === selectedIconType
      );
      setSelectedIconData(data);
    }
  }, [selectedIconType, iconData.icons]);

  useEffect(() => {
    setSelectedIconType(iconDataObj.data.group);
  }, [iconDataObj.data.group]);

  useEffect(() => {
    if (isHit) {
      if (selectedIconData && selectedIconData?.icons?.length > 0) {
        // console.log("hit");

        const data = selectedIconData.icons.find(
          (data: any) => data.name === iconDataObj.data.name
        );
        setSelectedIcon(data);
        if (data) {
          setIsHit(false);
        }
      }
    }
  }, [selectedIconData, isHit]);

  const tintStyle = {
    filter: "brightness(0) invert(0)",
  };

  const handleSelectedIcon = (data: any) => {
    // setSelectedIconByLivePreview(null);
    setSelectedIcon(data);
  };

  const handleSelectIconType = (category: string) => {
    setSelectedIconType(category);
    // console.log("cateogy", category);

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

  // console.log("icondaa", iconDataObj);

  const handleSmallIconFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const smallIconInfo = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
      name: selectedIcon.name,
      value: formData.get("url"),
      url: selectedIcon.url,
      iconName: selectedIcon.name,
      iconPath: "",
      group: selectedIconData.category,
    };
    // console.log("smallIconInfoupdate", smallIconInfo);
    try {
      const data: any = await handleUpdateSmallIcon(
        smallIconInfo,
        sesstionState.accessToken
      );
      // console.log("data,", data);

      if (data && data?.state === "success") {
        toast.success("small icon updated successfully");
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
    // Check if the click is on the backdrop element (with class 'backdrop')
    if (e.target.classList.contains("backdrop")) {
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
      const data: any = await handleDeleteSmallIcon(
        submitData,
        sesstionState.accessToken
      );
      // console.log("data,", data);

      if (data && data?.state === "success") {
        toast.success("small icon deleted successfully");
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
          onClick={handleBackdropClick}
        >
          <div className="h-max w-96 lg:w-[40rem] bg-white relative rounded-xl">
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
                  {!selectedIconType && (
                    <Image
                      alt="app-icon"
                      src={appIconImg}
                      className="w-8 h-auto"
                    />
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
                  {selectedIcon?.inputText} :
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

export default UpdateSmallIcon;
