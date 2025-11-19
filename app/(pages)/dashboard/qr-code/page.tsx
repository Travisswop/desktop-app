import QrCodeLists from "@/components/QrCodeLists";
import DynamicPrimaryBtn from "@/components/ui/Button/DynamicPrimaryBtn";
import { PrimaryButton } from "@/components/ui/Button/PrimaryButton";
import { cookies } from "next/headers";
import Link from "next/link";
import React from "react";
import { IoQrCodeSharp } from "react-icons/io5";
import { MdOutlineQrCodeScanner } from "react-icons/md";

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

    if (data.data) {
      return (
        <div className="bg-white p-5 rounded-xl relative">
          <div className="flex items-center justify-between w-max">
            <p className="text-gray-700 font-semibold text-lg ">QR Codes</p>
          </div>
          {/* <table className="w-full"> */}
          {data.data.length > 0 && (
            <QrCodeLists data={data?.data} accessToken={accessToken} />
          )}
          {/* </table> */}
          {data.data.length === 0 && (
            <div className="flex justify-center py-10">
              <p className="font-medium text-gray-600">No QR Code Available!</p>
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <Link href={"/qr-code/create"}>
              <PrimaryButton className="px-10 gap-1 font-medium py-2">
                <MdOutlineQrCodeScanner />
                Create
              </PrimaryButton>
            </Link>
          </div>
        </div>
      );
    }

    return <>No qr found</>;
  }
};

export default QrCodePage;
