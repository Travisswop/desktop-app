'use client';
import AddIcon from '@/components/smartsite/EditMicrosite/AddIcon';
import IconMaker from '@/components/smartsite/EditMicrosite/IconMaker';
import UpdateModalComponents from '@/components/smartsite/EditMicrosite/UpdateModalComponents';
import SmartsiteIconLivePreview from '@/components/smartsite/SmartsiteIconLivePreview';
import SmartSiteUrlShareModal from '@/components/smartsite/socialShare/SmartsiteShareModal';
import useSmartsiteFormStore from '@/zustandStore/EditSmartsiteInfo';
import useSmallIconToggleStore from '@/zustandStore/SmallIconModalToggle';
import useUpdateSmartIcon from '@/zustandStore/UpdateSmartIcon';
import useSmartSiteApiDataStore from '@/zustandStore/UpdateSmartsiteInfo';
import { useDisclosure } from '@nextui-org/react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import templates from '@/public/images/smartsite_icon/templates.png';
import SmartsiteIconsParentProfileCard from '@/components/smartsite/SmartsiteIconsParentProfileCard';

const MicrositeEditMainContentPage = ({ data }: any) => {
  const [toggleIcon, setToggleIcon] = useState<any>([]);
  const [smartsiteProfileUrl, setSmartSiteProfileUrl] =
    useState<any>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { formData, setFormData }: any = useSmartsiteFormStore();
  const setSmartSiteData = useSmartSiteApiDataStore(
    (state: any) => state.setSmartSiteData
  );
  const { isOn, setOff }: any = useSmallIconToggleStore();
  const iconData: any = useUpdateSmartIcon();

  const handleRemoveIcon = (title: { title: string }) => {
    const filteredIcon = toggleIcon.filter(
      (data: any) => data != title
    );
    setToggleIcon(filteredIcon);
  };

  const handleToggleIcon = (title: string) => {
    if (toggleIcon.includes(title)) {
      setToggleIcon(toggleIcon.filter((icon: any) => icon !== title));
    } else {
      setToggleIcon([...toggleIcon, title]);
    }
  };

  useEffect(() => {
    if (data) {
      setSmartSiteData(data);
    }
  }, [data, setSmartSiteData]);

  useEffect(() => {
    setFormData('backgroundImg', data.data.backgroundImg);
    setFormData('bio', data.data.bio);
    setFormData('galleryImg', '');
    setFormData('name', data.data.name);
    setFormData('theme', data.data.theme);
    setFormData('profileImg', data.data.profilePic);
  }, [
    data.data.backgroundImg,
    data.data.bio,
    data.data.name,
    data.data.profilePic,
    data.data.theme,
    setFormData,
  ]);

  const handleOpenShareModal = (smartsiteUrl: any) => {
    onOpen();
    setSmartSiteProfileUrl(smartsiteUrl);
  };

  return (
    <main className="main-container overflow-hidden">
      <div
        style={{ height: 'calc(100vh - 108px)' }}
        className="flex gap-1 2xl:gap-6 items-start"
      >
        <div
          style={{ height: '100%' }}
          className="w-[62%] relative border-r border-gray-200 pr-6 2xl:pr-8 flex flex-col gap-4 overflow-y-auto hide-scrollbar pb-6"
        >
          <SmartsiteIconsParentProfileCard data={data.data} />
          <div className="flex items-center gap-1 bg-white rounded-xl w-max mx-auto px-6 py-1 font-medium shadow-medium mb-2">
            <Image
              src={templates}
              alt="template image"
              className="w-10 h-auto"
            />
            <p>Templates</p>
          </div>
          <section className="pl-1 2xl:px-4">
            <IconMaker
              handleToggleIcon={handleToggleIcon}
              toggleIcon={toggleIcon}
            />
          </section>

          <UpdateModalComponents
            isOn={isOn}
            iconData={iconData}
            setOff={setOff}
          />

          <div className="flex flex-col-reverse gap-4 px-8 xl:px-14 2xl:px-24">
            {toggleIcon.map((info: any, index: number) => (
              <AddIcon
                key={index}
                data={info}
                handleToggleIcon={handleToggleIcon}
                handleRemoveIcon={handleRemoveIcon}
              />
            ))}
          </div>
        </div>
        <SmartsiteIconLivePreview data={data.data} />
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
