// "use client";
// import { deleteQrCode } from "@/actions/customQrCode";
// import DynamicPrimaryBtn from "@/components/Button/DynamicPrimaryBtn";
// import DeleteQRCode from "@/components/DeleteQRCode";
import DeleteQRCode from "@/components/smartsite/qrCode/DeleteQRCode";
import ShareCustomQRCode from "@/components/smartsite/socialShare/ShareCustomQRCode";
// import ShareCustomQRCode from "@/components/ShareModal/ShareCustomQRCode";
import DynamicPrimaryBtn from "@/components/ui/Button/DynamicPrimaryBtn";
import { getFormattedDate } from "@/components/util/getFormattedDate";
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
  const demoToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NjM4NjMyMDIzMDQxMDMyODAyOTk4MmIiLCJpYXQiOjE3MjcxNTI4MzB9.CsHnZAgUzsfkc_g_CZZyQMXc02Ko_LhnQcCVpeCwroY";

  const userId = 12345; //demo

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/desktop/user/customQRCodes/${userId}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${demoToken}`,
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
    <div className="main-container">
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
            <th className="text-gray-500 w-[20%] text-start pb-1">Type</th>
            {/* <th className="text-gray-500 w-[20%] text-start pb-1">Url</th> */}
            <th className="text-gray-500 w-[20%] text-start pb-1">
              Created At
            </th>
            <th className="text-gray-500 w-[20%] text-start pb-1">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.data.length > 0 && (
            <>
              {data.data.map((item: any) => (
                <tr key={item._id} className="w-[100%] bg-white mb-6 border-b">
                  <td className="flex items-center gap-3 w-[50%] py-3 pl-4">
                    {/* <Checkbox size="sm"></Checkbox> */}
                    <Image
                      alt="qrcode"
                      src={item.qrCodeUrl}
                      width={300}
                      height={300}
                      className="rounded-lg w-16 h-16 border-2 border-gray-400"
                    />
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium mb-1 text-gray-700">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">{item.data}</p>
                      </div>
                    </div>
                  </td>
                  <td className="w-[20%] text-gray-600 font-semibold pr-2">
                    Static
                  </td>
                  {/* <td className="w-[20%] text-gray-600 font-semibold pr-2">
                    <a
                      href={item.data}
                      target="_blank"
                      className="hover:underline underline-offset-4"
                    >
                      {item.data}
                    </a>
                  </td> */}
                  <td className="w-[20%] text-gray-600 font-semibold">
                    {getFormattedDate(item.createdAt)}
                  </td>
                  <td className="w-[20%]">
                    <div className="flex items-center gap-1">
                      <Link className="" href={`/qr-code/${item._id}`}>
                        <div className="bg-gray-200 w-9 h-9 rounded-lg hover:bg-gray-300 flex items-center justify-center">
                          <TbEdit size={18} />
                        </div>
                      </Link>
                      <DeleteQRCode id={item._id} token={demoToken} />
                      <ShareCustomQRCode url={item.qrCodeUrl} />
                      {/* <TestShare qrCodeUrl={item.qrCodeUrl} /> */}
                      <a
                        href={item.qrCodeUrl}
                        download="qrcode.png"
                        className="bg-gray-200 hover:bg-gray-300 w-9 h-9 flex items-center justify-center rounded-lg"
                      >
                        <FiDownload color="black" size={18} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
      <div className="flex justify-center pt-10">
        {data.data.length === 0 && (
          <p className="font-medium mb-6 text-gray-600">
            No QR Code Available!
          </p>
        )}
      </div>
      <Link href={"/qr-code/create"}>
        <DynamicPrimaryBtn className="!px-10 mx-auto gap-2">
          <IoQrCodeSharp />
          Create QR Code
        </DynamicPrimaryBtn>
      </Link>
    </div>
  );
};

export default QrCodePage;
