// "use client";
// import { deleteQrCode } from "@/actions/customQrCode";
// import DynamicPrimaryBtn from "@/components/Button/DynamicPrimaryBtn";
// import DeleteQRCode from "@/components/DeleteQRCode";
import QrCodeLists from "@/components/QrCodeLists";
import DeleteQRCode from "@/components/smartsite/qrCode/DeleteQRCode";
import ShareCustomQRCode from "@/components/smartsite/socialShare/ShareCustomQRCode";
// import ShareCustomQRCode from "@/components/ShareModal/ShareCustomQRCode";
import DynamicPrimaryBtn from "@/components/ui/Button/DynamicPrimaryBtn";
import { getFormattedDate } from "@/components/util/getFormattedDate";
import { cookies } from "next/headers";
// import TestShare from "@/components/TestShare";
// import { getFormattedDate } from "@/util/getFormattedDate";
// import { Checkbox, Switch } from "@nextui-org/react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { FiDownload } from "react-icons/fi";
// import { CiSearch } from "react-icons/ci";
import { IoQrCodeSharp } from "react-icons/io5";
// import { MdDeleteForever } from "react-icons/md";
import { TbEdit } from "react-icons/tb";

const QrCodePage = async () => {
  const cookieStore = cookies();

  // Retrieve data from specific cookie
  const accessToken = (await cookieStore).get("access-token")?.value;
  const userId = (await cookieStore).get("user-id")?.value;

  if (accessToken && userId) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/user/customQRCodes/${userId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        next: { revalidate: 300 },
      }
    );

    const data = await response.json();

    // const handleDelete = async (id: string) => {
    //   const data = await deleteQrCode(id, session.accessToken);
    //   console.log("data delete", data);
    // };

    return (
      <div className="main-container pb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-700 font-semibold text-lg ">QR Codes</p>
          {/* <div className="flex gap-3 items-center justify-between">
            <div className="relative flex-1">
              <CiSearch
                className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600"
                size={18}
              />
              <input
                type="text"
                placeholder={`Search Connections`}
                className="w-full border border-gray-300 focus:border-gray-400 rounded-full focus:outline-none pl-10 py-2 text-gray-700 bg-gray-100"
              />
            </div>
            <div className="relative flex-1">
              <p className="absolute left-4 top-1/2 -translate-y-[50%] font-bold text-gray-600">
                All Time
              </p>
              <input
                type="date"
                placeholder={`Search Connections`}
                className="w-full border border-gray-300 focus:border-gray-400 rounded-full focus:outline-none pl-24 py-2 text-gray-700 bg-gray-100 pr-4"
              />
            </div>
            <DynamicPrimaryBtn className="!rounded-full">
              Export
            </DynamicPrimaryBtn>
          </div> */}
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="flex items-center text-gray-500 w-[20%] mb-1 ml-4">
                Info
              </th>
              {/* <th className="flex items-center gap-4 w-[100%] mb-3">
                <Checkbox className="bg-white py-2 px-4 rounded-full" size="sm">
                  <span className="text-gray-600">Select All</span>
                </Checkbox>
                <div className="flex items-center gap-4 rounded-full bg-white pl-4 pr-3 py-1.5 font-medium text-gray-600 w-max">
                  <p className="text-sm">Map</p>
                  <Switch
                    color="default"
                    size="sm"
                    defaultSelected
                    aria-label="Map"
                  />
                </div>
              </th> */}
              <th className="text-gray-500 w-[20%] text-start pb-1">Scans</th>
              {/* <th className="text-gray-500 w-[20%] text-start pb-1">Url</th> */}
              <th className="text-gray-500 w-[20%] text-start pb-1">Created</th>
              <th className="text-gray-500 w-[20%] text-start pb-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.data.length > 0 && (
              <QrCodeLists data={data?.data} accessToken={accessToken} />
            )}
          </tbody>
        </table>
        {data.data.length === 0 && (
          <div className="flex justify-center pt-10">
            <p className="font-medium mb-6 text-gray-600">
              No QR Code Available!
            </p>
          </div>
        )}
        <div className="mt-4">
          <Link href={"/qr-code/create"}>
            <DynamicPrimaryBtn className="!px-10 mx-auto gap-2">
              <IoQrCodeSharp />
              Create QR Code
            </DynamicPrimaryBtn>
          </Link>
        </div>
      </div>
    );
  }
};

export default QrCodePage;
