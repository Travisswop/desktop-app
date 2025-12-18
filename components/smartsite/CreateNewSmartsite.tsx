"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import profileEditIcon from "@/public/images/websites/profile-edit.png";
import { FiMinus, FiPlus, FiUser } from "react-icons/fi";
import { TbUserSquare } from "react-icons/tb";
import {
  Select,
  SelectItem,
  Spinner,
  Switch,
  useDisclosure,
} from "@nextui-org/react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import { IoMdLink } from "react-icons/io";
import { PiAddressBook } from "react-icons/pi";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";
import { handleCreateSmartSite } from "@/actions/update";
import useSmallIconToggleStore from "@/zustandStore/SmallIconModalToggle";
import useUpdateSmartIcon from "@/zustandStore/UpdateSmartIcon";
import { MdAssignmentAdd, MdDone } from "react-icons/md";
import { useRouter } from "next/navigation";
import EditMicrositeBtn from "../ui/Button/EditMicrositeBtn";
import DynamicPrimaryBtn from "../ui/Button/DynamicPrimaryBtn";
import SelectBackgroudOrBannerModal from "../modal/SelectBackgroudOrBannerModal";
import SelectAvatorModal from "../modal/SelectAvatorModal";
import userProfileImages from "../util/data/userProfileImage";
import smatsiteBannerImageList from "../util/data/smartsiteBannerImageList";
import smatsiteBackgroundImageList from "../util/data/smatsiteBackgroundImageList";
import { sendCloudinaryImage } from "@/lib/SendCloudinaryImage";
import { useUser } from "@/lib/UserContext";
import { HexColorPicker } from "react-colorful";
import { useDesktopUserData } from "../tanstackQueryApi/getUserData";

