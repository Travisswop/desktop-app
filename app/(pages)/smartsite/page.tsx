'use client';
// import SecondaryButton from "@/components/SecondaryButton";
// import { Checkbox, useDisclosure } from "@nextui-org/react";
import Image from 'next/image';
import React from 'react';
// import { AiOutlineSelect } from "react-icons/ai";
// import { BsSend, BsSendFill } from "react-icons/bs";
// import { IoDuplicateOutline } from "react-icons/io5";
// import { TbTransfer } from "react-icons/tb";
import { LiaFileMedicalSolid } from 'react-icons/lia';
import Link from 'next/link';
import ButtonList from '@/components/smartsite/ButtonList';
import isUrl from '@/lib/isUrl';
import SmartsiteSocialShare from '@/components/smartsite/socialShare/SmartsiteSocialShare';
import { useUser } from '@/lib/UserContext';
import { useDesktopUserData } from '@/components/tanstackQueryApi/getUserData';
import SmartSitePageLoading from '@/components/loading/SmartSitePageLoading';
// import ButtonList from "@/components/smartsiteList/ButtonList";
// import SmartSiteUrlShareModal from "@/components/ShareModal/SmartsiteShareModal";
// import SmartsiteSocialShare from "@/components/SmartsiteSocialShare";
// import { useUser } from "@/lib/UserContext";

const SmartsitePage = () => {
  const { user, loading, accessToken } = useUser();

  const {
    data,
    error,
    isLoading,
    // isFetching,
    //refetch,
  } = useDesktopUserData(user?._id, accessToken || '');

  if (loading) {
    return <SmartSitePageLoading />;
  }

  if (isLoading) {
    return <SmartSitePageLoading />;
  }

  if (error) {
    return <p>Something Went Wrong!</p>;
  }

  return (
    <div className="">
      {/* <div className="flex items-center justify-between mb-3">
        <SecondaryButton>
          <AiOutlineSelect />
          Select
        </SecondaryButton>
        <div className="flex items-center gap-2">
          <SecondaryButton>
            <IoDuplicateOutline />
            Duplicate
          </SecondaryButton>
          <SecondaryButton>
            <TbTransfer />
            Transfer
          </SecondaryButton>
        </div>
      </div> */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {data &&
          data?.microsites?.length > 0 &&
          data?.microsites?.map((microsite: any) => (
            <div
              key={microsite._id}
              className="bg-white p-4 rounded-xl shadow-small"
            >
              <div className="flex justify-between items-start mb-3 relative">
                <div className="flex-1 flex justify-center">
                  <Image
                    alt="user image"
                    src={
                      isUrl(microsite.profilePic)
                        ? microsite.profilePic
                        : `/images/user_avator/${microsite.profilePic}.png`
                    }
                    width={300}
                    height={300}
                    className="rounded-full w-28 h-28"
                  />
                </div>
                <SmartsiteSocialShare
                  profileUrl={microsite.profileUrl}
                />
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-700">
                    {microsite.name}
                  </h3>
                  <p className="font-medium text-gray-500">
                    {microsite.bio}
                  </p>
                </div>
                <ButtonList
                  microsite={microsite}
                  token={accessToken || ''}
                  id={user?._id || ''}
                />
              </div>
            </div>
          ))}

        <Link
          href={'/smartsite/create-smartsite'}
          className="bg-white px-4 py-[4rem] rounded-xl shadow-small flex flex-col gap-6 items-center"
        >
          <div className="p-5 bg-gray-200 w-max rounded-full">
            <LiaFileMedicalSolid size={20} />
          </div>
          <p className="text-lg font-bold text-gray-700">
            Create New Microsite
          </p>
        </Link>
      </div>
    </div>
  );
};

export default SmartsitePage;
