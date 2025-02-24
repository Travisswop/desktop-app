"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import editIcon from "@/public/images/websites/edit-icon.svg";
import { FiMinus, FiPlus, FiUser } from "react-icons/fi";
import { TbUserSquare } from "react-icons/tb";
import {
  Select,
  SelectItem,
  Spinner,
  Switch,
  useDisclosure,
} from "@nextui-org/react";
import { Button } from "@nextui-org/react";
// import EditMicrositeBtn from "@/components/Button/EditMicrositeBtn";
import { LiaFileMedicalSolid } from "react-icons/lia";
import { IoMdLink } from "react-icons/io";
// import DynamicPrimaryBtn from "@/components/Button/DynamicPrimaryBtn";
// import LivePreview from "@/components/LivePreview";
// import SelectBackgroudOrBannerModal from "@/components/SelectBackgroudOrBannerModal/SelectBackgroudOrBannerModal";
// import isUrl from "@/util/isUrl";
import { PiAddressBook } from "react-icons/pi";
import SelectAvatorModal from "@/components/modal/SelectAvatorModal";
// import userProfileImages from "@/util/data/userProfileImage";
// import { sendCloudinaryImage } from "@/util/SendCloudineryImage";
// import smatsiteBackgroundImageList from "@/util/data/smatsiteBackgroundImageList";
// import smatsiteBannerImageList from "@/util/data/smartsiteBannerImageList";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";
import { handleSmartSiteUpdate } from "@/actions/update";
// import { toast } from "react-toastify";
// import useSmallIconToggleStore from "@/zustandStore/SmallIconModalToggle";
// import useUpdateSmartIcon from "@/zustandStore/UpdateSmartIcon";
// import UpdateModalComponents from "@/components/EditMicrosite/UpdateModalComponents";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
// import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { useRouter } from "next/navigation";
// import AnimateButton from "@/components/Button/AnimateButton";
import { useToast } from "@/hooks/use-toast";
import DynamicPrimaryBtn from "@/components/ui/Button/DynamicPrimaryBtn";
// import SmartsiteIconLivePreview from "../SmartsiteIconLivePreview";
import SelectBackgroudOrBannerModal from "@/components/modal/SelectBackgroudOrBannerModal";
import isUrl from "@/lib/isUrl";
import userProfileImages from "@/components/util/data/userProfileImage";
import smatsiteBannerImageList from "@/components/util/data/smartsiteBannerImageList";
import smatsiteBackgroundImageList from "@/components/util/data/smatsiteBackgroundImageList";
// import UpdateModalComponents from "./UpdateModalComponents";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import { sendCloudinaryImage } from "@/lib/SendCloudineryImage";
import SmartsiteIconLivePreview from "../SmartsiteIconLivePreview";
import { useDesktopUserData } from "@/components/tanstackQueryApi/getUserData";
import { HexColorPicker } from "react-colorful";
import { MdDeleteOutline, MdDone } from "react-icons/md";
import Swal from "sweetalert2";
import { handleDeleteSmartSite } from "@/actions/deleteSmartsite";
import Cookies from "js-cookie";
import DeleteModal from "./DeleteModal";

