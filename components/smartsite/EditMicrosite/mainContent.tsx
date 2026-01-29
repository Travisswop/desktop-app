"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import editIcon from "@/public/images/websites/edit-icon.svg";
import { FiUser } from "react-icons/fi";
import { TbUserSquare } from "react-icons/tb";
import { Spinner, Switch, useDisclosure } from "@nextui-org/react";
import SelectAvatorModal from "@/components/modal/SelectAvatorModal";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";
import { handleSmartSiteUpdate } from "@/actions/update";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import SelectBackgroudOrBannerModal from "@/components/modal/SelectBackgroudOrBannerModal";
import isUrl from "@/lib/isUrl";
import userProfileImages from "@/components/util/data/userProfileImage";
import smatsiteBackgroundImageList from "@/components/util/data/smatsiteBackgroundImageList";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import { useDesktopUserData } from "@/components/tanstackQueryApi/getUserData";
import { MdDone } from "react-icons/md";
import Swal from "sweetalert2";
import { handleDeleteSmartSite } from "@/actions/deleteSmartsite";
import Cookies from "js-cookie";
import DeleteModal from "./DeleteModal";
import logger from "@/utils/logger";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { FaEdit } from "react-icons/fa";

const EditSmartSite = ({ data, token }: any) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
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

  logger.log("data test", data);

  const { refetch } = useDesktopUserData(data?.data?.parentId, accessToken);

  const { toast } = useToast();

  const { formData: smartSiteEditFormData, setFormData }: any =
    useSmartsiteFormStore();

  console.log("smartSiteEditFormData", smartSiteEditFormData);

  const [galleryImage, setGalleryImage] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");

  const [isGatedAccessOpen, setIsGatedAccessOpen] = useState(false);
  const [gatedAccessError, setGatedAccessError] = useState({
    contractAddress: "",
    tokenId: "",
    eventLink: "",
    network: "",
  });
  const [isPrimaryMicrosite, setIsPrimaryMicrosite] = useState(false);
  const [isWeb3Enabled, setIsWeb3Enabled] = useState(false);
  const [brandImage, setBrandImage] = useState("");

  const [isFormSubmitLoading, setIsFormSubmitLoading] = useState(false);

  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onOpenChange: onDeleteOpenChange,
  } = useDisclosure();

  const router = useRouter();

  const handleBannerModal = (e: any) => {
    e.preventDefault();
    setIsUserProfileModalOpen(false);
    setIsBannerModalOpen(true);
    onOpen();
  };

  useEffect(() => {
    setFormData("name", data.data.name);
    setFormData("bio", data.data.bio);
    setFormData("backgroundImg", data.data.backgroundImg);
    setFormData("galleryImg", "");
    setFormData("theme", data.data.theme);
    setFormData("backgroundColor", data.data.backgroundColor);
    setFormData("fontColor", data.data.fontColor);
    setFormData("secondaryFontColor", data.data.secondaryFontColor);
    setFormData("secondaryFontColor", data.data.secondaryFontColor);
    setFormData("fontType", data.data.fontFamily);
    if (!selectedImage && !galleryImage) {
      setFormData("profileImg", data.data.profilePic);
    }
    console.log("data.data.fontFamily", data.data.fontFamily);
  }, [
    data.data.backgroundColor,
    data.data.backgroundImg,
    data.data.bio,
    data.data.fontColor,
    data.data.fontFamily,
    data.data.name,
    data.data.profilePic,
    data.data.secondaryFontColor,
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

  const handleSelectImage = (image: any) => {
    setSelectedImage(image);
    setFormData("profileImg", image);
    setGalleryImage(null);
    setFormData("galleryImg", "");
  };

  const handleUserProfileModal = (e: any) => {
    e.preventDefault();
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
          logger.error("Error uploading image:", err);
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

  const handleSmartSiteUpdateInfo = async (
    e: any,
    updatedData?: { backgroundColor: string; backgroundImg: string | number },
  ) => {
    setIsFormSubmitLoading(true);
    e.preventDefault();
    // setGatedAccessError({
    //   contractAddress: "",
    //   tokenId: "",
    //   eventLink: "",
    //   network: "",
    // });

    // if (isGatedAccessOpen) {
    //   const errors = {
    //     contractAddress: "",
    //     tokenId: "",
    //     eventLink: "",
    //     network: "",
    //   };

    //   if (!formData.get("contractAddress")) {
    //     errors.contractAddress = "Contract address can't be empty!";
    //   }

    //   if (!formData.get("tokenId")) {
    //     errors.tokenId = "Token ID can't be empty!";
    //   }

    //   if (!formData.get("eventLink")) {
    //     errors.eventLink = "Mint Url can't be empty!";
    //   } else {
    //     const urlPattern = /^(https?:\/\/)/i;
    //     if (!urlPattern.test(formData.get("eventLink") as string)) {
    //       errors.eventLink = "Mint Url must start with http:// or https://";
    //     }
    //   }

    //   if (!formData.get("network")) {
    //     errors.network = "Network can't be empty!";
    //   }

    //   setGatedAccessError(errors);
    //   if (
    //     errors.contractAddress ||
    //     errors.eventLink ||
    //     errors.tokenId ||
    //     errors.network
    //   ) {
    //     setIsFormSubmitLoading(false);
    //     return;
    //   }
    // }

    console.log("updatedData1", updatedData);

    const smartSiteInfo = {
      _id: data.data._id,
      name: smartSiteEditFormData.name || data.data.name,
      bio: smartSiteEditFormData.bio || data.data.dio,
      brandImg: brandImage,
      username: data.data.username || "",
      profilePic: uploadedImageUrl || selectedImage || data.data.profilePic,
      backgroundImg:
        updatedData?.backgroundImg || updatedData?.backgroundColor
          ? updatedData?.backgroundImg
          : smartSiteEditFormData.backgroundImg,
      // gatedAccess: isGatedAccessOpen,
      // gatedInfo: {
      //   contractAddress: formData.get("contractAddress") || "",
      //   tokenId: formData.get("tokenId") || "",
      //   eventLink: formData.get("eventLink") || "",
      //   network: formData.get("network") || "",
      // },
      theme: smartSiteEditFormData.theme,
      ens: data.data.ens || "",
      primary: isPrimaryMicrosite,
      // web3enabled: isWeb3Enabled,
      fontColor: smartSiteEditFormData.fontColor,
      secondaryFontColor: smartSiteEditFormData.secondaryFontColor,
      fontFamily: smartSiteEditFormData.fontType || data.data.fontFamily,
      themeColor: smartSiteEditFormData.templateColor,
      backgroundColor:
        updatedData?.backgroundImg || updatedData?.backgroundColor
          ? updatedData?.backgroundColor
          : smartSiteEditFormData.backgroundColor,
    };

    console.log("smartSiteInfo payload", smartSiteInfo);

    try {
      const response = await handleSmartSiteUpdate(smartSiteInfo, token);
      logger.log("response", response);

      if (response.state === "success") {
        refetch();
        router.push(`/smartsite/profile/${data.data._id}`);
        setIsFormSubmitLoading(false);
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
  };

  const handleDeleteSmartsite = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert your smartsite!",
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
          token,
        );

        refetch();

        if (deleteSmartsite?.state === "success") {
          router.push("/smartsite");
        } else if (deleteSmartsite?.state === "fail") {
          await Swal.fire({
            title: "Error!",
            text: deleteSmartsite.message,
            icon: "error",
          });
        }
        setDeleteLoading(false);
      } catch (error) {
        await Swal.fire({
          title: "Error",
          text: "There was an issue deleting your smartsite. Please try again.",
          icon: "error",
        });
        setDeleteLoading(false);
      }
    }
  };

  const handleChange = (e: any) => {
    console.log("hit");

    const { name, value } = e.target;
    setFormData(name, value);
  };

  const setSmartSiteData = useSmartSiteApiDataStore(
    (state: any) => state.setSmartSiteData,
  );

  useEffect(() => {
    if (data) {
      setSmartSiteData(data);
    }
  }, [data, setSmartSiteData]);

  const fontType = [
    { key: "Roboto", label: "Roboto" },
    { key: "Poppins", label: "Poppins" },
    { key: "OpenSans", label: "OpenSans" },
    { key: "Montserrat", label: "Montserrat" },
    { key: "Rubik", label: "Rubik" },
  ];

  return (
    <main className="h-full">
      <div className="w-full lg:w-[84%] xl:w-[72%] 2xl:w-[68%] mx-auto bg-white py-4 rounded-xl">
        <form
          onSubmit={handleSmartSiteUpdateInfo}
          className="flex flex-col gap-10 justify-center h-full px-[4%] lg:px-[10%]"
        >
          <div className="">
            <div className="flex justify-center">
              <div className="w-max relative">
                {selectedImage || galleryImage ? (
                  <div className="w-28 xl:w-32 h-28 xl:h-32 overflow-hidden border-[2px] border-stone-500 rounded-full">
                    {selectedImage ? (
                      <Image
                        alt="user image"
                        src={
                          selectedImage
                            ? `/images/user_avator/${selectedImage}@3x.png`
                            : `/images/user_avator/1@3x.png`
                        }
                        quality={100}
                        width={1200}
                        height={1200}
                        className="w-full h-full"
                      />
                    ) : (
                      <Image
                        alt="user image"
                        src={galleryImage as any}
                        width={1200}
                        height={1200}
                        quality={100}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                ) : (
                  <div className="w-28 xl:w-32 h-28 xl:h-32 overflow-hidden border-[2px] border-stone-500 rounded-full">
                    {isUrl(data.data.profilePic) ? (
                      <Image
                        alt="user image"
                        src={data.data.profilePic as any}
                        width={1200}
                        height={1200}
                        quality={100}
                        className="w-full h-full"
                      />
                    ) : (
                      <Image
                        alt="user image"
                        src={`/images/user_avator/${data.data.profilePic}@3x.png`}
                        width={1200}
                        height={1200}
                        quality={100}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                )}
                <button
                  className="absolute right-0 bottom-2 border-2 border-white rounded-full"
                  onClick={handleUserProfileModal}
                  type="button"
                >
                  <Image
                    alt="edit icon"
                    src={editIcon}
                    width={1200}
                    height={1200}
                    quality={100}
                    className="w-7 h-7"
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
                    defaultValue={data.data.name}
                    onChange={handleChange}
                    placeholder="Jhon Smith"
                    className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white rounded-2xl shadow-md shadow-gray-200 border border-gray-100 focus:outline-none"
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
                    className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white rounded-2xl shadow-md shadow-gray-200 border border-gray-100 focus:outline-none"
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
                    className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white rounded-2xl shadow-md shadow-gray-200 border border-gray-100 focus:outline-none"
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap flex-col sm:flex-row items-start justify-between gap-x-5 gap-y-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="font-medium text-gray-700">
                Font Type
              </label>

              <Select
                value={smartSiteEditFormData.fontType || data.data.fontFamily}
                onValueChange={(value) => {
                  handleChange({
                    target: {
                      name: "fontType",
                      value: value,
                    },
                  });
                }}
              >
                <SelectTrigger className="min-w-[140px] shadow-md border-gray-100">
                  <SelectValue placeholder="Select a Font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Select Font</SelectLabel>
                    {fontType.map((font) => (
                      <SelectItem value={font.key} key={font.key}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium">Primary Font Color</p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setFormData("fontColor", "gray")}
                  className="bg-[gray] w-[22px] h-[22px] rounded-full flex items-center justify-center"
                >
                  {smartSiteEditFormData.fontColor === "gray" && (
                    <MdDone color="white" size={16} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData("fontColor", "black")}
                  className="bg-black w-[22px] h-[22px] rounded-full flex items-center justify-center"
                >
                  {smartSiteEditFormData.fontColor === "black" && (
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
                {/* <button
                  type="button"
                  onClick={() => setFormData("fontColor", "#ffffff")}
                  className="bg-[#ffffff] w-[22px] h-[22px] rounded-full flex items-center justify-center border border-black"
                >
                  {smartSiteEditFormData.fontColor === "#ffffff" && (
                    <MdDone color="black" size={16} />
                  )}
                </button> */}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Secondary Font Color</p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setFormData("secondaryFontColor", "gray")}
                  className="bg-[gray] w-[22px] h-[22px] rounded-full flex items-center justify-center"
                >
                  {smartSiteEditFormData.secondaryFontColor === "gray" && (
                    <MdDone color="white" size={16} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setFormData("secondaryFontColor", "black")}
                  className="bg-black w-[22px] h-[22px] rounded-full flex items-center justify-center"
                >
                  {smartSiteEditFormData.secondaryFontColor === "black" && (
                    <MdDone color="white" size={16} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData("secondaryFontColor", "#D3D3D3")}
                  className="bg-[#D3D3D3] w-[22px] h-[22px] rounded-full flex items-center justify-center"
                >
                  {smartSiteEditFormData.secondaryFontColor === "#D3D3D3" && (
                    <MdDone color="black" size={16} />
                  )}
                </button>
                {/* <button
                  type="button"
                  onClick={() => setFormData("secondaryFontColor", "#ffffff")}
                  className="bg-[#ffffff] w-[22px] h-[22px] rounded-full flex items-center justify-center border border-black"
                >
                  {smartSiteEditFormData.secondaryFontColor === "#ffffff" && (
                    <MdDone color="black" size={16} />
                  )}
                </button> */}
              </div>
            </div>
            {/* <div>
              <p className="text-sm font-medium lg:text-end">Theme Color</p>
              <div className="flex items-center lg:justify-end gap-2 mt-1 w-36">
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
                  onClick={() => setFormData("templateColor", "#D3D3D3")}
                  className="bg-[#D3D3D3] w-[22px] h-[22px] rounded-full flex items-center justify-center"
                >
                  {smartSiteEditFormData.templateColor === "#D3D3D3" && (
                    <MdDone color="black" size={16} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData("templateColor", "#FFFFFF")}
                  className="bg-white w-[22px] h-[22px] rounded-full flex items-center justify-center border border-black"
                >
                  {smartSiteEditFormData.templateColor === "#FFFFFF" && (
                    <MdDone color="black" size={16} />
                  )}
                </button>
              </div>
            </div> */}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleBannerModal}
              className="flex items-center gap-4 font-medium text-gray-600"
            >
              Edit Background <FaEdit size={16} />
            </button>
            <div className="flex items-center gap-4 text-lg font-medium text-gray-600">
              <p className="text-base">Make Primary Microsite</p>
              <Switch
                color="default"
                size="sm"
                defaultSelected
                isSelected={isPrimaryMicrosite}
                onValueChange={setIsPrimaryMicrosite}
                aria-label="Lead Captures"
              />
            </div>
          </div>
          {/* <div className="flex items-center gap-8 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-lg font-medium text-gray-600 w-max">
            <p className="text-base">Make Web3 Enabled</p>
            <Switch
              color="default"
              size="sm"
              defaultSelected
              isSelected={isWeb3Enabled}
              onValueChange={setIsWeb3Enabled}
              aria-label="Lead Captures"
            />
          </div> */}
          {/* <div>
            <p className="text-gray-700 font-medium">Your ENS Name</p>
            <div className="relative flex-1 mt-1">
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
                >
                  <MdDone color="green" size={20} />
                </button>
              )}
            </div>
          </div> */}
          {/* <div className="flex items-center gap-8 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-lg font-medium text-gray-600 w-max">
            <p className="text-base">Gated Access</p>
            <Switch
              color="default"
              size="sm"
              isSelected={isGatedAccessOpen}
              onValueChange={setIsGatedAccessOpen}
              aria-label="Lead Captures"
            />
          </div> */}
          {/* {isGatedAccessOpen && (
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
          )} */}

          <div className="flex items-center gap-2 md:gap-6 w-full sm:w-[90%] justify-center mx-auto">
            <PrimaryButton
              className="py-2.5 text-base w-full bg-black hover:bg-gray-800 text-white"
              disabled={isFormSubmitLoading}
              type={"submit"}
            >
              {isFormSubmitLoading ? (
                <Spinner size="sm" color="white" className="py-0.5" />
              ) : (
                "Save"
              )}
            </PrimaryButton>
            <PrimaryButton
              type="button"
              onClick={() => onDeleteOpen()}
              className="py-2.5 text-base w-full"
            >
              {deleteLoading ? (
                <Spinner size="sm" color="default" className="py-0.5" />
              ) : (
                "Delete"
              )}
            </PrimaryButton>
          </div>

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
          backgroundImgArr={smatsiteBackgroundImageList}
          setIsBannerModalOpen={setIsBannerModalOpen}
          onSmartSiteUpdateInfo={handleSmartSiteUpdateInfo}
        />
      )}
    </main>
  );
};

export default EditSmartSite;
