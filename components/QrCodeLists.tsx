import Image from "next/image";
import React from "react";
import { getFormattedDate } from "./util/getFormattedDate";
import Link from "next/link";
import { TbEdit } from "react-icons/tb";
import DeleteQRCode from "./smartsite/qrCode/DeleteQRCode";
import ShareCustomQRCode from "./smartsite/socialShare/ShareCustomQRCode";
import { FiDownload } from "react-icons/fi";
import { Checkbox } from "@nextui-org/react";

const QrCodeLists = ({
  data,
  accessToken,
}: {
  data: any;
  accessToken: string;
}) => {
  return (
    <>
      {data.map((item: any) => (
        <tr
          key={item._id}
          className="w-[100%] bg-white mb-6 border-b rounded-xl"
        >
          <td className="flex items-center gap-3 w-[50%] py-3 pl-4">
            <Checkbox size="sm"></Checkbox>
            <Image
              alt="qrcode"
              src={item.qrCodeUrl}
              width={300}
              height={300}
              className="rounded-lg w-16 h-16 border-2 border-gray-400"
            />
            <div className="flex items-center gap-4">
              <div>
                <p className="font-semibold mb-1 text-black text-lg">
                  {item.name}
                </p>
                <p className="text-xs text-gray-400">{item.data}</p>
              </div>
            </div>
          </td>
          <td className="w-[20%] text-gray-600 font-semibold pr-2">#1290</td>
          <td className="w-[20%] text-gray-400 font-medium">
            {getFormattedDate(item.createdAt)}
          </td>
          <td className="w-[20%]">
            <div className="flex items-center gap-1">
              <Link className="" href={`/qr-code/${item._id}`}>
                <div className="bg-black text-white w-9 h-9 rounded-lg flex items-center justify-center">
                  <TbEdit size={18} />
                </div>
              </Link>
              {accessToken && (
                <DeleteQRCode id={item._id} token={accessToken} />
              )}
              <ShareCustomQRCode url={item.qrCodeUrl} />
              <a
                href={item.qrCodeUrl}
                download="qrcode.png"
                className="bg-black text-white w-9 h-9 flex items-center justify-center rounded-lg"
              >
                <FiDownload size={18} />
              </a>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

export default QrCodeLists;