const EditSmartSite = ({ data, token }: any) => {
  const [selectedImage, setSelectedImage] = useState(null); // get user avator image
  const [deleteLoading, setDeleteLoading] = useState(false);
  // const router = useRouter();

  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get("access-token");
      if (token) {
        setAccessToken(token);
      }
    };
    getAccessToken();
  }, []);

  const { refetch } = useDesktopUserData(data?.data?.parentId, accessToken);

  // console.log("hola data", data);

  const { toast } = useToast();

  const { formData: smartSiteEditFormData, setFormData }: any =
    useSmartsiteFormStore();

  // console.log("selected image", selectedImage);
  // console.log("formData from edit page", smartSiteEditFormData);

  const [galleryImage, setGalleryImage] = useState(null); // get upload image base64 data
  const [uploadedImageUrl, setUploadedImageUrl] = useState(""); // get uploaded url from cloudinery

  const [isGatedAccessOpen, setIsGatedAccessOpen] = useState(false);
  const [gatedAccessError, setGatedAccessError] = useState({
    contractAddress: "",
    tokenId: "",
    eventLink: "",
    network: "",
  });
  const [isPrimaryMicrosite, setIsPrimaryMicrosite] = useState(false);
  const [isWeb3Enabled, setIsWeb3Enabled] = useState(false);
  const [brandImage, setBrandImage] = useState(""); //need to set brand image

  const [isTemplateColorPickerOpen, setIsTemplateColorPickerOpen] =
    useState(false);

  // const [profileImage, setProfileImage] = useState("");
  // const [backgroundImage, setBackgroundImage] = useState({
  //   background: "",
  //   banner: "",
  // });
  // console.log("backgroundImage", backgroundImage);

  // const [isBackgrundImageSelected, setIsBackgrundImageSelected] =
  //   useState(false);

  const [isFormSubmitLoading, setIsFormSubmitLoading] = useState(false);

  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

  // console.log("gatedAccessError", gatedAccessError);

  //const { isOn, setOff }: any = useSmallIconToggleStore();

  //const iconData: any = useUpdateSmartIcon(); //get trigger smarticon from zustand store

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onOpenChange: onDeleteOpenChange,
  } = useDisclosure();

  const router = useRouter();

  const handleBannerModal = () => {
    setIsUserProfileModalOpen(false);
    setIsBannerModalOpen(true);
    onOpen();
  };

  //console.log("data", data);

  useEffect(() => {
    setFormData("backgroundImg", data.data.backgroundImg);
    setFormData("bio", data.data.bio);
    setFormData("galleryImg", "");
    setFormData("name", data.data.name);
    setFormData("theme", data.data.theme);
    setFormData("backgroundColor", data.data.backgroundColor);
    if (!selectedImage && !galleryImage) {
      setFormData("profileImg", data.data.profilePic);
    }
  }, [
    data.data.backgroundColor,
    data.data.backgroundImg,
    data.data.bio,
    data.data.name,
    data.data.profilePic,
    data.data.theme,
    galleryImage,
    selectedImage,
    setFormData,
  ]);

  useEffect(() => {
    if (data.data.primary) {
      setIsPrimaryMicrosite(true);
    }
    if (data.data.gatedAccess) {
      setIsGatedAccessOpen(true);
    }

    setIsWeb3Enabled(data.data.web3enabled);
  }, [
    data.data.primary,
    data.data.theme,
    data.data.gatedAccess,
    data.data.web3enabled,
  ]);

  // image upload for user profile
  const handleSelectImage = (image: any) => {
    setSelectedImage(image);
    setFormData("profileImg", image);
    setGalleryImage(null);
    setFormData("galleryImg", "");
  };

  const handleUserProfileModal = () => {
    onOpen();
    setIsBannerModalOpen(false);
    setIsUserProfileModalOpen(true);
  };

  useEffect(() => {
    if (galleryImage) {
      sendCloudinaryImage(galleryImage)
        .then((url) => {
          setUploadedImageUrl(url);
          setFormData("profileImg", url);
        })
        .catch((err) => {
          console.error("Error uploading image:", err);
        });
    }
  }, [galleryImage, setFormData]);

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(null);
      setIsUserProfileModalOpen(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryImage(reader.result as any);
        setFormData("galleryImg", reader.result as any);
      };
      reader.readAsDataURL(file);
    }
  };

  // console.log("background image", backgroundImage);

  const handleSmartSiteUpdateInfo = async (e: any) => {
    setIsFormSubmitLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // console.log("formData", formData);

    setGatedAccessError({
      contractAddress: "",
      tokenId: "",
      eventLink: "",
      network: "",
    });

    //set gated access error
    if (isGatedAccessOpen) {
      const errors = {
        contractAddress: "",
        tokenId: "",
        eventLink: "",
        network: "",
      };

      if (!formData.get("contractAddress")) {
        errors.contractAddress = "Contract address can't be empty!";
      }

      if (!formData.get("tokenId")) {
        errors.tokenId = "Token ID can't be empty!";
      }

      if (!formData.get("eventLink")) {
        errors.eventLink = "Mint Url can't be empty!";
      } else {
        const urlPattern = /^(https?:\/\/)/i;
        if (!urlPattern.test(formData.get("eventLink") as string)) {
          errors.eventLink = "Mint Url must start with http:// or https://";
        }
      }

      if (!formData.get("network")) {
        errors.network = "Network can't be empty!";
      }

      setGatedAccessError(errors);
      if (
        errors.contractAddress ||
        errors.eventLink ||
        errors.tokenId ||
        errors.network
      ) {
        setIsFormSubmitLoading(false);
        return;
      }
    }

    // const selectedTheme = backgroundImage.background ? true : false;

    const smartSiteInfo = {
      _id: data.data._id,
      name: formData.get("name") || "",
      bio: formData.get("bio") || "",
      brandImg: brandImage, //need to setup
      username: data.data.username || "",
      profilePic: uploadedImageUrl || selectedImage || data.data.profilePic,
      backgroundImg: smartSiteEditFormData.backgroundImg,
      gatedAccess: isGatedAccessOpen,
      gatedInfo: {
        contractAddress: formData.get("contractAddress") || "",
        tokenId: formData.get("tokenId") || "",
        eventLink: formData.get("eventLink") || "",
        network: formData.get("network") || "",
      },
      theme: smartSiteEditFormData.theme,
      ens: data.data.ens || "",
      primary: isPrimaryMicrosite,
      web3enabled: isWeb3Enabled,
      fontColor: smartSiteEditFormData.fontColor,
      fontFamily: smartSiteEditFormData.fontType,
      themeColor: smartSiteEditFormData.templateColor,
      backgroundColor: smartSiteEditFormData.backgroundColor,
    };

    // console.log("smartsite info", smartSiteInfo);

    try {
      const response = await handleSmartSiteUpdate(smartSiteInfo, token);
      console.log("response", response);

      if (response.state === "success") {
        refetch();
        router.push("/smartsite");
        toast({
          title: "Success",
          description: "Smartsite updated successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong!",
      });
    } finally {
      setIsFormSubmitLoading(false);
    }
    // console.log("form submitted successfully", response);
  };

  const handleDeleteSmartsite = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert your smartsite!",
      // icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        setDeleteLoading(true);
        const deleteSmartsite = await handleDeleteSmartSite(
          data.data._id,
          token
        );

        // console.log("data delte", data);

        refetch();

        if (deleteSmartsite?.state === "success") {
          // setDeleteLoading(false);
          // await Swal.fire({
          //   title: "Deleted!",
          //   text: "Your smartsite has been deleted.",
          //   icon: "success",
          // });
          router.push("/smartsite");
          // router.refresh();
        } else if (deleteSmartsite?.state === "fail") {
          await Swal.fire({
            title: "Error!",
            text: deleteSmartsite.message,
            icon: "error",
          });
        }
        // Check if the deleted microsite is the one stored in localStorage
        // const selectedSmartsite = localStorage.getItem("selected-smartsite");
        // Ensure localStorage is accessed only on the client side
        // if (typeof window !== "undefined") {
        //   // console.log("hit");

        //   const selectedSmartsite = localStorage.getItem("selected smartsite");
        //   // console.log("selected smartsite", selectedSmartsite);

        //   if (selectedSmartsite === microsite._id) {
        //     // console.log("true hit");
        //     localStorage.removeItem("selected smartsite");
        //     router.push("/select-smartsite");
        //   }
        // }
        setDeleteLoading(false);
      } catch (error) {
        // Handle error if the delete operation fails
        await Swal.fire({
          title: "Error",
          text: "There was an issue deleting your smartsite. Please try again.",
          icon: "error",
        });
        setDeleteLoading(false);
      }
    }
    // else if (result.dismiss === Swal.DismissReason.cancel) {
    //   await Swal.fire({
    //     title: "Cancelled",
    //     text: "Your smartsite is safe :)",
    //     icon: "error",
    //   });
    // }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(name, value);
  };

  // console.log("formdata", formData);

  // const [toggleIcon, setToggleIcon] = useState<any>([]);
  // const [triggerUpdateSmallIcon, setTriggerUpdateSmallIcon] = useState<any>("");
  // const [open, setOpen] = useState(false);

  // console.log("toogle icon", toggleIcon);

  const setSmartSiteData = useSmartSiteApiDataStore(
    (state: any) => state.setSmartSiteData
  ); //get setter for setting smartsite info from zustand store

  //get setter for setting session info from zustand store

  // const { isOn, setOff }: any = useSmallIconToggleStore();

  // const iconData: any = useUpdateSmartIcon(); //get trigger smarticon from zustand store

  // console.log("iconData", iconData);

  //set smartsite info into zustand store
  //set session info into zustand store
  useEffect(() => {
    if (data) {
      setSmartSiteData(data);
    }
  }, [data, setSmartSiteData]);

  // console.log("open", open);

  // console.log("icon data obbbjj", iconData);

  const fontType = [
    { key: "roboto", label: "Roboto" },
    { key: "poppins", label: "Poppins" },
    { key: "openSans", label: "OpenSans" },
    { key: "montserrat", label: "Montserrat" },
    { key: "rubik", label: "Rubik" },
  ];

  return (
    <main className="main-container">
      <div className="flex gap-4 2xl:gap-7 items-start h-[90vh]">
        <div
          style={{ height: "100%" }}
          className="w-[62%] overflow-y-auto pb-6 hide-scrollbar"
        >
          <form
            onSubmit={handleSmartSiteUpdateInfo}
            className=" border-r border-gray-300 pr-8 flex flex-col gap-4 overflow-auto"
          >
            <div className="bg-white rounded-xl p-6">
              <div className="flex justify-center">
                <div className="w-max relative">
                  {selectedImage || galleryImage ? (
                    <>
                      {selectedImage ? (
                        <Image
                          alt="user image"
                          src={
                            selectedImage
                              ? `/images/user_avator/${selectedImage}@3x.png`
                              : `/images/user_avator/1@3x.png`
                          }
                          quality={100}
                          width={300}
                          height={300}
                          className="rounded-full shadow-medium p-1 w-28 2xl:w-32 h-28 2xl:h-32"
                        />
                      ) : (
                        <Image
                          alt="user image"
                          src={galleryImage as any}
                          width={300}
                          height={300}
                          quality={100}
                          className="rounded-full shadow-medium p-1 w-28 2xl:w-32 h-28 2xl:h-32"
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {isUrl(data.data.profilePic) ? (
                        <Image
                          alt="user image"
                          src={data.data.profilePic as any}
                          width={300}
                          height={300}
                          quality={100}
                          className="rounded-full shadow-medium p-1 w-28 2xl:w-32 h-28 2xl:h-32"
                        />
                      ) : (
                        <Image
                          alt="user image"
                          src={`/images/user_avator/${data.data.profilePic}@3x.png`}
                          width={300}
                          height={300}
                          quality={100}
                          className="rounded-full shadow-medium p-1 w-28 2xl:w-32 h-28 2xl:h-32"
                        />
                      )}
                    </>
                  )}
                  <button
                    className="absolute right-1.5 bottom-1 p-[2px] bg-white rounded-full"
                    onClick={handleUserProfileModal}
                    type="button"
                  >
                    <Image
                      alt="edit icon"
                      src={editIcon}
                      // width={400}
                      quality={100}
                      className="w-[28px] h-[28px]"
                    />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-4 mt-6">
                <div>
                  <label htmlFor="name" className="font-medium text-gray-700">
                    Name
                  </label>
                  <div className="relative flex-1 mt-1">
                    <FiUser
                      className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                      size={18}
                    />
                    <input
                      type="text"
                      name="name"
                      placeholder={`Jhon Smith`}
                      defaultValue={data.data.name}
                      onChange={handleChange}
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="name" className="font-medium text-gray-700">
                    Profile Url
                  </label>
                  <div className="relative flex-1 mt-1">
                    <FiUser
                      className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                      size={18}
                    />
                    <input
                      type="text"
                      readOnly
                      value={data.data.profileUrl}
                      placeholder={`https://swopme.app/sp/fghh`}
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-white cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="name" className="font-medium text-gray-700">
                    Bio
                  </label>
                  <div className="relative flex-1 mt-1">
                    <TbUserSquare
                      className="absolute left-4 top-3 font-bold text-gray-600"
                      size={18}
                    />
                    <textarea
                      placeholder={`Real Estate Manager`}
                      defaultValue={data.data.bio}
                      onChange={handleChange}
                      name="bio"
                      className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-white"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-start justify-between gap-6">
              <Select
                variant="bordered"
                selectedKeys={[smartSiteEditFormData.fontType]}
                onChange={(e) => setFormData("fontType", e.target.value)}
                label={
                  <span className="text-gray-600 font-medium">Select Font</span>
                }
                className="max-w-40 bg-white rounded-xl"
              >
                {fontType.map((font) => (
                  <SelectItem key={font.key}>{font.label}</SelectItem>
                ))}
              </Select>
              <div>
                <p className="text-sm font-medium">Font Color</p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormData("fontColor", "#000000")}
                    className="bg-black w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.fontColor === "#000000" && (
                      <MdDone color="white" size={16} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData("fontColor", "#808080")}
                    className="bg-gray-400 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.fontColor === "#808080" && (
                      <MdDone color="white" size={16} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData("fontColor", "#D3D3D3")}
                    className="bg-[#D3D3D3] w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.fontColor === "#D3D3D3" && (
                      <MdDone color="black" size={16} />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-end">Templates Color</p>
                <div className="flex items-center justify-end gap-2 mt-1 w-36">
                  <button
                    type="button"
                    onClick={() => setFormData("templateColor", "#000000")}
                    className="bg-black w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.templateColor === "#000000" && (
                      <MdDone color="white" size={16} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData("templateColor", "#808080")}
                    className="bg-gray-400 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.templateColor === "#808080" && (
                      <MdDone color="white" size={16} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData("templateColor", "#FFFFFF")}
                    className="bg-white w-[22px] h-[22px] rounded-full flex items-center justify-center border border-gray-300"
                  >
                    {smartSiteEditFormData.templateColor === "#FFFFFF" && (
                      <MdDone color="black" size={16} />
                    )}
                  </button>
                  {smartSiteEditFormData.templateColor !== "#FFFFFF" &&
                    smartSiteEditFormData.templateColor !== "#808080" &&
                    smartSiteEditFormData.templateColor !== "#000000" &&
                    smartSiteEditFormData.templateColor !== "" && (
                      <button
                        type="button"
                        style={{
                          backgroundColor: smartSiteEditFormData.templateColor,
                        }}
                        className={`w-[22px] h-[22px] rounded-full flex items-center justify-center`}
                      >
                        <MdDone color="black" size={16} />
                      </button>
                    )}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setIsTemplateColorPickerOpen(!isTemplateColorPickerOpen)
                      }
                      className="bg-white w-[22px] h-[22px] rounded-full flex items-center justify-center border border-gray-500"
                    >
                      {isTemplateColorPickerOpen ? (
                        <FiMinus color="black" size={16} />
                      ) : (
                        <FiPlus color="black" size={16} />
                      )}
                    </button>
                    {isTemplateColorPickerOpen && (
                      <div className="absolute top-8 right-0 w-52 h-48 bg-white p-2 rounded-lg shadow-medium pb-8 z-50">
                        <p className="font-semibold text-sm text-center mb-1">
                          Select Template Color
                        </p>
                        <HexColorPicker
                          color={smartSiteEditFormData.templateColor}
                          onChange={(color) =>
                            setFormData("templateColor", color)
                          }
                          className="max-w-full max-h-full"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-8 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-lg font-medium text-gray-600 w-max">
                <p className="text-base">Make Primary Microsite</p>
                <Switch
                  color="default"
                  size="sm"
                  defaultSelected
                  isSelected={isPrimaryMicrosite}
                  onValueChange={setIsPrimaryMicrosite}
                  // onClick={() => setIsPrimaryMicrosite(!isPrimaryMicrosite)}
                  aria-label="Lead Captures"
                />
              </div>
              <AnimateButton
                type="button"
                onClick={handleBannerModal}
                width="w-64"
                className="!rounded-lg "
              >
                <LiaFileMedicalSolid size={20} /> Edit Background/Banner
              </AnimateButton>
            </div>
            <div className="flex items-center gap-8 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-lg font-medium text-gray-600 w-max">
              <p className="text-base">Make Web3 Enabled</p>
              <Switch
                color="default"
                size="sm"
                defaultSelected
                isSelected={isWeb3Enabled}
                onValueChange={setIsWeb3Enabled}
                aria-label="Lead Captures"
              />
            </div>
            <div>
              <p className="text-gray-700 font-medium">Your ENS Name</p>
              <div className="relative flex-1 mt-1">
                {/* <TbUserSquare
                  className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-600"
                  size={18}
                /> */}
                <input
                  placeholder={`Swop Username, ENS or Public Address`}
                  readOnly={data.data.ens}
                  value={data.data.ens}
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none px-4 py-3 text-gray-700 bg-white text-sm"
                />
                {data.data.ens && (
                  <button
                    type="button"
                    className="absolute right-6 top-1/2 -translate-y-1/2 font-medium text-gray-500 pl-4 py-1"
                    // className="absolute right-6 top-1/2 -translate-y-1/2 font-medium text-gray-500 border px-4 py-1 rounded-xl border-gray-300"
                  >
                    <MdDone color="green" size={20} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-8 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-lg font-medium text-gray-600 w-max">
              <p className="text-base">Gated Access</p>
              <Switch
                color="default"
                size="sm"
                isSelected={isGatedAccessOpen}
                onValueChange={setIsGatedAccessOpen}
                aria-label="Lead Captures"
              />
            </div>
            {isGatedAccessOpen && (
              <div className="bg-white p-5 flex flex-col gap-2">
                <div className="relative flex-1 mt-1">
                  <PiAddressBook
                    className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                    size={19}
                  />
                  <input
                    type="text"
                    placeholder={`Contract Address`}
                    defaultValue={data.data.gatedInfo.contractAddress}
                    name="contractAddress"
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-white"
                  />
                </div>
                {gatedAccessError.contractAddress && (
                  <p className="text-sm text-red-600 font-medium">
                    {gatedAccessError.contractAddress}
                  </p>
                )}
                <div className="relative flex-1 mt-1">
                  <FiUser
                    className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder={`Token ID`}
                    name="tokenId"
                    defaultValue={data.data.gatedInfo.tokenId}
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-white"
                  />
                </div>
                {gatedAccessError.tokenId && (
                  <p className="text-sm text-red-600 font-medium">
                    {gatedAccessError.tokenId}
                  </p>
                )}
                <div className="relative flex-1 mt-1">
                  <IoMdLink
                    className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder={`Mint URL`}
                    name="eventLink"
                    defaultValue={data.data.gatedInfo.eventLink}
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-white"
                  />
                </div>
                {gatedAccessError.eventLink && (
                  <p className="text-sm text-red-600 font-medium">
                    {gatedAccessError.eventLink}
                  </p>
                )}
                <div className="relative flex-1 mt-1">
                  <IoMdLink
                    className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                    size={18}
                  />
                  <select
                    name="network"
                    defaultValue={data.data.gatedInfo.network || ""}
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-white"
                  >
                    <option value="" disabled>
                      Select Network
                    </option>
                    <option value="etherium">Ethereum</option>
                    <option value="matic">Polygon</option>
                  </select>
                </div>
                {gatedAccessError.network && (
                  <p className="text-sm text-red-600 font-medium">
                    {gatedAccessError.network}
                  </p>
                )}
              </div>
            )}

            <DynamicPrimaryBtn
              className="py-3 text-base !gap-1"
              disabled={isFormSubmitLoading}
            >
              {isFormSubmitLoading ? (
                <Spinner size="sm" color="white" className="py-0.5" />
              ) : (
                <>
                  <LiaFileMedicalSolid size={20} />
                  Update
                </>
              )}
            </DynamicPrimaryBtn>
            <AnimateButton
              type="button"
              onClick={() => onDeleteOpen()}
              className="py-2 hover:py-3 text-base !gap-1 bg-white text-black w-full"
              // disabled={isFormSubmitLoading}
            >
              {deleteLoading ? (
                <Spinner size="sm" color="default" className="py-0.5" />
              ) : (
                <>
                  <MdDeleteOutline size={20} />
                  Delete
                </>
              )}
            </AnimateButton>

            {isDeleteOpen && (
              <DeleteModal
                isOpen={isDeleteOpen}
                onOpenChange={onDeleteOpenChange}
                parentId={data?.data?.parentId}
                _id={data?.data?._id}
                accessToken={token}
              />
            )}
          </form>
        </div>
        {/* <div style={{ height: "90%" }} className="w-[38%] overflow-y-auto"> */}
        <SmartsiteIconLivePreview
          isEditDetailsLivePreview={true}
          data={data.data}
        />
        {/* </div> */}
      </div>

      {isUserProfileModalOpen && (
        <SelectAvatorModal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          images={userProfileImages}
          onSelectImage={handleSelectImage}
          setIsModalOpen={setIsUserProfileModalOpen}
          handleFileChange={handleFileChange}
        />
      )}

      {isBannerModalOpen && (
        <SelectBackgroudOrBannerModal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          bannerImgArr={smatsiteBannerImageList}
          backgroundImgArr={smatsiteBackgroundImageList}
          // setBackgroundImage={setBackgroundImage}
          setIsBannerModalOpen={setIsBannerModalOpen}
        />
      )}

      {/* Update modal component list here  */}
      {/* <UpdateModalComponents isOn={isOn} iconData={iconData} setOff={setOff} /> */}
    </main>
  );
};

export default EditSmartSite;
