"use client";
import { Card } from "@/components/ui/card";
import isUrl from "@/lib/isUrl";
import { useUser } from "@/lib/UserContext";
import { MessageCircle, FileText, Star, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { FaEdit } from "react-icons/fa";

// Memoize StatCard component since it's purely presentational
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
    <Card className="flex flex-col items-center gap-2 p-4 min-w-32 xl:min-w-[160px]">
      <div className="flex w-full justify-center items-center bg-gray-100 rounded-md py-2">
        {icon} <span className="text-2xl font-bold">{value}</span>
      </div>
      <div>
        <p className="text-sm ">{label}</p>
      </div>
    </Card>
  );
});

// Memoize ProfileImage component
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
          width={80}
          height={80}
          className="rounded-full w-14 xl:w-16 h-14 xl:h-16 border-2 p-0.5"
        />
      ) : (
        <Image
          src={`/images/user_avator/${profilePic}.png`}
          alt={name || ""}
          width={80}
          height={80}
          className="rounded-full w-14 xl:w-16 h-14 xl:h-16 border-2"
        />
      )}
      <Link href={"/account-settings"}>
        <FaEdit className="absolute bottom-0 right-0 text-gray-700 bg-white rounded-full w-6 h-6 p-[3px] border border-gray-300" />
      </Link>
    </div>
  );
});

// Main component memoized
const ProfileHeader = memo(function ProfileHeader() {
  const { user, loading, error } = useUser();

  return (
    <div className="w-full border-none rounded-xl font-[roboto]">
      <div className="flex flex-col md:flex-row items-start lg:items-center gap-4 xl:gap-6 bg-white p-6 rounded-lg">
        {/* Profile Section */}
        <div className="flex items-center gap-2 xl:gap-4">
          <ProfileImage
            profilePic={user?.profilePic || ""}
            name={user?.name || ""}
          />
          <div className="xl:space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-md font-semibold">{user?.name}</h1>
            </div>
            <p className="text-muted-foreground">{user?.ensName}</p>
            <p className="text-sm text-muted-foreground">{user?.address}</p>
          </div>
        </div>

        {/* Followers Section */}
        <div className="flex gap-4">
          <div className="text-center">
            <p className="font-semibold">{user?.followers?.toLocaleString()}</p>
            <p className="text-sm ">Followers</p>
          </div>
          <div className="border-l-2 border-gray-700 h-5 " />
          <div className="text-center">
            <p className="font-semibold">{user?.following?.toLocaleString()}</p>
            <p className="text-sm ">Following</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="flex flex-wrap gap-4 ml-0 md:ml-auto">
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
