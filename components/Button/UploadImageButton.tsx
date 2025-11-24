"use client";
import React from "react";
import { MdFileUpload } from "react-icons/md";
import { PrimaryButton } from "../ui/Button/PrimaryButton";

const UploadImageButton = ({ handleModal }: any) => {
  const handleClickOnUploadImage = () => {
    handleModal();
  };
  return (
    <div className="w-full flex justify-center">
      <PrimaryButton type="button" onClick={handleClickOnUploadImage}>
        <MdFileUpload size={18} /> Upload Image
      </PrimaryButton>
    </div>
  );
};

export default UploadImageButton;
