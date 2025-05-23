'use client';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import editIcon from '@/public/images/websites/edit-icon.svg';
import { FiMinus, FiPlus, FiUser } from 'react-icons/fi';
import { TbUserSquare } from 'react-icons/tb';
import {
  Select,
  SelectItem,
  Spinner,
  Switch,
  useDisclosure,
} from '@nextui-org/react';
import { Button } from '@nextui-org/react';
import { LiaFileMedicalSolid } from 'react-icons/lia';
import { IoMdLink } from 'react-icons/io';
import { PiAddressBook } from 'react-icons/pi';
import SelectAvatorModal from '@/components/modal/SelectAvatorModal';
import useSmartsiteFormStore from '@/zustandStore/EditSmartsiteInfo';
import { handleSmartSiteUpdate } from '@/actions/update';
import useSmartSiteApiDataStore from '@/zustandStore/UpdateSmartsiteInfo';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import DynamicPrimaryBtn from '@/components/ui/Button/DynamicPrimaryBtn';
import SelectBackgroudOrBannerModal from '@/components/modal/SelectBackgroudOrBannerModal';
import isUrl from '@/lib/isUrl';
import userProfileImages from '@/components/util/data/userProfileImage';
import smatsiteBannerImageList from '@/components/util/data/smartsiteBannerImageList';
import smatsiteBackgroundImageList from '@/components/util/data/smatsiteBackgroundImageList';
import AnimateButton from '@/components/ui/Button/AnimateButton';
import { sendCloudinaryImage } from '@/lib/SendCloudinaryImage';
import SmartsiteIconLivePreview from '../SmartsiteIconLivePreview';
import { useDesktopUserData } from '@/components/tanstackQueryApi/getUserData';
import { HexColorPicker } from 'react-colorful';
import { MdDeleteOutline, MdDone } from 'react-icons/md';
import Swal from 'sweetalert2';
import { handleDeleteSmartSite } from '@/actions/deleteSmartsite';
import Cookies from 'js-cookie';
import DeleteModal from './DeleteModal';
import logger from '@/utils/logger';

