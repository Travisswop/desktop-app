// "use client";
// import { deleteQrCode } from "@/actions/customQrCode";
// import DynamicPrimaryBtn from "@/components/Button/DynamicPrimaryBtn";
// import DeleteQRCode from "@/components/DeleteQRCode";
import QrCodeLists from "@/components/QrCodeLists";
// import DeleteQRCode from "@/components/smartsite/qrCode/DeleteQRCode";
// import ShareCustomQRCode from "@/components/smartsite/socialShare/ShareCustomQRCode";
// import ShareCustomQRCode from "@/components/ShareModal/ShareCustomQRCode";
import DynamicPrimaryBtn from "@/components/ui/Button/DynamicPrimaryBtn";
// import { getFormattedDate } from "@/components/util/getFormattedDate";
import { Checkbox, Switch } from "@nextui-org/react";
import { cookies } from "next/headers";
// import TestShare from "@/components/TestShare";
// import { getFormattedDate } from "@/util/getFormattedDate";
// import { Checkbox, Switch } from "@nextui-org/react";
// import Image from "next/image";
import Link from "next/link";
import React from "react";
// import { CiSearch } from "react-icons/ci";
// import { FiDownload } from "react-icons/fi";
// import { CiSearch } from "react-icons/ci";
import { IoQrCodeSharp } from "react-icons/io5";
// import { MdDeleteForever } from "react-icons/md";
// import { TbEdit } from "react-icons/tb";

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
          <div className="flex gap-3 items-center justify-between">
            <DynamicPrimaryBtn className="!rounded-full">
              Export
            </DynamicPrimaryBtn>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="flex items-center gap-4 w-[100%] mb-6 translate-x-2">
                <Checkbox className="bg-white py-2 px-4 rounded-full" size="sm">
                  <span className="text-gray-600">Select All</span>
                </Checkbox>
              </th>
              <th className="text-gray-400 w-[20%] text-start pb-1 font-medium">
                Scans
              </th>
              {/* <th className="text-gray-500 w-[20%] text-start pb-1">Url</th> */}
              <th className="text-gray-400 w-[20%] text-start pb-1 font-medium">
                Created
              </th>
              <th className="text-gray-400 w-[20%] text-start pb-1 font-medium">
                Action
              </th>
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
              Create
            </DynamicPrimaryBtn>
          </Link>
        </div>
      </div>
    );
  }
};

export default QrCodePage;
