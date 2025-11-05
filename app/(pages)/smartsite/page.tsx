"use client";
import Image from "next/image";
import React from "react";
import { LiaFileMedicalSolid } from "react-icons/lia";
import Link from "next/link";
import ButtonList from "@/components/smartsite/ButtonList";
import isUrl from "@/lib/isUrl";
import SmartsiteSocialShare from "@/components/smartsite/socialShare/SmartsiteSocialShare";
import { useUser } from "@/lib/UserContext";
import { useDesktopUserData } from "@/components/tanstackQueryApi/getUserData";
import SmartSitePageLoading from "@/components/loading/SmartSitePageLoading";
import { AiOutlineSelect } from "react-icons/ai";
import { IoDuplicateOutline } from "react-icons/io5";
import { TbTransfer } from "react-icons/tb";
import { Checkbox } from "@nextui-org/react";
import { BsSend } from "react-icons/bs";

const SmartsitePage = () => {
  const { user, loading, accessToken } = useUser();

  const { data, error, isLoading } = useDesktopUserData(
    user?._id,
    accessToken || ""
  );

  console.log("data", data);

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
      <div className="flex items-center justify-between mb-3">
        <button className="flex items-center gap-1 border-2 border-gray-600 rounded-lg px-4 py-1">
          <AiOutlineSelect />
          Select
        </button>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 border-2 border-gray-600 rounded-lg px-4 py-1">
            <IoDuplicateOutline />
            Duplicate
          </button>
          <button className="flex items-center gap-1 border-2 border-gray-600 rounded-lg px-4 py-1">
            <TbTransfer />
            Transfer
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 2xl:gap-x-6 pb-4">
        {data &&
          data?.microsites?.length > 0 &&
          data?.microsites?.map((microsite: any) => (
            <div
              key={microsite._id}
              className="bg-white p-4 rounded-xl shadow-small"
            >
              <div className="flex justify-between items-start mb-3 relative">
                <Checkbox onClick={(e) => e.stopPropagation()} />
                <div className="flex-1 flex justify-center">
                  <Image
                    alt="user image"
                    src={
                      isUrl(microsite.profilePic)
                        ? microsite.profilePic
                        : `/images/user_avator/${microsite.profilePic}.png`
                    }
                    width={500}
                    height={500}
                    quality={100}
                    className="rounded-full w-24 2xl:w-28 h-24 2xl:h-28 border-[3px] border-gray-300"
                  />
                </div>
                <SmartsiteSocialShare
                  profileUrl={microsite.ens || microsite?.ensData?.name}
                  isAbsolute={false}
                  className="bg-white hover:bg-white shadow-medium"
                >
                  <BsSend size={18} />
                </SmartsiteSocialShare>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-black">
                    {microsite.name}
                  </h3>
                  <p className="font-medium text-gray-500">{microsite.bio}</p>
                </div>
                <ButtonList
                  microsite={microsite}
                  token={accessToken || ""}
                  id={user?._id || ""}
                  qrEmbeddedUrl={microsite.profileUrl}
                />
              </div>
            </div>
          ))}

        <Link
          href={"/smartsite/create-smartsite"}
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
