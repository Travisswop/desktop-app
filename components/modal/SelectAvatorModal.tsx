"use client";
import React, { useRef } from "react";
import { Modal, ModalContent, ModalBody } from "@nextui-org/react";
import Image from "next/image";
import { MdFileUpload } from "react-icons/md";

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
    isOpen = false;
    onSelectImage(image);
    setIsModalOpen(false);
  };
  // console.log(isOpen, onOpenChange);

  const handleButtonClick = () => {
    fileInputRef?.current?.click();
  };

  // console.log("images", images);

  return (
    <>
      {isOpen && (
        <>
          <Modal
            size="4xl"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            backdrop={"blur"}
          >
            <ModalContent>
              <div className="w-[91%] mx-auto py-6">
                <ModalBody className="text-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-700">
                      Select Your Avator
                    </h2>
                    <p className="text-sm text-gray-600 my-3">
                      Select from our wide variety of links and contact info
                      below.
                    </p>
                  </div>
                  <div className="grid grid-cols-8 gap-3">
                    {images.map((image: string, index: number) => (
                      <div key={index}>
                        <Image
                          src={`/images/user_avator/${image}.png`}
                          alt="avator"
                          width={180}
                          height={180}
                          className="cursor-pointer"
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
                  <button
                    type="button"
                    onClick={handleButtonClick}
                    className="bg-black text-white w-max mx-auto py-2 rounded-xl flex items-center gap-2 justify-center px-4 text-sm"
                  >
                    <MdFileUpload /> Choose From Gallery
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </ModalBody>
              </div>
            </ModalContent>
          </Modal>
        </>
      )}
    </>
  );
}
