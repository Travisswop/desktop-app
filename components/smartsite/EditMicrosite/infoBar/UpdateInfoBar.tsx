import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
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
// import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
// import { toast } from "react-toastify";
import { FaAngleDown, FaTimes } from "react-icons/fa";
import { MdDelete, MdInfoOutline } from "react-icons/md";
// import AnimateButton from "@/components/Button/AnimateButton";
// import { handleDeleteAppIcon, handleUpdateAppIcon } from "@/actions/appIcon";
import { deleteInfoBar, updateInfoBar } from "@/actions/infoBar";
import { fetchLinkPreview, LinkPreviewData } from "@/actions/linkPreview";
import { icon, newIcons } from "@/components/util/data/smartsiteIconData";
import { isEmptyObject } from "@/components/util/checkIsEmptyObject";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import contactCardImg from "@/public/images/IconShop/appIconContactCard.png";
import productImg from "@/public/images/product.png";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import customImg from "@/public/images/IconShop/download@3x.png";

import CustomFileInput from "@/components/CustomFileInput";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";

const UpdateInfoBar = ({ iconDataObj, isOn, setOff }: any) => {
  const [selectedIconType, setSelectedIconType] = useState<string>("Link");
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
  const [imageFile, setImageFile] = useState<any>(null);
  const [fileError, setFileError] = useState<string>("");

  const modalRef = useRef<HTMLDivElement>(null);

  const iconData: any = newIcons[1];

  const [token, setToken] = useState("");

  // ── Open Graph prefill (parity with AddInfoBar) ──
  // When a valid http(s) link is entered, fetch its OG metadata and fill
  // ONLY fields the user has cleared (empty description / button name).
  // The icon / custom-image selection is never touched — the OG image is
  // shown as a suggestion only. Failures are silent.
  const [linkValue, setLinkValue] = useState<string>(
    iconDataObj?.data?.title || "",
  );
  const [ogPreview, setOgPreview] = useState<LinkPreviewData | null>(null);
  const ogDebounceRef = useRef<number | null>(null);
  const ogLastFetchedUrlRef = useRef<string | null>(null);
  const descriptionRef = useRef("");
  const buttonNameRef = useRef("");

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

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get("access-token");
      setToken(token || "");
    };
    getAccessToken();
  }, []);

  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);
  useEffect(() => {
    buttonNameRef.current = buttonName;
  }, [buttonName]);

  const getValidHttpUrl = (value: string): string | null => {
    const trimmed = value.trim();
    if (!/^https?:\/\//i.test(trimmed)) return null;
    try {
      const url = new URL(trimmed);
      return url.protocol === "http:" || url.protocol === "https:"
        ? url.toString()
        : null;
    } catch {
      return null;
    }
  };

  const runLinkPreview = async (value: string) => {
    const url = getValidHttpUrl(value);
    if (!url || !token || ogLastFetchedUrlRef.current === url) {
      return;
    }
    ogLastFetchedUrlRef.current = url;

    try {
      const preview = await fetchLinkPreview(url, token);
      if (!preview) return;

      setOgPreview(preview);
      // Prefill blanks only — never overwrite what the user typed
      if (!descriptionRef.current.trim() && preview.description) {
        setDescription(preview.description);
      }
      if (!buttonNameRef.current.trim() && preview.title) {
        setButtonName(preview.title);
      }
    } catch {
      // silent — preview is best-effort
    }
  };

  const scheduleLinkPreview = (value: string) => {
    if (ogDebounceRef.current) {
      window.clearTimeout(ogDebounceRef.current);
    }
    ogDebounceRef.current = window.setTimeout(() => {
      ogDebounceRef.current = null;
      void runLinkPreview(value);
    }, 600);
  };

  useEffect(
    () => () => {
      if (ogDebounceRef.current) {
        window.clearTimeout(ogDebounceRef.current);
      }
    },
    [],
  );

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
    if (!iconDataObj?.data) return;

    const data = iconData.icons.find(
      (item: any) => item.category === iconDataObj.data.group,
    );

    if (!data) return;

    const iconDatas = data.icons.find(
      (item: any) => item.name === iconDataObj.data.iconName,
    );

    if (iconDatas) {
      setSelectedIcon(iconDatas);
      setSelectedIconData(data);
    }
  }, [iconDataObj]); // 👈 ONLY depends on initial edit data

  const handleSelectIconType = (category: string) => {
    setSelectedIconType(category);

    const data = iconData.icons.find((item: any) => item.category === category);

    if (data && data.icons.length > 0) {
      setSelectedIcon(data.icons[0]);
      setSelectedIconData(data);
      setButtonName(data.icons[0].name);
    }
  };
  // const handleSelectIconType = (category: string) => {
  //   setSelectedIconType(category);
  //   if (category === "Link") {
  //     setSelectedIcon({
  //       name: "Amazon Music",
  //       icon: icon.appIconAmazonMusic,
  //       placeHolder: "https://www.music.amazon.com/abc",
  //       inputText: "Amazon Music Link",
  //       url: "https://music.amazon.com",
  //     });
  //   } else if (category === "Call To Action") {
  //     setSelectedIcon({
  //       name: "Email",
  //       icon: icon.appIconEmail,
  //       placeHolder: "Type Your Email Address",
  //       inputText: "Email Address",
  //       url: "www.email.com",
  //     });
  //   }
  // };

  const handleInfoBarFormSubmit = async (e: any) => {
    setIsLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // micrositeId comes from the item being edited — the shared store's
    // shape differs between the builder and the edit page, so it is not a
    // reliable source here.
    const micrositeId = iconDataObj.data.micrositeId;
    const infobarInfo = {
      _id: iconDataObj.data._id,
      micrositeId,
      title: formData.get("url"),
      link: selectedIcon.url,
      buttonName: buttonName,
      description: formData.get("description"),
      iconName: selectedIcon.name,
      iconPath: "",
      group: selectedIconType,
    };
    const updateInfobarInfo = {
      _id: iconDataObj.data._id,
      micrositeId,
      title: formData.get("url"),
      link: "custom",
      buttonName: buttonName,
      description: formData.get("description"),
      iconName: iconDataObj.data.iconName, //
      iconPath: "",
      group: "custom",
    };
    if (selectedIconType === "custom" && imageFile) {
      const imgUrl = await sendCloudinaryImage(imageFile);
      updateInfobarInfo.iconName = imgUrl;
    }
    try {
      const data = await updateInfoBar(
        selectedIconType === "custom" ? updateInfobarInfo : infobarInfo,
        token,
      );

      if (data?.state === "success") {
        setOff();
        toast.success("Info bar updated successfully");
      } else {
        toast.error("Something went wrong");
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
      const data: any = await deleteInfoBar(submitData, token);
      // console.log("data,", data);

      if (data && data?.state === "success") {
        setOff();
        toast.success("Info bar deleted successfully");
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
    "Product Link": productImg,
    "Contact Card": contactCardImg,
    custom: customImg,
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
                    {selectedIcon &&
                    selectedIcon?.icon &&
                    selectedIconType !== "custom" ? (
                      <Image
                        className="w-12 h-12 rounded-full"
                        src={selectedIcon.icon}
                        width={120}
                        height={90}
                        alt="icon"
                      />
                    ) : selectedIcon &&
                      selectedIcon?.icon &&
                      selectedIconType == "custom" &&
                      !imageFile ? (
                      <Image
                        className="w-12 h-12 rounded-full"
                        src={iconDataObj.data.iconName}
                        width={120}
                        height={90}
                        alt="icon"
                      />
                    ) : (
                      <Image
                        className="w-12 h-12 rounded-full"
                        src={imageFile}
                        width={120}
                        height={90}
                        alt="icon"
                      />
                    )}

                    <div>
                      {/* it should be button name  */}
                      <p className="text-gray-700 font-medium">{buttonName}</p>
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
                            {/* guard: legacy items can carry a group with no icon */}
                            {selectedIconType && iconMap[selectedIconType] && (
                              <Image
                                alt="app-icon"
                                src={iconMap[selectedIconType]}
                                width={120}
                                height={90}
                                className={`w-5 h-5 ${
                                  selectedIconType === "Link" && "rounded-full"
                                }`}
                              />
                            )}
                            {selectedIconType === "custom"
                              ? "Upload Custom Image"
                              : selectedIconType}
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
                          key="custom-image"
                          onClick={() => handleSelectIconType("custom")}
                          className="border-b rounded-none hover:rounded-md"
                        >
                          <div className="flex items-center gap-2 font-semibold text-sm">
                            <Image
                              src={customImg}
                              alt={"image"}
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
                    <div className="flex items-center gap-1">
                      <CustomFileInput handleFileChange={handleFileChange} />
                      {fileError && (
                        <p className="text-xs text-red-600">*{fileError}</p>
                      )}
                    </div>
                  ) : (
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
                            // disabled={isEmptyObject(selectedIconData)}
                            className={`bg-white w-48 2xl:w-64 flex justify-between items-center rounded px-2 py-2 text-sm font-medium shadow-small`}
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
                          {/* {isEmptyObject(selectedIconData) && (
                            <div className="hidden text-xs text-gray-600 px-2 w-28 py-1.5 bg-slate-200 shadow-medium z-50 absolute left-6 top-0 group-hover:flex justify-center">
                              <p>select icon type</p>
                            </div>
                          )} */}
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
                  )}
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
                        {selectedIconType === "custom"
                          ? "Link"
                          : selectedIcon?.inputText}
                      </p>
                      <div className="relative">
                        <IoLinkOutline
                          className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                          size={20}
                        />
                        <input
                          type="text"
                          name="url"
                          value={linkValue}
                          onChange={(e) => {
                            setLinkValue(e.target.value);
                            scheduleLinkPreview(e.target.value);
                          }}
                          onBlur={() => void runLinkPreview(linkValue)}
                          className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-11 py-2 text-gray-700 bg-gray-100"
                          placeholder={selectedIcon?.placeHolder}
                          required
                        />
                      </div>
                      {ogPreview?.image && (
                        <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ogPreview.image}
                            alt="Link preview"
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-gray-700">
                              {ogPreview.title ||
                                ogPreview.siteName ||
                                "Link preview"}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              Suggested preview from link
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">
                        Description
                      </p>
                      <div>
                        <textarea
                          name="description"
                          required
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
