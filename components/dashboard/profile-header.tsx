import { Card } from '@/components/ui/card';
import {
  MessageCircle,
  FileText,
  Star,
  CheckCircle2,
} from 'lucide-react';
import Image from 'next/image';

interface ProfileHeaderProps {
  name: string;
  username: string;
  location: string;
  followers: number;
  following: number;
  messages: number;
  orders: number;
  points: number;
  imageUrl: string;
}

export default function ProfileHeader({
  name,
  username,
  location,
  followers,
  following,
  messages,
  orders,
  points,
  imageUrl,
}: ProfileHeaderProps) {
  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 bg-white p-6 rounded-lg">
        {/* Profile Section */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Image
              src={
                imageUrl?.includes('https')
                  ? imageUrl
                  : `/assets/avatar/${imageUrl}`
              }
              alt={name}
              width={80}
              height={80}
              className="rounded-full"
            />
            <CheckCircle2 className="absolute bottom-0 right-0 text-blue-500 bg-white rounded-full w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-md font-semibold">{name}</h1>
            </div>
            <p className="text-muted-foreground">{username}</p>
            <p className="text-sm text-muted-foreground">
              {location}
            </p>
          </div>
        </div>

        {/* Followers Section */}
        <div className="flex gap-4 ml-0 md:ml-8">
          <div className="text-center">
            <p className="font-semibold">
              {followers.toLocaleString()}
            </p>
            <p className="text-sm ">Followers</p>
          </div>
          <div className="border-l-2 border-gray-700 h-5 " />
          <div className="text-center">
            <p className="font-semibold">
              {following.toLocaleString()}
            </p>
            <p className="text-sm ">Following</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="flex flex-wrap gap-4 ml-0 md:ml-auto">
          <StatCard
            icon={<MessageCircle className="w-5 h-5" />}
            value={messages}
            label="Messages"
          />
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            value={orders}
            label="Orders"
          />
          <StatCard
            icon={<Star className="w-5 h-5" />}
            value={points.toLocaleString()}
            label="Swopple Points"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 p-4 min-w-[160px]">
      <div className="flex w-full justify-center items-center bg-gray-100 rounded-md py-2">
        {icon} <span className="text-2xl font-bold">{value}</span>
      </div>
      <div>
        <p className="text-sm ">{label}</p>
      </div>
    </Card>
  );
}
