"use client";
import AddIcon from "@/components/smartsite/EditMicrosite/AddIcon";
import IconMaker from "@/components/smartsite/EditMicrosite/IconMaker";
import UpdateModalComponents from "@/components/smartsite/EditMicrosite/UpdateModalComponents";
import SmartsiteIconLivePreview from "@/components/smartsite/SmartsiteIconLivePreview";
import SmartSiteUrlShareModal from "@/components/smartsite/socialShare/SmartsiteShareModal";
import AnimateButton from "@/components/ui/Button/AnimateButton";
import DynamicPrimaryBtn from "@/components/ui/Button/DynamicPrimaryBtn";
import EditMicrositeBtn from "@/components/ui/Button/EditMicrositeBtn";
// import AnimateButton from "@/components/Button/AnimateButton";
// import DynamicPrimaryBtn from "@/components/Button/DynamicPrimaryBtn";
// import EditMicrositeBtn from "@/components/Button/EditMicrositeBtn";
// import AddIcon from "@/components/EditMicrosite/AddIcon";
// import IconMaker from "@/components/EditMicrosite/IconMaker";
// import UpdateModalComponents from "@/components/EditMicrosite/UpdateModalComponents";
// import LivePreview from "@/components/LivePreview";
// import SmartSiteUrlShareModal from "@/components/ShareModal/SmartsiteShareModal";
import useSmartsiteFormStore from "@/zustandStore/EditSmartsiteInfo";
import useSmallIconToggleStore from "@/zustandStore/SmallIconModalToggle";
import useUpdateSmartIcon from "@/zustandStore/UpdateSmartIcon";
import useSmartSiteApiDataStore from "@/zustandStore/UpdateSmartsiteInfo";
import { Switch, useDisclosure } from "@nextui-org/react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { BsSend } from "react-icons/bs";
import { LiaFileMedicalSolid } from "react-icons/lia";

const MicrositeEditMainContentPage = ({ data }: any) => {
  const [toggleIcon, setToggleIcon] = useState<any>([]);
  const [smartsiteProfileUrl, setSmartSiteProfileUrl] = useState<any>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const { formData, setFormData }: any = useSmartsiteFormStore();

  // console.log("toogle icon", toggleIcon);

  const setSmartSiteData = useSmartSiteApiDataStore(
    (state: any) => state.setSmartSiteData
  ); //get setter for setting smartsite info from zustand store

  const { isOn, setOff }: any = useSmallIconToggleStore();

  const iconData: any = useUpdateSmartIcon(); //get trigger smarticon from zustand store

  // console.log("iconData", iconData);

  const handleAddIcon = (title: { title: string }) => {
    setToggleIcon([...toggleIcon, title]);
  };
  const handleRemoveIcon = (title: { title: string }) => {
    // console.log("title", title);
    const filteredIcon = toggleIcon.filter((data: any) => data != title);
    // console.log("filteredIcon", filteredIcon);

    setToggleIcon(filteredIcon);
  };

  //set smartsite info into zustand store
  //set session info into zustand store
  useEffect(() => {
    if (data) {
      setSmartSiteData(data);
    }
    // if (iconData) {
    //   setOpen(true);
    // }
  }, [data, setSmartSiteData]);

  useEffect(() => {
    setFormData("backgroundImg", data.data.backgroundImg);
    setFormData("bio", data.data.bio);
    setFormData("galleryImg", "");
    setFormData("name", data.data.name);
    setFormData("theme", data.data.theme);
    setFormData("profileImg", data.data.profilePic);
  }, [
    data.data.backgroundImg,
    data.data.bio,
    data.data.name,
    data.data.profilePic,
    data.data.theme,
    setFormData,
  ]);

  // console.log("open", open);

  //console.log("data", data);

  const handleOpenShareModal = (smartsiteUrl: any) => {
    onOpen();
    setSmartSiteProfileUrl(smartsiteUrl);
  };

  return (
    <main className="main-container overflow-hidden">
      <div className="flex gap-6 items-start h-[90vh]">
        <div
          style={{ height: "100%" }}
          className="w-[62%] relative border-r border-gray-200 pr-8 flex flex-col gap-4 overflow-y-auto custom-scrollbar"
        >
          <div className="flex items-center justify-between">
            <h5 className="heading-3">Microsite Builder</h5>
            <EditMicrositeBtn
              onClick={() => handleOpenShareModal(data.data.profileUrl)}
            >
              <BsSend /> Share
            </EditMicrositeBtn>
          </div>
          <IconMaker
            handleAddIcon={handleAddIcon}
            handleRemoveIcon={handleRemoveIcon}
            toggleIcon={toggleIcon}
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* <EditMicrositeBtn>
              <LiaFileMedicalSolid size={20} />
              Customize QR
            </EditMicrositeBtn> */}
            <Link href={`/smartsites/qr-code/${data.data._id}`}>
              <AnimateButton
                type="button"
                width="w-48"
                className="!rounded-full bg-white"
              >
                <LiaFileMedicalSolid size={20} />
                Customize QR
              </AnimateButton>
            </Link>

            <Link href={`/smartsites/${data.data._id}`}>
              <AnimateButton
                type="button"
                width="w-48"
                className="!rounded-full bg-white"
              >
                <LiaFileMedicalSolid size={20} />
                Edit Background
              </AnimateButton>
            </Link>
            {/* <EditMicrositeBtn>
              <LiaFileMedicalSolid size={20} />
              Edit Background
            </EditMicrositeBtn> */}
            <Link href={`/smartsites/${data.data._id}`}>
              <AnimateButton
                type="button"
                // width="w-44"
                className="!rounded-full bg-white"
              >
                <LiaFileMedicalSolid size={20} />
                Microsite Settings
              </AnimateButton>
            </Link>
            {/* <Link href={`/smartsites/travis-herron`}>
              <EditMicrositeBtn>
                <LiaFileMedicalSolid size={20} />
                Microsite Settings
              </EditMicrositeBtn>
            </Link> */}
          </div>
          <a href={data.data.profileUrl} target="_blank">
            <DynamicPrimaryBtn className="w-full !rounded-full mt-2">
              <LiaFileMedicalSolid size={20} /> Publish
            </DynamicPrimaryBtn>
          </a>
          <div className="flex items-center gap-8 border border-gray-300 rounded-xl pl-4 pr-3 py-2 text-lg font-medium text-gray-600 w-max">
            <p>Lead Capture</p>
            <Switch
              color="default"
              size="sm"
              defaultSelected
              aria-label="Lead Captures"
            />
          </div>

          {/* Update modal component list here  */}
          <UpdateModalComponents
            isOn={isOn}
            iconData={iconData}
            setOff={setOff}
          />

          <div className="flex flex-col-reverse gap-4">
            {toggleIcon.map((info: any, index: number) => (
              <AddIcon
                key={index}
                data={info}
                handleRemoveIcon={handleRemoveIcon}
              />
            ))}
          </div>
        </div>
        {/* <div> */}
        <SmartsiteIconLivePreview data={data.data} />
        {/* </div> */}
      </div>
      {smartsiteProfileUrl && (
        <SmartSiteUrlShareModal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          smartSiteProfileUrl={smartsiteProfileUrl}
        />
      )}
    </main>
  );
};

export default MicrositeEditMainContentPage;