const EditSmartSite = ({ data, token }: any) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get('access-token');
      if (token) {
        setAccessToken(token);
      }
    };
    getAccessToken();
  }, []);

  const { refetch } = useDesktopUserData(
    data?.data?.parentId,
    accessToken
  );

  const { toast } = useToast();

  const { formData: smartSiteEditFormData, setFormData }: any =
    useSmartsiteFormStore();

  const [galleryImage, setGalleryImage] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');

  const [isGatedAccessOpen, setIsGatedAccessOpen] = useState(false);
  const [gatedAccessError, setGatedAccessError] = useState({
    contractAddress: '',
    tokenId: '',
    eventLink: '',
    network: '',
  });
  const [isPrimaryMicrosite, setIsPrimaryMicrosite] = useState(false);
  const [isWeb3Enabled, setIsWeb3Enabled] = useState(false);
  const [brandImage, setBrandImage] = useState('');

  const [isTemplateColorPickerOpen, setIsTemplateColorPickerOpen] =
    useState(false);

  const [isFormSubmitLoading, setIsFormSubmitLoading] =
    useState(false);

  const [isUserProfileModalOpen, setIsUserProfileModalOpen] =
    useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

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

  useEffect(() => {
    setFormData('backgroundImg', data.data.backgroundImg);
    setFormData('bio', data.data.bio);
    setFormData('galleryImg', '');
    setFormData('name', data.data.name);
    setFormData('theme', data.data.theme);
    setFormData('backgroundColor', data.data.backgroundColor);
    if (!selectedImage && !galleryImage) {
      setFormData('profileImg', data.data.profilePic);
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

  const handleSelectImage = (image: any) => {
    setSelectedImage(image);
    setFormData('profileImg', image);
    setGalleryImage(null);
    setFormData('galleryImg', '');
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
          setFormData('profileImg', url);
        })
        .catch((err) => {
          logger.error('Error uploading image:', err);
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
        setFormData('galleryImg', reader.result as any);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSmartSiteUpdateInfo = async (e: any) => {
    setIsFormSubmitLoading(true);
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setGatedAccessError({
      contractAddress: '',
      tokenId: '',
      eventLink: '',
      network: '',
    });

    if (isGatedAccessOpen) {
      const errors = {
        contractAddress: '',
        tokenId: '',
        eventLink: '',
        network: '',
      };

      if (!formData.get('contractAddress')) {
        errors.contractAddress = "Contract address can't be empty!";
      }

      if (!formData.get('tokenId')) {
        errors.tokenId = "Token ID can't be empty!";
      }

      if (!formData.get('eventLink')) {
        errors.eventLink = "Mint Url can't be empty!";
      } else {
        const urlPattern = /^(https?:\/\/)/i;
        if (!urlPattern.test(formData.get('eventLink') as string)) {
          errors.eventLink =
            'Mint Url must start with http:// or https://';
        }
      }

      if (!formData.get('network')) {
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

    const smartSiteInfo = {
      _id: data.data._id,
      name: formData.get('name') || '',
      bio: formData.get('bio') || '',
      brandImg: brandImage,
      username: data.data.username || '',
      profilePic:
        uploadedImageUrl || selectedImage || data.data.profilePic,
      backgroundImg: smartSiteEditFormData.backgroundImg,
      gatedAccess: isGatedAccessOpen,
      gatedInfo: {
        contractAddress: formData.get('contractAddress') || '',
        tokenId: formData.get('tokenId') || '',
        eventLink: formData.get('eventLink') || '',
        network: formData.get('network') || '',
      },
      theme: smartSiteEditFormData.theme,
      ens: data.data.ens || '',
      primary: isPrimaryMicrosite,
      web3enabled: isWeb3Enabled,
      fontColor: smartSiteEditFormData.fontColor,
      secondaryFontColor: smartSiteEditFormData.secondaryFontColor,
      fontFamily: smartSiteEditFormData.fontType,
      themeColor: smartSiteEditFormData.templateColor,
      backgroundColor: smartSiteEditFormData.backgroundColor,
    };

    try {
      const response = await handleSmartSiteUpdate(
        smartSiteInfo,
        token
      );
      logger.log('response', response);

      if (response.state === 'success') {
        refetch();
        router.push('/smartsite');
        toast({
          title: 'Success',
          description: 'Smartsite updated successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong!',
      });
    } finally {
      setIsFormSubmitLoading(false);
    }
  };

  const handleDeleteSmartsite = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert your smartsite!",
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        setDeleteLoading(true);
        const deleteSmartsite = await handleDeleteSmartSite(
          data.data._id,
          token
        );

        refetch();

        if (deleteSmartsite?.state === 'success') {
          router.push('/smartsite');
        } else if (deleteSmartsite?.state === 'fail') {
          await Swal.fire({
            title: 'Error!',
            text: deleteSmartsite.message,
            icon: 'error',
          });
        }
        setDeleteLoading(false);
      } catch (error) {
        await Swal.fire({
          title: 'Error',
          text: 'There was an issue deleting your smartsite. Please try again.',
          icon: 'error',
        });
        setDeleteLoading(false);
      }
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(name, value);
  };

  const setSmartSiteData = useSmartSiteApiDataStore(
    (state: any) => state.setSmartSiteData
  );

  useEffect(() => {
    if (data) {
      setSmartSiteData(data);
    }
  }, [data, setSmartSiteData]);

  const fontType = [
    { key: 'roboto', label: 'Roboto' },
    { key: 'poppins', label: 'Poppins' },
    { key: 'openSans', label: 'OpenSans' },
    { key: 'montserrat', label: 'Montserrat' },
    { key: 'rubik', label: 'Rubik' },
  ];

  return (
    <main className="main-container">
      <div className="flex gap-4 2xl:gap-7 items-start h-[90vh]">
        <div
          style={{ height: '100%' }}
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
                      quality={100}
                      className="w-[28px] h-[28px]"
                    />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-4 mt-6">
                <div>
                  <label
                    htmlFor="name"
                    className="font-medium text-gray-700"
                  >
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
                  <label
                    htmlFor="name"
                    className="font-medium text-gray-700"
                  >
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
                  <label
                    htmlFor="name"
                    className="font-medium text-gray-700"
                  >
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
                onChange={(e) =>
                  setFormData('fontType', e.target.value)
                }
                label={
                  <span className="text-gray-600 font-medium">
                    Select Font
                  </span>
                }
                className="max-w-40 bg-white rounded-xl"
              >
                {fontType.map((font) => (
                  <SelectItem key={font.key}>{font.label}</SelectItem>
                ))}
              </Select>
              <div>
                <p className="text-sm font-medium">
                  Primary Text Color
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData('fontColor', '#808080')
                    }
                    className="bg-gray-400 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.fontColor ===
                      '#808080' && <MdDone color="white" size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData('fontColor', '#000000')
                    }
                    className="bg-black w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.fontColor ===
                      '#000000' && <MdDone color="white" size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData('fontColor', '#D3D3D3')
                    }
                    className="bg-[#D3D3D3] w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.fontColor ===
                      '#D3D3D3' && <MdDone color="black" size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData('fontColor', '#ffffff')
                    }
                    className="bg-[#ffffff] w-[22px] h-[22px] rounded-full flex items-center justify-center border border-black"
                  >
                    {smartSiteEditFormData.fontColor ===
                      '#ffffff' && <MdDone color="black" size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">
                  Secondary Text Color
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData('secondaryFontColor', '#808080')
                    }
                    className="bg-gray-400 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.secondaryFontColor ===
                      '#808080' && <MdDone color="white" size={16} />}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData('secondaryFontColor', '#000000')
                    }
                    className="bg-black w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.secondaryFontColor ===
                      '#000000' && <MdDone color="white" size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData('secondaryFontColor', '#D3D3D3')
                    }
                    className="bg-[#D3D3D3] w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.secondaryFontColor ===
                      '#D3D3D3' && <MdDone color="black" size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData('secondaryFontColor', '#ffffff')
                    }
                    className="bg-[#ffffff] w-[22px] h-[22px] rounded-full flex items-center justify-center border border-black"
                  >
                    {smartSiteEditFormData.secondaryFontColor ===
                      '#ffffff' && <MdDone color="black" size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-end">
                  Theme Color
                </p>
                <div className="flex items-center justify-end gap-2 mt-1 w-36">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData('templateColor', '#000000')
                    }
                    className="bg-black w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.templateColor ===
                      '#000000' && <MdDone color="white" size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData('templateColor', '#808080')
                    }
                    className="bg-gray-400 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.templateColor ===
                      '#808080' && <MdDone color="white" size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData('templateColor', '#D3D3D3')
                    }
                    className="bg-[#D3D3D3] w-[22px] h-[22px] rounded-full flex items-center justify-center"
                  >
                    {smartSiteEditFormData.templateColor ===
                      '#D3D3D3' && <MdDone color="black" size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData('templateColor', '#FFFFFF')
                    }
                    className="bg-white w-[22px] h-[22px] rounded-full flex items-center justify-center border border-black"
                  >
                    {smartSiteEditFormData.templateColor ===
                      '#FFFFFF' && <MdDone color="black" size={16} />}
                  </button>
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
                  aria-label="Lead Captures"
                />
              </div>
              <AnimateButton
                type="button"
                onClick={handleBannerModal}
                width="w-64"
                className="!rounded-lg "
              >
                <LiaFileMedicalSolid size={20} /> Edit
                Background/Banner
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
              <p className="text-gray-700 font-medium">
                Your ENS Name
              </p>
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
                    defaultValue={data.data.gatedInfo.network || ''}
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
              type={'submit'}
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
            >
              {deleteLoading ? (
                <Spinner
                  size="sm"
                  color="default"
                  className="py-0.5"
                />
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
        <SmartsiteIconLivePreview
          isEditDetailsLivePreview={true}
          data={data.data}
        />
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
          setIsBannerModalOpen={setIsBannerModalOpen}
        />
      )}
    </main>
  );
};

export default EditSmartSite;