const CreateSmartSite = ({ token }: { token: string }) => {
  const { formData, setFormData } = useSmartsiteFormStore();

  const { user } = useUser();

  const { refetch } = useDesktopUserData(user?._id, token);

  const [selectedImage, setSelectedImage] = useState(null); // get user avator image
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
  const [brandImage, setBrandImage] = useState(""); //need to set brand image

  const [isTemplateColorPickerOpen, setIsTemplateColorPickerOpen] =
    useState(false);

  // const [profileImage, setProfileImage] = useState("");
  const [backgroundImage, setBackgroundImage] = useState({
    background: "",
    banner: "",
  });
  // console.log("backgroundImage", backgroundImage);

  // const [isBackgrundImageSelected, setIsBackgrundImageSelected] =
  //   useState(false);

  const [isFormSubmitLoading, setIsFormSubmitLoading] = useState(false);

  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

  // console.log("gatedAccessError", gatedAccessError);

  const { isOn, setOff }: any = useSmallIconToggleStore();

  const iconData: any = useUpdateSmartIcon(); //get trigger smarticon from zustand store

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const router = useRouter();

  const handleBannerModal = () => {
    setIsUserProfileModalOpen(false);
    setIsBannerModalOpen(true);
    onOpen();
  };

  useEffect(() => {
    if (user?.subscription?.status === "free") {
      router.push("/subscription");
    }
  }, [router, user?.subscription?.status]);

  useEffect(() => {
    setFormData("backgroundImg", "5");
    setFormData("bio", "");
    setFormData("galleryImg", "");
    setFormData("profileImg", "1");
    setFormData("name", "");
    setFormData("theme", true);
  }, [setFormData]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(name, value);
  };

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

  const handleSmartSiteUpdateInfo = async (e: any) => {
    e.preventDefault();
    setIsFormSubmitLoading(true);
    const newFormData = new FormData(e.currentTarget);
    // console.log("formData", formData);

    console.log("hit");

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

      if (!newFormData.get("contractAddress")) {
        errors.contractAddress = "Contract address can't be empty!";
      }

      if (!newFormData.get("tokenId")) {
        errors.tokenId = "Token ID can't be empty!";
      }

      if (!newFormData.get("eventLink")) {
        errors.eventLink = "Mint Url can't be empty!";
      } else {
        const urlPattern = /^(https?:\/\/)/i;
        if (!urlPattern.test(newFormData.get("eventLink") as string)) {
          errors.eventLink = "Mint Url must start with http:// or https://";
        }
      }

      if (!newFormData.get("network")) {
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

    // const id = "1234";

    // const selectedTheme = backgroundImage.background ? true : false;

    const smartSiteInfo = {
      parentId: user?._id,
      name: newFormData.get("name") || "",
      bio: newFormData.get("bio") || "",
      brandImg: brandImage, //need to setup
      profilePic: formData.profileImg || "1",
      backgroundImg: formData.backgroundImg,
      gatedAccess: isGatedAccessOpen,
      gatedInfo: {
        contractAddress: newFormData.get("contractAddress") || "",
        tokenId: newFormData.get("tokenId") || "",
        eventLink: newFormData.get("eventLink") || "",
        network: newFormData.get("network") || "",
      },
      theme: formData.theme,
      //   ens: data.data.ens || "",
      primary: isPrimaryMicrosite,
      //   web3enabled: data.data.web3enabled,
      fontColor: formData.fontColor,
      fontFamily: formData.fontType,
      themeColor: formData.templateColor,
    };

    console.log("smartsite info", smartSiteInfo);

    try {
      const response = await handleCreateSmartSite(smartSiteInfo, token);
      console.log("response", response);

      if (response.state === "success") {
        //console.log("responseeee", response);
        // const micrositeId =
        //   response?.data?.microsites[response?.data?.microsites.length - 1]._id;
        // router.push(`/ens-swop-id?id=${micrositeId}`);
        refetch();
        router.push(`/smartsite`);
        // toast.success("Smartsite created successfully");
      }
    } catch (error: any) {
      // toast.error("something went wrong!");
      console.log(error.message);
    } finally {
      setIsFormSubmitLoading(false);
    }
    // console.log("form submitted successfully", response);
  };

  // const { isOn, setOff }: any = useSmallIconToggleStore();

  // const iconData: any = useUpdateSmartIcon(); //get trigger smarticon from zustand store

  // console.log("iconData", iconData);

  //set smartsite info into zustand store
  //set session info into zustand store
  // useEffect(() => {
  //   if (session) {
  //     setLoggedInUserInfo(session);
  //   }
  // }, [session, setLoggedInUserInfo]);

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
    <div className="h-[calc(100vh-150px)] overflow-hidden">
      <div className="w-full lg:w-[84%] xl:w-[72%] 2xl:w-[68%] mx-auto bg-white py-4 px-[4%] lg:px-[10%] rounded-xl h-full overflow-y-auto">
        <form
          onSubmit={handleSmartSiteUpdateInfo}
          className="flex flex-col gap-4 overflow-auto"
        >
          <div className="">
            <div className="flex justify-center">
              <div className="w-max relative">
                {selectedImage || galleryImage ? (
                  <>
                    {selectedImage ? (
                      <div className="w-28 xl:w-32 h-28 xl:h-32 overflow-hidden border-[2px] border-stone-500 rounded-full">
                        <Image
                          alt="user image"
                          src={
                            selectedImage
                              ? `/images/user_avator/${selectedImage}@3x.png`
                              : `/images/user_avator/1@3x.png`
                          }
                          width={1200}
                          height={1200}
                          quality={100}
                          className="w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="w-28 xl:w-32 h-28 xl:h-32 overflow-hidden border-[2px] border-stone-500 rounded-full">
                        <Image
                          alt="user image"
                          src={galleryImage!}
                          width={1200}
                          height={1200}
                          quality={100}
                          className="w-full h-full"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-28 xl:w-32 h-28 xl:h-32 overflow-hidden border-[2px] border-stone-500 rounded-full">
                      <Image
                        alt="user image"
                        src={`/images/user_avator/1@3x.png`}
                        width={1200}
                        height={1200}
                        quality={100}
                        className="w-full h-full"
                      />
                    </div>
                  </>
                )}
                <button
                  className="absolute right-0 bottom-2 border-2 border-white rounded-full"
                  onClick={handleUserProfileModal}
                  type="button"
                >
                  <Image
                    alt="edit icon"
                    src={profileEditIcon}
                    quality={100}
                    width={1200}
                    height={1200}
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
                    required={true}
                    defaultValue={""}
                    placeholder={`Type your name`}
                    onChange={handleChange}
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-white"
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
                    placeholder={`Type your bio`}
                    defaultValue={""}
                    required={true}
                    onChange={handleChange}
                    name="bio"
                    className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-2 text-gray-700 bg-white"
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <Select
              variant="bordered"
              selectedKeys={[formData.fontType]}
              onChange={(e) => setFormData("fontType", e.target.value as any)}
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
                  {formData.fontColor === "#000000" && (
                    <MdDone color="white" size={16} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData("fontColor", "#808080")}
                  className="bg-gray-400 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                >
                  {formData.fontColor === "#808080" && (
                    <MdDone color="white" size={16} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData("fontColor", "#D3D3D3")}
                  className="bg-[#D3D3D3] w-[22px] h-[22px] rounded-full flex items-center justify-center"
                >
                  {formData.fontColor === "#D3D3D3" && (
                    <MdDone color="black" size={16} />
                  )}
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium sm:text-end">Templates Color</p>
              <div className="flex items-center sm:justify-end gap-2 mt-1 w-36">
                <button
                  type="button"
                  onClick={() => setFormData("templateColor", "#000000")}
                  className="bg-black w-[22px] h-[22px] rounded-full flex items-center justify-center"
                >
                  {formData.templateColor === "#000000" && (
                    <MdDone color="white" size={16} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData("templateColor", "#808080")}
                  className="bg-gray-400 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                >
                  {formData.templateColor === "#808080" && (
                    <MdDone color="white" size={16} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData("templateColor", "#FFFFFF")}
                  className="bg-white w-[22px] h-[22px] rounded-full flex items-center justify-center border border-gray-300"
                >
                  {formData.templateColor === "#FFFFFF" && (
                    <MdDone color="black" size={16} />
                  )}
                </button>
                {formData.templateColor !== "#FFFFFF" &&
                  formData.templateColor !== "#808080" &&
                  formData.templateColor !== "#000000" &&
                  formData.templateColor !== "" && (
                    <button
                      type="button"
                      style={{
                        backgroundColor: formData.templateColor,
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
                        color={formData.templateColor}
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
          <EditMicrositeBtn
            onClick={handleBannerModal}
            className="rounded-lg text-base !bg-transparent border-gray-300 py-2 w-max"
          >
            <LiaFileMedicalSolid size={20} color="#001534" /> Edit
            Background/Banner
          </EditMicrositeBtn>
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
            <div className="flex flex-col gap-2">
              <div className="relative flex-1 mt-1">
                <PiAddressBook
                  className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                  size={19}
                />
                <input
                  type="text"
                  placeholder={`Contract Address`}
                  defaultValue={""}
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
                  defaultValue={""}
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
                  defaultValue={""}
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
                  defaultValue={""}
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
            type={"submit"}
            disabled={isFormSubmitLoading}
          >
            {isFormSubmitLoading ? (
              <Spinner size="sm" color="white" className="py-0.5" />
            ) : (
              <>
                <MdAssignmentAdd size={20} />
                Create
              </>
            )}
          </DynamicPrimaryBtn>
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
          bannerImgArr={smatsiteBannerImageList}
          backgroundImgArr={smatsiteBackgroundImageList}
          setBackgroundImage={setBackgroundImage}
          setIsBannerModalOpen={setIsBannerModalOpen}
        />
      )}
    </div>
  );
};

export default CreateSmartSite;
