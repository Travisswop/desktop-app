'use client';
import React from 'react';
import { ImCloudUpload } from 'react-icons/im';
import { MdFileUpload } from 'react-icons/md';
import AnimateButton from '../ui/Button/AnimateButton';

const UploadImageButton = ({ handleModal }: any) => {
  const handleClickOnUploadImage = () => {
    handleModal();
  };
  return (
    <div className="w-full sm:w-max">
      <AnimateButton
        className="bg-black text-white py-1.5 !border-0 !rounded-xl hover:py-1.5"
        width="w-40"
        type="button"
        onClick={handleClickOnUploadImage}
      >
        <MdFileUpload size={18} /> Update Image
      </AnimateButton>
    </div>
  );
};

export default UploadImageButton;
