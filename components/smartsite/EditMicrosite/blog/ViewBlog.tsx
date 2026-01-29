"use client";
import React from "react";
import Image from "next/image"; // Adjust the import path
import CustomModal from "@/components/modal/CustomModal";

interface ViewBlogProps {
  iconDataObj: any;
  isOn: boolean;
  setOff: () => void;
}

const ViewBlog: React.FC<ViewBlogProps> = ({ iconDataObj, isOn, setOff }) => {
  return (
    <CustomModal isOpen={isOn} onClose={setOff} width="max-w-2xl">
      <div className="bg-white rounded-xl p-7 flex flex-col gap-4">
        <div className="relative h-96 w-full">
          <Image
            src={iconDataObj.data.image}
            alt="blog image"
            fill
            className="w-full h-auto border border-[#F3E9FC] rounded-xl object-cover"
          />
        </div>
        <div className="flex flex-col gap-2">
          {iconDataObj.data.title && (
            <p className="text-xl font-bold text-center">
              {iconDataObj.data.title}
            </p>
          )}
          {iconDataObj.data.headline && (
            <p className="font-medium text-center text-gray-500 text-sm">
              {iconDataObj.data.headline}
            </p>
          )}
        </div>
        {iconDataObj.data.description && (
          <p
            dangerouslySetInnerHTML={{
              __html: iconDataObj.data.description,
            }}
          ></p>
        )}
      </div>
    </CustomModal>
  );
};

export default ViewBlog;
