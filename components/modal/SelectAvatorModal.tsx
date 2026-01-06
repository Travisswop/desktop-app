"use client";
import React, { useRef } from "react";
import Image from "next/image";
import { MdFileUpload } from "react-icons/md";
import CustomModal from "./CustomModal";

export default function SelectAvatorModal({
  isOpen,
  onOpenChange,
  images,
  onSelectImage,
  setIsModalOpen,
  handleFileChange,
}: any) {
  const fileInputRef = useRef<any>(null);

  const selectAvator = (image: any) => {
    onSelectImage(image);
    setIsModalOpen(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef?.current?.click();
  };

  return (
    <CustomModal isOpen={isOpen} onCloseModal={handleClose} width="max-w-5xl">
      <div className="w-[91%] mx-auto py-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-700">
            Choose Your Avator
          </h2>
        </div>

        <div className="grid grid-cols-8 gap-3">
          {images.map((image: string, index: number) => (
            <div key={index}>
              <Image
                src={`/images/user_avator/${image}.png`}
                alt="avator"
                width={180}
                height={180}
                className="cursor-pointer rounded-2xl"
                placeholder="blur"
                blurDataURL="/images/user_avator/placeholder.png"
                onClick={() => selectAvator(image)}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 my-2">
          <hr className="w-full h-[1.5px] bg-gray-300" />
          <p>OR</p>
          <hr className="w-full h-[1.5px] bg-gray-300" />
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleButtonClick}
            className="bg-black text-white w-max mx-auto py-2 rounded-xl flex items-center gap-2 justify-center px-4 text-sm"
          >
            <MdFileUpload /> Choose From Gallery
          </button>
        </div>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </CustomModal>
  );
}
