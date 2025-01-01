"use client";
// import { Card } from "@/components/ui/card";
import isUrl from "@/lib/isUrl";
import { useUser } from "@/lib/UserContext";
import { MessageCircle, FileText, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import editIcon from "@/public/images/websites/edit-icon.svg";

const StatCard = memo(function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-2 2xl:p-4 min-w-28 2xl:min-w-[140px] shadow-medium rounded-lg">
      <div className="flex w-full justify-center items-center bg-gray-100 rounded-md py-2">
        {icon} <span className="text-2xl font-bold">{value}</span>
      </div>
      <div>
        <p className="text-sm ">{label}</p>
      </div>
    </div>
  );
});

const ProfileImage = memo(function ProfileImage({
  profilePic,
  name,
}: {
  profilePic: string;
  name: string;
}) {
  return (
    <div className="relative">
      {isUrl(profilePic || "") ? (
        <Image
          src={profilePic || ""}
          alt={name || ""}
          width={200}
          height={200}
          className="rounded-full w-14 xl:w-16 h-14 xl:h-16"
        />
      ) : (
        <Image
          src={`/images/user_avator/${profilePic}@3x.png`}
          alt={name || ""}
          width={200}
          height={200}
          className="rounded-full w-14 xl:w-16 h-14 xl:h-16"
        />
      )}
      <Link
        href={"/account-settings"}
        // className="absolute bottom-0 right-0 text-gray-700 bg-white rounded-full w-6 h-6 p-[3px] border border-gray-300"
      >
        {/* <FaEdit className="absolute bottom-0 right-0 text-gray-700 bg-white rounded-full w-6 h-6 p-[3px] border border-gray-300" /> */}
        <button
          className="absolute -right-0.5 -bottom-1 p-[1px] bg-white rounded-full"
          type="button"
        >
          <Image
            alt="edit icon"
            src={editIcon}
            width={400}
            quality={100}
            className="w-[24px] h-[24px]"
          />
        </button>
      </Link>
    </div>
  );
});

// Main component memoized
const ProfileHeader = memo(function ProfileHeader() {
  const { user } = useUser();

  return (
    <div className="w-full border-none rounded-xl font-[figTree]">
      <div className="flex flex-col md:flex-row items-start lg:items-center gap-5 xl:gap-6 justify-between bg-white p-6 rounded-lg">
        {/* Profile Section */}
        <div className="flex items-center gap-3">
          <ProfileImage
            profilePic={user?.profilePic || ""}
            name={user?.name || ""}
          />
          <div className="">
            <div className="flex items-center gap-2">
              <h1 className="text-md font-semibold">{user?.name}</h1>
            </div>
            <p className="text-muted-foreground">{user?.ensName}</p>
            <p className="text-sm text-gray-600">{user?.address}</p>
          </div>
        </div>

        {/* Followers Section */}
        <div className="flex gap-4">
          <div className="text-center">
            <p className="font-semibold">{user?.followers?.toLocaleString()}</p>
            <p className="font-medium">Followers</p>
          </div>
          <div className="border-l-2 border-gray-700 h-5 " />
          <div className="text-center">
            <p className="font-semibold">{user?.following?.toLocaleString()}</p>
            <p className="font-medium">Following</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="flex flex-wrap gap-2 xl:gap-4">
          <StatCard
            icon={<MessageCircle className="w-5 h-5" />}
            value={0}
            label="Messages"
          />
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            value={0}
            label="Orders"
          />
          <StatCard
            icon={<Star className="w-5 h-5" />}
            value={0}
            label="Swopple Points"
          />
        </div>
      </div>
    </div>
  );
});

export default ProfileHeader;
