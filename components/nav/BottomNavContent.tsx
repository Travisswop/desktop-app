"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import dashboard from "@/public/images/nav/dashboard.png";
import feed from "@/public/images/nav/feed.png";
import smartsite from "@/public/images/nav/smartsite.png";
import wallet from "@/public/images/nav/wallet.png";
import Link from "next/link";
import { BiSolidEdit } from "react-icons/bi";
import { useState } from "react";

const BottomNavContent = () => {
  const pathname = usePathname();
  console.log("pathname", pathname);
  const [feedType, setFeedType] = useState("feed");

  return (
    <div className="w-[19rem]  absolute bottom-2 left-1/2 transform -translate-x-1/2 ">
      {pathname === "/" && (
        <div className="flex text-sm font-medium w-[84%] bg-white p-3 rounded-xl shadow-large items-center justify-between mb-2 mx-auto">
          <button
            onClick={() => setFeedType("feed")}
            className="flex flex-col gap-1 items-center"
          >
            <div
              className={`${
                feedType === "feed" && "bg-gray-100"
              } rounded-full px-3 py-1`}
            >
              <p>Feed</p>
            </div>
          </button>
          <button
            onClick={() => setFeedType("ledger")}
            className="flex flex-col gap-1 items-center"
          >
            <div
              className={`${
                feedType === "ledger" && "bg-gray-100"
              } rounded-full px-3 py-1`}
            >
              <p>Ledger</p>
            </div>
          </button>
          <button
            onClick={() => setFeedType("map")}
            className="flex flex-col gap-1 items-center"
          >
            <div
              className={`${
                feedType === "map" && "bg-gray-100"
              } rounded-full px-3 py-1`}
            >
              <p>Map</p>
            </div>
          </button>
          <button
            onClick={() => setFeedType("create-feed")}
            className="flex flex-col gap-1 items-center"
          >
            <div
              className={`${
                feedType === "create-feed" && "bg-gray-100"
              } rounded-full px-3 py-1`}
            >
              <BiSolidEdit size={18} />
            </div>
          </button>
        </div>
      )}
      <div className="flex w-full bg-white p-3 rounded-xl shadow-large items-center justify-between gap-2">
        <Link href={"/dashboard"} className="flex flex-col gap-1 items-center">
          <div className="bg-gray-100 rounded-lg p-3">
            <Image src={dashboard} alt="dashboard" className="h-5 w-auto" />
          </div>
          <p className="text-sm">Dashboard</p>
        </Link>
        <Link href={"/"} className="flex flex-col gap-1 items-center">
          <div className="bg-gray-100 rounded-lg p-3">
            <Image src={feed} alt="feed" className="h-5 w-auto" />
          </div>
          <p className="text-sm">Feed</p>
        </Link>
        <Link href={"/wallet"} className="flex flex-col gap-1 items-center">
          <div className="bg-gray-100 rounded-lg p-3">
            <Image src={wallet} alt="wallet" className="h-5 w-auto" />
          </div>
          <p className="text-sm">Wallet</p>
        </Link>
        <Link href={"/smartsite"} className="flex flex-col gap-1 items-center">
          <div className="bg-gray-100 rounded-lg p-3">
            <Image src={smartsite} alt="smartsite" className="h-5 w-auto" />
          </div>
          <p className="text-sm">Build</p>
        </Link>
      </div>
    </div>
  );
};
export default BottomNavContent;
