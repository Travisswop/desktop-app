'use client';

import isUrl from '@/lib/isUrl';
import { useUser } from '@/lib/UserContext';
import { Skeleton } from '@nextui-org/react';
import Image from 'next/image';
import Link from 'next/link';
import { TbEdit } from 'react-icons/tb';

const ParentProfileCard = () => {
  const { user, loading }: any = useUser();

  console.log('user', user);

  return (
    <div className="flex items-start 2xl:items-center justify-between gap-6 bg-white p-6 rounded-lg">
      {loading ? (
        <div className="flex items-start gap-3">
          <Skeleton className="h-14 w-14 rounded-full flex justify-center">
            <div className="rounded-full bg-gray-100"></div>
          </Skeleton>
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-6 w-32 rounded-lg flex justify-center">
              <div className="rounded-lg bg-gray-100"></div>
            </Skeleton>
            <Skeleton className="h-6 w-32 rounded-lg flex justify-center">
              <div className="rounded-lg bg-gray-100"></div>
            </Skeleton>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative">
            {isUrl(user?.profilePic) ? (
              <Image
                src={user?.profilePic}
                alt={'user image'}
                width={80}
                height={80}
                className="rounded-full w-16 h-16"
              />
            ) : (
              <Image
                src={`/images/user_avator/${user?.profilePic}.png`}
                alt={'user image'}
                width={80}
                height={80}
                className="rounded-full w-16 h-16"
              />
            )}
            <Link
              href={'/account-billing'}
              className="absolute bottom-0 -right-1 bg-white rounded-full w-[26px] h-[26px] flex items-center justify-center p-0.5"
            >
              <div className="bg-black rounded-full w-full h-full flex items-center justify-center font-bold">
                <TbEdit size={14} color="white" />
              </div>
            </Link>
            {/* <CheckCircle2 className="" /> */}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-md font-semibold">{user?.name}</h1>
            </div>
            <p className="text-muted-foreground">{user?.username}</p>
            <p className="text-sm text-muted-foreground">
              {user?.address}
            </p>
          </div>
        </div>
      )}

      {/* Followers Section */}
      <div className="flex gap-4">
        <div className="text-center">
          {loading ? (
            <Skeleton className="h-6 w-20 rounded-lg mb-1">
              <div className="rounded-lg bg-gray-100"></div>
            </Skeleton>
          ) : (
            <p className="font-semibold">{user.followers}</p>
          )}

          <p className="text-sm ">Followers</p>
        </div>
        <div className="border-l-2 border-gray-700 h-5 " />
        <div className="text-center">
          {loading ? (
            <Skeleton className="h-6 w-20 rounded-lg mb-1">
              <div className="rounded-lg bg-gray-100"></div>
            </Skeleton>
          ) : (
            <p className="font-semibold">{user.following}</p>
          )}

          <p className="text-sm ">Following</p>
        </div>
      </div>
    </div>
  );
};

export default ParentProfileCard;
