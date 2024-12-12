"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Checkbox } from "@nextui-org/react";
import { TbEdit } from "react-icons/tb";
import { FiDownload } from "react-icons/fi";
import DeleteQRCode from "./smartsite/qrCode/DeleteQRCode";
import ShareCustomQRCode from "./smartsite/socialShare/ShareCustomQRCode";
import { getFormattedDate } from "./util/getFormattedDate";
import DynamicPrimaryBtn from "./ui/Button/DynamicPrimaryBtn";

const QrCodeLists = ({
  data,
  accessToken,
}: {
  data: any;
  accessToken: string;
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((item: any) => item._id));
    }
    setSelectAll(!selectAll);
  };

  const handleRowSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    const selectedItems = data.filter((item: any) =>
      selectedIds.includes(item._id)
    );

    selectedItems.forEach((item: any) => {
      const link = document.createElement("a");
      link.href = item.qrCodeUrl;
      link.download = `${item.name || "qrcode"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="mb-4 flex justify-end absolute right-0 top-0">
        {/* <button
          
          className="bg-blue-500 text-white py-2 px-4 rounded-lg"
        >
          
        </button> */}
        <DynamicPrimaryBtn
          onClick={handleExport}
          className="!rounded-full text-sm xl:text-base"
        >
          Export
        </DynamicPrimaryBtn>
      </div>
      <table className="table-auto w-full border-collapse">
        <thead>
          <tr>
            <th className="py-2 px-4 text-left flex items-center -translate-x-2">
              <Checkbox
                className="bg-white py-2 px-4 rounded-full mb-5 translate-y-3"
                size="sm"
                isSelected={selectAll}
                onChange={handleSelectAll}
              >
                Select All
              </Checkbox>
            </th>
            <th className="py-2 px-4 text-left text-gray-500 font-normal mb-5">
              Scans
            </th>
            <th className="py-2 px-4 text-left text-gray-500 font-normal mb-5">
              Created
            </th>
            <th className="py-2 px-4 text-left text-gray-500 font-normal mb-5">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {data.map((item: any) => (
            <tr key={item._id} className="border-b">
              <td className="py-3 px-4 flex items-center gap-3">
                <Checkbox
                  size="sm"
                  isSelected={selectedIds.includes(item._id)}
                  onChange={() => handleRowSelection(item._id)}
                />
                <Image
                  alt="qrcode"
                  src={item.qrCodeUrl}
                  width={300}
                  height={300}
                  className="rounded-lg w-16 h-16 border-2 border-gray-400"
                />
                <div>
                  <p className="font-semibold mb-1 text-black">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.data}</p>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-600 font-semibold">#1290</td>
              <td className="py-3 px-4 text-gray-400">
                {getFormattedDate(item.createdAt)}
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <Link href={`/qr-code/${item._id}`}>
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
        </tbody>
      </table>
    </div>
  );
};

export default QrCodeLists;
