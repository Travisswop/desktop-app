"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import editIcon from "@/public/images/websites/edit-icon.svg";
import { FiUser } from "react-icons/fi";
import { TbUserSquare } from "react-icons/tb";
import { Spinner, Switch, useDisclosure } from "@nextui-org/react";
import EditMicrositeBtn from "@/components/Button/EditMicrositeBtn";
import { LiaFileMedicalSolid } from "react-icons/lia";
import { IoMdLink } from "react-icons/io";
import DynamicPrimaryBtn from "@/components/Button/DynamicPrimaryBtn";
import LivePreview from "@/components/LivePreview";
import SelectBackgroudOrBannerModal from "@/components/SelectBackgroudOrBannerModal/SelectBackgroudOrBannerModal";
import isUrl from "@/util/isUrl";
import { PiAddressBook } from "react-icons/pi";
import SelectAvatorModal from "@/components/modal/SelectAvatorModal";
import userProfileImages from "@/util/data/userProfileImage";
import { sendCloudinaryImage } from "@/util/SendCloudineryImage";
import smatsiteBackgroundImageList from "@/util/data/smatsiteBackgroundImageList";
import smatsiteBannerImageList from "@/util/data/smartsiteBannerImageList";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";
import { handleSmartSiteUpdate } from "@/actions/update";
import { toast } from "react-toastify";
import useSmallIconToggleStore from "@/zustandStore/SmallIconModalToggle";
import useUpdateSmartIcon from "@/zustandStore/UpdateSmartIcon";
import UpdateModalComponents from "@/components/EditMicrosite/UpdateModalComponents";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import useLoggedInUserStore from "@/zustandStore/SetLogedInUserSession";
import { useRouter } from "next/navigation";
import AnimateButton from "@/components/Button/AnimateButton";

const EditSmartSite = ({ data, token, session }: any) => {
  const [selectedImage, setSelectedImage] = useState(null); // get user avator image

  const { formData: smartSiteEditFormData, setFormData }: any =
    useSmartsiteFormStore();

  // console.log("selected image", selectedImage);
  //console.log("formData from edit page", smartSiteEditFormData);

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

  const { isOn, setOff }: any = useSmallIconToggleStore();

  const iconData: any = useUpdateSmartIcon(); //get trigger smarticon from zustand store

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

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
    if (!selectedImage && !galleryImage) {
      setFormData("profileImg", data.data.profilePic);
    }
  }, [
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
    // if (data.data.theme) {
    //   setIsBackgrundImageSelected(true);
    // }
  }, [data.data.primary, data.data.theme, data.data.gatedAccess]);

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
  }, [galleryImage]);

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
      web3enabled: data.data.web3enabled,
    };

    // console.log("smartsite info", smartSiteInfo);

    try {
      const response = await handleSmartSiteUpdate(smartSiteInfo, token);
      // console.log("response", response);

      if (response.state === "success") {
        router.push("/smartsites");
        toast.success("Smartsite updated successfully");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsFormSubmitLoading(false);
    }
    // console.log("form submitted successfully", response);
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

  const setLoggedInUserInfo = useLoggedInUserStore(
    (state: any) => state.setUser
  ); //get setter for setting session info from zustand store

  // const { isOn, setOff }: any = useSmallIconToggleStore();

  // const iconData: any = useUpdateSmartIcon(); //get trigger smarticon from zustand store

  // console.log("iconData", iconData);

  //set smartsite info into zustand store
  //set session info into zustand store
  useEffect(() => {
    if (data) {
      setSmartSiteData(data);
    }
    if (session) {
      // console.log("session", session);

      setLoggedInUserInfo(session);
    }
    // if (iconData) {
    //   setOpen(true);
    // }
  }, [data, session, iconData, setLoggedInUserInfo, setSmartSiteData]);

  // console.log("open", open);

  // console.log("icon data obbbjj", iconData);

  return (
    <main className="main-container">
      <div className="flex gap-7 items-start h-[90vh]">
        <div
          style={{ height: "100%" }}
          className="w-[62%] overflow-y-auto custom-scrollbar"
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
                              ? `/images/user_avator/${selectedImage}.png`
                              : `/images/user_avator/1.png`
                          }
                          width={160}
                          height={160}
                          className="rounded-full shadow-medium p-1"
                        />
                      ) : (
                        <div className="relative overflow-hidden rounded-full w-28 xl:w-36 2xl:w-44 h-28 xl:h-36 2xl:h-44 p-1 bg-white shadow-medium">
                          <Image
                            alt="user image"
                            src={galleryImage as any}
                            fill
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {isUrl(data.data.profilePic) ? (
                        <div className="relative overflow-hidden rounded-full w-28 xl:w-36 2xl:w-44 h-28 xl:h-36 2xl:h-44 p-1 bg-white shadow-medium">
                          <Image
                            alt="user image"
                            src={data.data.profilePic as any}
                            fill
                          />
                        </div>
                      ) : (
                        <Image
                          alt="user image"
                          src={`/images/user_avator/${data.data.profilePic}.png`}
                          width={160}
                          height={160}
                          className="rounded-full shadow-medium p-1"
                        />
                      )}
                    </>
                  )}
                  <button
                    className="absolute right-0 bottom-4"
                    onClick={handleUserProfileModal}
                    type="button"
                  >
                    <Image alt="edit icon" src={editIcon} width={40} />
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
            <div>
              <p className="text-gray-700 font-semibold">
                Select Message Address
              </p>
              <div className="relative flex-1 mt-1">
                <TbUserSquare
                  className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-600"
                  size={18}
                />
                <input
                  placeholder={`Swop Username, ENS or Public Address`}
                  readOnly
                  value={data.data.ens}
                  className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-10 py-6 text-gray-700 bg-white"
                />
                <button
                  type="button"
                  className="absolute right-6 top-1/2 -translate-y-1/2 font-medium text-gray-500 border px-4 py-1 rounded-xl border-gray-300"
                >
                  Connect
                </button>
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
          </form>
        </div>
        {/* <div style={{ height: "90%" }} className="w-[38%] overflow-y-auto"> */}
        <LivePreview data={data.data} />
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
      <UpdateModalComponents isOn={isOn} iconData={iconData} setOff={setOff} />
    </main>
  );
};

export default EditSmartSite;
