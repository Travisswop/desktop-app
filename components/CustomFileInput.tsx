import React, { useRef, ChangeEvent } from 'react';
import { RiUploadCloud2Line } from 'react-icons/ri';

interface CustomFileInputProps {
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

const CustomFileInput: React.FC<CustomFileInputProps> = ({
  handleFileChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className=''>
      <input
        type='file'
        ref={fileInputRef}
        className='hidden'
        onChange={handleFileChange}
      />
      <button
        onClick={handleButtonClick}
        type='button'
        className='px-4 py-2.5 text-white border-2 rounded-full focus:outline-none text-xs font-medium flex items-center gap-x-1 bg-black'
      >
        <RiUploadCloud2Line className='size-3 text-white' />
        Browse
      </button>
    </div>
  );
};

export default CustomFileInput;
