"use client";
import React from "react";
import { ImCloudUpload } from "react-icons/im";
import { MdFileUpload } from "react-icons/md";
import AnimateButton from "../ui/Button/AnimateButton";

const UploadImageButton = ({ handleModal }: any) => {
  const handleClickOnUploadImage = () => {
    // console.log("clicked");
    handleModal();
  };
  return (
    <div className="w-full sm:w-max">
      <AnimateButton
        className="bg-black text-white py-2 !border-0 !rounded-xl"
        width="w-44"
        type="button"
        onClick={handleClickOnUploadImage}
      >
        <MdFileUpload size={18} /> Update Image
      </AnimateButton>
    </div>
  );
};

export default UploadImageButton;
