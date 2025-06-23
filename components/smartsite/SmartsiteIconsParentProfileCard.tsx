'use client';

import isUrl from '@/lib/isUrl';
import { useUser } from '@/lib/UserContext';
import { Skeleton } from '@nextui-org/react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { TbEdit } from 'react-icons/tb';

const SmartsiteIconsParentProfileCard = ({ data }: any) => {
  const [loading, setLoading] = useState(false);
  //   const { user, loading }: any = useUser();

  return (
    <div className="flex items-center justify-between gap-6 bg-white p-6 rounded-lg">
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
        <div className="flex items-center gap-3">
          <div className="relative">
            {isUrl(data?.profilePic) ? (
              <Image
                src={data?.profilePic}
                alt={'user image'}
                width={80}
                height={80}
                className="rounded-full w-16 h-16"
              />
            ) : (
              <Image
                src={`/images/user_avator/${data?.profilePic}.png`}
                alt={'user image'}
                width={80}
                height={80}
                className="rounded-full w-16 h-16"
              />
            )}
            <Link
              href={`/smartsite/${data._id}`}
              className="absolute bottom-0 -right-0 bg-white rounded-full w-[23px] h-[23px] flex items-center justify-center p-0.5"
            >
              <div className="bg-black rounded-full w-full h-full flex items-center justify-center font-bold">
                <TbEdit size={14} color="white" />
              </div>
            </Link>
            {/* <CheckCircle2 className="" /> */}
          </div>
          <div className=" text-[#424651]">
            <div className="flex items-center gap-2">
              <h1 className="text-md font-semibold">{data?.name}</h1>
            </div>

            {data?.address ? (
              <p className="text-sm text-muted-foreground">
                {data?.address}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {data?.bio}
              </p>
            )}
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
            <p className="font-semibold">0</p>
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
            <p className="font-semibold">0</p>
          )}

          <p className="text-sm ">Following</p>
        </div>
      </div>
    </div>
  );
};

export default SmartsiteIconsParentProfileCard;
