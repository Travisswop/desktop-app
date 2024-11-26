import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import appIconImg from "@/public/images/websites/edit-microsite/add-icon/app-icon.svg";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Switch,
  Tooltip,
} from "@nextui-org/react";
import { AiOutlineDownCircle } from "react-icons/ai";
import { IoLinkOutline } from "react-icons/io5";
import { LiaFileMedicalSolid } from "react-icons/lia";
// import { icon, newIcons } from "@/util/data/smartsiteIconData";
// import { isEmptyObject } from "@/util/checkIsEmptyObject";
// import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
// import { toast } from "react-toastify";
import { FaAngleDown, FaTimes } from "react-icons/fa";
import { MdDelete, MdInfoOutline } from "react-icons/md";
// import AnimateButton from "@/components/Button/AnimateButton";
// import { handleDeleteAppIcon, handleUpdateAppIcon } from "@/actions/appIcon";
import { deleteInfoBar, updateInfoBar } from "@/actions/infoBar";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { icon, newIcons } from "@/components/util/data/smartsiteIconData";
import { useToast } from "@/hooks/use-toast";
import { isEmptyObject } from "@/components/util/checkIsEmptyObject";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { InfoBarIconMap, InfoBarSelectedIconType } from "@/types/smallIcon";
import contactCardImg from "@/public/images/IconShop/appIconContactCard.png";
import productImg from "@/public/images/product.png";

const UpdateInfoBar = ({ iconDataObj, isOn, setOff }: any) => {
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
  const [buttonName, setButtonName] = useState(iconDataObj.data.buttonName);
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
  const [description, setDescription] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  // console.log("selected icon type", selectedIconType);
  // console.log("selected icon name", selectedIcon);
  // console.log("selected icon data", selectedIconData);
  // console.log("iconDataObj", iconDataObj);

  const iconData: any = newIcons[1];
  // console.log("iconData", iconData);

  const demoToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjM4NjMyMDIzMDQxMDMyODAyOTk4MmIiLCJpYXQiOjE3MjcxNTI4MzB9.CsHnZAgUzsfkc_g_CZZyQMXc02Ko_LhnQcCVpeCwroY";

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

  useEffect(() => {
    if (iconDataObj) {
      setSelectedIconType(iconDataObj.data.group);
    }
  }, [iconDataObj]);

  useEffect(() => {
    const data = iconData.icons.find(
      (item: any) => item.category === iconDataObj.data.group
    );
    if (data) {
      const iconDatas = data.icons.find(
        (item: any) => item.name === iconDataObj.data.iconName
      );
      setSelectedIcon(iconDatas);
      setSelectedIconData(data);
    }
  }, [iconData, iconDataObj.data.group, iconDataObj.data.iconName]);

  const handleSelectIconType = (category: string) => {
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

  const handleInfoBarFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const infobarInfo = {
      _id: iconDataObj.data._id,
      micrositeId: state.data._id,
      title: formData.get("url"),
      link: selectedIcon.url,
      buttonName: buttonName,
      description: formData.get("description"),
      iconName: selectedIcon.name,
      iconPath: "",
      group: selectedIconType,
    };
    // console.log("smallIconInfo", infobarInfo);
    try {
      const data = await updateInfoBar(infobarInfo, demoToken);
      // console.log("data", data);

      if ((data.state = "success")) {
        setOff();
        toast({
          title: "Error",
          description: "Info bar updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Something went wrong!",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  //   console.log("selected icon", selectedIcon);
  //   console.log("button", buttonName);

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

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    const submitData = {
      _id: iconDataObj.data._id,
      micrositeId: iconDataObj.data.micrositeId,
    };
    // console.log("submit data", submitData);

    try {
      const data: any = await deleteInfoBar(submitData, demoToken);
      // console.log("data,", data);

      if (data && data?.state === "success") {
        setOff();
        toast({
          title: "Success",
          description: "Info bar deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Something went wrong!",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const iconMap: InfoBarIconMap = {
    Link: icon.SocialIconType,
    "Call To Action": icon.ChatlinkType,
    "Product Link": productImg,
    "Contact Card": contactCardImg,
  };

  useEffect(() => {
    if (iconDataObj?.data?.description) {
      setDescription(iconDataObj?.data?.description);
    }
  }, [iconDataObj.data.description]);

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
                  Info Bar
                </h2>
                <div className="translate-y-0.5">
                  <Tooltip
                    size="sm"
                    content={
                      <span className="font-medium">
                        You will be able to set the icon type, choose an icon ,
                        specify a button name, provide a link, and add a
                        description.
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
              <div className="flex flex-col gap-2 mt-4 px-10 2xl:px-[10%]">
                <div className="w-full rounded-xl bg-gray-200 p-3">
                  <div className="bg-white rounded-xl w-full flex items-center gap-2 py-1 px-3">
                    <Image
                      className="w-12 rounded-full"
                      src={selectedIcon.icon}
                      alt="icon"
                    />
                    <div>
                      <p className="text-gray-700 font-medium">
                        {selectedIcon.name}
                      </p>
                      <p className="text-gray-500 text-sm font-medium">
                        {description}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-700 w-32">
                      Info Bar Types
                    </h3>
                    <Dropdown
                      className="w-max rounded-lg"
                      placement="bottom-start"
                    >
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
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-700 w-32">
                    Select Icon
                  </h3>
                  <Dropdown
                    className="rounded-lg w-max"
                    placement="bottom-start"
                  >
                    <DropdownTrigger>
                      <div
                        className={`flex items-center ${
                          isEmptyObject(selectedIconData) && "relative group"
                        }`}
                      >
                        {/* <button
                          disabled={isEmptyObject(selectedIconData)}
                          className={`${
                            isEmptyObject(selectedIconData) &&
                            "cursor-not-allowed"
                          } `}
                        >
                          <AiOutlineDownCircle size={20} color="gray" />
                        </button> */}
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
                      <p className="font-semibold text-gray-700 mb-1">
                        Button Name
                      </p>
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
                          defaultValue={iconDataObj.data.title}
                          className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-11 py-2 text-gray-700 bg-gray-100"
                          placeholder={selectedIcon.placeHolder}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">
                        Description
                      </p>
                      <div>
                        <textarea
                          name="description"
                          defaultValue={iconDataObj.data.description}
                          className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-2 text-gray-700 bg-gray-100"
                          placeholder="Enter description"
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between">
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
                        onClick={handleDelete}
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

export default UpdateInfoBar;
