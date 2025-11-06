"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import dashboard from "@/public/images/nav/dashboard.png";
import feed from "@/public/images/nav/feed.png";
import smartsite from "@/public/images/nav/smartsite.png";
import wallet from "@/public/images/nav/wallet.png";
import Link from "next/link";
import { BiQrScan, BiSolidEdit } from "react-icons/bi";
import { VscChip } from "react-icons/vsc";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useModalStore } from "@/zustandStore/modalstore";
import { IoAdd, IoClose } from "react-icons/io5";
import { HiOutlineUsers } from "react-icons/hi";
import { FaEdit } from "react-icons/fa";
import { TbLockDollar } from "react-icons/tb";
import { RiExchangeBoxLine } from "react-icons/ri";

const BottomNavContent = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openModal } = useModalStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tab = useMemo(
    () => searchParams && searchParams.get("tab"),
    [searchParams]
  );

  const isSmartsite = pathname?.startsWith("/smartsite");

  return (
    <div
      className={`${
        isSmartsite ? "w-[22rem]" : "w-[19rem]"
      } fixed bottom-2 left-1/2 transform -translate-x-1/2 `}
    >
      {/* Smartsite Menu Modal */}
      {isMenuOpen && isSmartsite && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu */}
          <div className="absolute bottom-[5.9rem] left-full -translate-x-16 bg-white rounded-2xl shadow-xl p-2 w-56 z-50">
            <div className="">
              <Link
                href="/smartsite/background"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <HiOutlineUsers />
                </div>
                <div>
                  <p className="font-medium text-sm">Edit Page</p>
                  <p className="text-xs text-gray-500">Change Background</p>
                </div>
              </Link>

              <Link
                href="/smartsite/customize"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FaEdit />
                </div>
                <div>
                  <p className="font-medium text-sm">Add Button</p>
                  <p className="text-xs text-gray-500">Link Templates</p>
                </div>
              </Link>

              <Link
                href="/smartsite/edit-qr"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <BiQrScan />
                </div>
                <div>
                  <p className="font-medium text-sm">Edit QR</p>
                  <p className="text-xs text-gray-500">Customize QR</p>
                </div>
              </Link>

              <Link
                href="/smartsite/activate"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <VscChip />
                </div>
                <div>
                  <p className="font-medium text-sm">Activate</p>
                  <p className="text-xs text-gray-500">Program Your Chip</p>
                </div>
              </Link>

              <Link
                href="/smartsite/token-gate"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <TbLockDollar />
                </div>
                <div>
                  <p className="font-medium text-sm">Token Gate</p>
                  <p className="text-xs text-gray-500">Monetize Your Content</p>
                </div>
              </Link>
              <Link
                href="/smartsite/token-gate"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <RiExchangeBoxLine />
                </div>
                <div>
                  <p className="font-medium text-sm">Toggle</p>
                  <p className="text-xs text-gray-500">Switch Smart Sites</p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}

      {(pathname === "/" || pathname?.startsWith("/feed")) && (
        <div className="flex text-sm font-medium w-[84%] bg-white p-3 rounded-xl shadow-large items-center justify-between mb-2 mx-auto">
          <Link
            href={"/?tab=feed"}
            className="flex flex-col gap-1 items-center"
          >
            <div
              className={`${
                (tab === "feed" || !tab) && "bg-gray-100"
              } rounded-full px-3 py-1`}
            >
              <p>Feed</p>
            </div>
          </Link>
          <Link
            href={"/?tab=ledger"}
            className="flex flex-col gap-1 items-center"
          >
            <div
              className={`${
                tab === "ledger" && "bg-gray-100"
              } rounded-full px-3 py-1`}
            >
              <p>Ledger</p>
            </div>
          </Link>
          <Link href={"/?tab=map"} className="flex flex-col gap-1 items-center">
            <div
              className={`${
                tab === "map" && "bg-gray-100"
              } rounded-full px-3 py-1`}
            >
              <p>Map</p>
            </div>
          </Link>
          <button
            onClick={openModal}
            className="flex flex-col gap-1 items-center"
          >
            <div
              className={`${
                tab === "create-feed" && "bg-gray-100"
              } rounded-full px-3 py-1`}
            >
              <BiSolidEdit size={18} />
            </div>
          </button>
        </div>
      )}

      <div className="flex w-full bg-white p-3 rounded-2xl shadow-large items-center justify-between gap-2">
        <Link href={"/dashboard"} className="flex flex-col gap-1 items-center">
          <div
            className={`border ${
              pathname?.startsWith("/dashboard")
                ? "border-gray-300"
                : "border-gray-50"
            } bg-gray-100 rounded-lg p-3`}
          >
            <Image src={dashboard} alt="dashboard" className="h-5 w-auto" />
          </div>
          <p className="text-sm">Dashboard</p>
        </Link>
        <Link href={"/"} className="flex flex-col gap-1 items-center">
          <div
            className={`border ${
              pathname === "/" ? " border-gray-300" : " border-gray-50"
            } bg-gray-100 rounded-lg p-3`}
          >
            <Image src={feed} alt="feed" className="h-5 w-auto" />
          </div>
          <p className="text-sm">Feed</p>
        </Link>
        <Link href={"/wallet"} className="flex flex-col gap-1 items-center">
          <div
            className={`border ${
              pathname?.startsWith("/wallet")
                ? "border-gray-300"
                : "border-gray-50"
            } bg-gray-100 rounded-lg p-3`}
          >
            <Image src={wallet} alt="wallet" className="h-5 w-auto" />
          </div>
          <p className="text-sm">Wallet</p>
        </Link>
        <Link
          href={"/smartsite"}
          className={`flex flex-col gap-1 items-center ${
            isSmartsite && "border-r pr-3"
          }`}
        >
          <div
            className={`border ${
              pathname?.startsWith("/smartsite")
                ? "border-gray-300"
                : "border-gray-50"
            } bg-gray-100 rounded-lg p-3`}
          >
            <Image src={smartsite} alt="smartsite" className="h-5 w-auto" />
          </div>
          <p className="text-sm">Build</p>
        </Link>
        {isSmartsite && (
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex flex-col gap-1 items-center"
          >
            <div className={`border bg-black rounded-lg p-3`}>
              {isMenuOpen ? (
                <IoClose size={20} color="white" className="h-5 w-auto" />
              ) : (
                <IoAdd size={20} color="white" className="h-5 w-auto" />
              )}
            </div>
            <p className="text-sm">Add</p>
          </button>
        )}
      </div>
    </div>
  );
};
export default BottomNavContent;
